// ============================================
// DOGUINHA STORE BOT - SERVIÇO PDF
// ============================================

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { config } = require('../config/database');
const logger = require('../utils/logger');

// ============================================
// GERAR PDF COM CREDENCIAIS
// ============================================
async function generateCredentialsPdf(productName, credentials, userPhone) {
    try {
        // Garantir pasta de PDFs
        const pdfDir = config.storage.pdfsPath;
        if (!fs.existsSync(pdfDir)) {
            fs.mkdirSync(pdfDir, { recursive: true });
        }

        const timestamp = Date.now();
        const filename = `${productName.replace(/\s+/g, '_')}_${timestamp}.pdf`;
        const filePath = path.join(pdfDir, filename);

        // Criar documento PDF
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
                Title: `Credenciais - ${productName}`,
                Author: config.bot.name,
                Subject: 'Credenciais de Acesso',
                Creator: config.bot.name
            }
        });

        // Pipe para arquivo
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // ============================================
        // CABEÇALHO
        // ============================================
        doc
            .fontSize(24)
            .font('Helvetica-Bold')
            .fillColor('#4CAF50')
            .text(config.bot.name, { align: 'center' });

        doc.moveDown(0.5);
        
        doc
            .fontSize(14)
            .fillColor('#333333')
            .text('CREDENCIAIS DE ACESSO', { align: 'center' });

        // Linha decorativa
        doc.moveDown(1);
        doc
            .strokeColor('#4CAF50')
            .lineWidth(2)
            .moveTo(50, doc.y)
            .lineTo(545, doc.y)
            .stroke();

        doc.moveDown(1);

        // ============================================
        // DADOS DO PRODUTO
        // ============================================
        doc
            .fontSize(18)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text('PRODUTO', { align: 'center' });

        doc.moveDown(0.5);

        doc
            .fontSize(16)
            .font('Helvetica')
            .fillColor('#2196F3')
            .text(productName, { align: 'center' });

        doc.moveDown(2);

        // ============================================
        // CREDENCIAIS
        // ============================================
        // Caixa para credenciais
        doc
            .rect(50, doc.y, 495, 200)
            .fillAndStroke('#F5F5F5', '#CCCCCC');

        doc.moveDown(1);

        doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text('DADOS DE ACESSO:', 70, doc.y + 10);

        doc.moveDown(1);

        // Processar credenciais
        const lines = credentials.split('\n');
        let yPosition = doc.y + 10;

        for (const line of lines) {
            if (line.trim()) {
                doc
                    .fontSize(12)
                    .font('Helvetica')
                    .fillColor('#333333')
                    .text(line.trim(), 70, yPosition, {
                        width: 455,
                        align: 'left'
                    });
                
                yPosition += 20;
            }
        }

        doc.moveDown(3);

        // ============================================
        // RODAPÉ
        // ============================================
        const footerY = doc.page.height - 100;

        doc
            .strokeColor('#4CAF50')
            .lineWidth(1)
            .moveTo(50, footerY)
            .lineTo(545, footerY)
            .stroke();

        doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor('#999999')
            .text('© Doguinha Store - Todos os direitos reservados', 50, footerY + 10, {
                align: 'center',
                width: 495
            });

        doc
            .fontSize(9)
            .text(`Data: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, {
                align: 'center',
                width: 495
            });

        doc
            .text(`Cliente: ${userPhone}`, {
                align: 'center',
                width: 495
            });

        // Finalizar PDF
        doc.end();

        // Aguardar conclusão
        await new Promise((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('error', reject);
        });

        logger.info(`✅ PDF gerado: ${filename}`);
        
        return {
            filename: filename,
            filePath: filePath
        };

    } catch (error) {
        logger.error('❌ Erro ao gerar PDF:', error);
        throw error;
    }
}

// ============================================
// DELETAR PDF APÓS ENVIO
// ============================================
function deletePdf(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logger.info(`🗑️ PDF deletado: ${filePath}`);
        }
    } catch (error) {
        logger.error('❌ Erro ao deletar PDF:', error);
    }
}

// ============================================
// LIMPAR PDFS ANTIGOS
// ============================================
function cleanOldPdfs(maxAgeMinutes = 60) {
    try {
        const pdfDir = config.storage.pdfsPath;
        
        if (!fs.existsSync(pdfDir)) return;

        const files = fs.readdirSync(pdfDir);
        const now = Date.now();
        let deletedCount = 0;

        for (const file of files) {
            const filePath = path.join(pdfDir, file);
            const stats = fs.statSync(filePath);
            const ageMinutes = (now - stats.mtimeMs) / (1000 * 60);

            if (ageMinutes > maxAgeMinutes) {
                fs.unlinkSync(filePath);
                deletedCount++;
            }
        }

        if (deletedCount > 0) {
            logger.info(`🗑️ ${deletedCount} PDFs antigos deletados`);
        }

    } catch (error) {
        logger.error('❌ Erro ao limpar PDFs:', error);
    }
}

module.exports = {
    generateCredentialsPdf,
    deletePdf,
    cleanOldPdfs
};
