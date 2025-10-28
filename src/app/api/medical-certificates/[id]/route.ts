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
import { getDiasLetivosNoPeriodo, parseDate, getBimesterByDate } from '@/app/utils';

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

    // Build update data object with proper types
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (sanitizedData.dataInicio) updateData.start_date = convertToISODate(sanitizedData.dataInicio);
    if (sanitizedData.dataFim) updateData.end_date = convertToISODate(sanitizedData.dataFim);
    if (sanitizedData.motivo !== undefined) updateData.diagnosis = sanitizedData.motivo; // ✅ Usar 'diagnosis'
    if (sanitizedData.arquivoUrl !== undefined) updateData.document_url = sanitizedData.arquivoUrl;

    type MedicalCertificateWithStudent = {
      id: string;
      start_date: string;
      end_date: string;
      diagnosis: string | null;
      document_url: string | null;
      students?: { id: string; student_id: string } | null;
    };

    const updateResult = await supabaseAdmin
      .from('medical_certificates')
      .update(updateData as never)
      .eq('id', id)
      .select('*, students(id, student_id)')
      .single();

    const updatedData = updateResult.data as MedicalCertificateWithStudent | null;
    const updateError = updateResult.error;

    if (updateError) {
      console.error('[PUT /api/medical-certificates/[id]] Error:', updateError);
      return errorResponse('DATABASE_ERROR', 'Erro ao atualizar atestado', 500);
    }

    // ✅ Se as datas foram alteradas, recriar faltas automaticamente
    if (sanitizedData.dataInicio || sanitizedData.dataFim) {
      console.log('[PUT /api/medical-certificates/[id]] 🔄 INICIANDO RECRIAÇÃO DE FALTAS');
      console.log('[PUT /api/medical-certificates/[id]] Dados recebidos:', sanitizedData);
      console.log('[PUT /api/medical-certificates/[id]] Dados atualizados:', updatedData);

      try {
        // ✅ Verificar se updatedData existe antes de acessar propriedades
        if (!updatedData) {
          throw new Error('Dados atualizados não encontrados');
        }

        // ✅ USAR dados já convertidos (updatedData tem YYYY-MM-DD)
        const startDate = updatedData.start_date;
        const endDate = updatedData.end_date;
        const internalId = updatedData.students?.id;

        console.log('[PUT /api/medical-certificates/[id]] 📅 Datas para buscar dias letivos:', {
          startDate,
          endDate,
          formato: 'YYYY-MM-DD'
        });

        console.log('[PUT /api/medical-certificates/[id]] 🔍 Recriando faltas para novo período:', {
          certificateId: id,
          studentId: internalId,
          startDate,
          endDate,
        });

        // 1. ✅ DESASSOCIAR faltas antigas (NÃO DELETAR!)
        // Remover atestado e marcar como não justificadas
        const disassociateResult = await supabaseAdmin
          .from('student_absences')
          .update({
            medical_certificate_id: null,
            is_justified: false
          } as never)
          .eq('medical_certificate_id', id);

        const updateOldError = disassociateResult.error;

        if (updateOldError) {
          console.error('[PUT /api/medical-certificates/[id]] ❌ Erro ao desassociar faltas antigas:', updateOldError);
        } else {
          console.log('[PUT /api/medical-certificates/[id]] 🔄 Faltas antigas desassociadas e marcadas como não justificadas');
        }

        // 2. Buscar dias letivos no novo período
        const startDateObj = parseDate(startDate);
        const endDateObj = parseDate(endDate);

        if (startDateObj && endDateObj) {
          const diasLetivos = await getDiasLetivosNoPeriodo(startDateObj, endDateObj);
          console.log('[PUT /api/medical-certificates/[id]] 📅 Dias letivos encontrados:', diasLetivos.length);

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

            let updatedCount = 0;
            let createdCount = 0;

            // Para cada dia letivo, buscar falta existente ou criar nova
            for (const diaLetivo of diasLetivos) {
              const absenceDate = convertToISODate(diaLetivo);
              const bimester = getBimesterByDate(diaLetivo, bimesterDates);
              const bimesterStr = bimester === 1 ? '1º Bimestre' :
                                 bimester === 2 ? '2º Bimestre' :
                                 bimester === 3 ? '3º Bimestre' :
                                 bimester === 4 ? '4º Bimestre' : null;

              // Verificar se falta já existe para este estudante e data
              if (!internalId) {
                console.error('[PUT /api/medical-certificates/[id]] ❌ Internal ID não encontrado');
                continue;
              }

              const existingResult = await supabaseAdmin
                .from('student_absences')
                .select('id')
                .eq('student_id', internalId)
                .eq('absence_date', absenceDate)
                .maybeSingle();

              const existing = existingResult.data as { id: string } | null;

              if (existing) {
                // ✅ Falta existe: ATUALIZAR para associar ao atestado
                const justifyResult = await supabaseAdmin
                  .from('student_absences')
                  .update({
                    is_justified: true,
                    medical_certificate_id: id,
                  } as never)
                  .eq('id', existing.id);

                if (!justifyResult.error) updatedCount++;
              } else {
                // ✅ Falta não existe: CRIAR nova
                const insertResult = await supabaseAdmin
                  .from('student_absences')
                  .insert({
                    student_id: internalId,
                    absence_date: absenceDate,
                    bimester: bimesterStr,
                    is_justified: true,
                    medical_certificate_id: id,
                  } as never);

                if (!insertResult.error) createdCount++;
              }
            }

            console.log('[PUT /api/medical-certificates/[id]] ✅ Faltas processadas:', {
              atualizadas: updatedCount,
              criadas: createdCount,
              total: diasLetivos.length
            });
          }
        }
      } catch (absencesErr) {
        console.error('[PUT /api/medical-certificates/[id]] ❌ Erro ao recriar faltas:', absencesErr);
        // Não falhar a requisição se houver erro nas faltas
      }
    }

    // ✅ Buscar dados atualizados completos para retornar ao frontend
    const { data: finalData, error: finalError } = await supabaseAdmin
      .from('medical_certificates')
      .select('*, students(name, class)')
      .eq('id', id)
      .single();

    if (finalError) {
      console.error('[PUT /api/medical-certificates/[id]] ❌ Erro ao buscar dados finais:', finalError);
      return successResponse({ id, updated: true }, 'Atestado atualizado com sucesso');
    }

    console.log('[PUT /api/medical-certificates/[id]] ✅ Retornando dados atualizados:', finalData);

    return successResponse(finalData, 'Atestado atualizado com sucesso');
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

    // ✅ ANTES de deletar, desassociar faltas e marcar como não justificadas
    console.log('[DELETE /api/medical-certificates/[id]] 🔄 Desassociando faltas antes de deletar atestado');

    const updateAbsencesResult = await supabaseAdmin
      .from('student_absences')
      .update({
        medical_certificate_id: null,
        is_justified: false
      } as never)
      .eq('medical_certificate_id', id);

    const updateAbsencesError = updateAbsencesResult.error;

    if (updateAbsencesError) {
      console.error('[DELETE /api/medical-certificates/[id]] ❌ Erro ao desassociar faltas:', updateAbsencesError);
    } else {
      console.log('[DELETE /api/medical-certificates/[id]] ✅ Faltas desassociadas e marcadas como não justificadas');
    }

    // Agora deletar o atestado
    const { error: deleteError } = await supabaseAdmin
      .from('medical_certificates')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DELETE /api/medical-certificates/[id]] Error:', deleteError);
      return errorResponse('DATABASE_ERROR', 'Erro ao deletar atestado', 500);
    }

    console.log('[DELETE /api/medical-certificates/[id]] ✅ Atestado deletado com sucesso');
    return successResponse({ id, deleted: true }, 'Atestado deletado com sucesso');
  } catch (error) {
    return handleError(error, 'DELETE /api/medical-certificates/[id]');
  }
});
