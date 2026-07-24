// ============================================
// DOGUINHA STORE BOT - LIMITADOR DE TAXA
// ============================================

const { sendTextMessage } = require('../services/whatsapp');
const logger = require('../utils/logger');

// Armazenar requisições em memória
const requestLog = new Map();

// ============================================
// CONFIGURAÇÕES PADRÃO
// ============================================
const DEFAULT_CONFIG = {
    maxRequests: 10,        // Máximo de requisições
    windowMs: 60000,        // Janela de tempo (1 minuto)
    blockDuration: 300000,  // Tempo de bloqueio (5 minutos)
    message: '⚠️ *MUITAS REQUISIÇÕES!*\n\nAguarde um momento antes de enviar outra mensagem.'
};

// ============================================
// LIMITADOR DE MENSAGENS
// ============================================
async function messageRateLimiter(phone, config = {}) {
    try {
        const settings = { ...DEFAULT_CONFIG, ...config };
        const now = Date.now();
        
        // Limpar entradas antigas
        cleanOldEntries(now);
        
        // Verificar se usuário está bloqueado
        if (isBlocked(phone, now, settings)) {
            const blockTime = getBlockTimeRemaining(phone, now);
            
            await sendTextMessage(
                phone,
                `⏳ *AGUARDE ${blockTime} SEGUNDOS!*\n\n` +
                `Você está enviando muitas mensagens. Tente novamente em instantes.`
            );
            
            logger.warn(`⚠️ Rate limit: ${phone} bloqueado por ${blockTime}s`);
            return { allowed: false, reason: 'blocked' };
        }
        
        // Registrar requisição
        registerRequest(phone, now, settings);
        
        // Verificar limite
        if (isOverLimit(phone, now, settings)) {
            blockUser(phone, now, settings);
            
            await sendTextMessage(phone, settings.message);
            
            logger.warn(`⚠️ Rate limit: ${phone} excedeu limite`);
            return { allowed: false, reason: 'limit_exceeded' };
        }
        
        return { allowed: true };
        
    } catch (error) {
        logger.error('❌ Erro no rate limiter:', error);
        return { allowed: true }; // Permitir em caso de erro
    }
}

// ============================================
// LIMITADOR DE PIX (EVITAR ABUSO)
// ============================================
async function pixRateLimiter(phone) {
    try {
        const now = Date.now();
        const userRequests = requestLog.get(phone) || {};
        const pixRequests = userRequests.pixRequests || [];
        
        // Limpar requisições antigas (últimos 5 minutos)
        const recentPixRequests = pixRequests.filter(time => now - time < 300000);
        
        // Máximo 3 PIX a cada 5 minutos
        if (recentPixRequests.length >= 3) {
            await sendTextMessage(
                phone,
                '⚠️ *LIMITE DE PIX ATINGIDO!*\n\n' +
                'Você gerou muitos PIX nos últimos minutos.\n' +
                'Aguarde 5 minutos para gerar um novo PIX.'
            );
            
            logger.warn(`⚠️ PIX rate limit: ${phone}`);
            return { allowed: false, reason: 'pix_limit_exceeded' };
        }
        
        // Registrar
        recentPixRequests.push(now);
        userRequests.pixRequests = recentPixRequests;
        requestLog.set(phone, userRequests);
        
        return { allowed: true };
        
    } catch (error) {
        logger.error('❌ Erro no PIX rate limiter:', error);
        return { allowed: true };
    }
}

// ============================================
// LIMITADOR DE COMPRAS (EVITAR ABUSO)
// ============================================
async function purchaseRateLimiter(phone) {
    try {
        const now = Date.now();
        const userRequests = requestLog.get(phone) || {};
        const purchaseRequests = userRequests.purchaseRequests || [];
        
        // Limpar requisições antigas (último minuto)
        const recentPurchases = purchaseRequests.filter(time => now - time < 60000);
        
        // Máximo 3 compras por minuto
        if (recentPurchases.length >= 3) {
            await sendTextMessage(
                phone,
                '⚠️ *MUITAS COMPRAS!*\n\n' +
                'Aguarde um momento antes de fazer outra compra.'
            );
            
            return { allowed: false, reason: 'purchase_limit_exceeded' };
        }
        
        // Registrar
        recentPurchases.push(now);
        userRequests.purchaseRequests = recentPurchases;
        requestLog.set(phone, userRequests);
        
        return { allowed: true };
        
    } catch (error) {
        logger.error('❌ Erro no purchase rate limiter:', error);
        return { allowed: true };
    }
}

