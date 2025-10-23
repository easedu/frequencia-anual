/**
 * API Route: /api/tasks
 *
 * GET - Lista tasks com filtros
 * POST - Cria nova task (simplificada, sem lógica de automação)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { errorResponse, successResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import { createTaskSchema, taskFiltersSchema } from '@/app/api/_schemas/taskSchemas'
import { logger } from '@/utils/logger'

/**
 * GET /api/tasks
 * Lista tasks com filtros opcionais
 *
 * Query params:
 * - student_id: UUID do estudante
 * - is_resolved: 'true' | 'false'
 * - created_by: Nome do criador
 * - assigned_to: Nome do responsável
 * - limit: Número de resultados (default: 100)
 * - offset: Offset para paginação (default: 0)
 *
 * @example
 * GET /api/tasks?student_id=550e8400-e29b-41d4-a716-446655440000&is_resolved=false&limit=50
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Validar filtros
    const filters = taskFiltersSchema.parse({
      student_id: searchParams.get('student_id') || undefined,
      is_resolved: searchParams.get('is_resolved') || undefined,
      created_by: searchParams.get('created_by') || undefined,
      assigned_to: searchParams.get('assigned_to') || undefined,
      limit: searchParams.get('limit') || '100',
      offset: searchParams.get('offset') || '0',
    })

    const limit = parseInt(filters.limit)
    const offset = parseInt(filters.offset)

    // Construir query
    let query = supabaseAdmin
      .from('user_tasks')
      .select('*', { count: 'exact' })

    // Aplicar filtros
    if (filters.student_id) {
      query = query.eq('student_id', filters.student_id)
    }

    if (filters.is_resolved) {
      query = query.eq('is_resolved', filters.is_resolved === 'true')
    }

    if (filters.created_by) {
      query = query.eq('created_by', filters.created_by)
    }

    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to)
    }

    // Aplicar paginação e ordenação
    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      logger.error('Erro ao buscar tasks', error)
      return errorResponse(error.message, 500)
    }

    // ✅ Retornar com formato correto (data já é o array de tasks)
    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: (count || 0) > offset + limit
      }
    })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * POST /api/tasks
 * Cria nova task (versão simplificada)
 *
 * Body:
 * {
 *   "student_id": "uuid",
 *   "title": "string",
 *   "description": "string" (opcional),
 *   "recommended_action": "string" (opcional),
 *   "is_resolved": boolean (opcional, default: false),
 *   "action_taken": "string" (opcional),
 *   "created_by": "string" (opcional),
 *   "assigned_to": "string" (opcional),
 *   "due_date": "YYYY-MM-DD" (opcional)
 * }
 *
 * @example
 * POST /api/tasks
 * {
 *   "student_id": "550e8400-e29b-41d4-a716-446655440000",
 *   "title": "Acompanhar frequência do estudante",
 *   "description": "Estudante com 15 faltas no mês",
 *   "recommended_action": "Contato telefônico com responsáveis",
 *   "created_by": "AUTOMAÇÃO"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar dados
    const validated = createTaskSchema.parse(body)

    // Criar task no Supabase
    const { data, error } = await supabaseAdmin
      .from('user_tasks')
      .insert({
        student_id: validated.student_id,
        title: validated.title,
        description: validated.description || null,
        recommended_action: validated.recommended_action || null,
        is_resolved: validated.is_resolved || false,
        action_taken: validated.action_taken || null,
        created_by: validated.created_by || null,
        assigned_to: validated.assigned_to || null,
        due_date: validated.due_date || null,
      } as any)
      .select()
      .single()

    if (error) {
      logger.error('Erro ao criar task', error)
      return errorResponse(error.message, 500)
    }

    logger.info('Task criada com sucesso', { taskId: (data as any)?.id, studentId: validated.student_id })

    return successResponse(data as any, 201)
  } catch (error) {
    return handleError(error)
  }
}
