// ============================================
// DOGUINHA STORE BOT - CONTROLE DE TRANSMISSÃO
// ============================================

const { sendTextMessage } = require('../services/whatsapp');
const User = require('../database/models/User');
const logger = require('../utils/logger');

// ============================================
// ENVIAR TRANSMISSÃO EM MASSA
// ============================================
async function handleBroadcast(adminPhone, message) {
    try {
        // Verificar se é admin
        if (!User.isAdmin(adminPhone)) {
            await sendTextMessage(adminPhone, '⛔ Acesso negado!');
            return;
        }
        
        // Buscar todos usuários ativos
        const users = User.findActiveUsers();
        
        if (users.length === 0) {
            await sendTextMessage(adminPhone, '📭 Nenhum usuário para enviar.');
            return;
        }
        
        await sendTextMessage(adminPhone, `📢 *INICIANDO TRANSMISSÃO*\n\nEnviando mensagem para ${users.length} usuários...`);
        
        let successCount = 0;
        let errorCount = 0;
        
        // Enviar para cada usuário
        for (const user of users) {
            try {
                await sendTextMessage(user.phone, `📢 *COMUNICADO OFICIAL*\n\n${message}`);
                successCount++;
                
                // Pequeno delay para evitar bloqueio
                await sleep(1000);
                
            } catch (error) {
                errorCount++;
                logger.error(`❌ Erro ao enviar para ${user.phone}:`, error);
            }
        }
        
        // Relatório
        const report = `✅ *TRANSMISSÃO CONCLUÍDA*\n\n` +
                       `📤 Enviados: ${successCount}\n` +
                       `❌ Erros: ${errorCount}\n` +
                       `👥 Total: ${users.length}`;
        
        await sendTextMessage(adminPhone, report);
        
        logger.info(`📢 Broadcast concluído: ${successCount}/${users.length}`);
        
    } catch (error) {
        logger.error('❌ Erro no broadcast:', error);
        await sendTextMessage(adminPhone, '❌ Erro ao enviar transmissão!');
    }
}

// ============================================
// DELAY
// ============================================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    handleBroadcast
};
