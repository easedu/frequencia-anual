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
    instituicao?: "INSTITUTO JÔ CLEMENTE" | "CLIFAK" | "CEJOLE" | "CCA" | "NENHUM";
    horarioAtendimento?: "NENHUM" | "NO TURNO" | "CONTRATURNO";
    atendimentoSaude?: string[];
    possuiEstagiario?: boolean;
    nomeEstagiario?: string;
    justificativaEstagiario?: "MEDIAÇÃO E APOIO NAS ATIVIDADES DA UE" | "SEM BARREIRAS";
    ave?: boolean;
    nomeAve?: string;
    justificativaAve?: string[];
}

// Nova interface para dados da Prova São Paulo
export interface ProvaSaoPaulo {
    matricula?: string;
    edicao: string;
    mediaAluno: number;
    nivelProficiencia: string;
    anoEscolar: string;
    disciplina?: string; // Ex: Língua Portuguesa, Matemática
    dataImportacao: string; // Data de quando foi importado
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
    // Novo campo para dados da Prova São Paulo
    provaSaoPaulo?: ProvaSaoPaulo[];
    matricula?: string; // Matrícula do aluno
}

export interface SelectOption {
    value: string;
    label: string;
}

// Interface para dados do CSV da Prova São Paulo
export interface CsvProvaSaoPaulo {
    nome: string;
    matricula?: string;
    edicao: string;
    media: string | number;
    nivelProficiencia: string;
    anoEscolar: string;
    disciplina?: string;
}

// Interface para resultado do processamento do CSV
export interface ProcessamentoCsv {
    totalLinhas: number;
    alunosEncontrados: number;
    alunosNaoEncontrados: number;
    alunosAtualizados: number;
    erros: string[];
    detalhes: {
        encontrados: { nome: string; estudanteId: string }[];
        naoEncontrados: string[];
        duplicatas: string[];
    };
}