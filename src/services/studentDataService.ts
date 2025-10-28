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
  interface AddressWithLegacyData {
    [key: string]: unknown;
    deficiencia?: unknown;
  }
  const addressData = (student.address as AddressWithLegacyData) || {};

  // Convert addressData to Endereco type
  const endereco: import('@/types').Endereco = {
    rua: (addressData.rua as string) || '',
    numero: (addressData.numero as string) || '',
    bairro: (addressData.bairro as string) || '',
    cidade: (addressData.cidade as string) || '',
    estado: (addressData.estado as string) || '',
    cep: (addressData.cep as string) || '',
    complemento: (addressData.complemento as string) || '',
  };

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
    endereco: endereco,
    deficiencia: parseDisabilities(student.disabilities as unknown[] || [], addressData as AddressDataWithDeficiencia),
    provaSaoPaulo: [], // Not migrated
  };
}

/**
 * Helper: Convert Supabase StudentContact to legacy Contato type
 */
function convertSupabaseContactToLegacy(contact: StudentContact): Contato {
  interface WhatsAppData {
    verified?: boolean;
    exists?: boolean;
    verifiedAt?: string | null;
    verified_at?: string | null;
    name?: string | null;
    number?: string | null;
    [key: string]: unknown;
  }
  const whatsappData = (contact.whatsapp_data as WhatsAppData) || {};

  return {
    id: contact.id, // ✅ Adicionar ID do contato (necessário para updates)
    nome: contact.name,
    parentesco: contact.relationship || '',
    telefone: contact.phone || '',
    telefoneNumerico: contact.phone_numeric || undefined,
    podeReceberMensagem: contact.can_receive_whatsapp, // ✅ Campo padronizado (type-safe)
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
  // Convert Endereco to JSONB Record
  const address: Record<string, unknown> = estudante.endereco ? {
    rua: estudante.endereco.rua,
    numero: estudante.endereco.numero,
    bairro: estudante.endereco.bairro,
    cidade: estudante.endereco.cidade,
    estado: estudante.endereco.estado,
    cep: estudante.endereco.cep,
    complemento: estudante.endereco.complemento,
  } : {};

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
    address: address,
    disabilities: estudante.deficiencia ? convertLegacyDisabilities(estudante.deficiencia as LegacyDeficienciaData) : [],
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
interface LegacyDeficienciaData {
  estudanteComDeficiencia?: boolean;
  tipoDeficiencia?: string[];
  possuiBarreiras?: boolean;
  horarioAtendimento?: string;
  aee?: string;
  instituicao?: string;
  atendimentoSaude?: string[];
  possuiEstagiario?: boolean;
  nomeEstagiario?: string;
  justificativaEstagiario?: string;
  ave?: boolean;
  nomeAve?: string;
  justificativaAve?: string[];
}

interface DisabilityRecord {
  type?: string;
  description?: string;
  cid?: string | null;
  possui_barreiras?: boolean;
  horario_atendimento?: string;
  aee_type?: string | null;
  instituicao?: string;
  estagiario_name?: string;
  needs_ave?: boolean;
  ave_name?: string;
  ave_justification?: string | string[];
  [key: string]: unknown;
}

interface AddressDataWithDeficiencia {
  deficiencia?: LegacyDeficienciaData;
  [key: string]: unknown;
}

function parseDisabilities(
  disabilities: unknown[],
  addressData: AddressDataWithDeficiencia = {}
): import('@/types').Deficiencia {
  // Extrair dados legados de deficiência do address JSONB (migração Firestore → Supabase)
  const legacyDeficiencia = addressData.deficiencia || addressData;

  // Se não há disabilities no Supabase MAS há dados legados, usar dados legados
  if ((!disabilities || disabilities.length === 0) && legacyDeficiencia) {
    // Retornar dados legados completos se existirem
    if (legacyDeficiencia.estudanteComDeficiencia !== undefined) {
      // Safe type casting para campos enumerados
      const horario = legacyDeficiencia.horarioAtendimento as string | undefined;
      const validHorarioLegacy = (horario && ['NENHUM', 'NO TURNO', 'CONTRATURNO'].includes(horario)
        ? horario
        : 'NENHUM') as "NENHUM" | "NO TURNO" | "CONTRATURNO";

      const aee = legacyDeficiencia.aee as string | undefined;
      const validAeeLegacy = (aee && ['PAEE', 'PAAI'].includes(aee)
        ? aee
        : undefined) as "PAEE" | "PAAI" | undefined;

      const inst = legacyDeficiencia.instituicao as string | undefined;
      const validInstituicaoLegacy = (inst && ['INSTITUTO JÔ CLEMENTE', 'CLIFAK', 'CEJOLE', 'CCA', 'NENHUM'].includes(inst)
        ? inst
        : undefined) as "INSTITUTO JÔ CLEMENTE" | "CLIFAK" | "CEJOLE" | "CCA" | "NENHUM" | undefined;

      const justif = legacyDeficiencia.justificativaEstagiario as string | undefined;
      const validJustificativaLegacy = (justif && ['MEDIAÇÃO E APOIO NAS ATIVIDADES DA UE', 'SEM BARREIRAS'].includes(justif)
        ? justif
        : 'SEM BARREIRAS') as "MEDIAÇÃO E APOIO NAS ATIVIDADES DA UE" | "SEM BARREIRAS";

      return {
        estudanteComDeficiencia: Boolean(legacyDeficiencia.estudanteComDeficiencia),
        tipoDeficiencia: Array.isArray(legacyDeficiencia.tipoDeficiencia)
          ? legacyDeficiencia.tipoDeficiencia
          : (typeof legacyDeficiencia.tipoDeficiencia === 'string' ? [legacyDeficiencia.tipoDeficiencia] : []),
        possuiBarreiras: legacyDeficiencia.possuiBarreiras !== undefined ? Boolean(legacyDeficiencia.possuiBarreiras) : true,
        horarioAtendimento: validHorarioLegacy,
        aee: validAeeLegacy,
        instituicao: validInstituicaoLegacy,
        atendimentoSaude: Array.isArray(legacyDeficiencia.atendimentoSaude) ? legacyDeficiencia.atendimentoSaude : [],
        possuiEstagiario: Boolean(legacyDeficiencia.possuiEstagiario),
        nomeEstagiario: typeof legacyDeficiencia.nomeEstagiario === 'string' ? legacyDeficiencia.nomeEstagiario : 'NÃO NECESSITA',
        justificativaEstagiario: validJustificativaLegacy,
        ave: Boolean(legacyDeficiencia.ave),
        nomeAve: typeof legacyDeficiencia.nomeAve === 'string' ? legacyDeficiencia.nomeAve : '',
        justificativaAve: Array.isArray(legacyDeficiencia.justificativaAve) ? legacyDeficiencia.justificativaAve : [],
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
  const firstDisability = (disabilities[0] as DisabilityRecord) || {};

  // Helper para converter horarioAtendimento
  const horarioAtendimento = (firstDisability.horario_atendimento || legacyDeficiencia?.horarioAtendimento || 'NENHUM') as string;
  const validHorario = (['NENHUM', 'NO TURNO', 'CONTRATURNO'].includes(horarioAtendimento)
    ? horarioAtendimento
    : 'NENHUM') as "NENHUM" | "NO TURNO" | "CONTRATURNO";

  // Helper para converter aee_type
  const aeeTypeRaw = firstDisability.aee_type;
  const legacyAee = legacyDeficiencia?.aee;
  const aeeType = (typeof aeeTypeRaw === 'string' ? aeeTypeRaw : (typeof legacyAee === 'string' ? legacyAee : undefined));
  const validAee = (aeeType && ['PAEE', 'PAAI'].includes(aeeType)
    ? aeeType
    : undefined) as "PAEE" | "PAAI" | undefined;

  // Helper para converter instituicao
  const instituicaoRaw = firstDisability.instituicao;
  const legacyInst = legacyDeficiencia?.instituicao;
  const instituicao = (typeof instituicaoRaw === 'string' ? instituicaoRaw : (typeof legacyInst === 'string' ? legacyInst : undefined));
  const validInstituicao = (instituicao && ['INSTITUTO JÔ CLEMENTE', 'CLIFAK', 'CEJOLE', 'CCA', 'NENHUM'].includes(instituicao)
    ? instituicao
    : undefined) as "INSTITUTO JÔ CLEMENTE" | "CLIFAK" | "CEJOLE" | "CCA" | "NENHUM" | undefined;

  // Helper para converter justificativaEstagiario
  const justificativa = legacyDeficiencia?.justificativaEstagiario || 'SEM BARREIRAS';
  const validJustificativa = (['MEDIAÇÃO E APOIO NAS ATIVIDADES DA UE', 'SEM BARREIRAS'].includes(justificativa as string)
    ? justificativa
    : 'SEM BARREIRAS') as "MEDIAÇÃO E APOIO NAS ATIVIDADES DA UE" | "SEM BARREIRAS";

  return {
    estudanteComDeficiencia: true,
    tipoDeficiencia: disabilities.map(d => (d as DisabilityRecord).type || '').filter(Boolean),
    possuiBarreiras: firstDisability.possui_barreiras !== undefined
      ? Boolean(firstDisability.possui_barreiras)
      : (legacyDeficiencia?.possuiBarreiras !== undefined ? Boolean(legacyDeficiencia.possuiBarreiras) : true),
    horarioAtendimento: validHorario,
    aee: validAee,
    instituicao: validInstituicao,
    atendimentoSaude: Array.isArray(legacyDeficiencia?.atendimentoSaude) ? legacyDeficiencia.atendimentoSaude : [],
    possuiEstagiario: Boolean(firstDisability.estagiario_name) || Boolean(legacyDeficiencia?.possuiEstagiario),
    nomeEstagiario: (typeof firstDisability.estagiario_name === 'string' ? firstDisability.estagiario_name : undefined)
      || (typeof legacyDeficiencia?.nomeEstagiario === 'string' ? legacyDeficiencia.nomeEstagiario : undefined)
      || 'NÃO NECESSITA',
    justificativaEstagiario: validJustificativa,
    ave: Boolean(firstDisability.needs_ave) || Boolean(legacyDeficiencia?.ave),
    nomeAve: (typeof firstDisability.ave_name === 'string' ? firstDisability.ave_name : undefined)
      || (typeof legacyDeficiencia?.nomeAve === 'string' ? legacyDeficiencia.nomeAve : undefined)
      || '',
    justificativaAve: firstDisability.ave_justification
      ? (Array.isArray(firstDisability.ave_justification) ? firstDisability.ave_justification as string[] : [firstDisability.ave_justification as string])
      : (Array.isArray(legacyDeficiencia?.justificativaAve) ? legacyDeficiencia.justificativaAve : []),
  };
}

/**
 * Helper: Convert legacy disabilities to Supabase JSONB array
 */
function convertLegacyDisabilities(deficiencia: LegacyDeficienciaData | { tipoDeficiencia?: string | string[]; [key: string]: unknown }): DisabilityRecord[] {
  const tipoDeficiencia = Array.isArray(deficiencia.tipoDeficiencia)
    ? deficiencia.tipoDeficiencia
    : (deficiencia.tipoDeficiencia ? [deficiencia.tipoDeficiencia] : []);

  if (!('estudanteComDeficiencia' in deficiencia && deficiencia.estudanteComDeficiencia) || tipoDeficiencia.length === 0) {
    return [];
  }

  return tipoDeficiencia.map((tipo: string) => ({
    type: tipo,
    description: '',
    cid: null,
    aee_type: ('horarioAtendimento' in deficiencia ? deficiencia.horarioAtendimento as string : null) || null,
    needs_ave: ('ave' in deficiencia ? deficiencia.ave as boolean : false) || false,
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
   * Get all students via API REST (RECOMENDADO ✅)
   *
   * Otimizado para redes lentas (2G/3G) com cache server-side.
   *
   * Performance:
   * - 1ª carga: ~3-8s (2G/3G)
   * - 2ª+ cargas: < 500ms (cached) ⚡
   *
   * @param includeDeleted - Include soft-deleted students
   * @param includeContacts - Include contacts (default: true)
   */
  static async getStudentsViaAPI(
    includeDeleted: boolean = false,
    includeContacts: boolean = true
  ): Promise<Estudante[]> {
    try {
      const params = new URLSearchParams({
        includeDeleted: includeDeleted.toString(),
        includeContacts: includeContacts.toString(),
      });

      // ✅ AbortController com timeout generoso para redes 2G/3G
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos

      try {
        const response = await fetch(`/api/students/all?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          // ⚠️ IMPORTANTE: keepalive ajuda em redes instáveis
          keepalive: true,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: 'Erro desconhecido',
          }));
          throw new Error(errorData.error || `API returned ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Erro ao buscar estudantes');
        }

        return result.data || [];
      } catch (fetchError) {
        clearTimeout(timeoutId);

        // Verificar se foi timeout
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Timeout ao buscar estudantes (rede muito lenta). Tente novamente.');
        }

        throw fetchError;
      }
    } catch (error) {
      logger.error('[getStudentsViaAPI] ❌ Erro ao buscar estudantes via API', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Get all students (LEGACY - queries diretas ao Supabase client)
   *
   * ⚠️ AVISO: Este método pode ter problemas de timeout em redes lentas (2G/3G).
   * Use getStudentsViaAPI() para melhor performance.
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
        .select(includeContacts
          ? '*, student_contacts(id, name, relationship, phone, phone_numeric, email, can_receive_whatsapp, whatsapp_data)'
          : '*'
        ); // JOIN com campos explícitos para garantir JSONB

      if (!includeDeleted) {
        query = query.eq('deleted', false);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;

      const students = (data || []).map(convertSupabaseToEstudante);

      return students;

    } catch (error) {
      logger.error('❌ Erro ao buscar estudantes', { error: error instanceof Error ? error.message : String(error) });
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
        .select(`
          *,
          student_contacts(id, name, relationship, phone, phone_numeric, email, can_receive_whatsapp, whatsapp_data),
          student_absences(*)
        `)
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
      logger.error('❌ Erro ao buscar estudante por ID', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Add new student
   *
   * @param newStudent - Student data (legacy Estudante format)
   * @param userId - User ID for audit
   */
  static async addStudent(newStudent: Estudante): Promise<string> {
    try {

      // 1. Insert student (main table)
      const studentInsert = convertEstudanteToSupabaseInsert(newStudent);

      interface StudentInsertResult {
        data: Student | null;
        error: Error | null;
      }

      const { data: insertedStudent, error: studentError }: StudentInsertResult = await supabase
        .from('students')
        // @ts-expect-error - Supabase generic types são muito restritivos, mas o tipo está correto
        .insert(studentInsert)
        .select()
        .single();

      if (studentError) throw studentError;
      if (!insertedStudent) throw new Error('Failed to insert student');

      logger.debug(`  ✓ Supabase: students/${insertedStudent.id}`);

      // 2. Insert contacts (if any)
      if (newStudent.contatos && newStudent.contatos.length > 0) {
        const contactsInsert = newStudent.contatos.map(contato =>
          convertContatoToSupabaseInsert(contato, insertedStudent.id)
        );

        interface FirstContactsInsertResult {
          error: Error | null;
        }

        const { error: contactsError }: FirstContactsInsertResult = await supabase
          .from('student_contacts')
          // @ts-expect-error - Supabase generic types são muito restritivos, mas o tipo está correto
          .insert(contactsInsert);

        if (contactsError) throw contactsError;

        logger.debug(`  ✓ ${newStudent.contatos.length} contatos adicionados`);
      }

      return newStudent.estudanteId;

    } catch (error) {
      logger.error('❌ Erro ao adicionar estudante', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Update student
   *
   * @param updatedStudent - Updated student data (legacy format)
   * @param userId - User ID for audit
   */
  static async updateStudent(updatedStudent: Estudante): Promise<void> {
    try {

      // 1. Get Supabase internal ID
      const { data: existingStudent, error: fetchError } = await supabase
        .from('students')
        .select('id')
        .eq('student_id', updatedStudent.estudanteId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Update student (main fields)
      // Convert Endereco to JSONB Record
      const updateAddress: Record<string, unknown> = updatedStudent.endereco ? {
        rua: updatedStudent.endereco.rua,
        numero: updatedStudent.endereco.numero,
        bairro: updatedStudent.endereco.bairro,
        cidade: updatedStudent.endereco.cidade,
        estado: updatedStudent.endereco.estado,
        cep: updatedStudent.endereco.cep,
        complemento: updatedStudent.endereco.complemento,
      } : {};

      const studentUpdate: StudentUpdate = {
        name: updatedStudent.nome,
        class: updatedStudent.turma,
        shift: updatedStudent.turno,
        status: updatedStudent.status as 'ATIVO' | 'INATIVO' | 'TRANSFERIDO',
        birth_date: updatedStudent.dataNascimento || null,
        bolsa_familia: (updatedStudent.bolsaFamilia === 'SIM' ? 'SIM' : 'NÃO') as 'SIM' | 'NÃO',
        registration_number: updatedStudent.matricula || null,
        address: updateAddress,
        disabilities: updatedStudent.deficiencia ? convertLegacyDisabilities(updatedStudent.deficiencia as LegacyDeficienciaData) : [],
      };

      interface UpdateResult {
        error: Error | null;
      }

      interface ExistingStudentData {
        id: string;
      }

      const { error: updateError }: UpdateResult = await supabase
        .from('students')
        // @ts-expect-error - Supabase generic types são muito restritivos, mas o tipo está correto
        .update(studentUpdate)
        .eq('id', (existingStudent as ExistingStudentData).id);

      if (updateError) throw updateError;

      logger.debug(`  ✓ Supabase atualizado`);

      // 3. Sync contacts (delete old, insert new)
      if (updatedStudent.contatos && updatedStudent.contatos.length > 0) {
        interface DeleteResult {
          error: Error | null;
        }

        interface InsertContactsResult {
          error: Error | null;
        }

        // Delete existing contacts
        const { error: deleteError }: DeleteResult = await supabase
          .from('student_contacts')
          .delete()
          .eq('student_id', (existingStudent as ExistingStudentData).id);

        if (deleteError) throw deleteError;

        // Insert new contacts
        const contactsInsert = updatedStudent.contatos.map(contato =>
          convertContatoToSupabaseInsert(contato, (existingStudent as ExistingStudentData).id)
        );

        const { error: contactsError }: InsertContactsResult = await supabase
          .from('student_contacts')
          // @ts-expect-error - Supabase generic types são muito restritivos, mas o tipo está correto
          .insert(contactsInsert);

        if (contactsError) throw contactsError;

        logger.debug(`  ✓ ${updatedStudent.contatos.length} contatos sincronizados`);
      }

    } catch (error) {
      logger.error('❌ Erro ao atualizar estudante', { error: error instanceof Error ? error.message : String(error) });
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
    estudanteId: string
  ): Promise<void> {
    try {

      interface SoftDeleteResult {
        error: Error | null;
      }

      const { error }: SoftDeleteResult = await supabase
        .from('students')
        // @ts-expect-error - Supabase generic types são muito restritivos, mas o tipo está correto
        .update({ deleted: true })
        .eq('student_id', estudanteId);

      if (error) throw error;


    } catch (error) {
      logger.error('❌ Erro ao deletar estudante', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Restore deleted student
   *
   * @param estudanteId - Firebase UUID (student_id)
   * @param userId - User ID for audit
   */
  static async restoreStudent(estudanteId: string): Promise<void> {
    try {

      interface RestoreResult {
        error: Error | null;
      }

      const { error }: RestoreResult = await supabase
        .from('students')
        // @ts-expect-error - Supabase generic types são muito restritivos, mas o tipo está correto
        .update({ deleted: false })
        .eq('student_id', estudanteId);

      if (error) throw error;


    } catch (error) {
      logger.error('❌ Erro ao restaurar estudante', { error: error instanceof Error ? error.message : String(error) });
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
    logger.error('Erro ao buscar estudante (fast)', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Get students by year (backward compatibility)
 * NOTE: In Supabase, year filtering would be done differently
 */
export const getStudentsByYear = () => StudentDataService.getStudents();

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
