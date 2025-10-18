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
import { resolveFirebaseUUIDToInternal } from '@/app/api/_utils/studentIdResolver';

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const validation = validateQueryParams(req, interactionQuerySchema);
    if (!validation.success) return validation.response;

    const { estudanteId, tipo, dataInicio, dataFim, responsavel, page, limit } = validation.data;

    // Resolver Firebase UUID para Internal ID (se fornecido)
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

    let query: any = supabaseAdmin
      .from('family_interactions')
      .select('*, students(student_id, name, class)', { count: 'exact' })
      .order('interaction_date', { ascending: false });

    if (internalStudentId) query = query.eq('student_id', internalStudentId);
    if (tipo) query = query.eq('interaction_type', tipo);
    if (responsavel) query = query.ilike('created_by', `%${responsavel}%`); // created_by contém "responsavel - assunto"
    if (dataInicio) {
      // Converter DDMMYYYY para YYYY-MM-DD
      const isoDateInicio = `${dataInicio.substring(4, 8)}-${dataInicio.substring(2, 4)}-${dataInicio.substring(0, 2)}`;
      query = query.gte('interaction_date', isoDateInicio);
    }
    if (dataFim) {
      // Converter DDMMYYYY para YYYY-MM-DD
      const isoDateFim = `${dataFim.substring(4, 8)}-${dataFim.substring(2, 4)}-${dataFim.substring(0, 2)}`;
      query = query.lte('interaction_date', isoDateFim);
    }

    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[GET /api/interactions] Error:', error);
      return errorResponse('DATABASE_ERROR', 'Erro ao buscar interações', 500);
    }

    // Buscar nomes dos usuários (created_by) para enriquecer os dados
    if (data && data.length > 0) {
      // Coletar IDs únicos de created_by
      const userIds = [...new Set(
        data.map((interaction: any) => interaction.created_by).filter(Boolean)
      )];

      if (userIds.length > 0) {
        const { data: users } = await supabaseAdmin
          .from('user_profiles')
          .select('firebase_uid, full_name')
          .in('firebase_uid', userIds);

        const userMap = new Map((users || []).map((u: any) => [u.firebase_uid, u.full_name]));

        // Adicionar nome do usuário aos dados
        data.forEach((interaction: any) => {
          const userName = userMap.get(interaction.created_by);
          interaction.created_by_name = userName || interaction.created_by || 'Desconhecido';
        });
      }
    }

    // Mapear dados do Supabase para o formato esperado pelo frontend
    const mappedData = (data || []).map((interaction: any) => ({
      id: interaction.id,
      studentId: interaction.student_id,
      type: interaction.interaction_type,
      date: interaction.interaction_date,
      description: interaction.description,
      createdBy: interaction.created_by_name || interaction.created_by,
      sensitive: interaction.is_sensitive,
      // Campos WhatsApp
      whatsappMessage: interaction.whatsapp_message,
      whatsappPhones: interaction.whatsapp_phones,
      whatsappMessageId: interaction.whatsapp_message_id,
      whatsappStatus: interaction.whatsapp_status,
      whatsappStatusHistory: interaction.whatsapp_status_history,
      whatsappSentAt: interaction.whatsapp_sent_at,
      whatsappDeliveredAt: interaction.whatsapp_delivered_at,
      whatsappReadAt: interaction.whatsapp_read_at,
      whatsappPlayedAt: interaction.whatsapp_played_at,
      whatsappUpdatedAt: interaction.whatsapp_updated_at,
      createdAt: interaction.created_at,
    }));

    return paginatedResponse(mappedData, page, limit, count || 0);
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

    // Resolver Firebase UUID para Internal ID
    const internalStudentId = await resolveFirebaseUUIDToInternal(sanitizedData.estudanteId);

    if (!internalStudentId) {
      return errorResponse(
        'NOT_FOUND',
        `Estudante não encontrado com ID: ${sanitizedData.estudanteId}`,
        404
      );
    }

    // Verificar se estudante não está deletado
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('id', internalStudentId)
      .eq('deleted', false)
      .single();

    if (studentError || !student) {
      return errorResponse('NOT_FOUND', 'Estudante não encontrado ou foi removido', 404);
    }

    // Converter data de DDMMYYYY para YYYY-MM-DD (formato ISO para PostgreSQL)
    const convertToISO = (dateStr: string): string => {
      // dateStr = "18102025" (DDMMYYYY)
      const day = dateStr.substring(0, 2);
      const month = dateStr.substring(2, 4);
      const year = dateStr.substring(4, 8);
      return `${year}-${month}-${day}`; // "2025-10-18"
    };

    // Mapear campos do schema de validação para o schema do Supabase
    const insertData: any = {
      student_id: internalStudentId, // ✅ Usar Internal ID resolvido
      interaction_date: convertToISO(sanitizedData.data),
      interaction_type: sanitizedData.tipo,
      description: sanitizedData.descricao,
      created_by: sanitizedData.criadoPor, // Nome do usuário autenticado
      is_sensitive: false, // Default
    };
    
    // Adicionar observações na descrição se existirem
    if (sanitizedData.observacoes) {
      insertData.description += `\n\nObservações: ${sanitizedData.observacoes}`;
    }

    // Adicionar próxima ação na descrição se existir
    if (sanitizedData.proximaAcao) {
      insertData.description += `\n\nPróxima ação: ${sanitizedData.proximaAcao}`;
      if (sanitizedData.dataProximaAcao) {
        insertData.description += ` (${sanitizedData.dataProximaAcao})`;
      }
    }

    // Adicionar campos WhatsApp se existirem
    if (sanitizedData.whatsapp_message) {
      insertData.whatsapp_message = sanitizedData.whatsapp_message;
    }
    if (sanitizedData.whatsapp_phones) {
      insertData.whatsapp_phones = sanitizedData.whatsapp_phones;
    }
    if (sanitizedData.whatsapp_message_id) {
      insertData.whatsapp_message_id = sanitizedData.whatsapp_message_id;
    }
    if (sanitizedData.whatsapp_status) {
      insertData.whatsapp_status = sanitizedData.whatsapp_status;
    }
    if (sanitizedData.whatsapp_sent_at) {
      insertData.whatsapp_sent_at = sanitizedData.whatsapp_sent_at;
    }

    const { data, error } = (await supabaseAdmin
      .from('family_interactions')
      .insert(insertData)
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
