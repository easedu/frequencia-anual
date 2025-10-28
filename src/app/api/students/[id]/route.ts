/**
 * API Route: /api/students/[id]
 *
 * CRUD de Estudante Individual
 * - GET: Buscar estudante por ID
 * - PUT: Atualizar estudante
 * - DELETE: Soft delete de estudante
 */

import { NextRequest } from 'next/server';
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

// ============================================================================
// TIPOS
// ============================================================================

// Tipo para os parâmetros da rota
type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// Tipos para respostas do Supabase
interface SupabaseStudent {
  id: string;
  student_id: string;
  name: string;
  class: string;
  shift: string;
  status: string;
  bolsa_familia: string;
  registration_number?: string;
  birth_date?: string;
  email?: string;
  address?: Record<string, unknown>;
  disabilities?: string[];
  exam_scores?: unknown[]; // Prova São Paulo data (JSONB array)
  created_at: string;
  updated_at: string;
  student_contacts?: SupabaseContact[];
}

interface SupabaseContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  phone_numeric: string;
  can_receive_whatsapp: boolean;
  whatsapp_data?: Record<string, unknown>;
}

interface WhatsAppVerificationData {
  phone_number: string;
  is_verified: boolean;
  account_exists: boolean;
  verified_at?: string;
}

interface WhatsAppVerificationResult {
  verified: boolean;
  exists: boolean;
  verifiedAt?: string;
}

interface ContactInsert {
  student_id: string;
  name: string;
  relationship: string;
  phone: string;
  phone_numeric: string;
  can_receive_whatsapp: boolean;
  whatsapp_data: Record<string, unknown>;
  version: string;
}

// ============================================================================
// GET /api/students/[id] - Buscar estudante por ID
// ============================================================================

