// ============================================
// DOGUINHA STORE BOT - TRATAMENTO DE ERROS
// ============================================

const { sendTextMessage } = require('../services/whatsapp');
const logger = require('../utils/logger');

// ============================================
// TRATAR ERRO DE MENSAGEM
// ============================================
async function handleMessageError(phone, error, context = '') {
    try {
        logger.error(`❌ Erro ${context}:`, error);
        
        // Erros conhecidos
        const knownErrors = {
            'ECONNREFUSED': '❌ *Erro de conexão!*\n\nNão foi possível conectar ao servidor.',
            'ETIMEDOUT': '❌ *Tempo esgotado!*\n\nO servidor demorou muito para responder.',
            'ENOTFOUND': '❌ *Serviço indisponível!*\n\nTente novamente mais tarde.',
            'rate_limit': '⏳ *Aguarde um momento!*\n\nVocê está enviando mensagens muito rápido.',
            'blocked': '⛔ *Acesso bloqueado!*\n\nEntre em contato com o suporte.',
            'invalid_pix': '❌ *Erro no PIX!*\n\nNão foi possível gerar o pagamento.',
            'insufficient_balance': '❌ *Saldo insuficiente!*\n\nFaça uma recarga para continuar.',
            'out_of_stock': '❌ *Produto esgotado!*\n\nTente novamente mais tarde.',
            'product_not_found': '❌ *Produto não encontrado!*',
            'user_not_found': '❌ *Usuário não encontrado!*\n\nEnvie "oi" para se cadastrar.',
            'invalid_amount': '❌ *Valor inválido!*\n\nDigite um valor correto.',
            'payment_expired': '⏰ *Pagamento expirado!*\n\nGere um novo PIX.',
            'pdf_error': '❌ *Erro ao gerar PDF!*\n\nTente novamente mais tarde.'
        };
        
        // Buscar mensagem de erro conhecida
        let errorMessage = knownErrors[error.code] || knownErrors[error.type];
        
        if (!errorMessage) {
            // Verificar mensagem do erro
            const errorStr = String(error.message || error).toLowerCase();
            
            if (errorStr.includes('timeout') || errorStr.includes('timed out')) {
                errorMessage = knownErrors['ETIMEDOUT'];
            } else if (errorStr.includes('connection') || errorStr.includes('refused')) {
                errorMessage = knownErrors['ECONNREFUSED'];
            } else {
                errorMessage = '❌ *Erro inesperado!*\n\nTente novamente mais tarde.\n\nSe o erro persistir, entre em contato com o suporte.';
            }
        }
        
        // Enviar mensagem para o usuário
        if (phone) {
            await sendTextMessage(phone, errorMessage);
        }
        
        // Notificar admin sobre erro grave
        if (isCriticalError(error)) {
            await notifyAdmin(error, context);
        }
        
    } catch (e) {
        logger.error('❌ Erro no handler de erros:', e);
    }
}

// ============================================
// TRATAR ERRO DE BANCO DE DADOS
// ============================================
async function handleDatabaseError(phone, error) {
    logger.error('❌ Erro no banco de dados:', error);
    
    const message = '❌ *Erro no banco de dados!*\n\n' +
                    'Nossos servidores estão passando por manutenção.\n' +
                    'Tente novamente em alguns minutos.';
    
    if (phone) {
        await sendTextMessage(phone, message);
    }
}

// ============================================
// TRATAR ERRO DE PAGAMENTO
// ============================================
async function handlePaymentError(phone, error) {
    logger.error('❌ Erro no pagamento:', error);
    
    let message = '❌ *Erro no pagamento!*\n\n';
    
    if (error.message && error.message.includes('amount')) {
        message += 'O valor informado é inválido.';
    } else if (error.message && error.message.includes('token')) {
        message += 'Erro de configuração do Mercado Pago.';
    } else {
        message += 'Não foi possível processar seu pagamento.\nTente novamente mais tarde.';
    }
    
    if (phone) {
        await sendTextMessage(phone, message);
    }
}

// ============================================
// TRATAR ERRO DE WHATSAPP
// ============================================
async function handleWhatsAppError(error) {
    logger.error('❌ Erro no WhatsApp:', error);
    
    // Erros de conexão
    if (error.message && error.message.includes('Connection Closed')) {
        logger.warn('⚠️ Conexão WhatsApp fechada. Tentando reconectar...');
    }
    
    // Erros de autenticação
    if (error.message && error.message.includes('Unauthorized')) {
        logger.error('❌ Sessão WhatsApp inválida. Necessário reautenticar.');
    }
}

// ============================================
// VERIFICAR SE É ERRO CRÍTICO
// ============================================
function isCriticalError(error) {
    const criticalErrors = [
        'ERR_ASSERTION',
        'RangeError',
        'ReferenceError',
        'SyntaxError',
        'TypeError'
    ];
    
    return criticalErrors.includes(error.name) || criticalErrors.includes(error.code);
}

// ============================================
// NOTIFICAR ADMIN SOBRE ERRO
// ============================================
async function notifyAdmin(error, context) {
    try {
        const adminNumber = process.env.ADMIN_NUMBER;
        
        if (!adminNumber) return;
        
        const errorMessage = 
            `🚨 *ERRO CRÍTICO NO BOT*\n\n` +
            `📋 Contexto: ${context}\n` +
            `❌ Erro: ${error.name || 'Desconhecido'}\n` +
            `💬 Mensagem: ${error.message || 'Sem mensagem'}\n` +
            `⏰ Hora: ${new Date().toLocaleString('pt-BR')}\n\n` +
            `Verifique os logs para mais detalhes.`;
        
        await sendTextMessage(adminNumber, errorMessage);
        
    } catch (e) {
        logger.error('❌ Erro ao notificar admin:', e);
    }
}

// ============================================
// WRAPPER DE FUNÇÃO COM TRATAMENTO DE ERRO
// ============================================
function errorWrapper(fn, errorHandler = null) {
    return async function(...args) {
        try {
            return await fn.apply(this, args);
        } catch (error) {
            if (errorHandler) {
                await errorHandler(error, ...args);
            } else {
                logger.error('❌ Erro não tratado:', error);
            }
            return null;
        }
    };
}

// ============================================
// TRATAR ERRO GLOBAL
// ============================================
function setupGlobalErrorHandlers() {
    // Erros não capturados
    process.on('uncaughtException', (error) => {
        logger.error('❌ ERRO NÃO CAPTURADO:', error);
        logger.error(error.stack);
    });

    // Promises rejeitadas não tratadas
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('❌ PROMISE REJEITADA NÃO TRATADA:', reason);
    });

    // Sinal de término
    process.on('SIGTERM', () => {
        logger.info('🛑 Bot encerrando...');
        process.exit(0);
    });

    process.on('SIGINT', () => {
        logger.info('🛑 Bot interrompido pelo usuário');
        process.exit(0);
    });

    logger.info('✅ Handlers de erro globais configurados');
}

module.exports = {
    handleMessageError,
    handleDatabaseError,
    handlePaymentError,
    handleWhatsAppError,
    isCriticalError,
    notifyAdmin,
    errorWrapper,
    setupGlobalErrorHandlers
};
