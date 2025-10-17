/**
 * Schemas Zod para Faltas de Estudantes
 *
 * Define validações para CRUD de faltas
 */

import { z } from 'zod';

// ============================================================================
// SCHEMA DE FALTA
// ============================================================================

/**
 * Schema para criar nova falta (POST)
 */
export const createAbsenceSchema = z.object({
  estudanteId: z.string().uuid('ID do estudante deve ser um UUID válido'),
  data: z
    .string()
    .regex(/^\d{8}$/, 'Data deve estar no formato DDMMYYYY (apenas números)'),
  bimestre: z.enum(['B1', 'B2', 'B3', 'B4'], {
    errorMap: () => ({ message: 'Bimestre deve ser B1, B2, B3 ou B4' }),
  }),
  justificada: z.boolean().default(false),
  motivoJustificativa: z.string().max(500).optional(),
  atestadoId: z.string().uuid().optional(),
  observacoes: z.string().max(1000).optional(),
});

/**
 * Schema para criar múltiplas faltas de uma vez (POST /bulk)
 */
export const createBulkAbsencesSchema = z.object({
  estudanteId: z.string().uuid('ID do estudante deve ser um UUID válido'),
  datas: z
    .array(
      z.string().regex(/^\d{8}$/, 'Cada data deve estar no formato DDMMYYYY')
    )
    .min(1, 'Deve haver pelo menos uma data')
    .max(50, 'Máximo de 50 faltas por requisição'),
  bimestre: z.enum(['B1', 'B2', 'B3', 'B4']),
  justificada: z.boolean().default(false),
  motivoJustificativa: z.string().max(500).optional(),
  atestadoId: z.string().uuid().optional(),
  observacoes: z.string().max(1000).optional(),
});

/**
 * Schema para atualizar falta (PUT/PATCH)
 */
export const updateAbsenceSchema = z.object({
  data: z.string().regex(/^\d{8}$/).optional(),
  bimestre: z.enum(['B1', 'B2', 'B3', 'B4']).optional(),
  justificada: z.boolean().optional(),
  motivoJustificativa: z.string().max(500).optional(),
  atestadoId: z.string().uuid().optional(),
  observacoes: z.string().max(1000).optional(),
});

/**
 * Schema para query params de listagem (GET)
 */
export const absenceQuerySchema = z.object({
  estudanteId: z.string().uuid().optional(),
  bimestre: z.enum(['B1', 'B2', 'B3', 'B4']).optional(),
  justificada: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  dataInicio: z.string().regex(/^\d{8}$/).optional(),
  dataFim: z.string().regex(/^\d{8}$/).optional(),
  turma: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().min(1).default(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .pipe(z.number().min(1).max(100).default(50)),
});

/**
 * Schema para parâmetro de ID (UUID)
 */
export const absenceIdSchema = z.object({
  id: z.string().uuid('ID da falta deve ser um UUID válido'),
});

// ============================================================================
// TIPOS TYPESCRIPT INFERIDOS
// ============================================================================

export type CreateAbsenceInput = z.infer<typeof createAbsenceSchema>;
export type CreateBulkAbsencesInput = z.infer<typeof createBulkAbsencesSchema>;
export type UpdateAbsenceInput = z.infer<typeof updateAbsenceSchema>;
export type AbsenceQueryParams = z.infer<typeof absenceQuerySchema>;
export type AbsenceIdParams = z.infer<typeof absenceIdSchema>;
