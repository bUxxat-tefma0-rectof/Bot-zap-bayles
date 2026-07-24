// ============================================
// DOGUINHA STORE BOT - CONTROLE DE MENU
// ============================================

const { sendButtonMessage, sendTextMessage } = require('../services/whatsapp');
const User = require('../database/models/User');
const { getMessage, processMessageVariables } = require('../utils/messages');
const { getMainMenuButtons } = require('../utils/buttons');
const { handlePaymentMenu } = require('./paymentController');
const { handlePremiumMenu } = require('./productController');
const { handleReferralMenu } = require('./referralController');
const { handleSupportMenu } = require('./supportController');
const { handleAdminMenu } = require('./adminController');
const logger = require('../utils/logger');

// ============================================
// PROCESSAR MENSAGEM RECEBIDA
// ============================================
async function handleMessage(sock, message) {
    try {
        const phone = message.key.remoteJid.replace('@s.whatsapp.net', '');
        const messageType = getMessageType(message);
        const messageText = getMessageText(message);
        
        // Ignorar status e grupos
        if (message.key.remoteJid.includes('@g.us') || message.key.remoteJid.includes('@broadcast')) {
            return;
        }

        // Criar/atualizar usuário
        const user = User.createOrUpdate(phone);

        // Verificar se está bloqueado
        if (User.isBlocked(phone)) {
            await sendTextMessage(phone, '⛔ *Você está bloqueado!*\n\nEntre em contato com o suporte.');
            return;
        }

        // Verificar se é admin
        const isAdmin = User.isAdmin(phone);

        // Comandos especiais
        if (messageText) {
            // Admin
            if (isAdmin && messageText.toLowerCase() === '#admin') {
                return await handleAdminMenu(phone, user);
            }

            // Código de indicação
            if (messageText.toUpperCase().startsWith('BONUS_COD_')) {
                return await handleReferralCode(phone, messageText, user);
            }
        }

        // Botões interativos
        if (messageType === 'buttons_response') {
            return await handleButtonClick(phone, messageText, user, isAdmin);
        }

        // Mensagem de texto normal
        if (messageText && !messageText.startsWith('#')) {
            return await showMainMenu(phone, user);
        }

    } catch (error) {
        logger.error('❌ Erro ao processar mensagem:', error);
    }
}

// ============================================
// OBTER TIPO DE MENSAGEM
// ============================================
function getMessageType(message) {
    if (message.message?.buttonsResponseMessage) return 'buttons_response';
    if (message.message?.listResponseMessage) return 'list_response';
    if (message.message?.conversation) return 'text';
    if (message.message?.extendedTextMessage) return 'text';
    if (message.message?.imageMessage) return 'image';
    return 'unknown';
}

// ============================================
// OBTER TEXTO DA MENSAGEM
// ============================================
function getMessageText(message) {
    if (message.message?.conversation) return message.message.conversation;
    if (message.message?.extendedTextMessage?.text) return message.message.extendedTextMessage.text;
    if (message.message?.buttonsResponseMessage?.selectedButtonId) {
        return message.message.buttonsResponseMessage.selectedButtonId;
    }
    if (message.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
        return message.message.listResponseMessage.singleSelectReply.selectedRowId;
    }
    return null;
}

// ============================================
// MOSTRAR MENU INICIAL
// ============================================
async function showMainMenu(phone, user) {
    try {
        const message = processMessageVariables('welcome_message', user);
        const buttons = getMainMenuButtons();
        
        await sendButtonMessage(phone, message, buttons);
        
    } catch (error) {
        logger.error('❌ Erro ao mostrar menu:', error);
    }
}

// ============================================
// PROCESSAR CLIQUE EM BOTÃO
// ============================================
async function handleButtonClick(phone, buttonId, user, isAdmin) {
    switch (buttonId) {
        case 'add_balance':
            return await handlePaymentMenu(phone, user);
            
        case 'premium':
            return await handlePremiumMenu(phone, user);
            
        case 'referral':
            return await handleReferralMenu(phone, user);
            
        case 'support':
            return await handleSupportMenu(phone, user);
            
        case 'main_menu':
            return await showMainMenu(phone, user);
            
        case 'text_model':
            return await handleReferralTextModel(phone, user);
            
        case 'admin_panel':
            if (isAdmin) {
                return await handleAdminMenu(phone, user);
            }
            break;
            
        default:
            // Verificar se é um valor de PIX
            if (buttonId.startsWith('pix_')) {
                return await handlePaymentMenu(phone, user, buttonId);
            }
            
            // Verificar se é um produto
            if (buttonId.startsWith('buy_')) {
                const { handleProductPurchase } = require('./productController');
                return await handleProductPurchase(phone, user, buttonId);
            }
            
            // Menu principal por padrão
            await showMainMenu(phone, user);
    }
}

// ============================================
// PROCESSAR CÓDIGO DE INDICAÇÃO
// ============================================
async function handleReferralCode(phone, code, user) {
    const { processReferralCode } = require('./referralController');
    await processReferralCode(phone, code, user);
    await showMainMenu(phone, user);
}

// ============================================
// HANDLER TEXTO MODELO DE INDICAÇÃO
// ============================================
async function handleReferralTextModel(phone, user) {
    const { sendReferralTextModel } = require('./referralController');
    await sendReferralTextModel(phone, user);
}

module.exports = {
    handleMessage,
    showMainMenu,
    handleButtonClick
};
