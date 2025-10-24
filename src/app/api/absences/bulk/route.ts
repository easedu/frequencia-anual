/**
 * API Route: /api/absences/bulk
 *
 * Criar múltiplas faltas de uma vez
 * - POST: Criar várias faltas para um estudante
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { sanitizeObject } from '@/app/api/_middleware/validation';
import {
  createBulkAbsencesSchema,
  CreateBulkAbsencesInput,
} from '@/app/api/_schemas/absenceSchemas';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// ════════════════════════════════════════════════════════════════
// RUNTIME CONFIG (Vercel) - Suporte para redes lentas 2G/3G
// ════════════════════════════════════════════════════════════════

export const runtime = 'nodejs'; // Não usar 'edge' (limite de 10s)
export const maxDuration = 60; // 60 segundos para redes muito lentas

// ============================================================================
// POST /api/absences/bulk - Criar múltiplas faltas
// ============================================================================

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // 1. Parse body
    const body = await req.json();

    // 2. Validar com Zod
    const validation = createBulkAbsencesSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(validation.error.errors);
    }

    const data = validation.data as CreateBulkAbsencesInput;

    // 3. Sanitizar dados
    const sanitizedData = sanitizeObject(data);

    // 4. Verificar se estudante existe e pertence ao usuário
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('id', sanitizedData.estudanteId)
      .eq('deleted', false)
      .single();

    if (studentError || !student) {
      return errorResponse(
        'NOT_FOUND',
        'Estudante não encontrado ou não pertence ao usuário',
        404
      );
    }

    // 5. Verificar duplicatas existentes
    const { data: existingAbsences } = await supabaseAdmin
      .from('student_absences')
      .select('date')
      .eq('student_id', sanitizedData.estudanteId)
      .in('date', sanitizedData.datas);

    const existingDates = (existingAbsences || []).map((a: any) => a.date);
    const newDates = sanitizedData.datas.filter(
      (date) => !existingDates.includes(date)
    );

    if (newDates.length === 0) {
      return errorResponse(
        'CONFLICT',
        'Todas as datas já possuem faltas registradas',
        409,
        { existingDates }
      );
    }

    // 6. Preparar dados para Supabase (múltiplas inserções)
    const absencesInsert = newDates.map((date) => ({
      student_id: sanitizedData.estudanteId,
      date,
      bimester: sanitizedData.bimestre,
      justified: sanitizedData.justificada ?? false,
      justification_reason: sanitizedData.motivoJustificativa || null,
      medical_certificate_id: sanitizedData.atestadoId || null,
      notes: sanitizedData.observacoes || null,
      school_year: new Date().getFullYear().toString(),
      created_by: 'api_bulk',
    }));

    // 7. Inserir faltas em lote
    const { data: insertedData, error: insertError } = (await supabaseAdmin
      .from('student_absences')
      .insert(absencesInsert as any)
      .select('id')) as { data: any; error: any };

    if (insertError) {
      console.error('[POST /api/absences/bulk] Error inserting absences:', insertError);
      return errorResponse(
        'DATABASE_ERROR',
        'Erro ao criar faltas em lote',
        500,
        process.env.NODE_ENV === 'development' ? insertError : undefined
      );
    }

    // 8. Retornar sucesso
    return successResponse(
      {
        created: insertedData.length,
        skipped: sanitizedData.datas.length - newDates.length,
        ids: insertedData.map((item: any) => item.id),
        skippedDates: existingDates,
      },
      `${insertedData.length} falta(s) registrada(s) com sucesso`,
      201
    );
  } catch (error) {
    return handleError(error, 'POST /api/absences/bulk');
  }
});
