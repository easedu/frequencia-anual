/**
 * Absence Validation Schemas with Zod
 *
 * Provides strong type-safe validation for all absence operations
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
// ABSENCE SCHEMA
// ============================================================================

/**
 * Complete absence schema with all validations
 */
export const absenceSchema = z.object({
  // Required fields
  estudanteId: uuidSchema,

  data: isoDateSchema,

  turma: z.string()
    .min(2, 'Turma deve ter no mínimo 2 caracteres')
    .max(5, 'Turma deve ter no máximo 5 caracteres')
    .transform(val => val.toUpperCase()),

  justified: z.boolean({
    errorMap: () => ({ message: 'Justificado deve ser um valor booleano' })
  }),

  // Optional fields
  reason: z.string().optional(),

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
 * Schema for creating a new absence (without system fields)
 */
export const createAbsenceSchema = absenceSchema.omit({
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
 * Schema for updating an absence (all fields optional except estudanteId and data)
 */
export const updateAbsenceSchema = absenceSchema.partial().required({
  estudanteId: true,
  data: true,
});

/**
 * Schema for absence search filters
 */
export const absenceFilterSchema = z.object({
  estudanteId: uuidSchema.optional(),
  turma: z.string().optional(),
  justified: z.boolean().optional(),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
  includeDeleted: z.boolean().default(false),
});

// ============================================================================
// MEDICAL CERTIFICATE SCHEMA
// ============================================================================

/**
 * Medical certificate (atestado) schema
 */
export const certificateSchema = z.object({
  // Required fields
  estudanteId: uuidSchema,

  startDate: isoDateSchema,

  days: z.number()
    .int('Dias deve ser um número inteiro')
    .positive('Dias deve ser positivo')
    .min(1, 'Deve ter no mínimo 1 dia')
    .max(365, 'Dias não pode exceder 365'),

  description: z.string()
    .min(1, 'Descrição é obrigatória')
    .max(500, 'Descrição deve ter no máximo 500 caracteres'),

  // Optional fields
  endDate: isoDateSchema.optional(),
  fileUrl: z.string().url('URL inválida').optional(),

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
 * Schema for creating a new certificate (without system fields)
 */
export const createCertificateSchema = certificateSchema.omit({
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
 * Schema for updating a certificate
 */
export const updateCertificateSchema = certificateSchema.partial().required({
  estudanteId: true,
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Absence = z.infer<typeof absenceSchema>;
export type CreateAbsence = z.infer<typeof createAbsenceSchema>;
export type UpdateAbsence = z.infer<typeof updateAbsenceSchema>;
export type AbsenceFilter = z.infer<typeof absenceFilterSchema>;

export type Certificate = z.infer<typeof certificateSchema>;
export type CreateCertificate = z.infer<typeof createCertificateSchema>;
export type UpdateCertificate = z.infer<typeof updateCertificateSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate absence data
 */
export function validateAbsence(data: unknown): Absence {
  return absenceSchema.parse(data);
}

/**
 * Validate absence creation data
 */
export function validateCreateAbsence(data: unknown): CreateAbsence {
  return createAbsenceSchema.parse(data);
}

/**
 * Validate absence update data
 */
export function validateUpdateAbsence(data: unknown): UpdateAbsence {
  return updateAbsenceSchema.parse(data);
}

/**
 * Validate absence filters
 */
export function validateAbsenceFilters(data: unknown): AbsenceFilter {
  return absenceFilterSchema.parse(data);
}

/**
 * Validate certificate data
 */
export function validateCertificate(data: unknown): Certificate {
  return certificateSchema.parse(data);
}

/**
 * Validate certificate creation data
 */
export function validateCreateCertificate(data: unknown): CreateCertificate {
  return createCertificateSchema.parse(data);
}

/**
 * Validate certificate update data
 */
export function validateUpdateCertificate(data: unknown): UpdateCertificate {
  return updateCertificateSchema.parse(data);
}

/**
 * Safe validation (returns result object instead of throwing)
 */
export function safeValidateAbsence(data: unknown) {
  return absenceSchema.safeParse(data);
}

/**
 * Safe validation for creation
 */
export function safeValidateCreateAbsence(data: unknown) {
  return createAbsenceSchema.safeParse(data);
}

/**
 * Safe validation for update
 */
export function safeValidateUpdateAbsence(data: unknown) {
  return updateAbsenceSchema.safeParse(data);
}

/**
 * Safe validation for certificate
 */
export function safeValidateCertificate(data: unknown) {
  return certificateSchema.safeParse(data);
}