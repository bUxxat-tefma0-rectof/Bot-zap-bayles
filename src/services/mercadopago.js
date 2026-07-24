// ============================================
// DOGUINHA STORE BOT - SERVIÇO MERCADO PAGO
// ============================================

const mercadopago = require('mercadopago');
const { config } = require('../config/database');
const logger = require('../utils/logger');
const { generateId } = require('../utils/idGenerator');
const { addMinutes, formatDateTime } = require('../utils/dateUtils');

// ============================================
// CONFIGURAR MERCADO PAGO
// ============================================
mercadopago.configure({
    access_token: config.mercadopago.accessToken
});

// ============================================
// GERAR PIX
// ============================================
async function generatePix(amount, description = 'Recarga Doguinha Store') {
    try {
        logger.info(`🔄 Gerando PIX de R$ ${amount}...`);
        
        const expirationMinutes = config.pix.expirationMinutes;
        const expirationDate = addMinutes(expirationMinutes);
        
        const payment = {
            transaction_amount: parseFloat(amount),
            description: description,
            payment_method_id: 'pix',
            payer: {
                email: 'cliente@doguinhastore.com',
                first_name: 'Cliente',
                last_name: 'Doguinha Store'
            },
            date_of_expiration: expirationDate.toISOString()
        };

        const response = await mercadopago.payment.create(payment);
        
        const pixData = {
            id: response.body.id.toString(),
            qr_code: response.body.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: response.body.point_of_interaction.transaction_data.qr_code_base64,
            pix_code: response.body.point_of_interaction.transaction_data.qr_code,
            amount: amount,
            status: response.body.status,
            expiration_date: expirationDate,
            created_at: new Date()
        };

        logger.info(`✅ PIX gerado: ID ${pixData.id}`);
        
        return pixData;

    } catch (error) {
        logger.error('❌ Erro ao gerar PIX:', error);
        throw error;
    }
}

// ============================================
// VERIFICAR STATUS DO PAGAMENTO
// ============================================
async function checkPaymentStatus(paymentId) {
    try {
        const response = await mercadopago.payment.findById(paymentId);
        
        return {
            id: response.body.id.toString(),
            status: response.body.status,
            approved: response.body.status === 'approved',
            rejected: response.body.status === 'rejected',
            pending: response.body.status === 'pending',
            expired: response.body.status === 'cancelled'
        };

    } catch (error) {
        logger.error('❌ Erro ao verificar status:', error);
        throw error;
    }
}

// ============================================
// PROCESSAR WEBHOOK
// ============================================
async function processWebhook(body) {
    try {
        if (body.type === 'payment') {
            const paymentId = body.data.id;
            logger.info(`🔄 Webhook recebido: Pagamento ${paymentId}`);
            
            const status = await checkPaymentStatus(paymentId);
            
            if (status.approved) {
                // Processar pagamento aprovado
                await handleApprovedPayment(paymentId);
            }
            
            return status;
        }

    } catch (error) {
        logger.error('❌ Erro no webhook:', error);
        throw error;
    }
}

// ============================================
// GERAR QR CODE (IMAGEM)
// ============================================
async function generateQrCodeImage(qrCodeBase64) {
    try {
        const QRCode = require('qrcode');
        const qrImagePath = `${config.storage.qrcodesPath}/pix_${Date.now()}.png`;
        
        await QRCode.toFile(qrImagePath, qrCodeBase64, {
            type: 'png',
            width: 400,
            margin: 2
        });
        
        return qrImagePath;

    } catch (error) {
        logger.error('❌ Erro ao gerar QR Code:', error);
        throw error;
    }
}

// ============================================
// HANDLER: PAGAMENTO APROVADO
// ============================================
async function handleApprovedPayment(paymentId) {
    const Transaction = require('../database/models/Transaction');
    const User = require('../database/models/User');
    const { sendTextMessage } = require('./whatsapp');
    
    try {
        const transaction = Transaction.findById(paymentId);
        
        if (!transaction) {
            logger.warn(`⚠️ Transação ${paymentId} não encontrada`);
            return;
        }
        
        if (transaction.status !== 'pending') {
            logger.warn(`⚠️ Transação ${paymentId} já processada`);
            return;
        }
        
        // Atualizar status
        Transaction.updateStatus(paymentId, 'approved');
        
        // Creditar saldo
        User.updateBalance(transaction.user_phone, transaction.amount);
        
        const user = User.findByPhone(transaction.user_phone);
        
        // Notificar usuário
        await sendTextMessage(
            transaction.user_phone,
            `✅ *PAGAMENTO APROVADO!*\n\n` +
            `💰 Valor creditado: R$ ${parseFloat(transaction.amount).toFixed(2)}\n` +
            `💳 Saldo atual: R$ ${parseFloat(user.balance).toFixed(2)}\n\n` +
            `Obrigado pela recarga! 🎉`
        );
        
        logger.info(`✅ Pagamento ${paymentId} processado com sucesso!`);

    } catch (error) {
        logger.error(`❌ Erro ao processar pagamento ${paymentId}:`, error);
    }
}

// ============================================
// CANCELAR PAGAMENTO EXPIRADO
// ============================================
async function cancelExpiredPayment(paymentId) {
    const Transaction = require('../database/models/Transaction');
    
    try {
        const transaction = Transaction.findById(paymentId);
        
        if (transaction && transaction.status === 'pending') {
            Transaction.updateStatus(paymentId, 'expired');
            logger.info(`⏰ Pagamento ${paymentId} expirado`);
        }

    } catch (error) {
        logger.error(`❌ Erro ao cancelar pagamento ${paymentId}:`, error);
    }
}

module.exports = {
    generatePix,
    checkPaymentStatus,
    processWebhook,
    generateQrCodeImage,
    handleApprovedPayment,
    cancelExpiredPayment
};
