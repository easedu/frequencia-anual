/**
 * Student Data Service - V3 Unified Structure
 *
 * FASE 1: Dual-Write Strategy
 * - Writes go to BOTH V2 (2025/escola/students) AND V3 (students)
 * - Reads prefer V3 with fallback to V2
 * - Zero downtime migration
 *
 * Structure V3:
 * students/{studentId}
 *   ├── (root fields)
 *   └── contacts/{contactId}
 *       ├── nome
 *       ├── parentesco
 *       ├── telefone
 *       ├── telefoneNumerico
 *       ├── podeReceberWhatsapp
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
  updateDoc,
  writeBatch,
  addDoc,
} from 'firebase/firestore';
import { db } from '@/firebase.config';
import { logger } from '@/utils/logger';
import type { Estudante } from '@/types';
import {
  FIREBASE_PATHS_V2,
  FIREBASE_PATHS_V3,
  CURRENT_SCHOOL_YEAR
} from '@/config/constants';
import { addCreationAudit, addUpdateAudit } from '@/utils/auditHelpers';
import { markAsDeleted, restoreDeleted, initializeSoftDelete } from '@/utils/softDeleteHelpers';

/**
 * Interface para contato na V3 (subcoleção)
 */
interface ContactV3 {
  nome: string;
  parentesco: string;
  telefone: string;
  telefoneNumerico: string;
  podeReceberWhatsapp: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Interface para dados do estudante na V3 (documento raiz)
 */
interface StudentV3 {
  estudanteId: string;
  nome: string;
  turma: string;
  status: string;
  turno: 'MANHÃ' | 'TARDE';
  bolsaFamilia: string;
  matricula?: string;
  email?: string;
  dataNascimento?: string;
  endereco?: any;
  deficiencia?: any;
  provaSaoPaulo?: any[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
  updatedBy?: string;
  deleted?: boolean;
  deletedAt?: Timestamp;
  deletedBy?: string;
  deletionReason?: string;
}

export class StudentDataService {
  /**
   * Get all students
   * Read from V3 first, fallback to V2 if needed
   */
  static async getStudents(includeDeleted: boolean = false): Promise<Estudante[]> {
    try {
      logger.info('📖 [V3] Lendo estudantes...');

      // Try V3 first
      const v3Students = await StudentDataService.getStudentsFromV3(includeDeleted);

      if (v3Students.length > 0) {
        logger.info(`✅ [V3] ${v3Students.length} estudantes encontrados`);
        return v3Students;
      }

      // Fallback to V2
      logger.warn('⚠️  [V3] Vazio, usando fallback V2');
      return await StudentDataService.getStudentsFromV2(includeDeleted);

    } catch (error) {
      logger.error('❌ Erro ao buscar estudantes', error as Error);
      throw error;
    }
  }

  /**
   * Get student by ID
   * Read from V3 first, fallback to V2
   */
  static async getStudentById(estudanteId: string): Promise<Estudante | null> {
    try {
      logger.info(`📖 [V3] Lendo estudante ${estudanteId}...`);

      // Try V3 first
      const v3Student = await StudentDataService.getStudentFromV3(estudanteId);

      if (v3Student) {
        logger.info(`✅ [V3] Estudante encontrado`);
        return v3Student;
      }

      // Fallback to V2
      logger.warn(`⚠️  [V3] Não encontrado, usando fallback V2`);
      return await StudentDataService.getStudentFromV2(estudanteId);

    } catch (error) {
      logger.error('❌ Erro ao buscar estudante por ID', error as Error);
      throw error;
    }
  }