export const GET = withAuth(
  async (req: NextRequest, _userId: string, context?: RouteParams) => {
    try {
      // Next.js 15 - params é Promise e precisa de await
      const params = await context?.params;
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

      // Buscar estudante no Supabase com dados de verificação WhatsApp
      // ✅ Query by student_id (Firebase UUID) not internal id
      const { data, error } = await supabaseAdmin
        .from('students')
        .select(`
          *,
          student_contacts (
            id,
            name,
            relationship,
            phone,
            can_receive_whatsapp,
            whatsapp_data
          )
        `)
        .eq('student_id', id)
        .eq('deleted', false)
        .single() as { data: SupabaseStudent | null; error: { code?: string } | null };

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

      // Buscar dados de verificação WhatsApp para os contatos
      const contactPhones = (data.student_contacts || [])
        .map((c) => c.phone)
        .filter(Boolean);

      let verifiedWhatsAppMap = new Map<string, WhatsAppVerificationResult>();

      if (contactPhones.length > 0) {
        const { data: verifiedData } = await supabaseAdmin
          .from('whatsapp_verified_numbers')
          .select('*')
          .in('phone_number', contactPhones) as { data: WhatsAppVerificationData[] | null; error: unknown };

        if (verifiedData) {
          verifiedData.forEach((v) => {
            verifiedWhatsAppMap.set(v.phone_number, {
              verified: v.is_verified,
              exists: v.account_exists,
              verifiedAt: v.verified_at,
            });
          });
        }
      }

      // Converter para formato legacy com dados de verificação
      const student = convertSupabaseToEstudante(data, verifiedWhatsAppMap);

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
  async (req: NextRequest, _userId: string, context?: RouteParams) => {
    try {
      const params = await context?.params;
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
        console.error('[API PUT /api/students/[id]] Validation failed:', {
          errors: validation.error.errors,
          body: JSON.stringify(body, null, 2)
        });
        return validationErrorResponse(validation.error.errors);
      }

      const data = validation.data as UpdateStudentInput;

      // 3. Sanitizar dados
      const sanitizedData = sanitizeObject(data);

      // 4. Verificar se estudante existe e pertence ao usuário
      // ✅ Query by student_id (Firebase UUID)
      const { data: existingStudent, error: checkError } = await supabaseAdmin
        .from('students')
        .select('id, student_id')
        .eq('student_id', id)
        .eq('deleted', false)
        .single() as { data: { id: string; student_id: string } | null; error: unknown };

      if (checkError || !existingStudent) {
        return notFoundResponse('Estudante', id);
      }

      // Get Internal ID for update operations
      const internalId = existingStudent.id;

      // 5. Preparar dados para atualização
      const updateData: Record<string, unknown> = {
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
      if (sanitizedData.email !== undefined) updateData.email = sanitizedData.email;
      if (sanitizedData.endereco !== undefined) updateData.address = sanitizedData.endereco;
      if (sanitizedData.deficiencia !== undefined)
        updateData.disabilities = sanitizedData.deficiencia ? [sanitizedData.deficiencia] : [];

      // 6. Atualizar estudante (using Internal ID for update)
      const { error: updateError } = await supabaseAdmin
        .from('students')
        // @ts-expect-error - Supabase types are complex, updateData is validated
        .update(updateData)
        .eq('id', internalId);

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
        // ✅ PRESERVAR whatsappData: Buscar contatos existentes antes de deletar
        const { data: existingContacts } = await supabaseAdmin
          .from('student_contacts')
          .select('phone, whatsapp_data')
          .eq('student_id', internalId) as { data: { phone: string; whatsapp_data?: Record<string, unknown> }[] | null };

        // Criar mapa de whatsappData por telefone
        const whatsappDataMap = new Map<string, Record<string, unknown>>();
        if (existingContacts) {
          existingContacts.forEach((contact) => {
            if (contact.phone && contact.whatsapp_data) {
              whatsappDataMap.set(contact.phone, contact.whatsapp_data);
            }
          });
        }

        // Deletar contatos existentes (using Internal ID)
        await supabaseAdmin.from('student_contacts').delete().eq('student_id', internalId);

        // Inserir novos contatos (using Internal ID)
        if (sanitizedData.contatos.length > 0) {
          const contactsInsert: ContactInsert[] = sanitizedData.contatos.map((contato) => {
            // ✅ PADRONIZADO: Usar apenas podeReceberMensagem (campo padrão do formulário)
            const canReceiveWhatsapp = contato.podeReceberMensagem ?? true;

            // ✅ PRESERVAR whatsappData: Usar dados existentes se telefone não mudou
            const preservedWhatsappData = whatsappDataMap.get(contato.telefone);

            return {
              student_id: internalId,
              name: contato.nome,
              relationship: contato.parentesco || '',
              phone: contato.telefone,
              phone_numeric: contato.telefone.replace(/\D/g, ''),
              can_receive_whatsapp: canReceiveWhatsapp,
              whatsapp_data: preservedWhatsappData || {},
              version: '3.0',
            };
          });

          const { error: contactsError } = await supabaseAdmin
            .from('student_contacts')
            // @ts-expect-error - Supabase insert types são complexos, já validado por ContactInsert[]
            .insert(contactsInsert);

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
  async (req: NextRequest, _userId: string, context?: RouteParams) => {
    try {
      const params = await context?.params;
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
      // ✅ Query by student_id (Firebase UUID)
      const { data: existingStudent, error: checkError } = await supabaseAdmin
        .from('students')
        .select('id, student_id')
        .eq('student_id', id)
        .eq('deleted', false)
        .single() as { data: { id: string; student_id: string } | null; error: unknown };

      if (checkError || !existingStudent) {
        return notFoundResponse('Estudante', id);
      }

      // Get Internal ID for update operations
      const internalId = existingStudent.id;

      // 2. Soft delete (marcar como deletado, using Internal ID)
      const { error: deleteError } = await supabaseAdmin
        .from('students')
        // @ts-expect-error - Supabase types are complex
        .update({
          deleted: true,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', internalId);

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
function convertSupabaseToEstudante(
  student: SupabaseStudent,
  verifiedWhatsAppMap?: Map<string, WhatsAppVerificationResult>
): Record<string, unknown> {
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
    email: student.email || '',
    contatos: (student.student_contacts || []).map((contact) => {
      // Buscar dados de verificação WhatsApp
      const verificationData = verifiedWhatsAppMap?.get(contact.phone);

      return {
        id: contact.id, // ✅ CRITICAL: ID do contato para updates
        nome: contact.name,
        parentesco: contact.relationship || '',
        telefone: contact.phone || '',
        podeReceberMensagem: contact.can_receive_whatsapp,
        // Usar dados de verified_whatsapp_numbers se disponível, senão whatsapp_data
        whatsapp: verificationData || contact.whatsapp_data || undefined,
      };
    }),
    endereco: student.address || undefined,
    deficiencia:
      Array.isArray(student.disabilities) && student.disabilities.length > 0
        ? student.disabilities[0]
        : undefined,
    provaSaoPaulo: Array.isArray(student.exam_scores) ? student.exam_scores : [],
  };
}
