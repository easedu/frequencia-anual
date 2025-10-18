/**
 * Absence Service - Supabase Version
 *
 * @deprecated Use hooks from @/hooks/api/useAbsences instead
 *
 * Este service está sendo gradualmente substituído por hooks da API REST.
 * Para componentes React, use:
 * - useAbsences() - Listar faltas
 * - useCreateAbsence() - Criar falta
 * - useUpdateAbsence() - Atualizar falta
 * - useDeleteAbsence() - Deletar falta
 *
 * Gerencia faltas (absences) dos estudantes no Supabase.
 * Substitui attendanceService.ts do Firebase.
 *
 * Tabelas:
 * - student_absences: Registros diários de faltas
 * - absence_summaries: Resumos mensais (agregados)
 * - medical_certificates: Atestados médicos
 */

import { supabase } from '@/lib/supabaseClient';
import type {
  StudentAbsence,
  StudentAbsenceInsert,
  StudentAbsenceUpdate,
} from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';
import type { AbsenceRecord } from '@/types';

export class AbsenceService {
  /**
   * Get all absence records for a specific student
   * @param firebaseStudentId - Firebase UUID (students.student_id, NOT students.id!)
   */
  static async getStudentAbsences(firebaseStudentId: string): Promise<AbsenceRecord[]> {
    try {
      // CRITICAL: student_absences.student_id é FK para students.id (UUID interno)
      // Precisamos fazer JOIN para buscar pelo students.student_id (Firebase UUID)
      const { data, error } = await supabase
        .from('student_absences')
        .select(`
          *,
          students!inner (
            student_id
          )
        `)
        .eq('students.student_id', firebaseStudentId)
        .order('absence_date', { ascending: false });

      if (error) throw error;

      // 🔧 FIX: Retornar no formato esperado pelos componentes legados
      return (data || []).map((absence: any) => ({
        id: absence.id,
        estudanteId: firebaseStudentId,
        data: absence.absence_date,  // ✅ Mapear absence_date → data (para compatibilidade)
        justified: absence.is_justified,  // ✅ Mapear is_justified → justified
        atestadoId: absence.medical_certificate_id || undefined,
        suspensaoId: absence.suspension_id || undefined,
        absenceDate: absence.absence_date,  // ✅ Manter também formato Supabase
      }));
    } catch (error) {
      logger.error('Erro ao buscar faltas do estudante', { firebaseStudentId }, error as Error);
      throw error;
    }
  }

