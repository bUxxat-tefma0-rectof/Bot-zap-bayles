// ============================================
// DOGUINHA STORE BOT - SISTEMA DE LOGS
// ============================================

const pino = require('pino');
const path = require('path');
const fs = require('fs');

// Criar pasta de logs se não existir
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Configurar logger
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        targets: [
            // Console (colorido)
            {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss',
                    ignore: 'pid,hostname'
                },
                level: 'info'
            },
            // Arquivo
            {
                target: 'pino/file',
                options: {
                    destination: path.join(logDir, 'bot.log'),
                    mkdir: true
                },
                level: 'info'
            }
        ]
    }
});

// ============================================
// FUNÇÕES AUXILIARES DE LOG
// ============================================

logger.success = (message) => {
    logger.info(`✅ ${message}`);
};

logger.warning = (message) => {
    logger.warn(`⚠️ ${message}`);
};

logger.debug = (message) => {
    logger.debug(`🔍 ${message}`);
};

module.exports = logger;
