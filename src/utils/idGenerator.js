// ============================================
// DOGUINHA STORE BOT - GERADOR DE IDs
// ============================================

const { v4: uuidv4 } = require('uuid');

// ============================================
// GERAR ID ÚNICO
// ============================================
function generateId() {
    return uuidv4();
}

// ============================================
// GERAR ID CURTO (PARA TRANSAÇÕES)
// ============================================
function generateShortId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
}

// ============================================
// GERAR ID NUMÉRICO
// ============================================
function generateNumericId(length = 6) {
    let result = '';
    
    for (let i = 0; i < length; i++) {
        result += Math.floor(Math.random() * 10);
    }
    
    return result;
}

// ============================================
// GERAR TIMESTAMP ID
// ============================================
function generateTimestampId() {
    return Date.now().toString(36).toUpperCase();
}

module.exports = {
    generateId,
    generateShortId,
    generateNumericId,
    generateTimestampId
};
