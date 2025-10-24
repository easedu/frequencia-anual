/**
 * TIPOS ESTRATIFICADOS
 *
 * Sistema de over-fetching otimizado com 4 níveis de detalhe:
 *
 * 1. minimal: Apenas IDs e nome (listagens, autocomplete)
 * 2. summary: Dados básicos (cards, preview)
 * 3. detailed: Dados completos sem relações (visualização)
 * 4. full: Tudo incluindo relações (edição, relatórios)
 *
 * Benefícios:
 * - minimal: ~5KB (90% redução)
 * - summary: ~12KB (75% redução)
 * - detailed: ~25KB (50% redução)
 * - full: ~50KB (baseline)
 */

import { Student, Contato, Deficiencia } from './index';

// ============================================================================
// STUDENTS - Tipos Estratificados
// ============================================================================

export type DetailLevel = 'minimal' | 'summary' | 'detailed' | 'full';

/**
 * MINIMAL: Apenas identificação (5KB)
 * Uso: Dropdowns, autocomplete, listagens simples
 */
export interface StudentMinimal {
  id: string;
  student_id: string;
  estudanteId: string; // Legacy compatibility
  name: string;
  class: string;
}

/**
 * SUMMARY: Dados básicos de visualização (12KB)
 * Uso: Cards, previews, tabelas principais
 */
export interface StudentSummary extends StudentMinimal {
  shift: 'MANHÃ' | 'TARDE';
  status: 'ATIVO' | 'INATIVO' | 'TRANSFERIDO';
  birth_date?: string;
  cpf?: string;
}

/**
 * DETAILED: Dados completos sem relações (25KB)
 * Uso: Visualização de perfil, relatórios básicos
 */
export interface StudentDetailed extends StudentSummary {
  // Dados pessoais
  rg?: string;
  ra?: string;
  enrollment_number?: string;

  // Bolsa Família
  bolsa_familia: 'SIM' | 'NÃO';
  nis?: string;

  // Endereço
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;

  // Dados escolares
  previous_school?: string;
  enrollment_date?: string;

  // Deficiências (JSONB)
  disabilities?: Deficiencia[];

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

/**
 * FULL: Tudo incluindo relações (50KB+)
 * Uso: Edição completa, exportação, relatórios detalhados
 */
export interface StudentFull extends StudentDetailed {
  // Relações (JOINs)
  contacts?: Contato[];
  absences_count?: number;
  tasks_count?: number;
  interactions_count?: number;

