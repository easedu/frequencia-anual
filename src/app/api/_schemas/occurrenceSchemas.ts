/**
 * Schemas Zod para Occurrences (Ocorrências)
 *
 * Define validações para CRUD de ocorrências estudantis
 */

import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Schema para criação de Occurrence
 */
export const createOccurrenceSchema = z.object({
  student_id: z.string().uuid('ID do estudante deve ser UUID válido'),
  occurrence_type: z.enum([
    'COMPORTAMENTO',
    'INDISCIPLINA',
    'AGRESSAO',
    'FALTA_MATERIAL',
    'NAO_FEZ_TAREFA',
    'OUTROS'
  ]),
  occurrence_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  description: z.string().min(1, 'Descrição é obrigatória').max(2000, 'Descrição muito longa'),
  severity: z.enum(['LEVE', 'MODERADA', 'GRAVE']).optional().default('LEVE'),
  action_taken: z.string().max(1000, 'Ação tomada muito longa').nullable().optional(),
  family_notified: z.boolean().optional().default(false),
  notification_method: z.enum([
    'TELEFONE',
    'WHATSAPP',
    'PRESENCIAL',
    'BILHETE',
    'EMAIL',
    'NAO_NOTIFICADO'
  ]).nullable().optional(),
  reported_by: z.string().max(100, 'Nome do responsável muito longo'),
  follow_up_notes: z.string().max(1000, 'Notas de acompanhamento muito longas').nullable().optional(),
});

/**
 * Schema para atualização de Occurrence
 */
export const updateOccurrenceSchema = z.object({
  occurrence_type: z.enum([
    'COMPORTAMENTO',
    'INDISCIPLINA',
    'AGRESSAO',
    'FALTA_MATERIAL',
    'NAO_FEZ_TAREFA',
    'OUTROS'
  ]).optional(),
  occurrence_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().min(1).max(2000).optional(),
  severity: z.enum(['LEVE', 'MODERADA', 'GRAVE']).optional(),
  action_taken: z.string().max(1000).nullable().optional(),
  family_notified: z.boolean().optional(),
  notification_method: z.enum([
    'TELEFONE',
    'WHATSAPP',
    'PRESENCIAL',
    'BILHETE',
    'EMAIL',
    'NAO_NOTIFICADO'
  ]).nullable().optional(),
  follow_up_notes: z.string().max(1000).nullable().optional(),
});

/**
 * Schema para filtros de Occurrences
 */
export const occurrenceFiltersSchema = z.object({
  student_id: z.string().uuid().optional(),
  occurrence_type: z.enum([
    'COMPORTAMENTO',
    'INDISCIPLINA',
    'AGRESSAO',
    'FALTA_MATERIAL',
    'NAO_FEZ_TAREFA',
    'OUTROS'
  ]).optional(),
  severity: z.enum(['LEVE', 'MODERADA', 'GRAVE']).optional(),
  family_notified: z.enum(['true', 'false']).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.string().regex(/^\d+$/).optional().default('100'),
  offset: z.string().regex(/^\d+$/).optional().default('0'),
});

// ============================================================================
// TYPES
// ============================================================================

export type CreateOccurrenceInput = z.infer<typeof createOccurrenceSchema>;
export type UpdateOccurrenceInput = z.infer<typeof updateOccurrenceSchema>;
export type OccurrenceFilters = z.infer<typeof occurrenceFiltersSchema>;
