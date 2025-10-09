/**
 * Hook para buscar faltas de um estudante específico
 * Por bimestre, com opção de excluir justificadas
 */

import { useState, useCallback, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { formatFirebaseDate, getBimesterByDate, parseDate } from '@/utils/attendanceUtils';
import { logger } from '@/utils/logger';
import { useBimesterPeriods } from './useBimesterPeriods';
import type { BimesterDates } from '@/types';

interface AbsenceRecord {
  estudanteId: string;
  turma: string;
  data: string;
  docId: string;
  justified: boolean;
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
 * @param estudanteId - ID do estudante (UUID)
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

  const [absences, setAbsences] = useState<StudentAbsencesByBimester>({
    b1: [],
    b2: [],
    b3: [],
    b4: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { bimesterDates } = useBimesterPeriods();

  const fetchAbsences = useCallback(async () => {
    if (!estudanteId) {
      setAbsences({ b1: [], b2: [], b3: [], b4: [] });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const absenceSnapshot = await getDocs(collection(db, '2025', 'faltas', 'controle'));
      const absenceRecords: AbsenceRecord[] = absenceSnapshot.docs.map(doc => ({
        estudanteId: doc.data().estudanteId,
        turma: doc.data().turma,
        data: formatFirebaseDate(doc.data().data),
        docId: doc.id,
        justified: doc.data().justified ?? false,
      }));

      // Filtrar faltas do estudante
      const studentAbsences = absenceRecords.filter(
        record =>
          record.estudanteId === estudanteId &&
          (!excludeJustified || !record.justified)
      );

      // Agrupar por bimestre
      const absencesByBimester: StudentAbsencesByBimester = {
        b1: [],
        b2: [],
        b3: [],
        b4: [],
      };

      studentAbsences.forEach(record => {
        const bimester = getBimesterByDate(record.data, bimesterDates);

        if (bimester === 1) {
          absencesByBimester.b1.push(record.data);
        } else if (bimester === 2) {
          absencesByBimester.b2.push(record.data);
        } else if (bimester === 3) {
          absencesByBimester.b3.push(record.data);
        } else if (bimester === 4) {
          absencesByBimester.b4.push(record.data);
        }
      });

      // Ordenar datas dentro de cada bimestre
      absencesByBimester.b1.sort(
        (a, b) => (parseDate(a)?.getTime() || 0) - (parseDate(b)?.getTime() || 0)
      );
      absencesByBimester.b2.sort(
        (a, b) => (parseDate(a)?.getTime() || 0) - (parseDate(b)?.getTime() || 0)
      );
      absencesByBimester.b3.sort(
        (a, b) => (parseDate(a)?.getTime() || 0) - (parseDate(b)?.getTime() || 0)
      );
      absencesByBimester.b4.sort(
        (a, b) => (parseDate(a)?.getTime() || 0) - (parseDate(b)?.getTime() || 0)
      );

      setAbsences(absencesByBimester);

      const totalAbsences =
        absencesByBimester.b1.length +
        absencesByBimester.b2.length +
        absencesByBimester.b3.length +
        absencesByBimester.b4.length;

      logger.info(`Faltas do estudante carregadas`, {
        estudanteId,
        totalAbsences,
        b1: absencesByBimester.b1.length,
        b2: absencesByBimester.b2.length,
        b3: absencesByBimester.b3.length,
        b4: absencesByBimester.b4.length,
        excludeJustified,
      });
    } catch (err) {
      const error = err as Error;
      logger.error('Erro ao buscar faltas do estudante', { estudanteId }, error);
      setError(error);
      setAbsences({ b1: [], b2: [], b3: [], b4: [] });
    } finally {
      setLoading(false);
    }
  }, [estudanteId, excludeJustified, bimesterDates]);

  // Buscar faltas quando estudanteId mudar
  useEffect(() => {
    fetchAbsences();
  }, [fetchAbsences]);

  return {
    absences,
    loading,
    error,
    refresh: fetchAbsences,
  };
}
