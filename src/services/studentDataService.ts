/**
 * Student Data Service - Supabase Version
 *
 * MIGRATED FROM FIREBASE TO SUPABASE
 * - PostgreSQL with relational data (no subcollections!)
 * - Type-safe with full Database types
 * - Performance optimized with JOINs (no N+1 queries)
 * - Backward compatible interface
 *
 * Supabase Structure:
 * students (table)
 *   ├── id (UUID auto-generated)
 *   ├── student_id (Firebase UUID preserved)
 *   ├── name, class, shift, status
 *   ├── birth_date, school_year, registration_number
 *   ├── bolsa_familia, address (JSONB), disabilities (JSONB[])
 *   ├── created_at, updated_at, deleted
 *   └── (JOINs with student_contacts via foreign key)
 *
 * student_contacts (separate table with FK)
 *   ├── id (UUID auto-generated)
 *   ├── student_id (FK → students.id)
 *   ├── name, relationship, phone, email
 *   └── can_receive_whatsapp, whatsapp_data (JSONB)
 */

import { supabase } from '@/lib/supabaseClient';
// ⚠️ IMPORTANTE: NÃO importar supabaseAdmin aqui!
// Este arquivo é usado em client-side, e supabaseAdmin só pode ser usado em server-side (API routes)
// Para operações de escrita (INSERT/UPDATE/DELETE), usar supabase client (que respeita RLS)
import type {
  Student,
  StudentInsert,
  StudentUpdate,
  StudentContact,
  StudentContactInsert,
  StudentContactUpdate,
} from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';
import type { Estudante, Contato } from '@/types';

/**
 * Helper: Convert Supabase Student to legacy Estudante type
 * (Backward compatibility for existing code)
 */
function convertSupabaseToEstudante(
  student: Student & { student_contacts?: StudentContact[] }
): Estudante {
  // Parse address JSONB que pode conter dados legados de deficiência
  const addressData = (student.address as any) || {};

  return {
    estudanteId: student.student_id,
    nome: student.name,
    turma: student.class,
    status: student.status,
    turno: student.shift as 'MANHÃ' | 'TARDE',
    bolsaFamilia: student.bolsa_familia || 'NÃO',
    matricula: student.registration_number || undefined,
    email: undefined, // Not in Supabase schema
    dataNascimento: student.birth_date || undefined,
    contatos: student.student_contacts?.map(convertSupabaseContactToLegacy) || [],
    endereco: addressData,
    deficiencia: parseDisabilities(student.disabilities as any[], addressData),
    provaSaoPaulo: [], // Not migrated
  };
}

/**
 * Helper: Convert Supabase StudentContact to legacy Contato type
 */
function convertSupabaseContactToLegacy(contact: StudentContact): Contato {
  const whatsappData = (contact.whatsapp_data as any) || {};

  return {
    id: contact.id, // ✅ Adicionar ID do contato (necessário para updates)
    nome: contact.name,
    parentesco: contact.relationship || '',
    telefone: contact.phone || '',
    telefoneNumerico: contact.phone_numeric || undefined,
    podeReceberWhatsapp: contact.can_receive_whatsapp,
    podeReceberMensagem: contact.can_receive_whatsapp, // Alias para compatibilidade
    whatsapp: whatsappData.verified ? {
      verified: whatsappData.verified || false,
      exists: whatsappData.exists || false,
      verifiedAt: whatsappData.verifiedAt || whatsappData.verified_at || null, // ✅ Aceitar ambos formatos
      name: whatsappData.name || null,
      number: whatsappData.number || null,
    } : undefined,
    whatsappData: whatsappData, // ✅ Adicionar campo direto para APIs
    whatsapp_data: whatsappData, // ✅ Adicionar também snake_case
  };
}

/**
 * Helper: Convert legacy Estudante to Supabase Student INSERT
 */
function convertEstudanteToSupabaseInsert(estudante: Estudante): StudentInsert {
  return {
    student_id: estudante.estudanteId,
    name: estudante.nome,
    class: estudante.turma,
    shift: estudante.turno,
    status: estudante.status as 'ATIVO' | 'INATIVO' | 'TRANSFERIDO',
    birth_date: estudante.dataNascimento || null,
    school_year: new Date().getFullYear().toString(),
    registration_number: estudante.matricula || null,
    bolsa_familia: (estudante.bolsaFamilia === 'SIM' ? 'SIM' : 'NÃO') as 'SIM' | 'NÃO',
    address: estudante.endereco || {},
    disabilities: estudante.deficiencia ? convertLegacyDisabilities(estudante.deficiencia) : [],
    migrated_from: 'firebase_v3',
    version: '3.0',
    deleted: false,
    migrated_at: new Date().toISOString(),
  };
}

/**
 * Helper: Convert legacy Contato to Supabase StudentContact INSERT
 */
