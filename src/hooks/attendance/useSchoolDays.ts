/**
 * Hook for school days calculations
 * ✅ SPRINT 4 - FASE 6: Migrado para API REST
 * Agora usa useAcademicYearComplete e fetch direto para cálculos
 */

import { useState, useEffect, useCallback } from 'react';
import { useBimesterPeriods } from './useBimesterPeriods';
import { useAcademicYearComplete } from '@/hooks/api';
import { getAuth } from 'firebase/auth';
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

      const year = parseInt(process.env.NEXT_PUBLIC_SCHOOL_YEAR || '2025');
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const token = await user.getIdToken();

      // ✅ MIGRADO: Buscar ano letivo completo via API REST
      const response = await fetch(`/api/academic-years/complete?year=${year}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar ano letivo: ${response.status}`);
      }

      const data = await response.json();

      // Contar dias letivos por bimestre
      const bimesterCounts: Record<number, number> = {};
      let total = 0;

      ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'].forEach((key, index) => {
        const bimester = data[key];
        if (bimester?.dates) {
          const count = bimester.dates.filter((d: any) => d.isChecked).length;
          bimesterCounts[index + 1] = count;
          total += count;
        } else {
          bimesterCounts[index + 1] = 0;
        }
      });

      // ✅ MIGRADO: Contar dias letivos até hoje usando API
      const today = new Date().toISOString().split('T')[0];
      const firstBimester = data['1º Bimestre'];

      let upToToday = 0;
      if (firstBimester?.startDate) {
        // Converter DD/MM/YYYY para YYYY-MM-DD
        const [day, month, year] = firstBimester.startDate.split('/');
        const startDate = `${year}-${month}-${day}`;

        const countResponse = await fetch(
          `/api/academic-years/count-school-days?start_date=${startDate}&end_date=${today}&year=${year}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (countResponse.ok) {
          const countData = await countResponse.json();
          upToToday = countData.count || 0;
        }
      }

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
   * ✅ MIGRADO: Usa API REST com function SQL otimizada do Supabase
   */
  const getSchoolDaysForPeriod = useCallback(async (startDate: string, endDate: string): Promise<number> => {
    try {
      const year = parseInt(process.env.NEXT_PUBLIC_SCHOOL_YEAR || '2025');
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        logger.error('Usuário não autenticado ao contar dias letivos no período');
        return 0;
      }

      const token = await user.getIdToken();

      // ✅ MIGRADO: Usar API REST
      const response = await fetch(
        `/api/academic-years/count-school-days?start_date=${startDate}&end_date=${endDate}&year=${year}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const data = await response.json();
      return data.count || 0;
    } catch (err) {
      logger.error(`Erro ao contar dias letivos no período ${startDate} - ${endDate}`, err as Error);
      return 0;
    }
  }, []);

  /**
   * Obter dias letivos até uma data específica
   * ✅ MIGRADO: Usa API REST
   */
  const getSchoolDaysUpToDate = useCallback(async (targetDate: string): Promise<number> => {
    try {
      const year = parseInt(process.env.NEXT_PUBLIC_SCHOOL_YEAR || '2025');
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        logger.error('Usuário não autenticado ao contar dias letivos até data');
        return 0;
      }

      const token = await user.getIdToken();

      // ✅ MIGRADO: Buscar primeiro bimestre via API
      const response = await fetch(`/api/academic-years/complete?year=${year}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar ano letivo: ${response.status}`);
      }

      const data = await response.json();
      const firstBimester = data['1º Bimestre'];

      if (!firstBimester?.startDate) {
        logger.error('Primeiro bimestre não encontrado ou sem startDate');
        return 0;
      }

      // Converter DD/MM/YYYY para YYYY-MM-DD
      const [day, month, yearStr] = firstBimester.startDate.split('/');
      const startDate = `${yearStr}-${month}-${day}`;

      // ✅ MIGRADO: Contar dias usando API REST
      const countResponse = await fetch(
        `/api/academic-years/count-school-days?start_date=${startDate}&end_date=${targetDate}&year=${year}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!countResponse.ok) {
        throw new Error(`Erro na API count: ${countResponse.status}`);
      }

      const countData = await countResponse.json();
      return countData.count || 0;
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
