// ============================================
// DOGUINHA STORE BOT - UTILITÁRIOS DE DATA
// ============================================

// ============================================
// ADICIONAR MINUTOS A DATA ATUAL
// ============================================
function addMinutes(minutes) {
    const date = new Date();
    date.setMinutes(date.getMinutes() + parseInt(minutes));
    return date;
}

// ============================================
// FORMATAR DATA E HORA (BRASIL)
// ============================================
function formatDateTime(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// ============================================
// FORMATAR DATA
// ============================================
function formatDate(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}/${month}/${year}`;
}

// ============================================
// FORMATAR HORA
// ============================================
function formatTime(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
}

// ============================================
// CALCULAR DIFERENÇA EM MINUTOS
// ============================================
function diffInMinutes(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diff = Math.abs(d1 - d2);
    return Math.floor(diff / (1000 * 60));
}

// ============================================
// VERIFICAR SE DATA EXPIRROU
// ============================================
function isExpired(date) {
    if (!date) return false;
    const now = new Date();
    const target = new Date(date);
    return now > target;
}

// ============================================
// OBTER DATA ATUAL FORMATADA
// ============================================
function getCurrentDateTime() {
    return formatDateTime(new Date());
}

module.exports = {
    addMinutes,
    formatDateTime,
    formatDate,
    formatTime,
    diffInMinutes,
    isExpired,
    getCurrentDateTime
};
