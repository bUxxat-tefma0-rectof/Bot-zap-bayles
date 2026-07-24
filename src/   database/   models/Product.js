// ============================================
// DOGUINHA STORE BOT - MODELO PRODUTO
// ============================================

const { getDatabase } = require('../connection');

class Product {
    // ============================================
    // CRIAR PRODUTO
    // ============================================
    static create(name, price, stock, category, description, credentialsFile) {
        const db = getDatabase();
        
        const result = db.prepare(`
            INSERT INTO products (name, price, stock, category, description, credentials_file) 
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(name, price, stock, category || 'Assinatura', description || '', credentialsFile || '');
        
        return this.findById(result.lastInsertRowid);
    }

    // ============================================
    // BUSCAR PRODUTO POR ID
    // ============================================
    static findById(id) {
        const db = getDatabase();
        return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    }

    // ============================================
    // BUSCAR TODOS PRODUTOS ATIVOS
    // ============================================
    static findAllActive() {
        const db = getDatabase();
        return db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC').all();
    }

    // ============================================
    // BUSCAR TODOS PRODUTOS (INCLUINDO INATIVOS)
    // ============================================
    static findAll() {
        const db = getDatabase();
        return db.prepare('SELECT * FROM products ORDER BY name ASC').all();
    }

    // ============================================
    // ATUALIZAR PRODUTO
    // ============================================
    static update(id, data) {
        const db = getDatabase();
        
        const fields = [];
        const values = [];
        
        if (data.name !== undefined) {
            fields.push('name = ?');
            values.push(data.name);
        }
        if (data.price !== undefined) {
            fields.push('price = ?');
            values.push(data.price);
        }
        if (data.stock !== undefined) {
            fields.push('stock = ?');
            values.push(data.stock);
        }
        if (data.category !== undefined) {
            fields.push('category = ?');
            values.push(data.category);
        }
        if (data.description !== undefined) {
            fields.push('description = ?');
            values.push(data.description);
        }
        if (data.credentials_file !== undefined) {
            fields.push('credentials_file = ?');
            values.push(data.credentials_file);
        }
        if (data.is_active !== undefined) {
            fields.push('is_active = ?');
            values.push(data.is_active ? 1 : 0);
        }
        
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        
        db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        
        return this.findById(id);
    }

    // ============================================
    // ATUALIZAR ESTOQUE
    // ============================================
    static updateStock(id, quantity) {
        const db = getDatabase();
        db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(quantity, id);
        return this.findById(id);
    }

    // ============================================
    // REDUZIR ESTOQUE (NA COMPRA)
    // ============================================
    static decreaseStock(id) {
        const db = getDatabase();
        db.prepare('UPDATE products SET stock = stock - 1 WHERE id = ? AND stock > 0').run(id);
        return this.findById(id);
    }

    // ============================================
    // VERIFICAR SE TEM ESTOQUE
    // ============================================
    static hasStock(id) {
        const product = this.findById(id);
        return product && product.stock > 0;
    }

    // ============================================
    // ATIVAR/DESATIVAR PRODUTO
    // ============================================
    static toggleActive(id) {
        const db = getDatabase();
        const product = this.findById(id);
        if (product) {
            const newStatus = product.is_active === 1 ? 0 : 1;
            db.prepare('UPDATE products SET is_active = ? WHERE id = ?').run(newStatus, id);
        }
        return this.findById(id);
    }

    // ============================================
    // DELETAR PRODUTO
    // ============================================
    static delete(id) {
        const db = getDatabase();
        db.prepare('DELETE FROM products WHERE id = ?').run(id);
    }

    // ============================================
    // TOTAL DE PRODUTOS ATIVOS
    // ============================================
    static countActive() {
        const db = getDatabase();
        const result = db.prepare('SELECT COUNT(*) as total FROM products WHERE is_active = 1').get();
        return result.total;
    }

    // ============================================
    // BUSCAR POR CATEGORIA
    // ============================================
    static findByCategory(category) {
        const db = getDatabase();
        return db.prepare('SELECT * FROM products WHERE category = ? AND is_active = 1').all(category);
    }
}

module.exports = Product;
