/**
 * Schemas Zod para Atestados Médicos
 *
 * Define validações para CRUD de atestados
 */

import { z } from 'zod';

// ============================================================================
// SCHEMA DE ATESTADO MÉDICO
// ============================================================================

/**
 * Schema para criar novo atestado (POST)
 */
export const createMedicalCertificateSchema = z.object({
  estudanteId: z.string().uuid('ID do estudante deve ser um UUID válido'),
  dataInicio: z
    .string()
    .regex(/^\d{8}$/, 'Data de início deve estar no formato DDMMYYYY'),
  dataFim: z
    .string()
    .regex(/^\d{8}$/, 'Data de fim deve estar no formato DDMMYYYY'),
  motivo: z.string().max(500).optional(),
  observacoes: z.string().max(1000).optional(),
  arquivoUrl: z.string().url('URL do arquivo inválida').optional(),
});

/**
 * Schema para atualizar atestado (PUT/PATCH)
 */
export const updateMedicalCertificateSchema = z.object({
  dataInicio: z.string().regex(/^\d{8}$/).optional(),
  dataFim: z.string().regex(/^\d{8}$/).optional(),
  motivo: z.string().max(500).optional(),
  observacoes: z.string().max(1000).optional(),
  arquivoUrl: z.string().url().optional(),
});

/**
 * Schema para query params de listagem (GET)
 */
export const medicalCertificateQuerySchema = z.object({
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
export const medicalCertificateIdSchema = z.object({
  id: z.string().uuid('ID do atestado deve ser um UUID válido'),
});

// ============================================================================
// TIPOS TYPESCRIPT INFERIDOS
// ============================================================================

export type CreateMedicalCertificateInput = z.infer<typeof createMedicalCertificateSchema>;
export type UpdateMedicalCertificateInput = z.infer<typeof updateMedicalCertificateSchema>;
export type MedicalCertificateQueryParams = z.infer<typeof medicalCertificateQuerySchema>;
export type MedicalCertificateIdParams = z.infer<typeof medicalCertificateIdSchema>;
