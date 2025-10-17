/**
 * Barrel Export: API Hooks
 *
 * Centraliza todos os hooks de API REST
 *
 * USAGE:
 * import { useStudents, useCreateStudent } from '@/hooks/api';
 */

// ============================================================================
// STUDENTS
// ============================================================================
export {
  useStudents,
  useStudent,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
} from './useStudents';

export type {
  Student,
  StudentFilters,
  PaginatedResponse,
  ApiResponse,
} from './useStudents';

// ============================================================================
// CONTACTS
// ============================================================================
export {
  useContacts,
  useContact,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
} from './useContacts';

export type {
  Contact,
  ContactFilters,
} from './useContacts';

// ============================================================================
// ABSENCES
// ============================================================================
export {
  useAbsences,
  useAbsence,
  useCreateAbsence,
  useCreateBulkAbsences,
  useUpdateAbsence,
  useDeleteAbsence,
} from './useAbsences';

export type {
  Absence,
  AbsenceFilters,
  BulkAbsenceResult,
} from './useAbsences';

// ============================================================================
// SUSPENSIONS
// ============================================================================
export {
  useSuspensions,
  useCreateSuspension,
  useUpdateSuspension,
  useDeleteSuspension,
} from './useOthers';

export type {
  Suspension,
  SuspensionFilters,
} from './useOthers';

// ============================================================================
// MEDICAL CERTIFICATES
// ============================================================================
export {
  useMedicalCertificates,
  useCreateMedicalCertificate,
  useUpdateMedicalCertificate,
  useDeleteMedicalCertificate,
} from './useOthers';

export type {
  MedicalCertificate,
  MedicalCertificateFilters,
} from './useOthers';

// ============================================================================
// INTERACTIONS
// ============================================================================
export {
  useInteractions,
  useCreateInteraction,
  useUpdateInteraction,
  useDeleteInteraction,
} from './useOthers';

export type {
  Interaction,
  InteractionFilters,
} from './useOthers';
