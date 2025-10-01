/**
 * Student Service V2 - Collection-based structure
 * Uses individual documents instead of array
 * Path: /{YEAR}/escola/students/{estudanteId}
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/firebase.config';
import { logger } from '@/utils/logger';
import type { Estudante } from '@/types';
import { addCreationAudit, addUpdateAudit, getUpdateAuditFields } from '@/utils/auditHelpers';
import { markAsDeleted, restoreDeleted, initializeSoftDelete } from '@/utils/softDeleteHelpers';

const CURRENT_SCHOOL_YEAR = process.env.NEXT_PUBLIC_SCHOOL_YEAR || new Date().getFullYear().toString();

/**
 * Get the students collection reference
 */
function getStudentsCollection() {
  return collection(db, CURRENT_SCHOOL_YEAR, 'escola', 'students');
}

/**
 * Get a specific student document reference
 */
function getStudentDoc(estudanteId: string) {
  return doc(db, CURRENT_SCHOOL_YEAR, 'escola', 'students', estudanteId);
}

export class StudentServiceV2 {
  /**
   * Get all students from Firebase
   * Uses collection query instead of array
   * Filters out soft-deleted students by default
   */
  static async getStudents(includeDeleted: boolean = false): Promise<Estudante[]> {
    try {
      const studentsRef = getStudentsCollection();

      // Try with index first (will work after firebase deploy)
      try {
        let q = query(studentsRef, orderBy('nome'));

        // Filter out deleted students by default
        if (!includeDeleted) {
          q = query(studentsRef, where('deleted', '==', false), orderBy('nome'));
        }

        const snapshot = await getDocs(q);
        const students: Estudante[] = [];

        snapshot.forEach((doc) => {
          students.push(StudentServiceV2.processStudentData({ id: doc.id, ...doc.data() }));
        });

        return students;
      } catch (indexError: any) {
        // Fallback: Get all documents and filter/sort in memory
        // This works without indexes but is slower
        if (indexError?.code === 'failed-precondition') {
          logger.warn('Index não disponível, usando fallback (filtrar em memória)');

          const snapshot = await getDocs(studentsRef);
          let students: Estudante[] = [];

          snapshot.forEach((doc) => {
            const data = doc.data();
            // Filter deleted in memory if needed
            if (includeDeleted || data.deleted !== true) {
              students.push(StudentServiceV2.processStudentData({ id: doc.id, ...data }));
            }
          });

          // Sort in memory
          students.sort((a, b) => a.nome.localeCompare(b.nome));

          return students;
        }
        throw indexError;
      }
    } catch (error) {
      logger.error('Erro ao buscar estudantes', error as Error);
      throw error;
    }
  }

