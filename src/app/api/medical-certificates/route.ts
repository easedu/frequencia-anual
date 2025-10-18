/**
 * API Route: /api/medical-certificates
 * CRUD de Atestados Médicos
 *
 * CHANGELOG:
 * - 2025-01-18: Adicionado suporte a Firebase UUID (resolve internamente via studentIdResolver backend)
 * - Aceita ambos formatos: camelCase (studentId) e português (estudanteId)
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { successResponse, errorResponse, paginatedResponse } from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { resolveFirebaseUUIDToInternal } from '@/app/api/_utils/studentIdResolver';

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
export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(req.url);

    // Aceitar ambos formatos
    const studentIdParam = searchParams.get('studentId') || searchParams.get('estudanteId');
    const startDate = searchParams.get('startDate') || searchParams.get('dataInicio');
    const endDate = searchParams.get('endDate') || searchParams.get('dataFim');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query: any = supabaseAdmin
      .from('medical_certificates')
      .select(`
        *,
        students!inner(student_id, name, class)
      `, { count: 'exact' })
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

    // Buscar nomes dos usuários (submitted_by e created_by) para enriquecer os dados
    if (data && data.length > 0) {
      // Coletar IDs de ambos os campos
      const userIds = [...new Set(
        data.flatMap((cert: any) => [cert.submitted_by, cert.created_by].filter(Boolean))
      )];

      console.log('[GET /api/medical-certificates] User IDs coletados:', userIds);

      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabaseAdmin
          .from('user_profiles')
          .select('firebase_uid, full_name')
          .in('firebase_uid', userIds);

        console.log('[GET /api/medical-certificates] Usuários encontrados:', users);
        console.log('[GET /api/medical-certificates] Erro ao buscar usuários:', usersError);

        const userMap = new Map((users || []).map((u: any) => [u.firebase_uid, u.full_name]));

        // Adicionar nome do usuário aos dados
        data.forEach((cert: any) => {
          const submitterName = userMap.get(cert.submitted_by) || userMap.get(cert.created_by);
          console.log(`[GET /api/medical-certificates] Cert ${cert.id}: submitted_by=${cert.submitted_by}, created_by=${cert.created_by}, name=${submitterName}`);
          cert.submitter = { name: submitterName || cert.submitted_by || cert.created_by || 'Desconhecido' };
        });
      } else {
        // Se não há IDs, ainda precisamos criar o campo submitter
        data.forEach((cert: any) => {
          cert.submitter = { name: 'Desconhecido' };
        });
      }
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

    const { data, error } = (await (supabaseAdmin
      .from('medical_certificates') as any)
      .insert(insertData)
      .select('*')
      .single()) as { data: any; error: any };

    if (error) {
      console.error('[POST /api/medical-certificates] Error:', error);
      return errorResponse('DATABASE_ERROR', 'Erro ao criar atestado', 500);
    }

    return successResponse({ data }, 'Atestado criado com sucesso', 201);
  } catch (error) {
    return handleError(error, 'POST /api/medical-certificates');
  }
});
