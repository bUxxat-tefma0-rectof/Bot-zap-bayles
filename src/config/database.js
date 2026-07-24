// ============================================
// DOGUINHA STORE BOT - CONFIGURAÇÕES GERAIS
// ============================================

require('dotenv').config();

const config = {
    // ============================================
    // CONFIGURAÇÕES DO BOT
    // ============================================
    bot: {
        name: process.env.BOT_NAME || 'DOGUINHA STORE BOT',
        version: '1.0.0',
        whatsappNumber: process.env.WHATSAPP_NUMBER || '',
        adminNumber: process.env.ADMIN_NUMBER || '',
    },

    // ============================================
    // CONFIGURAÇÕES DO BANCO DE DADOS
    // ============================================
    database: {
        path: process.env.DATABASE_PATH || './src/database/doguinha_store.db',
    },

    // ============================================
    // CONFIGURAÇÕES DO MERCADO PAGO
    // ============================================
    mercadopago: {
        accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
        publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || '',
        webhookUrl: process.env.RENDER_EXTERNAL_URL 
            ? `${process.env.RENDER_EXTERNAL_URL}/webhook/mercadopago` 
            : '',
    },

    // ============================================
    // CONFIGURAÇÕES DE PIX
    // ============================================
    pix: {
        expirationMinutes: parseInt(process.env.PIX_EXPIRATION_MINUTES) || 30,
        values: [5.00, 8.00, 20.00], // Valores fixos padrão
    },

    // ============================================
    // CONFIGURAÇÕES DE LINKS
    // ============================================
    links: {
        telegramGroup: process.env.TELEGRAM_GROUP_LINK || '',
        supportTelegram: process.env.SUPPORT_TELEGRAM_LINK || '',
        telegramBot: process.env.TELEGRAM_BOT_LINK || '',
    },

    // ============================================
    // CONFIGURAÇÕES DE INDICAÇÃO
    // ============================================
    referral: {
        bonusPercentage: parseInt(process.env.REFERRAL_BONUS_PERCENTAGE) || 10,
    },

    // ============================================
    // CONFIGURAÇÕES DO SERVIDOR
    // ============================================
    server: {
        port: parseInt(process.env.PORT) || 3000,
        nodeEnv: process.env.NODE_ENV || 'production',
        externalUrl: process.env.RENDER_EXTERNAL_URL || '',
    },

    // ============================================
    // CONFIGURAÇÕES DE STORAGE
    // ============================================
    storage: {
        sessionsPath: './src/storage/sessions',
        pdfsPath: './src/storage/pdfs',
        qrcodesPath: './src/storage/qrcodes',
    },

    // ============================================
    // CONFIGURAÇÕES DE LOG
    // ============================================
    log: {
        level: process.env.LOG_LEVEL || 'info',
        filePath: './logs/bot.log',
    }
};

// ============================================
// VALIDAR CONFIGURAÇÕES OBRIGATÓRIAS
// ============================================
function validateConfig() {
    const errors = [];

    if (!config.bot.whatsappNumber) {
        errors.push('WHATSAPP_NUMBER não configurado');
    }

    if (!config.bot.adminNumber) {
        errors.push('ADMIN_NUMBER não configurado');
    }

    if (!config.mercadopago.accessToken) {
        errors.push('MERCADOPAGO_ACCESS_TOKEN não configurado');
    }

    if (!config.mercadopago.publicKey) {
        errors.push('MERCADOPAGO_PUBLIC_KEY não configurado');
    }

    if (errors.length > 0) {
        console.error('❌ ERROS DE CONFIGURAÇÃO:');
        errors.forEach(error => console.error(`   - ${error}`));
        console.error('\n⚠️  Verifique seu arquivo .env\n');
    }

    return errors.length === 0;
}

module.exports = { config, validateConfig };
