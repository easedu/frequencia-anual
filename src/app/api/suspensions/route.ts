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
import { resolveFirebaseUUIDToInternal } from '@/app/api/_utils/studentIdResolver';
import { getDiasLetivosNoPeriodo, parseDate, getBimesterByDate } from '@/app/utils';
import { getCountStrategy } from '@/app/api/_utils/countStrategy';

// ============================================================================
// TYPES
// ============================================================================

interface SuspensionWithStudent {
  id: string;
  student_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  description: string | null;
  severity: string;
  decision_by: string;
  decision_by_name?: string;
  decision_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  students: {
    name: string;
    class: string;
  } | null;
}

interface UserProfile {
  firebase_uid: string;
  full_name: string;
}

interface SuspensionInsert {
  student_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  description: string | null;
  severity: string;
  decision_by: string;
  decision_date: string;
  created_by: string;
}

interface AbsenceInsert {
  student_id: string;
  absence_date: string;
  bimester: string | null;
  is_justified: boolean;
  suspension_id: string;
}

interface AbsenceUpdate {
  is_justified: boolean;
  suspension_id: string;
}

export const GET = withAuth(async (req: NextRequest, _userId: string) => {
  try {
    const validation = validateQueryParams(req, suspensionQuerySchema);
    if (!validation.success) return validation.response;

    const { estudanteId, dataInicio, dataFim, page, limit } = validation.data;

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

    // ✅ FASE 4.1: Otimizar count
    const countOption = getCountStrategy(page);

    let query = supabaseAdmin
      .from('student_suspensions')
      .select('*, students( name, class)', countOption)
      .order('start_date', { ascending: false });

    if (internalStudentId) query = query.eq('student_id', internalStudentId);
    if (dataInicio) query = query.gte('start_date', dataInicio);
    if (dataFim) query = query.lte('end_date', dataFim);

    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      console.error('[GET /api/suspensions] Error:', error);
      return errorResponse('DATABASE_ERROR', 'Erro ao buscar suspensões', 500);
    }

    // Buscar nomes dos usuários (decision_by) para enriquecer os dados
    if (data && data.length > 0) {
      // Coletar IDs únicos de decision_by (filtrar apenas valores que parecem ser Firebase UIDs)
      const potentialUIDs = [...new Set(
        data.map((susp: SuspensionWithStudent) => susp.decision_by).filter(Boolean)
      )].filter((id: string) => id.length > 20); // Firebase UIDs têm 28 caracteres

      let userMap = new Map<string, string>();

      if (potentialUIDs.length > 0) {
        const { data: users } = await supabaseAdmin
          .from('user_profiles')
          .select('firebase_uid, full_name')
          .in('firebase_uid', potentialUIDs);

        userMap = new Map((users || []).map((u: UserProfile) => [u.firebase_uid, u.full_name]));
      }

      // Adicionar nome do usuário aos dados
      data.forEach((susp: SuspensionWithStudent) => {
        // Tentar buscar nome do Firebase UID primeiro
        let userName = userMap.get(susp.decision_by);

        // Se não encontrou no userMap, verificar se é um nome direto (dados antigos)
        if (!userName) {
          // Se decision_by tem menos de 20 caracteres, provavelmente é um nome direto
          if (susp.decision_by && susp.decision_by.length < 20) {
            userName = susp.decision_by;
          } else {
            // Firebase UID não encontrado em user_profiles
            userName = 'Usuário não encontrado';
          }
        }

        susp.decision_by_name = userName || 'Desconhecido';
      });
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

    // ✅ Converter DDMMYYYY → YYYY-MM-DD (formato do Supabase)
    const convertToISODate = (date: string): string => {
      if (date.match(/^\d{8}$/)) {
        // Format: DDMMYYYY → YYYY-MM-DD
        const day = date.substring(0, 2);
        const month = date.substring(2, 4);
        const year = date.substring(4, 8);
        return `${year}-${month}-${day}`;
      }
      return date; // Já está em YYYY-MM-DD
    };

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

    const suspensionInsert: SuspensionInsert = {
      student_id: internalStudentId, // ✅ Usar Internal ID resolvido
      start_date: convertToISODate(sanitizedData.dataInicio),
      end_date: convertToISODate(sanitizedData.dataFim),
      reason: sanitizedData.motivo,
      description: sanitizedData.observacoes || null,
      severity: 'MODERADA', // Valor padrão
      decision_by: userId, // Firebase Auth User ID
      decision_date: convertToISODate(sanitizedData.dataInicio), // Mesma data do início da suspensão
      created_by: userId,
    };

    const { data: suspensionData, error: suspensionError } = (await supabaseAdmin
      .from('student_suspensions')
      .insert([suspensionInsert] as never)
      .select('id')
      .single()) as { data: { id: string } | null; error: Error | null };

    if (suspensionError) {
      console.error('[POST /api/suspensions] Error:', suspensionError);
      return errorResponse('DATABASE_ERROR', 'Erro ao criar suspensão', 500);
    }

    // ✅ Criar faltas automaticamente para todos os dias letivos do período da suspensão
    try {
      const suspensionId = suspensionData?.id;
      if (!suspensionId) {
        throw new Error('ID da suspensão não foi retornado');
      }
      const startDate = suspensionInsert.start_date;
      const endDate = suspensionInsert.end_date;

      // 1. Converter datas para Date objects
      const startDateObj = parseDate(startDate);
      const endDateObj = parseDate(endDate);

      if (!startDateObj || !endDateObj) {
        console.error('[POST /api/suspensions] ❌ Datas inválidas');
        throw new Error('Datas inválidas');
      }

      // 2. Buscar dias letivos no período
      const diasLetivos = await getDiasLetivosNoPeriodo(startDateObj, endDateObj);

      if (diasLetivos.length > 0) {
        // 3. Buscar bimesterDates para determinar o bimestre de cada data
        const currentYear = new Date().getFullYear();
        const { AcademicYearService } = await import('@/services/supabase/academicYearService');
        const academicYearData = await AcademicYearService.getAcademicYearComplete(currentYear);

        const bimesterDates = {
          b1: { start: academicYearData?.['1º Bimestre']?.startDate || '', end: academicYearData?.['1º Bimestre']?.endDate || '' },
          b2: { start: academicYearData?.['2º Bimestre']?.startDate || '', end: academicYearData?.['2º Bimestre']?.endDate || '' },
          b3: { start: academicYearData?.['3º Bimestre']?.startDate || '', end: academicYearData?.['3º Bimestre']?.endDate || '' },
          b4: { start: academicYearData?.['4º Bimestre']?.startDate || '', end: academicYearData?.['4º Bimestre']?.endDate || '' },
        };

        // 4. Para cada dia letivo, criar/atualizar falta
        const convertToISODate = (dateStr: string): string => {
          if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          return dateStr;
        };

        for (const diaLetivo of diasLetivos) {
          const absenceDate = convertToISODate(diaLetivo);
          const bimester = getBimesterByDate(diaLetivo, bimesterDates);
          const bimesterStr = bimester === 1 ? '1º Bimestre' :
                             bimester === 2 ? '2º Bimestre' :
                             bimester === 3 ? '3º Bimestre' :
                             bimester === 4 ? '4º Bimestre' : null;

          // Verificar se falta já existe
          const { data: existing } = (await supabaseAdmin
            .from('student_absences')
            .select('id')
            .eq('student_id', internalStudentId)
            .eq('absence_date', absenceDate)
            .maybeSingle()) as { data: { id: string } | null; error: Error | null };

          if (existing) {
            // ✅ Falta existe: ATUALIZAR
            const absenceUpdate: AbsenceUpdate = {
              is_justified: true,
              suspension_id: suspensionId,
            };

            await supabaseAdmin
              .from('student_absences')
              .update(absenceUpdate as never)
              .eq('id', existing.id);
          } else {
            // ✅ Falta não existe: CRIAR
            const absenceInsert: AbsenceInsert = {
              student_id: internalStudentId,
              absence_date: absenceDate,
              bimester: bimesterStr,
              is_justified: true,
              suspension_id: suspensionId,
            };

            await supabaseAdmin
              .from('student_absences')
              .insert([absenceInsert] as never);
          }
        }

      }
    } catch (updateErr) {
      console.error('[POST /api/suspensions] ❌ Erro ao criar/atualizar faltas:', updateErr);
      // Não falhar a requisição se houver erro nas faltas
    }

    return successResponse({ id: suspensionData?.id || '' }, 'Suspensão criada com sucesso', 201);
  } catch (error) {
    return handleError(error, 'POST /api/suspensions');
  }
});
