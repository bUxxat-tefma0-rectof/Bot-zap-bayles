// ============================================
// DOGUINHA STORE BOT - SERVIÇO DE PAGAMENTOS
// ============================================

const { getDatabase } = require('../database/connection');
const User = require('../database/models/User');
const Transaction = require('../database/models/Transaction');
const { generatePix, checkPaymentStatus } = require('./mercadopago');
const { sendTextMessage } = require('./whatsapp');
const { generateId } = require('../utils/idGenerator');
const { getSetting } = require('../utils/settings');
const logger = require('../utils/logger');

// ============================================
// PROCESSAR RECARGA
// ============================================
async function processRecharge(phone, user, amount) {
    try {
        // Validar valor mínimo
        if (amount < 1) {
            return {
                success: false,
                message: '❌ *Valor mínimo: R$ 1,00*'
            };
        }

        // Validar valor máximo
        if (amount > 1000) {
            return {
                success: false,
                message: '❌ *Valor máximo: R$ 1.000,00*'
            };
        }

        // Gerar PIX
        const pixData = await generatePix(amount, `Recarga Doguinha Store - ${phone}`);

        // Salvar transação
        Transaction.create(
            pixData.id,
            phone,
            'deposit',
            amount,
            pixData.pix_code,
            pixData.qr_code_base64,
            pixData.expiration_date
        );

        return {
            success: true,
            pixData: pixData
        };

    } catch (error) {
        logger.error('❌ Erro ao processar recarga:', error);
        return {
            success: false,
            message: '❌ *Erro ao gerar PIX!*\n\nTente novamente mais tarde.'
        };
    }
}

// ============================================
// VERIFICAR PAGAMENTO
// ============================================
async function verifyPayment(paymentId) {
    try {
        const status = await checkPaymentStatus(paymentId);
        const transaction = Transaction.findById(paymentId);

        if (!transaction) {
            return { success: false, message: 'Transação não encontrada' };
        }

        if (transaction.status !== 'pending') {
            return { 
                success: true, 
                alreadyProcessed: true,
                status: transaction.status 
            };
        }

        if (status.approved) {
            // Aprovar pagamento
            Transaction.updateStatus(paymentId, 'approved');
            
            // Creditar saldo
            User.updateBalance(transaction.user_phone, transaction.amount);

            // Verificar bônus de indicação
            const user = User.findByPhone(transaction.user_phone);
            if (user && user.referred_by) {
                await processRechargeBonus(user.referred_by, transaction.amount);
            }

            // Notificar usuário
            const updatedUser = User.findByPhone(transaction.user_phone);
            await sendTextMessage(
                transaction.user_phone,
                `✅ *PAGAMENTO APROVADO!*\n\n` +
                `💰 Valor creditado: R$ ${parseFloat(transaction.amount).toFixed(2)}\n` +
                `💳 Saldo atual: R$ ${parseFloat(updatedUser.balance).toFixed(2)}\n\n` +
                `Obrigado pela recarga! 🎉`
            );

            return {
                success: true,
                approved: true,
                message: 'Pagamento aprovado e saldo creditado'
            };
        }

        if (status.rejected) {
            Transaction.updateStatus(paymentId, 'cancelled');
            return { success: true, rejected: true, message: 'Pagamento rejeitado' };
        }

        return { success: true, pending: true, message: 'Aguardando pagamento' };

    } catch (error) {
        logger.error('❌ Erro ao verificar pagamento:', error);
        return { success: false, message: 'Erro ao verificar pagamento' };
    }
}

// ============================================
// PROCESSAR BÔNUS DE RECARGA
// ============================================
async function processRechargeBonus(referrerPhone, amount) {
    try {
        const bonusPercentage = parseFloat(await getSetting('referral_bonus', '10'));
        const bonusAmount = amount * (bonusPercentage / 100);

        if (bonusAmount > 0) {
            User.updateBonusBalance(referrerPhone, bonusAmount);

            await sendTextMessage(
                referrerPhone,
                `💰 *BÔNUS DE RECARGA!*\n\n` +
                `Um indicado seu fez uma recarga de R$ ${amount.toFixed(2)}\n` +
                `Seu bônus: R$ ${bonusAmount.toFixed(2)} (${bonusPercentage}%)\n\n` +
                `Verifique seu saldo na área do associado! 🎉`
            );

            logger.info(`✅ Bônus de R$ ${bonusAmount.toFixed(2)} creditado para ${referrerPhone}`);
        }

    } catch (error) {
        logger.error('❌ Erro ao processar bônus de recarga:', error);
    }
}

