/**
 * Hook para detectar e remover faltas duplicadas
 * Funcionalidade específica para controle de qualidade de dados
 */

import { useState, useCallback, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { formatFirebaseDate } from '@/utils/attendanceUtils';
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

      const absenceSnapshot = await getDocs(collection(db, '2025', 'faltas', 'controle'));
      const absenceRecords: AbsenceRecord[] = absenceSnapshot.docs.map(doc => ({
        estudanteId: doc.data().estudanteId,
        turma: doc.data().turma,
        data: formatFirebaseDate(doc.data().data),
        docId: doc.id,
        justified: doc.data().justified ?? false,
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

      if (duplicatesFound.length > 0) {
        logger.warn(`Encontradas ${duplicatesFound.length} faltas duplicadas`, {
          count: duplicatesFound.length,
        });
      } else {
        logger.info('Nenhuma falta duplicada encontrada');
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

      const absenceSnapshot = await getDocs(collection(db, '2025', 'faltas', 'controle'));
      const absenceRecords: AbsenceRecord[] = absenceSnapshot.docs.map(doc => ({
        estudanteId: doc.data().estudanteId,
        turma: doc.data().turma,
        data: formatFirebaseDate(doc.data().data),
        docId: doc.id,
        justified: doc.data().justified ?? false,
      }));

      // Agrupar por chave única
      const seen: Record<string, AbsenceRecord[]> = {};
      absenceRecords.forEach(record => {
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
        logger.info('Nenhuma duplicata para remover');
        await fetchDuplicates(); // Atualiza lista
        return;
      }

      // Deletar duplicatas
      const deletePromises = duplicatesToRemove.map(record =>
        deleteDoc(doc(db, '2025', 'faltas', 'controle', record.docId))
      );
      await Promise.all(deletePromises);

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
  }, [fetchDuplicates]);

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
