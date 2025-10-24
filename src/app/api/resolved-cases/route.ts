/**
 * API Route: /api/resolved-cases
 *
 * GET - Lista casos resolvidos com filtros
 * POST - Cria novo caso resolvido
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { errorResponse, successResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import { createResolvedCaseSchema, resolvedCaseFiltersSchema } from '@/app/api/_schemas/resolvedCaseSchemas'
import { logger } from '@/utils/logger'
import { getCountStrategy } from '@/app/api/_utils/countStrategy'

/**
 * GET /api/resolved-cases
 * Lista casos resolvidos de faltas consecutivas
 *
 * Query params:
 * - student_id: UUID do estudante (opcional)
 * - resolved_by: Nome de quem resolveu (opcional)
 * - start_date: Data início de resolução (opcional, YYYY-MM-DD)
 * - end_date: Data fim de resolução (opcional, YYYY-MM-DD)
 * - limit: Número de resultados (default: 100)
 * - offset: Offset para paginação (default: 0)
 *
 * @example
 * GET /api/resolved-cases
 * GET /api/resolved-cases?student_id=550e8400-e29b-41d4-a716-446655440000
 * GET /api/resolved-cases?resolved_by=Prof. João Silva
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Validar filtros
    const filters = resolvedCaseFiltersSchema.parse({
      student_id: searchParams.get('student_id') || undefined,
      resolved_by: searchParams.get('resolved_by') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
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
      .from('resolved_consecutive_absence_cases')
      .select('*', countOption)

    // Aplicar filtros
    if (filters.student_id) {
      query = query.eq('student_id', filters.student_id)
    }

    if (filters.resolved_by) {
      query = query.ilike('resolved_by', `%${filters.resolved_by}%`)
    }

    if (filters.start_date) {
      query = query.gte('resolved_at', `${filters.start_date}T00:00:00`)
    }

    if (filters.end_date) {
      query = query.lte('resolved_at', `${filters.end_date}T23:59:59`)
    }

    // Aplicar paginação e ordenação
    query = query
      .range(offset, offset + limit - 1)
      .order('resolved_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      logger.error('Erro ao buscar resolved cases', error)
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
 * POST /api/resolved-cases
 * Cria novo caso resolvido de faltas consecutivas
 *
 * Body:
 * {
 *   "student_id": "550e8400-e29b-41d4-a716-446655440000",
 *   "interaction_id": "660e8400-e29b-41d4-a716-446655440000", // Opcional
 *   "resolved_at": "2025-10-17T14:30:00Z",
 *   "resolved_by": "Prof. João Silva",
 *   "notes": "Caso resolvido após reunião com família"  // Opcional
 * }
 *
 * @example
 * POST /api/resolved-cases
 * {
 *   "student_id": "550e8400-e29b-41d4-a716-446655440000",
 *   "resolved_at": "2025-10-17T14:30:00Z",
 *   "resolved_by": "Prof. João Silva"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar dados
    const validated = createResolvedCaseSchema.parse(body)

    // Criar resolved case no Supabase
    const { data, error } = await supabaseAdmin
      .from('resolved_consecutive_absence_cases')
      .insert({
        student_id: validated.student_id,
        interaction_id: validated.interaction_id || null,
        resolved_at: validated.resolved_at,
        resolved_by: validated.resolved_by,
        notes: validated.notes || null,
      } as any)
      .select()
      .single()

    if (error) {
      logger.error('Erro ao criar resolved case', error)
      return errorResponse(error.message, 500)
    }

    logger.info('Resolved case criado com sucesso', {
      caseId: (data as any)?.id,
      studentId: validated.student_id
    })

    return successResponse(data as any, 201)
  } catch (error) {
    return handleError(error)
  }
}
