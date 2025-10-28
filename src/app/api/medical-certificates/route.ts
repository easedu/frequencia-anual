/**
 * API Route: /api/medical-certificates
 * CRUD de Atestados Médicos
 *
 * CHANGELOG:
 * - 2025-01-18: Adicionado suporte a Firebase UUID (resolve internamente via studentIdResolver backend)
 * - Aceita ambos formatos: camelCase (studentId) e português (estudanteId)
 * - 2025-01-18: Adicionado criação automática de faltas para dias letivos do período do atestado
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { successResponse, errorResponse, paginatedResponse } from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { resolveFirebaseUUIDToInternal } from '@/app/api/_utils/studentIdResolver';
import { getDiasLetivosNoPeriodo, parseDate, getBimesterByDate } from '@/app/utils';
import { getCountStrategy } from '@/app/api/_utils/countStrategy';

/**
 * GET /api/medical-certificates
 * Lista atestados médicos com filtros
 *
 * Query params:
 * - studentId (Firebase UUID) ou estudanteId (Internal ID)
 * - startDate / dataInicio
 * - endDate / dataFim
 * - page (default: 1)
 * - limit (default: 50)
 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);

    // Aceitar ambos formatos
    const studentIdParam = searchParams.get('studentId') || searchParams.get('estudanteId');
    const startDate = searchParams.get('startDate') || searchParams.get('dataInicio');
    const endDate = searchParams.get('endDate') || searchParams.get('dataFim');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // ✅ FASE 4.1: Otimizar count
    const countOption = getCountStrategy(page);

    let query = supabaseAdmin
      .from('medical_certificates')
      .select(`
        *,
        students!inner(student_id, name, class)
      `, countOption)
      .order('created_at', { ascending: false });

    // Se studentId fornecido, resolver Firebase UUID → Internal ID
    if (studentIdParam) {
      const internalId = await resolveFirebaseUUIDToInternal(studentIdParam);
      if (internalId) {
        query = query.eq('student_id', internalId);
      } else {
        // Se não encontrou, retornar vazio
        return paginatedResponse([], page, limit, 0);
      }
    }

    if (startDate) query = query.gte('start_date', startDate);
    if (endDate) query = query.lte('end_date', endDate);

    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[GET /api/medical-certificates] Error:', error);
      return errorResponse('DATABASE_ERROR', 'Erro ao buscar atestados', 500);
    }

    // Tipos para dados enriquecidos
    interface UserProfile {
      firebase_uid: string;
      full_name: string;
    }

    interface MedicalCertificateResponse {
      id: string;
      student_id: string;
      start_date: string;
      end_date: string;
      submitted_by: string | null;
      created_by: string | null;
      submitter?: { name: string };
      [key: string]: unknown;
    }

    // Buscar nomes dos usuários (submitted_by e created_by) para enriquecer os dados
    if (data && data.length > 0) {
      // Coletar IDs de ambos os campos (filtrar apenas valores que parecem ser Firebase UIDs)
      const certificates = data as MedicalCertificateResponse[];
      const potentialUIDs = [...new Set(
        certificates.flatMap((cert) => [cert.submitted_by, cert.created_by].filter(Boolean))
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
      certificates.forEach((cert) => {
        // Tentar buscar nome do Firebase UID primeiro
        let submitterName = userMap.get(cert.submitted_by || '') || userMap.get(cert.created_by || '');

        // Se não encontrou no userMap, verificar se é um nome direto (dados antigos)
        if (!submitterName) {
          // Se submitted_by tem menos de 20 caracteres, provavelmente é um nome direto
          if (cert.submitted_by && cert.submitted_by.length < 20) {
            submitterName = cert.submitted_by;
          } else if (cert.created_by && cert.created_by.length < 20) {
            submitterName = cert.created_by;
          } else {
            // Firebase UID não encontrado em user_profiles
            submitterName = 'Usuário não encontrado';
          }
        }

        cert.submitter = { name: submitterName || 'Desconhecido' };
      });
    }

    return paginatedResponse(data || [], page, limit, count || 0);
  } catch (error) {
    return handleError(error, 'GET /api/medical-certificates');
  }
});

/**
 * POST /api/medical-certificates
 * Cria novo atestado médico
 *
 * Body:
 * {
 *   "studentId": "firebase-uuid",  // ou "estudanteId": "internal-id"
 *   "startDate": "2025-01-01",     // ou "dataInicio"
 *   "endDate": "2025-01-05",       // ou "dataFim"
 *   "diagnosis": "Gripe",          // opcional
 *   "cidCode": "J00",              // opcional
 *   "doctorName": "Dr. João",      // opcional
 *   "doctorCrm": "123456",         // opcional
 *   "documentUrl": "https://...",  // opcional
 *   "submittedDate": "2025-01-01", // opcional (default: hoje)
 *   "createdBy": "Nome do usuário" // opcional
 * }
 */
