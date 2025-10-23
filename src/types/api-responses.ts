/**
 * Tipos de resposta estratificados para APIs
 * Cada tipo representa um nível de detalhamento diferente
 *
 * OTIMIZAÇÃO: Reduzir over-fetching selecionando apenas campos necessários
 */

// ============================================================================
// STUDENT RESPONSES
// ============================================================================

/**
 * Minimal: Apenas dados essenciais para listagens
 * Uso: Tabelas, dropdowns, cards de preview
 * Tamanho: ~200 bytes por registro
 */
export interface StudentMinimal {
  id: string;
  student_id: string;
  name: string;
  class: string;
  shift: 'MANHÃ' | 'TARDE';
  status: 'ATIVO' | 'INATIVO' | 'TRANSFERIDO';
}

/**
 * Summary: Dados essenciais + informações agregadas
 * Uso: Dashboards, listas com mais contexto
 * Tamanho: ~400 bytes por registro
 */
export interface StudentSummary extends StudentMinimal {
  birth_date?: string | null;
  bolsa_familia?: 'SIM' | 'NÃO' | null;
  total_contacts: number;
  total_absences: number;
  total_open_tasks: number;
}

/**
 * Detailed: Todos os campos principais (sem relacionamentos)
 * Uso: Página de detalhes do estudante
 * Tamanho: ~800 bytes por registro
 */
export interface StudentDetailed extends StudentSummary {
  registration_number?: string | null;
  school_year: string;
  address?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  disabilities?: Array<{
    type: string;
    description?: string;
    cid?: string;
    aee_type?: string;
    needs_ave?: boolean;
  }>;
  created_at: string;
  updated_at: string;
}

/**
 * Full: Todos os campos + relacionamentos carregados
 * Uso: Edição completa, relatórios detalhados
 * Tamanho: ~2KB por registro
 */
export interface StudentFull extends StudentDetailed {
  student_contacts: Array<{
    id: string;
    name: string;
    relationship: string | null;
    phone: string | null;
    can_receive_whatsapp: boolean;
    whatsapp_data?: {
      number?: string;
      verified?: boolean;
      verified_at?: string;
    };
  }>;
}

// ============================================================================
// ABSENCE RESPONSES
// ============================================================================

/**
 * Minimal: Apenas dados essenciais de falta
 * Uso: Contadores, agregações
 * Tamanho: ~150 bytes por registro
 */
export interface AbsenceMinimal {
  id: string;
  student_id: string;
  absence_date: string;
  is_justified: boolean;
  bimester: string | null;
}

/**
 * Summary: Dados da falta + nome do estudante
 * Uso: Listagens, relatórios
 * Tamanho: ~250 bytes por registro
 */
export interface AbsenceSummary extends AbsenceMinimal {
  student_name: string;
  student_class: string;
  student_firebase_id: string;
}

/**
 * Detailed: Falta completa + relacionamentos
 * Uso: Visualização detalhada
 * Tamanho: ~400 bytes por registro
 */
export interface AbsenceDetailed extends AbsenceSummary {
  medical_certificate_id?: string | null;
  suspension_id?: string | null;
  created_at: string;
}

// ============================================================================
// INTERACTION RESPONSES
// ============================================================================

export interface InteractionMinimal {
  id: string;
  student_id: string;
  interaction_type: string;
  interaction_date: string;
  is_sensitive: boolean;
}

export interface InteractionSummary extends InteractionMinimal {
  student_name: string;
  student_class: string;
  description_preview: string; // Primeiros 100 caracteres
}

export interface InteractionDetailed extends InteractionSummary {
  description: string | null;
  created_by: string | null;
  created_at: string;
}

// ============================================================================
// TASK RESPONSES
// ============================================================================

export interface TaskMinimal {
  id: string;
  student_id: string;
  title: string;
  is_resolved: boolean;
  due_date: string | null;
}

export interface TaskSummary extends TaskMinimal {
  student_name: string;
  student_class: string;
  recommended_action: string | null;
  created_at: string;
}

export interface TaskDetailed extends TaskSummary {
  description: string | null;
  action_taken: string | null;
  created_by: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
}

// ============================================================================
// MEDICAL CERTIFICATE RESPONSES
// ============================================================================

export interface MedicalCertificateMinimal {
  id: string;
  student_id: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface MedicalCertificateSummary extends MedicalCertificateMinimal {
  student_name: string;
  days_covered: number;
}

export interface MedicalCertificateDetailed extends MedicalCertificateSummary {
  cid_code?: string | null;
  diagnosis?: string | null;
  doctor_name?: string | null;
  document_url?: string | null;
  created_at: string;
}

// ============================================================================
// SUSPENSION RESPONSES
// ============================================================================

export interface SuspensionMinimal {
  id: string;
  student_id: string;
  start_date: string;
  end_date: string;
  severity: string;
}

export interface SuspensionSummary extends SuspensionMinimal {
  student_name: string;
  reason: string;
}

export interface SuspensionDetailed extends SuspensionSummary {
  description?: string | null;
  decision_by?: string | null;
  follow_up_notes?: string | null;
  created_at: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Enum para especificar nível de detalhamento desejado
 */
export type DetailLevel = 'minimal' | 'summary' | 'detailed' | 'full';

/**
 * Metadata de paginação (padrão)
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Metadata de paginação cursor-based
 */
export interface CursorPaginationMeta {
  limit: number;
  total?: number;
  hasNextPage: boolean;
  nextCursor: string | null;
}

/**
 * Response wrapper genérico
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  pagination?: PaginationMeta | CursorPaginationMeta;
  error?: string;
  message?: string;
}
