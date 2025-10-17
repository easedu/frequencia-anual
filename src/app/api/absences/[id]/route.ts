/**
 * API Route: /api/absences/[id]
 *
 * CRUD de Falta Individual
 * - GET: Buscar falta por ID
 * - PUT: Atualizar falta
 * - DELETE: Deletar falta
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { sanitizeObject } from '@/app/api/_middleware/validation';
import {
  updateAbsenceSchema,
  UpdateAbsenceInput,
} from '@/app/api/_schemas/absenceSchemas';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Tipo para os parâmetros da rota
type RouteParams = {
  params: {
    id: string;
  };
};

// ============================================================================
// GET /api/absences/[id] - Buscar falta por ID
// ============================================================================

export const GET = withAuth(
  async (req: NextRequest, userId: string, context?: RouteParams) => {
    try {
      const params = context?.params;
      const id = params?.id;

      if (!id) {
        return errorResponse('INVALID_PARAMS', 'ID da falta não fornecido', 400);
      }

      // Validar UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return errorResponse('INVALID_ID', 'ID da falta deve ser um UUID válido', 400);
      }

      // Buscar falta no Supabase com verificação de permissão
      const { data, error } = await supabaseAdmin
        .from('student_absences')
        .select('*, students!inner(user_id, name, class)')
        .eq('id', id)
        .eq('students.user_id', userId) // RLS - apenas faltas de estudantes do usuário
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return notFoundResponse('Falta', id);
        }

        console.error('[GET /api/absences/[id]] Supabase error:', error);
        return errorResponse(
          'DATABASE_ERROR',
          'Erro ao buscar falta',
          500,
          process.env.NODE_ENV === 'development' ? error : undefined
        );
      }

      if (!data) {
        return notFoundResponse('Falta', id);
      }

      // Converter para formato legacy
      const absence = convertSupabaseToAbsence(data);

      return successResponse({ absence });
    } catch (error) {
      return handleError(error, 'GET /api/absences/[id]');
    }
  }
);

// ============================================================================
// PUT /api/absences/[id] - Atualizar falta
// ============================================================================

export const PUT = withAuth(
  async (req: NextRequest, userId: string, context?: RouteParams) => {
    try {
      const params = context?.params;
      const id = params?.id;

      if (!id) {
        return errorResponse('INVALID_PARAMS', 'ID da falta não fornecido', 400);
      }

      // Validar UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return errorResponse('INVALID_ID', 'ID da falta deve ser um UUID válido', 400);
      }

      // 1. Parse body
      const body = await req.json();

      // 2. Validar com Zod
      const validation = updateAbsenceSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error.errors);
      }

      const data = validation.data as UpdateAbsenceInput;

      // 3. Sanitizar dados
      const sanitizedData = sanitizeObject(data);

      // 4. Verificar se falta existe e pertence ao usuário
      const { data: existingAbsence, error: checkError } = await supabaseAdmin
        .from('student_absences')
        .select('id, students!inner(user_id)')
        .eq('id', id)
        .eq('students.user_id', userId)
        .single();

      if (checkError || !existingAbsence) {
        return notFoundResponse('Falta', id);
      }

      // 5. Preparar dados para atualização
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (sanitizedData.data) updateData.date = sanitizedData.data;
      if (sanitizedData.bimestre) updateData.bimester = sanitizedData.bimestre;
      if (sanitizedData.justificada !== undefined)
        updateData.justified = sanitizedData.justificada;
      if (sanitizedData.motivoJustificativa !== undefined)
        updateData.justification_reason = sanitizedData.motivoJustificativa;
      if (sanitizedData.atestadoId !== undefined)
        updateData.medical_certificate_id = sanitizedData.atestadoId;
      if (sanitizedData.observacoes !== undefined)
        updateData.notes = sanitizedData.observacoes;

      // 6. Atualizar falta
      const { error: updateError } = await supabaseAdmin
        .from('student_absences')
        // @ts-ignore - Supabase types are complex, updateData is validated
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('[PUT /api/absences/[id]] Error updating absence:', updateError);
        return errorResponse(
          'DATABASE_ERROR',
          'Erro ao atualizar falta',
          500,
          process.env.NODE_ENV === 'development' ? updateError : undefined
        );
      }

      // 7. Retornar sucesso
      return successResponse(
        {
          id,
          updated: true,
        },
        'Falta atualizada com sucesso'
      );
    } catch (error) {
      return handleError(error, 'PUT /api/absences/[id]');
    }
  }
);

// ============================================================================
// DELETE /api/absences/[id] - Deletar falta
// ============================================================================

export const DELETE = withAuth(
  async (req: NextRequest, userId: string, context?: RouteParams) => {
    try {
      const params = context?.params;
      const id = params?.id;

      if (!id) {
        return errorResponse('INVALID_PARAMS', 'ID da falta não fornecido', 400);
      }

      // Validar UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return errorResponse('INVALID_ID', 'ID da falta deve ser um UUID válido', 400);
      }

      // 1. Verificar se falta existe e pertence ao usuário
      const { data: existingAbsence, error: checkError } = await supabaseAdmin
        .from('student_absences')
        .select('id, students!inner(user_id)')
        .eq('id', id)
        .eq('students.user_id', userId)
        .single();

      if (checkError || !existingAbsence) {
        return notFoundResponse('Falta', id);
      }

      // 2. Deletar falta (hard delete)
      const { error: deleteError } = await supabaseAdmin
        .from('student_absences')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('[DELETE /api/absences/[id]] Error deleting absence:', deleteError);
        return errorResponse(
          'DATABASE_ERROR',
          'Erro ao deletar falta',
          500,
          process.env.NODE_ENV === 'development' ? deleteError : undefined
        );
      }

      // 3. Retornar sucesso
      return successResponse(
        {
          id,
          deleted: true,
        },
        'Falta deletada com sucesso'
      );
    } catch (error) {
      return handleError(error, 'DELETE /api/absences/[id]');
    }
  }
);

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
    atualizadoEm: absence.updated_at,
  };
}
