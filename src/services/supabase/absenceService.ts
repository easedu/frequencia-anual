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

import { supabase } from '@/lib/supabaseClient'; // ⚠️ Usado apenas em métodos legados (não refatorados)
import type {
  _StudentAbsence,
  StudentAbsenceInsert,
  _StudentAbsenceUpdate,
} from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';
import type { AbsenceRecord } from '@/types';
import { getAuthHeaders } from '@/utils/authToken';

export class AbsenceService {
  /**
   * Get all absence records for a specific student
   * @param firebaseStudentId - Firebase UUID (students.student_id, NOT students.id!)
   */
  static async getStudentAbsences(firebaseStudentId: string): Promise<AbsenceRecord[]> {
    try {
      // ✅ Usar API REST ao invés de Supabase direto
      const headers = await getAuthHeaders();

      // 🔧 FIX: AbortController com timeout para redes 2G/3G
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`/api/absences?estudanteId=${firebaseStudentId}`, {
        headers,
        signal: controller.signal,
        keepalive: true,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Verificar se houve erro (API retorna { success: false } em erro)
      // Sucesso retorna { data: [...], pagination: {...} }
      if (result.success === false) {
        throw new Error(result.message || 'Erro ao buscar faltas');
      }

      interface ApiAbsence {
        id: string;
        estudanteId: string;
        data: string;
        justificada: boolean;
        atestadoId?: string;
      }

      // Converter do formato API para formato legado
      return (result.data || []).map((absence: ApiAbsence) => ({
        id: absence.id,
        estudanteId: absence.estudanteId,
        data: absence.data,
        justified: absence.justificada,
        atestadoId: absence.atestadoId,
        suspensaoId: undefined,
        absenceDate: absence.data,
      }));
    } catch (err) {
      logger.error('Erro ao buscar faltas do estudante', { firebaseStudentId }, err as Error);
      throw err;
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

      interface StudentAbsenceWithStudent {
        absence_date: string;
        is_justified: boolean;
        medical_certificate_id: string | null;
        students: {
          student_id: string;
        };
      }

      const results = await Promise.all(
        chunks.map(async (chunk) => {
          const allData: StudentAbsenceWithStudent[] = [];
          let from = 0;
          const pageSize = 1000;
          let hasMore = true;

          // Buscar em páginas até não ter mais dados
          while (hasMore) {
            const { data, error } = await supabase
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
              allData.push(...(data as StudentAbsenceWithStudent[]));
              from += pageSize;

              // Se retornou menos que pageSize, não há mais dados
              hasMore = data.length === pageSize;
            } else {
              hasMore = false;
            }
          }

          return allData as StudentAbsenceWithStudent[];
        })
      );

      const allResults = results.flat();

      // Agrupar todos os resultados
      allResults.forEach((absence: StudentAbsenceWithStudent) => {
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
          absence_date: absence.absence_date,
          is_justified: absence.is_justified,
          atestadoId: absence.medical_certificate_id || undefined,
        } as AbsenceRecord);
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

      interface AbsenceData {
        student_id: string;
        absence_date: string;
        is_justified: boolean;
      }

      const { data, error } = await query.order('absence_date', { ascending: false });

      if (error) throw error;

      return (data || []).map((absence: AbsenceData) => ({
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
      interface AbsenceDateRangeData {
        student_id: string;
        absence_date: string;
        is_justified: boolean;
        medical_certificate_id: string | null;
      }

      const { data, error } = await supabase
        .from('student_absences')
        .select('*')
        .gte('absence_date', startDate)
        .lte('absence_date', endDate)
        .order('absence_date', { ascending: false });

      if (error) throw error;

      return (data || []).map((absence: AbsenceDateRangeData) => ({
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
      // ✅ Usar API REST ao invés de Supabase direto
      const headers = await getAuthHeaders();

      // 🔧 FIX: AbortController com timeout para redes 2G/3G
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      // Converter data de YYYY-MM-DD para DDMMYYYY (formato esperado pela API)
      let dataFormatada = absenceDate;
      if (absenceDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = absenceDate.split('-');
        dataFormatada = `${day}${month}${year}`;
      }

      // API aceita dataInicio/dataFim, não "data"
      // Para buscar uma data específica, passar a mesma data em ambos
      const response = await fetch(
        `/api/absences?turma=${encodeURIComponent(turma)}&dataInicio=${dataFormatada}&dataFim=${dataFormatada}&limit=1000`,
        {
          headers,
          signal: controller.signal,
          keepalive: true,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // API retorna { data: [...], pagination: {...} }
      if (!result.data || !Array.isArray(result.data)) {
        throw new Error('Resposta inválida da API');
      }

      interface ApiAbsenceResponse {
        id: string;
        estudanteId: string;
        data: string;
        justificada: boolean;
        atestadoId?: string;
      }

      // Converter formato API para formato esperado
      return result.data.map((absence: ApiAbsenceResponse) => ({
        id: absence.id,
        estudanteId: absence.estudanteId,
        data: absence.data, // DDMMYYYY
        absence_date: absenceDate, // YYYY-MM-DD (mantém formato original)
        is_justified: absence.justificada,
        atestadoId: absence.atestadoId || undefined,
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
      interface AllAbsencesData {
        student_id: string;
        absence_date: string;
        is_justified: boolean;
        medical_certificate_id: string | null;
      }

      const { data, error } = await supabase
        .from('student_absences')
        .select('*')
        .order('absence_date', { ascending: false })
        .limit(10000); // Safety limit

      if (error) throw error;

      return (data || []).map((absence: AllAbsencesData) => ({
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
      // ✅ Usar API REST ao invés de Supabase direto
      const headers = await getAuthHeaders();

      // ✅ Converter data de YYYY-MM-DD para DDMMYYYY se necessário
      let dataFormatada = record.data || '';
      if (dataFormatada.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Format: YYYY-MM-DD → DDMMYYYY
        const [year, month, day] = dataFormatada.split('-');
        dataFormatada = `${day}${month}${year}`;
      }

      // 🔧 FIX: AbortController com timeout generoso para redes 2G/3G
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s

      try {
        const response = await fetch('/api/absences', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            estudanteId: record.estudanteId, // Firebase UUID (a API resolve internamente)
            data: dataFormatada,
            justificada: record.justified ?? false,
            atestadoId: record.atestadoId || null,
            bimestre: null, // Será calculado pela API
          }),
          signal: controller.signal, // ✅ Adicionar signal do AbortController
          keepalive: true, // ✅ Manter conexão em redes instáveis
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `API returned ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Erro ao criar falta');
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);

        // Verificar se foi timeout (AbortError)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Timeout ao salvar falta (rede muito lenta). Tente novamente.');
        }

        throw fetchError;
      }

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
      interface StudentIdMapping {
        id: string;
        student_id: string;
      }

      // 🔧 FIX: Buscar IDs internos do Supabase para todos os estudantes
      const firebaseStudentIds = [...new Set(records.map(r => r.estudanteId))];

      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, student_id')
        .in('student_id', firebaseStudentIds);

      if (studentsError) throw studentsError;

      // Criar mapa de Firebase UUID → Supabase ID
      const idMap = new Map<string, string>();
      (students as StudentIdMapping[])?.forEach((s: StudentIdMapping) => idMap.set(s.student_id, s.id));

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

      interface InsertAbsencesResult {
        error: Error | null;
      }

      // Type assertion for Supabase insert operation
      type SupabaseInsertOperation = {
        from: (table: string) => {
          insert: (data: StudentAbsenceInsert[]) => Promise<InsertAbsencesResult>;
        };
      };

      const { error } = await ((supabase as unknown as SupabaseInsertOperation)
        .from('student_absences')
        .insert(absencesInsert));

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
      // ✅ Usar API REST ao invés de Supabase direto

      // 1. Primeiro, buscar o ID da falta (GET /api/absences?estudanteId=X)
      const headers = await getAuthHeaders();

      // 🔧 FIX: AbortController com timeout para redes 2G/3G
      const searchController = new AbortController();
      const searchTimeoutId = setTimeout(() => searchController.abort(), 60000);

      // Buscar máximo de faltas permitido pelo schema (limit=100)
      const searchResponse = await fetch(`/api/absences?estudanteId=${studentId}&limit=250`, {
        headers,
        signal: searchController.signal,
        keepalive: true,
      });

      clearTimeout(searchTimeoutId);

      if (!searchResponse.ok) {
        throw new Error(`API returned ${searchResponse.status}: ${searchResponse.statusText}`);
      }

      const searchResult = await searchResponse.json();

      // ✅ Resposta paginada não tem campo success, verificar se data existe
      if (!searchResult.data || !Array.isArray(searchResult.data)) {
        throw new Error('Erro ao buscar faltas');
      }

      interface SearchAbsenceData {
        id: string;
        data: string;
      }

      // 2. Encontrar a falta com a data específica
      const absences = searchResult.data || [];
      const targetAbsence = (absences as SearchAbsenceData[]).find((a: SearchAbsenceData) => a.data === absenceDate);

      if (!targetAbsence) {
        logger.warn('Falta não encontrada para deletar', { studentId, absenceDate });
        return; // Não existe, nada a fazer
      }

      // 3. Deletar usando o ID da falta (DELETE /api/absences/[id])
      const deleteController = new AbortController();
      const deleteTimeoutId = setTimeout(() => deleteController.abort(), 60000);

      const deleteResponse = await fetch(`/api/absences/${targetAbsence.id}`, {
        method: 'DELETE',
        headers,
        signal: deleteController.signal,
        keepalive: true,
      });

      clearTimeout(deleteTimeoutId);

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        throw new Error(errorData.message || `API returned ${deleteResponse.status}`);
      }

      const deleteResult = await deleteResponse.json();

      if (!deleteResult.success) {
        throw new Error(deleteResult.message || 'Erro ao deletar falta');
      }

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
   * ✅ REFATORADO: Usa API REST ao invés de Supabase direto
   */
  static async findDuplicates(): Promise<Array<{ student_id: string; absence_date: string; count: number }>> {
    try {
      // ✅ Usar API REST
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch('/api/absences/duplicates', {
        signal: controller.signal,
        keepalive: true,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Erro ao buscar duplicatas');
      }

      return result.data?.duplicates || [];
    } catch (error) {
      logger.error('Erro ao buscar duplicatas de faltas', {}, error as Error);
      throw error;
    }
  }

  /**
   * Remove duplicate absences (keeps only the first one)
   * ✅ REFATORADO: Usa API REST ao invés de Supabase direto
   */
  static async removeDuplicates(): Promise<number> {
    try {
      // ✅ Usar API REST
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch('/api/absences/duplicates', {
        method: 'DELETE',
        signal: controller.signal,
        keepalive: true,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Erro ao remover duplicatas');
      }

      return result.data?.deleted_count || 0;
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
