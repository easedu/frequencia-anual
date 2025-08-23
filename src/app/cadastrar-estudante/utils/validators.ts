export const validateTelefone = (telefone: string): boolean => {
    const cleanedTelefone = telefone.replace(/\D/g, "");
    return cleanedTelefone.length === 10 || cleanedTelefone.length === 11;
};

export const validateNomeContato = (nome: string): boolean => {
    return nome.trim().length >= 2 && nome.trim().length <= 100;
};

export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validação melhorada do CEP
export const validateCep = (cep: string): boolean => {
    const cleanedCep = cep.replace(/\D/g, "");

    // Deve ter exatamente 8 dígitos
    if (cleanedCep.length !== 8) {
        return false;
    }

    // Não pode ser uma sequência de números iguais (00000000, 11111111, etc.)
    if (/^(\d)\1{7}$/.test(cleanedCep)) {
        return false;
    }

    // Validações específicas para CEPs conhecidos como inválidos
    const invalidCeps = ['00000000', '12345678', '87654321'];
    if (invalidCeps.includes(cleanedCep)) {
        return false;
    }

    return true;
};

export const validateDataNascimento = (data: string): boolean => {
    const cleanedData = data.replace(/\D/g, "");
    if (cleanedData.length === 0) {
        return true; // Campo opcional
    }
    if (cleanedData.length !== 8) {
        return false;
    }

    const day = parseInt(cleanedData.slice(0, 2), 10);
    const month = parseInt(cleanedData.slice(2, 4), 10);
    const year = parseInt(cleanedData.slice(4, 8), 10);

    // Validações básicas
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) {
        return false;
    }

    // Validação de dias por mês
    if ([4, 6, 9, 11].includes(month) && day > 30) {
        return false;
    }

    // Validação para fevereiro
    if (month === 2) {
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        if (day > (isLeapYear ? 29 : 28)) {
            return false;
        }
    }

    // Verifica se a data não é no futuro
    const inputDate = new Date(year, month - 1, day);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    if (inputDate >= currentDate) {
        return false;
    }

    // Verifica se a data não é muito antiga (mais de 120 anos)
    const maxAge = new Date();
    maxAge.setFullYear(maxAge.getFullYear() - 120);
    if (inputDate < maxAge) {
        return false;
    }

    return true;
};