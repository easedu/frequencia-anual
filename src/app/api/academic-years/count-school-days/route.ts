/**
 * API Route: /api/academic-years/count-school-days
 *
 * GET - Conta dias letivos em um período específico
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { errorResponse, successResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import { countSchoolDaysSchema } from '@/app/api/_schemas/academicYearSchemas'
import { logger } from '@/utils/logger'

/**
 * Converter data brasileira (DD/MM/YYYY) para ISO (YYYY-MM-DD)
 */
function convertToISO(dateStr: string): string {
  // Se já está em ISO format (YYYY-MM-DD), retorna
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr
  }

  // Se está em formato brasileiro (DD/MM/YYYY)
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [day, month, year] = dateStr.split('/')
    return `${year}-${month}-${day}`
  }

  // Fallback: tentar parsear com Date
  const date = new Date(dateStr)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }

  // Retornar original se não conseguir converter
  return dateStr
}

/**
 * GET /api/academic-years/count-school-days
 * Conta dias letivos em um período específico
 *
 * Query params:
 * - start_date: Data de início (YYYY-MM-DD ou DD/MM/YYYY)
 * - end_date: Data de fim (YYYY-MM-DD ou DD/MM/YYYY)
 * - year: Ano acadêmico (opcional, default: ano atual)
 *
 * @example
 * GET /api/academic-years/count-school-days?start_date=2025-02-01&end_date=2025-04-30&year=2025
 * GET /api/academic-years/count-school-days?start_date=01/02/2025&end_date=30/04/2025&year=2025
 *
 * Response: { "count": 54 }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Validar parâmetros
    const params = countSchoolDaysSchema.parse({
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      year: searchParams.get('year') || new Date().getFullYear().toString(),
    })

    if (!params.start_date || !params.end_date) {
      return errorResponse('Parâmetros "start_date" e "end_date" são obrigatórios', 400)
    }

    const year = parseInt(params.year || new Date().getFullYear().toString())

    // Converter datas para ISO (se necessário)
    const isoStartDate = convertToISO(params.start_date)
    const isoEndDate = convertToISO(params.end_date)

    // Chamar RPC function do Supabase
    const { data, error } = await supabaseAdmin.rpc('get_school_days_in_period', {
      p_start_date: isoStartDate,
      p_end_date: isoEndDate,
      p_year: year,
    } as any)

    if (error) {
      logger.error('Erro ao contar dias letivos no período', {
        startDate: isoStartDate,
        endDate: isoEndDate,
        year
      }, error)
      return errorResponse(error.message, 500)
    }

    return successResponse({
      count: data || 0,
      period: {
        start_date: isoStartDate,
        end_date: isoEndDate,
        year
      }
    })
  } catch (error) {
    return handleError(error)
  }
}
