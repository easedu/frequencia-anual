/**
 * API Route: /api/academic-years/school-days-up-to-today
 *
 * GET - Conta dias letivos do ano letivo até hoje
 */

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { errorResponse, successResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import { logger } from '@/utils/logger'

/**
 * GET /api/academic-years/school-days-up-to-today
 * Conta dias letivos do ano letivo até a data atual
 *
 * Query params:
 * - year: Ano acadêmico (opcional, default: ano atual)
 *
 * @example
 * GET /api/academic-years/school-days-up-to-today?year=2025
 *
 * Response: { "count": 42, "year": 2025, "today": "2025-03-15" }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Ano (default: ano atual)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

    // Validar ano
    if (isNaN(year) || year < 2020 || year > 2100) {
      return errorResponse('Ano inválido', 400)
    }

    // Chamar RPC function do Supabase
    const rpcParams = { p_year: year };
    // @ts-expect-error - Supabase RPC typing issue with dynamic functions
    const result = await supabaseAdmin.rpc('get_school_days_up_to_today', rpcParams)
    const { data, error } = result as { data: number | null; error: Error | null }

    if (error) {
      logger.error('Erro ao contar dias letivos até hoje', { year }, error as Error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao contar dias letivos'
      return errorResponse(errorMessage, 500)
    }

    const today = new Date().toISOString().split('T')[0]

    return successResponse({
      count: data || 0,
      year,
      today,
    })
  } catch (error) {
    return handleError(error)
  }
}
