/**
 * Student Service - Serviço de acesso direto a estudantes no Supabase
 *
 * Fornece métodos otimizados para operações internas (sem HTTP overhead)
 *
 * IMPORTANTE: Usar para chamadas backend-to-backend.
 * Para APIs públicas, use /api/students com autenticação.
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logger } from '@/utils/logger';

/**
 * Informações básicas de estudante (otimizado para automações)
 */
export interface StudentBasicInfo {
  id: string;              // Internal ID (Supabase PK)
  estudanteId: string;     // Firebase UUID (student_id)
  nome: string;
  turma: string;
  turno: string;
  status: string;
}

/**
 * Informações completas de estudante
 */
export interface StudentFullInfo extends StudentBasicInfo {
  matricula?: string;
  dataNascimento?: string;
  bolsaFamilia?: string;
  endereco?: {
    rua?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    [key: string]: unknown;
  };
  deficiencia?: Array<{
    tipo?: string;
    descricao?: string;
    [key: string]: unknown;
  }>;
  contatos?: Array<{
    nome: string;
    parentesco: string;
    telefone: string;
    podeReceberMensagem: boolean;
  }>;
}

/**
 * Busca estudante por Firebase UUID (student_id)
 *
 * IMPORTANTE: Retorna dados básicos do estudante sem chamada HTTP.
 * Usa supabaseAdmin direto (mais rápido e sem autenticação).
 *
 * @param firebaseUUID - UUID do Firebase (student_id)
 * @returns Dados básicos do estudante ou null
 *
 * @example
 * const student = await getStudentByFirebaseUUID('ce5ac93c-bad9-4f82-af87-ffac12eb395f');
 * if (student) {
 *   console.log(`Encontrado: ${student.nome} (Internal ID: ${student.id})`);
 * }
 */
