// ============================================
// DOGUINHA STORE BOT - SERVIÇO DE PRODUTOS
// ============================================

const Product = require('../database/models/Product');
const Transaction = require('../database/models/Transaction');
const { generateCredentialsPdf, deletePdf } = require('./pdf');
const { sendPdfMessage, sendTextMessage } = require('./whatsapp');
const logger = require('../utils/logger');

// ============================================
// CRIAR PRODUTO
// ============================================
function createProduct(name, price, stock, category, description, credentials) {
    try {
        const product = Product.create(name, parseFloat(price), parseInt(stock), category, description, credentials);
        
        logger.info(`📦 Produto criado: ${name} (ID: ${product.id})`);
        
        return {
            success: true,
            product: product
        };

    } catch (error) {
        logger.error('❌ Erro ao criar produto:', error);
        return { success: false, message: 'Erro ao criar produto' };
    }
}

// ============================================
// ATUALIZAR PRODUTO
// ============================================
function updateProduct(id, data) {
    try {
        const product = Product.findById(id);
        
        if (!product) {
            return { success: false, message: 'Produto não encontrado' };
        }

        const updatedProduct = Product.update(id, data);
        
        logger.info(`📦 Produto atualizado: ${updatedProduct.name} (ID: ${id})`);
        
        return {
            success: true,
            product: updatedProduct
        };

    } catch (error) {
        logger.error('❌ Erro ao atualizar produto:', error);
        return { success: false, message: 'Erro ao atualizar produto' };
    }
}

// ============================================
// DELETAR PRODUTO
// ============================================
function deleteProduct(id) {
    try {
        const product = Product.findById(id);
        
        if (!product) {
            return { success: false, message: 'Produto não encontrado' };
        }

        Product.delete(id);
        
        logger.info(`🗑️ Produto deletado: ${product.name} (ID: ${id})`);
        
        return { success: true, message: 'Produto deletado com sucesso' };

    } catch (error) {
        logger.error('❌ Erro ao deletar produto:', error);
        return { success: false, message: 'Erro ao deletar produto' };
    }
}

// ============================================
// LISTAR PRODUTOS
// ============================================
function listProducts(includeInactive = false) {
    try {
        const products = includeInactive ? Product.findAll() : Product.findAllActive();
        
        return {
            success: true,
            total: products.length,
            products: products.map(p => ({
                id: p.id,
                name: p.name,
                price: parseFloat(p.price).toFixed(2),
                stock: p.stock,
                category: p.category,
                description: p.description,
                isActive: p.is_active === 1,
                createdAt: p.created_at
            }))
        };

    } catch (error) {
        logger.error('❌ Erro ao listar produtos:', error);
        return { success: false, message: 'Erro ao listar produtos' };
    }
}

// ============================================
// OBTER PRODUTO POR ID
// ============================================
function getProduct(id) {
    try {
        const product = Product.findById(id);
        
        if (!product) {
            return { success: false, message: 'Produto não encontrado' };
        }

        return {
            success: true,
            product: {
                id: product.id,
                name: product.name,
                price: parseFloat(product.price).toFixed(2),
                stock: product.stock,
                category: product.category,
                description: product.description,
                isActive: product.is_active === 1,
                createdAt: product.created_at,
                updatedAt: product.updated_at
            }
        };

    } catch (error) {
        logger.error('❌ Erro ao obter produto:', error);
        return { success: false, message: 'Erro ao obter produto' };
    }
}

// ============================================
// ATUALIZAR ESTOQUE
// ============================================
function updateStock(id, quantity) {
    try {
        const product = Product.updateStock(id, quantity);
        
        logger.info(`📦 Estoque atualizado: ${product.name} (${product.stock} unidades)`);
        
        return {
            success: true,
            product: product
        };

    } catch (error) {
        logger.error('❌ Erro ao atualizar estoque:', error);
        return { success: false, message: 'Erro ao atualizar estoque' };
    }
}

// ============================================
// ATIVAR/DESATIVAR PRODUTO
// ============================================
function toggleProductActive(id) {
    try {
        const product = Product.toggleActive(id);
        
        const status = product.is_active === 1 ? 'ativado' : 'desativado';
        
        logger.info(`📦 Produto ${status}: ${product.name} (ID: ${id})`);
        
        return {
            success: true,
            product: product,
            status: status
        };

    } catch (error) {
        logger.error('❌ Erro ao ativar/desativar produto:', error);
        return { success: false, message: 'Erro ao processar' };
    }
}

// ============================================
// ENVIAR CREDENCIAIS AO CLIENTE
// ============================================
async function sendProductCredentials(phone, product, userPhone) {
    try {
        // Gerar PDF
        const credentials = product.credentials_file || `Login: usuario_${Date.now()}\nSenha: senha_${Date.now()}`;
        const pdfData = await generateCredentialsPdf(product.name, credentials, userPhone);
        
        // Enviar PDF
        await sendPdfMessage(phone, pdfData.filePath, `${product.name}.pdf`);
        
        // Deletar PDF após envio
        setTimeout(() => {
            deletePdf(pdfData.filePath);
        }, 10000);
        
        logger.info(`📄 Credenciais enviadas para ${phone}: ${product.name}`);
        
        return { success: true };

    } catch (error) {
        logger.error('❌ Erro ao enviar credenciais:', error);
        return { success: false, message: 'Erro ao enviar credenciais' };
    }
}

// ============================================
// OBTER ESTATÍSTICAS DE VENDAS
// ============================================
function getProductSales(productId) {
    try {
        const transactions = Transaction.findByProduct(productId);
        const totalSold = transactions.length;
        const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

        return {
            success: true,
            productId: productId,
            totalSold: totalSold,
            totalRevenue: totalRevenue.toFixed(2),
            transactions: transactions.slice(0, 20)
        };

    } catch (error) {
        logger.error('❌ Erro ao obter vendas:', error);
        return { success: false, message: 'Erro ao obter vendas' };
    }
}

// ============================================
// VERIFICAR DISPONIBILIDADE
// ============================================
function checkAvailability(productId) {
    try {
        const product = Product.findById(productId);
        
        if (!product) {
            return { available: false, message: 'Produto não encontrado' };
        }

        if (!product.is_active) {
            return { available: false, message: 'Produto indisponível' };
        }

        if (product.stock <= 0) {
            return { available: false, message: 'Produto esgotado' };
        }

        return { available: true, product: product };

    } catch (error) {
        logger.error('❌ Erro ao verificar disponibilidade:', error);
        return { available: false, message: 'Erro ao verificar' };
    }
}

module.exports = {
    createProduct,
    updateProduct,
    deleteProduct,
    listProducts,
    getProduct,
    updateStock,
    toggleProductActive,
    sendProductCredentials,
    getProductSales,
    checkAvailability
};
