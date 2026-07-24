// ============================================
// DOGUINHA STORE BOT - CONTROLE DE PRODUTOS
// ============================================

const { sendTextMessage, sendButtonMessage, sendPdfMessage } = require('../services/whatsapp');
const { generateCredentialsPdf, deletePdf } = require('../services/pdf');
const User = require('../database/models/User');
const Product = require('../database/models/Product');
const Transaction = require('../database/models/Transaction');
const { getMessage, processMessageVariables } = require('../utils/messages');
const { getProductButtons, getConfirmCancelButtons, getBackButton } = require('../utils/buttons');
const { generateId } = require('../utils/idGenerator');
const logger = require('../utils/logger');

// ============================================
// MENU DE ASSINATURAS PREMIUM
// ============================================
async function handlePremiumMenu(phone, user, page = 1) {
    try {
        const products = Product.findAllActive();
        
        if (products.length === 0) {
            await sendTextMessage(phone, '📭 *Nenhum produto disponível no momento!*\n\nVolte mais tarde.');
            return;
        }
        
        // Paginação (5 produtos por página)
        const itemsPerPage = 5;
        const totalPages = Math.ceil(products.length / itemsPerPage);
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageProducts = products.slice(start, end);
        
        // Mensagem do menu premium
        let message = processMessageVariables('premium_menu', user);
        message += '\n\n*📦 PRODUTOS DISPONÍVEIS:*\n\n';
        
        // Listar produtos
        for (const product of pageProducts) {
            message += `📌 *${product.name}*\n`;
            message += `💰 Valor: R$ ${parseFloat(product.price).toFixed(2)}\n`;
            message += `📦 Estoque: ${product.stock} unidades\n`;
            message += `━━━━━━━━━━━━━━\n`;
        }
        
        message += `\n📄 Página ${page} de ${totalPages}`;
        
        // Botões dos produtos
        const buttons = getProductButtons(pageProducts, page, totalPages);
        
        await sendButtonMessage(phone, message, buttons);
        
    } catch (error) {
        logger.error('❌ Erro no menu premium:', error);
    }
}

// ============================================
// COMPRAR PRODUTO
// ============================================
async function handleProductPurchase(phone, user, buttonId) {
    try {
        const productId = parseInt(buttonId.replace('buy_', ''));
        const product = Product.findById(productId);
        
        if (!product) {
            await sendTextMessage(phone, '❌ *Produto não encontrado!*');
            return;
        }
        
        // Verificar estoque
        if (!Product.hasStock(productId)) {
            await sendTextMessage(phone, getMessage('out_of_stock'));
            return;
        }
        
        // Verificar saldo
        const userBalance = parseFloat(user.balance);
        const productPrice = parseFloat(product.price);
        
        if (userBalance < productPrice) {
            await sendTextMessage(phone, getMessage('insufficient_balance'));
            return;
        }
        
        // Mostrar confirmação
        const balanceAfter = (userBalance - productPrice).toFixed(2);
        const confirmMessage = processMessageVariables('purchase_confirmation', {
            ...user,
            product_name: product.name,
            product_price: productPrice.toFixed(2),
            user_balance: userBalance.toFixed(2),
            balance_after: balanceAfter
        });
        
        const buttons = [
            { id: `confirm_buy_${productId}`, text: '✅ Confirmar' },
            { id: 'premium', text: '❌ Cancelar' }
        ];
        
        await sendButtonMessage(phone, confirmMessage, buttons);
        
    } catch (error) {
        logger.error('❌ Erro ao comprar produto:', error);
    }
}

// ============================================
// CONFIRMAR COMPRA
// ============================================
async function handleConfirmPurchase(phone, user, buttonId) {
    try {
        const productId = parseInt(buttonId.replace('confirm_buy_', ''));
        const product = Product.findById(productId);
        
        if (!product || !Product.hasStock(productId)) {
            await sendTextMessage(phone, '❌ *Produto indisponível!*');
            return;
        }
        
        const userBalance = parseFloat(user.balance);
        const productPrice = parseFloat(product.price);
        
        // Verificar saldo novamente
        if (userBalance < productPrice) {
            await sendTextMessage(phone, getMessage('insufficient_balance'));
            return;
        }
        
        // Debita saldo
        User.updateBalance(phone, -productPrice);
        
        // Reduz estoque
        Product.decreaseStock(productId);
        
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
            productId
        );
        Transaction.updateStatus(transactionId, 'approved');
        
        // Gerar PDF com credenciais
        let credentials = product.credentials_file || `Login: usuario_${Date.now()}\nSenha: senha_${Date.now()}`;
        
        const pdfData = await generateCredentialsPdf(product.name, credentials, phone);
        
        // Atualizar usuário
        const updatedUser = User.findByPhone(phone);
        const balanceAfter = parseFloat(updatedUser.balance).toFixed(2);
        
        // Mensagem de sucesso
        const successMessage = processMessageVariables('purchase_success', {
            ...updatedUser,
            product_name: product.name,
            product_price: productPrice.toFixed(2),
            balance_after: balanceAfter
        });
        
        await sendTextMessage(phone, successMessage);
        
        // Enviar PDF
        await sendPdfMessage(phone, pdfData.filePath, `${product.name}.pdf`);
        
        // Deletar PDF após envio
        setTimeout(() => {
            deletePdf(pdfData.filePath);
        }, 5000);
        
        // Bônus para quem indicou
        if (user.referred_by) {
            const { processReferralBonus } = require('./referralController');
            await processReferralBonus(user.referred_by, phone, productPrice);
        }
        
        logger.info(`✅ Compra realizada: ${phone} comprou ${product.name}`);
        
    } catch (error) {
        logger.error('❌ Erro ao confirmar compra:', error);
        await sendTextMessage(phone, '❌ *Erro ao processar compra!*\n\nTente novamente.');
    }
}

module.exports = {
    handlePremiumMenu,
    handleProductPurchase,
    handleConfirmPurchase
};
