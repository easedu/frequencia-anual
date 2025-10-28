/**
 * API Route: /api/academic-years/complete
 *
 * GET - Retorna ano letivo completo (bimestres + dias letivos) no formato da página cadastrar-ano-letivo
 * POST - Salva ano letivo completo (academic_years + bimesters + school_days + absence_control)
 *
 * Formato de dados compatível com Firebase antigo:
 * {
 *   "1º Bimestre": {
 *     "startDate": "dd/mm/yyyy",
 *     "endDate": "dd/mm/yyyy",
 *     "dates": [{ "date": "dd/mm/yyyy", "isChecked": boolean }]
 *   },
 *   ...
 * }
 */

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { errorResponse, successResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import { logger } from '@/utils/logger'
import { z } from 'zod'
import type {
  AcademicYear,
  Bimester,
  SchoolDay,
  CompleteAcademicYearData,
  BimesterUpsertData,
  SchoolDayInsertData,
  SupabaseResult
} from '@/types/academicYear'

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const bimesterDataSchema = z.object({
  startDate: z.string(), // dd/mm/yyyy
  endDate: z.string(),   // dd/mm/yyyy
  dates: z.array(z.object({
    date: z.string(),
    isChecked: z.boolean()
  }))
})

const saveCompleteAcademicYearSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  bimesters: z.object({
    '1º Bimestre': bimesterDataSchema,
    '2º Bimestre': bimesterDataSchema,
    '3º Bimestre': bimesterDataSchema,
    '4º Bimestre': bimesterDataSchema,
  })
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converter data brasileira (dd/mm/yyyy) para ISO (yyyy-mm-dd)
 */
function convertToISO(dateStr: string): string {
  // Se já está em ISO format (yyyy-mm-dd), retorna
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr
  }

  // Se está em formato brasileiro (dd/mm/yyyy)
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [day, month, year] = dateStr.split('/')
    return `${year}-${month}-${day}`
  }

  // Tentar parsear com Date (aceita múltiplos formatos)
  const date = new Date(dateStr)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }

  // Fallback: retornar original
  return dateStr
}

/**
 * Converter data ISO (yyyy-mm-dd) para formato brasileiro (dd/mm/yyyy)
 */
function convertFromISO(dateStr: string): string {
  // Se já está em formato brasileiro (dd/mm/yyyy), retorna
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return dateStr
  }

  // Se está em ISO format (yyyy-mm-dd)
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }

  // Fallback: retornar original
  return dateStr
}

// ============================================================================
// GET - Buscar Ano Letivo Completo
// ============================================================================

