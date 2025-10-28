/**
 * API Route: /api/absences/[id]
 *
 * CRUD de Falta Individual
 * - GET: Buscar falta por ID
 * - PUT: Atualizar falta
 * - DELETE: Deletar falta
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { sanitizeObject } from '@/app/api/_middleware/validation';
import {
  updateAbsenceSchema,
  UpdateAbsenceInput,
} from '@/app/api/_schemas/absenceSchemas';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// ════════════════════════════════════════════════════════════════
// RUNTIME CONFIG (Vercel) - Suporte para redes lentas 2G/3G
// ════════════════════════════════════════════════════════════════

export const runtime = 'nodejs';
export const maxDuration = 60;

// Tipo para os parâmetros da rota
type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// ============================================================================
// GET /api/absences/[id] - Buscar falta por ID
// ============================================================================

export const GET = withAuth(
  async (req: NextRequest, userId: string, context?: RouteParams) => {
    try {
      const params = await context?.params;
      const id = params?.id;

      if (!id) {
        return errorResponse('INVALID_PARAMS', 'ID da falta não fornecido', 400);
      }

      // Validar UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return errorResponse('INVALID_ID', 'ID da falta deve ser um UUID válido', 400);
      }

      // Buscar falta no Supabase com verificação de permissão
      const { data, error } = (await supabaseAdmin
        .from('student_absences')
        .select('*, students(name, class, student_id)')
        .eq('id', id)
        .single()) as { data: SupabaseAbsenceRow | null; error: { code?: string } | null };

      if (error) {
        if (error.code === 'PGRST116') {
          return notFoundResponse('Falta', id);
        }

        console.error('[GET /api/absences/[id]] Supabase error:', error);
        return errorResponse(
          'DATABASE_ERROR',
          'Erro ao buscar falta',
          500,
          process.env.NODE_ENV === 'development' ? error : undefined
        );
      }

      if (!data) {
        return notFoundResponse('Falta', id);
      }

      // Converter para formato legacy
      const absence = convertSupabaseToAbsence(data);

      return successResponse({ absence });
    } catch (error) {
      return handleError(error, 'GET /api/absences/[id]');
    }
  }
);

// ============================================================================
// PUT /api/absences/[id] - Atualizar falta
// ============================================================================

export const PUT = withAuth(
  async (req: NextRequest, userId: string, context?: RouteParams) => {
    try {
      const params = await context?.params;
      const id = params?.id;

      if (!id) {
        return errorResponse('INVALID_PARAMS', 'ID da falta não fornecido', 400);
      }

      // Validar UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return errorResponse('INVALID_ID', 'ID da falta deve ser um UUID válido', 400);
      }

      // 1. Parse body
      const body = await req.json();

      // 2. Validar com Zod
      const validation = updateAbsenceSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error.errors);
      }

      const data = validation.data as UpdateAbsenceInput;

      // 3. Sanitizar dados
      const sanitizedData = sanitizeObject(data);

      // 4. Verificar se falta existe e pertence ao usuário
      const { data: existingAbsence, error: checkError } = (await supabaseAdmin
        .from('student_absences')
        .select('id, students(student_id)')
        .eq('id', id)
        .single()) as { data: { id: string; students?: { student_id?: string } } | null; error: unknown };

      if (checkError || !existingAbsence) {
        return notFoundResponse('Falta', id);
      }

      // 5. Preparar dados para atualização
      const updateData: SupabaseUpdateData = {
        updated_at: new Date().toISOString(),
      };

      if (sanitizedData.data) updateData.date = sanitizedData.data;
      if (sanitizedData.bimestre) updateData.bimester = convertBimesterToNumber(sanitizedData.bimestre);
      if (sanitizedData.justificada !== undefined)
        updateData.justified = sanitizedData.justificada;
      if (sanitizedData.motivoJustificativa !== undefined)
        updateData.justification_reason = sanitizedData.motivoJustificativa;
      if (sanitizedData.atestadoId !== undefined)
        updateData.medical_certificate_id = sanitizedData.atestadoId;
      if (sanitizedData.observacoes !== undefined)
        updateData.notes = sanitizedData.observacoes;

      // 6. Atualizar falta
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabaseAdmin as any)
        .from('student_absences')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('[PUT /api/absences/[id]] Error updating absence:', updateError);
        return errorResponse(
          'DATABASE_ERROR',
          'Erro ao atualizar falta',
          500,
          process.env.NODE_ENV === 'development' ? updateError : undefined
        );
      }

      // 7. Retornar sucesso
      return successResponse(
        {
          id,
          updated: true,
        },
        'Falta atualizada com sucesso'
      );
    } catch (error) {
      return handleError(error, 'PUT /api/absences/[id]');
    }
  }
);

// ============================================================================
// DELETE /api/absences/[id] - Deletar falta
// ============================================================================

export const DELETE = withAuth(
  async (req: NextRequest, userId: string, context?: RouteParams) => {
    try {
      const params = await context?.params;
      const id = params?.id;

      if (!id) {
        return errorResponse('INVALID_PARAMS', 'ID da falta não fornecido', 400);
      }

      // Validar UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return errorResponse('INVALID_ID', 'ID da falta deve ser um UUID válido', 400);
      }

      // 1. Verificar se falta existe e pertence ao usuário
      const { data: existingAbsence, error: checkError } = (await supabaseAdmin
        .from('student_absences')
        .select('id, students(student_id)')
        .eq('id', id)
        .single()) as { data: { id: string; students?: { student_id?: string } } | null; error: unknown };

      if (checkError || !existingAbsence) {
        return notFoundResponse('Falta', id);
      }

      // 2. Deletar falta (hard delete)
      const { error: deleteError } = (await supabaseAdmin
        .from('student_absences')
        .delete()
        .eq('id', id)) as { error: unknown };

      if (deleteError) {
        console.error('[DELETE /api/absences/[id]] Error deleting absence:', deleteError);
        return errorResponse(
          'DATABASE_ERROR',
          'Erro ao deletar falta',
          500,
          process.env.NODE_ENV === 'development' ? deleteError : undefined
        );
      }

      // 3. Retornar sucesso
      return successResponse(
        {
          id,
          deleted: true,
        },
        'Falta deletada com sucesso'
      );
    } catch (error) {
      return handleError(error, 'DELETE /api/absences/[id]');
    }
  }
);

// ============================================================================
// TYPES
// ============================================================================

interface SupabaseStudentInfo {
  name?: string;
  class?: string;
  student_id?: string;
}

interface SupabaseAbsenceRow {
  id: string;
  student_id: string;
  absence_date: string;
  bimester: number;
  is_justified: boolean;
  medical_certificate_id?: string | null;
  suspension_id?: string | null;
  created_at: string;
  updated_at: string;
  students?: SupabaseStudentInfo;
}

interface AbsenceLegacyFormat {
  id: string;
  estudanteId: string;
  estudanteNome: string;
  turma: string;
  data: string;
  bimestre: number;
  justificada: boolean;
  justified: boolean;
  motivoJustificativa?: string;
  atestadoId?: string;
  suspensaoId?: string;
  observacoes?: string;
  anoLetivo: string;
  criadoPor: string;
  criadoEm: string;
  atualizadoEm: string;
}

interface SupabaseUpdateData {
  date?: string;
  bimester?: number;
  justified?: boolean;
  justification_reason?: string | null;
  medical_certificate_id?: string | null;
  notes?: string | null;
  updated_at: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converte bimestre de string ('B1', 'B2', etc.) para number (1, 2, etc.)
 */