  /**
   * Get student by ID
   * Direct document access (fast!)
   */
  static async getStudentById(estudanteId: string): Promise<Estudante | null> {
    try {
      const docRef = getStudentDoc(estudanteId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return StudentServiceV2.processStudentData({ id: docSnap.id, ...docSnap.data() });
    } catch (error) {
      logger.error('Erro ao buscar estudante por ID', error as Error);
      throw error;
    }
  }

  /**
   * Get students by class
   * Uses Firestore query with index
   */
  static async getStudentsByClass(turma: string): Promise<Estudante[]> {
    try {
      const studentsRef = getStudentsCollection();

      // Try with index first
      try {
        const q = query(
          studentsRef,
          where('turma', '==', turma),
          orderBy('nome')
        );

        const snapshot = await getDocs(q);
        const students: Estudante[] = [];

        snapshot.forEach((doc) => {
          students.push(StudentServiceV2.processStudentData({ id: doc.id, ...doc.data() }));
        });

        return students;
      } catch (indexError: any) {
        // Fallback: Filter and sort in memory
        if (indexError?.code === 'failed-precondition') {
          logger.warn('Index não disponível para turma, usando fallback');

          const q = query(studentsRef, where('turma', '==', turma));
          const snapshot = await getDocs(q);
          const students: Estudante[] = [];

          snapshot.forEach((doc) => {
            students.push(StudentServiceV2.processStudentData({ id: doc.id, ...doc.data() }));
          });

          // Sort in memory
          students.sort((a, b) => a.nome.localeCompare(b.nome));

          return students;
        }
        throw indexError;
      }
    } catch (error) {
      logger.error('Erro ao buscar estudantes por turma', error as Error);
      throw error;
    }
  }

  /**
   * Get students with disabilities
   */
  static async getStudentsWithDisabilities(): Promise<Estudante[]> {
    try {
      const studentsRef = getStudentsCollection();
      const q = query(
        studentsRef,
        where('deficiencia.estudanteComDeficiencia', '==', true),
        orderBy('nome')
      );

      const snapshot = await getDocs(q);
      const students: Estudante[] = [];

      snapshot.forEach((doc) => {
        students.push(StudentServiceV2.processStudentData({ id: doc.id, ...doc.data() }));
      });

      return students;
    } catch (error) {
      // Fallback: if index doesn't exist, fetch all and filter
      logger.warn('Index não encontrado, usando fallback', error as Error);
      const allStudents = await StudentServiceV2.getStudents();
      return allStudents.filter(s => s.deficiencia?.estudanteComDeficiencia === true);
    }
  }

  /**
   * Search students by name
   * Note: Firestore doesn't support full-text search natively
   * For production, consider using Algolia or similar
   */
  static async searchStudentsByName(searchTerm: string): Promise<Estudante[]> {
    try {
      // For now, fetch all and filter client-side
      // TODO: Implement proper search with Algolia/ElasticSearch
      const students = await StudentServiceV2.getStudents();
      const normalizedSearch = searchTerm.toLowerCase().trim();

      return students.filter(student =>
        student.nome.toLowerCase().includes(normalizedSearch)
      );
    } catch (error) {
      logger.error('Erro ao buscar estudantes por nome', error as Error);
      throw error;
    }
  }

  /**
   * Update single student
   * Direct document update (no need to fetch all!)
   */
  static async updateStudent(updatedStudent: Estudante, userId?: string): Promise<void> {
    try {
      const docRef = getStudentDoc(updatedStudent.estudanteId);

      // Check if exists
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Estudante com ID ${updatedStudent.estudanteId} não encontrado`);
      }

      // Normalize contact data
      const normalizedStudent = {
        ...updatedStudent,
        contatos: updatedStudent.contatos?.map(contato => ({
          podeReceberMensagem: contato.podeReceberMensagem ?? true,
          nome: StudentServiceV2.normalizeContactName(contato.nome),
          telefone: contato.telefone,
          parentesco: StudentServiceV2.normalizeParentesco(contato.parentesco || ''),
        })) || [],
      };

      // Add update audit fields
      const cleanedData = StudentServiceV2.removeUndefined(normalizedStudent);
      const dataToUpdate = addUpdateAudit(cleanedData as object, userId);

      await updateDoc(docRef, dataToUpdate);

      logger.info(`Estudante ${updatedStudent.nome} atualizado com sucesso`);
    } catch (error) {
      logger.error('Erro ao atualizar estudante', error as Error);
      throw error;
    }
  }

  /**
   * Add new student
   */
  static async addStudent(newStudent: Estudante, userId?: string): Promise<void> {
    try {
      // Check for duplicates
      const studentsRef = getStudentsCollection();
      const q = query(
        studentsRef,
        where('nome', '==', newStudent.nome.toUpperCase()),
        where('turma', '==', newStudent.turma.toUpperCase())
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        throw new Error(`Estudante ${newStudent.nome} já existe na turma ${newStudent.turma}`);
      }

      // Normalize contact data
      const normalizedStudent = {
        ...newStudent,
        contatos: newStudent.contatos?.map(contato => ({
          podeReceberMensagem: contato.podeReceberMensagem ?? true,
          nome: StudentServiceV2.normalizeContactName(contato.nome),
          telefone: contato.telefone,
          parentesco: StudentServiceV2.normalizeParentesco(contato.parentesco || ''),
        })) || [],
      };

      // Add creation audit fields and soft delete initialization
      const cleanedData = StudentServiceV2.removeUndefined(normalizedStudent);
      const dataToSave = {
        ...addCreationAudit(cleanedData as object, userId),
        ...initializeSoftDelete(),
      };

      const docRef = getStudentDoc(newStudent.estudanteId);
      await setDoc(docRef, dataToSave);

      logger.info(`Novo estudante ${newStudent.nome} adicionado com sucesso`);
    } catch (error) {
      logger.error('Erro ao adicionar novo estudante', error as Error);
      throw error;
    }
  }

  /**
   * Delete student (soft delete - marks as deleted)
   */
  static async deleteStudent(estudanteId: string, userId?: string, reason?: string): Promise<void> {
    try {
      const docRef = getStudentDoc(estudanteId);

      // Check if exists
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Estudante com ID ${estudanteId} não encontrado`);
      }

      // Soft delete instead of hard delete
      const deleteFields = markAsDeleted(userId, reason);
      await updateDoc(docRef, {
        ...deleteFields,
        updatedAt: Timestamp.now(),
        ...(userId && { updatedBy: userId }),
      });

      logger.info(`Estudante marcado como deletado (soft delete)`);
    } catch (error) {
      logger.error('Erro ao remover estudante', error as Error);
      throw error;
    }
  }

  /**
   * Restore deleted student
   */
  static async restoreStudent(estudanteId: string, userId?: string): Promise<void> {
    try {
      const docRef = getStudentDoc(estudanteId);

      // Check if exists
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Estudante com ID ${estudanteId} não encontrado`);
      }

      // Restore
      const restoreFields = restoreDeleted();
      await updateDoc(docRef, {
        ...restoreFields,
        updatedAt: Timestamp.now(),
        ...(userId && { updatedBy: userId }),
      });

      logger.info(`Estudante restaurado com sucesso`);
    } catch (error) {
      logger.error('Erro ao restaurar estudante', error as Error);
      throw error;
    }
  }

  /**
   * Permanently delete student (use with caution!)
   */
  static async permanentlyDeleteStudent(estudanteId: string): Promise<void> {
    try {
      const docRef = getStudentDoc(estudanteId);

      // Check if exists
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Estudante com ID ${estudanteId} não encontrado`);
      }

      await deleteDoc(docRef);
      logger.warn(`⚠️  Estudante PERMANENTEMENTE deletado`);
    } catch (error) {
      logger.error('Erro ao deletar estudante permanentemente', error as Error);
      throw error;
    }
  }

  /**
   * Batch operations helper
   */
  static async getStudentsByIds(estudanteIds: string[]): Promise<Estudante[]> {
    try {
      if (estudanteIds.length === 0) return [];

      // Firestore 'in' operator limited to 10 items
      const chunks = [];
      for (let i = 0; i < estudanteIds.length; i += 10) {
        chunks.push(estudanteIds.slice(i, i + 10));
      }

      const allStudents: Estudante[] = [];

      for (const chunk of chunks) {
        const studentsRef = getStudentsCollection();
        const q = query(studentsRef, where('estudanteId', 'in', chunk));
        const snapshot = await getDocs(q);

        snapshot.forEach((doc) => {
          allStudents.push(StudentServiceV2.processStudentData({ id: doc.id, ...doc.data() }));
        });
      }

      return allStudents;
    } catch (error) {
      logger.error('Erro ao buscar estudantes por IDs', error as Error);
      throw error;
    }
  }

  /**
   * Private helper: Process raw student data from Firebase
   */
  private static processStudentData(rawStudent: any): Estudante {
    const s = rawStudent;

    return {
      estudanteId: s.estudanteId || s.id || '',
      turma: s.turma || '',
      nome: s.nome || '',
      status: s.status || 'ATIVO',
      turno: s.turno || StudentServiceV2.determineTurno(s.turma || ''),
      bolsaFamilia: s.bolsaFamilia || 'NÃO',
      matricula: s.matricula || '',
      contatos: s.contatos?.map((contato: any) => ({
        podeReceberMensagem: contato.podeReceberMensagem ?? true,
        nome: contato.nome || '',
        telefone: contato.telefone || '',
        parentesco: contato.parentesco || '',
      })) || [],
      email: s.email || '',
      endereco: s.endereco ? {
        rua: s.endereco.rua || '',
        numero: s.endereco.numero || '',
        bairro: s.endereco.bairro || '',
        cidade: s.endereco.cidade || '',
        estado: s.endereco.estado || '',
        cep: s.endereco.cep || '',
        complemento: s.endereco.complemento || '',
      } : undefined,
      dataNascimento: s.dataNascimento || '',
      deficiencia: s.deficiencia ? {
        estudanteComDeficiencia: s.deficiencia.estudanteComDeficiencia || false,
        tipoDeficiencia: s.deficiencia.tipoDeficiencia || [],
        possuiBarreiras: s.deficiencia.possuiBarreiras ?? true,
        aee: s.deficiencia.aee || undefined,
        instituicao: s.deficiencia.instituicao || undefined,
        horarioAtendimento: s.deficiencia.horarioAtendimento || 'NENHUM',
        atendimentoSaude: s.deficiencia.atendimentoSaude || [],
        possuiEstagiario: s.deficiencia.possuiEstagiario || false,
        nomeEstagiario: s.deficiencia.nomeEstagiario || 'NÃO NECESSITA',
        justificativaEstagiario: s.deficiencia.justificativaEstagiario || 'SEM BARREIRAS',
        ave: s.deficiencia.ave || false,
        nomeAve: s.deficiencia.nomeAve || '',
        justificativaAve: s.deficiencia.justificativaAve || [],
      } : {
        estudanteComDeficiencia: false,
        tipoDeficiencia: [],
        possuiBarreiras: true,
        aee: undefined,
        instituicao: undefined,
        horarioAtendimento: 'NENHUM',
        atendimentoSaude: [],
        possuiEstagiario: false,
        nomeEstagiario: 'NÃO NECESSITA',
        justificativaEstagiario: 'SEM BARREIRAS',
        ave: false,
        nomeAve: '',
        justificativaAve: [],
      },
      provaSaoPaulo: s.provaSaoPaulo?.map((prova: any) => ({
        matricula: prova.matricula || '',
        edicao: prova.edicao || '',
        mediaAluno: prova.mediaAluno || 0,
        nivelProficiencia: prova.nivelProficiencia || '',
        anoEscolar: prova.anoEscolar || '',
        disciplina: prova.disciplina || '',
        dataImportacao: prova.dataImportacao || '',
      })) || [],
    };
  }

  /**
   * Private helper: Normalize contact name (capitalize first letter of each word)
   */
  private static normalizeContactName(name: string): string {
    if (!name || typeof name !== 'string') return '';

    return name
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Private helper: Normalize parentesco with proper Portuguese accents
   */
  private static normalizeParentesco(parentesco: string): string {
    if (!parentesco || typeof parentesco !== 'string') return '';

    const normalized = parentesco.trim().toLowerCase();

    // Mapa de normalizações comuns em português
    const parentescoMap: Record<string, string> = {
      'mae': 'Mãe',
      'mãe': 'Mãe',
      'pai': 'Pai',
      'avo': 'Avó',
      'avó': 'Avó',
      'avô': 'Avô',
      'avo masculino': 'Avô',
      'avo feminino': 'Avó',
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
      'padrasto': 'Padrasto',
      'madrasta': 'Madrasta',
      'outro': 'Outro',
      'prima': 'Prima',
      'primo': 'Primo',
      'sobrinho': 'Sobrinho',
      'sobrinha': 'Sobrinha',
    };

    // Retorna do mapa se encontrar, senão capitaliza a primeira letra
    return parentescoMap[normalized] ||
           (normalized.charAt(0).toUpperCase() + normalized.slice(1));
  }

  /**
   * Private helper: Determine shift based on class
   */
  private static determineTurno(turma: string): 'MANHÃ' | 'TARDE' {
    const firstChar = turma.trim().charAt(0).toUpperCase();
    return ['1', '2', '3', '4'].includes(firstChar) ? 'TARDE' : 'MANHÃ';
  }

  /**
   * Private helper: Remove undefined fields recursively
   */
  private static removeUndefined(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      return obj.map(StudentServiceV2.removeUndefined);
    }
    if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, StudentServiceV2.removeUndefined(value)])
      );
    }
    return obj;
  }
}

/**
 * Convenience export
 */
export const studentServiceV2 = {
  getStudents: StudentServiceV2.getStudents,
  getStudentById: StudentServiceV2.getStudentById,
  getStudentsByClass: StudentServiceV2.getStudentsByClass,
  getStudentsWithDisabilities: StudentServiceV2.getStudentsWithDisabilities,
  searchStudentsByName: StudentServiceV2.searchStudentsByName,
  updateStudent: StudentServiceV2.updateStudent,
  addStudent: StudentServiceV2.addStudent,
  deleteStudent: StudentServiceV2.deleteStudent,
  getStudentsByIds: StudentServiceV2.getStudentsByIds,
};