/**
 * Student Service - Centralized Firebase operations for students
 *
 * V2 MIGRATION: This service now uses the new collection-based structure
 * Path: /{YEAR}/escola/students/{estudanteId}
 *
 * Falls back to old array structure if new structure doesn't exist
 */

import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { logger } from '@/utils/logger';
import { FIREBASE_PATHS } from '@/config/constants';
import type { Estudante } from '@/types';
import { StudentServiceV2 } from './studentServiceV2';

export class StudentService {
  /**
   * Get all students from Firebase
   * Uses V2 (collection-based) with fallback to V1 (array-based)
   */
  static async getStudents(): Promise<Estudante[]> {
    try {
      // Try V2 first (collection-based)
      const v2Students = await StudentServiceV2.getStudents();

      if (v2Students.length > 0) {
        return v2Students;
      }

      // If V2 returns 0, try V1 fallback
      logger.warn('V2 retornou 0 estudantes, tentando fallback para V1');
    } catch (error) {
      logger.warn('V2 falhou, tentando fallback para V1', error as Error);
    }

    // Fallback to V1 (array-based)
    try {
      const docRef = doc(db, FIREBASE_PATHS.students());
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const students = (data.estudantes || []).map((student: unknown) => {
          return StudentService.processStudentData(student);
        });
        logger.info(`V1 fallback: ${students.length} estudantes carregados`);
        return students;
      }

      return [];
    } catch (fallbackError) {
      logger.error('Erro ao buscar estudantes (V1 e V2 falharam)', fallbackError as Error);
      throw fallbackError;
    }
  }

  /**
   * Save students to Firebase (V1 - DEPRECATED)
   * @deprecated Use StudentServiceV2.updateStudent() or StudentServiceV2.addStudent() instead
   * This method saves to the old array structure and should not be used in new code
   */
  static async saveStudents(students: Estudante[]): Promise<void> {
    logger.warn('saveStudents() is deprecated. Use StudentServiceV2.updateStudent() or addStudent() instead');

    try {
      const cleanedStudents = students.map((student) =>
        StudentService.removeUndefined(student)
      );

      const docRef = doc(db, FIREBASE_PATHS.students());
      await setDoc(docRef, { estudantes: cleanedStudents }, { merge: false });
    } catch (error) {
      logger.error('Erro ao salvar estudantes no Firebase', error as Error);
      throw error;
    }
  }

  /**
   * Get student by ID
   * Uses V2 (direct document access - fast!)
   */
  static async getStudentById(estudanteId: string): Promise<Estudante | null> {
    return StudentServiceV2.getStudentById(estudanteId);
  }

  /**
   * Get students by class
   * Uses V2 (Firestore query with index)
   */
  static async getStudentsByClass(turma: string): Promise<Estudante[]> {
    return StudentServiceV2.getStudentsByClass(turma);
  }

  /**
   * Get students with disabilities
   * Uses V2 (Firestore query with index)
   */
  static async getStudentsWithDisabilities(): Promise<Estudante[]> {
    return StudentServiceV2.getStudentsWithDisabilities();
  }

  /**
   * Search students by name
   * Uses V2
   */
  static async searchStudentsByName(searchTerm: string): Promise<Estudante[]> {
    return StudentServiceV2.searchStudentsByName(searchTerm);
  }

  /**
   * Update single student
   * Uses V2 (direct document update - no need to fetch all!)
   */
  static async updateStudent(updatedStudent: Estudante): Promise<void> {
    return StudentServiceV2.updateStudent(updatedStudent);
  }

  /**
   * Add new student
   * Uses V2
   */
  static async addStudent(newStudent: Estudante): Promise<void> {
    return StudentServiceV2.addStudent(newStudent);
  }

  /**
   * Delete student
   * Uses V2
   */
  static async deleteStudent(estudanteId: string): Promise<void> {
    return StudentServiceV2.deleteStudent(estudanteId);
  }

  /**
   * Private helper: Process raw student data from Firebase
   */
  private static processStudentData(rawStudent: unknown): Estudante {
    const s = rawStudent as any;
    
    return {
      estudanteId: s.estudanteId || '',
      turma: s.turma || '',
      nome: s.nome || '',
      status: s.status || 'ATIVO',
      turno: s.turno || StudentService.determineTurno(s.turma || ''),
      bolsaFamilia: s.bolsaFamilia || 'NÃO',
      matricula: s.matricula || '',
      contatos: s.contatos?.map((contato: any) => ({
        nome: contato.nome || '',
        telefone: contato.telefone || '',
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
      return obj.map(StudentService.removeUndefined);
    }
    if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, StudentService.removeUndefined(value)])
      );
    }
    return obj;
  }
}

/**
 * Convenience hooks for React components
 */
export const studentService = {
  getStudents: StudentService.getStudents,
  saveStudents: StudentService.saveStudents,
  getStudentById: StudentService.getStudentById,
  getStudentsByClass: StudentService.getStudentsByClass,
  getStudentsWithDisabilities: StudentService.getStudentsWithDisabilities,
  searchStudentsByName: StudentService.searchStudentsByName,
  updateStudent: StudentService.updateStudent,
  addStudent: StudentService.addStudent,
  deleteStudent: StudentService.deleteStudent,
};