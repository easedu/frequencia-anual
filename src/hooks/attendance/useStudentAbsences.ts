/**
 * Hook para buscar faltas de um estudante específico
 * Por bimestre, com opção de excluir justificadas
 *
 * ✅ SPRINT 4 - FASE 6: Migrado para API REST
 * - Usa useAbsences da API REST
 * - Campos Supabase nativos (absence_date, is_justified)
 * - Performance otimizada
 */

import { useMemo } from 'react';
import { useAbsences } from '@/hooks/api';
import { useBimesterPeriods } from './useBimesterPeriods';

/**
 * Formato de data flexível (aceita dd/mm/yyyy, yyyy-mm-dd, ISO)
 */
function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Formato brasileiro DD/MM/YYYY
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  // Formato ISO YYYY-MM-DD
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  // Fallback
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Formatar data para exibição (dd/mm/yyyy)
 */
function formatDateBR(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export interface StudentAbsencesByBimester {
  b1: string[];
  b2: string[];
  b3: string[];
  b4: string[];
}

export interface UseStudentAbsencesOptions {
  excludeJustified?: boolean;
}

export interface UseStudentAbsencesReturn {
  absences: StudentAbsencesByBimester;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook para buscar faltas de um estudante específico por bimestre
 *
 * @param estudanteId - ID do estudante (UUID Supabase: students.student_id)
 * @param options - Opções de configuração
 * @param options.excludeJustified - Se true, não inclui faltas justificadas
 * @returns {UseStudentAbsencesReturn} Faltas agrupadas por bimestre
 *
 * @example
 * const { absences, loading, refresh } = useStudentAbsences('uuid-do-estudante', {
 *   excludeJustified: true
 * });
 *
 * console.log(absences.b1); // ["01/02/2025", "05/02/2025"]
 */
export function useStudentAbsences(
  estudanteId: string | null,
  options: UseStudentAbsencesOptions = {}
): UseStudentAbsencesReturn {
  const { excludeJustified = false } = options;

  const { bimesterDates } = useBimesterPeriods();

  // ✅ MIGRADO: Usar hook da API REST
  const {
    absences: absenceRecords,
    loading,
    error: apiError,
    refetch
  } = useAbsences(estudanteId ? { estudanteId } : undefined);

  // Processar faltas: agrupar por bimestre usando useMemo
  const absences = useMemo(() => {
    if (!estudanteId || !absenceRecords.length) {
      return { b1: [], b2: [], b3: [], b4: [] };
    }

    // Filtrar justificadas se necessário
    const filteredAbsences = excludeJustified
      ? absenceRecords.filter(record => !record.is_justified)
      : absenceRecords;

    // Agrupar por bimestre
    const absencesByBimester: StudentAbsencesByBimester = {
      b1: [],
      b2: [],
      b3: [],
      b4: [],
    };

    filteredAbsences.forEach(record => {
      const dateStr = record.absence_date;
      if (!dateStr) return;

      const date = parseFlexibleDate(dateStr);
      if (!date) return;

      // Verificar qual bimestre
      for (let bimNum = 1; bimNum <= 4; bimNum++) {
        const bimester = bimesterDates[bimNum];
        if (!bimester) continue;

        const startDate = parseFlexibleDate(bimester.start);
        const endDate = parseFlexibleDate(bimester.end);

        if (startDate && endDate && date >= startDate && date <= endDate) {
          const formattedDate = formatDateBR(date);

          if (bimNum === 1) absencesByBimester.b1.push(formattedDate);
          else if (bimNum === 2) absencesByBimester.b2.push(formattedDate);
          else if (bimNum === 3) absencesByBimester.b3.push(formattedDate);
          else if (bimNum === 4) absencesByBimester.b4.push(formattedDate);

          break; // Falta pertence apenas a um bimestre
        }
      }
    });

    // Ordenar datas dentro de cada bimestre
    const sortDates = (dates: string[]) =>
      dates.sort((a, b) => {
        const dateA = parseFlexibleDate(a);
        const dateB = parseFlexibleDate(b);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      });

    absencesByBimester.b1 = sortDates(absencesByBimester.b1);
    absencesByBimester.b2 = sortDates(absencesByBimester.b2);
    absencesByBimester.b3 = sortDates(absencesByBimester.b3);
    absencesByBimester.b4 = sortDates(absencesByBimester.b4);

    return absencesByBimester;
  }, [estudanteId, absenceRecords, excludeJustified, bimesterDates]);

  return {
    absences,
    loading,
    error: apiError ? new Error(apiError) : null,
    refresh: refetch,
  };
}