export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const body = await req.json();

    // Aceitar ambos os formatos: camelCase (novo) e português (legado)
    const studentIdKey = body.studentId ? 'studentId' : 'estudanteId';
    const firebaseUUID = body[studentIdKey];

    if (!firebaseUUID) {
      return errorResponse('VALIDATION_ERROR', 'studentId ou estudanteId é obrigatório', 400);
    }

    let startDate = body.startDate || body.dataInicio;
    let endDate = body.endDate || body.dataFim;

    if (!startDate || !endDate) {
      return errorResponse('VALIDATION_ERROR', 'startDate e endDate são obrigatórios', 400);
    }

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

    startDate = convertToISODate(startDate);
    endDate = convertToISODate(endDate);

    // Resolver Firebase UUID → Internal ID (server-side)
    const internalId = await resolveFirebaseUUIDToInternal(firebaseUUID);

    if (!internalId) {
      return errorResponse('NOT_FOUND', `Estudante não encontrado com ID: ${firebaseUUID}`, 404);
    }

    // Calcular submitted_date (usar startDate se submittedDate > startDate)
    const today = new Date().toISOString().split('T')[0];
    let submittedDate = body.submittedDate || body.dataEntrega || today;
    submittedDate = convertToISODate(submittedDate);

    if (submittedDate > startDate) {
      submittedDate = startDate;
    }

    const insertData = {
      student_id: internalId,
      start_date: startDate,
      end_date: endDate,
      cid_code: body.cidCode || body.codigoCid || null,
      diagnosis: body.diagnosis || body.diagnostico || null,
      doctor_name: body.doctorName || body.nomeMedico || null,
      doctor_crm: body.doctorCrm || body.crmMedico || null,
      document_url: body.documentUrl || body.arquivoUrl || null,
      document_type: body.documentType || body.tipoArquivo || null,
      submitted_date: submittedDate,
      submitted_by: body.submittedBy || body.criadoPor || userId,
      status: 'PENDING',
      created_by: body.createdBy || body.criadoPor || userId,
    };

    interface MedicalCertificateInsertResponse {
      id: string;
      student_id: string;
      start_date: string;
      end_date: string;
      [key: string]: unknown;
    }

    const result = await supabaseAdmin
      .from('medical_certificates')
      .insert(insertData as never)
      .select('*')
      .single();

    const { data, error } = result as { data: MedicalCertificateInsertResponse | null; error: Error | null };

    if (error || !data) {
      console.error('[POST /api/medical-certificates] Error:', error);
      return errorResponse('DATABASE_ERROR', 'Erro ao criar atestado', 500);
    }

    // ✅ Criar faltas automaticamente para todos os dias letivos do período
    try {

      // 1. Converter datas para Date objects
      const startDateObj = parseDate(startDate);
      const endDateObj = parseDate(endDate);

      if (!startDateObj || !endDateObj) {
        console.error('[POST /api/medical-certificates] ❌ Datas inválidas');
        throw new Error('Datas inválidas');
      }

      // 2. Buscar dias letivos no período
      const diasLetivos = await getDiasLetivosNoPeriodo(startDateObj, endDateObj);

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
      const absencesToUpsert = diasLetivos.map((diaLetivo) => {
        // ✅ CONVERTER DD/MM/YYYY → YYYY-MM-DD (formato do Supabase)
        const convertToISODate = (dateStr: string): string => {
          if (dateStr.includes('/')) {
            // Format: DD/MM/YYYY → YYYY-MM-DD
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          return dateStr; // Já está em YYYY-MM-DD
        };

        const absenceDate = convertToISODate(diaLetivo);

        // Determinar bimestre
        const bimester = getBimesterByDate(diaLetivo, bimesterDates);
        const bimesterStr = bimester === 1 ? '1º Bimestre' :
                           bimester === 2 ? '2º Bimestre' :
                           bimester === 3 ? '3º Bimestre' :
                           bimester === 4 ? '4º Bimestre' : null;

        return {
          student_id: internalId,
          absence_date: absenceDate,
          bimester: bimesterStr,
          is_justified: true,
          medical_certificate_id: data!.id,
        };
      });

      // 5. Usar upsert para criar ou atualizar faltas
      // IMPORTANTE: Supabase não tem UPSERT direto, então vamos fazer em 2 etapas:
      // a) Buscar faltas existentes
      // b) Inserir apenas as que não existem
      // c) Atualizar as que já existem

      for (const absenceData of absencesToUpsert) {
        // Verificar se já existe
        interface ExistingAbsence {
          id: string;
          is_justified: boolean;
          medical_certificate_id: string | null;
        }

        const existingResult = await supabaseAdmin
          .from('student_absences')
          .select('id, is_justified, medical_certificate_id')
          .eq('student_id', absenceData.student_id)
          .eq('absence_date', absenceData.absence_date)
          .maybeSingle();

        const { data: existing, error: existingError } = existingResult as { data: ExistingAbsence | null; error: Error | null };

        if (existingError) {
          console.error('[POST /api/medical-certificates] ❌ Erro ao verificar falta existente:', existingError);
          continue;
        }

        if (existing) {
          // Atualizar existente
          const updateResult = await supabaseAdmin
            .from('student_absences')
            .update({
              is_justified: true,
              medical_certificate_id: data!.id,
            } as never)
            .eq('id', existing.id);

          const { error: updateError } = updateResult as { error: Error | null };

          if (updateError) {
            console.error('[POST /api/medical-certificates] ❌ Erro ao atualizar falta:', updateError);
          }
        } else {
          // Inserir novo
          const insertResult = await supabaseAdmin
            .from('student_absences')
            .insert(absenceData as never);

          const { error: insertError } = insertResult as { error: Error | null };

          if (insertError) {
            console.error('[POST /api/medical-certificates] ❌ Erro ao inserir falta:', insertError);
            console.error('[POST /api/medical-certificates] Dados tentados:', absenceData);
          }
        }
      }
    } catch (updateErr) {
      console.error('[POST /api/medical-certificates] ❌ Erro ao criar/atualizar faltas:', updateErr);
      // Não falhar a requisição se houver erro nas faltas
    }

    return successResponse(data, 'Atestado criado com sucesso', 201);
  } catch (error) {
    return handleError(error, 'POST /api/medical-certificates');
  }
});
