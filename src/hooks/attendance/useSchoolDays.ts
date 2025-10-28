/**
 * Hook for school days calculations
 * ✅ SPRINT 4 - FASE 6: Migrado para API REST
 * Agora usa useAcademicYearComplete e fetch direto para cálculos
 */

import { useState, useEffect, useCallback } from 'react';
import { useBimesterPeriods } from './useBimesterPeriods';
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

      // ✅ MIGRADO: Buscar ano letivo completo via API REST
      // IMPORTANTE: API /complete NÃO requer autenticação (dados públicos)
      const response = await fetch(`/api/academic-years/complete?year=${year}`);

      if (!response.ok) {
        logger.error(`❌ Erro HTTP ao buscar ano letivo: ${response.status}`);
        throw new Error(`Erro ao buscar ano letivo: ${response.status}`);
      }

      const result = await response.json();
      const data = result.data || result; // API pode retornar {success, data} ou direto o objeto

      // Verificar se retornou dados válidos
      if (!data || Object.keys(data).length === 0) {
        logger.warn('❌ Ano letivo não configurado ou vazio', { year });
        // Retornar zeros mas não dar erro
        setSchoolDays({
          bimester1: 0,
          bimester2: 0,
          bimester3: 0,
          bimester4: 0,
          total: 0,
          upToToday: 0,
        });
        setLoading(false);
        return;
      }

      // Contar dias letivos por bimestre
      const bimesterCounts: Record<number, number> = {};
      let total = 0;

      ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'].forEach((key, index) => {
        const bimester = data[key as '1º Bimestre' | '2º Bimestre' | '3º Bimestre' | '4º Bimestre'];
        if (bimester?.dates) {
          const count = bimester.dates.filter((d: { date: string; isChecked: boolean }) => d.isChecked).length;
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
        const [day, month, yearStr] = firstBimester.startDate.split('/');
        const startDate = `${yearStr}-${month}-${day}`;

        // API /count-school-days também NÃO requer autenticação
        const countResponse = await fetch(
          `/api/academic-years/count-school-days?start_date=${startDate}&end_date=${today}&year=${year}`
        );

        if (countResponse.ok) {
          const countResult = await countResponse.json();
          upToToday = countResult.count || countResult.data?.count || 0;
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
      logger.error('Erro ao calcular dias letivos', { year: process.env.NEXT_PUBLIC_SCHOOL_YEAR }, err as Error);
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

      // ✅ MIGRADO: Usar API REST (sem autenticação)
      const response = await fetch(
        `/api/academic-years/count-school-days?start_date=${startDate}&end_date=${endDate}&year=${year}`
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const result = await response.json();
      return result.count || result.data?.count || 0;
    } catch (err) {
      logger.error(`Erro ao contar dias letivos no período ${startDate} - ${endDate}`, {
        startDate,
        endDate,
        year: process.env.NEXT_PUBLIC_SCHOOL_YEAR
      }, err as Error);
      return 0;
    }
  }, []);

  /**
   * Obter dias letivos até uma data específica
   * ✅ MIGRADO: Usa API REST (sem autenticação - dados públicos)
   */
  const getSchoolDaysUpToDate = useCallback(async (targetDate: string): Promise<number> => {
    try {
      const year = parseInt(process.env.NEXT_PUBLIC_SCHOOL_YEAR || '2025');

      // ✅ MIGRADO: Buscar primeiro bimestre via API (sem autenticação)
      const response = await fetch(`/api/academic-years/complete?year=${year}`);

      if (!response.ok) {
        logger.error(`❌ Erro HTTP ao buscar ano letivo: ${response.status}`);
        throw new Error(`Erro ao buscar ano letivo: ${response.status}`);
      }

      const result = await response.json();
      const data = result.data || result; // API pode retornar {success, data} ou direto o objeto
      const firstBimester = data['1º Bimestre'];

      if (!firstBimester?.startDate) {
        logger.error('Primeiro bimestre não encontrado ou sem startDate');
        return 0;
      }

      // Converter DD/MM/YYYY para YYYY-MM-DD
      const [day, month, yearStr] = firstBimester.startDate.split('/');
      const startDate = `${yearStr}-${month}-${day}`;

      // ✅ MIGRADO: Contar dias usando API REST (sem autenticação)
      const countResponse = await fetch(
        `/api/academic-years/count-school-days?start_date=${startDate}&end_date=${targetDate}&year=${year}`
      );

      if (!countResponse.ok) {
        logger.error(`❌ Erro na API count: ${countResponse.status}`);
        throw new Error(`Erro na API count: ${countResponse.status}`);
      }

      const countResult = await countResponse.json();
      return countResult.count || countResult.data?.count || 0;
    } catch (err) {
      logger.error(`Erro ao contar dias letivos até ${targetDate}`, {
        targetDate,
        year: process.env.NEXT_PUBLIC_SCHOOL_YEAR
      }, err as Error);
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
