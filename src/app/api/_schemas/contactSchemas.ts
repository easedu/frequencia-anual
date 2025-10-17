/**
 * Schemas Zod para Contatos de Estudantes
 *
 * Define validações para CRUD de contatos
 */

import { z } from 'zod';

// ============================================================================
// SCHEMA DE CONTATO
// ============================================================================

/**
 * Schema para criar novo contato (POST)
 */
export const createContactSchema = z.object({
  estudanteId: z.string().uuid('ID do estudante deve ser um UUID válido'),
  nome: z
    .string()
    .min(1, 'Nome do contato é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  telefone: z
    .string()
    .regex(
      /^\d{10,11}$/,
      'Telefone deve ter 10 ou 11 dígitos (apenas números, sem formatação)'
    ),
  parentesco: z.string().max(50).optional(),
  podeReceberMensagem: z.boolean().default(true),
  whatsappData: z
    .object({
      verified: z.boolean(),
      exists: z.boolean(),
      verifiedAt: z.string().nullable(),
      name: z.string().nullable(),
      number: z.string().nullable(),
    })
    .optional(),
});

/**
 * Schema para atualizar contato (PUT/PATCH)
 */
export const updateContactSchema = z.object({
  nome: z.string().min(1).max(100).optional(),
  telefone: z.string().regex(/^\d{10,11}$/).optional(),
  parentesco: z.string().max(50).optional(),
  podeReceberMensagem: z.boolean().optional(),
  whatsappData: z
    .object({
      verified: z.boolean(),
      exists: z.boolean(),
      verifiedAt: z.string().nullable(),
      name: z.string().nullable(),
      number: z.string().nullable(),
    })
    .optional(),
});

/**
 * Schema para query params de listagem (GET)
 */
export const contactQuerySchema = z.object({
  estudanteId: z.string().uuid('ID do estudante deve ser um UUID válido').optional(),
  podeReceberMensagem: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  whatsappVerified: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
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
export const contactIdSchema = z.object({
  id: z.string().uuid('ID do contato deve ser um UUID válido'),
});

// ============================================================================
// TIPOS TYPESCRIPT INFERIDOS
// ============================================================================

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ContactQueryParams = z.infer<typeof contactQuerySchema>;
export type ContactIdParams = z.infer<typeof contactIdSchema>;
