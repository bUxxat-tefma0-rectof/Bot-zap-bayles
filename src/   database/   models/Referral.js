// ============================================
// DOGUINHA STORE BOT - MODELO INDICAÇÃO
// ============================================

const { getDatabase } = require('../connection');

class Referral {
    // ============================================
    // CRIAR INDICAÇÃO
    // ============================================
    static create(referrerPhone, referredPhone, bonusEarned) {
        const db = getDatabase();
        
        const result = db.prepare(`
            INSERT INTO referrals (referrer_phone, referred_phone, bonus_earned) 
            VALUES (?, ?, ?)
        `).run(referrerPhone, referredPhone, bonusEarned || 0);
        
        return this.findById(result.lastInsertRowid);
    }

    // ============================================
    // BUSCAR INDICAÇÃO POR ID
    // ============================================
    static findById(id) {
        const db = getDatabase();
        return db.prepare('SELECT * FROM referrals WHERE id = ?').get(id);
    }

    // ============================================
    // BUSCAR INDICAÇÕES DE UM USUÁRIO
    // ============================================
    static findByReferrer(phone) {
        const db = getDatabase();
        return db.prepare('SELECT * FROM referrals WHERE referrer_phone = ? ORDER BY created_at DESC').all(phone);
    }

    // ============================================
    // VERIFICAR SE USUÁRIO JÁ FOI INDICADO
    // ============================================
    static isAlreadyReferred(phone) {
        const db = getDatabase();
        const result = db.prepare('SELECT COUNT(*) as count FROM referrals WHERE referred_phone = ?').get(phone);
        return result.count > 0;
    }

    // ============================================
    // TOTAL DE INDICAÇÕES DE UM USUÁRIO
    // ============================================
    static countByReferrer(phone) {
        const db = getDatabase();
        const result = db.prepare('SELECT COUNT(*) as total FROM referrals WHERE referrer_phone = ?').get(phone);
        return result.total;
    }

    // ============================================
    // TOTAL DE BÔNUS GANHO POR UM USUÁRIO
    // ============================================
    static totalBonusEarned(phone) {
        const db = getDatabase();
        const result = db.prepare('SELECT SUM(bonus_earned) as total FROM referrals WHERE referrer_phone = ?').get(phone);
        return result.total || 0;
    }

    // ============================================
    // BUSCAR TODAS INDICAÇÕES
    // ============================================
    static findAll() {
        const db = getDatabase();
        return db.prepare('SELECT * FROM referrals ORDER BY created_at DESC').all();
    }

    // ============================================
    // TOTAL DE INDICAÇÕES NO SISTEMA
    // ============================================
    static count() {
        const db = getDatabase();
        const result = db.prepare('SELECT COUNT(*) as total FROM referrals').get();
        return result.total;
    }
}

module.exports = Referral;
