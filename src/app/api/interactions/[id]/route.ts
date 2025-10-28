/**
 * API Route: /api/interactions/[id]
 * CRUD Individual de Interações Familiares
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { sanitizeObject } from '@/app/api/_middleware/validation';
import { updateInteractionSchema } from '@/app/api/_schemas/interactionSchemas';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type RouteParams = { params: Promise<{ id: string }> };

export const GET = withAuth(async (req: NextRequest, userId: string, context?: RouteParams) => {
  try {
    const params = await context?.params;
    const id = params?.id;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return errorResponse('INVALID_ID', 'ID inválido', 400);
    }

    const { data, error } = await supabaseAdmin
      .from('family_interactions')
      .select('*, students( name, class)')
      .eq('id', id)
      .single();

    if (error || !data) return notFoundResponse('Interação', id);
    return successResponse({ interaction: data });
  } catch (error) {
    return handleError(error, 'GET /api/interactions/[id]');
  }
});

export const PUT = withAuth(async (req: NextRequest, userId: string, context?: RouteParams) => {
  try {
    const params = await context?.params;
    const id = params?.id;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return errorResponse('INVALID_ID', 'ID inválido', 400);
    }

    const body = await req.json();
    const validation = updateInteractionSchema.safeParse(body);
    if (!validation.success) return validationErrorResponse(validation.error.errors);

    const sanitizedData = sanitizeObject(validation.data);

    const { data: existing, error: checkError } = await supabaseAdmin
      .from('family_interactions')
      .select('id, students(student_id)')
      .eq('id', id)
      .single();

    if (checkError || !existing) return notFoundResponse('Interação', id);

    const updateData: {
      updated_at: string;
      interaction_date?: string;
      interaction_type?: string;
      contact_person?: string;
      subject?: string;
      description?: string;
      notes?: string | null;
      next_action?: string | null;
      next_action_date?: string | null;
    } = { updated_at: new Date().toISOString() };

    if (sanitizedData.data) updateData.interaction_date = sanitizedData.data;
    if (sanitizedData.tipo) updateData.interaction_type = sanitizedData.tipo;
    if (sanitizedData.responsavel) updateData.contact_person = sanitizedData.responsavel;
    if (sanitizedData.assunto) updateData.subject = sanitizedData.assunto;
    if (sanitizedData.descricao) updateData.description = sanitizedData.descricao;
    if (sanitizedData.observacoes !== undefined) updateData.notes = sanitizedData.observacoes;
    if (sanitizedData.proximaAcao !== undefined) updateData.next_action = sanitizedData.proximaAcao;
    if (sanitizedData.dataProximaAcao !== undefined) updateData.next_action_date = sanitizedData.dataProximaAcao;

    // Type assertion necessário devido à complexidade dos tipos do Supabase
    const { error: updateError } = await (supabaseAdmin
      .from('family_interactions')
      // @ts-expect-error - Supabase types are overly restrictive for dynamic updates
      .update(updateData)
      .eq('id', id) as unknown as Promise<{ error: unknown }>);

    if (updateError) {
      console.error('[PUT /api/interactions/[id]] Error:', updateError);
      return errorResponse('DATABASE_ERROR', 'Erro ao atualizar interação', 500);
    }

    return successResponse({ id, updated: true }, 'Interação atualizada com sucesso');
  } catch (error) {
    return handleError(error, 'PUT /api/interactions/[id]');
  }
});

export const DELETE = withAuth(async (req: NextRequest, userId: string, context?: RouteParams) => {
  try {
    const params = await context?.params;
    const id = params?.id;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      console.error('[DELETE /api/interactions/[id]] Invalid ID format:', id);
      return errorResponse('INVALID_ID', 'ID inválido', 400);
    }

    console.log('[DELETE /api/interactions/[id]] Attempting to delete interaction with ID:', id);

    const { data: existing, error: checkError } = await supabaseAdmin
      .from('family_interactions')
      .select('id, students(student_id)')
      .eq('id', id)
      .single();

    if (checkError) {
      console.error('[DELETE /api/interactions/[id]] Error finding interaction:', checkError);
    }

    if (!existing) {
      console.warn('[DELETE /api/interactions/[id]] Interaction not found in database:', id);
    }

    if (checkError || !existing) return notFoundResponse('Interação', id);

    const { error: deleteError } = await supabaseAdmin
      .from('family_interactions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DELETE /api/interactions/[id]] Error:', deleteError);
      return errorResponse('DATABASE_ERROR', 'Erro ao deletar interação', 500);
    }

    return successResponse({ id, deleted: true }, 'Interação deletada com sucesso');
  } catch (error) {
    return handleError(error, 'DELETE /api/interactions/[id]');
  }
});