function convertContatoToSupabaseInsert(
  contato: Contato,
  studentId: string
): StudentContactInsert {
  return {
    student_id: studentId,
    name: normalizeContactName(contato.nome),
    relationship: normalizeParentesco(contato.parentesco || ''),
    phone: contato.telefone || null,
    phone_numeric: extractNumericPhone(contato.telefone || ''),
    email: null,
    can_receive_whatsapp: contato.podeReceberMensagem ?? true,
    whatsapp_data: contato.whatsapp || {},
    migrated_from: 'firebase_v3',
    synced_from_old_structure: false,
    synced_at: new Date().toISOString(),
    version: '3.0',
    is_placeholder: false,
  };
}

/**
 * Helper: Parse disabilities from Supabase JSONB array + legacy data in address
 */
function parseDisabilities(disabilities: any[], addressData: any = {}): any {
  // Extrair dados legados de deficiência do address JSONB (migração Firestore → Supabase)
  const legacyDeficiencia = addressData.deficiencia || addressData;

  // Se não há disabilities no Supabase MAS há dados legados, usar dados legados
  if ((!disabilities || disabilities.length === 0) && legacyDeficiencia) {
    // Retornar dados legados completos se existirem
    if (legacyDeficiencia.estudanteComDeficiencia !== undefined) {
      return {
        estudanteComDeficiencia: legacyDeficiencia.estudanteComDeficiencia || false,
        tipoDeficiencia: legacyDeficiencia.tipoDeficiencia || [],
        possuiBarreiras: legacyDeficiencia.possuiBarreiras !== undefined ? legacyDeficiencia.possuiBarreiras : true,
        horarioAtendimento: legacyDeficiencia.horarioAtendimento || 'NENHUM',
        aee: legacyDeficiencia.aee || undefined,
        instituicao: legacyDeficiencia.instituicao || undefined,
        atendimentoSaude: legacyDeficiencia.atendimentoSaude || [],
        possuiEstagiario: legacyDeficiencia.possuiEstagiario || false,
        nomeEstagiario: legacyDeficiencia.nomeEstagiario || 'NÃO NECESSITA',
        justificativaEstagiario: legacyDeficiencia.justificativaEstagiario || 'SEM BARREIRAS',
        ave: legacyDeficiencia.ave || false,
        nomeAve: legacyDeficiencia.nomeAve || '',
        justificativaAve: legacyDeficiencia.justificativaAve || [],
      };
    }
  }

  // Se não há disabilities nem dados legados
  if (!disabilities || disabilities.length === 0) {
    return {
      estudanteComDeficiencia: false,
      tipoDeficiencia: [],
      possuiBarreiras: true,
      horarioAtendimento: 'NENHUM',
      atendimentoSaude: [],
      possuiEstagiario: false,
      nomeEstagiario: 'NÃO NECESSITA',
      justificativaEstagiario: 'SEM BARREIRAS',
      ave: false,
      nomeAve: '',
      justificativaAve: [],
    };
  }

  // Convert array of disabilities to legacy format (Supabase normalizado)
  // Extrair todos os campos do primeiro disability (normalmente só há 1-2 tipos)
  const firstDisability = disabilities[0] || {};

  return {
    estudanteComDeficiencia: true,
    tipoDeficiencia: disabilities.map(d => d.type || '').filter(Boolean),
    possuiBarreiras: firstDisability.possui_barreiras !== undefined
      ? firstDisability.possui_barreiras
      : (legacyDeficiencia?.possuiBarreiras !== undefined ? legacyDeficiencia.possuiBarreiras : true),
    horarioAtendimento: firstDisability.horario_atendimento || legacyDeficiencia?.horarioAtendimento || 'NENHUM',
    aee: firstDisability.aee_type || legacyDeficiencia?.aee || undefined,
    instituicao: firstDisability.instituicao || legacyDeficiencia?.instituicao || undefined,
    atendimentoSaude: legacyDeficiencia?.atendimentoSaude || [],
    possuiEstagiario: !!firstDisability.estagiario_name || legacyDeficiencia?.possuiEstagiario || false,
    nomeEstagiario: firstDisability.estagiario_name || legacyDeficiencia?.nomeEstagiario || 'NÃO NECESSITA',
    justificativaEstagiario: legacyDeficiencia?.justificativaEstagiario || 'SEM BARREIRAS',
    ave: firstDisability.needs_ave || legacyDeficiencia?.ave || false,
    nomeAve: firstDisability.ave_name || legacyDeficiencia?.nomeAve || '',
    justificativaAve: firstDisability.ave_justification
      ? (Array.isArray(firstDisability.ave_justification) ? firstDisability.ave_justification : [firstDisability.ave_justification])
      : (legacyDeficiencia?.justificativaAve || []),
  };
}

