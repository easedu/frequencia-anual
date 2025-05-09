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

export const validateCep = (cep: string): boolean => {
    const cleanedCep = cep.replace(/\D/g, "");
    return cleanedCep.length === 8;
};

export const validateDataNascimento = (data: string): boolean => {
    const cleanedData = data.replace(/\D/g, "");
    if (cleanedData.length === 0) {
        return true;
    }
    if (cleanedData.length !== 8) {
        return false;
    }

    const day = parseInt(cleanedData.slice(0, 2), 10);
    const month = parseInt(cleanedData.slice(2, 4), 10);
    const year = parseInt(cleanedData.slice(4, 8), 10);

    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) {
        return false;
    }

    if ([4, 6, 9, 11].includes(month) && day > 30) {
        return false;
    }

    if (month === 2) {
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        if (day > (isLeapYear ? 29 : 28)) {
            return false;
        }
    }

    const inputDate = new Date(year, month - 1, day);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    if (inputDate >= currentDate) {
        return false;
    }

    return true;
};