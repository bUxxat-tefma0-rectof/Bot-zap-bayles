// ============================================
// DOGUINHA STORE BOT - CONTROLE DE INDICAÇÕES
// ============================================

const { sendTextMessage, sendButtonMessage } = require('../services/whatsapp');
const User = require('../database/models/User');
const Referral = require('../database/models/Referral');
const { getMessage, processMessageVariables } = require('../utils/messages');
const { getReferralButtons } = require('../utils/buttons');
const { getSetting } = require('../utils/settings');
const logger = require('../utils/logger');

// ============================================
// MENU ÁREA DO ASSOCIADO
// ============================================
async function handleReferralMenu(phone, user) {
    try {
        const bonusPercentage = await getSetting('referral_bonus', '10');
        
        const message = processMessageVariables('referral_menu', {
            ...user,
            referral_link: `https://api.whatsapp.com/send?phone=${process.env.WHATSAPP_NUMBER}&text=${user.referral_code}`,
            referral_code: user.referral_code,
            bonus_balance: parseFloat(user.bonus_balance || 0).toFixed(2),
            total_referrals: user.total_referrals || 0,
            bonus_percentage: bonusPercentage
        });
        
        const buttons = getReferralButtons();
        
        await sendButtonMessage(phone, message, buttons);
        
    } catch (error) {
        logger.error('❌ Erro no menu de indicação:', error);
    }
}

// ============================================
// TEXTO MODELO DE INDICAÇÃO
// ============================================
async function sendReferralTextModel(phone, user) {
    try {
        const message = processMessageVariables('referral_text_model', {
            ...user,
            referral_link: `https://api.whatsapp.com/send?phone=${process.env.WHATSAPP_NUMBER}&text=${user.referral_code}`,
            referral_code: user.referral_code
        });
        
        await sendTextMessage(phone, message);
        
    } catch (error) {
        logger.error('❌ Erro ao enviar texto modelo:', error);
    }
}

// ============================================
// PROCESSAR CÓDIGO DE INDICAÇÃO
// ============================================
async function processReferralCode(phone, code, user) {
    try {
        // Verificar se já foi indicado
        if (user.referred_by) {
            await sendTextMessage(phone, 'ℹ️ *Você já foi indicado anteriormente!*');
            return;
        }
        
        // Verificar se está tentando se auto-indicar
        if (code === user.referral_code) {
            await sendTextMessage(phone, '❌ *Você não pode se auto-indicar!*');
            return;
        }
        
        // Buscar quem indicou
        const referrer = User.findByReferralCode(code);
        
        if (!referrer) {
            await sendTextMessage(phone, '❌ *Código de indicação inválido!*');
            return;
        }
        
        // Registrar indicação
        Referral.create(referrer.phone, phone, 0);
        
        // Atualizar usuário
        User.incrementReferrals(referrer.phone);
        
        // Vincular indicador ao usuário
        const db = require('../database/connection').getDatabase();
        db.prepare('UPDATE users SET referred_by = ? WHERE phone = ?').run(referrer.phone, phone);
        
        await sendTextMessage(phone, `✅ *Indicação registrada com sucesso!*\n\nVocê foi indicado por ${referrer.phone}`);
        
        // Notificar quem indicou
        const { sendTextMessage: sendMsg } = require('../services/whatsapp');
        await sendMsg(referrer.phone, `🎉 *NOVA INDICAÇÃO!*\n\n${phone} se cadastrou com seu código!\n\nTotal de indicados: ${referrer.total_referrals + 1}`);
        
    } catch (error) {
        logger.error('❌ Erro ao processar indicação:', error);
    }
}

// ============================================
// PROCESSAR BÔNUS DE INDICAÇÃO
// ============================================
async function processReferralBonus(referrerPhone, referredPhone, purchaseAmount) {
    try {
        const bonusPercentage = parseFloat(await getSetting('referral_bonus', '10'));
        const bonusAmount = purchaseAmount * (bonusPercentage / 100);
        
        // Creditar bônus
        User.updateBonusBalance(referrerPhone, bonusAmount);
        
        // Atualizar valor na tabela de referrals
        const db = require('../database/connection').getDatabase();
        db.prepare('UPDATE referrals SET bonus_earned = bonus_earned + ? WHERE referrer_phone = ? AND referred_phone = ?')
            .run(bonusAmount, referrerPhone, referredPhone);
        
        // Notificar
        const { sendTextMessage } = require('../services/whatsapp');
        await sendTextMessage(
            referrerPhone,
            `💰 *BÔNUS RECEBIDO!*\n\n` +
            `${referredPhone} fez uma compra de R$ ${purchaseAmount.toFixed(2)}\n` +
            `Seu bônus: R$ ${bonusAmount.toFixed(2)} (${bonusPercentage}%)\n\n` +
            `Verifique seu saldo na área do associado!`
        );
        
    } catch (error) {
        logger.error('❌ Erro ao processar bônus:', error);
    }
}

module.exports = {
    handleReferralMenu,
    sendReferralTextModel,
    processReferralCode,
    processReferralBonus
};
