/**
 * Zod Schemas: Absence Control
 *
 * Validação de dados para controle de dias letivos por bimestre
 */

import { z } from 'zod'

/**
 * Schema para criação de absence control
 *
 * @example
 * {
 *   "academic_year": 2025,
 *   "bimester": 1,
 *   "school_days": 50,
 *   "start_date": "2025-02-01",
 *   "end_date": "2025-04-30",
 *   "notes": "Primeiro bimestre",
 *   "created_by": "user@email.com"
 * }
 */
export const createAbsenceControlSchema = z.object({
  academic_year: z.number().int().min(2020).max(2100, 'Ano acadêmico inválido'),
  bimester: z.number().int().min(1).max(4, 'Bimestre deve ser entre 1 e 4'),
  school_days: z.number().int().min(0).max(100, 'Dias letivos deve ser entre 0 e 100'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD').optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD').optional(),
  notes: z.string().max(500, 'Notas devem ter no máximo 500 caracteres').optional(),
  created_by: z.string().email('Email inválido').optional(),
})

/**
 * Schema para atualização de absence control
 *
 * @example
 * {
 *   "school_days": 52,
 *   "end_date": "2025-05-02",
 *   "notes": "Ajustado feriados",
 *   "updated_by": "user@email.com"
 * }
 */
export const updateAbsenceControlSchema = z.object({
  school_days: z.number().int().min(0).max(100).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
  updated_by: z.string().email().optional(),
})

/**
 * Schema para filtros de busca
 *
 * Query params:
 * - academic_year: Ano acadêmico (obrigatório)
 * - bimester: Bimestre específico (opcional, 1-4)
 * - limit: Número de resultados (default: 100)
 * - offset: Offset para paginação (default: 0)
 *
 * @example
 * GET /api/absence-control?academic_year=2025&bimester=1
 */
export const absenceControlFiltersSchema = z.object({
  academic_year: z.string().regex(/^\d{4}$/, 'Ano deve ter 4 dígitos'),
  bimester: z.string().regex(/^[1-4]$/, 'Bimestre deve ser entre 1 e 4').optional(),
  limit: z.string().regex(/^\d+$/).default('100'),
  offset: z.string().regex(/^\d+$/).default('0'),
})

/**
 * Tipos TypeScript derivados dos schemas
 */
export type CreateAbsenceControlInput = z.infer<typeof createAbsenceControlSchema>
export type UpdateAbsenceControlInput = z.infer<typeof updateAbsenceControlSchema>
export type AbsenceControlFilters = z.infer<typeof absenceControlFiltersSchema>