// ============================================
// DOGUINHA STORE BOT - MIGRAÇÃO INICIAL
// ============================================

const { connectDatabase, initializeDatabase, closeDatabase } = require('../connection');
const logger = require('../../utils/logger');

// ============================================
// EXECUTAR MIGRAÇÃO
// ============================================
async function runMigration() {
    try {
        logger.info('🔄 Iniciando migração do banco de dados...');
        
        // Conectar ao banco
        await connectDatabase();
        
        // Criar tabelas e dados iniciais
        await initializeDatabase();
        
        logger.info('✅ Migração concluída com sucesso!');
        
        // Fechar conexão
        closeDatabase();
        
        process.exit(0);
        
    } catch (error) {
        logger.error('❌ Erro na migração:', error);
        process.exit(1);
    }
}

// ============================================
// EXECUTAR
// ============================================
runMigration();
