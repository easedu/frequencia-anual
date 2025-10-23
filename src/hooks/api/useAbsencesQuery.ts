/**
 * React Query Hooks para Absences API
 *
 * ✅ OTIMIZAÇÃO: Usa Materialized Views (absences-mv)
 * ✅ Cache automático, revalidation, prefetching
 * ✅ Elimina N+1 queries (JOIN pré-computado)
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithRetry } from '@/utils/retry';
import { apiCircuitBreaker } from '@/utils/circuitBreaker';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const absencesKeys = {
  all: ['absences'] as const,
  lists: () => [...absencesKeys.all, 'list'] as const,
  list: (filters: AbsenceFilters) => [...absencesKeys.lists(), filters] as const,
  details: () => [...absencesKeys.all, 'detail'] as const,
  detail: (id: string) => [...absencesKeys.details(), id] as const,
  byStudent: (studentId: string) => [...absencesKeys.all, 'byStudent', studentId] as const,
};

// ============================================================================
// TYPES
// ============================================================================

export interface AbsenceFilters {
  studentId?: string;
  bimester?: number;
  isJustified?: boolean;
  limit?: number;
  cursor?: string;
}

export interface AbsenceResponse {
  success: boolean;
  data: any[];
  pagination: {
    limit: number;
    hasNextPage: boolean;
    nextCursor: string | null;
  };
  meta: {
    source: 'materialized_view';
  };
}

// ============================================================================
// FETCHER FUNCTIONS
// ============================================================================

/**
 * Fetch lista de faltas usando Materialized View
 * ✅ OTIMIZAÇÃO: Usa absences-mv (JOIN pré-computado)
 */
async function fetchAbsences(
  filters: AbsenceFilters,
  token: string
): Promise<AbsenceResponse> {
  const params = new URLSearchParams();

  if (filters.studentId) params.append('studentId', filters.studentId);
  if (filters.bimester) params.append('bimester', filters.bimester.toString());
  if (filters.isJustified !== undefined) params.append('isJustified', filters.isJustified.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.cursor) params.append('cursor', filters.cursor);

  // ✅ OTIMIZAÇÃO: Usar retry + circuit breaker
  const response = await apiCircuitBreaker.execute(async () => {
    return fetchWithRetry(`/api/absences-mv?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  });

  return response.json();
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para listar faltas (com MV)
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useAbsences({
 *   bimester: 1,
 *   limit: 50
 * });
 * ```
 */
export function useAbsences(filters: AbsenceFilters = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: absencesKeys.list(filters),
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();
      return fetchAbsences(filters, token);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos (MV refresh a cada 5min)
  });
}

/**
 * Hook para faltas de um estudante específico
 *
 * @example
 * ```tsx
 * const { data: absences } = useStudentAbsences(estudanteId, 1);
 * ```
 */
export function useStudentAbsences(studentId: string, bimester?: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: absencesKeys.byStudent(studentId),
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();
      return fetchAbsences({ studentId, bimester }, token);
    },
    enabled: !!user && !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para criar falta
 *
 * @example
 * ```tsx
 * const createAbsence = useCreateAbsence();
 * await createAbsence.mutateAsync({ studentId, date, bimester });
 * ```
 */
export function useCreateAbsence() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (absenceData: any) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      const response = await fetch('/api/absences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(absenceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar falta');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: absencesKeys.lists() });
      if (variables.studentId) {
        queryClient.invalidateQueries({ queryKey: absencesKeys.byStudent(variables.studentId) });
      }
    },
  });
}

/**
 * Hook para deletar falta
 */
export function useDeleteAbsence() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      const response = await fetch(`/api/absences/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao deletar falta');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: absencesKeys.all });
    },
  });
}
