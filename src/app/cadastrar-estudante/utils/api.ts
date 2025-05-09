import { Endereco } from "../interfaces";

export const fetchAddressFromCep = async (cep: string): Promise<Endereco | null> => {
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) {
            throw new Error("Erro na consulta do CEP");
        }
        const data = await response.json();
        if (data.erro) {
            throw new Error("CEP não encontrado");
        }
        return {
            rua: data.logradouro || "",
            numero: "",
            bairro: data.bairro || "",
            cidade: data.localidade || "",
            estado: data.uf || "",
            cep: cep,
            complemento: data.complemento || "",
        };
    } catch (error) {
        console.error("Erro ao consultar ViaCEP:", error);
        return null;
    }
};