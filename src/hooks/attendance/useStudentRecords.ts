/**
 * Hook for student attendance records
 * ✅ SPRINT 4 - FASE 6: Migrado para API REST
 * Agora usa hooks da API em vez de services diretos
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStudents, useAbsences } from '@/hooks/api';
import { useBimesterPeriods } from './useBimesterPeriods';
import { useSchoolDays } from './useSchoolDays';
import { logger } from '@/utils/logger';
import { parseDate } from '@/utils/dateUtils';
import type { StudentRecord, BimesterDates } from '@/types';

/**
 * Parse de data com fallback para múltiplos formatos
 * Tenta: DD/MM/YYYY, YYYY-MM-DD, ISO, timestamp
 */
function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Tentar formato brasileiro DD/MM/YYYY primeiro
  const brDate = parseDate(dateStr);
  if (brDate) return brDate;

  // Tentar ISO/Firebase YYYY-MM-DD
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      if (year > 1900 && year < 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(year, month - 1, day);
      }
    }
  }

  // Tentar new Date() padrão como último recurso
  const nativeDate = new Date(dateStr);
  if (!isNaN(nativeDate.getTime())) {
    return nativeDate;
  }

  return null;
}

export interface UseStudentRecordsOptions {
  turmaFilter?: string;
  statusFilter?: string; // Default: 'ATIVO' - Para incluir todos, passe '' (string vazia)
  autoRefresh?: boolean;
  excludeJustified?: boolean; // 🆕 Filtro para excluir faltas justificadas (default: true)
}

export function useStudentRecords(options: UseStudentRecordsOptions = {}) {
  const { turmaFilter, statusFilter, autoRefresh = false, excludeJustified = true } = options;

  // ✅ MIGRADO: Usar hooks da API REST
  const effectiveStatusFilter = statusFilter !== undefined ? statusFilter : 'ATIVO';

  const { students: allStudents, loading: studentsLoading } = useStudents({
    status: effectiveStatusFilter as 'ATIVO' | 'INATIVO' | 'TRANSFERIDO' | undefined,
  });

  const { absences: allAbsences, loading: absencesLoading } = useAbsences();

  const { bimesterDates, loading: periodsLoading } = useBimesterPeriods();

  const { schoolDays, loading: schoolDaysLoading } = useSchoolDays();

  const loading = studentsLoading || absencesLoading || periodsLoading || schoolDaysLoading;

  // Filtrar estudantes por turma (se especificado)
  const filteredStudents = useMemo(() => {
    if (!turmaFilter) return allStudents;
    // API usa 'class', interface antiga usa 'turma'
    return allStudents.filter(s => s.class === turmaFilter);
  }, [allStudents, turmaFilter]);

  // Processar registros de estudantes com faltas
  const studentRecords = useMemo(() => {
    if (loading || !filteredStudents.length) return [];

    // Criar mapa de faltas por estudante (otimização)
    const absencesByStudentMap = new Map<string, typeof allAbsences>();
    allAbsences.forEach(absence => {
      const studentId = absence.student_id;
      if (!absencesByStudentMap.has(studentId)) {
        absencesByStudentMap.set(studentId, []);
      }
      absencesByStudentMap.get(studentId)!.push(absence);
    });

    const periods: BimesterDates = bimesterDates;

    // Processar registros (agora usando dados dos hooks)
    const records: StudentRecord[] = filteredStudents.map((student) => {
      // API usa 'student_id', interface antiga usa 'estudanteId'
      const studentAbsences = absencesByStudentMap.get(student.student_id) || [];

      // 🎯 FILTRO: Aplicar excludeJustified
      const absences = excludeJustified
        ? studentAbsences.filter(abs => !abs.is_justified)
        : studentAbsences;

      // Calculate absences by bimester
      const faltasB1 = absences.filter(abs => {
        const date = parseFlexibleDate(abs.absence_date);
        const b1 = periods[1];
        if (!date || !b1) return false;
        const startDate = parseFlexibleDate(b1.start);
        const endDate = parseFlexibleDate(b1.end);
        return startDate && endDate && date >= startDate && date <= endDate;
      }).length;

      const faltasB2 = absences.filter(abs => {
        const date = parseFlexibleDate(abs.absence_date);
        const b2 = periods[2];
        if (!date || !b2) return false;
        const startDate = parseFlexibleDate(b2.start);
        const endDate = parseFlexibleDate(b2.end);
        return startDate && endDate && date >= startDate && date <= endDate;
      }).length;

      const faltasB3 = absences.filter(abs => {
        const date = parseFlexibleDate(abs.absence_date);
        const b3 = periods[3];
        if (!date || !b3) return false;
        const startDate = parseFlexibleDate(b3.start);
        const endDate = parseFlexibleDate(b3.end);
        return startDate && endDate && date >= startDate && date <= endDate;
      }).length;

      const faltasB4 = absences.filter(abs => {
        const date = parseFlexibleDate(abs.absence_date);
        const b4 = periods[4];
        if (!date || !b4) return false;
        const startDate = parseFlexibleDate(b4.start);
        const endDate = parseFlexibleDate(b4.end);
        return startDate && endDate && date >= startDate && date <= endDate;
      }).length;

      const totalFaltas = faltasB1 + faltasB2 + faltasB3 + faltasB4;

      // Calculate today's absences
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const faltasAteHoje = absences.filter(abs => {
        const date = parseFlexibleDate(abs.absence_date);
        return date && date <= today;
      }).length;

      // ✅ MIGRADO: Usar dias letivos do hook useSchoolDays
      const diasLetivosB1 = schoolDays.bimester1;
      const diasLetivosB2 = schoolDays.bimester2;
      const diasLetivosB3 = schoolDays.bimester3;
      const diasLetivosB4 = schoolDays.bimester4;
      const diasLetivosAnual = schoolDays.total;

      // Calculate attendance percentage
      const percentualFaltas = diasLetivosAnual > 0
        ? Math.round((totalFaltas / diasLetivosAnual) * 100)
        : 0;
      const percentualFrequencia = 100 - percentualFaltas;
      const percentualFaltasAteHoje = diasLetivosAnual > 0
        ? Math.round((faltasAteHoje / diasLetivosAnual) * 100)
        : 0;
      const percentualFrequenciaAteHoje = 100 - percentualFaltasAteHoje;

      return {
        // Mapear API (snake_case) → Interface antiga (camelCase)
        estudanteId: student.student_id,
        turma: student.class,
        nome: student.name,
        faltasB1,
        faltasB2,
        faltasB3,
        faltasB4,
        totalFaltas,
        totalFaltasAteHoje: faltasAteHoje,
        percentualFaltas,
        percentualFaltasAteHoje,
        percentualFrequencia,
        percentualFrequenciaAteHoje,
        diasLetivosAteHoje: diasLetivosAnual, // Simplified
        diasLetivosB1,
        diasLetivosB2,
        diasLetivosB3,
        diasLetivosB4,
        diasLetivosAnual,
      };
    });

    logger.info(`Registros de estudantes processados (API REST)`, {
      totalRecords: records.length,
      excludeJustified,
    });

    return records;
  }, [filteredStudents, allAbsences, bimesterDates, schoolDays, excludeJustified, loading]);

  // ✅ MIGRADO: Auto refresh usando hooks
  const [, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [autoRefresh]);

  return {
    studentRecords,
    loading,
    error: null, // Error handling via hooks individuais
    refresh: () => setRefreshTrigger(prev => prev + 1),
  };
}