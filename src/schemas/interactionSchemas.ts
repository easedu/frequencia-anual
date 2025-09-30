/**
 * Interaction Validation Schemas with Zod
 *
 * Provides strong type-safe validation for family interaction operations
 */

import { z } from 'zod';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

/**
 * UUID v4 validation
 */
export const uuidSchema = z.string().uuid('ID deve ser um UUID válido');

/**
 * ISO 8601 date validation (YYYY-MM-DD)
 */
export const isoDateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Data deve estar no formato YYYY-MM-DD'
);

// ============================================================================
// INTERACTION SCHEMA
// ============================================================================

/**
 * Interaction type enum
 */
export const interactionTypeSchema = z.enum([
  'LIGACAO',
  'REUNIAO_PRESENCIAL',
  'REUNIAO_REMOTA',
  'MENSAGEM',
  'EMAIL',
  'VISITA_DOMICILIAR',
  'OUTROS'
], {
  errorMap: () => ({ message: 'Tipo de interação inválido' })
});

/**
 * Interaction outcome enum
 */
export const interactionOutcomeSchema = z.enum([
  'POSITIVO',
  'NEGATIVO',
  'NEUTRO',
  'AGUARDANDO_RETORNO'
], {
  errorMap: () => ({ message: 'Resultado da interação inválido' })
});

/**
 * Complete interaction schema with all validations
 */
export const interactionSchema = z.object({
  // Required fields
  interactionId: uuidSchema,

  studentId: uuidSchema,

  date: isoDateSchema,

  type: interactionTypeSchema,

  description: z.string()
    .min(10, 'Descrição deve ter no mínimo 10 caracteres')
    .max(2000, 'Descrição deve ter no máximo 2000 caracteres'),

  sensitive: z.boolean({
    errorMap: () => ({ message: 'Sensível deve ser um valor booleano' })
  }),

  // Optional fields
  outcome: interactionOutcomeSchema.optional(),

  contactName: z.string()
    .max(100, 'Nome do contato deve ter no máximo 100 caracteres')
    .optional(),

  followUpNeeded: z.boolean().optional(),

  followUpDate: isoDateSchema.optional(),

  attachments: z.array(z.object({
    fileUrl: z.string().url('URL inválida'),
    fileName: z.string().min(1, 'Nome do arquivo é obrigatório'),
    fileType: z.string().optional(),
    uploadedAt: z.string().optional(),
  })).optional(),

  tags: z.array(z.string()).optional(),

  // Audit fields (added by system)
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),

  // Soft delete fields (added by system)
  deleted: z.boolean().optional(),
  deletedAt: z.any().optional(),
  deletedBy: z.string().optional(),
  deleteReason: z.string().optional(),
});

/**
 * Schema for creating a new interaction (without system fields)
 */
export const createInteractionSchema = interactionSchema.omit({
  interactionId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  deleted: true,
  deletedAt: true,
  deletedBy: true,
  deleteReason: true,
});

/**
 * Schema for updating an interaction (all fields optional except interactionId)
 */
export const updateInteractionSchema = interactionSchema.partial().required({
  interactionId: true,
});

/**
 * Schema for interaction search filters
 */
export const interactionFilterSchema = z.object({
  studentId: uuidSchema.optional(),
  type: interactionTypeSchema.optional(),
  outcome: interactionOutcomeSchema.optional(),
  sensitive: z.boolean().optional(),
  followUpNeeded: z.boolean().optional(),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
  tags: z.array(z.string()).optional(),
  includeDeleted: z.boolean().default(false),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Interaction = z.infer<typeof interactionSchema>;
export type CreateInteraction = z.infer<typeof createInteractionSchema>;
export type UpdateInteraction = z.infer<typeof updateInteractionSchema>;
export type InteractionFilter = z.infer<typeof interactionFilterSchema>;
export type InteractionType = z.infer<typeof interactionTypeSchema>;
export type InteractionOutcome = z.infer<typeof interactionOutcomeSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate interaction data
 */
export function validateInteraction(data: unknown): Interaction {
  return interactionSchema.parse(data);
}

/**
 * Validate interaction creation data
 */
export function validateCreateInteraction(data: unknown): CreateInteraction {
  return createInteractionSchema.parse(data);
}

/**
 * Validate interaction update data
 */
export function validateUpdateInteraction(data: unknown): UpdateInteraction {
  return updateInteractionSchema.parse(data);
}

/**
 * Validate interaction filters
 */
export function validateInteractionFilters(data: unknown): InteractionFilter {
  return interactionFilterSchema.parse(data);
}

/**
 * Safe validation (returns result object instead of throwing)
 */
export function safeValidateInteraction(data: unknown) {
  return interactionSchema.safeParse(data);
}

/**
 * Safe validation for creation
 */
export function safeValidateCreateInteraction(data: unknown) {
  return createInteractionSchema.safeParse(data);
}

/**
 * Safe validation for update
 */
export function safeValidateUpdateInteraction(data: unknown) {
  return updateInteractionSchema.safeParse(data);
}