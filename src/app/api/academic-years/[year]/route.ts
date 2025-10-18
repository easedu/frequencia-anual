/**
 * API Route: /api/academic-years/[year]
 *
 * GET - Busca academic year específico por ano
 * PUT - Atualiza academic year específico
 * DELETE - Deleta academic year específico
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { errorResponse, successResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import { updateAcademicYearSchema } from '@/app/api/_schemas/academicYearSchemas'
import { logger } from '@/utils/logger'

/**
 * GET /api/academic-years/[year]
 * Busca academic year específico por ano
 *
 * @example
 * GET /api/academic-years/2025
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { year: string } }
) {
  try {
    const year = parseInt(params.year)

    if (isNaN(year)) {
      return errorResponse('Ano inválido', 400)
    }

    const { data, error } = await supabaseAdmin
      .from('academic_years')
      .select('*')
      .eq('year', year)
      .maybeSingle()

    if (error) {
      logger.error('Erro ao buscar academic year', { year }, error)
      return errorResponse(error.message, 500)
    }

    if (!data) {
      return errorResponse('Ano letivo não encontrado', 404)
    }

    return successResponse(data)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * PUT /api/academic-years/[year]
 * Atualiza academic year específico
 *
 * Body:
 * {
 *   "start_date": "2025-02-05",     // Opcional
 *   "end_date": "2025-12-22",       // Opcional
 *   "total_school_days": 205        // Opcional
 * }
 *
 * @example
 * PUT /api/academic-years/2025
 * {
 *   "total_school_days": 205
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { year: string } }
) {
  try {
    const year = parseInt(params.year)

    if (isNaN(year)) {
      return errorResponse('Ano inválido', 400)
    }

    const body = await request.json()

    // Validar dados
    const validated = updateAcademicYearSchema.parse(body)

    // Preparar dados para update (apenas campos fornecidos)
    const updateData: Record<string, any> = {}

    if (validated.start_date !== undefined) {
      updateData.start_date = validated.start_date
    }
    if (validated.end_date !== undefined) {
      updateData.end_date = validated.end_date
    }
    if (validated.total_school_days !== undefined) {
      updateData.total_school_days = validated.total_school_days
    }

    // Verificar se há algo para atualizar
    if (Object.keys(updateData).length === 0) {
      return errorResponse('Nenhum campo para atualizar', 400)
    }

    // Atualizar no Supabase
    const { data, error } = await (supabaseAdmin
      .from('academic_years') as any)
      .update(updateData)
      .eq('year', year)
      .select()
      .single()

    if (error) {
      logger.error('Erro ao atualizar academic year', { year }, error)
      return errorResponse(error.message, 500)
    }

    if (!data) {
      return errorResponse('Ano letivo não encontrado', 404)
    }

    logger.info('Academic year atualizado com sucesso', {
      year,
      fieldsUpdated: Object.keys(updateData)
    })

    return successResponse(data)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * DELETE /api/academic-years/[year]
 * Deleta academic year específico (e cascata bimesters + school_days)
 *
 * ⚠️ ATENÇÃO: Deleta também bimesters e school_days relacionados!
 *
 * @example
 * DELETE /api/academic-years/2025
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { year: string } }
) {
  try {
    const year = parseInt(params.year)

    if (isNaN(year)) {
      return errorResponse('Ano inválido', 400)
    }

    // Deletar academic year (cascade automático via FK)
    const { error } = await supabaseAdmin
      .from('academic_years')
      .delete()
      .eq('year', year)

    if (error) {
      logger.error('Erro ao deletar academic year', { year }, error)
      return errorResponse(error.message, 500)
    }

    logger.info('Academic year deletado com sucesso', { year })

    return successResponse({ message: 'Ano letivo deletado com sucesso' })
  } catch (error) {
    return handleError(error)
  }
}
