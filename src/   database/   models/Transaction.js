// ============================================
// DOGUINHA STORE BOT - MODELO TRANSAÇÃO
// ============================================

const { getDatabase } = require('../connection');

class Transaction {
    // ============================================
    // CRIAR TRANSAÇÃO
    // ============================================
    static create(id, userPhone, type, amount, pixCode, pixQrcode, expiresAt, productId) {
        const db = getDatabase();
        
        db.prepare(`
            INSERT INTO transactions (id, user_phone, type, amount, pix_code, pix_qrcode, expires_at, product_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, userPhone, type, amount, pixCode || null, pixQrcode || null, expiresAt || null, productId || null);
        
        return this.findById(id);
    }

    // ============================================
    // BUSCAR TRANSAÇÃO POR ID
    // ============================================
    static findById(id) {
        const db = getDatabase();
        return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    }

    // ============================================
    // BUSCAR TRANSAÇÕES DE UM USUÁRIO
    // ============================================
    static findByUser(phone) {
        const db = getDatabase();
        return db.prepare('SELECT * FROM transactions WHERE user_phone = ? ORDER BY created_at DESC').all(phone);
    }

    // ============================================
    // ATUALIZAR STATUS
    // ============================================
    static updateStatus(id, status) {
        const db = getDatabase();
        
        if (status === 'approved') {
            db.prepare('UPDATE transactions SET status = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
        } else {
            db.prepare('UPDATE transactions SET status = ? WHERE id = ?').run(status, id);
        }
        
        return this.findById(id);
    }

    // ============================================
    // BUSCAR TRANSAÇÕES PENDENTES
    // ============================================
    static findPending() {
        const db = getDatabase();
        return db.prepare("SELECT * FROM transactions WHERE status = 'pending'").all();
    }

    // ============================================
    // BUSCAR TRANSAÇÕES EXPIRADAS
    // ============================================
    static findExpired() {
        const db = getDatabase();
        return db.prepare("SELECT * FROM transactions WHERE status = 'pending' AND expires_at < datetime('now')").all();
    }

    // ============================================
    // CANCELAR TRANSAÇÕES EXPIRADAS
    // ============================================
    static cancelExpired() {
        const db = getDatabase();
        db.prepare("UPDATE transactions SET status = 'expired' WHERE status = 'pending' AND expires_at < datetime('now')").run();
    }

    // ============================================
    // TOTAL DE TRANSAÇÕES
    // ============================================
    static count() {
        const db = getDatabase();
        const result = db.prepare('SELECT COUNT(*) as total FROM transactions').get();
        return result.total;
    }

    // ============================================
    // TOTAL DE VENDAS (COMPRAS APROVADAS)
    // ============================================
    static totalSales() {
        const db = getDatabase();
        const result = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'purchase' AND status = 'approved'").get();
        return result.total || 0;
    }

    // ============================================
    // TOTAL DE RECARGAS APROVADAS
    // ============================================
    static totalDeposits() {
        const db = getDatabase();
        const result = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'deposit' AND status = 'approved'").get();
        return result.total || 0;
    }

    // ============================================
    // BUSCAR TODAS TRANSAÇÕES
    // ============================================
    static findAll(limit = 50) {
        const db = getDatabase();
        return db.prepare('SELECT * FROM transactions ORDER BY created_at DESC LIMIT ?').all(limit);
    }

    // ============================================
    // BUSCAR COMPRAS DE UM PRODUTO
    // ============================================
    static findByProduct(productId) {
        const db = getDatabase();
        return db.prepare("SELECT * FROM transactions WHERE product_id = ? AND type = 'purchase' AND status = 'approved'").all(productId);
    }
}

module.exports = Transaction;