  /**
   * Get absences for multiple students in batched queries (CHUNKED)
   *
   * 🚀 PERFORMANCE OPTIMIZATION:
   * Substitui N queries individuais por M queries em chunks.
   * Exemplo: 677 estudantes = 677 queries → 7 queries (chunks de 100)!
   *
   * ⚠️ URL Limit: .in() clause com 677 UUIDs excede limite de URL (~8KB).
   * Solução: Dividir em chunks de 100 UUIDs por query.
   *
   * @param firebaseStudentIds - Array de Firebase UUIDs
   * @returns Map<estudanteId, AbsenceRecord[]>
   */
  static async getBatchStudentAbsences(
    firebaseStudentIds: string[]
  ): Promise<Map<string, AbsenceRecord[]>> {
    try {
      if (firebaseStudentIds.length === 0) {
        return new Map();
      }

      const CHUNK_SIZE = 100; // Limite seguro para evitar URL muito grande
      const absencesByStudent = new Map<string, AbsenceRecord[]>();

      // Dividir em chunks e processar em paralelo
      const chunks: string[][] = [];
      for (let i = 0; i < firebaseStudentIds.length; i += CHUNK_SIZE) {
        chunks.push(firebaseStudentIds.slice(i, i + CHUNK_SIZE));
      }


      // 🔧 FIX: Supabase .limit() não está funcionando!
      // Nova estratégia: Paginação manual para buscar TODOS os registros
      const results = await Promise.all(
        chunks.map(async (chunk) => {
          const allData: any[] = [];
          let from = 0;
          const pageSize = 1000;
          let hasMore = true;

          // Buscar em páginas até não ter mais dados
          while (hasMore) {
            const { data, error, count } = await supabase
              .from('student_absences')
              .select(`
                *,
                students!inner (
                  student_id
                )
              `, { count: 'exact' })
              .in('students.student_id', chunk)
              .order('absence_date', { ascending: false })
              .range(from, from + pageSize - 1);

            if (error) {
              console.error('❌ Erro no chunk query:', error);
              throw error;
            }

            if (data && data.length > 0) {
              allData.push(...data);
              from += pageSize;

              // Se retornou menos que pageSize, não há mais dados
              hasMore = data.length === pageSize;
            } else {
              hasMore = false;
            }
          }

          return allData;
        })
      );

      const allResults = results.flat();

      // Agrupar todos os resultados
      allResults.forEach((absence: any) => {
        const firebaseId = absence.students?.student_id;

        if (!firebaseId) {
          return;
        }

        if (!absencesByStudent.has(firebaseId)) {
          absencesByStudent.set(firebaseId, []);
        }

        // 🔧 FIX: Retornar campos do Supabase (não converter para formato legado!)
        absencesByStudent.get(firebaseId)!.push({
          estudanteId: firebaseId,
          absence_date: absence.absence_date, // ✅ Campo Supabase
          is_justified: absence.is_justified, // ✅ Campo Supabase
          atestadoId: absence.medical_certificate_id || undefined,
        } as any);
      });

      return absencesByStudent;
    } catch (error) {
      logger.error('Erro ao buscar faltas em lote', { count: firebaseStudentIds.length }, error as Error);
      throw error;
    }
  }

  /**
   * Get absences for multiple students by their IDs
   * @param studentIds - Array of student IDs
   * @param justifiedOnly - Filter only justified (true) or not justified (false), or all (undefined)
   */
  static async getAbsencesByStudentIds(
    studentIds: string[],
    justifiedOnly?: boolean
  ): Promise<Array<{ estudante_id: string; data: string; justified: boolean }>> {
    try {
      let query = supabase
        .from('student_absences')
        .select('*')
        .in('student_id', studentIds);

      // Filtrar por justificada se especificado
      if (justifiedOnly !== undefined) {
        query = query.eq('is_justified', justifiedOnly);
      }

      const { data, error } = await (query.order('absence_date', { ascending: false }) as any);

      if (error) throw error;

      return (data || []).map((absence: any) => ({
        estudante_id: absence.student_id,
        data: absence.absence_date,
        justified: absence.is_justified,
      }));
    } catch (error) {
      logger.error('Erro ao buscar faltas por IDs de estudantes', { studentIds: studentIds.length }, error as Error);
      throw error;
    }
  }

  /**
   * Get absences by date range
   * @param startDate - YYYY-MM-DD format
   * @param endDate - YYYY-MM-DD format
   */
  static async getAbsencesByDateRange(startDate: string, endDate: string): Promise<AbsenceRecord[]> {
    try {
      const { data, error } = await (supabase
        .from('student_absences')
        .select('*')
        .gte('absence_date', startDate)
        .lte('absence_date', endDate)
        .order('absence_date', { ascending: false }) as any);

      if (error) throw error;

      return (data || []).map((absence: any) => ({
        estudanteId: absence.student_id,
        data: absence.absence_date,
        justified: absence.is_justified,
        atestadoId: absence.medical_certificate_id || undefined,
      }));
    } catch (error) {
      logger.error('Erro ao buscar faltas por período', { startDate, endDate }, error as Error);
      throw error;
    }
  }

