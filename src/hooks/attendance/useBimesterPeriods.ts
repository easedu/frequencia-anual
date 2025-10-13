/**
 * Hook for academic bimester periods
 * MIGRATED: Firebase → Supabase
 * Agora usa academicYearService.ts para buscar dados relacionais
 */

import { useState, useEffect, useCallback } from 'react';
import { AcademicYearService } from '@/services/supabase/academicYearService';
import { logger } from '@/utils/logger';
import type { BimesterDates } from '@/types';

export interface UseBimesterPeriodsReturn {
  bimesterDates: BimesterDates;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  getBimesterByDate: (dateString: string) => number;
  getCurrentBimester: () => number;
  getBimesterRange: (bimester: number) => { start: string; end: string } | null;
  getAllBimesterRanges: () => BimesterDates;
}

export function useBimesterPeriods(): UseBimesterPeriodsReturn {
  const [bimesterDates, setBimesterDates] = useState<BimesterDates>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBimesterDates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar bimestres do ano atual (2025)
      const year = 2025; // TODO: Tornar dinâmico se necessário
      const dates = await AcademicYearService.getBimesterDates(year);

      setBimesterDates(dates);
    } catch (err) {
      const error = err as Error;
      logger.error('Erro ao buscar períodos dos bimestres', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBimesterDates();
  }, [fetchBimesterDates]);

  // useCallback previne recriação dessas funções quando bimesterDates não muda
  const getBimesterByDate = useCallback((dateString: string): number => {
    const date = new Date(dateString);

    for (const [bimester, period] of Object.entries(bimesterDates)) {
      const start = new Date(period.start);
      const end = new Date(period.end);

      if (date >= start && date <= end) {
        return parseInt(bimester);
      }
    }

    return 0; // Date doesn't fall in any bimester
  }, [bimesterDates]);

  const getCurrentBimester = useCallback((): number => {
    const today = new Date().toISOString().split('T')[0];
    return getBimesterByDate(today);
  }, [getBimesterByDate]);

  const getBimesterRange = useCallback((bimester: number): { start: string; end: string } | null => {
    return bimesterDates[bimester] || null;
  }, [bimesterDates]);

  const getAllBimesterRanges = useCallback((): BimesterDates => {
    return bimesterDates;
  }, [bimesterDates]);

  return {
    bimesterDates,
    loading,
    error,
    refresh: fetchBimesterDates,
    getBimesterByDate,
    getCurrentBimester,
    getBimesterRange,
    getAllBimesterRanges,
  };
}