  /**
   * Add new student
   * DUAL WRITE: Writes to BOTH V2 and V3
   */
  static async addStudent(newStudent: Estudante, userId?: string): Promise<string> {
    try {
      logger.info('💾 [DUAL-WRITE] Adicionando estudante...');

      const batch = writeBatch(db);

      // Normalize data
      const normalizedStudent = StudentDataService.normalizeStudent(newStudent);

      // 1. Write to V2 (2025/escola/students)
      const v2Path = FIREBASE_PATHS_V2.student(newStudent.estudanteId);
      const v2Ref = doc(db, v2Path);

      const v2Data = {
        ...normalizedStudent,
        contatos: normalizedStudent.contatos || [],
        ...addCreationAudit(normalizedStudent as object, userId),
        ...initializeSoftDelete(),
      };

      batch.set(v2Ref, StudentDataService.removeUndefined(v2Data) as any);
      logger.info(`  ✓ V2: ${v2Path}`);

      // 2. Write to V3 (students/{id})
      const v3Ref = doc(db, FIREBASE_PATHS_V3.student(newStudent.estudanteId));

      const v3StudentData: StudentV3 = {
        estudanteId: normalizedStudent.estudanteId,
        nome: normalizedStudent.nome,
        turma: normalizedStudent.turma,
        status: normalizedStudent.status,
        turno: normalizedStudent.turno,
        bolsaFamilia: normalizedStudent.bolsaFamilia,
        matricula: normalizedStudent.matricula,
        email: normalizedStudent.email,
        dataNascimento: normalizedStudent.dataNascimento,
        endereco: normalizedStudent.endereco,
        deficiencia: normalizedStudent.deficiencia,
        provaSaoPaulo: normalizedStudent.provaSaoPaulo,
        ...addCreationAudit({} as object, userId),
        ...initializeSoftDelete(),
      };

      batch.set(v3Ref, StudentDataService.removeUndefined(v3StudentData) as any);
      logger.info(`  ✓ V3: students/${newStudent.estudanteId}`);

      // Commit batch
      await batch.commit();

      // 3. Write contacts to V3 subcollection (after batch to avoid conflicts)
      if (normalizedStudent.contatos && normalizedStudent.contatos.length > 0) {
        await StudentDataService.writeContactsToV3(
          newStudent.estudanteId,
          normalizedStudent.contatos,
          userId
        );
      }

      logger.info(`✅ [DUAL-WRITE] Estudante ${newStudent.nome} adicionado com sucesso`);
      return newStudent.estudanteId;

    } catch (error) {
      logger.error('❌ Erro ao adicionar estudante', error as Error);
      throw error;
    }
  }

  /**
   * Update student
   * DUAL WRITE: Updates BOTH V2 and V3
   */
  static async updateStudent(updatedStudent: Estudante, userId?: string): Promise<void> {
    try {
      logger.info(`💾 [DUAL-WRITE] Atualizando estudante ${updatedStudent.estudanteId}...`);

      const normalizedStudent = StudentDataService.normalizeStudent(updatedStudent);
      const batch = writeBatch(db);

      // 1. Update V2
      const v2Ref = doc(db, FIREBASE_PATHS_V2.student(updatedStudent.estudanteId));
      const v2Data = {
        ...normalizedStudent,
        contatos: normalizedStudent.contatos || [],
        ...addUpdateAudit({} as object, userId),
      };

      batch.update(v2Ref, StudentDataService.removeUndefined(v2Data) as any);
      logger.info(`  ✓ V2 atualizado`);

      // 2. Update V3 (root document)
      const v3Ref = doc(db, FIREBASE_PATHS_V3.student(updatedStudent.estudanteId));

      const v3StudentData: Partial<StudentV3> = {
        nome: normalizedStudent.nome,
        turma: normalizedStudent.turma,
        status: normalizedStudent.status,
        turno: normalizedStudent.turno,
        bolsaFamilia: normalizedStudent.bolsaFamilia,
        matricula: normalizedStudent.matricula,
        email: normalizedStudent.email,
        dataNascimento: normalizedStudent.dataNascimento,
        endereco: normalizedStudent.endereco,
        deficiencia: normalizedStudent.deficiencia,
        provaSaoPaulo: normalizedStudent.provaSaoPaulo,
        ...addUpdateAudit({} as object, userId),
      };

      batch.update(v3Ref, StudentDataService.removeUndefined(v3StudentData) as any);
      logger.info(`  ✓ V3 raiz atualizado`);

      // Commit batch
      await batch.commit();

      // 3. Update V3 contacts subcollection
      if (normalizedStudent.contatos && normalizedStudent.contatos.length > 0) {
        await StudentDataService.syncContactsToV3(
          updatedStudent.estudanteId,
          normalizedStudent.contatos,
          userId
        );
      }

      logger.info(`✅ [DUAL-WRITE] Estudante atualizado com sucesso`);

    } catch (error) {
      logger.error('❌ Erro ao atualizar estudante', error as Error);
      throw error;
    }
  }

