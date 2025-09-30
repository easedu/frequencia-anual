/**
 * Attendance Service - Centralized Firebase operations for attendance/absences
 * Eliminates duplicate Firebase calls and provides consistent API
 */

import { doc, getDoc, collection, getDocs, addDoc, deleteDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { logger } from '@/utils/logger';
import { FIREBASE_PATHS } from '@/config/constants';
import type { AbsenceRecord, BimesterDates } from '@/types';
import { addCreationAudit, addUpdateAudit } from '@/utils/auditHelpers';
import { initializeSoftDelete } from '@/utils/softDeleteHelpers';

export class AttendanceService {
  /**
   * Get all absence records
   */
  static async getAbsenceRecords(): Promise<AbsenceRecord[]> {
    try {
      const snapshot = await getDocs(collection(db, FIREBASE_PATHS.absenceControl()));
      const records: AbsenceRecord[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        records.push({
          estudanteId: data.estudanteId || '',
          data: data.data || '',
          justified: data.justified || false,
          atestadoId: data.atestadoId,
        });
      });
      
      return records;
    } catch (error) {
      logger.error('Erro ao buscar registros de faltas', error as Error);
      throw error;
    }
  }

  /**
   * Get absence records for specific student
   */
  static async getStudentAbsences(estudanteId: string): Promise<AbsenceRecord[]> {
    try {
      const allRecords = await AttendanceService.getAbsenceRecords();
      return allRecords.filter(record => record.estudanteId === estudanteId);
    } catch (error) {
      logger.error('Erro ao buscar faltas do estudante', error as Error);
      throw error;
    }
  }

  /**
   * Get absence records by date range
   */
  static async getAbsencesByDateRange(startDate: string, endDate: string): Promise<AbsenceRecord[]> {
    try {
      const allRecords = await AttendanceService.getAbsenceRecords();
      return allRecords.filter(record => {
        const recordDate = new Date(record.data);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return recordDate >= start && recordDate <= end;
      });
    } catch (error) {
      logger.error('Erro ao buscar faltas por período', error as Error);
      throw error;
    }
  }

  /**
   * Add absence record
   */
  static async addAbsenceRecord(record: Omit<AbsenceRecord, 'id'>, userId?: string): Promise<void> {
    try {
      const recordData = {
        estudanteId: record.estudanteId,
        data: record.data,
        justified: record.justified,
        atestadoId: record.atestadoId,
      };

      // Add audit and soft delete fields
      const dataToSave = {
        ...addCreationAudit(recordData, userId),
        ...initializeSoftDelete(),
      };

      await addDoc(collection(db, FIREBASE_PATHS.absenceControl()), dataToSave);

      logger.info(`Falta registrada para estudante ${record.estudanteId} em ${record.data}`);
    } catch (error) {
      logger.error('Erro ao registrar falta', error as Error);
      throw error;
    }
  }

  /**
   * Add multiple absence records (batch operation)
   */
  static async addAbsenceRecords(records: Omit<AbsenceRecord, 'id'>[], userId?: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      const collectionRef = collection(db, FIREBASE_PATHS.absenceControl());

      records.forEach((record) => {
        const docRef = doc(collectionRef);
        const recordData = {
          estudanteId: record.estudanteId,
          data: record.data,
          justified: record.justified,
          atestadoId: record.atestadoId,
        };

        // Add audit and soft delete fields
        const dataToSave = {
          ...addCreationAudit(recordData, userId),
          ...initializeSoftDelete(),
        };

        batch.set(docRef, dataToSave);
      });

      await batch.commit();
      logger.info(`${records.length} faltas registradas em lote`);
    } catch (error) {
      logger.error('Erro ao registrar faltas em lote', error as Error);
      throw error;
    }
  }

  /**
   * Get academic year periods (bimesters)
   */
  static async getAcademicYearPeriods(): Promise<BimesterDates> {
    try {
      const docRef = doc(db, FIREBASE_PATHS.academicYear());
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Dados do ano letivo não encontrados');
      }
      
      const data = docSnap.data();
      const bimesterDates: BimesterDates = {};
      
      // Process bimester data
      Object.keys(data).forEach((key, index) => {
        if (key.includes('Bimestre')) {
          const bimesterData = data[key];
          if (bimesterData && bimesterData.startDate && bimesterData.endDate) {
            bimesterDates[index + 1] = {
              start: bimesterData.startDate,
              end: bimesterData.endDate,
            };
          }
        }
      });
      
      return bimesterDates;
    } catch (error) {
      logger.error('Erro ao buscar períodos dos bimestres', error as Error);
      throw error;
    }
  }

  /**
   * Calculate school days in a period
   */
  static calculateSchoolDays(startDate: string, endDate: string, holidays: string[] = []): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let schoolDays = 0;
    
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      const dateString = current.toISOString().split('T')[0];
      
      // Skip weekends and holidays
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateString)) {
        schoolDays++;
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return schoolDays;
  }

  /**
   * Calculate attendance percentage
   */
  static calculateAttendancePercentage(
    totalSchoolDays: number,
    absenceCount: number
  ): number {
    if (totalSchoolDays === 0) return 0;
    const attendanceDays = totalSchoolDays - absenceCount;
    return Math.max(0, (attendanceDays / totalSchoolDays) * 100);
  }

  /**
   * Find duplicate absence records
   */
  static async findDuplicateAbsences(): Promise<AbsenceRecord[]> {
    try {
      const records = await AttendanceService.getAbsenceRecords();
      const seen = new Set<string>();
      const duplicates: AbsenceRecord[] = [];
      
      records.forEach(record => {
        const key = `${record.estudanteId}-${record.data}`;
        if (seen.has(key)) {
          duplicates.push(record);
        } else {
          seen.add(key);
        }
      });
      
      return duplicates;
    } catch (error) {
      logger.error('Erro ao buscar duplicatas de faltas', error as Error);
      throw error;
    }
  }

  /**
   * Remove duplicate absence records
   */
  static async removeDuplicateAbsences(): Promise<number> {
    try {
      const duplicates = await AttendanceService.findDuplicateAbsences();
      
      if (duplicates.length === 0) {
        return 0;
      }
      
      const batch = writeBatch(db);
      const snapshot = await getDocs(collection(db, FIREBASE_PATHS.absenceControl()));
      
      let removedCount = 0;
      const seen = new Set<string>();
      
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const key = `${data.estudanteId}-${data.data}`;
        
        if (seen.has(key)) {
          batch.delete(docSnapshot.ref);
          removedCount++;
        } else {
          seen.add(key);
        }
      });
      
      await batch.commit();
      logger.info(`Removidos ${removedCount} registros duplicados`);
      
      return removedCount;
    } catch (error) {
      logger.error('Erro ao remover duplicatas de faltas', error as Error);
      throw error;
    }
  }
}

/**
 * Convenience exports
 */
export const attendanceService = {
  getAbsenceRecords: AttendanceService.getAbsenceRecords,
  getStudentAbsences: AttendanceService.getStudentAbsences,
  getAbsencesByDateRange: AttendanceService.getAbsencesByDateRange,
  addAbsenceRecord: AttendanceService.addAbsenceRecord,
  addAbsenceRecords: AttendanceService.addAbsenceRecords,
  getAcademicYearPeriods: AttendanceService.getAcademicYearPeriods,
  calculateSchoolDays: AttendanceService.calculateSchoolDays,
  calculateAttendancePercentage: AttendanceService.calculateAttendancePercentage,
  findDuplicateAbsences: AttendanceService.findDuplicateAbsences,
  removeDuplicateAbsences: AttendanceService.removeDuplicateAbsences,
};