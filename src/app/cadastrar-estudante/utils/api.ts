import { Endereco } from "../interfaces";

export const fetchAddressFromCep = async (cep: string): Promise<Endereco | null> => {
    try {
        // Limpa o CEP removendo tudo que não é dígito
        const cleanedCep = cep.replace(/\D/g, "");

        // Valida se o CEP tem exatamente 8 dígitos
        if (cleanedCep.length !== 8) {
            console.warn(`CEP inválido: deve conter exatamente 8 dígitos. CEP fornecido: "${cep}" (${cleanedCep.length} dígitos)`);
            return null;
        }

        // Valida se o CEP não é uma sequência de números iguais (como 00000000, 11111111, etc.)
        if (/^(\d)\1{7}$/.test(cleanedCep)) {
            console.warn(`CEP inválido: não pode ser uma sequência de números iguais. CEP: ${cleanedCep}`);
            return null;
        }

        console.log(`Consultando CEP: ${cleanedCep}`);

        const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();

        // Verifica se a API retornou erro
        if (data.erro) {
            console.warn(`CEP não encontrado na base dos Correios: ${cleanedCep}`);
            return null;
        }

        // Verifica se os campos essenciais estão presentes
        if (!data.localidade || !data.uf) {
            console.warn(`Dados incompletos retornados para o CEP: ${cleanedCep}`, data);
            return null;
        }

        console.log(`Endereço encontrado para CEP ${cleanedCep}:`, data);

        return {
            rua: data.logradouro || "",
            numero: "",
            bairro: data.bairro || "",
            cidade: data.localidade || "",
            estado: data.uf || "",
            cep: cleanedCep,
            complemento: data.complemento || "",
        };
    } catch (error) {
        console.error(`Erro ao consultar CEP "${cep}":`, error);

        // Diferentes tratamentos para diferentes tipos de erro
        if (error instanceof TypeError && error.message.includes('fetch')) {
            console.error('Erro de conectividade - verifique sua conexão com a internet');
        } else if (error instanceof SyntaxError) {
            console.error('Erro ao processar resposta da API - resposta inválida');
        }

        return null;
    }
};

// Função auxiliar para validar CEP antes de fazer a consulta
export const isValidCep = (cep: string): boolean => {
    const cleanedCep = cep.replace(/\D/g, "");

    // Deve ter exatamente 8 dígitos
    if (cleanedCep.length !== 8) {
        return false;
    }

    // Não pode ser uma sequência de números iguais
    if (/^(\d)\1{7}$/.test(cleanedCep)) {
        return false;
    }

    return true;
};

// Função auxiliar para formatar CEP com máscara
export const formatCepWithMask = (cep: string): string => {
    const cleanedCep = cep.replace(/\D/g, "");

    if (cleanedCep.length <= 5) {
        return cleanedCep;
    }

    return `${cleanedCep.slice(0, 5)}-${cleanedCep.slice(5, 8)}`;
};