/**
 * Hook for school days calculations
 * MIGRATED: Firebase → Supabase
 * Agora usa academicYearService.ts e functions SQL otimizadas
 */

import { useState, useEffect, useCallback } from 'react';
import { useBimesterPeriods } from './useBimesterPeriods';
import { AcademicYearService } from '@/services/supabase/academicYearService';
import { logger } from '@/utils/logger';

export interface SchoolDaysData {
  bimester1: number;
  bimester2: number;
  bimester3: number;
  bimester4: number;
  total: number;
  upToToday: number;
}

export interface UseSchoolDaysReturn {
  schoolDays: SchoolDaysData;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  getSchoolDaysForPeriod: (start: string, end: string) => Promise<number>;
  getSchoolDaysUpToDate: (targetDate: string) => Promise<number>;
}

export function useSchoolDays(): UseSchoolDaysReturn {
  const { bimesterDates, loading: periodsLoading } = useBimesterPeriods();
  const [schoolDays, setSchoolDays] = useState<SchoolDaysData>({
    bimester1: 0,
    bimester2: 0,
    bimester3: 0,
    bimester4: 0,
    total: 0,
    upToToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const calculateSchoolDays = useCallback(async () => {
    try {
      if (periodsLoading || Object.keys(bimesterDates).length === 0) return;

      setLoading(true);
      setError(null);

      const year = 2025; // TODO: Tornar dinâmico se necessário

      // Buscar contagens por bimestre do Supabase
      const bimesterCounts = await AcademicYearService.getSchoolDaysByBimester(year);

      // Buscar total até hoje usando function SQL
      const upToToday = await AcademicYearService.countSchoolDaysUpToToday(year);

      // Buscar total do ano
      const total = await AcademicYearService.getTotalSchoolDays(year);

      setSchoolDays({
        bimester1: bimesterCounts[1] || 0,
        bimester2: bimesterCounts[2] || 0,
        bimester3: bimesterCounts[3] || 0,
        bimester4: bimesterCounts[4] || 0,
        total,
        upToToday,
      });
    } catch (err) {
      logger.error('Erro ao calcular dias letivos', err as Error);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [bimesterDates, periodsLoading]);

  useEffect(() => {
    calculateSchoolDays();
  }, [calculateSchoolDays]);

  /**
   * Obter dias letivos para um período específico
   * Usa function SQL otimizada do Supabase
   */
  const getSchoolDaysForPeriod = useCallback(async (startDate: string, endDate: string): Promise<number> => {
    try {
      const year = 2025; // TODO: Tornar dinâmico se necessário
      const count = await AcademicYearService.countSchoolDaysInPeriod(startDate, endDate, year);
      return count;
    } catch (err) {
      logger.error(`Erro ao contar dias letivos no período ${startDate} - ${endDate}`, err as Error);
      return 0;
    }
  }, []);

  /**
   * Obter dias letivos até uma data específica
   */
  const getSchoolDaysUpToDate = useCallback(async (targetDate: string): Promise<number> => {
    try {
      const year = 2025; // TODO: Tornar dinâmico se necessário

      // Pegar o primeiro bimestre para obter a data de início do ano
      const bimesters = await AcademicYearService.getBimesters(year);
      if (bimesters.length === 0) return 0;

      const startDate = bimesters[0].start_date;
      const count = await AcademicYearService.countSchoolDaysInPeriod(startDate, targetDate, year);

      return count;
    } catch (err) {
      logger.error(`Erro ao contar dias letivos até ${targetDate}`, err as Error);
      return 0;
    }
  }, []);

  return {
    schoolDays,
    loading: loading || periodsLoading,
    error,
    refresh: calculateSchoolDays,
    getSchoolDaysForPeriod,
    getSchoolDaysUpToDate,
  };
}
