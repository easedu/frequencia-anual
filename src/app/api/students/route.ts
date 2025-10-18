/**
 * API Route: /api/students
 *
 * CRUD de Estudantes
 * - GET: Listar estudantes com filtros
 * - POST: Criar novo estudante
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { validateQueryParams, sanitizeObject } from '@/app/api/_middleware/validation';
import {
  createStudentSchema,
  studentQuerySchema,
  CreateStudentInput,
} from '@/app/api/_schemas/studentSchemas';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  paginatedResponse,
} from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// GET /api/students - Listar estudantes com filtros
// ============================================================================

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // 1. Validar query params
    const validation = validateQueryParams(req, studentQuerySchema);

    if (!validation.success) {
      return validation.response;
    }

    const {
      turma,
      turno,
      status,
      bolsaFamilia,
      estudanteComDeficiencia,
      page,
      limit,
      search,
    } = validation.data;

    // 2. Construir query no Supabase
    let query: any = supabaseAdmin
      .from('students')
      .select('id, student_id, name, class, shift, status, birth_date, school_year, registration_number, bolsa_familia, address, disabilities, student_contacts(*)', { count: 'exact' })
      .eq('deleted', false)
      .order('name', { ascending: true });

    // Aplicar filtros
    if (turma) {
      query = query.eq('class', turma);
    }

    if (turno) {
      query = query.eq('shift', turno);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (bolsaFamilia) {
      query = query.eq('bolsa_familia', bolsaFamilia);
    }

    if (estudanteComDeficiencia !== undefined) {
      // Filtrar por presença de deficiências
      if (estudanteComDeficiencia) {
        query = query.not('disabilities', 'is', null);
      } else {
        query = query.or('disabilities.is.null,disabilities.eq.[]');
      }
    }

    if (search) {
      // Busca por nome (case insensitive)
      query = query.ilike('name', `%${search}%`);
    }

    // Paginação
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // 3. Executar query
    const { data, error, count } = await query;

    if (error) {
      console.error('[GET /api/students] Supabase error:', error);
      return errorResponse(
        'DATABASE_ERROR',
        'Erro ao buscar estudantes',
        500,
        process.env.NODE_ENV === 'development' ? error : undefined
      );
    }

    // 4. Converter para formato legacy (Estudante)
    const students = (data || []).map(convertSupabaseToEstudante);

    // 5. Retornar com paginação
    return paginatedResponse(students, page, limit, count || 0);
  } catch (error) {
    return handleError(error, 'GET /api/students');
  }
});

// ============================================================================
// POST /api/students - Criar novo estudante
// ============================================================================

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // 1. Parse body
    const body = await req.json();

    // 2. Validar com Zod
    const validation = createStudentSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(validation.error.errors);
    }

    const data = validation.data as CreateStudentInput;

    // 3. Sanitizar dados
    const sanitizedData = sanitizeObject(data);

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

    // 4. Gerar IDs
    const estudanteId = uuidv4(); // UUID para student_id (legacy)

    // 5. Preparar dados para Supabase
    const studentInsert: any = {
      student_id: estudanteId,
      user_id: userId, // RLS
      name: sanitizedData.nome,
      class: sanitizedData.turma,
      shift: sanitizedData.turno,
      status: sanitizedData.status,
      bolsa_familia: sanitizedData.bolsaFamilia,
      registration_number: sanitizedData.matricula || null,
      birth_date: sanitizedData.dataNascimento ? convertToISODate(sanitizedData.dataNascimento) : null,
      school_year: new Date().getFullYear().toString(),
      address: sanitizedData.endereco || {},
      disabilities: sanitizedData.deficiencia ? [sanitizedData.deficiencia] : [],
      migrated_from: 'api',
      version: '3.0',
      deleted: false,
    };

    // 6. Inserir estudante
    const { data: studentData, error: studentError } = (await supabaseAdmin
      .from('students')
      .insert(studentInsert)
      .select('id')
      .single()) as { data: any; error: any };

    if (studentError) {
      console.error('[POST /api/students] Error inserting student:', studentError);
      return errorResponse(
        'DATABASE_ERROR',
        'Erro ao criar estudante',
        500,
        process.env.NODE_ENV === 'development' ? studentError : undefined
      );
    }

    // 7. Inserir contatos (se houver)
    if (sanitizedData.contatos && sanitizedData.contatos.length > 0) {
      const contactsInsert = sanitizedData.contatos.map((contato) => ({
        student_id: studentData.id,
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
        console.error('[POST /api/students] Error inserting contacts:', contactsError);
        // Não falhar se contatos falharem, apenas logar
      }
    }

    // 8. Retornar sucesso
    return successResponse(
      {
        estudanteId,
        id: studentData.id,
      },
      'Estudante criado com sucesso',
      201
    );
  } catch (error) {
    return handleError(error, 'POST /api/students');
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converte Student do Supabase para formato legacy Estudante
 */
function convertSupabaseToEstudante(student: any): any {
  return {
    id: student.id,
    student_id: student.student_id, // ✅ Retornar com nome correto (snake_case)
    estudanteId: student.student_id, // ✅ Manter compatibilidade legada (camelCase)
    nome: student.name,
    name: student.name, // ✅ Adicionar também snake_case
    turma: student.class,
    class: student.class, // ✅ Adicionar também snake_case
    status: student.status,
    turno: student.shift,
    shift: student.shift, // ✅ Adicionar também snake_case
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
    student_contacts: student.student_contacts, // ✅ Adicionar também snake_case
    endereco: student.address || undefined,
    address: student.address, // ✅ Adicionar também snake_case
    deficiencia: Array.isArray(student.disabilities) && student.disabilities.length > 0
      ? student.disabilities[0]
      : undefined,
    disabilities: student.disabilities, // ✅ Adicionar também snake_case
    provaSaoPaulo: [],
  };
}
