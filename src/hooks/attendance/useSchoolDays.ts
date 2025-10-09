/**
 * Hook for school days calculations
 * Separated from the monolithic useAttendanceData
 */

import { useState, useEffect } from 'react';
import { useBimesterPeriods } from './useBimesterPeriods';
import { attendanceService } from '@/services/firebase/attendanceService';
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
  getSchoolDaysForPeriod: (start: string, end: string) => number;
  getSchoolDaysUpToDate: (targetDate: string) => number;
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

  const calculateSchoolDays = async () => {
    try {
      if (periodsLoading || Object.keys(bimesterDates).length === 0) return;

      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];
      const holidays: string[] = []; // In a real app, this would come from configuration

      let bimester1 = 0;
      let bimester2 = 0;
      let bimester3 = 0;
      let bimester4 = 0;
      let upToToday = 0;

      // Calculate school days for each bimester
      if (bimesterDates[1]) {
        bimester1 = attendanceService.calculateSchoolDays(
          bimesterDates[1].start,
          bimesterDates[1].end,
          holidays
        );
        
        // Count days up to today for bimester 1
        const endDate = new Date(bimesterDates[1].end) <= new Date(today) 
          ? bimesterDates[1].end 
          : today;
        if (new Date(bimesterDates[1].start) <= new Date(today)) {
          upToToday += attendanceService.calculateSchoolDays(
            bimesterDates[1].start,
            endDate,
            holidays
          );
        }
      }

      if (bimesterDates[2]) {
        bimester2 = attendanceService.calculateSchoolDays(
          bimesterDates[2].start,
          bimesterDates[2].end,
          holidays
        );
        
        // Count days up to today for bimester 2
        const endDate = new Date(bimesterDates[2].end) <= new Date(today) 
          ? bimesterDates[2].end 
          : today;
        if (new Date(bimesterDates[2].start) <= new Date(today)) {
          upToToday += attendanceService.calculateSchoolDays(
            bimesterDates[2].start,
            endDate,
            holidays
          );
        }
      }

      if (bimesterDates[3]) {
        bimester3 = attendanceService.calculateSchoolDays(
          bimesterDates[3].start,
          bimesterDates[3].end,
          holidays
        );
        
        // Count days up to today for bimester 3
        const endDate = new Date(bimesterDates[3].end) <= new Date(today) 
          ? bimesterDates[3].end 
          : today;
        if (new Date(bimesterDates[3].start) <= new Date(today)) {
          upToToday += attendanceService.calculateSchoolDays(
            bimesterDates[3].start,
            endDate,
            holidays
          );
        }
      }

      if (bimesterDates[4]) {
        bimester4 = attendanceService.calculateSchoolDays(
          bimesterDates[4].start,
          bimesterDates[4].end,
          holidays
        );
        
        // Count days up to today for bimester 4
        const endDate = new Date(bimesterDates[4].end) <= new Date(today) 
          ? bimesterDates[4].end 
          : today;
        if (new Date(bimesterDates[4].start) <= new Date(today)) {
          upToToday += attendanceService.calculateSchoolDays(
            bimesterDates[4].start,
            endDate,
            holidays
          );
        }
      }

      const total = bimester1 + bimester2 + bimester3 + bimester4;

      setSchoolDays({
        bimester1,
        bimester2,
        bimester3,
        bimester4,
        total,
        upToToday,
      });
    } catch (err) {
      logger.error('Erro ao calcular dias letivos', err as Error);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateSchoolDays();
  }, [bimesterDates, periodsLoading]);

  const getSchoolDaysForPeriod = (startDate: string, endDate: string): number => {
    const holidays: string[] = []; // In a real app, this would come from configuration
    return attendanceService.calculateSchoolDays(startDate, endDate, holidays);
  };

  const getSchoolDaysUpToDate = (targetDate: string): number => {
    let totalDays = 0;
    const target = new Date(targetDate);

    Object.values(bimesterDates).forEach(period => {
      const start = new Date(period.start);
      const end = new Date(period.end);

      if (start <= target) {
        const effectiveEnd = end <= target ? period.end : targetDate;
        totalDays += getSchoolDaysForPeriod(period.start, effectiveEnd);
      }
    });

    return totalDays;
  };

  return {
    schoolDays,
    loading: loading || periodsLoading,
    error,
    refresh: calculateSchoolDays,
    getSchoolDaysForPeriod,
    getSchoolDaysUpToDate,
  };
}