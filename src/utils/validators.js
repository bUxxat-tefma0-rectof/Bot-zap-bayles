// ============================================
// DOGUINHA STORE BOT - VALIDADORES
// ============================================

// ============================================
// VALIDAR NÚMERO DE TELEFONE
// ============================================
function validatePhone(phone) {
    // Remover caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Verificar se é número brasileiro
    const brazilianPhone = /^55\d{10,11}$/;
    const internationalPhone = /^\d{10,15}$/;
    
    if (!brazilianPhone.test(cleanPhone) && !internationalPhone.test(cleanPhone)) {
        return {
            valid: false,
            message: '❌ *Número inválido!*\n\nFormato aceito: 55XXXXXXXXXXX',
            cleanPhone: null
        };
    }
    
    return {
        valid: true,
        message: '',
        cleanPhone: cleanPhone
    };
}

// ============================================
// VALIDAR VALOR MONETÁRIO
// ============================================
function validateAmount(value) {
    // Limpar valor
    let cleanValue = String(value).replace(/[^\d.,]/g, '');
    cleanValue = cleanValue.replace(',', '.');
    
    const amount = parseFloat(cleanValue);
    
    if (isNaN(amount)) {
        return {
            valid: false,
            message: '❌ *Valor inválido!*\n\nDigite um valor numérico (ex: 50)',
            amount: null
        };
    }
    
    if (amount <= 0) {
        return {
            valid: false,
            message: '❌ *Valor deve ser maior que zero!*',
            amount: null
        };
    }
    
    if (amount > 10000) {
        return {
            valid: false,
            message: '❌ *Valor máximo: R$ 10.000,00*',
            amount: null
        };
    }
    
    return {
        valid: true,
        message: '',
        amount: amount
    };
}

// ============================================
// VALIDAR NOME DE PRODUTO
// ============================================
function validateProductName(name) {
    if (!name || typeof name !== 'string') {
        return {
            valid: false,
            message: '❌ *Nome inválido!*'
        };
    }
    
    const cleanName = name.trim();
    
    if (cleanName.length < 3) {
        return {
            valid: false,
            message: '❌ *Nome muito curto!*\n\nMínimo 3 caracteres.'
        };
    }
    
    if (cleanName.length > 100) {
        return {
            valid: false,
            message: '❌ *Nome muito longo!*\n\nMáximo 100 caracteres.'
        };
    }
    
    return {
        valid: true,
        message: '',
        name: cleanName
    };
}

// ============================================
// VALIDAR PREÇO
// ============================================
function validatePrice(price) {
    const amountResult = validateAmount(price);
    
    if (!amountResult.valid) {
        return amountResult;
    }
    
    if (amountResult.amount < 0.01) {
        return {
            valid: false,
            message: '❌ *Preço mínimo: R$ 0,01*',
            price: null
        };
    }
    
    if (amountResult.amount > 9999.99) {
        return {
            valid: false,
            message: '❌ *Preço máximo: R$ 9.999,99*',
            price: null
        };
    }
    
    return {
        valid: true,
        message: '',
        price: parseFloat(amountResult.amount.toFixed(2))
    };
}

// ============================================
// VALIDAR ESTOQUE
// ============================================
function validateStock(stock) {
    const stockNumber = parseInt(stock);
    
    if (isNaN(stockNumber)) {
        return {
            valid: false,
            message: '❌ *Estoque inválido!*\n\nDigite um número inteiro.',
            stock: null
        };
    }
    
    if (stockNumber < 0) {
        return {
            valid: false,
            message: '❌ *Estoque não pode ser negativo!*',
            stock: null
        };
    }
    
    if (stockNumber > 99999) {
        return {
            valid: false,
            message: '❌ *Estoque máximo: 99.999 unidades*',
            stock: null
        };
    }
    
    return {
        valid: true,
        message: '',
        stock: stockNumber
    };
}

// ============================================
// VALIDAR CÓDIGO DE INDICAÇÃO
// ============================================
function validateReferralCode(code) {
    if (!code || typeof code !== 'string') {
        return {
            valid: false,
            message: '❌ *Código inválido!*'
        };
    }
    
    const cleanCode = code.trim().toUpperCase();
    
    // Formato: BONUS_COD_55XXXXXXXXXXX
    const referralPattern = /^BONUS_COD_\d{10,15}$/;
    
    if (!referralPattern.test(cleanCode)) {
        return {
            valid: false,
            message: '❌ *Código de indicação inválido!*\n\nFormato: BONUS_COD_55XXXXXXXXXXX',
            code: null
        };
    }
    
    return {
        valid: true,
        message: '',
        code: cleanCode
    };
}

