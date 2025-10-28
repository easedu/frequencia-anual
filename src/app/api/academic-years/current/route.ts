/**
 * API Route: /api/academic-years/current
 *
 * GET - Retorna o ano letivo atual (ano em curso)
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { errorResponse, successResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import { logger } from '@/utils/logger'

/**
 * GET /api/academic-years/current
 * Retorna o ano letivo atual (ano corrente)
 *
 * @example
 * GET /api/academic-years/current
 * Response: { "year": 2025, "start_date": "2025-02-01", ... }
 */
export async function GET() {
  try {
    const currentYear = new Date().getFullYear()

    const { data, error } = await supabaseAdmin
      .from('academic_years')
      .select('*')
      .eq('year', currentYear)
      .maybeSingle()

    if (error) {
      logger.error('Erro ao buscar ano letivo atual', { currentYear }, error)
      return errorResponse(error.message, 500)
    }

    if (!data) {
      return errorResponse(`Ano letivo ${currentYear} não encontrado no banco`, 404)
    }

    return successResponse(data)
  } catch (error) {
    return handleError(error)
  }
}
