/**
 * React Query Hooks para Suspensions API
 *
 * ✅ OTIMIZAÇÃO: Usa Materialized Views (suspensions-mv)
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

export const suspensionsKeys = {
  all: ['suspensions'] as const,
  lists: () => [...suspensionsKeys.all, 'list'] as const,
  list: (filters: SuspensionFilters) => [...suspensionsKeys.lists(), filters] as const,
  details: () => [...suspensionsKeys.all, 'detail'] as const,
  detail: (id: string) => [...suspensionsKeys.details(), id] as const,
  byStudent: (studentId: string) => [...suspensionsKeys.all, 'byStudent', studentId] as const,
  bySeverity: (severity: string) => [...suspensionsKeys.all, 'bySeverity', severity] as const,
};

// ============================================================================
// TYPES
// ============================================================================

export interface SuspensionFilters {
  studentId?: string;
  severity?: 'LEVE' | 'MODERADA' | 'GRAVE';
  limit?: number;
  cursor?: string;
}

export interface SuspensionData {
  id: string;
  studentId: string;
  startDate: string;
  endDate: string;
  daysSuspended: number;
  reason: string;
  description?: string;
  severity?: 'LEVE' | 'MODERADA' | 'GRAVE';
  [key: string]: unknown;
}

export interface SuspensionResponse {
  success: boolean;
  data: SuspensionData[];
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

async function fetchSuspensions(
  filters: SuspensionFilters,
  token: string
): Promise<SuspensionResponse> {
  const params = new URLSearchParams();

  if (filters.studentId) params.append('studentId', filters.studentId);
  if (filters.severity) params.append('severity', filters.severity);
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.cursor) params.append('cursor', filters.cursor);

  const response = await apiCircuitBreaker.execute(async () => {
    return fetchWithRetry(`/api/suspensions-mv?${params.toString()}`, {
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
 * Hook para listar suspensões (com MV)
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useSuspensions({ severity: 'GRAVE' });
 * ```
 */
export function useSuspensions(filters: SuspensionFilters = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: suspensionsKeys.list(filters),
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();
      return fetchSuspensions(filters, token);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para suspensões de um estudante específico
 */
export function useStudentSuspensions(studentId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: suspensionsKeys.byStudent(studentId),
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();
      return fetchSuspensions({ studentId }, token);
    },
    enabled: !!user && !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para suspensões por severidade
 */
export function useSuspensionsBySeverity(severity: 'LEVE' | 'MODERADA' | 'GRAVE') {
  const { user } = useAuth();

  return useQuery({
    queryKey: suspensionsKeys.bySeverity(severity),
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();
      return fetchSuspensions({ severity }, token);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para criar suspensão
 */
export interface CreateSuspensionInput {
  studentId: string;
  startDate: string;
  endDate: string;
  daysSuspended: number;
  reason: string;
  description?: string;
  severity?: 'LEVE' | 'MODERADA' | 'GRAVE';
}

export function useCreateSuspension() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suspensionData: CreateSuspensionInput) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      const response = await fetch('/api/suspensions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(suspensionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar suspensão');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: suspensionsKeys.lists() });
      if (variables.studentId) {
        queryClient.invalidateQueries({ queryKey: suspensionsKeys.byStudent(variables.studentId) });
      }
    },
  });
}

/**
 * Hook para atualizar suspensão
 */
export interface UpdateSuspensionInput extends Partial<CreateSuspensionInput> {
  id: string;
}

export function useUpdateSuspension() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...suspensionData }: UpdateSuspensionInput) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      const response = await fetch(`/api/suspensions/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(suspensionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar suspensão');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: suspensionsKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: suspensionsKeys.lists() });
    },
  });
}

/**
 * Hook para deletar suspensão
 */
export function useDeleteSuspension() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      const response = await fetch(`/api/suspensions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao deletar suspensão');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suspensionsKeys.all });
    },
  });
}
