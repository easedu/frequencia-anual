/**
 * API Route: /api/interactions
 * CRUD de Interações Familiares
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { validateQueryParams, sanitizeObject } from '@/app/api/_middleware/validation';
import { createInteractionSchema, interactionQuerySchema } from '@/app/api/_schemas/interactionSchemas';
import { successResponse, errorResponse, validationErrorResponse, paginatedResponse } from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const validation = validateQueryParams(req, interactionQuerySchema);
    if (!validation.success) return validation.response;

    const { estudanteId, tipo, dataInicio, dataFim, responsavel, page, limit } = validation.data;

    let query: any = supabaseAdmin
      .from('family_interactions')
      .select('*, students!inner(user_id, name, class)', { count: 'exact' })
      .eq('students.user_id', userId)
      .order('interaction_date', { ascending: false });

    if (estudanteId) query = query.eq('student_id', estudanteId);
    if (tipo) query = query.eq('interaction_type', tipo);
    if (responsavel) query = query.ilike('contact_person', `%${responsavel}%`);
    if (dataInicio) query = query.gte('interaction_date', dataInicio);
    if (dataFim) query = query.lte('interaction_date', dataFim);

    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[GET /api/interactions] Error:', error);
      return errorResponse('DATABASE_ERROR', 'Erro ao buscar interações', 500);
    }

    return paginatedResponse(data || [], page, limit, count || 0);
  } catch (error) {
    return handleError(error, 'GET /api/interactions');
  }
});

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const body = await req.json();
    const validation = createInteractionSchema.safeParse(body);
    if (!validation.success) return validationErrorResponse(validation.error.errors);

    const sanitizedData = sanitizeObject(validation.data);

    // Verificar se estudante pertence ao usuário
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('id', sanitizedData.estudanteId)
      .eq('user_id', userId)
      .single();

    if (studentError || !student) {
      return errorResponse('NOT_FOUND', 'Estudante não encontrado', 404);
    }

    const insertData = {
      student_id: sanitizedData.estudanteId,
      interaction_date: sanitizedData.data,
      interaction_type: sanitizedData.tipo,
      contact_person: sanitizedData.responsavel,
      subject: sanitizedData.assunto,
      description: sanitizedData.descricao,
      notes: sanitizedData.observacoes || null,
      next_action: sanitizedData.proximaAcao || null,
      next_action_date: sanitizedData.dataProximaAcao || null,
      version: '3.0',
    };

    const { data, error } = (await supabaseAdmin
      .from('family_interactions')
      .insert(insertData as any)
      .select('id')
      .single()) as { data: any; error: any };

    if (error) {
      console.error('[POST /api/interactions] Error:', error);
      return errorResponse('DATABASE_ERROR', 'Erro ao criar interação', 500);
    }

    return successResponse({ id: data.id }, 'Interação criada com sucesso', 201);
  } catch (error) {
    return handleError(error, 'POST /api/interactions');
  }
});
