/**
 * Zod Schemas: Academic Years
 *
 * Validação para ano letivo, bimestres e dias letivos
 */

import { z } from 'zod'

/**
 * Schema para criar academic year
 *
 * @example
 * {
 *   "year": 2025,
 *   "start_date": "2025-02-01",
 *   "end_date": "2025-12-20",
 *   "total_school_days": 200
 * }
 */
export const createAcademicYearSchema = z.object({
  year: z.number().int().min(2020).max(2100, 'Ano inválido'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  total_school_days: z.number().int().min(0).max(250, 'Total de dias letivos inválido'),
})

/**
 * Schema para atualizar academic year
 */
export const updateAcademicYearSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  total_school_days: z.number().int().min(0).max(250).optional(),
})

/**
 * Schema para filtros de busca
 *
 * Query params:
 * - year: Ano específico (opcional)
 * - limit: Número de resultados (default: 100)
 * - offset: Offset para paginação (default: 0)
 */
export const academicYearFiltersSchema = z.object({
  year: z.string().regex(/^\d{4}$/).optional(),
  limit: z.string().regex(/^\d+$/).default('100'),
  offset: z.string().regex(/^\d+$/).default('0'),
})

/**
 * Schema para criar bimester
 */
export const createBimesterSchema = z.object({
  academic_year_id: z.string().uuid('ID do ano acadêmico inválido'),
  bimester_number: z.number().int().min(1).max(4, 'Bimestre deve ser entre 1 e 4'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  school_days_count: z.number().int().min(0).max(100),
})

/**
 * Schema para criar school day
 */
export const createSchoolDaySchema = z.object({
  bimester_id: z.string().uuid('ID do bimestre inválido'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_checked: z.boolean().default(true),
})

/**
 * Schema para countSchoolDaysInPeriod
 *
 * Query params:
 * - start_date: Data de início (YYYY-MM-DD ou DD/MM/YYYY)
 * - end_date: Data de fim (YYYY-MM-DD ou DD/MM/YYYY)
 * - year: Ano acadêmico (default: ano atual)
 */
export const countSchoolDaysSchema = z.object({
  start_date: z.string().min(8, 'Data de início inválida'),
  end_date: z.string().min(8, 'Data de fim inválida'),
  year: z.string().regex(/^\d{4}$/).optional(),
})

/**
 * Tipos TypeScript derivados dos schemas
 */
export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>
export type AcademicYearFilters = z.infer<typeof academicYearFiltersSchema>
export type CreateBimesterInput = z.infer<typeof createBimesterSchema>
export type CreateSchoolDayInput = z.infer<typeof createSchoolDaySchema>
export type CountSchoolDaysParams = z.infer<typeof countSchoolDaysSchema>
