/**
 * API Route: /api/contacts
 *
 * CRUD de Contatos de Estudantes
 * - GET: Listar contatos com filtros
 * - POST: Criar novo contato
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { validateQueryParams, sanitizeObject } from '@/app/api/_middleware/validation';
import {
  createContactSchema,
  contactQuerySchema,
  CreateContactInput,
} from '@/app/api/_schemas/contactSchemas';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  paginatedResponse,
} from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getCountStrategy } from '@/app/api/_utils/countStrategy';
import type { StudentContact, StudentContactInsert } from '@/lib/supabaseClient';
import type { WhatsAppData } from '@/types';

// ============================================================================
// GET /api/contacts - Listar contatos com filtros
// ============================================================================

export const GET = withAuth(async (req: NextRequest, __userId: string) => {
  try {
    // 1. Validar query params
    const validation = validateQueryParams(req, contactQuerySchema);

    if (!validation.success) {
      return validation.response;
    }

    const {
      estudanteId,
      podeReceberMensagem,
      whatsappVerified,
      page,
      limit,
    } = validation.data;

    // 2. ✅ FASE 4.1: Otimizar count
    const countOption = getCountStrategy(page);

    // Construir query no Supabase
    let query = supabaseAdmin
      .from('student_contacts')
      .select('*, students(student_id)', countOption)
      .order('name', { ascending: true });

    // Aplicar filtros
    if (estudanteId) {
      query = query.eq('student_id', estudanteId);
    }

    if (podeReceberMensagem !== undefined) {
      query = query.eq('can_receive_whatsapp', podeReceberMensagem);
    }

    if (whatsappVerified !== undefined) {
      // Filtrar por WhatsApp verificado (JSONB query)
      query = query.eq('whatsapp_data->verified', whatsappVerified);
    }

    // Paginação
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // 3. Executar query
    const { data, error, count } = await query;

    if (error) {
      console.error('[GET /api/contacts] Supabase error:', error);
      return errorResponse(
        'DATABASE_ERROR',
        'Erro ao buscar contatos',
        500,
        process.env.NODE_ENV === 'development' ? error : undefined
      );
    }

    // 4. Converter para formato legacy
    const contacts = (data || []).map(convertSupabaseToContact);

    // 5. Retornar com paginação
    return paginatedResponse(contacts, page, limit, count || 0);
  } catch (error) {
    return handleError(error, 'GET /api/contacts');
  }
});

// ============================================================================
// POST /api/contacts - Criar novo contato
// ============================================================================

export const POST = withAuth(async (req: NextRequest, __userId: string) => {
  try {
    // 1. Parse body
    const body = await req.json();

    // 2. Validar com Zod
    const validation = createContactSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(validation.error.errors);
    }

    const data = validation.data as CreateContactInput;

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

    // 5. Preparar dados para Supabase
    const contactInsert: StudentContactInsert = {
      student_id: sanitizedData.estudanteId,
      name: sanitizedData.nome,
      phone: sanitizedData.telefone,
      phone_numeric: sanitizedData.telefone.replace(/\D/g, ''),
      relationship: sanitizedData.parentesco || '',
      can_receive_whatsapp: sanitizedData.podeReceberMensagem ?? true,
      whatsapp_data: sanitizedData.whatsappData || {},
      version: '3.0',
      email: null,
      migrated_from: null,
      synced_from_old_structure: false,
      is_placeholder: false,
      synced_at: null,
    };

    // 6. Inserir contato
    const result = await supabaseAdmin
      .from('student_contacts')
      .insert(contactInsert as unknown as never)
      .select('id')
      .single();

    const { data: contactData, error: contactError } = result as {
      data: { id: string } | null;
      error: Error | null
    };

    if (contactError) {
      console.error('[POST /api/contacts] Error inserting contact:', contactError);
      return errorResponse(
        'DATABASE_ERROR',
        'Erro ao criar contato',
        500,
        process.env.NODE_ENV === 'development' ? contactError : undefined
      );
    }

    // 7. Retornar sucesso
    return successResponse(
      {
        id: contactData?.id || '',
      },
      'Contato criado com sucesso',
      201
    );
  } catch (error) {
    return handleError(error, 'POST /api/contacts');
  }
});

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
    whatsapp: whatsappData.verified ? {
      verified: whatsappData.verified || false,
      exists: whatsappData.exists || false,
      verifiedAt: whatsappData.verifiedAt || null,
      name: whatsappData.name || null,
      number: whatsappData.number || null,
    } : undefined,
  };
}
