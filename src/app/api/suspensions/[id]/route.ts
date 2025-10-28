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
import { getDiasLetivosNoPeriodo, parseDate, getBimesterByDate } from '@/app/utils';
import type { Database } from '@/lib/supabaseClient';

type RouteParams = { params: Promise<{ id: string }> };

type SuspensionRow = Database['public']['Tables']['student_suspensions']['Row'];
type SuspensionUpdate = Database['public']['Tables']['student_suspensions']['Update'];

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

    const { data: existing, error: checkError} = await supabaseAdmin
      .from('student_suspensions')
      .select('id, students(student_id)')
      .eq('id', id)
      .single();

    if (checkError || !existing) return notFoundResponse('Suspensão', id);

    // ✅ Função para converter DDMMYYYY → YYYY-MM-DD
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

    const updateData: SuspensionUpdate = {};
    if (sanitizedData.dataInicio) updateData.start_date = convertToISODate(sanitizedData.dataInicio);
    if (sanitizedData.dataFim) updateData.end_date = convertToISODate(sanitizedData.dataFim);
    if (sanitizedData.motivo !== undefined) updateData.reason = sanitizedData.motivo;
    if (sanitizedData.observacoes !== undefined) updateData.description = sanitizedData.observacoes;
    updateData.updated_by = userId;

    type SuspensionWithStudent = SuspensionRow & {
      students?: { id: string; student_id: string } | null;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateResult = await (supabaseAdmin as any)
      .from('student_suspensions')
      .update(updateData)
      .eq('id', id)
      .select('*, students(id, student_id)')
      .single();

    const { data: updatedData, error: updateError } = updateResult as {
      data: SuspensionWithStudent | null;
      error: { message: string } | null
    };

    if (updateError || !updatedData) {
      console.error('[PUT /api/suspensions/[id]] Error:', updateError);
      return errorResponse('DATABASE_ERROR', 'Erro ao atualizar suspensão', 500);
    }

    // ✅ Se as datas foram alteradas, recriar faltas automaticamente
    if (sanitizedData.dataInicio || sanitizedData.dataFim) {

      try {
        // ✅ USAR dados já convertidos (updatedData tem YYYY-MM-DD)
        const startDate = updatedData.start_date;
        const endDate = updatedData.end_date;
        const internalId = updatedData.students?.id;

        if (!internalId) {
          throw new Error('Internal ID not found for student');
        }

        // 1. ✅ DESASSOCIAR faltas antigas (NÃO DELETAR!)
        const disassociateUpdate = {
          suspension_id: null,
          is_justified: false
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateOldError } = await (supabaseAdmin as any)
          .from('student_absences')
          .update(disassociateUpdate)
          .eq('suspension_id', id);

        if (updateOldError) {
          console.error('[PUT /api/suspensions/[id]] ❌ Erro ao desassociar faltas antigas:', updateOldError);
        }

        // 2. Buscar dias letivos no novo período
        const startDateObj = parseDate(startDate);
        const endDateObj = parseDate(endDate);

        if (startDateObj && endDateObj) {
          const diasLetivos = await getDiasLetivosNoPeriodo(startDateObj, endDateObj);

          if (diasLetivos.length > 0) {
            // 3. Buscar bimesterDates
            const currentYear = new Date().getFullYear();
            const { AcademicYearService } = await import('@/services/supabase/academicYearService');
            const academicYearData = await AcademicYearService.getAcademicYearComplete(currentYear);

            const bimesterDates = {
              b1: { start: academicYearData?.['1º Bimestre']?.startDate || '', end: academicYearData?.['1º Bimestre']?.endDate || '' },
              b2: { start: academicYearData?.['2º Bimestre']?.startDate || '', end: academicYearData?.['2º Bimestre']?.endDate || '' },
              b3: { start: academicYearData?.['3º Bimestre']?.startDate || '', end: academicYearData?.['3º Bimestre']?.endDate || '' },
              b4: { start: academicYearData?.['4º Bimestre']?.startDate || '', end: academicYearData?.['4º Bimestre']?.endDate || '' },
            };

            // 4. ✅ ATUALIZAR ou CRIAR faltas (UPSERT)
            const convertToISODate = (dateStr: string): string => {
              if (dateStr.includes('/')) {
                const [day, month, year] = dateStr.split('/');
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
              return dateStr;
            };

            // Para cada dia letivo, buscar falta existente ou criar nova
            for (const diaLetivo of diasLetivos) {
              const absenceDate = convertToISODate(diaLetivo);
              const bimester = getBimesterByDate(diaLetivo, bimesterDates);
              const bimesterStr = bimester === 1 ? '1º Bimestre' :
                                 bimester === 2 ? '2º Bimestre' :
                                 bimester === 3 ? '3º Bimestre' :
                                 bimester === 4 ? '4º Bimestre' : null;

              // Verificar se falta já existe para este estudante e data
              const { data: existingAbsence } = await supabaseAdmin
                .from('student_absences')
                .select('id')
                .eq('student_id', internalId)
                .eq('absence_date', absenceDate)
                .maybeSingle() as { data: { id: string } | null; error: { message: string } | null };

              if (existingAbsence) {
                // ✅ Falta existe: ATUALIZAR para associar à suspensão
                const justifyUpdate = {
                  is_justified: true,
                  suspension_id: id,
                };

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabaseAdmin as any)
                  .from('student_absences')
                  .update(justifyUpdate)
                  .eq('id', existingAbsence.id);
              } else {
                // ✅ Falta não existe: CRIAR nova
                const newAbsence = {
                  student_id: internalId,
                  absence_date: absenceDate,
                  bimester: bimesterStr,
                  is_justified: true,
                  suspension_id: id,
                  medical_certificate_id: null, // Required field
                };

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabaseAdmin as any)
                  .from('student_absences')
                  .insert(newAbsence);
              }
            }
          }
        }
      } catch (absencesErr) {
        console.error('[PUT /api/suspensions/[id]] ❌ Erro ao recriar faltas:', absencesErr);
        // Não falhar a requisição se houver erro nas faltas
      }
    }

    // ✅ Buscar dados atualizados completos para retornar ao frontend
    const { data: finalData, error: finalError } = await supabaseAdmin
      .from('student_suspensions')
      .select('*, students(name, class)')
      .eq('id', id)
      .single();

    if (finalError) {
      console.error('[PUT /api/suspensions/[id]] ❌ Erro ao buscar dados finais:', finalError);
      return successResponse({ id, updated: true }, 'Suspensão atualizada com sucesso');
    }

    return successResponse(finalData, 'Suspensão atualizada com sucesso');
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

    // ✅ ANTES de deletar, desassociar faltas e marcar como não justificadas
    const disassociateUpdate = {
      suspension_id: null,
      is_justified: false
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateAbsencesError } = await (supabaseAdmin as any)
      .from('student_absences')
      .update(disassociateUpdate)
      .eq('suspension_id', id);

    if (updateAbsencesError) {
      console.error('[DELETE /api/suspensions/[id]] ❌ Erro ao desassociar faltas:', updateAbsencesError);
    }

    // Agora deletar a suspensão
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
