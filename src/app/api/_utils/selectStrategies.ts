/**
 * SELECT Strategies para APIs
 *
 * Define queries SELECT otimizadas por nível de detalhamento
 * OTIMIZAÇÃO: Reduzir over-fetching de 4.2MB → 500KB
 */

import type { DetailLevel } from '@/types/api-responses';

// ============================================================================
// STUDENT SELECT STRATEGIES
// ============================================================================

/**
 * SELECT queries para Students API por nível de detalhamento
 *
 * - minimal: ~200 bytes por registro (listagens, dropdowns)
 * - summary: ~400 bytes (dashboards com agregações)
 * - detailed: ~800 bytes (página de detalhes)
 * - full: ~2KB (edição completa)
 */
export const STUDENT_SELECT_QUERIES: Record<DetailLevel, string> = {
  // ✅ MINIMAL: Apenas dados essenciais
  minimal: 'id, student_id, name, class, shift, status',

  // ✅ SUMMARY: + alguns campos extras e contagens
  summary: `
    id,
    student_id,
    name,
    class,
    shift,
    status,
    birth_date,
    bolsa_familia,
    student_contacts(count)
  `,

  // ✅ DETAILED: Todos os campos principais (sem relacionamentos)
  detailed: `
    id,
    student_id,
    name,
    class,
    shift,
    status,
    birth_date,
    bolsa_familia,
    registration_number,
    school_year,
    email,
    address,
    disabilities,
    created_at,
    updated_at
  `,

  // ✅ FULL: Tudo + relacionamentos completos
  full: `
    id,
    student_id,
    name,
    class,
    shift,
    status,
    birth_date,
    bolsa_familia,
    registration_number,
    school_year,
    email,
    address,
    disabilities,
    created_at,
    updated_at,
    student_contacts(
      id,
      name,
      relationship,
      phone,
      can_receive_whatsapp,
      whatsapp_data
    )
  `,
};

// ============================================================================
// ABSENCE SELECT STRATEGIES
// ============================================================================

export const ABSENCE_SELECT_QUERIES: Record<DetailLevel, string> = {
  minimal: 'id, student_id, absence_date, is_justified, bimester',

  summary: `
    id,
    student_id,
    absence_date,
    is_justified,
    bimester,
    students!inner(student_id, name, class)
  `,

  detailed: `
    id,
    student_id,
    absence_date,
    is_justified,
    bimester,
    medical_certificate_id,
    suspension_id,
    created_at,
    students!inner(student_id, name, class, shift)
  `,

  full: `
    *,
    students!inner(*),
    medical_certificates(*),
    student_suspensions(*)
  `,
};

// ============================================================================
// INTERACTION SELECT STRATEGIES
// ============================================================================

export const INTERACTION_SELECT_QUERIES: Record<DetailLevel, string> = {
  minimal: 'id, student_id, interaction_type, interaction_date, is_sensitive',

  summary: `
    id,
    student_id,
    interaction_type,
    interaction_date,
    is_sensitive,
    students!inner(student_id, name, class)
  `,

  detailed: `
    id,
    student_id,
    interaction_type,
    interaction_date,
    description,
    is_sensitive,
    created_by,
    created_at,
    students!inner(student_id, name, class, shift)
  `,

  full: '*',
};

// ============================================================================
// TASK SELECT STRATEGIES
// ============================================================================

export const TASK_SELECT_QUERIES: Record<DetailLevel, string> = {
  minimal: 'id, student_id, title, is_resolved, due_date',

  summary: `
    id,
    student_id,
    title,
    is_resolved,
    due_date,
    recommended_action,
    created_at,
    students!inner(student_id, name, class)
  `,

  detailed: `
    id,
    student_id,
    title,
    description,
    is_resolved,
    due_date,
    recommended_action,
    action_taken,
    created_by,
    assigned_to,
    created_at,
    resolved_at,
    students!inner(student_id, name, class, shift)
  `,

  full: '*, students!inner(*)',
};

// ============================================================================
// MEDICAL CERTIFICATE SELECT STRATEGIES
// ============================================================================

export const MEDICAL_CERTIFICATE_SELECT_QUERIES: Record<DetailLevel, string> = {
  minimal: 'id, student_id, start_date, end_date, status',

  summary: `
    id,
    student_id,
    start_date,
    end_date,
    days_covered,
    status,
    students!inner(student_id, name, class)
  `,

  detailed: `
    id,
    student_id,
    start_date,
    end_date,
    days_covered,
    status,
    cid_code,
    diagnosis,
    doctor_name,
    document_url,
    created_at,
    students!inner(student_id, name, class, shift)
  `,

  full: '*, students!inner(*)',
};

// ============================================================================
// SUSPENSION SELECT STRATEGIES
// ============================================================================

export const SUSPENSION_SELECT_QUERIES: Record<DetailLevel, string> = {
  minimal: 'id, student_id, start_date, end_date, severity',

  summary: `
    id,
    student_id,
    start_date,
    end_date,
    severity,
    reason,
    students!inner(student_id, name, class)
  `,

  detailed: `
    id,
    student_id,
    start_date,
    end_date,
    severity,
    reason,
    description,
    decision_by,
    follow_up_notes,
    created_at,
    students!inner(student_id, name, class, shift)
  `,

  full: '*, students!inner(*)',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Retorna a query SELECT apropriada baseada no DetailLevel
 */
export function getSelectQuery(
  entity: 'students' | 'absences' | 'interactions' | 'tasks' | 'certificates' | 'suspensions',
  detailLevel: DetailLevel = 'minimal'
): string {
  const strategies: Record<typeof entity, Record<DetailLevel, string>> = {
    students: STUDENT_SELECT_QUERIES,
    absences: ABSENCE_SELECT_QUERIES,
    interactions: INTERACTION_SELECT_QUERIES,
    tasks: TASK_SELECT_QUERIES,
    certificates: MEDICAL_CERTIFICATE_SELECT_QUERIES,
    suspensions: SUSPENSION_SELECT_QUERIES,
  };

  return strategies[entity][detailLevel];
}
