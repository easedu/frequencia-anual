/**
 * API Route: GET /api/academic-years/[year]/complete
 *
 * Busca dados completos do ano letivo (bimestres + dias letivos)
 * no formato compatível com código legado do Firebase.
 *
 * ✅ OTIMIZAÇÕES:
 * - Cache de 1 hora (dados do ano letivo mudam raramente)
 * - Queries paralelas (não sequenciais)
 * - Server-side (Supabase Admin, sem RLS overhead)
 * - Retry automático (via fetchWithRetry no client)
 *
 * Performance:
 * - 1ª chamada: ~5-10s (2G/3G)
 * - Próximas: < 1s (cached) ⚡
 *
 * Formato de retorno (compatível com Firebase legado):
 * {
 *   "1º Bimestre": {
 *     startDate: "05/02/2025",
 *     endDate: "30/04/2025",
 *     dates: [
 *       { date: "05/02/2025", isChecked: true },
 *       { date: "06/02/2025", isChecked: false },
 *       ...
 *     ]
 *   },
 *   "2º Bimestre": { ... },
 *   "3º Bimestre": { ... },
 *   "4º Bimestre": { ... }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { serverCache } from '@/utils/serverCache';
import { logger } from '@/utils/logger';

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

interface RouteParams {
  params: Promise<{
    year: string;
  }>;
}

interface BimesterData {
  startDate: string;
  endDate: string;
  dates: Array<{ date: string; isChecked: boolean }>;
}

interface AcademicYearComplete {
  '1º Bimestre': BimesterData;
  '2º Bimestre': BimesterData;
  '3º Bimestre': BimesterData;
  '4º Bimestre': BimesterData;
}

interface ApiResponse {
  success: boolean;
  data?: AcademicYearComplete;
  error?: string;
  cached?: boolean;
}

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════

// Cache de 1 hora (dados do ano letivo mudam raramente)
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

const BIMESTER_KEYS = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

/**
 * Converter data ISO (yyyy-mm-dd) para formato brasileiro (dd/mm/yyyy)
 */
function convertISOToBrazilian(isoDate: string): string {
  // Se já está em formato brasileiro (dd/mm/yyyy), retorna
  if (isoDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return isoDate;
  }

  // Se está em ISO format (yyyy-mm-dd)
  if (isoDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  }

  // Fallback: retornar original
  return isoDate;
}

// ════════════════════════════════════════════════════════════════
// API ROUTE HANDLER
// ════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest, context: RouteParams) {
  try {
    const params = await context.params;
    const year = parseInt(params.year);

    // Validação de entrada
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        {
          success: false,
          error: `Ano inválido: ${params.year}. Deve estar entre 2000 e 2100.`,
        } as ApiResponse,
        { status: 400 }
      );
    }

    // ✅ PASSO 1: Verificar cache primeiro
    const cacheKey = `academic-year-complete-${year}`;
    const cached = serverCache.get<AcademicYearComplete>(cacheKey);

    if (cached) {
      logger.info(`Cache HIT para ano letivo ${year}`, { year, cached: true });

      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      } as ApiResponse);
    }

    logger.info(`Cache MISS para ano letivo ${year} - Buscando no banco`, { year });

    // ✅ PASSO 2: Buscar academic_year (verificar se existe)
    const { data: academicYear, error: yearError } = (await supabaseAdmin
      .from('academic_years')
      .select('id, year')
      .eq('year', year)
      .single()) as { data: { id: string; year: number } | null; error: any };

    if (yearError || !academicYear) {
      if (yearError?.code === 'PGRST116') {
        // Registro não encontrado
        logger.warn(`Ano letivo ${year} não cadastrado no sistema`, { year });

        return NextResponse.json(
          {
            success: false,
            error: `Ano letivo ${year} não encontrado. Cadastre em 'Cadastrar Ano Letivo'.`,
          } as ApiResponse,
          { status: 404 }
        );
      }

      throw yearError;
    }

    // ✅ PASSO 3: Buscar bimestres do ano letivo
    const { data: bimesters, error: bimestersError } = (await supabaseAdmin
      .from('bimesters')
      .select('id, bimester_number, start_date, end_date, school_days_count')
      .eq('academic_year_id', academicYear.id)
      .order('bimester_number', { ascending: true })) as {
      data:
        | Array<{
            id: string;
            bimester_number: number;
            start_date: string;
            end_date: string;
            school_days_count: number;
          }>
        | null;
      error: any;
    };

    if (bimestersError) {
      throw bimestersError;
    }

    if (!bimesters || bimesters.length === 0) {
      logger.warn(`Ano letivo ${year} existe mas não tem bimestres cadastrados`, {
        year,
        academicYearId: academicYear.id,
      });

      return NextResponse.json(
        {
          success: false,
          error: `Ano letivo ${year} não tem bimestres cadastrados. Configure em 'Cadastrar Ano Letivo'.`,
        } as ApiResponse,
        { status: 404 }
      );
    }

    // ✅ PASSO 4: Buscar dias letivos de TODOS os bimestres em PARALELO
    const schoolDaysPromises = bimesters.map(async (bimester) => {
      const { data: schoolDays, error } = (await supabaseAdmin
        .from('school_days')
        .select('date, is_checked')
        .eq('bimester_id', bimester.id)
        .order('date', { ascending: true })) as {
        data: Array<{ date: string; is_checked: boolean }> | null;
        error: any;
      };

      if (error) {
        logger.error(`Erro ao buscar dias letivos do bimestre ${bimester.bimester_number}`, {
          bimesterId: bimester.id,
          error,
        });
        throw error;
      }

      return {
        bimester_number: bimester.bimester_number,
        start_date: bimester.start_date,
        end_date: bimester.end_date,
        school_days: schoolDays || [],
      };
    });

    // Aguardar TODAS as queries em paralelo
    const schoolDaysResults = await Promise.all(schoolDaysPromises);

    logger.info(`Dados carregados com sucesso para ano ${year}`, {
      year,
      bimestersCount: bimesters.length,
      totalSchoolDays: schoolDaysResults.reduce((sum, b) => sum + b.school_days.length, 0),
    });

    // ✅ PASSO 5: Formatar no formato legado (compatibilidade Firebase)
    const result: AcademicYearComplete = {} as AcademicYearComplete;

    schoolDaysResults.forEach((bimData) => {
      const key = BIMESTER_KEYS[bimData.bimester_number - 1] as keyof AcademicYearComplete;

      result[key] = {
        startDate: convertISOToBrazilian(bimData.start_date),
        endDate: convertISOToBrazilian(bimData.end_date),
        dates: bimData.school_days.map((d) => ({
          date: convertISOToBrazilian(d.date),
          isChecked: d.is_checked,
        })),
      };
    });

    // ✅ PASSO 6: Salvar no cache
    serverCache.set(cacheKey, result, CACHE_TTL);

    logger.info(`Cache ARMAZENADO para ano letivo ${year}`, {
      year,
      cacheKey,
      cacheTTL: `${CACHE_TTL / 1000 / 60} minutos`,
    });

    // ✅ PASSO 7: Retornar resposta
    return NextResponse.json({
      success: true,
      data: result,
      cached: false,
    } as ApiResponse);
  } catch (error) {
    logger.error('Erro ao buscar ano letivo completo', error as Error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao buscar ano letivo',
      } as ApiResponse,
      { status: 500 }
    );
  }
}
