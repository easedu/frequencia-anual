/**
 * API Route: /api/messages/history
 *
 * GET - Lista histórico de mensagens WhatsApp
 * POST - Registra envio de mensagem
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { errorResponse, successResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import { logger } from '@/utils/logger'
import { z } from 'zod'

// ============================================================================
// SCHEMAS
// ============================================================================

const messageHistoryFiltersSchema = z.object({
  estudante_id: z.string().uuid().optional(),
  contato_telefone: z.string().optional(),
  ano_referencia: z.string().regex(/^\d{4}$/).optional(),
  mes_referencia: z.string().regex(/^(1[0-2]|[1-9])$/).optional(),
  quantidade_faltas: z.string().regex(/^\d+$/).optional(),
  status: z.enum(['SUCCESS', 'FAILED', 'NO_CONTACT']).optional(),
  is_dry_run: z.enum(['true', 'false']).optional(),
  limit: z.string().regex(/^\d+$/).optional().default('100'),
  offset: z.string().regex(/^\d+$/).optional().default('0'),
})

const createMessageHistorySchema = z.object({
  estudante_id: z.string().uuid('ID do estudante deve ser UUID válido'),
  contato_telefone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  ano_referencia: z.number().int().min(2020).max(2100),
  mes_referencia: z.number().int().min(1).max(12),
  quantidade_faltas: z.number().int().min(0),
  estudante_nome: z.string().min(1),
  contato_nome: z.string().min(1),
  task_id: z.string().uuid().nullable().optional(),
  status: z.enum(['SUCCESS', 'FAILED', 'NO_CONTACT']),
  message_id: z.string().nullable().optional(),
  sent_at: z.number().nullable().optional(), // Unix timestamp
  retry_count: z.number().int().min(0).optional().default(0),
  is_dry_run: z.boolean().optional().default(false),
})

/**
 * GET /api/messages/history
 * Lista histórico de mensagens com filtros opcionais
 *
 * Query params:
 * - estudante_id: UUID do estudante
 * - contato_telefone: Telefone do contato
 * - ano_referencia: Ano (YYYY)
 * - mes_referencia: Mês (1-12)
 * - quantidade_faltas: Quantidade de faltas
 * - status: SUCCESS | FAILED | NO_CONTACT
 * - is_dry_run: 'true' | 'false'
 * - limit: Número de resultados (default: 100)
 * - offset: Offset para paginação (default: 0)
 *
 * @example
 * GET /api/messages/history?estudante_id=550e8400-e29b-41d4-a716-446655440000&ano_referencia=2025&mes_referencia=10
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Validar filtros
    const filters = messageHistoryFiltersSchema.parse({
      estudante_id: searchParams.get('estudante_id') || undefined,
      contato_telefone: searchParams.get('contato_telefone') || undefined,
      ano_referencia: searchParams.get('ano_referencia') || undefined,
      mes_referencia: searchParams.get('mes_referencia') || undefined,
      quantidade_faltas: searchParams.get('quantidade_faltas') || undefined,
      status: searchParams.get('status') || undefined,
      is_dry_run: searchParams.get('is_dry_run') || undefined,
      limit: searchParams.get('limit') || '100',
      offset: searchParams.get('offset') || '0',
    })

    const limit = parseInt(filters.limit)
    const offset = parseInt(filters.offset)

    // Construir query
    let query = supabaseAdmin
      .from('whatsapp_message_history')
      .select('*', { count: 'exact' })

    // Aplicar filtros
    if (filters.estudante_id) {
      query = query.eq('student_id', filters.estudante_id)
    }

    if (filters.contato_telefone) {
      query = query.eq('contact_phone', filters.contato_telefone)
    }

    if (filters.ano_referencia) {
      query = query.eq('reference_year', parseInt(filters.ano_referencia))
    }

    if (filters.mes_referencia) {
      query = query.eq('reference_month', parseInt(filters.mes_referencia))
    }

    if (filters.quantidade_faltas) {
      query = query.eq('absence_count', parseInt(filters.quantidade_faltas))
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.is_dry_run) {
      query = query.eq('dry_run', filters.is_dry_run === 'true')
    }

    // Aplicar paginação e ordenação
    query = query
      .range(offset, offset + limit - 1)
      .order('sent_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      logger.error('Erro ao buscar histórico de mensagens', error)
      return errorResponse(error.message, 500)
    }

    return successResponse({
      data: data || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * POST /api/messages/history
 * Registra envio de mensagem no histórico
 *
 * Body:
 * {
 *   "estudante_id": "uuid",
 *   "contato_telefone": "5511988384664",
 *   "ano_referencia": 2025,
 *   "mes_referencia": 10,
 *   "quantidade_faltas": 15,
 *   "estudante_nome": "João Silva",
 *   "contato_nome": "Maria Silva (Mãe)",
 *   "task_id": "uuid" (opcional),
 *   "status": "SUCCESS" | "FAILED" | "NO_CONTACT",
 *   "message_id": "string" (opcional),
 *   "sent_at": 1729180800000 (opcional - Unix timestamp),
 *   "retry_count": 0 (opcional),
 *   "is_dry_run": false (opcional)
 * }
 *
 * @example
 * POST /api/messages/history
 * {
 *   "estudante_id": "550e8400-e29b-41d4-a716-446655440000",
 *   "contato_telefone": "5511988384664",
 *   "ano_referencia": 2025,
 *   "mes_referencia": 10,
 *   "quantidade_faltas": 15,
 *   "estudante_nome": "João Silva",
 *   "contato_nome": "Maria Silva (Mãe)",
 *   "status": "SUCCESS",
 *   "message_id": "msg_123456"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar dados
    const validated = createMessageHistorySchema.parse(body)

    // Verificar se já existe registro com mesma combinação (unicidade)
    const { data: existing, error: searchError } = await supabaseAdmin
      .from('whatsapp_message_history')
      .select('id')
      .eq('student_id', validated.estudante_id)
      .eq('contact_phone', validated.contato_telefone)
      .eq('reference_year', validated.ano_referencia)
      .eq('reference_month', validated.mes_referencia)
      .eq('absence_count', validated.quantidade_faltas)
      .maybeSingle()

    if (searchError) {
      logger.error('Erro ao verificar histórico existente', searchError)
      return errorResponse(searchError.message, 500)
    }

    if (existing) {
      logger.warn('Mensagem já registrada no histórico (duplicata)', {
        estudanteId: validated.estudante_id,
        contatoTelefone: validated.contato_telefone,
        anoReferencia: validated.ano_referencia,
        mesReferencia: validated.mes_referencia,
        quantidadeFaltas: validated.quantidade_faltas,
      })
      return errorResponse('Mensagem já foi registrada para esta combinação', 409)
    }

    // ✅ Criar registro no Supabase com nomes corretos das colunas
    const { data, error } = await supabaseAdmin
      .from('whatsapp_message_history')
      .insert({
        student_id: validated.estudante_id,
        contact_name: validated.contato_nome,
        contact_phone: validated.contato_telefone,
        absence_count: validated.quantidade_faltas,
        reference_year: validated.ano_referencia,
        reference_month: validated.mes_referencia,
        message_id: validated.message_id || null,
        status: validated.status,
        sent_at: validated.sent_at ? new Date(validated.sent_at).toISOString() : null,
        dry_run: validated.is_dry_run || false,
      } as any)
      .select()
      .single()

    if (error) {
      logger.error('Erro ao registrar histórico de mensagem', error)
      return errorResponse(error.message, 500)
    }

    logger.info('Histórico de mensagem registrado', {
      id: (data as any)?.id,
      estudanteId: validated.estudante_id,
      status: validated.status
    })

    return successResponse(data as any, 201)
  } catch (error) {
    return handleError(error)
  }
}
