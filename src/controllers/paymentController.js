// ============================================
// DOGUINHA STORE BOT - CONTROLE DE PAGAMENTOS
// ============================================

const { sendTextMessage, sendButtonMessage, sendImageMessage } = require('../services/whatsapp');
const { generatePix, generateQrCodeImage } = require('../services/mercadopago');
const User = require('../database/models/User');
const Transaction = require('../database/models/Transaction');
const { getMessage, processMessageVariables } = require('../utils/messages');
const { getPaymentButtons, getConfirmCancelButtons } = require('../utils/buttons');
const { getSetting } = require('../utils/settings');
const { generateId } = require('../utils/idGenerator');
const { formatDateTime } = require('../utils/dateUtils');
const logger = require('../utils/logger');

// ============================================
// MENU DE RECARGA
// ============================================
async function handlePaymentMenu(phone, user, selectedValue = null) {
    try {
        // Se veio um valor específico
        if (selectedValue) {
            let amount = 0;
            
            switch (selectedValue) {
                case 'pix_5':
                    amount = parseFloat(await getSetting('pix_value_1', '5.00'));
                    break;
                case 'pix_8':
                    amount = parseFloat(await getSetting('pix_value_2', '8.00'));
                    break;
                case 'pix_20':
                    amount = parseFloat(await getSetting('pix_value_3', '20.00'));
                    break;
                case 'pix_custom':
                    await sendTextMessage(phone, '💵 *DIGITE O VALOR DESEJADO:*\n\nEnvie o valor em reais (ex: 50)');
                    // Aguardar resposta do usuário
                    global.waitingFor = global.waitingFor || {};
                    global.waitingFor[phone] = 'custom_pix_value';
                    return;
                default:
                    await showPaymentMenu(phone, user);
                    return;
            }
            
            if (amount > 0) {
                await processPixPayment(phone, user, amount);
            }
            
        } else {
            await showPaymentMenu(phone, user);
        }
        
    } catch (error) {
        logger.error('❌ Erro no menu de pagamento:', error);
    }
}

// ============================================
// MOSTRAR MENU DE PAGAMENTO
// ============================================
async function showPaymentMenu(phone, user) {
    const message = getMessage('add_balance_menu');
    const buttons = await getPaymentButtons();
    
    await sendButtonMessage(phone, message, buttons);
}

// ============================================
// PROCESSAR VALOR PERSONALIZADO
// ============================================
async function handleCustomPixValue(phone, user, value) {
    try {
        const amount = parseFloat(value.replace(',', '.'));
        
        if (isNaN(amount) || amount <= 0) {
            await sendTextMessage(phone, '❌ *Valor inválido!*\n\nDigite um valor válido (ex: 50)');
            return;
        }
        
        if (amount < 1) {
            await sendTextMessage(phone, '❌ *Valor mínimo: R$ 1,00*');
            return;
        }
        
        await processPixPayment(phone, user, amount);
        
    } catch (error) {
        logger.error('❌ Erro ao processar valor personalizado:', error);
    }
}

// ============================================
// PROCESSAR PAGAMENTO PIX
// ============================================
async function processPixPayment(phone, user, amount) {
    try {
        // Mensagem de aguardando
        await sendTextMessage(phone, getMessage('generating_pix'));
        
        // Gerar PIX no Mercado Pago
        const pixData = await generatePix(amount);
        
        // Gerar QR Code como imagem
        const qrImagePath = await generateQrCodeImage(pixData.qr_code_base64);
        
        // Salvar transação
        const transactionId = pixData.id;
        Transaction.create(
            transactionId,
            phone,
            'deposit',
            amount,
            pixData.pix_code,
            pixData.qr_code_base64,
            pixData.expiration_date
        );
        
        // Preparar mensagem
        const pixMessage = processMessageVariables('pix_qrcode_header', {
            ...user,
            transaction_id: transactionId,
            amount: parseFloat(amount).toFixed(2),
            expiration_date: formatDateTime(pixData.expiration_date),
            expiration: await getSetting('pix_expiration', '30')
        });
        
        // Enviar QR Code como imagem
        await sendImageMessage(phone, qrImagePath, pixMessage);
        
        // Enviar código PIX copia e cola
        await sendTextMessage(phone, `*🔑 CÓDIGO PIX:*\n\n\`\`\`${pixData.pix_code}\`\`\`\n\n⚠️ Este código expira em ${await getSetting('pix_expiration', '30')} minutos.`);
        
        logger.info(`✅ PIX gerado para ${phone}: R$ ${amount}`);
        
    } catch (error) {
        logger.error('❌ Erro ao processar PIX:', error);
        await sendTextMessage(phone, '❌ *Erro ao gerar PIX!*\n\nTente novamente mais tarde.');
    }
}

module.exports = {
    handlePaymentMenu,
    handleCustomPixValue,
    showPaymentMenu
};
