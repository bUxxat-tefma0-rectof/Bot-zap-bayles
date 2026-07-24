// ============================================
// DOGUINHA STORE BOT - PAINEL ADMIN
// ============================================

const { sendTextMessage, sendButtonMessage, sendListMessage } = require('../services/whatsapp');
const User = require('../database/models/User');
const Product = require('../database/models/Product');
const Transaction = require('../database/models/Transaction');
const Referral = require('../database/models/Referral');
const { getMessage } = require('../utils/messages');
const { getAdminButtons, getBackButton } = require('../utils/buttons');
const { getAllSettings, updateSetting } = require('../utils/settings');
const { getAllMessages, updateMessage } = require('../utils/messages');
const logger = require('../utils/logger');

let adminState = {};

// ============================================
// MENU ADMIN PRINCIPAL
// ============================================
async function handleAdminMenu(phone, user) {
    try {
        if (!User.isAdmin(phone)) {
            await sendTextMessage(phone, '⛔ *Acesso negado!*');
            return;
        }
        
        const message = `🔐 *PAINEL ADMINISTRATIVO*\n\n` +
                        `👤 Admin: ${phone}\n` +
                        `📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n\n` +
                        `*📊 ESTATÍSTICAS GERAIS:*\n` +
                        `👥 Total Usuários: ${User.count()}\n` +
                        `📦 Produtos Ativos: ${Product.countActive()}\n` +
                        `💰 Total Vendas: R$ ${Transaction.totalSales().toFixed(2)}\n` +
                        `💳 Total Recargas: R$ ${Transaction.totalDeposits().toFixed(2)}\n` +
                        `🔗 Total Indicações: ${Referral.count()}\n\n` +
                        `Escolha uma opção:`;
        
        const buttons = getAdminButtons();
        
        await sendButtonMessage(phone, message, buttons);
        
    } catch (error) {
        logger.error('❌ Erro no painel admin:', error);
    }
}

// ============================================
// PROCESSAR AÇÕES DO ADMIN
// ============================================
async function handleAdminAction(phone, action, user) {
    if (!User.isAdmin(phone)) return;
    
    switch (action) {
        case 'admin_products':
            await showAdminProducts(phone);
            break;
            
        case 'admin_add_product':
            adminState[phone] = { action: 'add_product', step: 'name' };
            await sendTextMessage(phone, '📝 *NOVO PRODUTO*\n\nDigite o *nome* do produto:');
            break;
            
        case 'admin_settings':
            await showAdminSettings(phone);
            break;
            
        case 'admin_messages':
            await showAdminMessages(phone);
            break;
            
        case 'admin_broadcast':
            await showBroadcastMenu(phone);
            break;
            
        case 'admin_stats':
            await showAdminStats(phone);
            break;
            
        case 'admin_users':
            await showAdminUsers(phone);
            break;
            
        case 'main_menu':
            await handleAdminMenu(phone, user);
            break;
            
        default:
            await handleAdminMenu(phone, user);
    }
}

// ============================================
// PROCESSAR INPUT DO ADMIN
// ============================================
async function handleAdminInput(phone, text) {
    const state = adminState[phone];
    
    if (!state) return false;
    
    switch (state.action) {
        case 'add_product':
            await processAddProduct(phone, text, state);
            break;
            
        case 'edit_product':
            await processEditProduct(phone, text, state);
            break;
            
        case 'edit_message':
            await processEditMessage(phone, text, state);
            break;
            
        case 'edit_setting':
            await processEditSetting(phone, text, state);
            break;
            
        default:
            delete adminState[phone];
    }
    
    return true;
}

// ============================================
// MOSTRAR PRODUTOS
// ============================================
async function showAdminProducts(phone) {
    const products = Product.findAll();
    
    if (products.length === 0) {
        await sendTextMessage(phone, '📭 Nenhum produto cadastrado.');
        return;
    }
    
    let message = '*📦 PRODUTOS CADASTRADOS:*\n\n';
    
    for (const p of products) {
        message += `🆔 ID: ${p.id}\n`;
        message += `📌 Nome: ${p.name}\n`;
        message += `💰 Preço: R$ ${parseFloat(p.price).toFixed(2)}\n`;
        message += `📦 Estoque: ${p.stock}\n`;
        message += `✅ Ativo: ${p.is_active === 1 ? 'Sim' : 'Não'}\n`;
        message += `━━━━━━━━━━━━━━\n`;
    }
    
    await sendTextMessage(phone, message);
}

