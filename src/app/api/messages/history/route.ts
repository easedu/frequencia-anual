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
import { getCountStrategy } from '@/app/api/_utils/countStrategy'

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
  // estudante_nome opcional (não armazenado no DB)
  estudante_nome: z.string().min(1).optional(),
  // contato_nome obrigatório (armazenado no DB)
  contato_nome: z.string().min(1),
  // task_id opcional mas NÃO armazenado (campo não existe no DB)
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

    // ✅ FASE 4.1: Otimizar count
    const page = Math.floor(offset / limit) + 1
    const countOption = getCountStrategy(page)

    // Construir query
    let query = supabaseAdmin
      .from('whatsapp_message_history')
      .select('*', countOption)

    // Aplicar filtros (usando nomes das colunas Supabase em inglês)
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
 *   "contato_nome": "Maria Silva (Mãe)", (OBRIGATÓRIO)
 *   "ano_referencia": 2025,
 *   "mes_referencia": 10,
 *   "quantidade_faltas": 15,
 *   "estudante_nome": "João Silva" (opcional - não armazenado),
 *   "task_id": "uuid" (opcional - não armazenado),
 *   "status": "SUCCESS" | "FAILED" | "NO_CONTACT",
 *   "message_id": "string" (opcional),
 *   "sent_at": 1729180800000 (opcional - Unix timestamp),
 *   "retry_count": 0 (opcional - não usado),
 *   "is_dry_run": false (opcional)
 * }
 *
 * @example
 * POST /api/messages/history
 * {
 *   "estudante_id": "550e8400-e29b-41d4-a716-446655440000",
 *   "contato_telefone": "5511988384664",
 *   "contato_nome": "Maria Silva (Mãe)",
 *   "ano_referencia": 2025,
 *   "mes_referencia": 10,
 *   "quantidade_faltas": 15,
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

    // ✅ Criar registro no Supabase (schema real da tabela)
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

/**
 * DELETE /api/messages/history
 * Limpa histórico de mensagens WhatsApp da automação
 *
 * @description Útil para testes - permite que a automação reenvie mensagens
 * @warning Estratégia dupla:
 *   1. Se existem tasks da automação → deleta apenas mensagens vinculadas
 *   2. Se NÃO existem tasks → deleta TODAS as mensagens (não há como diferenciar origem)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Autenticação obrigatória
    const authHeader = request.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Não autorizado', 401)
    }

    // PASSO 1: Buscar IDs de todas as tasks criadas pela automação
    const { data: automationTasks, error: tasksError } = await supabaseAdmin
      .from('user_tasks')
      .select('id')
      .eq('created_by', 'AUTOMAÇÃO')

    if (tasksError) {
      logger.error('Erro ao buscar tasks da automação', tasksError)
      return errorResponse(tasksError.message, 500)
    }

    const taskIds = (automationTasks || []).map((task: any) => task.id)

    let deletedCount = 0
    let strategy = ''

    // ESTRATÉGIA 1: Se há tasks da automação, deletar apenas mensagens vinculadas
    if (taskIds.length > 0) {
      strategy = 'SELECTIVE'
      const { error: deleteError, count } = await supabaseAdmin
        .from('whatsapp_message_history')
        .delete()
        .in('task_id', taskIds)

      if (deleteError) {
        logger.error('Erro ao limpar histórico de mensagens da automação', deleteError)
        return errorResponse(deleteError.message, 500)
      }

      deletedCount = count || 0

      logger.info('Histórico de mensagens da automação limpo (SELECTIVE)', {
        deletedCount,
        taskIdsCount: taskIds.length
      })

      return successResponse({
        deletedCount,
        taskIdsFound: taskIds.length,
        strategy: 'SELECTIVE',
        message: `Histórico da automação limpo (seletivo): ${deletedCount} mensagens vinculadas a ${taskIds.length} tasks`
      })
    }

    // ESTRATÉGIA 2: Se NÃO há tasks, deletar TODAS as mensagens (fallback)
    strategy = 'FULL'
    const { error: deleteError, count } = await supabaseAdmin
      .from('whatsapp_message_history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Truque para deletar todos

    if (deleteError) {
      logger.error('Erro ao limpar histórico de mensagens (FULL)', deleteError)
      return errorResponse(deleteError.message, 500)
    }

    deletedCount = count || 0

    logger.warn('Histórico de mensagens limpo (FULL) - sem tasks da automação encontradas', {
      deletedCount
    })

    return successResponse({
      deletedCount,
      taskIdsFound: 0,
      strategy: 'FULL',
      message: `Histórico limpo (completo): ${deletedCount} mensagens deletadas (sem tasks da automação para vincular)`
    })
  } catch (error) {
    return handleError(error)
  }
}
