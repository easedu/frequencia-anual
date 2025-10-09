/**
 * Definições de tipos centralizadas
 * Consolida todas as interfaces duplicadas em um local
 */

// ============================================================================
// INTERFACES BÁSICAS
// ============================================================================

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

// ============================================================================
// INTERFACES DE ESTUDANTE E DEFICIÊNCIA
// ============================================================================

export interface Deficiencia {
  estudanteComDeficiencia: boolean;
  tipoDeficiencia?: string[] | string;
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
  observacoes?: string;
}

export interface ProvaSaoPaulo {
  matricula?: string;
  edicao: string;
  mediaAluno: number;
  nivelProficiencia: string;
  anoEscolar: string;
  disciplina?: string;
  dataImportacao: string;
}

export interface Student {
  estudanteId: string;
  nome: string;
  turma: string;
  status: string;
  bolsaFamilia: string;
  turno: "MANHÃ" | "TARDE";
  matricula?: string;
  dataNascimento?: string;
  contatos?: Contato[];
  email?: string;
  endereco?: Endereco;
  deficiencia?: Deficiencia;
  provaSaoPaulo?: ProvaSaoPaulo[];
}

// Alias para compatibilidade com código existente
export type Estudante = Student;

// ============================================================================
// INTERFACES DE FREQUÊNCIA E FALTAS
// ============================================================================

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

export interface AbsenceRecord {
  estudanteId: string;
  data: string;
  justified: boolean;
  atestadoId?: string;
  suspensaoId?: string;
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

// ============================================================================
// INTERFACES DE INTERAÇÃO E OCORRÊNCIAS
// ============================================================================

export interface FamilyInteraction {
  id: string;
  studentId: string;
  type: string;
  date: string;
  description: string;
  createdBy: string;
  sensitive: boolean;
  whatsappMessage?: string; // Mensagem enviada via WhatsApp (obrigatório para type "Contato digital")
  whatsappPhones?: string[]; // Telefones que receberam a mensagem WhatsApp (para type "Contato digital")
}

export interface Occurrence {
  id: string;
  date: string;
  description: string;
  createdBy: string;
  sensitive: boolean;
}

// ============================================================================
// INTERFACES DE CONFIGURAÇÃO ACADÊMICA
// ============================================================================

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

// ============================================================================
// INTERFACES DE UI E FORMULÁRIOS
// ============================================================================

export interface SelectOption {
  value: string;
  label: string;
}

// ============================================================================
// INTERFACES DE PROCESSAMENTO DE DADOS
// ============================================================================

export interface CsvProvaSaoPaulo {
  nome: string;
  matricula?: string;
  edicao: string;
  media: string | number;
  nivelProficiencia: string;
  anoEscolar: string;
  disciplina?: string;
}

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

// ============================================================================
// TIPOS UTILITÁRIOS
// ============================================================================

export type UserRole = 'admin' | 'teacher' | 'coordinator' | 'user';

export type AttendanceStatus = 'present' | 'absent' | 'justified' | 'late';

export type Turno = 'MANHÃ' | 'TARDE';

export type StatusEstudante = 'ATIVO' | 'INATIVO' | 'TRANSFERIDO' | 'DESLIGADO';

// ============================================================================
// INTERFACES DE API E HOOKS
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface FilterOptions {
  searchTerm?: string;
  turma?: string;
  turno?: Turno;
  status?: StatusEstudante;
  bolsaFamilia?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// INTERFACES DE CONFIGURAÇÃO E CACHE
// ============================================================================

export interface CacheConfig {
  ttl: number;
  maxSize: number;
  namespace: string;
}

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  queryCount: number;
  cacheHitRate: number;
}