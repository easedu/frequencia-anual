/**
 * Barrel Export: React Query Hooks
 *
 * ✅ OTIMIZAÇÃO: Todos os hooks usam Materialized Views
 * ✅ Cache automático via React Query
 * ✅ Retry + Circuit Breaker integrados
 * ✅ Prefetch utilities disponíveis
 *
 * Uso:
 * ```tsx
 * import { useStudents, useAbsences, useTasks } from '@/hooks/api/query';
 *
 * function MyComponent() {
 *   const { data: students } = useStudents({ status: 'ATIVO' });
 *   const { data: absences } = useAbsences({ bimester: 1 });
 *   const { data: tasks } = useTasks({ isResolved: false });
 * }
 * ```
 */

// ============================================================================
// STUDENTS
// ============================================================================

export {
  useStudents,
  useStudent,
  useInfiniteStudents,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  studentsKeys,
  prefetchStudents,
  prefetchStudent,
} from './useStudentsQuery';

// Import para uso interno
import { prefetchStudents } from './useStudentsQuery';

export type {
  StudentFilters,
  PaginatedStudentsResponse,
  CursorPaginatedStudentsResponse,
} from './useStudentsQuery';

// ============================================================================
// ABSENCES
// ============================================================================

export {
  useAbsences,
  useStudentAbsences,
  useCreateAbsence,
  useDeleteAbsence,
  absencesKeys,
} from './useAbsencesQuery';

export type {
  AbsenceFilters,
  AbsenceResponse,
} from './useAbsencesQuery';

// ============================================================================
// INTERACTIONS
// ============================================================================

export {
  useInteractions,
  useStudentInteractions,
  useCreateInteraction,
  useDeleteInteraction,
  interactionsKeys,
} from './useInteractionsQuery';

export type {
  InteractionFilters,
  InteractionResponse,
} from './useInteractionsQuery';

// ============================================================================
// TASKS
// ============================================================================

export {
  useTasks,
  useStudentTasks,
  useTasksByStatus,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  tasksKeys,
} from './useTasksQuery';

export type {
  TaskFilters,
  TaskResponse,
} from './useTasksQuery';

// ============================================================================
// CERTIFICATES
// ============================================================================

export {
  useCertificates,
  useStudentCertificates,
  useCertificatesByStatus,
  useCreateCertificate,
  useUpdateCertificate,
  useDeleteCertificate,
  certificatesKeys,
} from './useCertificatesQuery';

export type {
  CertificateFilters,
  CertificateResponse,
} from './useCertificatesQuery';

// ============================================================================
// SUSPENSIONS
// ============================================================================

export {
  useSuspensions,
  useStudentSuspensions,
  useSuspensionsBySeverity,
  useCreateSuspension,
  useUpdateSuspension,
  useDeleteSuspension,
  suspensionsKeys,
} from './useSuspensionsQuery';

export type {
  SuspensionFilters,
  SuspensionResponse,
} from './useSuspensionsQuery';

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Invalidar todos os caches (útil após bulk operations)
 */
export function invalidateAllCaches(queryClient: import('@tanstack/react-query').QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['students'] });
  queryClient.invalidateQueries({ queryKey: ['absences'] });
  queryClient.invalidateQueries({ queryKey: ['interactions'] });
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
  queryClient.invalidateQueries({ queryKey: ['certificates'] });
  queryClient.invalidateQueries({ queryKey: ['suspensions'] });
}

/**
 * Prefetch dados críticos para dashboard
 */
export async function prefetchDashboardData(
  queryClient: import('@tanstack/react-query').QueryClient,
  user: import('firebase/auth').User
) {
  if (!user) return;

  // Prefetch em paralelo
  await Promise.all([
    prefetchStudents(queryClient, { status: 'ATIVO', detail: 'minimal' }, user),
    // Adicionar outros prefetches conforme necessário
  ]);
}
