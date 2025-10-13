/**
 * Hook para detectar e remover faltas duplicadas
 * Funcionalidade específica para controle de qualidade de dados
 *
 * ✅ MIGRADO PARA SUPABASE
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';

interface AbsenceRecord {
  estudanteId: string;
  turma: string;
  data: string;
  docId: string;
  justified: boolean;
}

export interface UseDuplicateAbsencesReturn {
  duplicates: AbsenceRecord[];
  loading: boolean;
  error: Error | null;
  fetchDuplicates: () => Promise<void>;
  removeDuplicates: () => Promise<void>;
}

/**
 * Hook para gerenciar faltas duplicadas
 *
 * @returns {UseDuplicateAbsencesReturn} Duplicatas encontradas e funções para gerenciá-las
 *
 * @example
 * const { duplicates, loading, removeDuplicates } = useDuplicateAbsences();
 *
 * if (duplicates.length > 0) {
 *   await removeDuplicates();
 * }
 */
export function useDuplicateAbsences(): UseDuplicateAbsencesReturn {
  const [duplicates, setDuplicates] = useState<AbsenceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDuplicates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ SUPABASE: Buscar todas absences com JOIN para pegar student data
      const { data: absences, error: fetchError } = await supabase
        .from('student_absences')
        .select(`
          id,
          absence_date,
          is_justified,
          students!inner (
            student_id,
            class
          )
        `)
        .order('absence_date', { ascending: false });

      if (fetchError) throw fetchError;

      const absenceRecords: AbsenceRecord[] = (absences || []).map((absence: any) => ({
        estudanteId: absence.students.student_id,
        turma: absence.students.class,
        data: absence.absence_date,
        docId: absence.id,
        justified: absence.is_justified,
      }));

      // Agrupar por chave única (estudanteId-data)
      const seen: Record<string, AbsenceRecord[]> = {};
      absenceRecords.forEach(record => {
        const key = `${record.estudanteId}-${record.data}`;
        if (!seen[key]) {
          seen[key] = [];
        }
        seen[key].push(record);
      });

      // Extrair apenas os grupos com duplicatas
      const duplicatesFound = Object.values(seen)
        .filter(group => group.length > 1)
        .flat();

      setDuplicates(duplicatesFound);

      // Apenas log de warning se houver duplicatas (não info sempre)
      if (duplicatesFound.length > 0) {
        logger.warn(`Encontradas ${duplicatesFound.length} faltas duplicadas`, {
          count: duplicatesFound.length,
        });
      }
    } catch (err) {
      const error = err as Error;
      logger.error('Erro ao buscar duplicatas de faltas', error);
      setError(error);
      setDuplicates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeDuplicates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (duplicates.length === 0) {
        await fetchDuplicates(); // Atualiza lista
        return;
      }

      // Agrupar duplicatas por chave única
      const seen: Record<string, AbsenceRecord[]> = {};
      duplicates.forEach(record => {
        const key = `${record.estudanteId}-${record.data}`;
        if (!seen[key]) {
          seen[key] = [];
        }
        seen[key].push(record);
      });

      // Pegar apenas os registros duplicados (mantém o primeiro, remove os demais)
      const duplicatesToRemove = Object.values(seen)
        .filter(group => group.length > 1)
        .flatMap(group => group.slice(1)); // Remove do 2º em diante

      if (duplicatesToRemove.length === 0) {
        await fetchDuplicates();
        return;
      }

      // ✅ SUPABASE: Deletar duplicatas em batch
      const idsToDelete = duplicatesToRemove.map(record => record.docId);
      const { error: deleteError } = await supabase
        .from('student_absences')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) throw deleteError;

      logger.info(`Removidos ${duplicatesToRemove.length} registros duplicados`, {
        count: duplicatesToRemove.length,
      });

      // Atualizar lista de duplicatas
      await fetchDuplicates();
    } catch (err) {
      const error = err as Error;
      logger.error('Erro ao remover duplicatas de faltas', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [duplicates, fetchDuplicates]);

  // Buscar duplicatas ao montar o componente
  useEffect(() => {
    fetchDuplicates();
  }, [fetchDuplicates]);

  return {
    duplicates,
    loading,
    error,
    fetchDuplicates,
    removeDuplicates,
  };
}
