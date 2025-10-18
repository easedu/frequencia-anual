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
      .select('*, student_contacts(*)', { count: 'exact' })
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
      birth_date: sanitizedData.dataNascimento || null,
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
    deficiencia: Array.isArray(student.disabilities) && student.disabilities.length > 0
      ? student.disabilities[0]
      : undefined,
    provaSaoPaulo: [],
  };
}
