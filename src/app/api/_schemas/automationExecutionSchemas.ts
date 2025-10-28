/**
 * Zod Schemas: Automation Executions
 *
 * Validação para execuções de automação (logs/auditoria)
 */

import { z } from 'zod'

/**
 * Status possíveis de execução
 */
export const executionStatusEnum = z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'])

/**
 * Schema para criação de automation execution
 *
 * @example
 * {
 *   "total_students": 25,
 *   "students_data": { ... },
 *   "dry_run": false,
 *   "absence_multiple": 3,
 *   "notification_phone": "5511988384664"
 * }
 */
export const createAutomationExecutionSchema = z.object({
  total_students: z.number().int().min(0, 'Total de estudantes deve ser >= 0'),
  students_data: z.record(z.unknown()), // JSONB - dados dos estudantes
  dry_run: z.boolean().default(false),
  absence_multiple: z.number().int().min(1).max(50).optional(),
  notification_phone: z.string().regex(/^\d{11,13}$/, 'Telefone inválido (11-13 dígitos)').optional(),
})

/**
 * Schema para atualização de status
 *
 * @example
 * {
 *   "status": "RUNNING"
 * }
 */
export const updateExecutionStatusSchema = z.object({
  status: executionStatusEnum,
})

/**
 * Schema para atualização de checkpoint (progresso)
 *
 * @example
 * {
 *   "processed_students": 10,
 *   "current_student_index": 10,
 *   "processed_student_ids": ["uuid1", "uuid2", ...],
 *   "results": { "sent": 8, "failed": 2 }
 * }
 */
export const updateCheckpointSchema = z.object({
  processed_students: z.number().int().min(0),
  current_student_index: z.number().int().min(0),
  processed_student_ids: z.array(z.string()),
  results: z.record(z.unknown()), // JSONB - resultados parciais
})

/**
 * Schema para atualização de erro
 *
 * @example
 * {
 *   "error_message": "Erro ao processar estudante X"
 * }
 */
export const updateErrorSchema = z.object({
  error_message: z.string().min(1, 'Mensagem de erro não pode ser vazia').max(1000, 'Mensagem muito longa'),
})

/**
 * Schema para filtros de busca
 *
 * Query params:
 * - status: Filtrar por status (opcional)
 * - dry_run: Filtrar por dry_run (opcional, true/false)
 * - absence_multiple: Filtrar por múltiplo de faltas (opcional)
 * - limit: Número de resultados (default: 50)
 * - offset: Offset para paginação (default: 0)
 */
export const automationExecutionFiltersSchema = z.object({
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  dry_run: z.string().regex(/^(true|false)$/).optional(),
  absence_multiple: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).default('50'),
  offset: z.string().regex(/^\d+$/).default('0'),
})

/**
 * Tipos TypeScript derivados dos schemas
 */
export type ExecutionStatus = z.infer<typeof executionStatusEnum>
export type CreateAutomationExecutionInput = z.infer<typeof createAutomationExecutionSchema>
export type UpdateExecutionStatusInput = z.infer<typeof updateExecutionStatusSchema>
export type UpdateCheckpointInput = z.infer<typeof updateCheckpointSchema>
export type UpdateErrorInput = z.infer<typeof updateErrorSchema>
export type AutomationExecutionFilters = z.infer<typeof automationExecutionFiltersSchema>
