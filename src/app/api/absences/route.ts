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

// ============================================================================
// GET /api/absences - Listar faltas com filtros
// ============================================================================

export const GET = withAuth(async (req: NextRequest, userId: string) => {
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

    // 3. Construir query no Supabase
    let query: any = supabaseAdmin
      .from('student_absences')
      .select('*, students(name, class, student_id)', { count: 'exact' })
      .order('absence_date', { ascending: false });

    // Aplicar filtros
    if (internalStudentId) {
      query = query.eq('student_id', internalStudentId);
    }

    if (bimestre) {
      query = query.eq('bimester', bimestre);
    }

    if (justificada !== undefined) {
      query = query.eq('is_justified', justificada);
    }

    if (dataInicio) {
      // Formato DDMMYYYY → converter para comparação
      query = query.gte('absence_date', dataInicio);
    }

    if (dataFim) {
      query = query.lte('absence_date', dataFim);
    }

    if (turma) {
      query = query.eq('students.class', turma);
    }

    // Paginação
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // 3. Executar query
    const { data, error, count } = await query;

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

    // 4. Converter para formato legacy
    const absences = (data || []).map(convertSupabaseToAbsence);

    // 5. Retornar com paginação
    return paginatedResponse(absences, page, limit, count || 0);
  } catch (error) {
    return handleError(error, 'GET /api/absences');
  }
});

// ============================================================================
// POST /api/absences - Criar nova falta
// ============================================================================

export const POST = withAuth(async (req: NextRequest, userId: string) => {
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

    // ✅ Converter DDMMYYYY → YYYY-MM-DD (formato do Supabase)
    const convertToISODate = (date: string): string => {
      if (date.match(/^\d{8}$/)) {
        // Format: DDMMYYYY → YYYY-MM-DD
        const day = date.substring(0, 2);
        const month = date.substring(2, 4);
        const year = date.substring(4, 8);
        return `${year}-${month}-${day}`;
      }
      return date; // Já está em YYYY-MM-DD
    };

    const absenceDate = convertToISODate(sanitizedData.data);

    // 4. Resolver Firebase UUID para Internal ID
    const internalStudentId = await resolveFirebaseUUIDToInternal(sanitizedData.estudanteId);

    if (!internalStudentId) {
      return errorResponse(
        'NOT_FOUND',
        `Estudante não encontrado com ID: ${sanitizedData.estudanteId}`,
        404
      );
    }

    // 5. Verificar se estudante não está deletado
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('id', internalStudentId)
      .eq('deleted', false)
      .single();

    if (studentError || !student) {
      return errorResponse(
        'NOT_FOUND',
        'Estudante não encontrado ou foi removido',
        404
      );
    }

    // 6. Verificar se já existe falta para esta data (prevenir duplicatas)
    const { data: existingAbsence } = await supabaseAdmin
      .from('student_absences')
      .select('id')
      .eq('student_id', internalStudentId)
      .eq('absence_date', absenceDate)
      .single();

    if (existingAbsence) {
      return errorResponse(
        'CONFLICT',
        'Já existe uma falta registrada para este estudante nesta data',
        409
      );
    }

    // 7. Preparar dados para Supabase
    const absenceInsert: any = {
      student_id: internalStudentId,
      absence_date: absenceDate,
      bimester: sanitizedData.bimestre,
      is_justified: sanitizedData.justificada ?? false,
      medical_certificate_id: sanitizedData.atestadoId || null,
    };

    // 8. Inserir falta
    const { data: absenceData, error: absenceError } = (await supabaseAdmin
      .from('student_absences')
      .insert(absenceInsert)
      .select('id')
      .single()) as { data: any; error: any };

    if (absenceError) {
      console.error('[POST /api/absences] Error inserting absence:', absenceError);
      return errorResponse(
        'DATABASE_ERROR',
        'Erro ao criar falta',
        500,
        process.env.NODE_ENV === 'development' ? absenceError : undefined
      );
    }

    // 9. Retornar sucesso
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converte StudentAbsence do Supabase para formato legacy
 */
function convertSupabaseToAbsence(absence: any): any {
  return {
    id: absence.id,
    estudanteId: absence.students?.student_id || absence.student_id, // ✅ Firebase UUID, não Internal ID
    estudanteNome: absence.students?.name || 'Nome não disponível',
    turma: absence.students?.class || 'Turma não disponível',
    data: absence.absence_date,
    bimestre: absence.bimester,
    justificada: absence.is_justified,
    motivoJustificativa: undefined, // Coluna não existe
    atestadoId: absence.medical_certificate_id || undefined,
    observacoes: undefined, // Coluna não existe
    anoLetivo: new Date().getFullYear().toString(), // Calcular do absence_date
    criadoPor: 'system', // Coluna não existe
    criadoEm: absence.created_at,
  };
}