// ============================================
// PROCESSAR ADICIONAR PRODUTO
// ============================================
async function processAddProduct(phone, text, state) {
    switch (state.step) {
        case 'name':
            state.name = text;
            state.step = 'price';
            await sendTextMessage(phone, '💰 Digite o *preço* do produto (ex: 19.90):');
            break;
            
        case 'price':
            const price = parseFloat(text.replace(',', '.'));
            if (isNaN(price)) {
                await sendTextMessage(phone, '❌ Preço inválido! Digite novamente:');
                return;
            }
            state.price = price;
            state.step = 'stock';
            await sendTextMessage(phone, '📦 Digite a *quantidade em estoque*:');
            break;
            
        case 'stock':
            const stock = parseInt(text);
            if (isNaN(stock)) {
                await sendTextMessage(phone, '❌ Quantidade inválida! Digite novamente:');
                return;
            }
            state.stock = stock;
            state.step = 'credentials';
            await sendTextMessage(phone, '🔐 Digite as *credenciais* (login e senha):\n\nEx:\nLogin: usuario@email.com\nSenha: 123456');
            break;
            
        case 'credentials':
            const product = Product.create(state.name, state.price, state.stock, 'Assinatura', '', text);
            await sendTextMessage(phone, `✅ *Produto criado com sucesso!*\n\nID: ${product.id}\nNome: ${product.name}\nPreço: R$ ${product.price}\nEstoque: ${product.stock}`);
            delete adminState[phone];
            break;
    }
}

// ============================================
// MOSTRAR ESTATÍSTICAS
// ============================================
async function showAdminStats(phone) {
    const totalUsers = User.count();
    const totalProducts = Product.countActive();
    const totalSales = Transaction.totalSales();
    const totalDeposits = Transaction.totalDeposits();
    const totalReferrals = Referral.count();
    const totalBalance = User.totalBalance();
    
    const message = `📊 *ESTATÍSTICAS COMPLETAS*\n\n` +
                    `👥 Usuários: ${totalUsers}\n` +
                    `📦 Produtos: ${totalProducts}\n` +
                    `💰 Vendas: R$ ${totalSales.toFixed(2)}\n` +
                    `💳 Recargas: R$ ${totalDeposits.toFixed(2)}\n` +
                    `🔗 Indicações: ${totalReferrals}\n` +
                    `🏦 Saldo Total: R$ ${totalBalance.toFixed(2)}\n`;
    
    await sendTextMessage(phone, message);
}

// ============================================
// MOSTRAR USUÁRIOS
// ============================================
async function showAdminUsers(phone) {
    const users = User.findAll();
    
    let message = `👥 *USUÁRIOS (${users.length})*\n\n`;
    
    for (const u of users.slice(0, 10)) {
        message += `📞 ${u.phone}\n`;
        message += `💰 Saldo: R$ ${parseFloat(u.balance).toFixed(2)}\n`;
        message += `👥 Indicações: ${u.total_referrals}\n`;
        message += `🚫 Bloqueado: ${u.is_blocked ? 'Sim' : 'Não'}\n`;
        message += `━━━━━━━━━━━━\n`;
    }
    
    await sendTextMessage(phone, message);
}

// ============================================
// MENU BROADCAST
// ============================================
async function showBroadcastMenu(phone) {
    adminState[phone] = { action: 'broadcast', step: 'message' };
    await sendTextMessage(phone, '📢 *TRANSMISSÃO EM MASSA*\n\nDigite a mensagem que será enviada para *TODOS* os usuários:\n\n⚠️ Esta ação não pode ser desfeita!');
}

// ============================================
// PROCESSAR BROADCAST
// ============================================
async function processBroadcast(phone, message) {
    const { handleBroadcast } = require('./broadcastController');
    await handleBroadcast(phone, message);
    delete adminState[phone];
}

// ============================================
// EXPORTAR
// ============================================
module.exports = {
    handleAdminMenu,
    handleAdminAction,
    handleAdminInput,
    showBroadcastMenu,
    processBroadcast
};