  /**
   * Delete student (soft delete)
   * DUAL WRITE: Marks as deleted in BOTH V2 and V3
   */
  static async deleteStudent(estudanteId: string, userId?: string, reason?: string): Promise<void> {
    try {
      logger.info(`🗑️  [DUAL-WRITE] Soft delete estudante ${estudanteId}...`);

      const batch = writeBatch(db);
      const deleteFields = markAsDeleted(userId, reason);

      // 1. Soft delete V2
      const v2Ref = doc(db, FIREBASE_PATHS_V2.student(estudanteId));
      batch.update(v2Ref, deleteFields as any);

      // 2. Soft delete V3
      const v3Ref = doc(db, FIREBASE_PATHS_V3.student(estudanteId));
      batch.update(v3Ref, deleteFields as any);

      await batch.commit();

      logger.info(`✅ [DUAL-WRITE] Estudante marcado como deletado`);

    } catch (error) {
      logger.error('❌ Erro ao deletar estudante', error as Error);
      throw error;
    }
  }

  /**
   * Restore deleted student
   * DUAL WRITE: Restores in BOTH V2 and V3
   */
  static async restoreStudent(estudanteId: string, userId?: string): Promise<void> {
    try {
      logger.info(`♻️  [DUAL-WRITE] Restaurando estudante ${estudanteId}...`);

      const batch = writeBatch(db);
      const restoreFields = restoreDeleted();

      // 1. Restore V2
      const v2Ref = doc(db, FIREBASE_PATHS_V2.student(estudanteId));
      batch.update(v2Ref, { ...restoreFields, updatedAt: Timestamp.now(), ...(userId && { updatedBy: userId }) });

      // 2. Restore V3
      const v3Ref = doc(db, FIREBASE_PATHS_V3.student(estudanteId));
      batch.update(v3Ref, { ...restoreFields, updatedAt: Timestamp.now(), ...(userId && { updatedBy: userId }) });

      await batch.commit();

      logger.info(`✅ [DUAL-WRITE] Estudante restaurado com sucesso`);

    } catch (error) {
      logger.error('❌ Erro ao restaurar estudante', error as Error);
      throw error;
    }
  }

  // ============================================
  // V3 SPECIFIC OPERATIONS
  // ============================================

  /**
   * Get all students from V3
   */
  private static async getStudentsFromV3(includeDeleted: boolean = false): Promise<Estudante[]> {
    try {
      const studentsRef = collection(db, FIREBASE_PATHS_V3.students());

      let q = query(studentsRef, orderBy('nome'));

      if (!includeDeleted) {
        q = query(studentsRef, where('deleted', '==', false), orderBy('nome'));
      }

      const snapshot = await getDocs(q);
      const students: Estudante[] = [];

      for (const docSnap of snapshot.docs) {
        const studentData = docSnap.data() as StudentV3;

        // Fetch contacts from subcollection
        const contactsRef = collection(db, FIREBASE_PATHS_V3.contacts(docSnap.id));
        const contactsSnap = await getDocs(contactsRef);

        const contatos = contactsSnap.docs.map(contactDoc => {
          const contact = contactDoc.data() as ContactV3;
          return {
            nome: contact.nome || '',
            parentesco: contact.parentesco || '',
            telefone: contact.telefone || '',
            podeReceberMensagem: contact.podeReceberWhatsapp !== false,
          };
        });

        students.push(StudentDataService.convertV3ToEstudante(studentData, contatos));
      }

      return students;

    } catch (error: any) {
      // Handle index errors with fallback
      if (error?.code === 'failed-precondition') {
        logger.warn('Index V3 não disponível, usando fallback sem orderBy');

        const studentsRef = collection(db, FIREBASE_PATHS_V3.students());
        const snapshot = await getDocs(studentsRef);
        const students: Estudante[] = [];

        for (const docSnap of snapshot.docs) {
          const studentData = docSnap.data() as StudentV3;

          if (includeDeleted || studentData.deleted !== true) {
            const contactsRef = collection(db, FIREBASE_PATHS_V3.contacts(docSnap.id));
            const contactsSnap = await getDocs(contactsRef);

            const contatos = contactsSnap.docs.map(contactDoc => {
              const contact = contactDoc.data() as ContactV3;
              return {
                nome: contact.nome || '',
                parentesco: contact.parentesco || '',
                telefone: contact.telefone || '',
                podeReceberMensagem: contact.podeReceberWhatsapp !== false,
              };
            });

            students.push(StudentDataService.convertV3ToEstudante(studentData, contatos));
          }
        }

        students.sort((a, b) => a.nome.localeCompare(b.nome));
        return students;
      }

      throw error;
    }
  }