export async function getStudentByFirebaseUUID(
  firebaseUUID: string
): Promise<StudentBasicInfo | null> {
  try {
    const { data, error} = (await supabaseAdmin
      .from('students')
      .select('id, student_id, name, class, shift, status')
      .eq('student_id', firebaseUUID)
      .eq('deleted', false)
      .maybeSingle()) as { data: {
        id: string;
        student_id: string;
        name: string;
        class: string;
        shift: string;
        status: string;
      } | null; error: Error | null };

    if (error) {
      logger.error('[StudentService] Erro ao buscar estudante', {
        firebaseUUID,
        error: error.message
      });
      return null;
    }

    if (!data) {
      logger.warn('[StudentService] Estudante não encontrado', { firebaseUUID });
      return null;
    }

    return {
      id: data.id,
      estudanteId: data.student_id,
      nome: data.name,
      turma: data.class,
      turno: data.shift,
      status: data.status
    };
  } catch (error) {
    logger.error('[StudentService] Erro inesperado', {
      firebaseUUID,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    return null;
  }
}

/**
 * Busca informações completas do estudante (incluindo contatos)
 *
 * @param firebaseUUID - UUID do Firebase (student_id)
 * @returns Dados completos do estudante ou null
 *
 * @example
 * const student = await getStudentFullInfo('ce5ac93c-bad9-4f82-af87-ffac12eb395f');
 * if (student) {
 *   console.log(`Contatos: ${student.contatos?.length}`);
 * }
 */
export async function getStudentFullInfo(
  firebaseUUID: string
): Promise<StudentFullInfo | null> {
  try {
    const { data, error } = (await supabaseAdmin
      .from('students')
      .select('id, student_id, name, class, shift, status, registration_number, birth_date, bolsa_familia, address, disabilities, student_contacts(*)')
      .eq('student_id', firebaseUUID)
      .eq('deleted', false)
      .maybeSingle()) as {
        data: {
          id: string;
          student_id: string;
          name: string;
          class: string;
          shift: string;
          status: string;
          registration_number?: string;
          birth_date?: string;
          bolsa_familia?: string;
          address?: unknown;
          disabilities?: unknown[];
          student_contacts?: Array<{
            name: string;
            relationship?: string;
            phone?: string;
            can_receive_whatsapp?: boolean;
          }>;
        } | null;
        error: Error | null
      };

    if (error) {
      logger.error('[StudentService] Erro ao buscar estudante completo', {
        firebaseUUID,
        error: error.message
      });
      return null;
    }

    if (!data) {
      logger.warn('[StudentService] Estudante não encontrado', { firebaseUUID });
      return null;
    }

    return {
      id: data.id,
      estudanteId: data.student_id,
      nome: data.name,
      turma: data.class,
      turno: data.shift,
      status: data.status,
      matricula: data.registration_number || undefined,
      dataNascimento: data.birth_date || undefined,
      bolsaFamilia: data.bolsa_familia || undefined,
      endereco: (data.address as { [key: string]: unknown } | undefined) || undefined,
      deficiencia: (data.disabilities as Array<{ [key: string]: unknown }> | undefined) || [],
      contatos: (data.student_contacts || []).map((contact) => ({
        nome: contact.name,
        parentesco: contact.relationship || '',
        telefone: contact.phone || '',
        podeReceberMensagem: contact.can_receive_whatsapp ?? true
      }))
    };
  } catch (error) {
    logger.error('[StudentService] Erro inesperado ao buscar estudante completo', {
      firebaseUUID,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    return null;
  }
}

/**
 * Busca estudante por Internal ID (Supabase PK)
 *
 * IMPORTANTE: Usar apenas quando você já tem o Internal ID.
 * Para chamadas externas, sempre use Firebase UUID.
 *
 * @param internalId - ID interno do Supabase (PK)
 * @returns Dados básicos do estudante ou null
 */
export async function getStudentByInternalId(
  internalId: string
): Promise<StudentBasicInfo | null> {
  try {
    const { data, error } = (await supabaseAdmin
      .from('students')
      .select('id, student_id, name, class, shift, status')
      .eq('id', internalId)
      .eq('deleted', false)
      .maybeSingle()) as { data: {
        id: string;
        student_id: string;
        name: string;
        class: string;
        shift: string;
        status: string;
      } | null; error: Error | null };

    if (error) {
      logger.error('[StudentService] Erro ao buscar por Internal ID', {
        internalId,
        error: error.message
      });
      return null;
    }

    if (!data) {
      logger.warn('[StudentService] Estudante não encontrado', { internalId });
      return null;
    }

    return {
      id: data.id,
      estudanteId: data.student_id,
      nome: data.name,
      turma: data.class,
      turno: data.shift,
      status: data.status
    };
  } catch (error) {
    logger.error('[StudentService] Erro inesperado ao buscar por Internal ID', {
      internalId,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    return null;
  }
}

/**
 * Resolve Firebase UUID para Internal ID (utilitário rápido)
 *
 * @param firebaseUUID - UUID do Firebase
 * @returns Internal ID ou null
 *
 * @example
 * const internalId = await resolveToInternalId('ce5ac93c-bad9-4f82-af87-ffac12eb395f');
 * if (internalId) {
 *   // Usar em FK (student_contacts, tasks, etc)
 *   await createTask({ student_id: internalId, ... });
 * }
 */
export async function resolveToInternalId(
  firebaseUUID: string
): Promise<string | null> {
  const student = await getStudentByFirebaseUUID(firebaseUUID);
  return student?.id || null;
}

/**
 * Busca múltiplos estudantes por Firebase UUIDs (batch)
 *
 * IMPORTANTE: Otimizado para buscar vários estudantes de uma vez.
 *
 * @param firebaseUUIDs - Array de Firebase UUIDs
 * @returns Array de estudantes encontrados
 *
 * @example
 * const students = await getStudentsByFirebaseUUIDs([
 *   'ce5ac93c-bad9-4f82-af87-ffac12eb395f',
 *   'abc123...'
 * ]);
 */
export async function getStudentsByFirebaseUUIDs(
  firebaseUUIDs: string[]
): Promise<StudentBasicInfo[]> {
  try {
    if (firebaseUUIDs.length === 0) {
      return [];
    }

    const { data, error } = (await supabaseAdmin
      .from('students')
      .select('id, student_id, name, class, shift, status')
      .in('student_id', firebaseUUIDs)
      .eq('deleted', false)) as { data: Array<{
        id: string;
        student_id: string;
        name: string;
        class: string;
        shift: string;
        status: string;
      }> | null; error: Error | null };

    if (error) {
      logger.error('[StudentService] Erro ao buscar estudantes em batch', {
        count: firebaseUUIDs.length,
        error: error.message
      });
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      estudanteId: row.student_id,
      nome: row.name,
      turma: row.class,
      turno: row.shift,
      status: row.status
    }));
  } catch (error) {
    logger.error('[StudentService] Erro inesperado ao buscar batch', {
      count: firebaseUUIDs.length,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    return [];
  }
}
