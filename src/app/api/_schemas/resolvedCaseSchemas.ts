/**
 * Zod Schemas: Resolved Cases
 *
 * Validação para casos resolvidos de faltas consecutivas
 */

import { z } from 'zod'

/**
 * Schema para criação de resolved case
 *
 * @example
 * {
 *   "student_id": "550e8400-e29b-41d4-a716-446655440000",
 *   "interaction_id": "660e8400-e29b-41d4-a716-446655440000",
 *   "resolved_at": "2025-10-17T14:30:00Z",
 *   "resolved_by": "Prof. João Silva",
 *   "notes": "Caso resolvido após reunião com família"
 * }
 */
export const createResolvedCaseSchema = z.object({
  student_id: z.string().uuid('ID do estudante inválido'),
  interaction_id: z.string().uuid('ID da interação inválido').optional(),
  resolved_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'Data deve estar no formato ISO 8601'),
  resolved_by: z.string().min(1, 'Campo "resolved_by" é obrigatório').max(200),
  notes: z.string().max(1000, 'Notas devem ter no máximo 1000 caracteres').optional(),
})

/**
 * Schema para atualização de resolved case
 */
export const updateResolvedCaseSchema = z.object({
  interaction_id: z.string().uuid().optional(),
  resolved_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/).optional(),
  resolved_by: z.string().min(1).max(200).optional(),
  notes: z.string().max(1000).optional(),
})

/**
 * Schema para filtros de busca
 *
 * Query params:
 * - student_id: UUID do estudante (opcional)
 * - resolved_by: Nome de quem resolveu (opcional)
 * - start_date: Data início de resolução (opcional, YYYY-MM-DD)
 * - end_date: Data fim de resolução (opcional, YYYY-MM-DD)
 * - limit: Número de resultados (default: 100)
 * - offset: Offset para paginação (default: 0)
 */
export const resolvedCaseFiltersSchema = z.object({
  student_id: z.string().uuid().optional(),
  resolved_by: z.string().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.string().regex(/^\d+$/).default('100'),
  offset: z.string().regex(/^\d+$/).default('0'),
})

/**
 * Tipos TypeScript derivados dos schemas
 */
export type CreateResolvedCaseInput = z.infer<typeof createResolvedCaseSchema>
export type UpdateResolvedCaseInput = z.infer<typeof updateResolvedCaseSchema>
export type ResolvedCaseFilters = z.infer<typeof resolvedCaseFiltersSchema>
