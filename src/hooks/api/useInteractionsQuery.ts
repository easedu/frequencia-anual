/**
 * React Query Hooks para Interactions API
 *
 * ✅ OTIMIZAÇÃO: Usa Materialized Views (interactions-mv)
 * ✅ Cache automático, revalidation, prefetching
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithRetry } from '@/utils/retry';
import { apiCircuitBreaker } from '@/utils/circuitBreaker';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const interactionsKeys = {
  all: ['interactions'] as const,
  lists: () => [...interactionsKeys.all, 'list'] as const,
  list: (filters: InteractionFilters) => [...interactionsKeys.lists(), filters] as const,
  details: () => [...interactionsKeys.all, 'detail'] as const,
  detail: (id: string) => [...interactionsKeys.details(), id] as const,
  byStudent: (studentId: string) => [...interactionsKeys.all, 'byStudent', studentId] as const,
};

// ============================================================================
// TYPES
// ============================================================================

export interface InteractionFilters {
  studentId?: string;
  contactType?: string;
  limit?: number;
  cursor?: string;
}

export interface InteractionResponse {
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

async function fetchInteractions(
  filters: InteractionFilters,
  token: string
): Promise<InteractionResponse> {
  const params = new URLSearchParams();

  if (filters.studentId) params.append('studentId', filters.studentId);
  if (filters.contactType) params.append('contactType', filters.contactType);
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.cursor) params.append('cursor', filters.cursor);

  const response = await apiCircuitBreaker.execute(async () => {
    return fetchWithRetry(`/api/interactions-mv?${params.toString()}`, {
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
 * Hook para listar interações (com MV)
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useInteractions({ limit: 50 });
 * ```
 */
export function useInteractions(filters: InteractionFilters = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: interactionsKeys.list(filters),
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();
      return fetchInteractions(filters, token);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para interações de um estudante específico
 */
export function useStudentInteractions(studentId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: interactionsKeys.byStudent(studentId),
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();
      return fetchInteractions({ studentId }, token);
    },
    enabled: !!user && !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para criar interação
 */
export function useCreateInteraction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (interactionData: any) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      const response = await fetch('/api/interactions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(interactionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar interação');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: interactionsKeys.lists() });
      if (variables.studentId) {
        queryClient.invalidateQueries({ queryKey: interactionsKeys.byStudent(variables.studentId) });
      }
    },
  });
}

/**
 * Hook para deletar interação
 */
export function useDeleteInteraction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      const response = await fetch(`/api/interactions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao deletar interação');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interactionsKeys.all });
    },
  });
}