/**
 * Helper: Convert legacy disabilities to Supabase JSONB array
 */
function convertLegacyDisabilities(deficiencia: any): any[] {
  if (!deficiencia.estudanteComDeficiencia || !deficiencia.tipoDeficiencia) {
    return [];
  }

  return deficiencia.tipoDeficiencia.map((tipo: string) => ({
    type: tipo,
    description: '',
    cid: null,
    aee_type: deficiencia.horarioAtendimento || null,
    needs_ave: deficiencia.ave || false,
  }));
}

/**
 * Helper: Normalize contact name
 */
function normalizeContactName(name: string): string {
  if (!name || typeof name !== 'string') return '';

  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Helper: Normalize parentesco
 */
function normalizeParentesco(parentesco: string): string {
  if (!parentesco || typeof parentesco !== 'string') return '';

  const normalized = parentesco.trim().toLowerCase();

  const parentescoMap: Record<string, string> = {
    'mae': 'Mãe',
    'mãe': 'Mãe',
    'pai': 'Pai',
    'avo': 'Avó',
    'avó': 'Avó',
    'avô': 'Avô',
    'tio': 'Tio',
    'tia': 'Tia',
    'irmao': 'Irmão',
    'irmã': 'Irmã',
    'irmão': 'Irmão',
    'irma': 'Irmã',
    'responsavel': 'Responsável',
    'responsável': 'Responsável',
    'tutor': 'Tutor',
    'tutora': 'Tutora',
  };

  return parentescoMap[normalized] ||
         (normalized.charAt(0).toUpperCase() + normalized.slice(1));
}

/**
 * Helper: Extract numeric phone
 */
function extractNumericPhone(telefone: string): string {
  return telefone.replace(/\D/g, '');
}

// ============================================
// PUBLIC API (Backward Compatible)
// ============================================

export class StudentDataService {
  /**
   * Get all students
   *
   * @param includeDeleted - Include soft-deleted students
   * @param includeContacts - Include contacts (default: true, uses JOIN - no extra query!)
   */
  static async getStudents(
    includeDeleted: boolean = false,
    includeContacts: boolean = true
  ): Promise<Estudante[]> {
    try {

      let query = supabase
        .from('students')
        .select(includeContacts ? '*, student_contacts(*)' : '*'); // JOIN automático!

      if (!includeDeleted) {
        query = query.eq('deleted', false);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;

      const students = (data || []).map(convertSupabaseToEstudante);

      return students;

    } catch (error) {
      logger.error('❌ Erro ao buscar estudantes', error as Error);
      throw error;
    }
  }

  /**
   * Get student by ID (estudanteId, not Supabase internal id)
   *
   * @param estudanteId - Firebase UUID (student_id in Supabase)
   */
  static async getStudentById(estudanteId: string): Promise<Estudante | null> {
    try {

      const { data, error } = await supabase
        .from('students')
        .select('*, student_contacts(*), student_absences(*)')
        .eq('student_id', estudanteId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          logger.warn(`⚠️  [Supabase] Estudante ${estudanteId} não encontrado`);
          return null;
        }
        throw error;
      }

      return convertSupabaseToEstudante(data);

    } catch (error) {
      logger.error('❌ Erro ao buscar estudante por ID', error as Error);
      throw error;
    }
  }

  /**
   * Add new student
   *
   * @param newStudent - Student data (legacy Estudante format)
   * @param userId - User ID for audit
   */
  static async addStudent(newStudent: Estudante, userId?: string): Promise<string> {
    try {

      // 1. Insert student (main table)
      const studentInsert = convertEstudanteToSupabaseInsert(newStudent);

      const { data: insertedStudent, error: studentError } = await (supabase
        .from('students')
        .insert(studentInsert as any)
        .select()
        .single() as any);

      if (studentError) throw studentError;

      logger.debug(`  ✓ Supabase: students/${insertedStudent.id}`);

      // 2. Insert contacts (if any)
      if (newStudent.contatos && newStudent.contatos.length > 0) {
        const contactsInsert = newStudent.contatos.map(contato =>
          convertContatoToSupabaseInsert(contato, insertedStudent.id)
        );

        const { error: contactsError } = await (supabase
          .from('student_contacts')
          .insert(contactsInsert as any) as any);

        if (contactsError) throw contactsError;

        logger.debug(`  ✓ ${newStudent.contatos.length} contatos adicionados`);
      }

      logger.info(`✅ [Supabase] Estudante ${newStudent.nome} adicionado com sucesso`);
      return newStudent.estudanteId;

    } catch (error) {
      logger.error('❌ Erro ao adicionar estudante', error as Error);
      throw error;
    }
  }

  /**
   * Update student
   *
   * @param updatedStudent - Updated student data (legacy format)
   * @param userId - User ID for audit
   */
  static async updateStudent(updatedStudent: Estudante, userId?: string): Promise<void> {
    try {

      // 1. Get Supabase internal ID
      const { data: existingStudent, error: fetchError } = await supabase
        .from('students')
        .select('id')
        .eq('student_id', updatedStudent.estudanteId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Update student (main fields)
      const studentUpdate: StudentUpdate = {
        name: updatedStudent.nome,
        class: updatedStudent.turma,
        shift: updatedStudent.turno,
        status: updatedStudent.status as 'ATIVO' | 'INATIVO' | 'TRANSFERIDO',
        birth_date: updatedStudent.dataNascimento || null,
        bolsa_familia: (updatedStudent.bolsaFamilia === 'SIM' ? 'SIM' : 'NÃO') as 'SIM' | 'NÃO',
        registration_number: updatedStudent.matricula || null,
        address: updatedStudent.endereco || {},
        disabilities: updatedStudent.deficiencia ? convertLegacyDisabilities(updatedStudent.deficiencia) : [],
      };

      const { error: updateError } = await ((supabase
        .from('students') as any)
        .update(studentUpdate)
        .eq('id', (existingStudent as any).id));

      if (updateError) throw updateError;

      logger.debug(`  ✓ Supabase atualizado`);

      // 3. Sync contacts (delete old, insert new)
      if (updatedStudent.contatos && updatedStudent.contatos.length > 0) {
        // Delete existing contacts
        const { error: deleteError } = await (supabase
          .from('student_contacts')
          .delete()
          .eq('student_id', (existingStudent as any).id) as any);

        if (deleteError) throw deleteError;

        // Insert new contacts
        const contactsInsert = updatedStudent.contatos.map(contato =>
          convertContatoToSupabaseInsert(contato, (existingStudent as any).id)
        );

        const { error: contactsError } = await (supabase
          .from('student_contacts')
          .insert(contactsInsert as any) as any);

        if (contactsError) throw contactsError;

        logger.debug(`  ✓ ${updatedStudent.contatos.length} contatos sincronizados`);
      }

      logger.info(`✅ [Supabase] Estudante atualizado com sucesso`);

    } catch (error) {
      logger.error('❌ Erro ao atualizar estudante', error as Error);
      throw error;
    }
  }

  /**
   * Delete student (soft delete)
   *
   * @param estudanteId - Firebase UUID (student_id)
   * @param userId - User ID for audit
   * @param reason - Deletion reason
   */
  static async deleteStudent(
    estudanteId: string,
    userId?: string,
    reason?: string
  ): Promise<void> {
    try {

      const { error } = await ((supabase
        .from('students') as any)
        .update({ deleted: true })
        .eq('student_id', estudanteId));

      if (error) throw error;


    } catch (error) {
      logger.error('❌ Erro ao deletar estudante', error as Error);
      throw error;
    }
  }

  /**
   * Restore deleted student
   *
   * @param estudanteId - Firebase UUID (student_id)
   * @param userId - User ID for audit
   */
  static async restoreStudent(estudanteId: string, userId?: string): Promise<void> {
    try {

      const { error } = await ((supabase
        .from('students') as any)
        .update({ deleted: false })
        .eq('student_id', estudanteId));

      if (error) throw error;


    } catch (error) {
      logger.error('❌ Erro ao restaurar estudante', error as Error);
      throw error;
    }
  }
}

// ============================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================

/**
 * Alias for getStudentById (backward compatibility)
 */
export const getStudent = StudentDataService.getStudentById;

/**
 * Get student by ID without contacts (faster for APIs)
 * NOTE: In Supabase, there's NO N+1 problem, so this is just an alias
 */
export async function getStudentByIdFast(estudanteId: string): Promise<Estudante | null> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*') // No JOIN, just student data
      .eq('student_id', estudanteId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return convertSupabaseToEstudante(data);

  } catch (error) {
    logger.error('Erro ao buscar estudante (fast)', error as Error);
    return null;
  }
}

/**
 * Get students by year (backward compatibility)
 * NOTE: In Supabase, year filtering would be done differently
 */
export const getStudentsByYear = (year?: string) => StudentDataService.getStudents();

/**
 * Get student contacts (backward compatibility)
 */
export async function getStudentContacts(estudanteId: string) {
  const student = await StudentDataService.getStudentById(estudanteId);

  return {
    _dataSource: {
      source: 'supabase',
      timestamp: Date.now()
    },
    contacts: student?.contatos || []
  };
}

/**
 * Convenience exports
 */
export const studentDataService = {
  getStudents: StudentDataService.getStudents,
  getStudentById: StudentDataService.getStudentById,
  addStudent: StudentDataService.addStudent,
  updateStudent: StudentDataService.updateStudent,
  deleteStudent: StudentDataService.deleteStudent,
  restoreStudent: StudentDataService.restoreStudent,
};
