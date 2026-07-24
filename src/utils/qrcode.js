// ============================================
// DOGUINHA STORE BOT - GERADOR DE QR CODE
// ============================================

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { config } = require('../config/database');
const logger = require('./logger');

// ============================================
// GERAR QR CODE COMO IMAGEM
// ============================================
async function generateQRCodeImage(data, filename = null) {
    try {
        // Garantir pasta de QR codes
        const qrDir = config.storage.qrcodesPath;
        if (!fs.existsSync(qrDir)) {
            fs.mkdirSync(qrDir, { recursive: true });
        }

        // Nome do arquivo
        const qrFilename = filename || `qrcode_${Date.now()}.png`;
        const qrPath = path.join(qrDir, qrFilename);

        // Gerar QR Code
        await QRCode.toFile(qrPath, data, {
            type: 'png',
            width: 500,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        logger.info(`✅ QR Code gerado: ${qrFilename}`);
        
        return {
            success: true,
            filePath: qrPath,
            filename: qrFilename
        };

    } catch (error) {
        logger.error('❌ Erro ao gerar QR Code:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// GERAR QR CODE COMO BASE64
// ============================================
async function generateQRCodeBase64(data) {
    try {
        const base64 = await QRCode.toDataURL(data, {
            width: 500,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        return {
            success: true,
            base64: base64
        };

    } catch (error) {
        logger.error('❌ Erro ao gerar QR Code base64:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// GERAR QR CODE COMO BUFFER
// ============================================
async function generateQRCodeBuffer(data) {
    try {
        const buffer = await QRCode.toBuffer(data, {
            type: 'png',
            width: 500,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        return {
            success: true,
            buffer: buffer
        };

    } catch (error) {
        logger.error('❌ Erro ao gerar QR Code buffer:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// GERAR QR CODE PIX (FORMATO PADRÃO)
// ============================================
async function generatePixQRCode(pixCode, transactionId) {
    try {
        // Adicionar borda e informações ao QR Code
        const qrData = {
            pixCode: pixCode,
            transactionId: transactionId,
            timestamp: new Date().toISOString()
        };

        const qrString = JSON.stringify(qrData);
        const result = await generateQRCodeImage(qrString, `pix_${transactionId}.png`);

        if (result.success) {
            logger.info(`✅ QR Code PIX gerado: ${transactionId}`);
        }

        return result;

    } catch (error) {
        logger.error('❌ Erro ao gerar QR Code PIX:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// GERAR QR CODE PARA COMPARTILHAMENTO
// ============================================
async function generateShareQRCode(phone, referralCode) {
    try {
        const link = `https://api.whatsapp.com/send?phone=${process.env.WHATSAPP_NUMBER}&text=${referralCode}`;
        const result = await generateQRCodeImage(link, `share_${phone}.png`);

        if (result.success) {
            logger.info(`✅ QR Code de compartilhamento gerado: ${phone}`);
        }

        return result;

    } catch (error) {
        logger.error('❌ Erro ao gerar QR Code compartilhamento:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// DELETAR QR CODE ANTIGO
// ============================================
function deleteQRCode(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logger.info(`🗑️ QR Code deletado: ${filePath}`);
            return true;
        }
        return false;

    } catch (error) {
        logger.error('❌ Erro ao deletar QR Code:', error);
        return false;
    }
}

// ============================================
// LIMPAR QR CODES ANTIGOS
// ============================================
function cleanOldQRCodes(maxAgeMinutes = 60) {
    try {
        const qrDir = config.storage.qrcodesPath;
        
        if (!fs.existsSync(qrDir)) return;

        const files = fs.readdirSync(qrDir);
        const now = Date.now();
        let deletedCount = 0;

        for (const file of files) {
            if (file === '.gitkeep') continue;
            
            const filePath = path.join(qrDir, file);
            const stats = fs.statSync(filePath);
            const ageMinutes = (now - stats.mtimeMs) / (1000 * 60);

            if (ageMinutes > maxAgeMinutes) {
                fs.unlinkSync(filePath);
                deletedCount++;
            }
        }

        if (deletedCount > 0) {
            logger.info(`🗑️ ${deletedCount} QR Codes antigos deletados`);
        }

        return deletedCount;

    } catch (error) {
        logger.error('❌ Erro ao limpar QR Codes:', error);
        return 0;
    }
}

// ============================================
// LER QR CODE DE IMAGEM (FUTURO)
// ============================================
async function readQRCode(imagePath) {
    // Funcionalidade futura: ler QR Code de imagem
    // Requer biblioteca adicional como jimp ou sharp
    logger.warn('⚠️ Função de leitura de QR Code não implementada');
    return { success: false, message: 'Não implementado' };
}

module.exports = {
    generateQRCodeImage,
    generateQRCodeBase64,
    generateQRCodeBuffer,
    generatePixQRCode,
    generateShareQRCode,
    deleteQRCode,
    cleanOldQRCodes,
    readQRCode
};
