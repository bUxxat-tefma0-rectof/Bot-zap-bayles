// ============================================
// DOGUINHA STORE BOT - SERVIÇO DE INDICAÇÕES
// ============================================

const User = require('../database/models/User');
const Referral = require('../database/models/Referral');
const { getSetting } = require('../utils/settings');
const { sendTextMessage } = require('./whatsapp');
const logger = require('../utils/logger');

// ============================================
// PROCESSAR CÓDIGO DE INDICAÇÃO
// ============================================
async function processReferral(phone, code) {
    try {
        // Verificar se já foi indicado
        const user = User.findByPhone(phone);
        
        if (user.referred_by) {
            return { 
                success: false, 
                message: 'ℹ️ *Você já foi indicado anteriormente!*' 
            };
        }

        // Verificar auto-indicação
        if (code === user.referral_code) {
            return { 
                success: false, 
                message: '❌ *Você não pode se auto-indicar!*' 
            };
        }

        // Buscar indicador
        const referrer = User.findByReferralCode(code);
        
        if (!referrer) {
            return { 
                success: false, 
                message: '❌ *Código de indicação inválido!*' 
            };
        }

        // Registrar indicação
        Referral.create(referrer.phone, phone, 0);
        
        // Atualizar contador do indicador
        User.incrementReferrals(referrer.phone);
        
        // Vincular indicador
        const db = require('../database/connection').getDatabase();
        db.prepare('UPDATE users SET referred_by = ? WHERE phone = ?').run(referrer.phone, phone);

        // Notificar novo usuário
        await sendTextMessage(
            phone,
            `✅ *INDICAÇÃO REGISTRADA!*\n\n` +
            `Você foi indicado com sucesso!\n\n` +
            `Agora você pode aproveitar todos os benefícios do bot. 🎉`
        );

        // Notificar indicador
        const updatedReferrer = User.findByPhone(referrer.phone);
        await sendTextMessage(
            referrer.phone,
            `🎉 *NOVA INDICAÇÃO!*\n\n` +
            `📞 ${phone} se cadastrou com seu código!\n` +
            `👥 Total de indicados: ${updatedReferrer.total_referrals}\n\n` +
            `Continue indicando para ganhar mais bônus! 💰`
        );

        logger.info(`🔗 Indicação: ${referrer.phone} indicou ${phone}`);

        return {
            success: true,
            message: 'Indicação registrada com sucesso!',
            referrer: referrer.phone
        };

    } catch (error) {
        logger.error('❌ Erro ao processar indicação:', error);
        return { success: false, message: 'Erro ao processar indicação' };
    }
}

// ============================================
// GERAR LINK DE INDICAÇÃO
// ============================================
function generateReferralLink(phone) {
    const user = User.findByPhone(phone);
    
    if (!user) return null;

    const botNumber = process.env.WHATSAPP_NUMBER;
    
    return {
        code: user.referral_code,
        link: `https://api.whatsapp.com/send?phone=${botNumber}&text=${user.referral_code}`,
        shortLink: `https://wa.me/${botNumber}?text=${user.referral_code}`
    };
}

// ============================================
// OBTER DADOS DE INDICAÇÃO
// ============================================
function getReferralData(phone) {
    try {
        const user = User.findByPhone(phone);
        if (!user) return null;

        const referrals = Referral.findByReferrer(phone);
        const totalBonus = Referral.totalBonusEarned(phone);
        const totalReferrals = Referral.countByReferrer(phone);
        const bonusPercentage = getSetting('referral_bonus', '10');

        return {
            phone: phone,
            referralCode: user.referral_code,
            referralLink: `https://api.whatsapp.com/send?phone=${process.env.WHATSAPP_NUMBER}&text=${user.referral_code}`,
            totalReferrals: totalReferrals,
            totalBonus: totalBonus.toFixed(2),
            bonusPercentage: bonusPercentage,
            referrals: referrals.map(r => ({
                phone: r.referred_phone,
                bonus: parseFloat(r.bonus_earned || 0).toFixed(2),
                date: r.created_at
            }))
        };

    } catch (error) {
        logger.error('❌ Erro ao obter dados de indicação:', error);
        return null;
    }
}

// ============================================
// GERAR TEXTO MODELO
// ============================================
function generateReferralText(phone) {
    const data = getReferralData(phone);
    
    if (!data) return 'Erro ao gerar texto';

    return `🎬 *BORA TER ACESSO AOS MELHORES STREAMINGS!* 🎬\n\n` +
           `Estou indicando um bot incrível que te dá acesso a contas de:\n\n` +
           `✅ Netflix\n` +
           `✅ HBO Max\n` +
           `✅ Disney+\n` +
           `✅ Globoplay\n` +
           `✅ Amazon Prime\n` +
           `✅ Paramount+\n` +
           `✅ E MUITO MAIS!\n\n` +
           `💬 *É muito fácil participar:*\n` +
           `1️⃣ Clique no link e fale direto com o bot:\n` +
           `👉 ${data.referralLink}\n\n` +
           `2️⃣ Ou envie o *código de indicação:*\n` +
           `🔹 ${data.referralCode}\n\n` +
           `⚡ *Vantagens:*\n` +
           `✔ Contas premium atualizadas\n` +
           `✔ Preços acessíveis\n` +
           `✔ Suporte rápido\n\n` +
           `*Garanta já seu acesso e aproveite os melhores conteúdos!*\n` +
           `📲 *Corre lá e garanta o seu!*`;
}

// ============================================
// LISTAR TOP INDICADORES
// ============================================
function getTopReferrers(limit = 10) {
    try {
        const db = require('../database/connection').getDatabase();
        
        const topReferrers = db.prepare(`
            SELECT 
                u.phone,
                u.total_referrals,
                u.bonus_balance,
                COUNT(r.id) as total_indications,
                SUM(r.bonus_earned) as total_earned
            FROM users u
            LEFT JOIN referrals r ON u.phone = r.referrer_phone
            GROUP BY u.phone
            ORDER BY total_indications DESC
            LIMIT ?
        `).all(limit);

        return {
            success: true,
            topReferrers: topReferrers.map(r => ({
                phone: r.phone,
                totalIndications: r.total_indications,
                totalBonus: parseFloat(r.total_earned || 0).toFixed(2),
                bonusBalance: parseFloat(r.bonus_balance || 0).toFixed(2)
            }))
        };

    } catch (error) {
        logger.error('❌ Erro ao listar top indicadores:', error);
        return { success: false, message: 'Erro ao listar' };
    }
}

// ============================================
// ATUALIZAR PORCENTAGEM DE BÔNUS
// ============================================
function updateBonusPercentage(percentage) {
    try {
        const { updateSetting } = require('../utils/settings');
        updateSetting('referral_bonus', percentage.toString());
        
        logger.info(`🔧 Bônus de indicação atualizado para ${percentage}%`);
        
        return { success: true, percentage: percentage };

    } catch (error) {
        logger.error('❌ Erro ao atualizar bônus:', error);
        return { success: false, message: 'Erro ao atualizar' };
    }
}

module.exports = {
    processReferral,
    generateReferralLink,
    getReferralData,
    generateReferralText,
    getTopReferrers,
    updateBonusPercentage
};
