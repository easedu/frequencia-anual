/**
 * API Route: /api/medical-certificates
 * CRUD de Atestados M\u00e9dicos
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { validateQueryParams, sanitizeObject } from '@/app/api/_middleware/validation';
import { createMedicalCertificateSchema, medicalCertificateQuerySchema } from '@/app/api/_schemas/medicalCertificateSchemas';
import { successResponse, errorResponse, validationErrorResponse, paginatedResponse } from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { v4 as uuidv4 } from 'uuid';

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const validation = validateQueryParams(req, medicalCertificateQuerySchema);
    if (!validation.success) return validation.response;

    const { estudanteId, dataInicio, dataFim, page, limit } = validation.data;

    let query: any = supabaseAdmin
      .from('medical_certificates')
      .select('*, students( name, class)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (estudanteId) query = query.eq('student_id', estudanteId);
    if (dataInicio) query = query.gte('start_date', dataInicio);
    if (dataFim) query = query.lte('end_date', dataFim);

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

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const body = await req.json();
    const validation = createMedicalCertificateSchema.safeParse(body);
    if (!validation.success) return validationErrorResponse(validation.error.errors);

    const sanitizedData = sanitizeObject(validation.data);

    // Verificar se estudante pertence ao usu\u00e1rio
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('id', sanitizedData.estudanteId)
      .single();

    if (studentError || !student) {
      return errorResponse('NOT_FOUND', 'Estudante n\u00e3o encontrado', 404);
    }

    const insertData = {
      student_id: sanitizedData.estudanteId,
      start_date: sanitizedData.dataInicio,
      end_date: sanitizedData.dataFim,
      reason: sanitizedData.motivo || null,
      notes: sanitizedData.observacoes || null,
      file_url: sanitizedData.arquivoUrl || null,
      version: '3.0',
    };

    const { data, error } = (await supabaseAdmin
      .from('medical_certificates')
      .insert(insertData as any)
      .select('id')
      .single()) as { data: any; error: any };

    if (error) {
      console.error('[POST /api/medical-certificates] Error:', error);
      return errorResponse('DATABASE_ERROR', 'Erro ao criar atestado', 500);
    }

    return successResponse({ id: data.id }, 'Atestado criado com sucesso', 201);
  } catch (error) {
    return handleError(error, 'POST /api/medical-certificates');
  }
});
