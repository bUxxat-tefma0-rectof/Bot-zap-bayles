// ============================================
// DOGUINHA STORE BOT - GERENCIADOR DE CONFIGURAÇÕES
// ============================================

const { getDatabase } = require('../database/connection');
const logger = require('./logger');

// ============================================
// OBTER CONFIGURAÇÃO
// ============================================
function getSetting(key, defaultValue = '') {
    try {
        const db = getDatabase();
        const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
        
        if (setting) {
            return setting.value;
        }
        
        return defaultValue;
        
    } catch (error) {
        logger.error(`Erro ao buscar configuração ${key}:`, error);
        return defaultValue;
    }
}

// ============================================
// OBTER TODAS CONFIGURAÇÕES
// ============================================
function getAllSettings() {
    try {
        const db = getDatabase();
        return db.prepare('SELECT * FROM settings ORDER BY key ASC').all();
    } catch (error) {
        logger.error('Erro ao buscar configurações:', error);
        return [];
    }
}

// ============================================
// ATUALIZAR CONFIGURAÇÃO
// ============================================
function updateSetting(key, value) {
    try {
        const db = getDatabase();
        db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').run(value, key);
        logger.info(`Configuração "${key}" atualizada para: ${value}`);
        return true;
    } catch (error) {
        logger.error(`Erro ao atualizar configuração ${key}:`, error);
        return false;
    }
}

// ============================================
// OBTER CONFIGURAÇÃO COMO NÚMERO
// ============================================
function getSettingAsNumber(key, defaultValue = 0) {
    const value = getSetting(key, String(defaultValue));
    return parseFloat(value);
}

// ============================================
// OBTER CONFIGURAÇÃO COMO BOOLEAN
// ============================================
function getSettingAsBoolean(key, defaultValue = false) {
    const value = getSetting(key, String(defaultValue));
    return value === 'true' || value === '1';
}

module.exports = {
    getSetting,
    getAllSettings,
    updateSetting,
    getSettingAsNumber,
    getSettingAsBoolean
};
