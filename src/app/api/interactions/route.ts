/**
 * API Route: /api/interactions
 * CRUD de Interações Familiares
 */

import { NextRequest } from 'next/server';
import { withAuth, withBearerOrBasicAuth } from '@/app/api/_middleware/auth';
import { validateQueryParams, sanitizeObject } from '@/app/api/_middleware/validation';
import { createInteractionSchema, interactionQuerySchema } from '@/app/api/_schemas/interactionSchemas';
import { successResponse, errorResponse, validationErrorResponse, paginatedResponse } from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { resolveFirebaseUUIDToInternal } from '@/app/api/_utils/studentIdResolver';
import { getCountStrategy } from '@/app/api/_utils/countStrategy';
import type { FamilyInteraction, FamilyInteractionInsert } from '@/lib/supabaseClient';

export const GET = withAuth(async (req: NextRequest, _userId: string) => {
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

    // ✅ FASE 4.1: Otimizar count (estimated na 1ª página, planned depois)
    const countOption = getCountStrategy(page);

    let query = supabaseAdmin
      .from('family_interactions')
      .select('*, students(student_id, name, class)', countOption)
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

    // Tipos para dados enriquecidos
    interface UserProfile {
      firebase_uid: string;
      full_name: string;
    }

    interface InteractionWithUser extends FamilyInteraction {
      created_by_name?: string;
    }

    interface MappedInteractionResponse {
      id: string;
      studentId: string;
      type: string;
      date: string;
      description: string;
      createdBy: string;
      sensitive: boolean;
      createdAt: string;
      // ⚠️ Campos WhatsApp removidos - não existem no schema de family_interactions
    }

    // Cast data para tipo correto
    const interactions = (data || []) as FamilyInteraction[];

    // Buscar nomes dos usuários (created_by) para enriquecer os dados
    if (interactions && interactions.length > 0) {
      // Coletar IDs únicos de created_by (filtrar apenas valores que parecem ser Firebase UIDs)
      const potentialUIDs = [...new Set(
        interactions.map((interaction) => interaction.created_by).filter(Boolean)
      )].filter((id): id is string => typeof id === 'string' && id.length > 20); // Firebase UIDs têm 28 caracteres

      let userMap = new Map<string, string>();

      if (potentialUIDs.length > 0) {
        const { data: users } = await supabaseAdmin
          .from('user_profiles')
          .select('firebase_uid, full_name')
          .in('firebase_uid', potentialUIDs);

        userMap = new Map((users || []).map((u: UserProfile) => [u.firebase_uid, u.full_name]));
      }

      // Adicionar nome do usuário aos dados
      (interactions as InteractionWithUser[]).forEach((interaction) => {
        const createdBy = interaction.created_by || '';
        // Tentar buscar nome do Firebase UID primeiro
        let userName = userMap.get(createdBy);

        // Se não encontrou no userMap, verificar se é um nome direto (dados antigos)
        if (!userName) {
          // Se created_by tem menos de 20 caracteres, provavelmente é um nome direto
          if (createdBy && createdBy.length < 20) {
            userName = createdBy;
          } else {
            // Firebase UID não encontrado em user_profiles
            userName = 'Usuário não encontrado';
          }
        }

        interaction.created_by_name = userName || 'Desconhecido';
      });
    }

    // Mapear dados do Supabase para o formato esperado pelo frontend
    const mappedData: MappedInteractionResponse[] = interactions.map((interaction) => {
      const interactionWithUser = interaction as InteractionWithUser;

      // Converter data ISO (yyyy-mm-dd) para formato brasileiro (dd/mm/aaaa)
      let formattedDate = interaction.interaction_date;
      if (formattedDate && formattedDate.includes('-')) {
        const [year, month, day] = formattedDate.split('-');
        formattedDate = `${day}/${month}/${year}`;
      }

      return {
        id: interaction.id,
        studentId: interaction.student_id,
        type: interaction.interaction_type,
        date: formattedDate,
        description: interaction.description || '',
        createdBy: interactionWithUser.created_by_name || interaction.created_by || '',
        sensitive: interaction.is_sensitive,
        createdAt: interaction.created_at,
      };
    });

    return paginatedResponse(mappedData, page, limit, count || 0);
  } catch (error) {
    return handleError(error, 'GET /api/interactions');
  }
});

export const POST = withBearerOrBasicAuth(async (req: NextRequest, _userId: string) => {
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
    const insertData: FamilyInteractionInsert = {
      student_id: internalStudentId, // ✅ Usar Internal ID resolvido
      interaction_date: convertToISO(sanitizedData.data),
      interaction_type: sanitizedData.tipo,
      description: sanitizedData.descricao,
      created_by: sanitizedData.criadoPor, // Nome do usuário autenticado
      is_sensitive: false, // Default
    };
    
    // Adicionar observações na descrição se existirem
    if (sanitizedData.observacoes) {
      insertData.description = (insertData.description || '') + `\n\nObservações: ${sanitizedData.observacoes}`;
    }

    // Adicionar próxima ação na descrição se existir
    if (sanitizedData.proximaAcao) {
      insertData.description = (insertData.description || '') + `\n\nPróxima ação: ${sanitizedData.proximaAcao}`;
      if (sanitizedData.dataProximaAcao) {
        insertData.description += ` (${sanitizedData.dataProximaAcao})`;
      }
    }

    // ⚠️ NOTA: Campos WhatsApp não existem no schema atual de family_interactions
    // Se necessário, adicionar à descrição ou criar campo JSONB separado no futuro

    const result = await supabaseAdmin
      .from('family_interactions')
      .insert(insertData as unknown as never)
      .select('id')
      .single();

    const { data, error } = result as {
      data: { id: string } | null;
      error: Error | null
    };

    if (error) {
      console.error('[POST /api/interactions] Error:', error);
      return errorResponse('DATABASE_ERROR', 'Erro ao criar interação', 500);
    }

    return successResponse({ id: data?.id || '' }, 'Interação criada com sucesso', 201);
  } catch (error) {
    return handleError(error, 'POST /api/interactions');
  }
});
