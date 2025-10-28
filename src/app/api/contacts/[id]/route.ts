/**
 * API Route: /api/contacts/[id]
 *
 * CRUD de Contato Individual
 * - GET: Buscar contato por ID
 * - PUT: Atualizar contato
 * - DELETE: Deletar contato
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { sanitizeObject } from '@/app/api/_middleware/validation';
import {
  updateContactSchema,
  UpdateContactInput,
} from '@/app/api/_schemas/contactSchemas';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { StudentContact } from '@/lib/supabaseClient';
import type { WhatsAppData } from '@/types';

// Tipo para os parâmetros da rota
type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// ============================================================================
// GET /api/contacts/[id] - Buscar contato por ID
// ============================================================================

export const GET = withAuth(
  async (req: NextRequest, _userId: string, context?: RouteParams) => {
    try {
      const params = await context?.params;
      const id = params?.id;

      if (!id) {
        return errorResponse('INVALID_PARAMS', 'ID do contato não fornecido', 400);
      }

      // Validar UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return errorResponse('INVALID_ID', 'ID do contato deve ser um UUID válido', 400);
      }

      // Buscar contato no Supabase com verificação de permissão
      const { data, error } = await supabaseAdmin
        .from('student_contacts')
        .select('*, students(student_id)')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return notFoundResponse('Contato', id);
        }

        console.error('[GET /api/contacts/[id]] Supabase error:', error);
        return errorResponse(
          'DATABASE_ERROR',
          'Erro ao buscar contato',
          500,
          process.env.NODE_ENV === 'development' ? error : undefined
        );
      }

      if (!data) {
        return notFoundResponse('Contato', id);
      }

      // Converter para formato legacy
      const contact = convertSupabaseToContact(data);

      return successResponse({ contact });
    } catch (error) {
      return handleError(error, 'GET /api/contacts/[id]');
    }
  }
);

// ============================================================================
// PUT /api/contacts/[id] - Atualizar contato
// ============================================================================

export const PUT = withAuth(
  async (req: NextRequest, _userId: string, context?: RouteParams) => {
    try {
      const params = await context?.params;
      const id = params?.id;

      if (!id) {
        return errorResponse('INVALID_PARAMS', 'ID do contato não fornecido', 400);
      }

      // Validar UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return errorResponse('INVALID_ID', 'ID do contato deve ser um UUID válido', 400);
      }

      // 1. Parse body
      const body = await req.json();

      // 2. Validar com Zod
      const validation = updateContactSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error.errors);
      }

      const data = validation.data as UpdateContactInput;

      // 3. Sanitizar dados
      const sanitizedData = sanitizeObject(data);

      // 4. Verificar se contato existe e pertence ao usuário
      const { data: existingContact, error: checkError } = await supabaseAdmin
        .from('student_contacts')
        .select('id, students(student_id)')
        .eq('id', id)
        .single();

      if (checkError || !existingContact) {
        return notFoundResponse('Contato', id);
      }

      // 5. Preparar dados para atualização
      const updateData: Record<string, string | number | boolean | WhatsAppData | null> = {
        updated_at: new Date().toISOString(),
      };

      if (sanitizedData.nome) updateData.name = sanitizedData.nome;
      if (sanitizedData.telefone) {
        updateData.phone = sanitizedData.telefone;
        updateData.phone_numeric = sanitizedData.telefone.replace(/\D/g, '');
      }
      if (sanitizedData.parentesco !== undefined)
        updateData.relationship = sanitizedData.parentesco;
      if (sanitizedData.podeReceberMensagem !== undefined)
        updateData.can_receive_whatsapp = sanitizedData.podeReceberMensagem;
      if (sanitizedData.whatsappData !== undefined)
        updateData.whatsapp_data = sanitizedData.whatsappData;

      // 6. Atualizar contato
      const { error: updateError } = await supabaseAdmin
        .from('student_contacts')
        // @ts-ignore - Supabase types are complex, updateData is validated
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('[PUT /api/contacts/[id]] Error updating contact:', updateError);
        return errorResponse(
          'DATABASE_ERROR',
          'Erro ao atualizar contato',
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
        'Contato atualizado com sucesso'
      );
    } catch (error) {
      return handleError(error, 'PUT /api/contacts/[id]');
    }
  }
);

// ============================================================================
// DELETE /api/contacts/[id] - Deletar contato
// ============================================================================

export const DELETE = withAuth(
  async (req: NextRequest, _userId: string, context?: RouteParams) => {
    try {
      const params = await context?.params;
      const id = params?.id;

      if (!id) {
        return errorResponse('INVALID_PARAMS', 'ID do contato não fornecido', 400);
      }

      // Validar UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return errorResponse('INVALID_ID', 'ID do contato deve ser um UUID válido', 400);
      }

      // 1. Verificar se contato existe e pertence ao usuário
      const { data: existingContact, error: checkError } = await supabaseAdmin
        .from('student_contacts')
        .select('id, students(student_id)')
        .eq('id', id)
        .single();

      if (checkError || !existingContact) {
        return notFoundResponse('Contato', id);
      }

      // 2. Deletar contato (hard delete - contatos não têm soft delete)
      const { error: deleteError } = await supabaseAdmin
        .from('student_contacts')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('[DELETE /api/contacts/[id]] Error deleting contact:', deleteError);
        return errorResponse(
          'DATABASE_ERROR',
          'Erro ao deletar contato',
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
        'Contato deletado com sucesso'
      );
    } catch (error) {
      return handleError(error, 'DELETE /api/contacts/[id]');
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formato legacy do contato para resposta da API
 */
interface LegacyContactResponse {
  id: string;
  estudanteId: string;
  nome: string;
  parentesco: string;
  telefone: string;
  podeReceberMensagem: boolean;
  whatsapp?: {
    verified: boolean;
    exists: boolean;
    verifiedAt: string | null;
    name: string | null;
    number: string | null;
  };
}

/**
 * Converte StudentContact do Supabase para formato legacy
 */
function convertSupabaseToContact(contact: StudentContact & { students?: { student_id: string } }): LegacyContactResponse {
  const whatsappData = (contact.whatsapp_data as WhatsAppData) || {};

  return {
    id: contact.id,
    estudanteId: contact.student_id,
    nome: contact.name,
    parentesco: contact.relationship || '',
    telefone: contact.phone || '',
    podeReceberMensagem: contact.can_receive_whatsapp,
    whatsapp: whatsappData.verified
      ? {
          verified: whatsappData.verified || false,
          exists: whatsappData.exists || false,
          verifiedAt: whatsappData.verifiedAt || null,
          name: whatsappData.name || null,
          number: whatsappData.number || null,
        }
      : undefined,
  };
}