  /**
   * Get absences by class (turma) and specific date
   * @param turma - Class name (e.g., "5A")
   * @param absenceDate - Date in YYYY-MM-DD format
   */
  static async getByTurmaAndDate(turma: string, absenceDate: string): Promise<AbsenceRecord[]> {
    try {
      // Join com students para filtrar por turma
      const { data, error } = await supabase
        .from('student_absences')
        .select(`
          *,
          students!inner (
            student_id,
            class
          )
        `)
        .eq('students.class', turma)
        .eq('absence_date', absenceDate)
        .order('absence_date', { ascending: false });

      if (error) throw error;

      return (data || []).map((absence: any) => ({
        id: absence.id,
        estudanteId: absence.students?.student_id,
        absence_date: absence.absence_date,
        is_justified: absence.is_justified,
        atestadoId: absence.medical_certificate_id || undefined,
      }));
    } catch (error) {
      logger.error('Erro ao buscar faltas por turma e data', { turma, absenceDate }, error as Error);
      throw error;
    }
  }

  /**
   * Get all absence records (use with caution - pode ser muitos registros!)
   */
  static async getAllAbsences(): Promise<AbsenceRecord[]> {
    try {
      const { data, error } = await (supabase
        .from('student_absences')
        .select('*')
        .order('absence_date', { ascending: false })
        .limit(10000) as any); // Safety limit

      if (error) throw error;

      return (data || []).map((absence: any) => ({
        estudanteId: absence.student_id,
        data: absence.absence_date,
        justified: absence.is_justified,
        atestadoId: absence.medical_certificate_id || undefined,
      }));
    } catch (error) {
      logger.error('Erro ao buscar todas as faltas', {}, error as Error);
      throw error;
    }
  }

  /**
   * Add a single absence record
   * @param record - Absence data
   */
  static async addAbsence(record: Omit<AbsenceRecord, 'id'>): Promise<void> {
    try {
      // 🔧 FIX: Buscar o ID interno do Supabase a partir do student_id do Firebase
      const { data: student, error: studentError } = await (supabase
        .from('students')
        .select('id')
        .eq('student_id', record.estudanteId)
        .single() as any);

      if (studentError || !student) {
        throw new Error(`Estudante não encontrado: ${record.estudanteId}`);
      }

      const absenceInsert: StudentAbsenceInsert = {
        student_id: student.id, // ✅ Usar ID interno do Supabase
        absence_date: record.data || '',
        is_justified: record.justified ?? false,
        medical_certificate_id: record.atestadoId || null,
        suspension_id: record.suspensaoId || null,
        bimester: null, // Será calculado via trigger ou view
      };

      const { error } = await (supabase
        .from('student_absences')
        .insert(absenceInsert as any) as any);

      if (error) throw error;

    } catch (error) {
      logger.error('Erro ao registrar falta', { record }, error as Error);
      throw error;
    }
  }

  /**
   * Add multiple absence records (batch)
   * @param records - Array of absence data
   */
  static async addAbsences(records: Omit<AbsenceRecord, 'id'>[]): Promise<void> {
    try {
      // 🔧 FIX: Buscar IDs internos do Supabase para todos os estudantes
      const firebaseStudentIds = [...new Set(records.map(r => r.estudanteId))];

      const { data: students, error: studentsError } = await (supabase
        .from('students')
        .select('id, student_id')
        .in('student_id', firebaseStudentIds) as any);

      if (studentsError) throw studentsError;

      // Criar mapa de Firebase UUID → Supabase ID
      const idMap = new Map<string, string>();
      (students as any[])?.forEach((s: any) => idMap.set(s.student_id, s.id));

      const absencesInsert: StudentAbsenceInsert[] = records.map(record => {
        const supabaseId = idMap.get(record.estudanteId);
        if (!supabaseId) {
          throw new Error(`Estudante não encontrado: ${record.estudanteId}`);
        }

        return {
          student_id: supabaseId, // ✅ Usar ID interno do Supabase
          absence_date: record.data || '',
          is_justified: record.justified ?? false,
          medical_certificate_id: record.atestadoId || null,
          suspension_id: record.suspensaoId || null,
          bimester: null,
        };
      });

      const { error } = await (supabase
        .from('student_absences')
        .insert(absencesInsert as any) as any);

      if (error) throw error;

    } catch (error) {
      logger.error('Erro ao registrar faltas em lote', { count: records.length }, error as Error);
      throw error;
    }
  }

