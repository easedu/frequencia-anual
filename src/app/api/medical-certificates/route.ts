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
      .select('*, students!inner(student_id, name, class)', { count: 'exact' })
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

    const startDate = body.startDate || body.dataInicio;
    const endDate = body.endDate || body.dataFim;

    if (!startDate || !endDate) {
      return errorResponse('VALIDATION_ERROR', 'startDate e endDate são obrigatórios', 400);
    }

    // Resolver Firebase UUID → Internal ID (server-side)
    const internalId = await resolveFirebaseUUIDToInternal(firebaseUUID);

    if (!internalId) {
      return errorResponse('NOT_FOUND', `Estudante não encontrado com ID: ${firebaseUUID}`, 404);
    }

    // Calcular submitted_date (usar startDate se submittedDate > startDate)
    const today = new Date().toISOString().split('T')[0];
    let submittedDate = body.submittedDate || body.dataEntrega || today;

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

    const { data, error } = await supabaseAdmin
      .from('medical_certificates')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      console.error('[POST /api/medical-certificates] Error:', error);
      return errorResponse('DATABASE_ERROR', 'Erro ao criar atestado', 500);
    }

    return successResponse({ data }, 'Atestado criado com sucesso', 201);
  } catch (error) {
    return handleError(error, 'POST /api/medical-certificates');
  }
});
