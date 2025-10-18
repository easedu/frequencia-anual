/**
 * Schemas Zod para Interações Familiares
 *
 * Define validações para CRUD de interações com famílias
 */

import { z } from 'zod';

// ============================================================================
// SCHEMA DE INTERAÇÃO
// ============================================================================

/**
 * Schema para criar nova interação (POST)
 */
export const createInteractionSchema = z.object({
  estudanteId: z.string().uuid('ID do estudante deve ser um UUID válido'),
  data: z
    .string()
    .regex(/^\d{8}$/, 'Data deve estar no formato DDMMYYYY'),
  tipo: z.enum(
    [
      'TELEFONEMA',
      'REUNIÃO',
      'VISITA_DOMICILIAR',
      'MENSAGEM',
      'EMAIL',
      'WHATSAPP',
      'OUTRO',
      // Tipos adicionais do frontend
      'Contato telefônico',
      'Contato digital',
      'Conversa com a família',
      'Visita domiciliar da ABAE',
      'Compensação de ausência',
      'Carta registrada',
      'Conselho tutelar',
      'Desligamento',
      'Justificativa da família',
      'Necessário acompanhamento da família',
      'Observações',
    ],
    {
      errorMap: () => ({ message: 'Tipo de interação inválido' }),
    }
  ),
  responsavel: z.string().min(1, 'Nome do responsável é obrigatório').max(100),
  assunto: z.string().min(1, 'Assunto é obrigatório').max(200),
  descricao: z.string().min(1, 'Descrição é obrigatória').max(2000),
  criadoPor: z.string().min(1, 'Nome do criador é obrigatório').max(100),
  observacoes: z.string().max(1000).optional(),
  proximaAcao: z.string().max(500).optional(),
  dataProximaAcao: z.string().regex(/^\d{8}$/).optional(),
  // Campos WhatsApp (opcionais)
  whatsapp_message: z.string().optional(),
  whatsapp_phones: z.array(z.string()).optional(),
  whatsapp_message_id: z.string().optional(),
  whatsapp_status: z.string().optional(),
  whatsapp_sent_at: z.string().optional(),
});

/**
 * Schema para atualizar interação (PUT/PATCH)
 */
export const updateInteractionSchema = z.object({
  data: z.string().regex(/^\d{8}$/).optional(),
  tipo: z
    .enum([
      'TELEFONEMA',
      'REUNIÃO',
      'VISITA_DOMICILIAR',
      'MENSAGEM',
      'EMAIL',
      'WHATSAPP',
      'OUTRO',
      // Tipos adicionais do frontend
      'Contato telefônico',
      'Contato digital',
      'Conversa com a família',
      'Visita domiciliar da ABAE',
      'Compensação de ausência',
      'Carta registrada',
      'Conselho tutelar',
      'Desligamento',
      'Justificativa da família',
      'Necessário acompanhamento da família',
      'Observações',
    ])
    .optional(),
  responsavel: z.string().min(1).max(100).optional(),
  assunto: z.string().min(1).max(200).optional(),
  descricao: z.string().min(1).max(2000).optional(),
  observacoes: z.string().max(1000).optional(),
  proximaAcao: z.string().max(500).optional(),
  dataProximaAcao: z.string().regex(/^\d{8}$/).optional(),
});

/**
 * Schema para query params de listagem (GET)
 */
export const interactionQuerySchema = z.object({
  estudanteId: z.string().uuid().optional(),
  tipo: z
    .enum([
      'TELEFONEMA',
      'REUNIÃO',
      'VISITA_DOMICILIAR',
      'MENSAGEM',
      'EMAIL',
      'WHATSAPP',
      'OUTRO',
      // Tipos adicionais do frontend
      'Contato telefônico',
      'Contato digital',
      'Conversa com a família',
      'Visita domiciliar da ABAE',
      'Compensação de ausência',
      'Carta registrada',
      'Conselho tutelar',
      'Desligamento',
      'Justificativa da família',
      'Necessário acompanhamento da família',
      'Observações',
    ])
    .optional(),
  dataInicio: z.string().regex(/^\d{8}$/).optional(),
  dataFim: z.string().regex(/^\d{8}$/).optional(),
  responsavel: z.string().optional(),
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
export const interactionIdSchema = z.object({
  id: z.string().uuid('ID da interação deve ser um UUID válido'),
});

// ============================================================================
// TIPOS TYPESCRIPT INFERIDOS
// ============================================================================

export type CreateInteractionInput = z.infer<typeof createInteractionSchema>;
export type UpdateInteractionInput = z.infer<typeof updateInteractionSchema>;
export type InteractionQueryParams = z.infer<typeof interactionQuerySchema>;
export type InteractionIdParams = z.infer<typeof interactionIdSchema>;
