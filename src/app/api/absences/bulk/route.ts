/**
 * API Route: /api/absences/bulk
 *
 * Criar múltiplas faltas de uma vez
 * - POST: Criar várias faltas para um estudante
 */

import { NextRequest } from 'next/server';
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

// ════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════

/**
 * Converte bimestre de string ('B1', 'B2', etc.) para number (1, 2, etc.)
 */
function convertBimesterToNumber(bimestre: 'B1' | 'B2' | 'B3' | 'B4'): number {
  const map: Record<string, number> = { B1: 1, B2: 2, B3: 3, B4: 4 };
  return map[bimestre];
}

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

interface ExistingAbsenceRow {
  date: string;
}

interface SupabaseAbsenceInsert {
  student_id: string;
  date: string;
  bimester: number;
  justified: boolean;
  justification_reason: string | null;
  medical_certificate_id: string | null;
  notes: string | null;
  school_year: string;
  created_by: string;
}

interface InsertedAbsenceRow {
  id: string;
}

// ============================================================================
// POST /api/absences/bulk - Criar múltiplas faltas
// ============================================================================

export const POST = withAuth(async (_req: NextRequest, __userId: string) => {
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
    const { data: student, error: studentError } = (await supabaseAdmin
      .from('students')
      .select('id')
      .eq('id', sanitizedData.estudanteId)
      .eq('deleted', false)
      .single()) as { data: { id: string } | null; error: unknown };

    if (studentError || !student) {
      return errorResponse(
        'NOT_FOUND',
        'Estudante não encontrado ou não pertence ao usuário',
        404
      );
    }

    // 5. Verificar duplicatas existentes
    const { data: existingAbsences } = (await supabaseAdmin
      .from('student_absences')
      .select('date')
      .eq('student_id', sanitizedData.estudanteId)
      .in('date', sanitizedData.datas)) as { data: ExistingAbsenceRow[] | null };

    const existingDates = (existingAbsences || []).map((a) => a.date);
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
    const absencesInsert: SupabaseAbsenceInsert[] = newDates.map((date) => ({
      student_id: sanitizedData.estudanteId,
      date,
      bimester: convertBimesterToNumber(sanitizedData.bimestre),
      justified: sanitizedData.justificada ?? false,
      justification_reason: sanitizedData.motivoJustificativa || null,
      medical_certificate_id: sanitizedData.atestadoId || null,
      notes: sanitizedData.observacoes || null,
      school_year: new Date().getFullYear().toString(),
      created_by: 'api_bulk',
    }));

    // 7. Inserir faltas em lote
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: insertedData, error: insertError } = (await (supabaseAdmin as any)
      .from('student_absences')
      .insert(absencesInsert)
      .select('id')) as { data: InsertedAbsenceRow[] | null; error: unknown };

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
    const insertedCount = insertedData?.length || 0;
    return successResponse(
      {
        created: insertedCount,
        skipped: sanitizedData.datas.length - newDates.length,
        ids: insertedData?.map((item: InsertedAbsenceRow) => item.id) || [],
        skippedDates: existingDates,
      },
      `${insertedCount} falta(s) registrada(s) com sucesso`,
      201
    );
  } catch (error) {
    return handleError(error, 'POST /api/absences/bulk');
  }
});
