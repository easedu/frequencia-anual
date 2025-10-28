/**
 * API Route: /api/absence-control
 *
 * GET - Lista controles de faltas com filtros
 * POST - Cria ou atualiza (upsert) controle de faltas
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withAuth } from '@/app/api/_middleware/auth'
import { errorResponse, successResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import { createAbsenceControlSchema, absenceControlFiltersSchema } from '@/app/api/_schemas/absenceControlSchemas'
import { logger } from '@/utils/logger'
import { getCountStrategy } from '@/app/api/_utils/countStrategy'

/**
 * GET /api/absence-control
 * Lista controles de faltas (dias letivos por bimestre)
 *
 * Query params:
 * - academic_year: Ano acadêmico (obrigatório, ex: 2025)
 * - bimester: Bimestre específico (opcional, 1-4)
 * - limit: Número de resultados (default: 100)
 * - offset: Offset para paginação (default: 0)
 *
 * @example
 * GET /api/absence-control?academic_year=2025
 * GET /api/absence-control?academic_year=2025&bimester=1
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)

    // Validar filtros
    const filters = absenceControlFiltersSchema.parse({
      academic_year: searchParams.get('academic_year') || undefined,
      bimester: searchParams.get('bimester') || undefined,
      limit: searchParams.get('limit') || '100',
      offset: searchParams.get('offset') || '0',
    })

    if (!filters.academic_year) {
      return errorResponse('Parâmetro "academic_year" é obrigatório', 400)
    }

    const academicYear = parseInt(filters.academic_year)
    const limit = parseInt(filters.limit)
    const offset = parseInt(filters.offset)

    // ✅ FASE 4.1: Otimizar count
    const page = Math.floor(offset / limit) + 1
    const countOption = getCountStrategy(page)

    // Construir query
    let query = supabaseAdmin
      .from('absence_control')
      .select('*', countOption)
      .eq('academic_year', academicYear)

    // Filtrar por bimestre (opcional)
    if (filters.bimester) {
      const bimester = parseInt(filters.bimester)
      query = query.eq('bimester', bimester)
    }

    // Aplicar paginação e ordenação
    query = query
      .range(offset, offset + limit - 1)
      .order('bimester', { ascending: true })

    const { data, error, count } = await query

    if (error) {
      logger.error('Erro ao buscar controles de faltas', { message: error.message, details: error.details })
      return errorResponse(error.message, 500)
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    return handleError(error)
  }
});

/**
 * POST /api/absence-control
 * Cria ou atualiza (upsert) controle de faltas
 *
 * Utiliza UPSERT com constraint unique (academic_year, bimester)
 * Se já existir registro para o ano/bimestre, atualiza. Caso contrário, cria.
 *
 * Body:
 * {
 *   "academic_year": 2025,
 *   "bimester": 1,
 *   "school_days": 50,
 *   "start_date": "2025-02-01",       // Opcional
 *   "end_date": "2025-04-30",         // Opcional
 *   "notes": "Primeiro bimestre",     // Opcional
 *   "created_by": "user@email.com"    // Opcional
 * }
 *
 * @example
 * POST /api/absence-control
 * {
 *   "academic_year": 2025,
 *   "bimester": 1,
 *   "school_days": 50,
 *   "start_date": "2025-02-01",
 *   "end_date": "2025-04-30"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar dados
    const validated = createAbsenceControlSchema.parse(body)

    // Interface para o upsert
    interface AbsenceControlUpsert {
      academic_year: number;
      bimester: number;
      school_days: number;
      start_date: string | null;
      end_date: string | null;
      notes: string | null;
      created_by: string | null;
    }

    const upsertData: AbsenceControlUpsert = {
      academic_year: validated.academic_year,
      bimester: validated.bimester,
      school_days: validated.school_days,
      start_date: validated.start_date || null,
      end_date: validated.end_date || null,
      notes: validated.notes || null,
      created_by: validated.created_by || null,
    }

    // Upsert no Supabase (cria se não existe, atualiza se existe)
    const result = await supabaseAdmin
      .from('absence_control')
      .upsert(
        upsertData as never,
        {
          onConflict: 'academic_year,bimester',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single()

    const { data, error } = result as { data: AbsenceControlUpsert | null; error: { message: string; details?: string } | null };

    if (error) {
      logger.error('Erro ao criar/atualizar controle de faltas', { message: error.message, details: error.details })
      return errorResponse(error.message, 500)
    }

    logger.info('Controle de faltas salvo com sucesso', {
      academicYear: validated.academic_year,
      bimester: validated.bimester,
      schoolDays: validated.school_days
    })

    return successResponse({ data }, 201)
  } catch (error) {
    return handleError(error)
  }
}
