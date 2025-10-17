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

    // 2. Construir query no Supabase
    let query: any = supabaseAdmin
      .from('student_absences')
      .select('*, students!inner(user_id, name, class)', { count: 'exact' })
      .eq('students.user_id', userId) // RLS - apenas faltas de estudantes do usuário
      .order('date', { ascending: false });

    // Aplicar filtros
    if (estudanteId) {
      query = query.eq('student_id', estudanteId);
    }

    if (bimestre) {
      query = query.eq('bimester', bimestre);
    }

    if (justificada !== undefined) {
      query = query.eq('justified', justificada);
    }

    if (dataInicio) {
      // Formato DDMMYYYY → converter para comparação
      query = query.gte('date', dataInicio);
    }

    if (dataFim) {
      query = query.lte('date', dataFim);
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
      return errorResponse(
        'DATABASE_ERROR',
        'Erro ao buscar faltas',
        500,
        process.env.NODE_ENV === 'development' ? error : undefined
      );
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

    // 4. Verificar se estudante existe e pertence ao usuário
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('id', sanitizedData.estudanteId)
      .eq('user_id', userId)
      .eq('deleted', false)
      .single();

    if (studentError || !student) {
      return errorResponse(
        'NOT_FOUND',
        'Estudante não encontrado ou não pertence ao usuário',
        404
      );
    }

    // 5. Verificar se já existe falta para esta data (prevenir duplicatas)
    const { data: existingAbsence } = await supabaseAdmin
      .from('student_absences')
      .select('id')
      .eq('student_id', sanitizedData.estudanteId)
      .eq('date', sanitizedData.data)
      .single();

    if (existingAbsence) {
      return errorResponse(
        'CONFLICT',
        'Já existe uma falta registrada para este estudante nesta data',
        409
      );
    }

    // 6. Preparar dados para Supabase
    const absenceInsert: any = {
      student_id: sanitizedData.estudanteId,
      date: sanitizedData.data,
      bimester: sanitizedData.bimestre,
      justified: sanitizedData.justificada ?? false,
      justification_reason: sanitizedData.motivoJustificativa || null,
      medical_certificate_id: sanitizedData.atestadoId || null,
      notes: sanitizedData.observacoes || null,
      school_year: new Date().getFullYear().toString(),
      created_by: 'api',
    };

    // 7. Inserir falta
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

    // 8. Retornar sucesso
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
    estudanteId: absence.student_id,
    estudanteNome: absence.students?.name || '',
    turma: absence.students?.class || '',
    data: absence.date,
    bimestre: absence.bimester,
    justificada: absence.justified,
    motivoJustificativa: absence.justification_reason || undefined,
    atestadoId: absence.medical_certificate_id || undefined,
    observacoes: absence.notes || undefined,
    anoLetivo: absence.school_year,
    criadoPor: absence.created_by,
    criadoEm: absence.created_at,
  };
}
