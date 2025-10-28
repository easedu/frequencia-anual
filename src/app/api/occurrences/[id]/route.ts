/**
 * API Route: /api/occurrences/[id]
 *
 * GET - Busca occurrence específica
 * PUT - Atualiza occurrence
 * DELETE - Remove occurrence
 */

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { errorResponse, successResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import { updateOccurrenceSchema } from '@/app/api/_schemas/occurrenceSchemas'
import { logger } from '@/utils/logger'

/**
 * GET /api/occurrences/[id]
 * Busca occurrence específica por ID
 *
 * @example
 * GET /api/occurrences/550e8400-e29b-41d4-a716-446655440000
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('student_occurrences')
      .select('*')
      .eq('id', await context.params.then(p => p.id))
      .single()

    if (error) {
      logger.error('Erro ao buscar occurrence', { id: await context.params.then(p => p.id), error })
      return errorResponse(error.message, 404)
    }

    return successResponse(data)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * PUT /api/occurrences/[id]
 * Atualiza occurrence existente
 *
 * Body:
 * {
 *   "occurrence_type": "string" (opcional),
 *   "occurrence_date": "YYYY-MM-DD" (opcional),
 *   "description": "string" (opcional),
 *   "severity": "LEVE" | "MODERADA" | "GRAVE" (opcional),
 *   "action_taken": "string" (opcional),
 *   "family_notified": boolean (opcional),
 *   "notification_method": "string" (opcional),
 *   "follow_up_notes": "string" (opcional)
 * }
 *
 * @example
 * PUT /api/occurrences/550e8400-e29b-41d4-a716-446655440000
 * {
 *   "family_notified": true,
 *   "notification_method": "TELEFONE",
 *   "action_taken": "Conversa com os pais realizada"
 * }
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()

    // Validar dados
    const validated = updateOccurrenceSchema.parse(body)

    // Montar objeto de atualização (apenas campos fornecidos)
    const updateData: {
      occurrence_type?: string;
      occurrence_date?: string;
      description?: string;
      severity?: string;
      action_taken?: string | null;
      family_notified?: boolean;
      notification_method?: string | null;
      follow_up_notes?: string | null;
      updated_at?: string;
    } = {}

    if (validated.occurrence_type !== undefined) updateData.occurrence_type = validated.occurrence_type
    if (validated.occurrence_date !== undefined) updateData.occurrence_date = validated.occurrence_date
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.severity !== undefined) updateData.severity = validated.severity
    if (validated.action_taken !== undefined) updateData.action_taken = validated.action_taken ?? null
    if (validated.family_notified !== undefined) updateData.family_notified = validated.family_notified
    if (validated.notification_method !== undefined) updateData.notification_method = validated.notification_method ?? null
    if (validated.follow_up_notes !== undefined) updateData.follow_up_notes = validated.follow_up_notes ?? null

    // Adicionar updated_at automaticamente
    updateData.updated_at = new Date().toISOString()

    // Atualizar no Supabase
    const { data, error } = await supabaseAdmin
      .from('student_occurrences')
      .update(updateData as never)
      .eq('id', await context.params.then(p => p.id))
      .select()
      .single()

    if (error) {
      logger.error('Erro ao atualizar occurrence', { id: await context.params.then(p => p.id), error })
      return errorResponse(error.message, 500)
    }

    logger.info('Occurrence atualizada com sucesso', { occurrenceId: await context.params.then(p => p.id) })

    return successResponse(data)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * DELETE /api/occurrences/[id]
 * Remove occurrence do sistema
 *
 * @example
 * DELETE /api/occurrences/550e8400-e29b-41d4-a716-446655440000
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await supabaseAdmin
      .from('student_occurrences')
      .delete()
      .eq('id', await context.params.then(p => p.id))

    if (error) {
      logger.error('Erro ao deletar occurrence', { id: await context.params.then(p => p.id), error })
      return errorResponse(error.message, 500)
    }

    logger.info('Occurrence deletada com sucesso', { occurrenceId: await context.params.then(p => p.id) })

    return successResponse({ message: 'Occurrence deletada com sucesso' })
  } catch (error) {
    return handleError(error)
  }
}
