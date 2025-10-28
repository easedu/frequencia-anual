/**
 * API Route: /api/absences
 *
 * CRUD de Faltas de Estudantes
 * - GET: Listar faltas com filtros
 * - POST: Criar nova falta
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { validateQueryParams, sanitizeObject } from '@/app/api/_middleware/validation';
import {
  createAbsenceSchema,
  absenceQuerySchema,
  CreateAbsenceInput,
} from '@/app/api/_schemas/absenceSchemas';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  paginatedResponse,
} from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { resolveFirebaseUUIDToInternal } from '@/app/api/_utils/studentIdResolver';
import { getCountStrategy } from '@/app/api/_utils/countStrategy';

// ════════════════════════════════════════════════════════════════
// RUNTIME CONFIG (Vercel) - Suporte para redes lentas 2G/3G
// ════════════════════════════════════════════════════════════════

export const runtime = 'nodejs';
export const maxDuration = 60;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converte data de DDMMYYYY para YYYY-MM-DD (formato ISO do Supabase)
 */
function convertToISODate(date: string): string {
  if (date.match(/^\d{8}$/)) {
    // Format: DDMMYYYY → YYYY-MM-DD
    const day = date.substring(0, 2);
    const month = date.substring(2, 4);
    const year = date.substring(4, 8);
    return `${year}-${month}-${day}`;
  }
  return date; // Já está em YYYY-MM-DD
}

/**
 * Converte bimestre de string ('B1', 'B2', etc.) para number (1, 2, etc.)
 */
function convertBimesterToNumber(bimestre: 'B1' | 'B2' | 'B3' | 'B4'): number {
  const map: Record<string, number> = { B1: 1, B2: 2, B3: 3, B4: 4 };
  return map[bimestre];
}

interface SupabaseAbsence {
  id: string;
  student_id: string;
  absence_date: string;
  bimester: number;
  is_justified: boolean;
  medical_certificate_id?: string | null;
  suspension_id?: string | null;
  created_at: string;
  students?: {
    student_id: string;
    name: string;
    class: string;
  };
}

interface LegacyAbsence {
  id: string;
  estudanteId: string;
  student_id: string;
  estudanteNome: string;
  turma: string;
  data: string;
  absence_date: string;
  bimestre: number;
  justificada: boolean;
  justified: boolean;
  is_justified: boolean;
  motivoJustificativa: undefined;
  atestadoId?: string;
  suspensaoId?: string;
  observacoes: undefined;
  anoLetivo: string;
  criadoPor: string;
  criadoEm: string;
}

/**
 * Converte StudentAbsence do Supabase para formato legacy
 */
function convertSupabaseToAbsence(absence: SupabaseAbsence): LegacyAbsence {
  return {
    id: absence.id,
    estudanteId: absence.students?.student_id || absence.student_id, // ✅ Firebase UUID (legacy)
    student_id: absence.student_id, // ✅ Internal ID (para comparações)
    estudanteNome: absence.students?.name || 'Nome não disponível',
    turma: absence.students?.class || 'Turma não disponível',
    data: absence.absence_date, // ✅ Formato legacy (YYYY-MM-DD)
    absence_date: absence.absence_date, // ✅ Formato Supabase (para compatibilidade)
    bimestre: absence.bimester,
    justificada: absence.is_justified, // ✅ Formato legacy
    justified: absence.is_justified, // ✅ Alias
    is_justified: absence.is_justified, // ✅ Formato Supabase (para compatibilidade)
    motivoJustificativa: undefined, // Coluna não existe
    atestadoId: absence.medical_certificate_id || undefined,
    suspensaoId: absence.suspension_id || undefined,
    observacoes: undefined, // Coluna não existe
    anoLetivo: new Date().getFullYear().toString(),
    criadoPor: 'system',
    criadoEm: absence.created_at,
  };
}

// ============================================================================
// GET /api/absences - Listar faltas com filtros
// ============================================================================

