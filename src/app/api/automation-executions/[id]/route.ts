/**
 * API Route: /api/automation-executions/[id]
 *
 * GET - Busca execution específica por ID
 * PUT - Atualiza execution (status, checkpoint ou erro)
 * DELETE - Deleta execution específica
 */

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { errorResponse, successResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import {
  updateExecutionStatusSchema,
  updateCheckpointSchema,
  updateErrorSchema
} from '@/app/api/_schemas/automationExecutionSchemas'
import { logger } from '@/utils/logger'

/**
 * GET /api/automation-executions/[id]
 * Busca automation execution específica por ID
 *
 * @example
 * GET /api/automation-executions/550e8400-e29b-41d4-a716-446655440000
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('automation_executions')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      logger.error('Erro ao buscar automation execution', { id }, error)
      return errorResponse(error.message, 500)
    }

    if (!data) {
      return errorResponse('Automation execution não encontrada', 404)
    }

    return successResponse(data)
  } catch (error: unknown) {
    return handleError(error)
  }
}

/**
 * PUT /api/automation-executions/[id]
 * Atualiza automation execution (suporta 3 tipos de update)
 *
 * Tipos de update:
 * 1. Status: { "status": "RUNNING" }
 * 2. Checkpoint: { "processed_students": 10, "current_student_index": 10, ... }
 * 3. Erro: { "error_message": "Erro ao processar" }
 *
 * @example
 * PUT /api/automation-executions/550e8400-e29b-41d4-a716-446655440000
 * { "status": "RUNNING" }
 *
 * @example
 * PUT /api/automation-executions/550e8400-e29b-41d4-a716-446655440000
 * {
 *   "processed_students": 10,
 *   "current_student_index": 10,
 *   "processed_student_ids": ["uuid1", "uuid2"],
 *   "results": { "sent": 8, "failed": 2 }
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Detectar tipo de update e validar
    let updateData: Record<string, string | number | string[] | Record<string, unknown> | null> = {}

    // Tipo 1: Update de status
    if ('status' in body && Object.keys(body).length === 1) {
      const validated = updateExecutionStatusSchema.parse(body)

      updateData.status = validated.status

      // Adicionar timestamps automáticos
      if (validated.status === 'RUNNING') {
        updateData.started_at = new Date().toISOString()
      } else if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(validated.status)) {
        updateData.completed_at = new Date().toISOString()
      }
    }
    // Tipo 2: Update de checkpoint (progresso)
    else if ('processed_students' in body || 'current_student_index' in body) {
      const validated = updateCheckpointSchema.parse(body)

      updateData.processed_students = validated.processed_students
      updateData.current_student_index = validated.current_student_index
      updateData.processed_student_ids = validated.processed_student_ids
      updateData.results = validated.results
    }
    // Tipo 3: Update de erro
    else if ('error_message' in body) {
      const validated = updateErrorSchema.parse(body)

      updateData.status = 'FAILED'
      updateData.error_message = validated.error_message
      updateData.completed_at = new Date().toISOString()
    }
    else {
      return errorResponse('Tipo de atualização inválido', 400)
    }

    // Executar update no Supabase
    const result = await supabaseAdmin
      .from('automation_executions')
      // @ts-expect-error - Supabase typing issue with dynamic update data
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    const { data, error } = result as { data: Record<string, unknown> | null; error: { message: string } | null }

    if (error) {
      logger.error('Erro ao atualizar automation execution', { id }, new Error(error.message))
      return errorResponse(error.message, 500)
    }

    if (!data) {
      return errorResponse('Automation execution não encontrada', 404)
    }

    return successResponse(data)
  } catch (error: unknown) {
    return handleError(error)
  }
}

/**
 * DELETE /api/automation-executions/[id]
 * Deleta automation execution específica
 *
 * @example
 * DELETE /api/automation-executions/550e8400-e29b-41d4-a716-446655440000
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await supabaseAdmin
      .from('automation_executions')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('Erro ao deletar automation execution', { id }, error)
      return errorResponse(error.message, 500)
    }

    return successResponse({ message: 'Automation execution deletada com sucesso' })
  } catch (error: unknown) {
    return handleError(error)
  }
}
