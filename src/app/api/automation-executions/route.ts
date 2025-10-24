/**
 * API Route: /api/automation-executions
 *
 * GET - Lista execuções de automação com filtros
 * POST - Cria nova execução de automação
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { errorResponse, successResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import { createAutomationExecutionSchema, automationExecutionFiltersSchema } from '@/app/api/_schemas/automationExecutionSchemas'
import { logger } from '@/utils/logger'
import { getCountStrategy } from '@/app/api/_utils/countStrategy'

/**
 * GET /api/automation-executions
 * Lista execuções de automação com filtros
 *
 * Query params:
 * - status: PENDING | RUNNING | COMPLETED | FAILED | CANCELLED (opcional)
 * - dry_run: true | false (opcional)
 * - absence_multiple: Número (opcional)
 * - limit: Número de resultados (default: 50)
 * - offset: Offset para paginação (default: 0)
 *
 * @example
 * GET /api/automation-executions
 * GET /api/automation-executions?status=COMPLETED&limit=20
 * GET /api/automation-executions?dry_run=false&absence_multiple=3
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Validar filtros
    const filters = automationExecutionFiltersSchema.parse({
      status: searchParams.get('status') || undefined,
      dry_run: searchParams.get('dry_run') || undefined,
      absence_multiple: searchParams.get('absence_multiple') || undefined,
      limit: searchParams.get('limit') || '50',
      offset: searchParams.get('offset') || '0',
    })

    const limit = parseInt(filters.limit)
    const offset = parseInt(filters.offset)

    // ✅ FASE 4.1: Otimizar count
    const page = Math.floor(offset / limit) + 1
    const countOption = getCountStrategy(page)

    // Construir query
    let query = supabaseAdmin
      .from('automation_executions')
      .select('*', countOption)

    // Aplicar filtros
    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.dry_run) {
      query = query.eq('dry_run', filters.dry_run === 'true')
    }

    if (filters.absence_multiple) {
      const absenceMultiple = parseInt(filters.absence_multiple)
      query = query.eq('absence_multiple', absenceMultiple)
    }

    // Aplicar paginação e ordenação
    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      logger.error('Erro ao buscar automation executions', error)
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
 * POST /api/automation-executions
 * Cria nova execução de automação
 *
 * Body:
 * {
 *   "total_students": 25,
 *   "students_data": { ... },             // JSONB com dados dos estudantes
 *   "dry_run": false,                     // Opcional, default: false
 *   "absence_multiple": 3,                // Opcional
 *   "notification_phone": "5511988384664" // Opcional
 * }
 *
 * @example
 * POST /api/automation-executions
 * {
 *   "total_students": 25,
 *   "students_data": { "students": [...] },
 *   "dry_run": false,
 *   "absence_multiple": 3
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar dados
    const validated = createAutomationExecutionSchema.parse(body)

    // Criar execution no Supabase
    const { data, error } = await supabaseAdmin
      .from('automation_executions')
      .insert({
        status: 'PENDING',
        total_students: validated.total_students,
        processed_students: 0,
        current_student_index: 0,
        processed_student_ids: [],
        students_data: validated.students_data,
        results: {},
        dry_run: validated.dry_run || false,
        absence_multiple: validated.absence_multiple || null,
        notification_phone: validated.notification_phone || null,
      } as any)
      .select()
      .single()

    if (error) {
      logger.error('Erro ao criar automation execution', error)
      return errorResponse(error.message, 500)
    }

    logger.info('Automation execution criada com sucesso', {
      executionId: (data as any)?.id,
      totalStudents: validated.total_students,
      dryRun: validated.dry_run
    })

    return successResponse(data as any, 201)
  } catch (error) {
    return handleError(error)
  }
}