export const GET = withAuth(async (req: NextRequest) => {
  try {
    // 1. Validar query params
    const validation = validateQueryParams(req, absenceQuerySchema);

    if (!validation.success) {
      return validation.response;
    }

    const {
      estudanteId,
      bimestre,
      justificada,
      dataInicio,
      dataFim,
      turma,
      page,
      limit,
    } = validation.data;

    // 2. Resolver Firebase UUID para Internal ID (se fornecido)
    let internalStudentId: string | undefined = undefined;

    if (estudanteId) {
      const resolved = await resolveFirebaseUUIDToInternal(estudanteId);

      if (!resolved) {
        return errorResponse(
          'NOT_FOUND',
          `Estudante não encontrado com ID: ${estudanteId}`,
          404
        );
      }

      internalStudentId = resolved;
    }

    // 3. Se filtro por turma, buscar Internal IDs primeiro
    let studentIdsFilter: string[] | undefined = undefined;

    if (turma) {
      const { data: studentsInClass, error: classError } = (await supabaseAdmin
        .from('students')
        .select('id')
        .eq('class', turma)
        .eq('deleted', false)) as { data: { id: string }[] | null; error: unknown };

      if (classError) {
        console.error('[GET /api/absences] Error fetching students by class:', classError);
        return errorResponse(
          'DATABASE_ERROR',
          'Erro ao buscar estudantes da turma',
          500
        );
      }

      // Se não há estudantes na turma, retornar vazio
      if (!studentsInClass || studentsInClass.length === 0) {
        return paginatedResponse([], page, limit, 0);
      }

      studentIdsFilter = studentsInClass.map((s) => s.id);
    }

    // 4. Construir query no Supabase
    // ✅ FASE 4.1: Otimizar count (estimated na 1ª página, planned depois)
    const countOption = getCountStrategy(page);

    let query = supabaseAdmin
      .from('student_absences')
      .select('*, students(name, class, student_id)', countOption)
      .order('absence_date', { ascending: false });

    // Aplicar filtros
    if (internalStudentId) {
      query = query.eq('student_id', internalStudentId);
    }

    if (studentIdsFilter) {
      query = query.in('student_id', studentIdsFilter);
    }

    if (bimestre) {
      query = query.eq('bimester', bimestre);
    }

    if (justificada !== undefined) {
      query = query.eq('is_justified', justificada);
    }

    if (dataInicio) {
      // Formato DDMMYYYY → converter para YYYY-MM-DD
      const dataInicioISO = convertToISODate(dataInicio);
      query = query.gte('absence_date', dataInicioISO);
    }

    if (dataFim) {
      // Formato DDMMYYYY → converter para YYYY-MM-DD
      const dataFimISO = convertToISODate(dataFim);
      query = query.lte('absence_date', dataFimISO);
    }

    // Paginação
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // ⚠️ IMPORTANTE: Supabase tem limite padrão de 1000 registros!
    // Precisamos usar AMBOS .range() E verificar se limit > 1000
    query = query.range(from, to);

    // Se limit > 1000, precisamos setar explicitamente (Supabase JS não respeita range > 1000)
    // A solução é usar APENAS range, que já define o tamanho da página
    // Ref: https://supabase.com/docs/reference/javascript/limit

    // 5. Executar query
    const { data, error, count } = (await query) as {
      data: SupabaseAbsence[] | null;
      error: { message?: string; code?: string; details?: string; hint?: string } | null;
      count: number | null;
    };

    if (error) {
      console.error('[GET /api/absences] Supabase error:', error);
      console.error('[GET /api/absences] Error message:', error.message);
      console.error('[GET /api/absences] Error code:', error.code);
      console.error('[GET /api/absences] Error details:', error.details);
      console.error('[GET /api/absences] Error hint:', error.hint);

      // Retornar erro detalhado no response para debug
      return NextResponse.json({
        success: false,
        error: 'DATABASE_ERROR',
        message: error.message || 'Erro ao buscar faltas',
        debug: {
          code: error.code,
          details: error.details,
          hint: error.hint,
          message: error.message,
        }
      }, { status: 500 });
    }

    // 6. Converter para formato legacy
    const absences = (data || []).map(convertSupabaseToAbsence);

    // 7. Retornar com paginação
    return paginatedResponse(absences, page, limit, count || 0);
  } catch (error) {
    return handleError(error, 'GET /api/absences');
  }
});

// ============================================================================
// POST /api/absences - Criar nova falta
// ============================================================================

export const POST = withAuth(async (req: NextRequest) => {
  try {
    // 1. Parse body
    const body = await req.json();

    // 2. Validar com Zod
    const validation = createAbsenceSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(validation.error.errors);
    }

    const data = validation.data as CreateAbsenceInput;

    // 3. Sanitizar dados
    const sanitizedData = sanitizeObject(data);

    // 4. Converter DDMMYYYY → YYYY-MM-DD (formato do Supabase)
    const absenceDate = convertToISODate(sanitizedData.data);

    // 5. Resolver Firebase UUID para Internal ID
    const internalStudentId = await resolveFirebaseUUIDToInternal(sanitizedData.estudanteId);

    if (!internalStudentId) {
      return errorResponse(
        'NOT_FOUND',
        `Estudante não encontrado com ID: ${sanitizedData.estudanteId}`,
        404
      );
    }

    // 6. Verificar se estudante não está deletado
    const { data: student, error: studentError } = (await supabaseAdmin
      .from('students')
      .select('id')
      .eq('id', internalStudentId)
      .eq('deleted', false)
      .single()) as { data: { id: string } | null; error: unknown };

    if (studentError || !student) {
      return errorResponse(
        'NOT_FOUND',
        'Estudante não encontrado ou foi removido',
        404
      );
    }

    // 7. Verificar se já existe falta para esta data (prevenir duplicatas)
    const { data: existingAbsence } = (await supabaseAdmin
      .from('student_absences')
      .select('id')
      .eq('student_id', internalStudentId)
      .eq('absence_date', absenceDate)
      .single()) as { data: { id: string } | null };

    if (existingAbsence) {
      return errorResponse(
        'CONFLICT',
        'Já existe uma falta registrada para este estudante nesta data',
        409
      );
    }

    // 8. Preparar dados para Supabase
    const absenceInsert = {
      student_id: internalStudentId,
      absence_date: absenceDate,
      bimester: sanitizedData.bimestre ? convertBimesterToNumber(sanitizedData.bimestre) : null,
      is_justified: sanitizedData.justificada ?? false,
      medical_certificate_id: sanitizedData.atestadoId || null,
    };

    // 9. Inserir falta
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: absenceData, error: absenceError } = (await (supabaseAdmin as any)
      .from('student_absences')
      .insert(absenceInsert)
      .select('id')
      .single()) as { data: { id: string } | null; error: unknown };

    if (absenceError) {
      console.error('[POST /api/absences] Error inserting absence:', absenceError);
      return errorResponse(
        'DATABASE_ERROR',
        'Erro ao criar falta',
        500,
        process.env.NODE_ENV === 'development' ? absenceError : undefined
      );
    }

    if (!absenceData) {
      return errorResponse(
        'DATABASE_ERROR',
        'Erro ao criar falta: dados não retornados',
        500
      );
    }

    // 10. Retornar sucesso
    return successResponse(
      {
        id: absenceData.id,
      },
      'Falta registrada com sucesso',
      201
    );
  } catch (error) {
    return handleError(error, 'POST /api/absences');
  }
});