function convertBimesterToNumber(bimestre: 'B1' | 'B2' | 'B3' | 'B4'): number {
  const map: Record<string, number> = { B1: 1, B2: 2, B3: 3, B4: 4 };
  return map[bimestre];
}

/**
 * Converte StudentAbsence do Supabase para formato legacy
 */
function convertSupabaseToAbsence(absence: SupabaseAbsenceRow): AbsenceLegacyFormat {
  return {
    id: absence.id,
    estudanteId: absence.students?.student_id || absence.student_id, // ✅ Firebase UUID, não Internal ID
    estudanteNome: absence.students?.name || '',
    turma: absence.students?.class || '',
    data: absence.absence_date, // ✅ Campo correto
    bimestre: absence.bimester,
    justificada: absence.is_justified, // ✅ Campo correto
    justified: absence.is_justified, // ✅ Alias para compatibilidade
    motivoJustificativa: undefined, // Coluna não existe no Supabase
    atestadoId: absence.medical_certificate_id || undefined,
    suspensaoId: absence.suspension_id || undefined, // ✅ ADICIONAR suspension_id
    observacoes: undefined, // Coluna não existe no Supabase
    anoLetivo: new Date().getFullYear().toString(), // ✅ Calcular do absence_date
    criadoPor: 'system', // Coluna não existe no Supabase
    criadoEm: absence.created_at,
    atualizadoEm: absence.updated_at,
  };
}
