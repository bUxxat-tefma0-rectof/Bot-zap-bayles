// ============================================
// DOGUINHA STORE BOT - SERVIÇO WHATSAPP
// ============================================

const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const { config } = require('../config/database');
const { getDatabase } = require('../database/connection');
const User = require('../database/models/User');
const logger = require('../utils/logger');
const { handleMessage } = require('../controllers/menuController');

let sock = null;
let connectionRetries = 0;
const MAX_RETRIES = 10;

// ============================================
// INICIAR CONEXÃO WHATSAPP
// ============================================
async function startWhatsApp() {
    try {
        // Garantir pasta de sessão
        const sessionPath = config.storage.sessionsPath;
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }

        // Carregar estado de autenticação
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        
        // Pegar versão mais recente
        const { version } = await fetchLatestBaileysVersion();
        
        logger.info(`🔄 Conectando WhatsApp (versão ${version})...`);

        // Criar socket
        sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false, // NÃO mostrar QR Code
            browser: ['DOGUINHA STORE BOT', 'Chrome', '1.0.0'],
            markOnlineOnConnect: true,
            syncFullHistory: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
        });

        // ============================================
        // EVENTO: CONEXÃO ATUALIZADA
        // ============================================
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // Se aparecer QR Code, NÃO mostrar (usar pareamento)
            if (qr) {
                logger.info('📱 QR Code disponível (ignorado - usando pareamento)');
            }

            // Conexão estabelecida
            if (connection === 'open') {
                logger.info('✅ WhatsApp conectado com sucesso!');
                connectionRetries = 0;
                
                const botNumber = sock.user?.id?.split(':')[0];
                logger.info(`📞 Número do bot: ${botNumber}`);
            }

            // Conexão fechada
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error instanceof Boom) 
                    && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                
                if (shouldReconnect && connectionRetries < MAX_RETRIES) {
                    connectionRetries++;
                    const delay = Math.min(1000 * Math.pow(2, connectionRetries), 30000);
                    
                    logger.warn(`⚠️ Conexão fechada. Reconectando em ${delay/1000}s... (Tentativa ${connectionRetries}/${MAX_RETRIES})`);
                    
                    setTimeout(() => {
                        startWhatsApp();
                    }, delay);
                    
                } else if (lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
                    logger.error('❌ Bot desconectado! Solicite novo código de pareamento.');
                    // Limpar sessão
                    if (fs.existsSync(sessionPath)) {
                        fs.rmSync(sessionPath, { recursive: true, force: true });
                    }
                    startWhatsApp();
                    
                } else {
                    logger.error('❌ Número máximo de tentativas atingido. Reinicie o bot manualmente.');
                }
            }
        });

        // ============================================
        // EVENTO: CREDENCIAIS ATUALIZADAS
        // ============================================
        sock.ev.on('creds.update', saveCreds);

        // ============================================
        // EVENTO: NOVA MENSAGEM
        // ============================================
        sock.ev.on('messages.upsert', async (m) => {
            const message = m.messages[0];
            
            // Ignorar mensagens do próprio bot
            if (message.key.fromMe) return;
            
            // Ignorar mensagens muito antigas
            if (m.type === 'notify') return;
            
            // Processar mensagem
            try {
                await handleMessage(sock, message);
            } catch (error) {
                logger.error('❌ Erro ao processar mensagem:', error);
            }
        });

        // Solicitar código de pareamento automaticamente
        await requestPairingCode();

        return sock;

    } catch (error) {
        logger.error('❌ Erro ao iniciar WhatsApp:', error);
        
        if (connectionRetries < MAX_RETRIES) {
            connectionRetries++;
            const delay = Math.min(5000 * connectionRetries, 60000);
            
            logger.warn(`⚠️ Tentando novamente em ${delay/1000}s...`);
            
            setTimeout(() => {
                startWhatsApp();
            }, delay);
        }
    }
}

