/**
 * Student Service - Centralized Firebase operations for students
 * Eliminates duplicate Firebase calls and provides consistent API
 */

import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { logger } from '@/utils/logger';
import { FIREBASE_PATHS } from '@/config/constants';
import type { Estudante } from '@/types';

export class StudentService {
  /**
   * Get all students from Firebase
   */
  static async getStudents(): Promise<Estudante[]> {
    try {
      const docRef = doc(db, FIREBASE_PATHS.students());
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return (data.estudantes || []).map((student: unknown) => {
          // Type-safe student processing
          return StudentService.processStudentData(student);
        });
      }
      
      return [];
    } catch (error) {
      logger.error('Erro ao buscar estudantes', error as Error);
      throw error;
    }
  }

  /**
   * Save students to Firebase
   */
  static async saveStudents(students: Estudante[]): Promise<void> {
    try {
      const cleanedStudents = students.map((student) => 
        StudentService.removeUndefined(student)
      );
      
      const docRef = doc(db, FIREBASE_PATHS.students());
      await setDoc(docRef, { estudantes: cleanedStudents }, { merge: false });
      
      logger.info(`Salvos ${students.length} estudantes no Firebase`);
    } catch (error) {
      logger.error('Erro ao salvar estudantes no Firebase', error as Error);
      throw error;
    }
  }

  /**
   * Get student by ID
   */
  static async getStudentById(estudanteId: string): Promise<Estudante | null> {
    try {
      const students = await StudentService.getStudents();
      return students.find(student => student.estudanteId === estudanteId) || null;
    } catch (error) {
      logger.error('Erro ao buscar estudante por ID', error as Error);
      throw error;
    }
  }

  /**
   * Get students by class
   */
  static async getStudentsByClass(turma: string): Promise<Estudante[]> {
    try {
      const students = await StudentService.getStudents();
      return students.filter(student => student.turma === turma);
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
      const students = await StudentService.getStudents();
      return students.filter(student => 
        student.deficiencia?.estudanteComDeficiencia === true
      );
    } catch (error) {
      logger.error('Erro ao buscar estudantes com deficiência', error as Error);
      throw error;
    }
  }

  /**
   * Search students by name
   */
  static async searchStudentsByName(searchTerm: string): Promise<Estudante[]> {
    try {
      const students = await StudentService.getStudents();
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
   */
  static async updateStudent(updatedStudent: Estudante): Promise<void> {
    try {
      const students = await StudentService.getStudents();
      const index = students.findIndex(s => s.estudanteId === updatedStudent.estudanteId);
      
      if (index === -1) {
        throw new Error(`Estudante com ID ${updatedStudent.estudanteId} não encontrado`);
      }
      
      students[index] = updatedStudent;
      await StudentService.saveStudents(students);
      
      logger.info(`Estudante ${updatedStudent.nome} atualizado com sucesso`);
    } catch (error) {
      logger.error('Erro ao atualizar estudante', error as Error);
      throw error;
    }
  }

  /**
   * Add new student
   */
  static async addStudent(newStudent: Estudante): Promise<void> {
    try {
      const students = await StudentService.getStudents();
      
      // Check for duplicates
      const exists = students.some(s => 
        s.nome.toUpperCase() === newStudent.nome.toUpperCase() &&
        s.turma.toUpperCase() === newStudent.turma.toUpperCase()
      );
      
      if (exists) {
        throw new Error(`Estudante ${newStudent.nome} já existe na turma ${newStudent.turma}`);
      }
      
      students.push(newStudent);
      await StudentService.saveStudents(students);
      
      logger.info(`Novo estudante ${newStudent.nome} adicionado com sucesso`);
    } catch (error) {
      logger.error('Erro ao adicionar novo estudante', error as Error);
      throw error;
    }
  }

  /**
   * Delete student
   */
  static async deleteStudent(estudanteId: string): Promise<void> {
    try {
      const students = await StudentService.getStudents();
      const filteredStudents = students.filter(s => s.estudanteId !== estudanteId);
      
      if (students.length === filteredStudents.length) {
        throw new Error(`Estudante com ID ${estudanteId} não encontrado`);
      }
      
      await StudentService.saveStudents(filteredStudents);
      logger.info(`Estudante removido com sucesso`);
    } catch (error) {
      logger.error('Erro ao remover estudante', error as Error);
      throw error;
    }
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