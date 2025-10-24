/**
 * API Route: /api/academic-years
 *
 * GET - Lista academic years com filtros
 * POST - Cria ou atualiza academic year
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { errorResponse, successResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import { createAcademicYearSchema, academicYearFiltersSchema } from '@/app/api/_schemas/academicYearSchemas'
import { logger } from '@/utils/logger'
import { getCountStrategy } from '@/app/api/_utils/countStrategy'

/**
 * GET /api/academic-years
 * Lista academic years (anos letivos)
 *
 * Query params:
 * - year: Filtrar por ano específico (opcional)
 * - limit: Número de resultados (default: 100)
 * - offset: Offset para paginação (default: 0)
 *
 * @example
 * GET /api/academic-years
 * GET /api/academic-years?year=2025
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Validar filtros
    const filters = academicYearFiltersSchema.parse({
      year: searchParams.get('year') || undefined,
      limit: searchParams.get('limit') || '100',
      offset: searchParams.get('offset') || '0',
    })

    const limit = parseInt(filters.limit)
    const offset = parseInt(filters.offset)

    // ✅ FASE 4.1: Otimizar count
    const page = Math.floor(offset / limit) + 1
    const countOption = getCountStrategy(page)

    // Construir query
    let query = supabaseAdmin
      .from('academic_years')
      .select('*', countOption)

    // Filtrar por ano (opcional)
    if (filters.year) {
      const year = parseInt(filters.year)
      query = query.eq('year', year)
    }

    // Aplicar paginação e ordenação
    query = query
      .range(offset, offset + limit - 1)
      .order('year', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      logger.error('Erro ao buscar academic years', error)
      return errorResponse(error.message, 500)
    }

    return successResponse({
      data: data || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * POST /api/academic-years
 * Cria ou atualiza (upsert) academic year
 *
 * Utiliza UPSERT com constraint unique (year)
 *
 * Body:
 * {
 *   "year": 2025,
 *   "start_date": "2025-02-01",
 *   "end_date": "2025-12-20",
 *   "total_school_days": 200
 * }
 *
 * @example
 * POST /api/academic-years
 * {
 *   "year": 2025,
 *   "start_date": "2025-02-01",
 *   "end_date": "2025-12-20",
 *   "total_school_days": 200
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar dados
    const validated = createAcademicYearSchema.parse(body)

    // Upsert no Supabase
    const { data, error } = await supabaseAdmin
      .from('academic_years')
      .upsert(
        {
          year: validated.year,
          start_date: validated.start_date,
          end_date: validated.end_date,
          total_school_days: validated.total_school_days,
        } as any,
        {
          onConflict: 'year',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single()

    if (error) {
      logger.error('Erro ao criar/atualizar academic year', error)
      return errorResponse(error.message, 500)
    }

    logger.info('Academic year salvo com sucesso', {
      year: validated.year,
      totalSchoolDays: validated.total_school_days
    })

    return successResponse(data as any, 201)
  } catch (error) {
    return handleError(error)
  }
}
