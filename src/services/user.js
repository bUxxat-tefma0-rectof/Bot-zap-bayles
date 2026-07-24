// ============================================
// DOGUINHA STORE BOT - SERVIÇO DE USUÁRIOS
// ============================================

const User = require('../database/models/User');
const Referral = require('../database/models/Referral');
const { getSetting } = require('../utils/settings');
const { sendTextMessage } = require('./whatsapp');
const logger = require('../utils/logger');

// ============================================
// REGISTRAR USUÁRIO
// ============================================
async function registerUser(phone) {
    try {
        // Criar ou atualizar usuário
        const user = User.createOrUpdate(phone);
        
        logger.info(`👤 Usuário registrado: ${phone}`);
        
        return user;

    } catch (error) {
        logger.error('❌ Erro ao registrar usuário:', error);
        return null;
    }
}

// ============================================
// OBTER DADOS DO USUÁRIO
// ============================================
function getUserData(phone) {
    try {
        const user = User.findByPhone(phone);
        
        if (!user) return null;

        return {
            phone: user.phone,
            balance: parseFloat(user.balance || 0).toFixed(2),
            bonusBalance: parseFloat(user.bonus_balance || 0).toFixed(2),
            isAdmin: user.is_admin === 1,
            isBlocked: user.is_blocked === 1,
            referralCode: user.referral_code,
            referralLink: `https://api.whatsapp.com/send?phone=${process.env.WHATSAPP_NUMBER}&text=${user.referral_code}`,
            totalReferrals: user.total_referrals || 0,
            referredBy: user.referred_by || null,
            createdAt: user.created_at,
            lastInteraction: user.last_interaction
        };

    } catch (error) {
        logger.error('❌ Erro ao obter dados do usuário:', error);
        return null;
    }
}

// ============================================
// VERIFICAR SALDO
// ============================================
function checkBalance(phone) {
    const user = User.findByPhone(phone);
    return user ? parseFloat(user.balance || 0) : 0;
}

// ============================================
// ADICIONAR SALDO
// ============================================
function addBalance(phone, amount) {
    try {
        User.updateBalance(phone, amount);
        const user = User.findByPhone(phone);
        
        logger.info(`💰 Saldo adicionado: ${phone} +R$ ${amount.toFixed(2)}`);
        
        return parseFloat(user.balance).toFixed(2);

    } catch (error) {
        logger.error('❌ Erro ao adicionar saldo:', error);
        return null;
    }
}

// ============================================
// DEDUZIR SALDO
// ============================================
function deductBalance(phone, amount) {
    try {
        const user = User.findByPhone(phone);
        
        if (parseFloat(user.balance) < amount) {
            return { success: false, message: 'Saldo insuficiente' };
        }

        User.updateBalance(phone, -amount);
        const updatedUser = User.findByPhone(phone);
        
        return {
            success: true,
            balanceAfter: parseFloat(updatedUser.balance).toFixed(2)
        };

    } catch (error) {
        logger.error('❌ Erro ao deduzir saldo:', error);
        return { success: false, message: 'Erro ao processar' };
    }
}

// ============================================
// BLOQUEAR/DESBLOQUEAR USUÁRIO
// ============================================
async function toggleBlockUser(adminPhone, targetPhone) {
    try {
        if (!User.isAdmin(adminPhone)) {
            return { success: false, message: 'Acesso negado' };
        }

        const updatedUser = User.toggleBlock(targetPhone);
        
        const status = updatedUser.is_blocked === 1 ? 'bloqueado' : 'desbloqueado';
        
        // Notificar usuário
        if (updatedUser.is_blocked === 1) {
            await sendTextMessage(
                targetPhone,
                '⛔ *VOCÊ FOI BLOQUEADO!*\n\nEntre em contato com o suporte para mais informações.'
            );
        } else {
            await sendTextMessage(
                targetPhone,
                '✅ *VOCÊ FOI DESBLOQUEADO!*\n\nAgora você pode usar o bot novamente.'
            );
        }

        logger.info(`👤 Usuário ${targetPhone} ${status} por ${adminPhone}`);
        
        return { success: true, status: status };

    } catch (error) {
        logger.error('❌ Erro ao bloquear/desbloquear:', error);
        return { success: false, message: 'Erro ao processar' };
    }
}

// ============================================
// LISTAR USUÁRIOS
// ============================================
function listUsers(adminPhone, limit = 20) {
    try {
        if (!User.isAdmin(adminPhone)) {
            return { success: false, message: 'Acesso negado' };
        }

        const users = User.findAll();
        
        const usersList = users.slice(0, limit).map(u => ({
            phone: u.phone,
            balance: parseFloat(u.balance || 0).toFixed(2),
            bonusBalance: parseFloat(u.bonus_balance || 0).toFixed(2),
            totalReferrals: u.total_referrals,
            isBlocked: u.is_blocked === 1,
            createdAt: u.created_at
        }));

        return {
            success: true,
            total: users.length,
            users: usersList
        };

    } catch (error) {
        logger.error('❌ Erro ao listar usuários:', error);
        return { success: false, message: 'Erro ao listar' };
    }
}

// ============================================
// OBTER ESTATÍSTICAS DO USUÁRIO
// ============================================
function getUserStats(phone) {
    try {
        const user = User.findByPhone(phone);
        if (!user) return null;

        const referrals = Referral.findByReferrer(phone);
        const totalBonusEarned = Referral.totalBonusEarned(phone);
        const referralCount = Referral.countByReferrer(phone);

        return {
            phone: phone,
            balance: parseFloat(user.balance || 0).toFixed(2),
            bonusBalance: parseFloat(user.bonus_balance || 0).toFixed(2),
            totalReferrals: referralCount,
            totalBonusEarned: totalBonusEarned.toFixed(2),
            referralCode: user.referral_code,
            referralLink: `https://api.whatsapp.com/send?phone=${process.env.WHATSAPP_NUMBER}&text=${user.referral_code}`,
            referrals: referrals.map(r => ({
                referredPhone: r.referred_phone,
                bonusEarned: parseFloat(r.bonus_earned || 0).toFixed(2),
                createdAt: r.created_at
            }))
        };

    } catch (error) {
        logger.error('❌ Erro ao obter estatísticas:', error);
        return null;
    }
}

// ============================================
// DELETAR USUÁRIO (ADMIN)
// ============================================
function deleteUser(adminPhone, targetPhone) {
    try {
        if (!User.isAdmin(adminPhone)) {
            return { success: false, message: 'Acesso negado' };
        }

        const db = require('../database/connection').getDatabase();
        
        // Deletar transações
        db.prepare('DELETE FROM transactions WHERE user_phone = ?').run(targetPhone);
        
        // Deletar indicações
        db.prepare('DELETE FROM referrals WHERE referrer_phone = ? OR referred_phone = ?').run(targetPhone, targetPhone);
        
        // Deletar usuário
        db.prepare('DELETE FROM users WHERE phone = ?').run(targetPhone);

        logger.info(`🗑️ Usuário deletado: ${targetPhone} por ${adminPhone}`);
        
        return { success: true, message: 'Usuário deletado com sucesso' };

    } catch (error) {
        logger.error('❌ Erro ao deletar usuário:', error);
        return { success: false, message: 'Erro ao deletar' };
    }
}

module.exports = {
    registerUser,
    getUserData,
    checkBalance,
    addBalance,
    deductBalance,
    toggleBlockUser,
    listUsers,
    getUserStats,
    deleteUser
};
