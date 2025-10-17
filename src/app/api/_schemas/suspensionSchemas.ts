/**
 * Schemas Zod para Suspensões de Estudantes
 *
 * Define validações para CRUD de suspensões
 */

import { z } from 'zod';

// ============================================================================
// SCHEMA DE SUSPENSÃO
// ============================================================================

/**
 * Schema para criar nova suspensão (POST)
 */
export const createSuspensionSchema = z.object({
  estudanteId: z.string().uuid('ID do estudante deve ser um UUID válido'),
  dataInicio: z
    .string()
    .regex(/^\d{8}$/, 'Data de início deve estar no formato DDMMYYYY'),
  dataFim: z
    .string()
    .regex(/^\d{8}$/, 'Data de fim deve estar no formato DDMMYYYY'),
  motivo: z.string().min(1, 'Motivo é obrigatório').max(1000),
  observacoes: z.string().max(2000).optional(),
});

/**
 * Schema para atualizar suspensão (PUT/PATCH)
 */
export const updateSuspensionSchema = z.object({
  dataInicio: z.string().regex(/^\d{8}$/).optional(),
  dataFim: z.string().regex(/^\d{8}$/).optional(),
  motivo: z.string().min(1).max(1000).optional(),
  observacoes: z.string().max(2000).optional(),
});

/**
 * Schema para query params de listagem (GET)
 */
export const suspensionQuerySchema = z.object({
  estudanteId: z.string().uuid().optional(),
  dataInicio: z.string().regex(/^\d{8}$/).optional(),
  dataFim: z.string().regex(/^\d{8}$/).optional(),
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
export const suspensionIdSchema = z.object({
  id: z.string().uuid('ID da suspensão deve ser um UUID válido'),
});

// ============================================================================
// TIPOS TYPESCRIPT INFERIDOS
// ============================================================================

export type CreateSuspensionInput = z.infer<typeof createSuspensionSchema>;
export type UpdateSuspensionInput = z.infer<typeof updateSuspensionSchema>;
export type SuspensionQueryParams = z.infer<typeof suspensionQuerySchema>;
export type SuspensionIdParams = z.infer<typeof suspensionIdSchema>;