// ============================================
// PROCESSAR COMPRA
// ============================================
async function processPurchase(phone, user, product) {
    try {
        const userBalance = parseFloat(user.balance);
        const productPrice = parseFloat(product.price);

        // Verificar saldo
        if (userBalance < productPrice) {
            return {
                success: false,
                message: 'insufficient_balance'
            };
        }

        // Verificar estoque
        if (product.stock <= 0) {
            return {
                success: false,
                message: 'out_of_stock'
            };
        }

        // Debita saldo
        User.updateBalance(phone, -productPrice);

        // Reduz estoque
        const Product = require('../database/models/Product');
        Product.decreaseStock(product.id);

        // Registrar transação
        const transactionId = generateId();
        Transaction.create(
            transactionId,
            phone,
            'purchase',
            productPrice,
            null,
            null,
            null,
            product.id
        );
        Transaction.updateStatus(transactionId, 'approved');

        // Processar bônus de compra para quem indicou
        if (user.referred_by) {
            await processPurchaseBonus(user.referred_by, productPrice);
        }

        return {
            success: true,
            transactionId: transactionId,
            balanceAfter: parseFloat(user.balance) - productPrice
        };

    } catch (error) {
        logger.error('❌ Erro ao processar compra:', error);
        return {
            success: false,
            message: 'Erro ao processar compra'
        };
    }
}

// ============================================
// PROCESSAR BÔNUS DE COMPRA
// ============================================
async function processPurchaseBonus(referrerPhone, purchaseAmount) {
    try {
        const bonusPercentage = parseFloat(await getSetting('referral_bonus', '10'));
        const bonusAmount = purchaseAmount * (bonusPercentage / 100);

        if (bonusAmount > 0) {
            User.updateBonusBalance(referrerPhone, bonusAmount);

            // Atualizar referrals
            const db = getDatabase();
            db.prepare(`
                UPDATE referrals 
                SET bonus_earned = bonus_earned + ? 
                WHERE referrer_phone = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            `).run(bonusAmount, referrerPhone);

            await sendTextMessage(
                referrerPhone,
                `💰 *BÔNUS DE COMPRA!*\n\n` +
                `Um indicado seu fez uma compra de R$ ${purchaseAmount.toFixed(2)}\n` +
                `Seu bônus: R$ ${bonusAmount.toFixed(2)} (${bonusPercentage}%)\n\n` +
                `Verifique seu saldo na área do associado! 🎉`
            );
        }

    } catch (error) {
        logger.error('❌ Erro ao processar bônus de compra:', error);
    }
}

// ============================================
// CANCELAR PAGAMENTOS EXPIRADOS
// ============================================
async function cancelExpiredPayments() {
    try {
        const expiredTransactions = Transaction.findExpired();

        for (const transaction of expiredTransactions) {
            Transaction.updateStatus(transaction.id, 'expired');
            logger.info(`⏰ Pagamento expirado: ${transaction.id}`);
        }

        if (expiredTransactions.length > 0) {
            logger.info(`✅ ${expiredTransactions.length} pagamentos expirados cancelados`);
        }

    } catch (error) {
        logger.error('❌ Erro ao cancelar pagamentos expirados:', error);
    }
}

// ============================================
// OBTER HISTÓRICO DE TRANSAÇÕES
// ============================================
function getTransactionHistory(phone, limit = 10) {
    try {
        const transactions = Transaction.findByUser(phone);
        return transactions.slice(0, limit);
    } catch (error) {
        logger.error('❌ Erro ao buscar histórico:', error);
        return [];
    }
}

// ============================================
// VERIFICAR SALDO SUFICIENTE
// ============================================
function hasEnoughBalance(phone, amount) {
    const user = User.findByPhone(phone);
    return user && parseFloat(user.balance) >= amount;
}

module.exports = {
    processRecharge,
    verifyPayment,
    processRechargeBonus,
    processPurchase,
    processPurchaseBonus,
    cancelExpiredPayments,
    getTransactionHistory,
    hasEnoughBalance
};
