/**
 * API Route: /api/occurrences
 *
 * GET - Lista occurrences com filtros
 * POST - Cria nova occurrence
 */

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { errorResponse, successResponse } from '@/app/api/_utils/response'
import { handleError } from '@/app/api/_utils/errorHandler'
import { createOccurrenceSchema, occurrenceFiltersSchema } from '@/app/api/_schemas/occurrenceSchemas'
import { logger } from '@/utils/logger'
import { getCountStrategy } from '@/app/api/_utils/countStrategy'

/**
 * GET /api/occurrences
 * Lista occurrences com filtros opcionais
 *
 * Query params:
 * - student_id: UUID do estudante
 * - occurrence_type: Tipo da ocorrência
 * - severity: Gravidade (LEVE, MODERADA, GRAVE)
 * - family_notified: 'true' | 'false'
 * - start_date: Data início (YYYY-MM-DD)
 * - end_date: Data fim (YYYY-MM-DD)
 * - limit: Número de resultados (default: 100)
 * - offset: Offset para paginação (default: 0)
 *
 * @example
 * GET /api/occurrences?student_id=550e8400-e29b-41d4-a716-446655440000&severity=GRAVE
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Validar filtros
    const filters = occurrenceFiltersSchema.parse({
      student_id: searchParams.get('student_id') || undefined,
      occurrence_type: searchParams.get('occurrence_type') || undefined,
      severity: searchParams.get('severity') || undefined,
      family_notified: searchParams.get('family_notified') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      limit: searchParams.get('limit') || '100',
      offset: searchParams.get('offset') || '0',
    })

    const limit = parseInt(filters.limit)
    const offset = parseInt(filters.offset)

    // ✅ FASE 4.1: Otimizar count
    const page = Math.floor(offset / limit) + 1
    const countOption = getCountStrategy(page)

    // Construir query
    let query = supabaseAdmin
      .from('student_occurrences')
      .select('*', countOption)

    // Aplicar filtros
    if (filters.student_id) {
      query = query.eq('student_id', filters.student_id)
    }

    if (filters.occurrence_type) {
      query = query.eq('occurrence_type', filters.occurrence_type)
    }

    if (filters.severity) {
      query = query.eq('severity', filters.severity)
    }

    if (filters.family_notified) {
      query = query.eq('family_notified', filters.family_notified === 'true')
    }

    if (filters.start_date) {
      query = query.gte('occurrence_date', filters.start_date)
    }

    if (filters.end_date) {
      query = query.lte('occurrence_date', filters.end_date)
    }

    // Aplicar paginação e ordenação
    query = query
      .range(offset, offset + limit - 1)
      .order('occurrence_date', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      logger.error('Erro ao buscar occurrences', { error })
      return errorResponse(error.message, 500)
    }

    // Buscar nomes dos usuários (reported_by) para enriquecer os dados
    if (data && data.length > 0) {
      // Coletar IDs únicos de reported_by (filtrar apenas valores que parecem ser Firebase UIDs)
      const reportedByIds = data.map((occ: Record<string, unknown>) => occ.reported_by as string | null).filter(Boolean) as string[];
      const potentialUIDs = [...new Set(reportedByIds)].filter((id: string) => id.length > 20);

      let userMap = new Map<string, string>();

      if (potentialUIDs.length > 0) {
        const { data: users } = await supabaseAdmin
          .from('user_profiles')
          .select('firebase_uid, full_name')
          .in('firebase_uid', potentialUIDs);

        userMap = new Map((users || []).map((u: Record<string, unknown>) => [u.firebase_uid as string, u.full_name as string]));
      }

      // Adicionar nome do usuário aos dados
      data.forEach((occ: Record<string, unknown>) => {
        const reportedBy = occ.reported_by as string | null;
        // Tentar buscar nome do Firebase UID primeiro
        let userName = reportedBy ? userMap.get(reportedBy) : undefined;

        // Se não encontrou no userMap, verificar se é um nome direto (dados antigos)
        if (!userName) {
          // Se reported_by tem menos de 20 caracteres, provavelmente é um nome direto
          if (reportedBy && reportedBy.length < 20) {
            userName = reportedBy;
          } else {
            // Firebase UID não encontrado em user_profiles
            userName = 'Usuário não encontrado';
          }
        }

        occ.reported_by_name = userName || 'Desconhecido';
      });
    }

    return successResponse({
      data: data || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * POST /api/occurrences
 * Cria nova occurrence
 *
 * Body:
 * {
 *   "student_id": "uuid",
 *   "occurrence_type": "COMPORTAMENTO" | "INDISCIPLINA" | "AGRESSAO" | ...,
 *   "occurrence_date": "YYYY-MM-DD",
 *   "description": "string",
 *   "severity": "LEVE" | "MODERADA" | "GRAVE" (opcional, default: LEVE),
 *   "action_taken": "string" (opcional),
 *   "family_notified": boolean (opcional, default: false),
 *   "notification_method": "TELEFONE" | "WHATSAPP" | ... (opcional),
 *   "reported_by": "string",
 *   "follow_up_notes": "string" (opcional)
 * }
 *
 * @example
 * POST /api/occurrences
 * {
 *   "student_id": "550e8400-e29b-41d4-a716-446655440000",
 *   "occurrence_type": "INDISCIPLINA",
 *   "occurrence_date": "2025-10-17",
 *   "description": "Estudante conversando durante a aula",
 *   "severity": "LEVE",
 *   "reported_by": "Prof. João Silva"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar dados
    const validated = createOccurrenceSchema.parse(body)

    // Criar occurrence no Supabase
    const insertData = {
      student_id: validated.student_id,
      occurrence_type: validated.occurrence_type,
      occurrence_date: validated.occurrence_date,
      description: validated.description,
      severity: validated.severity || 'LEVE',
      action_taken: validated.action_taken || null,
      family_notified: validated.family_notified || false,
      notification_method: validated.notification_method || null,
      reported_by: validated.reported_by,
      follow_up_notes: validated.follow_up_notes || null,
      created_by: validated.reported_by, // reported_by também é created_by
    };

    type OccurrenceRecord = Record<string, unknown>;
    type OccurrenceError = { message: string } | null;

    const result = await supabaseAdmin
      .from('student_occurrences')
      // @ts-ignore - Supabase types inference limitation
      .insert(insertData)
      .select()
      .single();

    const { data, error } = result as unknown as { data: OccurrenceRecord | null; error: OccurrenceError };

    if (error) {
      logger.error('Erro ao criar occurrence', {}, new Error(error.message))
      return errorResponse(error.message, 500)
    }

    logger.info('Occurrence criada com sucesso', {
      occurrenceId: data?.id,
      studentId: validated.student_id,
      type: validated.occurrence_type
    })

    return successResponse(data, 201)
  } catch (error) {
    return handleError(error)
  }
}
