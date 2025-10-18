/**
 * API Route: /api/tasks/[id]
 *
 * GET - Busca task específica
 * PUT - Atualiza task
 * DELETE - Remove task
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { errorResponse, successResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import { updateTaskSchema } from '@/app/api/_schemas/taskSchemas'
import { logger } from '@/utils/logger'

/**
 * GET /api/tasks/[id]
 * Busca task específica por ID
 *
 * @example
 * GET /api/tasks/550e8400-e29b-41d4-a716-446655440000
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_tasks')
      .select('*')
      .eq('id', await context.params.then(p => p.id))
      .single()

    if (error) {
      logger.error('Erro ao buscar task', { id: await context.params.then(p => p.id), error })
      return errorResponse(error.message, 404)
    }

    return successResponse(data)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * PUT /api/tasks/[id]
 * Atualiza task existente
 *
 * Body:
 * {
 *   "title": "string" (opcional),
 *   "description": "string" (opcional),
 *   "recommended_action": "string" (opcional),
 *   "is_resolved": boolean (opcional),
 *   "action_taken": "string" (opcional),
 *   "assigned_to": "string" (opcional),
 *   "due_date": "YYYY-MM-DD" (opcional),
 *   "resolved_at": "YYYY-MM-DD" (opcional)
 * }
 *
 * @example
 * PUT /api/tasks/550e8400-e29b-41d4-a716-446655440000
 * {
 *   "is_resolved": true,
 *   "action_taken": "Contato realizado com sucesso",
 *   "resolved_at": "2025-10-17"
 * }
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()

    // Validar dados
    const validated = updateTaskSchema.parse(body)

    // Montar objeto de atualização (apenas campos fornecidos)
    const updateData: Record<string, any> = {}

    if (validated.title !== undefined) updateData.title = validated.title
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.recommended_action !== undefined) updateData.recommended_action = validated.recommended_action
    if (validated.is_resolved !== undefined) updateData.is_resolved = validated.is_resolved
    if (validated.action_taken !== undefined) updateData.action_taken = validated.action_taken
    if (validated.assigned_to !== undefined) updateData.assigned_to = validated.assigned_to
    if (validated.due_date !== undefined) updateData.due_date = validated.due_date
    if (validated.resolved_at !== undefined) updateData.resolved_at = validated.resolved_at

    // Atualizar no Supabase
    const { data, error } = await supabaseAdmin
      .from('user_tasks')
      // @ts-ignore - Supabase type mismatch
      .update({...updateData} as any)
      .eq('id', await context.params.then(p => p.id))
      .select()
      .single()

    if (error) {
      logger.error('Erro ao atualizar task', { id: await context.params.then(p => p.id), error })
      return errorResponse(error.message, 500)
    }

    logger.info('Task atualizada com sucesso', { taskId: await context.params.then(p => p.id) })

    return successResponse(data)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * DELETE /api/tasks/[id]
 * Remove task do sistema
 *
 * @example
 * DELETE /api/tasks/550e8400-e29b-41d4-a716-446655440000
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await supabaseAdmin
      .from('user_tasks')
      .delete()
      .eq('id', await context.params.then(p => p.id))

    if (error) {
      logger.error('Erro ao deletar task', { id: await context.params.then(p => p.id), error })
      return errorResponse(error.message, 500)
    }

    logger.info('Task deletada com sucesso', { taskId: await context.params.then(p => p.id) })

    return successResponse({ message: 'Task deletada com sucesso' })
  } catch (error) {
    return handleError(error)
  }
}
