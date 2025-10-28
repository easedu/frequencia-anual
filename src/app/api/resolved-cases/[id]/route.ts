/**
 * API Route: /api/resolved-cases/[id]
 *
 * GET - Busca resolved case específico por ID
 * PUT - Atualiza resolved case específico
 * DELETE - Deleta resolved case específico
 */

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { errorResponse, successResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import { updateResolvedCaseSchema } from '@/app/api/_schemas/resolvedCaseSchemas'
import { logger } from '@/utils/logger'

// ============================================================================
// TYPES
// ============================================================================

interface _ResolvedConsecutiveAbsenceCase {
  id: string;
  student_id: string;
  interaction_id: string | null;
  resolved_at: string;
  resolved_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ResolvedCaseUpdate {
  interaction_id?: string | null;
  resolved_at?: string;
  resolved_by?: string;
  notes?: string | null;
}

/**
 * GET /api/resolved-cases/[id]
 * Busca resolved case específico por ID
 *
 * @example
 * GET /api/resolved-cases/550e8400-e29b-41d4-a716-446655440000
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { data, error } = await supabaseAdmin
      .from('resolved_consecutive_absence_cases')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      logger.error('Erro ao buscar resolved case', { id }, error)
      return errorResponse(error.message, 500)
    }

    if (!data) {
      return errorResponse('Caso resolvido não encontrado', 404)
    }

    return successResponse(data)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * PUT /api/resolved-cases/[id]
 * Atualiza resolved case específico
 *
 * Body:
 * {
 *   "interaction_id": "660e8400-e29b-41d4-a716-446655440000", // Opcional
 *   "resolved_at": "2025-10-18T10:00:00Z",                    // Opcional
 *   "resolved_by": "Prof. Maria Santos",                      // Opcional
 *   "notes": "Atualização de notas"                           // Opcional
 * }
 *
 * @example
 * PUT /api/resolved-cases/550e8400-e29b-41d4-a716-446655440000
 * {
 *   "notes": "Caso atualizado após nova reunião"
 * }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()

    // Validar dados
    const validated = updateResolvedCaseSchema.parse(body)

    // Preparar dados para update (apenas campos fornecidos)
    const updateData: Partial<ResolvedCaseUpdate> = {}

    if (validated.interaction_id !== undefined) {
      updateData.interaction_id = validated.interaction_id
    }
    if (validated.resolved_at !== undefined) {
      updateData.resolved_at = validated.resolved_at
    }
    if (validated.resolved_by !== undefined) {
      updateData.resolved_by = validated.resolved_by
    }
    if (validated.notes !== undefined) {
      updateData.notes = validated.notes
    }

    // Verificar se há algo para atualizar
    if (Object.keys(updateData).length === 0) {
      return errorResponse('Nenhum campo para atualizar', 400)
    }

    // Atualizar no Supabase
    const { data, error } = await supabaseAdmin
      .from('resolved_consecutive_absence_cases')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Erro ao atualizar resolved case', { id }, error)
      return errorResponse(error.message, 500)
    }

    if (!data) {
      return errorResponse('Caso resolvido não encontrado', 404)
    }

    return successResponse(data)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * DELETE /api/resolved-cases/[id]
 * Deleta resolved case específico
 *
 * @example
 * DELETE /api/resolved-cases/550e8400-e29b-41d4-a716-446655440000
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params; void _request;

    const { error } = await supabaseAdmin
      .from('resolved_consecutive_absence_cases')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('Erro ao deletar resolved case', { id }, error)
      return errorResponse(error.message, 500)
    }

    return successResponse({ message: 'Caso resolvido deletado com sucesso' })
  } catch (error) {
    return handleError(error)
  }
}
