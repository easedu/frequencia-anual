/**
 * Hook for academic bimester periods
 * ✅ SPRINT 4 - FASE 6: Migrado para API REST
 * Agora usa useAcademicYearComplete da API REST
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAcademicYearComplete } from '@/hooks/api';
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
  const year = parseInt(process.env.NEXT_PUBLIC_SCHOOL_YEAR || '2025');

  // ✅ SPRINT 4 - FASE 6: Usar hook da API REST
  const { academicYearComplete, loading: apiLoading, error: apiError, refetch } = useAcademicYearComplete(year);

  // Transformar dados da API para formato BimesterDates
  const bimesterDates = useMemo((): BimesterDates => {
    if (!academicYearComplete) return {};

    const dates: BimesterDates = {};
    const bimesterKeys = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

    bimesterKeys.forEach((key, index) => {
      const bimester = (academicYearComplete as any)[key];
      if (bimester?.startDate && bimester?.endDate) {
        dates[index + 1] = {
          start: bimester.startDate,
          end: bimester.endDate,
        };
      }
    });

    return dates;
  }, [academicYearComplete]);

  const loading = apiLoading;
  const error = apiError ? new Error(apiError) : null;
  const fetchBimesterDates = useCallback(async () => {
    refetch();
  }, [refetch]);

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
