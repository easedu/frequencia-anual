/**
 * API Route: /api/medical-certificates/[id]
 * CRUD Individual de Atestados M\u00e9dicos
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { sanitizeObject } from '@/app/api/_middleware/validation';
import { updateMedicalCertificateSchema } from '@/app/api/_schemas/medicalCertificateSchemas';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type RouteParams = { params: Promise<{ id: string }> };

export const GET = withAuth(async (req: NextRequest, userId: string, context?: RouteParams) => {
  try {
    const params = await context?.params; const id = params?.id;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return errorResponse('INVALID_ID', 'ID inv\u00e1lido', 400);
    }

    const { data, error } = await supabaseAdmin
      .from('medical_certificates')
      .select('*, students( name, class)')
      .eq('id', id)
      .single();

    if (error || !data) return notFoundResponse('Atestado', id);
    return successResponse({ certificate: data });
  } catch (error) {
    return handleError(error, 'GET /api/medical-certificates/[id]');
  }
});

export const PUT = withAuth(async (req: NextRequest, userId: string, context?: RouteParams) => {
  try {
    const params = await context?.params; const id = params?.id;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return errorResponse('INVALID_ID', 'ID inv\u00e1lido', 400);
    }

    const body = await req.json();
    const validation = updateMedicalCertificateSchema.safeParse(body);
    if (!validation.success) return validationErrorResponse(validation.error.errors);

    const sanitizedData = sanitizeObject(validation.data);

    const { data: existing, error: checkError } = await supabaseAdmin
      .from('medical_certificates')
      .select('id, students(student_id)')
      .eq('id', id)
      .single();

    if (checkError || !existing) return notFoundResponse('Atestado', id);

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (sanitizedData.dataInicio) updateData.start_date = sanitizedData.dataInicio;
    if (sanitizedData.dataFim) updateData.end_date = sanitizedData.dataFim;
    if (sanitizedData.motivo !== undefined) updateData.reason = sanitizedData.motivo;
    if (sanitizedData.observacoes !== undefined) updateData.notes = sanitizedData.observacoes;
    if (sanitizedData.arquivoUrl !== undefined) updateData.file_url = sanitizedData.arquivoUrl;

    const { error: updateError } = await supabaseAdmin
      .from('medical_certificates')
      // @ts-ignore - Supabase types are complex
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('[PUT /api/medical-certificates/[id]] Error:', updateError);
      return errorResponse('DATABASE_ERROR', 'Erro ao atualizar atestado', 500);
    }

    return successResponse({ id, updated: true }, 'Atestado atualizado com sucesso');
  } catch (error) {
    return handleError(error, 'PUT /api/medical-certificates/[id]');
  }
});

export const DELETE = withAuth(async (req: NextRequest, userId: string, context?: RouteParams) => {
  try {
    const params = await context?.params; const id = params?.id;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return errorResponse('INVALID_ID', 'ID inv\u00e1lido', 400);
    }

    const { data: existing, error: checkError } = await supabaseAdmin
      .from('medical_certificates')
      .select('id, students(student_id)')
      .eq('id', id)
      .single();

    if (checkError || !existing) return notFoundResponse('Atestado', id);

    const { error: deleteError } = await supabaseAdmin
      .from('medical_certificates')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DELETE /api/medical-certificates/[id]] Error:', deleteError);
      return errorResponse('DATABASE_ERROR', 'Erro ao deletar atestado', 500);
    }

    return successResponse({ id, deleted: true }, 'Atestado deletado com sucesso');
  } catch (error) {
    return handleError(error, 'DELETE /api/medical-certificates/[id]');
  }
});