  /**
   * Get single student from V3
   */
  private static async getStudentFromV3(estudanteId: string): Promise<Estudante | null> {
    try {
      const docRef = doc(db, FIREBASE_PATHS_V3.student(estudanteId));
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const studentData = docSnap.data() as StudentV3;

      // Fetch contacts
      const contactsRef = collection(db, FIREBASE_PATHS_V3.contacts(estudanteId));
      const contactsSnap = await getDocs(contactsRef);

      const contatos = contactsSnap.docs.map(contactDoc => {
        const contact = contactDoc.data() as ContactV3;
        return {
          nome: contact.nome || '',
          parentesco: contact.parentesco || '',
          telefone: contact.telefone || '',
          podeReceberMensagem: contact.podeReceberWhatsapp !== false,
        };
      });

      return StudentDataService.convertV3ToEstudante(studentData, contatos);

    } catch (error) {
      logger.error('Erro ao buscar estudante V3', error as Error);
      return null;
    }
  }

  /**
   * Write contacts to V3 subcollection
   */
  private static async writeContactsToV3(
    estudanteId: string,
    contatos: any[],
    userId?: string
  ): Promise<void> {
    const contactsRef = collection(db, FIREBASE_PATHS_V3.contacts(estudanteId));

    for (const contato of contatos) {
      const contactData: ContactV3 = {
        nome: StudentDataService.normalizeContactName(contato.nome),
        parentesco: StudentDataService.normalizeParentesco(contato.parentesco || ''),
        telefone: contato.telefone || '',
        telefoneNumerico: StudentDataService.extractNumericPhone(contato.telefone || ''),
        podeReceberWhatsapp: contato.podeReceberMensagem !== false,
        ...addCreationAudit({} as object, userId),
      };

      await addDoc(contactsRef, StudentDataService.removeUndefined(contactData) as any);
    }

    logger.info(`  ✓ V3: ${contatos.length} contatos adicionados`);
  }

  /**
   * Sync contacts to V3 (delete all and recreate)
   */
  private static async syncContactsToV3(
    estudanteId: string,
    contatos: any[],
    userId?: string
  ): Promise<void> {
    // 1. Delete existing contacts
    const contactsRef = collection(db, FIREBASE_PATHS_V3.contacts(estudanteId));
    const existingContacts = await getDocs(contactsRef);

    const batch = writeBatch(db);
    existingContacts.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // 2. Add new contacts
    await StudentDataService.writeContactsToV3(estudanteId, contatos, userId);

    logger.info(`  ✓ V3: ${contatos.length} contatos sincronizados`);
  }

  // ============================================
  // V2 FALLBACK OPERATIONS
  // ============================================

  /**
   * Get all students from V2 (fallback)
   */
  private static async getStudentsFromV2(includeDeleted: boolean = false): Promise<Estudante[]> {
    try {
      const studentsRef = collection(db, FIREBASE_PATHS_V2.students());

      let q = query(studentsRef, orderBy('nome'));

      if (!includeDeleted) {
        q = query(studentsRef, where('deleted', '==', false), orderBy('nome'));
      }

      const snapshot = await getDocs(q);
      const students: Estudante[] = [];

      snapshot.forEach((doc) => {
        students.push(StudentDataService.processStudentData({ id: doc.id, ...doc.data() }));
      });

      return students;

    } catch (error: any) {
      if (error?.code === 'failed-precondition') {
        logger.warn('Index V2 não disponível, usando fallback');

        const studentsRef = collection(db, FIREBASE_PATHS_V2.students());
        const snapshot = await getDocs(studentsRef);
        let students: Estudante[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (includeDeleted || data.deleted !== true) {
            students.push(StudentDataService.processStudentData({ id: doc.id, ...data }));
          }
        });

        students.sort((a, b) => a.nome.localeCompare(b.nome));
        return students;
      }

      throw error;
    }
  }