// ============================================
// LIMITADOR DE BROADCAST
// ============================================
async function broadcastRateLimiter(adminPhone) {
    try {
        const now = Date.now();
        const adminRequests = requestLog.get(adminPhone) || {};
        const broadcastTimes = adminRequests.broadcastTimes || [];
        
        // Limpar requisições antigas (última hora)
        const recentBroadcasts = broadcastTimes.filter(time => now - time < 3600000);
        
        // Máximo 3 broadcasts por hora
        if (recentBroadcasts.length >= 3) {
            await sendTextMessage(
                adminPhone,
                '⚠️ *LIMITE DE TRANSMISSÃO ATINGIDO!*\n\n' +
                'Você já enviou 3 transmissões na última hora.\n' +
                'Aguarde para enviar outra transmissão.'
            );
            
            return { allowed: false, reason: 'broadcast_limit_exceeded' };
        }
        
        // Registrar
        recentBroadcasts.push(now);
        adminRequests.broadcastTimes = recentBroadcasts;
        requestLog.set(adminPhone, adminRequests);
        
        return { allowed: true };
        
    } catch (error) {
        logger.error('❌ Erro no broadcast rate limiter:', error);
        return { allowed: true };
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Limpar entradas antigas
function cleanOldEntries(now) {
    const maxAge = 600000; // 10 minutos
    
    for (const [phone, data] of requestLog.entries()) {
        if (data.blockedUntil && now > data.blockedUntil) {
            requestLog.delete(phone);
        }
    }
}

// Verificar se está bloqueado
function isBlocked(phone, now, settings) {
    const userData = requestLog.get(phone);
    return userData && userData.blockedUntil && now < userData.blockedUntil;
}

// Tempo restante de bloqueio
function getBlockTimeRemaining(phone, now) {
    const userData = requestLog.get(phone);
    if (userData && userData.blockedUntil) {
        return Math.ceil((userData.blockedUntil - now) / 1000);
    }
    return 0;
}

// Registrar requisição
function registerRequest(phone, now, settings) {
    const userData = requestLog.get(phone) || { requests: [] };
    
    // Adicionar requisição
    userData.requests.push(now);
    
    // Manter apenas requisições dentro da janela
    userData.requests = userData.requests.filter(time => now - time < settings.windowMs);
    
    requestLog.set(phone, userData);
}

// Verificar se excedeu limite
function isOverLimit(phone, now, settings) {
    const userData = requestLog.get(phone);
    return userData && userData.requests.length > settings.maxRequests;
}

// Bloquear usuário
function blockUser(phone, now, settings) {
    const userData = requestLog.get(phone) || { requests: [] };
    userData.blockedUntil = now + settings.blockDuration;
    requestLog.set(phone, userData);
}

// ============================================
// RESETAR LIMITES DE UM USUÁRIO
// ============================================
function resetLimits(phone) {
    requestLog.delete(phone);
    logger.info(`🔄 Limites resetados para: ${phone}`);
}

// ============================================
// OBTER ESTATÍSTICAS DE RATE LIMIT
// ============================================
function getRateLimitStats() {
    const stats = {
        totalTracked: requestLog.size,
        blocked: 0,
        details: []
    };
    
    for (const [phone, data] of requestLog.entries()) {
        if (data.blockedUntil && Date.now() < data.blockedUntil) {
            stats.blocked++;
            stats.details.push({
                phone: phone,
                blockedUntil: new Date(data.blockedUntil).toISOString(),
                requestCount: data.requests ? data.requests.length : 0
            });
        }
    }
    
    return stats;
}

module.exports = {
    messageRateLimiter,
    pixRateLimiter,
    purchaseRateLimiter,
    broadcastRateLimiter,
    resetLimits,
    getRateLimitStats
};
