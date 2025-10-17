/**
 * API Route: /api/students/[id]
 *
 * CRUD de Estudante Individual
 * - GET: Buscar estudante por ID
 * - PUT: Atualizar estudante
 * - DELETE: Soft delete de estudante
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { sanitizeObject } from '@/app/api/_middleware/validation';
import {
  updateStudentSchema,
  UpdateStudentInput,
} from '@/app/api/_schemas/studentSchemas';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Tipo para os parâmetros da rota
type RouteParams = {
  params: {
    id: string;
  };
};

// ============================================================================
// GET /api/students/[id] - Buscar estudante por ID
// ============================================================================

export const GET = withAuth(
  async (req: NextRequest, userId: string, context?: RouteParams) => {
    try {
      // Next.js 15 - params vem do terceiro parâmetro
      const params = context?.params;
      const id = params?.id;

      if (!id) {
        return errorResponse('INVALID_PARAMS', 'ID do estudante não fornecido', 400);
      }

      // Validar UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return errorResponse('INVALID_ID', 'ID do estudante deve ser um UUID válido', 400);
      }

      // Buscar estudante no Supabase
      const { data, error } = await supabaseAdmin
        .from('students')
        .select('*, student_contacts(*)')
        .eq('id', id)
        .eq('user_id', userId) // RLS - apenas estudantes do usuário
        .eq('deleted', false)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return notFoundResponse('Estudante', id);
        }

        console.error('[GET /api/students/[id]] Supabase error:', error);
        return errorResponse(
          'DATABASE_ERROR',
          'Erro ao buscar estudante',
          500,
          process.env.NODE_ENV === 'development' ? error : undefined
        );
      }

      if (!data) {
        return notFoundResponse('Estudante', id);
      }

      // Converter para formato legacy
      const student = convertSupabaseToEstudante(data);

      return successResponse({ student });
    } catch (error) {
      return handleError(error, 'GET /api/students/[id]');
    }
  }
);

// ============================================================================
// PUT /api/students/[id] - Atualizar estudante
// ============================================================================

export const PUT = withAuth(
  async (req: NextRequest, userId: string, context?: RouteParams) => {
    try {
      const params = context?.params;
      const id = params?.id;

      if (!id) {
        return errorResponse('INVALID_PARAMS', 'ID do estudante não fornecido', 400);
      }

      // Validar UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return errorResponse('INVALID_ID', 'ID do estudante deve ser um UUID válido', 400);
      }

      // 1. Parse body
      const body = await req.json();

      // 2. Validar com Zod
      const validation = updateStudentSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error.errors);
      }

      const data = validation.data as UpdateStudentInput;

      // 3. Sanitizar dados
      const sanitizedData = sanitizeObject(data);

      // 4. Verificar se estudante existe e pertence ao usuário
      const { data: existingStudent, error: checkError } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .eq('deleted', false)
        .single();

      if (checkError || !existingStudent) {
        return notFoundResponse('Estudante', id);
      }

      // 5. Preparar dados para atualização
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (sanitizedData.nome) updateData.name = sanitizedData.nome;
      if (sanitizedData.turma) updateData.class = sanitizedData.turma;
      if (sanitizedData.turno) updateData.shift = sanitizedData.turno;
      if (sanitizedData.status) updateData.status = sanitizedData.status;
      if (sanitizedData.bolsaFamilia) updateData.bolsa_familia = sanitizedData.bolsaFamilia;
      if (sanitizedData.matricula !== undefined)
        updateData.registration_number = sanitizedData.matricula;
      if (sanitizedData.dataNascimento !== undefined)
        updateData.birth_date = sanitizedData.dataNascimento;
      if (sanitizedData.endereco !== undefined) updateData.address = sanitizedData.endereco;
      if (sanitizedData.deficiencia !== undefined)
        updateData.disabilities = sanitizedData.deficiencia ? [sanitizedData.deficiencia] : [];

      // 6. Atualizar estudante
      const { error: updateError } = await supabaseAdmin
        .from('students')
        // @ts-ignore - Supabase types are complex, updateData is validated
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('[PUT /api/students/[id]] Error updating student:', updateError);
        return errorResponse(
          'DATABASE_ERROR',
          'Erro ao atualizar estudante',
          500,
          process.env.NODE_ENV === 'development' ? updateError : undefined
        );
      }

      // 7. Atualizar contatos (se fornecidos)
      if (sanitizedData.contatos !== undefined) {
        // Deletar contatos existentes
        await supabaseAdmin.from('student_contacts').delete().eq('student_id', id);

        // Inserir novos contatos
        if (sanitizedData.contatos.length > 0) {
          const contactsInsert = sanitizedData.contatos.map((contato: any) => ({
            student_id: id,
            name: contato.nome,
            relationship: contato.parentesco || '',
            phone: contato.telefone,
            phone_numeric: contato.telefone.replace(/\D/g, ''),
            can_receive_whatsapp: contato.podeReceberMensagem ?? true,
            whatsapp_data: contato.whatsapp || {},
            version: '3.0',
          }));

          const { error: contactsError } = (await supabaseAdmin
            .from('student_contacts')
            .insert(contactsInsert as any)) as { error: any };

          if (contactsError) {
            console.error('[PUT /api/students/[id]] Error updating contacts:', contactsError);
            // Não falhar se contatos falharem
          }
        }
      }

      // 8. Retornar sucesso
      return successResponse(
        {
          id,
          updated: true,
        },
        'Estudante atualizado com sucesso'
      );
    } catch (error) {
      return handleError(error, 'PUT /api/students/[id]');
    }
  }
);

// ============================================================================
// DELETE /api/students/[id] - Soft delete de estudante
// ============================================================================

export const DELETE = withAuth(
  async (req: NextRequest, userId: string, context?: RouteParams) => {
    try {
      const params = context?.params;
      const id = params?.id;

      if (!id) {
        return errorResponse('INVALID_PARAMS', 'ID do estudante não fornecido', 400);
      }

      // Validar UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return errorResponse('INVALID_ID', 'ID do estudante deve ser um UUID válido', 400);
      }

      // 1. Verificar se estudante existe e pertence ao usuário
      const { data: existingStudent, error: checkError } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .eq('deleted', false)
        .single();

      if (checkError || !existingStudent) {
        return notFoundResponse('Estudante', id);
      }

      // 2. Soft delete (marcar como deletado)
      const { error: deleteError } = await supabaseAdmin
        .from('students')
        // @ts-ignore - Supabase types are complex
        .update({
          deleted: true,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (deleteError) {
        console.error('[DELETE /api/students/[id]] Error deleting student:', deleteError);
        return errorResponse(
          'DATABASE_ERROR',
          'Erro ao deletar estudante',
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
        'Estudante deletado com sucesso'
      );
    } catch (error) {
      return handleError(error, 'DELETE /api/students/[id]');
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converte Student do Supabase para formato legacy Estudante
 */
function convertSupabaseToEstudante(student: any): any {
  return {
    id: student.id,
    estudanteId: student.student_id,
    nome: student.name,
    turma: student.class,
    status: student.status,
    turno: student.shift,
    bolsaFamilia: student.bolsa_familia || 'NÃO',
    matricula: student.registration_number || undefined,
    dataNascimento: student.birth_date || undefined,
    email: undefined,
    contatos: (student.student_contacts || []).map((contact: any) => ({
      nome: contact.name,
      parentesco: contact.relationship || '',
      telefone: contact.phone || '',
      podeReceberMensagem: contact.can_receive_whatsapp,
      whatsapp: contact.whatsapp_data || undefined,
    })),
    endereco: student.address || undefined,
    deficiencia:
      Array.isArray(student.disabilities) && student.disabilities.length > 0
        ? student.disabilities[0]
        : undefined,
    provaSaoPaulo: [],
  };
}
