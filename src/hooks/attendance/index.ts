/**
 * Consolidated attendance hooks
 * Replaces the monolithic useAttendanceData with focused, reusable hooks
 */

import { useStudentRecords } from './useStudentRecords';
import { useBimesterPeriods } from './useBimesterPeriods';
import { useSchoolDays } from './useSchoolDays';

export { useStudentRecords } from './useStudentRecords';
export { useBimesterPeriods } from './useBimesterPeriods';
export { useSchoolDays } from './useSchoolDays';

// Convenience hook that combines multiple attendance-related hooks
export function useAttendanceData(options: {
  turmaFilter?: string;
  statusFilter?: string;
  autoRefresh?: boolean;
} = {}) {
  const studentRecords = useStudentRecords(options);
  const bimesterPeriods = useBimesterPeriods();
  const schoolDays = useSchoolDays();

  return {
    // Student records
    studentRecords: studentRecords.studentRecords,
    studentRecordsLoading: studentRecords.loading,
    studentRecordsError: studentRecords.error,
    refreshStudentRecords: studentRecords.refresh,

    // Bimester periods
    bimesterDates: bimesterPeriods.bimesterDates,
    bimesterLoading: bimesterPeriods.loading,
    bimesterError: bimesterPeriods.error,
    getBimesterByDate: bimesterPeriods.getBimesterByDate,
    getCurrentBimester: bimesterPeriods.getCurrentBimester,
    getBimesterRange: bimesterPeriods.getBimesterRange,

    // School days
    schoolDays: schoolDays.schoolDays,
    schoolDaysLoading: schoolDays.loading,
    schoolDaysError: schoolDays.error,
    getSchoolDaysForPeriod: schoolDays.getSchoolDaysForPeriod,
    getSchoolDaysUpToDate: schoolDays.getSchoolDaysUpToDate,

    // Combined loading state
    loading: studentRecords.loading || bimesterPeriods.loading || schoolDays.loading,
    error: studentRecords.error || bimesterPeriods.error || schoolDays.error,

    // Combined refresh function
    refresh: async () => {
      await Promise.all([
        studentRecords.refresh(),
        bimesterPeriods.refresh(),
        schoolDays.refresh(),
      ]);
    },
  };
}