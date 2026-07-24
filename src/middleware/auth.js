// ============================================
// DOGUINHA STORE BOT - MIDDLEWARE DE AUTENTICAÇÃO
// ============================================

const User = require('../database/models/User');
const { sendTextMessage } = require('../services/whatsapp');
const logger = require('../utils/logger');

// ============================================
// VERIFICAR SE É ADMIN
// ============================================
async function requireAdmin(phone) {
    try {
        const isAdmin = User.isAdmin(phone);
        
        if (!isAdmin) {
            await sendTextMessage(phone, '⛔ *ACESSO NEGADO!*\n\nApenas administradores podem acessar esta função.');
            logger.warn(`⚠️ Tentativa de acesso admin negada: ${phone}`);
            return false;
        }
        
        return true;
        
    } catch (error) {
        logger.error('❌ Erro na autenticação admin:', error);
        await sendTextMessage(phone, '❌ *Erro ao verificar permissão!*');
        return false;
    }
}

// ============================================
// VERIFICAR SE USUÁRIO EXISTE
// ============================================
async function requireUser(phone) {
    try {
        const user = User.findByPhone(phone);
        
        if (!user) {
            // Criar usuário automaticamente
            User.createOrUpdate(phone);
            logger.info(`👤 Novo usuário criado: ${phone}`);
            return User.findByPhone(phone);
        }
        
        return user;
        
    } catch (error) {
        logger.error('❌ Erro ao verificar usuário:', error);
        return null;
    }
}

// ============================================
// VERIFICAR SE USUÁRIO NÃO ESTÁ BLOQUEADO
// ============================================
async function requireNotBlocked(phone) {
    try {
        const isBlocked = User.isBlocked(phone);
        
        if (isBlocked) {
            await sendTextMessage(
                phone,
                '⛔ *VOCÊ ESTÁ BLOQUEADO!*\n\n' +
                'Entre em contato com o suporte para mais informações.'
            );
            logger.warn(`⚠️ Usuário bloqueado tentou acessar: ${phone}`);
            return false;
        }
        
        return true;
        
    } catch (error) {
        logger.error('❌ Erro ao verificar bloqueio:', error);
        return false;
    }
}

// ============================================
// VERIFICAR SE TEM SALDO SUFICIENTE
// ============================================
async function requireBalance(phone, amount) {
    try {
        const user = User.findByPhone(phone);
        
        if (!user) return false;
        
        const balance = parseFloat(user.balance || 0);
        
        if (balance < amount) {
            await sendTextMessage(
                phone,
                `*❌ SALDO INSUFICIENTE!*\n\n` +
                `💰 Seu saldo: R$ ${balance.toFixed(2)}\n` +
                `💳 Valor necessário: R$ ${amount.toFixed(2)}\n\n` +
                `Faça uma recarga e tente novamente! 💰`
            );
            return false;
        }
        
        return true;
        
    } catch (error) {
        logger.error('❌ Erro ao verificar saldo:', error);
        return false;
    }
}

// ============================================
// VERIFICAR SE PRODUTO EXISTE E TEM ESTOQUE
// ============================================
async function requireProductAvailable(productId, phone) {
    try {
        const Product = require('../database/models/Product');
        const product = Product.findById(productId);
        
        if (!product) {
            await sendTextMessage(phone, '❌ *Produto não encontrado!*');
            return false;
        }
        
        if (!product.is_active) {
            await sendTextMessage(phone, '❌ *Produto indisponível no momento!*');
            return false;
        }
        
        if (product.stock <= 0) {
            await sendTextMessage(phone, '❌ *Produto esgotado!*\n\nTente novamente mais tarde.');
            return false;
        }
        
        return product;
        
    } catch (error) {
        logger.error('❌ Erro ao verificar produto:', error);
        return false;
    }
}

// ============================================
// MIDDLEWARE COMPLETO (EXECUTAR TODOS)
// ============================================
async function authenticateRequest(phone, options = {}) {
    try {
        const checks = {
            user: true,
            notBlocked: true,
            admin: false,
            balance: null,
            product: null
        };
        
        // Verificar usuário
        if (checks.user) {
            const user = await requireUser(phone);
            if (!user) return { authenticated: false, reason: 'user_not_found' };
            checks.userData = user;
        }
        
        // Verificar bloqueio
        if (options.notBlocked !== false) {
            const notBlocked = await requireNotBlocked(phone);
            if (!notBlocked) return { authenticated: false, reason: 'blocked' };
        }
        
        // Verificar admin
        if (options.requireAdmin) {
            const isAdmin = await requireAdmin(phone);
            if (!isAdmin) return { authenticated: false, reason: 'not_admin' };
        }
        
        // Verificar saldo
        if (options.requireBalance) {
            const hasBalance = await requireBalance(phone, options.requireBalance);
            if (!hasBalance) return { authenticated: false, reason: 'insufficient_balance' };
        }
        
        // Verificar produto
        if (options.requireProduct) {
            const product = await requireProductAvailable(options.requireProduct, phone);
            if (!product) return { authenticated: false, reason: 'product_unavailable' };
            checks.product = product;
        }
        
        return {
            authenticated: true,
            user: checks.userData,
            product: checks.product || null
        };
        
    } catch (error) {
        logger.error('❌ Erro na autenticação:', error);
        return { authenticated: false, reason: 'error' };
    }
}

// ============================================
// VERIFICAR SE É O DONO (NÚMERO PRINCIPAL)
// ============================================
async function requireOwner(phone) {
    try {
        const ownerNumber = process.env.ADMIN_NUMBER;
        
        if (phone !== ownerNumber) {
            await sendTextMessage(phone, '⛔ *ACESSO NEGADO!*\n\nApenas o proprietário do bot pode acessar esta função.');
            logger.warn(`⚠️ Tentativa de acesso owner negada: ${phone}`);
            return false;
        }
        
        return true;
        
    } catch (error) {
        logger.error('❌ Erro ao verificar proprietário:', error);
        return false;
    }
}

// ============================================
// VALIDAR SESSÃO (VERIFICAR SE WHATSAPP CONECTADO)
// ============================================
function isSessionActive() {
    try {
        const { isConnected } = require('../services/whatsapp');
        return isConnected();
    } catch (error) {
        return false;
    }
}

module.exports = {
    requireAdmin,
    requireUser,
    requireNotBlocked,
    requireBalance,
    requireProductAvailable,
    authenticateRequest,
    requireOwner,
    isSessionActive
};
