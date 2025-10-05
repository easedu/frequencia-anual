export interface Contato {
    nome: string;
    telefone: string;
    parentesco?: string;
    podeReceberMensagem?: boolean;
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

// Interface para dados da Prova São Paulo
export interface ProvaSaoPaulo {
    matricula?: string;
    edicao: string;
    mediaAluno: number;
    nivelProficiencia: string;
    anoEscolar: string;
    disciplina?: string;
    dataImportacao: string;
}

// Interface para dados de deficiência
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

export interface Student {
    estudanteId: string;
    nome: string;
    turma: string;
    status: string;
    bolsaFamilia: string;
    turno: "MANHÃ" | "TARDE";
    matricula?: string; // Novo campo
    dataNascimento?: string;
    contatos?: Contato[];
    email?: string;
    endereco?: Endereco;
    deficiencia?: Deficiencia; // Novo campo
    provaSaoPaulo?: ProvaSaoPaulo[]; // Novo campo
}

export interface StudentRecord {
    estudanteId: string;
    turma: string;
    nome: string;
    faltasB1: number;
    faltasB2: number;
    faltasB3: number;
    faltasB4: number;
    totalFaltas: number;
    totalFaltasAteHoje: number;
    percentualFaltas: number;
    percentualFaltasAteHoje: number;
    percentualFrequencia: number;
    percentualFrequenciaAteHoje: number;
    diasLetivosAteHoje: number;
    diasLetivosB1: number;
    diasLetivosB2: number;
    diasLetivosB3: number;
    diasLetivosB4: number;
    diasLetivosAnual: number;
}

export interface FamilyInteraction {
    id: string;
    studentId: string;
    type: string;
    date: string;
    description: string;
    createdBy: string;
    sensitive: boolean;
    whatsappMessage?: string; // Mensagem enviada via WhatsApp (obrigatório para type "Contato digital")
}

export interface Atestado {
    id: string;
    startDate: string;
    days: number;
    description: string;
    createdBy: string;
}

export interface Suspensao {
    id: string;
    startDate: string;
    days: number;
    description: string;
    createdBy: string;
}

export interface AbsenceRecord {
    estudanteId: string;
    data: string;
    justified: boolean;
    atestadoId?: string;
    suspensaoId?: string;
}

export interface BimesterDate {
    date: string;
    isChecked: boolean;
}

export interface BimesterData {
    dates: BimesterDate[];
    startDate: string;
    endDate: string;
}

export interface AnoLetivoData {
    "1º Bimestre": BimesterData;
    "2º Bimestre": BimesterData;
    "3º Bimestre": BimesterData;
    "4º Bimestre": BimesterData;
}

export interface BimesterDates {
    [key: number]: { start: string; end: string };
}

export interface Occurrence {
    id: string;
    date: string;
    description: string;
    createdBy: string;
    sensitive: boolean;
}