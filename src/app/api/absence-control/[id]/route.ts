/**
 * API Route: /api/absence-control/[id]
 *
 * GET - Busca controle específico por ID
 * PUT - Atualiza controle específico
 * DELETE - Deleta controle específico
 */

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { errorResponse, successResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import { updateAbsenceControlSchema } from '@/app/api/_schemas/absenceControlSchemas'
import { logger } from '@/utils/logger'

/**
 * GET /api/absence-control/[id]
 * Busca controle de faltas específico por ID
 *
 * @example
 * GET /api/absence-control/550e8400-e29b-41d4-a716-446655440000
 */
interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  const params = await context.params;
  try {
    const { id } = params

    const { data, error } = await supabaseAdmin
      .from('absence_control')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      logger.error('Erro ao buscar controle de faltas', { id }, error)
      return errorResponse(error.message, 500)
    }

    if (!data) {
      return errorResponse('Controle de faltas não encontrado', 404)
    }

    return successResponse(data)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * PUT /api/absence-control/[id]
 * Atualiza controle de faltas específico
 *
 * Body:
 * {
 *   "school_days": 52,               // Opcional
 *   "start_date": "2025-02-01",      // Opcional
 *   "end_date": "2025-05-02",        // Opcional
 *   "notes": "Ajustado feriados",    // Opcional
 *   "updated_by": "user@email.com"   // Opcional
 * }
 *
 * @example
 * PUT /api/absence-control/550e8400-e29b-41d4-a716-446655440000
 * {
 *   "school_days": 52,
 *   "notes": "Ajustado após feriados"
 * }
 */
export async function PUT(
  request: NextRequest,
  context: RouteParams
) {
  const params = await context.params;
  try {
    const { id } = params
    const body = await request.json()

    // Validar dados
    const validated = updateAbsenceControlSchema.parse(body)

    // Preparar dados para update (apenas campos fornecidos)
    interface AbsenceControlUpdate {
      school_days?: number;
      start_date?: string;
      end_date?: string;
      notes?: string | null;
      updated_by?: string | null;
    }

    const updateData: AbsenceControlUpdate = {}

    if (validated.school_days !== undefined) {
      updateData.school_days = validated.school_days
    }
    if (validated.start_date !== undefined) {
      updateData.start_date = validated.start_date
    }
    if (validated.end_date !== undefined) {
      updateData.end_date = validated.end_date
    }
    if (validated.notes !== undefined) {
      updateData.notes = validated.notes
    }
    if (validated.updated_by !== undefined) {
      updateData.updated_by = validated.updated_by
    }

    // Verificar se há algo para atualizar
    if (Object.keys(updateData).length === 0) {
      return errorResponse('Nenhum campo para atualizar', 400)
    }

    // Atualizar no Supabase
    const updateResult = await supabaseAdmin
      .from('absence_control')
      // @ts-expect-error - Supabase typing issue with partial updates
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    const { data, error } = updateResult

    if (error) {
      logger.error('Erro ao atualizar controle de faltas', { id }, error)
      return errorResponse(error.message, 500)
    }

    if (!data) {
      return errorResponse('Controle de faltas não encontrado', 404)
    }

    logger.info('Controle de faltas atualizado com sucesso', {
      id,
      fieldsUpdated: Object.keys(updateData)
    })

    return successResponse(data)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * DELETE /api/absence-control/[id]
 * Deleta controle de faltas específico
 *
 * @example
 * DELETE /api/absence-control/550e8400-e29b-41d4-a716-446655440000
 */
export async function DELETE(
  request: NextRequest,
  context: RouteParams
) {
  const params = await context.params;
  try {
    const { id } = params

    const { error } = await supabaseAdmin
      .from('absence_control')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('Erro ao deletar controle de faltas', { id }, error)
      return errorResponse(error.message, 500)
    }

    logger.info('Controle de faltas deletado com sucesso', { id })

    return successResponse({ message: 'Controle de faltas deletado com sucesso' })
  } catch (error) {
    return handleError(error)
  }
}
