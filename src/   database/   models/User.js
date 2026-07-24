// ============================================
// DOGUINHA STORE BOT - MODELO USUÁRIO
// ============================================

const { getDatabase } = require('../connection');

class User {
    // ============================================
    // CRIAR OU ATUALIZAR USUÁRIO
    // ============================================
    static createOrUpdate(phone) {
        const db = getDatabase();
        
        const existing = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
        
        if (!existing) {
            const referralCode = `BONUS_COD_${phone}`;
            db.prepare(`
                INSERT INTO users (phone, referral_code) 
                VALUES (?, ?)
            `).run(phone, referralCode);
            
            return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
        }
        
        // Atualizar última interação
        db.prepare('UPDATE users SET last_interaction = CURRENT_TIMESTAMP WHERE phone = ?').run(phone);
        
        return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    }

    // ============================================
    // BUSCAR USUÁRIO POR TELEFONE
    // ============================================
    static findByPhone(phone) {
        const db = getDatabase();
        return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    }

    // ============================================
    // BUSCAR USUÁRIO POR CÓDIGO DE INDICAÇÃO
    // ============================================
    static findByReferralCode(code) {
        const db = getDatabase();
        return db.prepare('SELECT * FROM users WHERE referral_code = ?').get(code);
    }

    // ============================================
    // ATUALIZAR SALDO
    // ============================================
    static updateBalance(phone, amount) {
        const db = getDatabase();
        db.prepare('UPDATE users SET balance = balance + ? WHERE phone = ?').run(amount, phone);
        return this.findByPhone(phone);
    }

    // ============================================
    // ATUALIZAR SALDO DE BÔNUS
    // ============================================
    static updateBonusBalance(phone, amount) {
        const db = getDatabase();
        db.prepare('UPDATE users SET bonus_balance = bonus_balance + ? WHERE phone = ?').run(amount, phone);
        return this.findByPhone(phone);
    }

    // ============================================
    // INCREMENTAR TOTAL DE INDICADOS
    // ============================================
    static incrementReferrals(phone) {
        const db = getDatabase();
        db.prepare('UPDATE users SET total_referrals = total_referrals + 1 WHERE phone = ?').run(phone);
        return this.findByPhone(phone);
    }

    // ============================================
    // VERIFICAR SE É ADMIN
    // ============================================
    static isAdmin(phone) {
        const db = getDatabase();
        const user = db.prepare('SELECT is_admin FROM users WHERE phone = ?').get(phone);
        return user ? user.is_admin === 1 : false;
    }

    // ============================================
    // VERIFICAR SE ESTÁ BLOQUEADO
    // ============================================
    static isBlocked(phone) {
        const db = getDatabase();
        const user = db.prepare('SELECT is_blocked FROM users WHERE phone = ?').get(phone);
        return user ? user.is_blocked === 1 : false;
    }

    // ============================================
    // BLOQUEAR/DESBLOQUEAR USUÁRIO
    // ============================================
    static toggleBlock(phone) {
        const db = getDatabase();
        const user = this.findByPhone(phone);
        if (user) {
            const newStatus = user.is_blocked === 1 ? 0 : 1;
            db.prepare('UPDATE users SET is_blocked = ? WHERE phone = ?').run(newStatus, phone);
        }
        return this.findByPhone(phone);
    }

    // ============================================
    // BUSCAR TODOS USUÁRIOS
    // ============================================
    static findAll() {
        const db = getDatabase();
        return db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    }

    // ============================================
    // BUSCAR USUÁRIOS ATIVOS (NÃO BLOQUEADOS)
    // ============================================
    static findActiveUsers() {
        const db = getDatabase();
        return db.prepare('SELECT * FROM users WHERE is_blocked = 0').all();
    }

    // ============================================
    // TOTAL DE USUÁRIOS
    // ============================================
    static count() {
        const db = getDatabase();
        const result = db.prepare('SELECT COUNT(*) as total FROM users').get();
        return result.total;
    }

    // ============================================
    // TOTAL DE SALDO DE TODOS USUÁRIOS
    // ============================================
    static totalBalance() {
        const db = getDatabase();
        const result = db.prepare('SELECT SUM(balance) as total FROM users').get();
        return result.total || 0;
    }
}

module.exports = User;
