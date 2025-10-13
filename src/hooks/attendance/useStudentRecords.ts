/**
 * Hook for student attendance records
 * Separated from the monolithic useAttendanceData
 */

import { useState, useEffect, useCallback } from 'react';
import { AbsenceService } from '@/services/supabase/absenceService';
import { AcademicYearService } from '@/services/supabase/academicYearService';
import { StudentDataService } from '@/services/studentDataService';
import { logger } from '@/utils/logger';
import { parseDate } from '@/utils/dateUtils';
import type { StudentRecord, Estudante, BimesterDates } from '@/types';

/**
 * Parse de data com fallback para múltiplos formatos
 * Tenta: DD/MM/YYYY, YYYY-MM-DD, ISO, timestamp
 */
function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Tentar formato brasileiro DD/MM/YYYY primeiro
  const brDate = parseDate(dateStr);
  if (brDate) return brDate;

  // Tentar ISO/Firebase YYYY-MM-DD
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      if (year > 1900 && year < 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(year, month - 1, day);
      }
    }
  }

  // Tentar new Date() padrão como último recurso
  const nativeDate = new Date(dateStr);
  if (!isNaN(nativeDate.getTime())) {
    return nativeDate;
  }

  return null;
}

export interface UseStudentRecordsOptions {
  turmaFilter?: string;
  statusFilter?: string; // Default: 'ATIVO' - Para incluir todos, passe '' (string vazia)
  autoRefresh?: boolean;
  excludeJustified?: boolean; // 🆕 Filtro para excluir faltas justificadas (default: true)
}

