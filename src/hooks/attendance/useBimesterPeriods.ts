/**
 * Hook for academic bimester periods
 * Separated from the monolithic useAttendanceData
 */

import { useState, useEffect, useCallback } from 'react';
import { useFirebaseDoc } from '@/hooks/useFirebaseDoc';
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
  const { data: anoLetivoData, loading, error, refresh } = useFirebaseDoc('2025/ano_letivo');
  const [bimesterDates, setBimesterDates] = useState<BimesterDates>({});

  useEffect(() => {
    if (!anoLetivoData) return;

    try {
      const periods: BimesterDates = {};

      // Process each bimester
      Object.keys(anoLetivoData).forEach((key, index) => {
        if (key.includes('Bimestre')) {
          const bimesterData = anoLetivoData[key];
          if (bimesterData && bimesterData.startDate && bimesterData.endDate) {
            periods[index + 1] = {
              start: bimesterData.startDate,
              end: bimesterData.endDate,
            };
          }
        }
      });

      setBimesterDates(periods);
    } catch (err) {
      logger.error('Erro ao processar dados dos bimestres', err as Error);
    }
  }, [anoLetivoData]);

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
    refresh,
    getBimesterByDate,
    getCurrentBimester,
    getBimesterRange,
    getAllBimesterRanges,
  };
}