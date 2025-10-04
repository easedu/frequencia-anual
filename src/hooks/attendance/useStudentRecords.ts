/**
 * Hook for student attendance records
 * Separated from the monolithic useAttendanceData
 */

import { useState, useEffect } from 'react';
import { attendanceService } from '@/services/firebase/attendanceService';
import { StudentDataService } from '@/services/studentDataService';
import { logger } from '@/utils/logger';
import type { StudentRecord, Estudante } from '@/types';

export interface UseStudentRecordsOptions {
  turmaFilter?: string;
  statusFilter?: string;
  autoRefresh?: boolean;
}

export function useStudentRecords(options: UseStudentRecordsOptions = {}) {
  const { turmaFilter, statusFilter, autoRefresh = false } = options;
  
  const [studentRecords, setStudentRecords] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const calculateStudentRecord = async (student: Estudante): Promise<StudentRecord> => {
    try {
      const absences = await attendanceService.getStudentAbsences(student.estudanteId);
      const periods = await attendanceService.getAcademicYearPeriods();
      
      // Calculate absences by bimester
      const faltasB1 = absences.filter(abs => {
        const date = new Date(abs.data);
        const b1 = periods[1];
        return b1 && date >= new Date(b1.start) && date <= new Date(b1.end);
      }).length;

      const faltasB2 = absences.filter(abs => {
        const date = new Date(abs.data);
        const b2 = periods[2];
        return b2 && date >= new Date(b2.start) && date <= new Date(b2.end);
      }).length;

      const faltasB3 = absences.filter(abs => {
        const date = new Date(abs.data);
        const b3 = periods[3];
        return b3 && date >= new Date(b3.start) && date <= new Date(b3.end);
      }).length;

      const faltasB4 = absences.filter(abs => {
        const date = new Date(abs.data);
        const b4 = periods[4];
        return b4 && date >= new Date(b4.start) && date <= new Date(b4.end);
      }).length;

      const totalFaltas = faltasB1 + faltasB2 + faltasB3 + faltasB4;
      
      // Calculate today's absences
      const today = new Date();
      const faltasAteHoje = absences.filter(abs => new Date(abs.data) <= today).length;
      
      // Calculate school days (simplified - in real app, this would come from academic year data)
      const diasLetivosB1 = 50; // Example values
      const diasLetivosB2 = 50;
      const diasLetivosB3 = 50;
      const diasLetivosB4 = 50;
      const diasLetivosAnual = diasLetivosB1 + diasLetivosB2 + diasLetivosB3 + diasLetivosB4;
      
      // Calculate attendance percentage
      const percentualFaltas = diasLetivosAnual > 0 ? (totalFaltas / diasLetivosAnual) * 100 : 0;
      const percentualFrequencia = 100 - percentualFaltas;
      const percentualFaltasAteHoje = diasLetivosAnual > 0 ? (faltasAteHoje / diasLetivosAnual) * 100 : 0;
      const percentualFrequenciaAteHoje = 100 - percentualFaltasAteHoje;

      return {
        estudanteId: student.estudanteId,
        turma: student.turma,
        nome: student.nome,
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
    } catch (error) {
      logger.error(`Erro ao calcular registro para estudante ${student.nome}`, error as Error);
      throw error;
    }
  };

  const fetchStudentRecords = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all students (V3 only)
      let students = await StudentDataService.getStudents();

      // Apply filters
      if (turmaFilter) {
        students = students.filter(s => s.turma === turmaFilter);
      }

      if (statusFilter) {
        students = students.filter(s => s.status === statusFilter);
      }

      // Calculate records for all students
      const records = await Promise.all(
        students.map(student => calculateStudentRecord(student))
      );

      setStudentRecords(records);
    } catch (err) {
      logger.error('Erro ao calcular registros de estudantes', err as Error);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentRecords();
  }, [turmaFilter, statusFilter]);

  // Auto refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchStudentRecords, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return {
    studentRecords,
    loading,
    error,
    refresh: fetchStudentRecords,
  };
}