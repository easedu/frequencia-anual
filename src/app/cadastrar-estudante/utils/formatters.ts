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

export const formatCep = (cep: string): string => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length <= 5) {
        return digits;
    }
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
};

export const cleanCep = (cep: string): string => {
    return cep.replace(/\D/g, "");
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