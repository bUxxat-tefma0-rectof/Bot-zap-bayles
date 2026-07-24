// ============================================
// DOGUINHA STORE BOT - GERENCIADOR DE BOTÕES
// ============================================

const { getDatabase } = require('../database/connection');
const { getSetting } = require('./settings');
const logger = require('./logger');

// ============================================
// BOTÕES DO MENU PRINCIPAL
// ============================================
function getMainMenuButtons() {
    return [
        { id: 'add_balance', text: '💰 Adicionar Saldo' },
        { id: 'premium', text: '👑 Assinatura Premium' },
        { id: 'referral', text: '💼 Área do Associado' },
        { id: 'support', text: '📞 Contato do Suporte' }
    ];
}

// ============================================
// BOTÕES DO MENU DE PAGAMENTO
// ============================================
async function getPaymentButtons() {
    const value1 = await getSetting('pix_value_1', '5.00');
    const value2 = await getSetting('pix_value_2', '8.00');
    const value3 = await getSetting('pix_value_3', '20.00');
    
    return [
        { id: 'pix_5', text: `💠 PIX R$ ${parseFloat(value1).toFixed(2)}` },
        { id: 'pix_8', text: `💠 PIX R$ ${parseFloat(value2).toFixed(2)}` },
        { id: 'pix_20', text: `💠 PIX R$ ${parseFloat(value3).toFixed(2)}` },
        { id: 'pix_custom', text: '✍️ Digite Outro Valor' }
    ];
}

// ============================================
// BOTÕES DE PRODUTOS
// ============================================
function getProductButtons(products, currentPage, totalPages) {
    const buttons = [];
    
    // Botões dos produtos
    for (const product of products) {
        buttons.push({
            id: `buy_${product.id}`,
            text: `${product.name} - R$ ${parseFloat(product.price).toFixed(2)}`
        });
    }
    
    // Paginação
    if (totalPages > 1) {
        if (currentPage < totalPages) {
            buttons.push({ id: `premium_page_${currentPage + 1}`, text: '➡️ Exibir Mais' });
        }
        if (currentPage > 1) {
            buttons.push({ id: `premium_page_${currentPage - 1}`, text: '⬅️ Voltar' });
        }
    }
    
    // Botão voltar
    buttons.push({ id: 'main_menu', text: '🏠 Menu Inicial' });
    
    return buttons;
}

// ============================================
// BOTÕES CONFIRMAR/CANCELAR
// ============================================
function getConfirmCancelButtons(productId) {
    return [
        { id: `confirm_buy_${productId}`, text: '✅ Confirmar' },
        { id: 'premium', text: '❌ Cancelar' }
    ];
}

// ============================================
// BOTÕES DA ÁREA DO ASSOCIADO
// ============================================
function getReferralButtons() {
    return [
        { id: 'text_model', text: '📋 Texto Modelo' },
        { id: 'main_menu', text: '🏠 Menu Inicial' }
    ];
}

// ============================================
// BOTÃO VOLTAR
// ============================================
function getBackButton() {
    return [
        { id: 'main_menu', text: '🏠 Menu Inicial' }
    ];
}

// ============================================
// BOTÕES DO PAINEL ADMIN
// ============================================
function getAdminButtons() {
    return [
        { id: 'admin_products', text: '📦 Gerenciar Produtos' },
        { id: 'admin_add_product', text: '➕ Adicionar Produto' },
        { id: 'admin_settings', text: '⚙️ Configurações' },
        { id: 'admin_messages', text: '💬 Mensagens' },
        { id: 'admin_broadcast', text: '📢 Transmissão' },
        { id: 'admin_stats', text: '📊 Estatísticas' },
        { id: 'admin_users', text: '👥 Usuários' },
        { id: 'main_menu', text: '🏠 Menu Inicial' }
    ];
}

module.exports = {
    getMainMenuButtons,
    getPaymentButtons,
    getProductButtons,
    getConfirmCancelButtons,
    getReferralButtons,
    getBackButton,
    getAdminButtons
};