export function useStudentRecords(options: UseStudentRecordsOptions = {}) {
  const { turmaFilter, statusFilter, autoRefresh = false, excludeJustified = true } = options;

  const [studentRecords, setStudentRecords] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStudentRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all students (V3 only)
      let students = await StudentDataService.getStudents();

      // ✅ FILTRO PADRÃO: Apenas estudantes ATIVOS
      // Se statusFilter for explicitamente passado, usa ele. Caso contrário, filtra por ATIVO.
      const effectiveStatusFilter = statusFilter !== undefined ? statusFilter : 'ATIVO';

      if (effectiveStatusFilter) {
        students = students.filter(s => s.status === effectiveStatusFilter);
      }

      // Apply turma filter
      if (turmaFilter) {
        students = students.filter(s => s.turma === turmaFilter);
      }

      // 🚀 PERFORMANCE OPTIMIZATION: Batch query em vez de N queries individuais
      // Antes: N queries (uma por estudante) → Agora: 1 query única!
      // Exemplo: 677 estudantes = 677 queries → 1 query = 677x mais rápido!
      const studentIds = students.map(s => s.estudanteId);

      const absencesByStudentMap = await AbsenceService.getBatchStudentAbsences(studentIds);

      // Buscar períodos dos bimestres (1 query única)
      const periods: BimesterDates = await AcademicYearService.getBimesterDates(2025);

      // Buscar dias letivos por bimestre (valores reais do Supabase)
      const schoolDaysByBimester = await AcademicYearService.getSchoolDaysByBimester(2025);

      // Processar registros (agora síncronos, sem await dentro do map)
      const records: StudentRecord[] = students.map((student) => {
        const allAbsences = absencesByStudentMap.get(student.estudanteId) || [];

        // 🎯 FILTRO: Aplicar excludeJustified
        // 🔧 FIX: Suporta ambos os campos (Supabase e Firebase legacy)
        const absences = excludeJustified
          ? allAbsences.filter(abs => !(abs.is_justified ?? abs.justified ?? false))
          : allAbsences;

        // 🔧 FIX: Suporta ambos os campos (absence_date Supabase ou data Firebase)
        // Calculate absences by bimester
        const faltasB1 = absences.filter(abs => {
          const date = parseFlexibleDate(abs.absence_date ?? abs.data ?? '');
          const b1 = periods[1];
          if (!date || !b1) return false;
          const startDate = parseFlexibleDate(b1.start);
          const endDate = parseFlexibleDate(b1.end);
          return startDate && endDate && date >= startDate && date <= endDate;
        }).length;

        const faltasB2 = absences.filter(abs => {
          const date = parseFlexibleDate(abs.absence_date ?? abs.data ?? '');
          const b2 = periods[2];
          if (!date || !b2) return false;
          const startDate = parseFlexibleDate(b2.start);
          const endDate = parseFlexibleDate(b2.end);
          return startDate && endDate && date >= startDate && date <= endDate;
        }).length;

        const faltasB3 = absences.filter(abs => {
          const date = parseFlexibleDate(abs.absence_date ?? abs.data ?? '');
          const b3 = periods[3];
          if (!date || !b3) return false;
          const startDate = parseFlexibleDate(b3.start);
          const endDate = parseFlexibleDate(b3.end);
          return startDate && endDate && date >= startDate && date <= endDate;
        }).length;

        const faltasB4 = absences.filter(abs => {
          const date = parseFlexibleDate(abs.absence_date ?? abs.data ?? '');
          const b4 = periods[4];
          if (!date || !b4) return false;
          const startDate = parseFlexibleDate(b4.start);
          const endDate = parseFlexibleDate(b4.end);
          return startDate && endDate && date >= startDate && date <= endDate;
        }).length;

        const totalFaltas = faltasB1 + faltasB2 + faltasB3 + faltasB4;

        // Calculate today's absences
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const faltasAteHoje = absences.filter(abs => {
          const date = parseFlexibleDate(abs.absence_date ?? abs.data ?? ''); // 🔧 FIX: Suporta ambos
          return date && date <= today;
        }).length;

        // 🔧 FIX: Usar dias letivos REAIS do Supabase (buscado dinamicamente!)
        const diasLetivosB1 = schoolDaysByBimester[1] || 0; // 54 dias
        const diasLetivosB2 = schoolDaysByBimester[2] || 0; // 42 dias
        const diasLetivosB3 = schoolDaysByBimester[3] || 0; // 52 dias
        const diasLetivosB4 = schoolDaysByBimester[4] || 0; // 52 dias
        const diasLetivosAnual = diasLetivosB1 + diasLetivosB2 + diasLetivosB3 + diasLetivosB4; // = 200

        // Calculate attendance percentage
        const percentualFaltas = diasLetivosAnual > 0
          ? Math.round((totalFaltas / diasLetivosAnual) * 100)
          : 0;
        const percentualFrequencia = 100 - percentualFaltas;
        const percentualFaltasAteHoje = diasLetivosAnual > 0
          ? Math.round((faltasAteHoje / diasLetivosAnual) * 100)
          : 0;
        const percentualFrequenciaAteHoje = 100 - percentualFaltasAteHoje;

        return {
          estudanteId: student.estudanteId,
          turma: student.turma,
          nome: student.nome,
          faltasB1,
          faltasB2,
          faltasB3,
          faltasB4,
          totalFaltas,
          totalFaltasAteHoje: faltasAteHoje,
          percentualFaltas,
          percentualFaltasAteHoje,
          percentualFrequencia,
          percentualFrequenciaAteHoje,
          diasLetivosAteHoje: diasLetivosAnual, // Simplified
          diasLetivosB1,
          diasLetivosB2,
          diasLetivosB3,
          diasLetivosB4,
          diasLetivosAnual,
        };
      });

      setStudentRecords(records);
    } catch (err) {
      logger.error('Erro ao calcular registros de estudantes', err as Error);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [turmaFilter, statusFilter, excludeJustified]); // 🔧 FIX: Adicionar excludeJustified nas dependências

  useEffect(() => {
    fetchStudentRecords();
  }, [fetchStudentRecords]);

  // Auto refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchStudentRecords, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStudentRecords]);

  return {
    studentRecords,
    loading,
    error,
    refresh: fetchStudentRecords,
  };
}