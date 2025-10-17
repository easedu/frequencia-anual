/**
 * API Route: /api/suspensions
 * CRUD de Suspensões de Estudantes
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { validateQueryParams, sanitizeObject } from '@/app/api/_middleware/validation';
import { createSuspensionSchema, suspensionQuerySchema } from '@/app/api/_schemas/suspensionSchemas';
import { successResponse, errorResponse, validationErrorResponse, paginatedResponse } from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const validation = validateQueryParams(req, suspensionQuerySchema);
    if (!validation.success) return validation.response;

    const { estudanteId, dataInicio, dataFim, page, limit } = validation.data;

    let query: any = supabaseAdmin
      .from('student_suspensions')
      .select('*, students!inner(user_id, name, class)', { count: 'exact' })
      .eq('students.user_id', userId)
      .order('start_date', { ascending: false });

    if (estudanteId) query = query.eq('student_id', estudanteId);
    if (dataInicio) query = query.gte('start_date', dataInicio);
    if (dataFim) query = query.lte('end_date', dataFim);

    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      console.error('[GET /api/suspensions] Error:', error);
      return errorResponse('DATABASE_ERROR', 'Erro ao buscar suspensões', 500);
    }

    return paginatedResponse(data || [], page, limit, count || 0);
  } catch (error) {
    return handleError(error, 'GET /api/suspensions');
  }
});

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const body = await req.json();
    const validation = createSuspensionSchema.safeParse(body);
    if (!validation.success) return validationErrorResponse(validation.error.errors);

    const sanitizedData = sanitizeObject(validation.data);

    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('id', sanitizedData.estudanteId)
      .eq('user_id', userId)
      .eq('deleted', false)
      .single();

    if (studentError || !student) {
      return errorResponse('NOT_FOUND', 'Estudante não encontrado', 404);
    }

    const suspensionInsert: any = {
      student_id: sanitizedData.estudanteId,
      start_date: sanitizedData.dataInicio,
      end_date: sanitizedData.dataFim,
      reason: sanitizedData.motivo,
      notes: sanitizedData.observacoes || null,
      school_year: new Date().getFullYear().toString(),
    };

    const { data: suspensionData, error: suspensionError } = (await supabaseAdmin
      .from('student_suspensions')
      .insert(suspensionInsert)
      .select('id')
      .single()) as { data: any; error: any };

    if (suspensionError) {
      console.error('[POST /api/suspensions] Error:', suspensionError);
      return errorResponse('DATABASE_ERROR', 'Erro ao criar suspensão', 500);
    }

    return successResponse({ id: suspensionData.id }, 'Suspensão criada com sucesso', 201);
  } catch (error) {
    return handleError(error, 'POST /api/suspensions');
  }
});