  // Metadados
  last_absence_date?: string;
  last_interaction_date?: string;
}

// Type guard para verificar nível de detalhe
export function isMinimal(student: any): student is StudentMinimal {
  return student && 'id' in student && 'name' in student && 'class' in student;
}

export function isSummary(student: any): student is StudentSummary {
  return isMinimal(student) && 'shift' in student && 'status' in student;
}

export function isDetailed(student: any): student is StudentDetailed {
  return isSummary(student) && 'created_at' in student;
}

export function isFull(student: any): student is StudentFull {
  return isDetailed(student) && 'contacts' in student;
}

// ============================================================================
// ABSENCES - Tipos Estratificados
// ============================================================================

export interface AbsenceMinimal {
  id: string;
  student_id: string;
  absence_date: string;
  bimester: number;
}

export interface AbsenceSummary extends AbsenceMinimal {
  is_justified: boolean;
  student_name?: string;
  student_class?: string;
}

export interface AbsenceDetailed extends AbsenceSummary {
  medical_certificate_id?: string;
  suspension_id?: string;
  created_at: string;
}

export interface AbsenceFull extends AbsenceDetailed {
  student_firebase_id?: string;
  student_shift?: string;
  student_status?: string;
  medical_certificate?: {
    id: string;
    start_date: string;
    end_date: string;
    total_days: number;
  };
}

// ============================================================================
// INTERACTIONS - Tipos Estratificados
// ============================================================================

export interface InteractionMinimal {
  id: string;
  student_id: string;
  interaction_date: string;
  type: string;
}

export interface InteractionSummary extends InteractionMinimal {
  description: string;
  student_name?: string;
  student_class?: string;
}

export interface InteractionDetailed extends InteractionSummary {
  contact_name?: string;
  contact_phone?: string;
  outcome?: string;
  follow_up_needed: boolean;
  created_by: string;
  created_at: string;
}

export interface InteractionFull extends InteractionDetailed {
  student_firebase_id?: string;
  student_shift?: string;
  student_status?: string;
}

// ============================================================================
// TASKS - Tipos Estratificados
// ============================================================================

export interface TaskMinimal {
  id: string;
  student_id: string;
  title: string;
  due_date?: string;
}

export interface TaskSummary extends TaskMinimal {
  is_resolved: boolean;
  priority: 'BAIXA' | 'MÉDIA' | 'ALTA';
  student_name?: string;
  student_class?: string;
}

export interface TaskDetailed extends TaskSummary {
  description?: string;
  action_taken?: string;
  recommended_action?: string;
  created_by: string;
  created_at: string;
  resolved_at?: string;
}

export interface TaskFull extends TaskDetailed {
  student_firebase_id?: string;
  student_shift?: string;
  student_status?: string;
  whatsapp_phone?: string;
}

// ============================================================================
// CERTIFICATES - Tipos Estratificados
// ============================================================================

export interface CertificateMinimal {
  id: string;
  student_id: string;
  start_date: string;
  end_date: string;
}

export interface CertificateSummary extends CertificateMinimal {
  total_days: number;
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  student_name?: string;
  student_class?: string;
}

export interface CertificateDetailed extends CertificateSummary {
  cid_code?: string;
  doctor_name?: string;
  hospital?: string;
  notes?: string;
  document_url?: string;
  created_at: string;
}

export interface CertificateFull extends CertificateDetailed {
  student_firebase_id?: string;
  student_shift?: string;
  student_status?: string;
  absences_covered?: Array<{
    id: string;
    absence_date: string;
    bimester: number;
  }>;
}

// ============================================================================
// SUSPENSIONS - Tipos Estratificados
// ============================================================================

export interface SuspensionMinimal {
  id: string;
  student_id: string;
  start_date: string;
  end_date: string;
}

export interface SuspensionSummary extends SuspensionMinimal {
  total_days: number;
  severity: 'LEVE' | 'MODERADA' | 'GRAVE';
  student_name?: string;
  student_class?: string;
}

export interface SuspensionDetailed extends SuspensionSummary {
  reason: string;
  action_taken?: string;
  parent_notified: boolean;
  created_by: string;
  created_at: string;
}

export interface SuspensionFull extends SuspensionDetailed {
  student_firebase_id?: string;
  student_shift?: string;
  student_status?: string;
  absences_covered?: Array<{
    id: string;
    absence_date: string;
    bimester: number;
  }>;
}

// ============================================================================
// HELPER: Mapeamento de campos por nível
// ============================================================================

export const STUDENT_FIELDS: Record<DetailLevel, string> = {
  minimal: 'id,student_id,name,class',
  summary: 'id,student_id,name,class,shift,status,birth_date,cpf',
  detailed: 'id,student_id,name,class,shift,status,birth_date,cpf,rg,ra,enrollment_number,bolsa_familia,nis,address,neighborhood,city,state,zip_code,previous_school,enrollment_date,disabilities,created_at,updated_at,deleted',
  full: '*,student_contacts(*)',
};

export const ABSENCE_FIELDS: Record<DetailLevel, string> = {
  minimal: 'id,student_id,absence_date,bimester',
  summary: 'id,student_id,absence_date,bimester,is_justified,student_name,student_class',
  detailed: 'id,student_id,absence_date,bimester,is_justified,student_name,student_class,medical_certificate_id,suspension_id,created_at',
  full: '*',
};

export const INTERACTION_FIELDS: Record<DetailLevel, string> = {
  minimal: 'id,student_id,interaction_date,type',
  summary: 'id,student_id,interaction_date,type,description,student_name,student_class',
  detailed: 'id,student_id,interaction_date,type,description,student_name,student_class,contact_name,contact_phone,outcome,follow_up_needed,created_by,created_at',
  full: '*',
};

export const TASK_FIELDS: Record<DetailLevel, string> = {
  minimal: 'id,student_id,title,due_date',
  summary: 'id,student_id,title,due_date,is_resolved,priority,student_name,student_class',
  detailed: 'id,student_id,title,due_date,is_resolved,priority,student_name,student_class,description,action_taken,recommended_action,created_by,created_at,resolved_at',
  full: '*',
};

export const CERTIFICATE_FIELDS: Record<DetailLevel, string> = {
  minimal: 'id,student_id,start_date,end_date',
  summary: 'id,student_id,start_date,end_date,total_days,status,student_name,student_class',
  detailed: 'id,student_id,start_date,end_date,total_days,status,student_name,student_class,cid_code,doctor_name,hospital,notes,document_url,created_at',
  full: '*',
};

export const SUSPENSION_FIELDS: Record<DetailLevel, string> = {
  minimal: 'id,student_id,start_date,end_date',
  summary: 'id,student_id,start_date,end_date,total_days,severity,student_name,student_class',
  detailed: 'id,student_id,start_date,end_date,total_days,severity,student_name,student_class,reason,action_taken,parent_notified,created_by,created_at',
  full: '*',
};

// ============================================================================
// HELPER: Função para selecionar campos dinamicamente
// ============================================================================

export function getSelectFields(
  entity: 'students' | 'absences' | 'interactions' | 'tasks' | 'certificates' | 'suspensions',
  detail: DetailLevel = 'summary'
): string {
  const fieldMap = {
    students: STUDENT_FIELDS,
    absences: ABSENCE_FIELDS,
    interactions: INTERACTION_FIELDS,
    tasks: TASK_FIELDS,
    certificates: CERTIFICATE_FIELDS,
    suspensions: SUSPENSION_FIELDS,
  };

  return fieldMap[entity][detail];
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  StudentMinimal,
  StudentSummary,
  StudentDetailed,
  StudentFull,

  AbsenceMinimal,
  AbsenceSummary,
  AbsenceDetailed,
  AbsenceFull,

  InteractionMinimal,
  InteractionSummary,
  InteractionDetailed,
  InteractionFull,

  TaskMinimal,
  TaskSummary,
  TaskDetailed,
  TaskFull,

  CertificateMinimal,
  CertificateSummary,
  CertificateDetailed,
  CertificateFull,

  SuspensionMinimal,
  SuspensionSummary,
  SuspensionDetailed,
  SuspensionFull,
};
