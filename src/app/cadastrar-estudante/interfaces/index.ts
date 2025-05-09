export interface Contato {
    nome: string;
    telefone: string;
}

export interface Endereco {
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    complemento: string;
}

export interface Deficiencia {
    estudanteComDeficiencia: boolean;
    tipoDeficiencia?: string[];
    possuiBarreiras?: boolean;
    aee?: "PAEE" | "PAAI";
    instituicao?: "INSTITUTO JÔ CLEMENTE" | "CLIFAK" | "CEJOLE" | "CCA";
    horarioAtendimento?: "NENHUM" | "NO TURNO" | "CONTRATURNO";
    atendimentoSaude?: string[];
    possuiEstagiario?: boolean;
    nomeEstagiario?: string;
    justificativaEstagiario?: "MEDIAÇÃO E APOIO NAS ATIVIDADES DA UE" | "SEM BARREIRAS";
    ave?: boolean;
    nomeAve?: string;
    justificativaAve?: string[];
}

export interface Estudante {
    estudanteId: string;
    turma: string;
    nome: string;
    status: string;
    turno: "MANHÃ" | "TARDE";
    bolsaFamilia: "SIM" | "NÃO";
    contatos?: Contato[];
    email?: string;
    endereco?: Endereco;
    dataNascimento?: string;
    deficiencia?: Deficiencia;
}

export interface SelectOption {
    value: string;
    label: string;
}