/**
 * Barrel export for modular attendance hooks
 * Replaces the monolithic useAttendanceData with focused, reusable hooks
 */

export { useStudentRecords } from './useStudentRecords';
export { useBimesterPeriods } from './useBimesterPeriods';
export { useSchoolDays } from './useSchoolDays';
export { useDuplicateAbsences } from './useDuplicateAbsences';
export { useStudentAbsences } from './useStudentAbsences';

// Export types
export type { UseStudentRecordsOptions } from './useStudentRecords';
export type { UseBimesterPeriodsReturn } from './useBimesterPeriods';
export type { UseSchoolDaysReturn } from './useSchoolDays';
export type { UseDuplicateAbsencesReturn } from './useDuplicateAbsences';
export type { UseStudentAbsencesReturn, UseStudentAbsencesOptions, StudentAbsencesByBimester } from './useStudentAbsences';