// ============================================
// SOLICITAR CÓDIGO DE PAREAMENTO
// ============================================
async function requestPairingCode() {
    try {
        const phoneNumber = config.bot.whatsappNumber;
        
        if (!phoneNumber) {
            logger.error('❌ Número do WhatsApp não configurado no .env');
            return;
        }

        // Aguardar socket estar pronto
        await new Promise(resolve => setTimeout(resolve, 3000));

        if (!sock) {
            logger.error('❌ Socket não inicializado');
            return;
        }

        // Solicitar código de pareamento
        const code = await sock.requestPairingCode(phoneNumber);
        
        logger.info('📱 ===========================================');
        logger.info('📱 CÓDIGO DE PAREAMENTO GERADO!');
        logger.info(`📱 CÓDIGO: ${code}`);
        logger.info('📱 ===========================================');
        logger.info('📱 INSTRUÇÕES:');
        logger.info('📱 1. Abra o WhatsApp no celular');
        logger.info('📱 2. Vá em: Configurações > Aparelhos Conectados > Conectar um Aparelho');
        logger.info('📱 3. Toque em "Conectar com número de telefone"');
        logger.info(`📱 4. Digite o código: ${code}`);
        logger.info('📱 ===========================================');

        return code;

    } catch (error) {
        logger.error('❌ Erro ao solicitar código de pareamento:', error);
        
        // Se falhar, tentar novamente
        if (error.message && error.message.includes('timeout')) {
            logger.warn('⚠️ Timeout ao solicitar pareamento. Tentando novamente...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            return await requestPairingCode();
        }
        
        return null;
    }
}

// ============================================
// RENOVAR CÓDIGO DE PAREAMENTO
// ============================================
async function renewPairingCode() {
    logger.info('🔄 Renovando código de pareamento...');
    return await requestPairingCode();
}

// ============================================
// ENVIAR MENSAGEM DE TEXTO
// ============================================
async function sendTextMessage(phone, text) {
    try {
        if (!sock) throw new Error('WhatsApp não conectado');
        
        const jid = phone.includes('@s.whatsapp.net') ? phone : `${phone}@s.whatsapp.net`;
        
        await sock.sendMessage(jid, { 
            text: text 
        });
        
        logger.info(`📤 Mensagem enviada para ${phone}`);
        
    } catch (error) {
        logger.error(`❌ Erro ao enviar mensagem para ${phone}:`, error);
        throw error;
    }
}

// ============================================
// ENVIAR MENSAGEM COM BOTÕES
// ============================================
async function sendButtonMessage(phone, text, buttons) {
    try {
        if (!sock) throw new Error('WhatsApp não conectado');
        
        const jid = phone.includes('@s.whatsapp.net') ? phone : `${phone}@s.whatsapp.net`;
        
        const buttonMessage = {
            text: text,
            footer: '',
            buttons: buttons.map(btn => ({
                buttonId: btn.id || btn.text,
                buttonText: { displayText: btn.text },
                type: 1
            })),
            headerType: 1
        };
        
        await sock.sendMessage(jid, buttonMessage);
        
        logger.info(`📤 Mensagem com botões enviada para ${phone}`);
        
    } catch (error) {
        logger.error(`❌ Erro ao enviar botões para ${phone}:`, error);
        // Fallback: enviar como texto simples
        await sendTextMessage(phone, text);
    }
}

// ============================================
// ENVIAR IMAGEM
// ============================================
async function sendImageMessage(phone, imagePathOrUrl, caption = '') {
    try {
        if (!sock) throw new Error('WhatsApp não conectado');
        
        const jid = phone.includes('@s.whatsapp.net') ? phone : `${phone}@s.whatsapp.net`;
        
        let image;
        
        if (imagePathOrUrl.startsWith('http')) {
            image = { url: imagePathOrUrl };
        } else {
            image = fs.readFileSync(imagePathOrUrl);
        }
        
        await sock.sendMessage(jid, { 
            image: image,
            caption: caption 
        });
        
        logger.info(`📤 Imagem enviada para ${phone}`);
        
    } catch (error) {
        logger.error(`❌ Erro ao enviar imagem para ${phone}:`, error);
        throw error;
    }
}

// ============================================
// ENVIAR PDF
// ============================================
async function sendPdfMessage(phone, pdfPath, filename = 'documento.pdf') {
    try {
        if (!sock) throw new Error('WhatsApp não conectado');
        
        const jid = phone.includes('@s.whatsapp.net') ? phone : `${phone}@s.whatsapp.net`;
        
        const document = fs.readFileSync(pdfPath);
        
        await sock.sendMessage(jid, { 
            document: document,
            fileName: filename,
            mimetype: 'application/pdf'
        });
        
        logger.info(`📤 PDF enviado para ${phone}`);
        
    } catch (error) {
        logger.error(`❌ Erro ao enviar PDF para ${phone}:`, error);
        throw error;
    }
}

// ============================================
// ENVIAR MENSAGEM COM LISTA
// ============================================
async function sendListMessage(phone, title, text, buttonText, sections) {
    try {
        if (!sock) throw new Error('WhatsApp não conectado');
        
        const jid = phone.includes('@s.whatsapp.net') ? phone : `${phone}@s.whatsapp.net`;
        
        const listMessage = {
            text: text,
            title: title,
            buttonText: buttonText,
            sections: sections
        };
        
        await sock.sendMessage(jid, listMessage);
        
        logger.info(`📤 Lista enviada para ${phone}`);
        
    } catch (error) {
        logger.error(`❌ Erro ao enviar lista para ${phone}:`, error);
        await sendTextMessage(phone, text);
    }
}

// ============================================
// OBTER INSTÂNCIA DO SOCKET
// ============================================
function getSocket() {
    return sock;
}

// ============================================
// VERIFICAR SE ESTÁ CONECTADO
// ============================================
function isConnected() {
    return sock && sock.user;
}

// ============================================
// OBTER CÓDIGO DE PAREAMENTO ATUAL
// ============================================
function getPairingCode() {
    return global.currentPairingCode || null;
}

module.exports = {
    startWhatsApp,
    requestPairingCode,
    renewPairingCode,
    sendTextMessage,
    sendButtonMessage,
    sendImageMessage,
    sendPdfMessage,
    sendListMessage,
    getSocket,
    isConnected,
    getPairingCode
};