  /**
   * Delete absence record
   * @param studentId - Student Firebase UUID
   * @param absenceDate - Date in YYYY-MM-DD format
   */
  static async deleteAbsence(studentId: string, absenceDate: string): Promise<void> {
    try {
      // 🔧 FIX: Buscar o ID interno do Supabase a partir do student_id do Firebase
      const { data: student, error: studentError } = await (supabase
        .from('students')
        .select('id')
        .eq('student_id', studentId)
        .single() as any);

      if (studentError || !student) {
        throw new Error(`Estudante não encontrado: ${studentId}`);
      }

      const { error } = await supabase
        .from('student_absences')
        .delete()
        .eq('student_id', (student as any).id) // ✅ Usar ID interno do Supabase
        .eq('absence_date', absenceDate);

      if (error) throw error;

    } catch (error) {
      logger.error('Erro ao deletar falta', { studentId, absenceDate }, error as Error);
      throw error;
    }
  }

  /**
   * Delete absence record by ID (for compatibility with marcar-faltas)
   * @param absenceId - Internal Supabase ID
   */
  static async delete(absenceId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('student_absences')
        .delete()
        .eq('id', absenceId);

      if (error) throw error;

    } catch (error) {
      logger.error('Erro ao deletar falta por ID', { absenceId }, error as Error);
      throw error;
    }
  }

  /**
   * Create absence record (alias for addAbsence for compatibility)
   * @param record - Absence data
   */
  static async create(record: Omit<AbsenceRecord, 'id'>): Promise<void> {
    return this.addAbsence(record);
  }

  /**
   * Find duplicate absences (same student + same date)
   */
  static async findDuplicates(): Promise<Array<{ student_id: string; absence_date: string; count: number }>> {
    try {
      // Query SQL para encontrar duplicatas
      const { data, error } = await supabase.rpc('find_duplicate_absences');

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Erro ao buscar duplicatas de faltas', {}, error as Error);
      throw error;
    }
  }

  /**
   * Remove duplicate absences (keeps only the first one)
   */
  static async removeDuplicates(): Promise<number> {
    try {
      // Query SQL para remover duplicatas
      const { data, error } = await supabase.rpc('remove_duplicate_absences');

      if (error) throw error;

      return data || 0;
    } catch (error) {
      logger.error('Erro ao remover duplicatas de faltas', {}, error as Error);
      throw error;
    }
  }

  /**
   * Calculate attendance percentage
   * @param totalSchoolDays - Total de dias letivos
   * @param absenceCount - Total de faltas
   */
  static calculateAttendancePercentage(totalSchoolDays: number, absenceCount: number): number {
    if (totalSchoolDays === 0) return 0;
    const attendanceDays = totalSchoolDays - absenceCount;
    return Math.max(0, (attendanceDays / totalSchoolDays) * 100);
  }
}

/**
 * Convenience export (compatible with old Firebase service)
 */
export const absenceService = {
  getStudentAbsences: AbsenceService.getStudentAbsences,
  getBatchStudentAbsences: AbsenceService.getBatchStudentAbsences,
  getAbsencesByDateRange: AbsenceService.getAbsencesByDateRange,
  getByTurmaAndDate: AbsenceService.getByTurmaAndDate,
  getAllAbsences: AbsenceService.getAllAbsences,
  addAbsence: AbsenceService.addAbsence,
  addAbsences: AbsenceService.addAbsences,
  create: AbsenceService.create,
  deleteAbsence: AbsenceService.deleteAbsence,
  delete: AbsenceService.delete,
  findDuplicates: AbsenceService.findDuplicates,
  removeDuplicates: AbsenceService.removeDuplicates,
  calculateAttendancePercentage: AbsenceService.calculateAttendancePercentage,
};