  /**
   * Get single student from V2 (fallback)
   */
  private static async getStudentFromV2(estudanteId: string): Promise<Estudante | null> {
    try {
      const docRef = doc(db, FIREBASE_PATHS_V2.student(estudanteId));
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return StudentDataService.processStudentData({ id: docSnap.id, ...docSnap.data() });

    } catch (error) {
      logger.error('Erro ao buscar estudante V2', error as Error);
      return null;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Convert V3 student data to Estudante interface
   */
  private static convertV3ToEstudante(studentData: StudentV3, contatos: any[]): Estudante {
    return {
      estudanteId: studentData.estudanteId,
      nome: studentData.nome,
      turma: studentData.turma,
      status: studentData.status,
      turno: studentData.turno,
      bolsaFamilia: studentData.bolsaFamilia,
      matricula: studentData.matricula,
      email: studentData.email,
      dataNascimento: studentData.dataNascimento,
      contatos: contatos,
      endereco: studentData.endereco,
      deficiencia: studentData.deficiencia || {
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
      },
      provaSaoPaulo: studentData.provaSaoPaulo || [],
    };
  }

  /**
   * Normalize student data
   */
  private static normalizeStudent(student: Estudante): Estudante {
    return {
      ...student,
      contatos: student.contatos?.map(contato => ({
        podeReceberMensagem: contato.podeReceberMensagem ?? true,
        nome: StudentDataService.normalizeContactName(contato.nome),
        telefone: contato.telefone,
        parentesco: StudentDataService.normalizeParentesco(contato.parentesco || ''),
      })) || [],
    };
  }

  /**
   * Normalize contact name
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
   * Normalize parentesco
   */
  private static normalizeParentesco(parentesco: string): string {
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
   * Extract numeric phone
   */
  private static extractNumericPhone(telefone: string): string {
    return telefone.replace(/\D/g, '');
  }

  /**
   * Process raw student data from V2 (compatibility)
   */
  private static processStudentData(rawStudent: any): Estudante {
    const s = rawStudent;

    return {
      estudanteId: s.estudanteId || s.id || '',
      turma: s.turma || '',
      nome: s.nome || '',
      status: s.status || 'ATIVO',
      turno: s.turno || StudentDataService.determineTurno(s.turma || ''),
      bolsaFamilia: s.bolsaFamilia || 'NÃO',
      matricula: s.matricula || '',
      contatos: s.contatos?.map((contato: any) => ({
        podeReceberMensagem: contato.podeReceberMensagem ?? true,
        nome: contato.nome || '',
        telefone: contato.telefone || '',
        parentesco: contato.parentesco || '',
      })) || [],
      email: s.email || '',
      endereco: s.endereco,
      dataNascimento: s.dataNascimento || '',
      deficiencia: s.deficiencia || {
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
      },
      provaSaoPaulo: s.provaSaoPaulo || [],
    };
  }

  /**
   * Determine turno from class
   */
  private static determineTurno(turma: string): 'MANHÃ' | 'TARDE' {
    const firstChar = turma.trim().charAt(0).toUpperCase();
    return ['1', '2', '3', '4'].includes(firstChar) ? 'TARDE' : 'MANHÃ';
  }

  /**
   * Remove undefined fields recursively
   */
  private static removeUndefined(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      return obj.map(StudentDataService.removeUndefined);
    }
    if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, StudentDataService.removeUndefined(value)])
      );
    }
    return obj;
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
 * Get students by year (backward compatibility)
 */
export const getStudentsByYear = (year?: string) => StudentDataService.getStudents();

/**
 * Get student contacts (backward compatibility)
 */
export async function getStudentContacts(estudanteId: string) {
  const student = await StudentDataService.getStudentById(estudanteId);

  return {
    _dataSource: {
      source: 'new',
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