/**
 * GET /api/academic-years/complete?year=2025
 * Retorna ano letivo completo no formato da página cadastrar-ano-letivo
 *
 * Response:
 * {
 *   "1º Bimestre": {
 *     "startDate": "01/02/2025",
 *     "endDate": "30/04/2025",
 *     "dates": [
 *       { "date": "03/02/2025", "isChecked": true },
 *       ...
 *     ]
 *   },
 *   "2º Bimestre": { ... },
 *   "3º Bimestre": { ... },
 *   "4º Bimestre": { ... }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get('year')

    if (!yearParam) {
      return errorResponse('Query parameter "year" é obrigatório', 400)
    }

    const year = parseInt(yearParam)

    if (isNaN(year) || year < 2020 || year > 2100) {
      return errorResponse('Ano inválido', 400)
    }

    // 1. Buscar academic_year
    const { data: academicYear, error: yearError } = (await supabaseAdmin
      .from('academic_years')
      .select('id')
      .eq('year', year)
      .single()) as SupabaseResult<Pick<AcademicYear, 'id'>>

    if (yearError) {
      if ((yearError as Error & { code?: string }).code === 'PGRST116') {
        // Não encontrado - retornar objeto vazio
        return successResponse({})
      }
      throw yearError
    }

    // 2. Buscar bimesters
    const { data: bimesters, error: bimestersError } = (await supabaseAdmin
      .from('bimesters')
      .select('*')
      .eq('academic_year_id', academicYear!.id)
      .order('bimester_number', { ascending: true })) as SupabaseResult<Bimester[]>

    if (bimestersError) throw bimestersError

    // 3. Para cada bimestre, buscar school_days
    const bimesterKeys: Array<keyof CompleteAcademicYearData> = [
      '1º Bimestre',
      '2º Bimestre',
      '3º Bimestre',
      '4º Bimestre'
    ]
    const result: Partial<CompleteAcademicYearData> = {}

    for (const bimester of (bimesters || [])) {
      const bimesterKey = bimesterKeys[bimester.bimester_number - 1]

      // Buscar dias letivos deste bimestre
      const { data: schoolDays, error: daysError } = (await supabaseAdmin
        .from('school_days')
        .select('*')
        .eq('bimester_id', bimester.id)
        .order('date', { ascending: true })) as SupabaseResult<SchoolDay[]>

      if (daysError) throw daysError

      result[bimesterKey] = {
        startDate: convertFromISO(bimester.start_date),
        endDate: convertFromISO(bimester.end_date),
        dates: (schoolDays || []).map((d) => ({
          date: convertFromISO(d.date),
          isChecked: d.is_checked,
        })),
      }
    }

    return successResponse(result)
  } catch (error) {
    return handleError(error)
  }
}

// ============================================================================
// POST - Salvar Ano Letivo Completo
// ============================================================================

/**
 * POST /api/academic-years/complete
 * Salva ou atualiza ano letivo completo (academic_years + bimesters + school_days + absence_control)
 *
 * Body:
 * {
 *   "year": 2025,
 *   "bimesters": {
 *     "1º Bimestre": {
 *       "startDate": "01/02/2025",
 *       "endDate": "30/04/2025",
 *       "dates": [
 *         { "date": "03/02/2025", "isChecked": true },
 *         ...
 *       ]
 *     },
 *     ...
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar dados
    const validated = saveCompleteAcademicYearSchema.parse(body)
    const { year, bimesters } = validated

    // 1. Criar ou atualizar academic_year
    const bimesterValues = Object.values(bimesters)
    const firstBimester = bimesterValues[0]
    const lastBimester = bimesterValues[3]

    const totalSchoolDays = bimesterValues.reduce(
      (sum, b) => sum + b.dates.filter(d => d.isChecked).length,
      0
    )

    const academicYearResult = await supabaseAdmin
      .from('academic_years')
      .upsert(
        {
          year,
          start_date: convertToISO(firstBimester?.startDate || ''),
          end_date: convertToISO(lastBimester?.endDate || ''),
          total_school_days: totalSchoolDays,
        } as never,
        {
          onConflict: 'year',
        }
      )
      .select()
      .single()

    const { data: academicYear, error: yearError } = academicYearResult as unknown as SupabaseResult<AcademicYear>

    if (yearError) throw yearError

    // 2. Para cada bimestre
    const bimesterKeys = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre']

    for (let i = 0; i < bimesterKeys.length; i++) {
      const bimesterKey = bimesterKeys[i]
      const bimesterData = bimesters[bimesterKey as keyof typeof bimesters]

      if (!bimesterData) continue

      const bimesterNumber = i + 1

      // 2.1. Criar ou atualizar bimester
      const bimesterUpsertData: BimesterUpsertData = {
        academic_year_id: academicYear!.id,
        bimester_number: bimesterNumber,
        start_date: convertToISO(bimesterData.startDate),
        end_date: convertToISO(bimesterData.endDate),
        school_days_count: bimesterData.dates.filter(d => d.isChecked).length,
      }

      const bimesterResult = await supabaseAdmin
        .from('bimesters')
        .upsert(
          bimesterUpsertData as never,
          {
            onConflict: 'academic_year_id,bimester_number',
          }
        )
        .select()
        .single()

      const { data: bimester, error: bimesterError } = bimesterResult as unknown as SupabaseResult<Bimester>

      if (bimesterError) throw bimesterError

      // 2.2. Deletar dias letivos antigos deste bimestre
      await supabaseAdmin
        .from('school_days')
        .delete()
        .eq('bimester_id', bimester!.id)

      // 2.3. Inserir novos dias letivos
      if (bimesterData.dates && bimesterData.dates.length > 0) {
        const schoolDaysToInsert: SchoolDayInsertData[] = bimesterData.dates.map(d => ({
          bimester_id: bimester!.id,
          date: convertToISO(d.date),
          is_checked: d.isChecked,
        }))

        const insertResult = await supabaseAdmin
          .from('school_days')
          .insert(schoolDaysToInsert as never)

        const { error: daysError } = insertResult as unknown as SupabaseResult<SchoolDay[]>

        if (daysError) throw daysError
      }

      // 2.4. SINCRONIZAR com tabela absence_control (usada por 4 páginas)
      const schoolDaysCount = bimesterData.dates.filter(d => d.isChecked).length

      const absenceControlResult = await supabaseAdmin
        .from('absence_control')
        .upsert(
          {
            academic_year: year,
            bimester: bimesterNumber,
            school_days: schoolDaysCount,
            start_date: convertToISO(bimesterData.startDate),
            end_date: convertToISO(bimesterData.endDate),
            notes: bimesterKey,
            updated_by: 'academic_year_sync',
          } as never,
          {
            onConflict: 'academic_year,bimester',
          }
        )

      const { error: absenceControlError } = absenceControlResult as unknown as SupabaseResult<unknown>

      if (absenceControlError) {
        logger.warn(
          `⚠️  Erro ao sincronizar absence_control bimestre ${bimesterNumber}`,
          { bimesterNumber, year },
          absenceControlError as Error
        )
        // Não lançar erro - absence_control é secundário
      }
    }

    logger.info('Ano letivo completo salvo com sucesso', {
      year,
      totalSchoolDays,
      bimesters: bimesterKeys.length
    })

    return successResponse({
      message: 'Ano letivo salvo com sucesso',
      year,
      totalSchoolDays
    }, 201)
  } catch (error) {
    return handleError(error)
  }
}
