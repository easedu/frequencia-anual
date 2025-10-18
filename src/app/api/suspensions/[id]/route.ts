/**
 * API Route: /api/suspensions/[id]
 * CRUD Individual de Suspensões
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { sanitizeObject } from '@/app/api/_middleware/validation';
import { updateSuspensionSchema } from '@/app/api/_schemas/suspensionSchemas';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type RouteParams = { params: Promise<{ id: string }> };

export const GET = withAuth(async (req: NextRequest, userId: string, context?: RouteParams) => {
  try {
    const params = await context?.params; const id = params?.id;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return errorResponse('INVALID_ID', 'ID inválido', 400);
    }

    const { data, error } = await supabaseAdmin
      .from('student_suspensions')
      .select('*, students( name, class)')
      .eq('id', id)
      .single();

    if (error || !data) return notFoundResponse('Suspensão', id);
    return successResponse({ suspension: data });
  } catch (error) {
    return handleError(error, 'GET /api/suspensions/[id]');
  }
});

export const PUT = withAuth(async (req: NextRequest, userId: string, context?: RouteParams) => {
  try {
    const params = await context?.params; const id = params?.id;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return errorResponse('INVALID_ID', 'ID inválido', 400);
    }

    const body = await req.json();
    const validation = updateSuspensionSchema.safeParse(body);
    if (!validation.success) return validationErrorResponse(validation.error.errors);

    const sanitizedData = sanitizeObject(validation.data);

    const { data: existing, error: checkError } = await supabaseAdmin
      .from('student_suspensions')
      .select('id, students(student_id)')
      .eq('id', id)
      .single();

    if (checkError || !existing) return notFoundResponse('Suspensão', id);

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (sanitizedData.dataInicio) updateData.start_date = sanitizedData.dataInicio;
    if (sanitizedData.dataFim) updateData.end_date = sanitizedData.dataFim;
    if (sanitizedData.motivo) updateData.reason = sanitizedData.motivo;
    if (sanitizedData.observacoes !== undefined) updateData.notes = sanitizedData.observacoes;

    const { error: updateError } = await supabaseAdmin
      .from('student_suspensions')
      // @ts-ignore - Supabase types are complex
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('[PUT /api/suspensions/[id]] Error:', updateError);
      return errorResponse('DATABASE_ERROR', 'Erro ao atualizar suspensão', 500);
    }

    return successResponse({ id, updated: true }, 'Suspensão atualizada com sucesso');
  } catch (error) {
    return handleError(error, 'PUT /api/suspensions/[id]');
  }
});

export const DELETE = withAuth(async (req: NextRequest, userId: string, context?: RouteParams) => {
  try {
    const params = await context?.params; const id = params?.id;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return errorResponse('INVALID_ID', 'ID inválido', 400);
    }

    const { data: existing, error: checkError } = await supabaseAdmin
      .from('student_suspensions')
      .select('id, students(student_id)')
      .eq('id', id)
      .single();

    if (checkError || !existing) return notFoundResponse('Suspensão', id);

    const { error: deleteError } = await supabaseAdmin
      .from('student_suspensions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DELETE /api/suspensions/[id]] Error:', deleteError);
      return errorResponse('DATABASE_ERROR', 'Erro ao deletar suspensão', 500);
    }

    return successResponse({ id, deleted: true }, 'Suspensão deletada com sucesso');
  } catch (error) {
    return handleError(error, 'DELETE /api/suspensions/[id]');
  }
});
