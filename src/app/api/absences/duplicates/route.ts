/**
 * API Route: /api/absences/duplicates
 *
 * GET - Busca faltas duplicadas (mesmo estudante + mesma data)
 * DELETE - Remove faltas duplicadas (mantém apenas a primeira)
 */

import { NextRequest } from 'next/server'
import { withAuth } from '@/app/api/_middleware/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { successResponse, errorResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import { logger } from '@/utils/logger'

/**
 * GET /api/absences/duplicates
 * Busca faltas duplicadas (mesmo student_id + mesma absence_date)
 *
 * @returns Array de duplicatas { student_id, absence_date, count }
 */
export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000)

    // Chamar RPC function do Supabase
    const { data, error } = (await supabaseAdmin.rpc('find_duplicate_absences')) as {
      data: Array<{ student_id: string; absence_date: string; count: number }> | null
      error: any
    }

    if (error) {
      logger.error('Erro ao buscar duplicatas de faltas', {}, error)
      return errorResponse('DATABASE_ERROR', 'Erro ao buscar duplicatas', 500)
    }

    const allDuplicates = data || []
    const total = allDuplicates.length

    // 🚀 PAGINAÇÃO PROGRESSIVA: Aplicar paginação no resultado
    const from = (page - 1) * limit
    const to = from + limit
    const paginatedDuplicates = allDuplicates.slice(from, to)

    return successResponse({
      duplicates: paginatedDuplicates,
      count: paginatedDuplicates.length,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    return handleError(error, 'GET /api/absences/duplicates')
  }
})

/**
 * DELETE /api/absences/duplicates
 * Remove faltas duplicadas (mantém apenas a primeira ocorrência)
 *
 * @returns { deleted_count: number } - Quantidade de duplicatas removidas
 */
export const DELETE = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // Chamar RPC function do Supabase
    const { data, error } = (await supabaseAdmin.rpc('remove_duplicate_absences')) as {
      data: number | null
      error: any
    }

    if (error) {
      logger.error('Erro ao remover duplicatas de faltas', {}, error)
      return errorResponse('DATABASE_ERROR', 'Erro ao remover duplicatas', 500)
    }

    logger.info('Duplicatas removidas', { deleted_count: data || 0, userId })

    return successResponse({
      deleted_count: data || 0,
      message: `${data || 0} duplicata(s) removida(s) com sucesso`,
    })
  } catch (error) {
    return handleError(error, 'DELETE /api/absences/duplicates')
  }
})
