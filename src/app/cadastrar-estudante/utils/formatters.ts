export const formatTelefone = (telefone: string): string => {
    const digits = telefone.replace(/\D/g, "");
    if (digits.length === 0) {
        return "";
    } else if (digits.length <= 2) {
        return `(${digits}`;
    } else if (digits.length <= 6) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length <= 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
};

export const cleanTelefone = (telefone: string): string => {
    return telefone.replace(/\D/g, "");
};

// Função melhorada para formatar CEP
export const formatCep = (cep: string): string => {
    // Remove tudo que não é dígito
    const digits = cep.replace(/\D/g, "");

    // Limita a 8 dígitos
    const limitedDigits = digits.slice(0, 8);

    if (limitedDigits.length === 0) {
        return "";
    } else if (limitedDigits.length <= 5) {
        return limitedDigits;
    } else {
        return `${limitedDigits.slice(0, 5)}-${limitedDigits.slice(5)}`;
    }
};

export const cleanCep = (cep: string): string => {
    // Remove tudo que não é dígito e limita a 8 caracteres
    return cep.replace(/\D/g, "").slice(0, 8);
};

// Função para validar CEP
export const isValidCep = (cep: string): boolean => {
    const cleanedCep = cleanCep(cep);

    // Deve ter exatamente 8 dígitos
    if (cleanedCep.length !== 8) {
        return false;
    }

    // Não pode ser uma sequência de números iguais (00000000, 11111111, etc.)
    if (/^(\d)\1{7}$/.test(cleanedCep)) {
        return false;
    }

    return true;
};

export const formatDataNascimento = (data: string): string => {
    const digits = data.replace(/\D/g, "");
    if (digits.length === 0) {
        return "";
    } else if (digits.length <= 2) {
        return digits;
    } else if (digits.length <= 4) {
        return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }
};

export const cleanDataNascimento = (data: string): string => {
    return data.replace(/\D/g, "");
};