// ============================================
// VALIDAR EMAIL
// ============================================
function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return {
            valid: false,
            message: '❌ *Email inválido!*'
        };
    }
    
    const cleanEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailPattern.test(cleanEmail)) {
        return {
            valid: false,
            message: '❌ *Formato de email inválido!*\n\nExemplo: usuario@email.com',
            email: null
        };
    }
    
    return {
        valid: true,
        message: '',
        email: cleanEmail
    };
}

// ============================================
// VALIDAR LINK/URL
// ============================================
function validateUrl(url) {
    if (!url || typeof url !== 'string') {
        return {
            valid: false,
            message: '❌ *Link inválido!*'
        };
    }
    
    const cleanUrl = url.trim();
    const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    
    if (!urlPattern.test(cleanUrl)) {
        return {
            valid: false,
            message: '❌ *Formato de link inválido!*',
            url: null
        };
    }
    
    return {
        valid: true,
        message: '',
        url: cleanUrl
    };
}

// ============================================
// VALIDAR PORCENTAGEM
// ============================================
function validatePercentage(value) {
    const percentage = parseFloat(value);
    
    if (isNaN(percentage)) {
        return {
            valid: false,
            message: '❌ *Porcentagem inválida!*\n\nDigite um número.',
            percentage: null
        };
    }
    
    if (percentage < 0) {
        return {
            valid: false,
            message: '❌ *Porcentagem não pode ser negativa!*',
            percentage: null
        };
    }
    
    if (percentage > 100) {
        return {
            valid: false,
            message: '❌ *Porcentagem máxima: 100%*',
            percentage: null
        };
    }
    
    return {
        valid: true,
        message: '',
        percentage: percentage
    };
}

// ============================================
// VALIDAR TEXTO DE MENSAGEM
// ============================================
function validateMessage(text) {
    if (!text || typeof text !== 'string') {
        return {
            valid: false,
            message: '❌ *Mensagem inválida!*'
        };
    }
    
    const cleanText = text.trim();
    
    if (cleanText.length < 1) {
        return {
            valid: false,
            message: '❌ *Mensagem muito curta!*'
        };
    }
    
    if (cleanText.length > 4000) {
        return {
            valid: false,
            message: '❌ *Mensagem muito longa!*\n\nMáximo 4000 caracteres.'
        };
    }
    
    return {
        valid: true,
        message: '',
        text: cleanText
    };
}

// ============================================
// VALIDAR ID
// ============================================
function validateId(id) {
    if (!id) {
        return {
            valid: false,
            message: '❌ *ID inválido!*'
        };
    }
    
    const idNumber = parseInt(id);
    
    if (isNaN(idNumber) || idNumber <= 0) {
        return {
            valid: false,
            message: '❌ *ID deve ser um número positivo!*',
            id: null
        };
    }
    
    return {
        valid: true,
        message: '',
        id: idNumber
    };
}

// ============================================
// SANITIZAR TEXTO (REMOVER CARACTERES PERIGOSOS)
// ============================================
function sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';
    
    // Remover HTML
    let sanitized = text.replace(/<[^>]*>/g, '');
    
    // Remover scripts
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remover eventos JavaScript
    sanitized = sanitized.replace(/on\w+="[^"]*"/g, '');
    sanitized = sanitized.replace(/on\w+='[^']*'/g, '');
    
    // Limitar tamanho
    if (sanitized.length > 4000) {
        sanitized = sanitized.substring(0, 4000);
    }
    
    return sanitized.trim();
}

// ============================================
// VALIDAR DADOS COMPLETOS
// ============================================
function validateAll(validations) {
    const errors = [];
    
    for (const validation of validations) {
        if (!validation.valid) {
            errors.push(validation.message);
        }
    }
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

module.exports = {
    validatePhone,
    validateAmount,
    validateProductName,
    validatePrice,
    validateStock,
    validateReferralCode,
    validateEmail,
    validateUrl,
    validatePercentage,
    validateMessage,
    validateId,
    sanitizeText,
    validateAll
};
