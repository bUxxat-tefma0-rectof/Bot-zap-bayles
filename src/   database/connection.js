// ============================================
// DOGUINHA STORE BOT - CONEXÃO BANCO DE DADOS
// ============================================

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { config } = require('../config/database');
const logger = require('../utils/logger');

let db = null;

// ============================================
// CONECTAR AO BANCO DE DADOS
// ============================================
async function connectDatabase() {
    try {
        // Garantir que a pasta database existe
        const dbDir = path.dirname(config.database.path);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // Conectar ao SQLite
        db = new Database(config.database.path, {
            verbose: config.server.nodeEnv === 'development' ? console.log : null
        });

        // Configurações de performance
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        db.pragma('busy_timeout = 5000');

        logger.info('✅ Banco de dados conectado com sucesso!');
        return db;

    } catch (error) {
        logger.error('❌ Erro ao conectar ao banco de dados:', error);
        throw error;
    }
}

// ============================================
// INICIALIZAR TABELAS
// ============================================
async function initializeDatabase() {
    try {
        if (!db) {
            throw new Error('Banco de dados não conectado');
        }

        // Tabela: users
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT UNIQUE NOT NULL,
                balance DECIMAL(10,2) DEFAULT 0.00,
                is_admin BOOLEAN DEFAULT 0,
                is_blocked BOOLEAN DEFAULT 0,
                referral_code TEXT UNIQUE,
                referred_by TEXT,
                total_referrals INTEGER DEFAULT 0,
                bonus_balance DECIMAL(10,2) DEFAULT 0.00,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabela: products
        db.exec(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT DEFAULT 'Assinatura',
                price DECIMAL(10,2) NOT NULL,
                stock INTEGER DEFAULT 0,
                description TEXT,
                credentials_file TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabela: transactions
        db.exec(`
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                user_phone TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('deposit', 'purchase')),
                amount DECIMAL(10,2) NOT NULL,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'cancelled', 'expired')),
                pix_code TEXT,
                pix_qrcode TEXT,
                expires_at DATETIME,
                product_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                paid_at DATETIME,
                FOREIGN KEY (user_phone) REFERENCES users(phone),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `);

        // Tabela: referrals
        db.exec(`
            CREATE TABLE IF NOT EXISTS referrals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                referrer_phone TEXT NOT NULL,
                referred_phone TEXT NOT NULL,
                bonus_earned DECIMAL(10,2) DEFAULT 0.00,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (referrer_phone) REFERENCES users(phone),
                FOREIGN KEY (referred_phone) REFERENCES users(phone)
            )
        `);

        // Tabela: messages (mensagens editáveis)
        db.exec(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                content TEXT NOT NULL,
                type TEXT DEFAULT 'text',
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabela: settings (configurações gerais)
        db.exec(`
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL,
                type TEXT DEFAULT 'string',
                description TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Inserir admin se não existir
        const adminPhone = config.bot.adminNumber;
        if (adminPhone) {
            const existingAdmin = db.prepare('SELECT * FROM users WHERE phone = ?').get(adminPhone);
            
            if (!existingAdmin) {
                db.prepare(`
                    INSERT INTO users (phone, is_admin, referral_code) 
                    VALUES (?, 1, ?)
                `).run(adminPhone, `BONUS_COD_${adminPhone}`);
                
                logger.info('✅ Admin criado automaticamente');
            } else {
                // Garantir que admin tem is_admin = 1
                db.prepare('UPDATE users SET is_admin = 1 WHERE phone = ?').run(adminPhone);
            }
        }

        // Inserir configurações padrão se não existirem
        insertDefaultSettings();
        insertDefaultMessages();

        logger.info('✅ Tabelas inicializadas com sucesso!');

    } catch (error) {
        logger.error('❌ Erro ao inicializar tabelas:', error);
        throw error;
    }
}

// ============================================
// INSERIR CONFIGURAÇÕES PADRÃO
// ============================================
function insertDefaultSettings() {
    const defaultSettings = [
        { key: 'pix_value_1', value: '5.00', type: 'decimal', description: 'Valor PIX R$5' },
        { key: 'pix_value_2', value: '8.00', type: 'decimal', description: 'Valor PIX R$8' },
        { key: 'pix_value_3', value: '20.00', type: 'decimal', description: 'Valor PIX R$20' },
        { key: 'referral_bonus', value: '10', type: 'integer', description: '% Bônus indicação' },
        { key: 'telegram_group_link', value: config.links.telegramGroup, type: 'string', description: 'Link grupo Telegram' },
        { key: 'support_telegram_link', value: config.links.supportTelegram, type: 'string', description: 'Link suporte Telegram' },
        { key: 'bot_telegram_link', value: config.links.telegramBot, type: 'string', description: 'Link bot Telegram' },
        { key: 'pix_expiration', value: '30', type: 'integer', description: 'Expiração PIX (minutos)' },
    ];

    const insert = db.prepare(`
        INSERT OR IGNORE INTO settings (key, value, type, description) 
        VALUES (?, ?, ?, ?)
    `);

    for (const setting of defaultSettings) {
        insert.run(setting.key, setting.value, setting.type, setting.description);
    }
}

// ============================================
// INSERIR MENSAGENS PADRÃO
// ============================================
function insertDefaultMessages() {
    const defaultMessages = [
        { 
            key: 'welcome_message', 
            content: `🤖 *DOGUINHA STORE BOT* 🤖\n\n` +
                     `🥇 Nosso bot permite que você encontre diversos produtos e serviços, ` +
                     `oferecendo um ótimo custo-beneficio na hora de comprar, assim você ` +
                     `encontrará o item desejado pelo menor preço.\n\n` +
                     `🤖 Conheça nosso bot do Telegram:\n{telegram_bot_link}\n\n` +
                     `ℹ️ Seus Dados:\n` +
                     `├💠 Número: {phone}\n` +
                     `└💸 Saldo Atual: R$ {balance}`
        },
        { 
            key: 'add_balance_menu', 
            content: `💸 *MENU DE OPÇÕES DE PIX* 💸\n\n` +
                     `Escolha um dos valores disponíveis para recarregar sua conta ` +
                     `ou selecione "Digite outro valor" para inserir um valor personalizado.`
        },
        { 
            key: 'insufficient_balance', 
            content: `*❌ Saldo Insuficiente!*\n\n` +
                     `Seu saldo atual não é suficiente para concluir esta compra. ` +
                     `Faça uma *recarga* e tente novamente! 💰`
        },
        { 
            key: 'generating_pix', 
            content: `*⏳ Gerando PIX...*\n\nAguarde um momento! 💰`
        },
        { 
            key: 'premium_menu', 
            content: `🥇 Somos a solução para o mercado digital, disponibilizando ` +
                     `um bot moderno que permite que o cliente receba pelo produto / ` +
                     `serviço desejado. Tudo isso com praticidade e segurança.\n\n` +
                     `👥 Grupo de Clientes:\n{telegram_group_link}\n\n` +
                     `🏦 Carteira:\n` +
                     `├💠 Número: {phone}\n` +
                     `└💰 Saldo Atual: R$ {balance}`
        },
        { 
            key: 'pix_qrcode_header', 
            content: `*💰 ADICIONAR SALDO COM PIX AUTOMÁTICO 💠*\n\n` +
                     `⚠️ Você está prestes a adicionar saldo ao bot!\n\n` +
                     `Escaneie o *QR Code* acima ou utilize o *código PIX* enviado abaixo.\n\n` +
                     `O PIX expira em *{expiration} minutos*, pague dentro do prazo.\n\n` +
                     `O saldo será creditado em até *1 minuto* após o pagamento.\n\n` +
                     `*⚠️ ADICIONE APENAS O QUE FOR USAR!*\n` +
                     `_Não realizamos reembolsos._\n\n` +
                     `━━━━━━━━❪❃❫━━━━━━━━\n\n` +
                     `*🆔 ID da Compra:* {transaction_id}\n` +
                     `*💰 Valor:* R$ {amount}\n` +
                     `*📅 Vencimento:* {expiration_date}\n\n` +
                     `━━━━━━━━❪❃❫━━━━━━━━\n\n` +
                     `*🔑 O código PIX foi enviado abaixo para facilitar o pagamento!*`
        },
        { 
            key: 'referral_menu', 
            content: `💼 *ÁREA DO ASSOCIADO* 💼\n\n` +
                     `━━━━━━━❰✭❱━━━━━━━\n\n` +
                     `🔗 SEU LINK DE INDICAÇÃO:\n` +
                     `{referral_link}\n` +
                     `(Clique e abra uma conversa já com seu código de indicação pronto!)\n\n` +
                     `》═══════~ OU ~═══════《\n\n` +
                     `🆔 CÓDIGO DE INDICAÇÃO:\n` +
                     `{referral_code}\n` +
                     `(Envie este código no bot para ser indicado automaticamente.)\n\n` +
                     `━━━━━━━❰✭❱━━━━━━━\n\n` +
                     `┏━━━━━━━━━━━━━━━┓\n` +
                     `📊 ESTATÍSTICAS DO ASSOCIADO\n` +
                     `┗━━━━━━━━━━━━━━━┛\n\n` +
                     `💰 Bônus/Saldo Atual: R$ {bonus_balance}\n` +
                     `👥 Total de Indicados: {total_referrals}\n` +
                     `📈 Percentual de Ganho Sobre Vendas: {bonus_percentage}%`
        },
        { 
            key: 'referral_text_model', 
            content: `🎬 *BORA TER ACESSO AOS MELHORES STREAMINGS!* 🎬\n\n` +
                     `Estou indicando um bot incrível que te dá acesso a contas de:\n\n` +
                     `✅ Netflix\n` +
                     `✅ HBO Max\n` +
                     `✅ Disney+\n` +
                     `✅ Globoplay\n` +
                     `✅ Amazon Prime\n` +
                     `✅ Paramount+\n` +
                     `✅ E MUITO MAIS!\n\n` +
                     `💬 *É muito fácil participar:*\n` +
                     `1️⃣ Clique no link e fale direto com o bot:\n` +
                     `👉 {referral_link}\n\n` +
                     `2️⃣ Ou envie o *código de indicação:*\n` +
                     `🔹 {referral_code}\n\n` +
                     `⚡ *Vantagens:*\n` +
                     `✔ Contas premium atualizadas\n` +
                     `✔ Preços acessíveis\n` +
                     `✔ Suporte rápido\n\n` +
                     `*Garanta já seu acesso e aproveite os melhores conteúdos!*\n` +
                     `📲 *Corre lá e garanta o seu!*`
        },
        { 
            key: 'support_message', 
            content: `👤 *SUPORTE OFICIAL* 👤\n\n` +
                     `⚠️ *O SUPORTE DESTE BOT AGORA É FEITO EXCLUSIVAMENTE PELO TELEGRAM.*\n\n` +
                     `🔵 *TELEGRAM DO SUPORTE:*\n` +
                     `👨‍💻 {support_telegram_link}\n\n` +
                     `⚠️ *PARA DÚVIDAS, PAGAMENTOS, ACESSOS, MATERIAIS, RENOVAÇÕES ` +
                     `OU QUALQUER OUTRO ASSUNTO RELACIONADO AO BOT, ENTRE EM CONTATO ` +
                     `SOMENTE PELO TELEGRAM ACIMA.*\n\n` +
                     `✅ *ATENDIMENTO OFICIAL:*\n` +
                     `👉 {support_telegram_link}`
        },
        { 
            key: 'purchase_confirmation', 
            content: `*🛍️ CONFIRMAR COMPRA*\n\n` +
                     `*Produto:* {product_name}\n` +
                     `*Valor:* R$ {product_price}\n` +
                     `*Seu Saldo:* R$ {user_balance}\n` +
                     `*Saldo Após Compra:* R$ {balance_after}\n\n` +
                     `Deseja confirmar a compra?`
        },
        { 
            key: 'purchase_success', 
            content: `*✅ COMPRA REALIZADA COM SUCESSO!*\n\n` +
                     `*Produto:* {product_name}\n` +
                     `*Valor:* R$ {product_price}\n` +
                     `*Saldo Restante:* R$ {balance_after}\n\n` +
                     `Aproveite seu produto! 🎉`
        },
        { 
            key: 'out_of_stock', 
            content: `*❌ Produto Esgotado!*\n\n` +
                     `Infelizmente este produto está fora de estoque no momento. ` +
                     `Tente novamente mais tarde.`
        },
    ];

    const insert = db.prepare(`
        INSERT OR IGNORE INTO messages (key, content) 
        VALUES (?, ?)
    `);

    for (const message of defaultMessages) {
        insert.run(message.key, message.content);
    }
}

// ============================================
// OBTER INSTÂNCIA DO BANCO
// ============================================
function getDatabase() {
    if (!db) {
        throw new Error('Banco de dados não inicializado');
    }
    return db;
}

// ============================================
// FECHAR BANCO DE DADOS
// ============================================
function closeDatabase() {
    if (db) {
        db.close();
        logger.info('🔒 Banco de dados fechado');
    }
}

module.exports = {
    connectDatabase,
    initializeDatabase,
    getDatabase,
    closeDatabase
};
