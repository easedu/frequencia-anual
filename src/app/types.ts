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

export interface Student {
    estudanteId: string;
    nome: string;
    turma: string;
    status: string;
    bolsaFamilia: string;
    turno: "MANHÃ" | "TARDE";
    dataNascimento?: string;
    contatos?: Contato[];
    email?: string;
    endereco?: Endereco;
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
    type: string;
    date: string;
    description: string;
    createdBy: string;
    sensitive: boolean;
}

export interface Atestado {
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