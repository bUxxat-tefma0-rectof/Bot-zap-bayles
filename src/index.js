// ============================================
// DOGUINHA STORE BOT - ARQUIVO PRINCIPAL
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDatabase, initializeDatabase } = require('./database/connection');
const { startWhatsApp } = require('./services/whatsapp');
const logger = require('./utils/logger');

// ============================================
// CONFIGURAÇÃO DO SERVIDOR EXPRESS
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// ROTA PRINCIPAL
// ============================================
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        bot: process.env.BOT_NAME || 'DOGUINHA STORE BOT',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// WEBHOOK MERCADO PAGO
// ============================================
app.post('/webhook/mercadopago', async (req, res) => {
    try {
        const { processWebhook } = require('./services/mercadopago');
        await processWebhook(req.body);
        res.status(200).send('OK');
    } catch (error) {
        logger.error('Erro no webhook:', error);
        res.status(500).send('Error');
    }
});

// ============================================
// INICIAR SERVIDOR E BOT
// ============================================
async function startServer() {
    try {
        // Conectar banco de dados
        logger.info('🔄 Conectando ao banco de dados...');
        await connectDatabase();
        
        // Inicializar tabelas
        logger.info('🔄 Inicializando tabelas...');
        await initializeDatabase();
        
        // Iniciar servidor Express
        app.listen(PORT, () => {
            logger.info(`🌐 Servidor rodando na porta ${PORT}`);
        });
        
        // Iniciar WhatsApp Bot
        logger.info('🔄 Iniciando WhatsApp Bot...');
        await startWhatsApp();
        
        logger.info('✅ Bot iniciado com sucesso!');
        
    } catch (error) {
        logger.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

// ============================================
// TRATAMENTO DE ERROS GLOBAIS
// ============================================
process.on('uncaughtException', (error) => {
    logger.error('❌ Erro não tratado:', error);
});

process.on('unhandledRejection', (error) => {
    logger.error('❌ Promise rejeitada:', error);
});

// ============================================
// INICIAR TUDO
// ============================================
startServer();

module.exports = app;
