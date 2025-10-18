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

// ============================================================================
// TASKS (SPRINT 3)
// ============================================================================
export {
  useTasks,
  useTask,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useMarkTaskAsResolved,
  useAssignTask,
} from './useTasks';

export type {
  UserTask,
  TaskFilters,
  CreateTaskData,
  UpdateTaskData,
} from './useTasks';

// ============================================================================
// OCCURRENCES (SPRINT 3)
// ============================================================================
export {
  useOccurrences,
  useOccurrence,
  useCreateOccurrence,
  useUpdateOccurrence,
  useDeleteOccurrence,
} from './useOccurrences';

export type {
  StudentOccurrence,
  OccurrenceFilters,
  OccurrenceSeverity,
  OccurrenceType,
  NotificationMethod,
  CreateOccurrenceData,
  UpdateOccurrenceData,
} from './useOccurrences';

// ============================================================================
// WHATSAPP VERIFIED (SPRINT 3)
// ============================================================================
export {
  useWhatsAppVerified,
  useWhatsAppVerifiedById,
  useWhatsAppVerifiedByPhone,
  useSaveWhatsAppVerified,
  useUpdateWhatsAppVerified,
  useDeleteWhatsAppVerified,
  useVerifyWhatsAppNumbers,
} from './useWhatsAppVerified';

export type {
  WhatsAppVerifiedNumber,
  WhatsAppVerifiedFilters,
  VerificationStatus,
  CreateWhatsAppVerifiedData,
  UpdateWhatsAppVerifiedData,
} from './useWhatsAppVerified';

// ============================================================================
// MESSAGE HISTORY (SPRINT 3)
// ============================================================================
export {
  useMessageHistory,
  useStudentMessageHistory,
  useCheckMessageSent,
  useRecordMessage,
  useMessageHistoryStats,
} from './useMessageHistory';

export type {
  WhatsAppMessageHistory,
  MessageHistoryFilters,
  MessageStatus,
  CreateMessageHistoryData,
  MessageHistoryStats,
} from './useMessageHistory';

// ============================================================================
// USERS (SPRINT 3)
// ============================================================================
export {
  useUsers,
  useUserByFirebaseUid,
  useCurrentUserProfile,
  useUserByEmail,
  useCreateUser,
  useUpdateUser,
  useUpdateLastLogin,
  useUpdateUserMetadata,
  useActiveUsers,
  useUsersByRole,
} from './useUsers';

export type {
  UserProfile,
  UserFilters,
  UserRole,
  CreateUserData,
  UpdateUserData,
  UserMetadata,
} from './useUsers';

// ============================================================================
// ABSENCE CONTROL (SPRINT 4)
// ============================================================================
export {
  useAbsenceControls,
  useAbsenceControl,
  useAbsenceControlByYearBimester,
  useCreateAbsenceControl,
  useUpdateAbsenceControl,
  useDeleteAbsenceControl,
} from './useAbsenceControl';

export type {
  AbsenceControl,
  AbsenceControlFilters,
  CreateAbsenceControlData,
  UpdateAbsenceControlData,
} from './useAbsenceControl';

// ============================================================================
// ACADEMIC YEARS (SPRINT 4)
// ============================================================================
export {
  useAcademicYears,
  useAcademicYear,
  useCurrentAcademicYear,
  useCreateAcademicYear,
  useUpdateAcademicYear,
  useDeleteAcademicYear,
  useCountSchoolDays,
  useAcademicYearComplete,
  useSaveAcademicYearComplete,
} from './useAcademicYears';

export type {
  AcademicYear,
  AcademicYearFilters,
  CreateAcademicYearData,
  UpdateAcademicYearData,
  CountSchoolDaysParams,
  CountSchoolDaysResult,
  BimesterData,
  CompleteAcademicYearData,
  SaveCompleteAcademicYearData,
} from './useAcademicYears';

// ============================================================================
// AUTOMATION EXECUTIONS (SPRINT 4)
// ============================================================================
export {
  useAutomationExecutions,
  useAutomationExecution,
  useCreateAutomationExecution,
  useUpdateExecutionStatus,
  useUpdateExecutionCheckpoint,
  useUpdateExecutionError,
  useDeleteAutomationExecution,
} from './useAutomationExecutions';

export type {
  AutomationExecution,
  AutomationExecutionFilters,
  ExecutionStatus,
  CreateAutomationExecutionData,
  UpdateExecutionStatusData,
  UpdateCheckpointData,
  UpdateErrorData,
} from './useAutomationExecutions';

// ============================================================================
// RESOLVED CASES (SPRINT 4)
// ============================================================================
export {
  useResolvedCases,
  useResolvedCase,
  useResolvedCaseByStudent,
  useCreateResolvedCase,
  useUpdateResolvedCase,
  useDeleteResolvedCase,
} from './useResolvedCases';

export type {
  ResolvedCase,
  ResolvedCaseFilters,
  CreateResolvedCaseData,
  UpdateResolvedCaseData,
} from './useResolvedCases';
