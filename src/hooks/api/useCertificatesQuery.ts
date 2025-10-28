/**
 * React Query Hooks para Certificates API
 *
 * ✅ OTIMIZAÇÃO: Usa Materialized Views (certificates-mv)
 * ✅ Cache automático, revalidation, prefetching
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithRetry } from '@/utils/retry';
import { apiCircuitBreaker } from '@/utils/circuitBreaker';
import type { Atestado } from '@/types';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const certificatesKeys = {
  all: ['certificates'] as const,
  lists: () => [...certificatesKeys.all, 'list'] as const,
  list: (filters: CertificateFilters) => [...certificatesKeys.lists(), filters] as const,
  details: () => [...certificatesKeys.all, 'detail'] as const,
  detail: (id: string) => [...certificatesKeys.details(), id] as const,
  byStudent: (studentId: string) => [...certificatesKeys.all, 'byStudent', studentId] as const,
  byStatus: (status: string) => [...certificatesKeys.all, 'byStatus', status] as const,
};

// ============================================================================
// TYPES
// ============================================================================

export interface CertificateFilters {
  studentId?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  limit?: number;
  cursor?: string;
}

export interface CertificateResponse {
  success: boolean;
  data: Atestado[];
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

async function fetchCertificates(
  filters: CertificateFilters,
  token: string
): Promise<CertificateResponse> {
  const params = new URLSearchParams();

  if (filters.studentId) params.append('studentId', filters.studentId);
  if (filters.status) params.append('status', filters.status);
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.cursor) params.append('cursor', filters.cursor);

  const response = await apiCircuitBreaker.execute(async () => {
    return fetchWithRetry(`/api/certificates-mv?${params.toString()}`, {
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
 * Hook para listar atestados (com MV)
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useCertificates({ status: 'PENDING' });
 * ```
 */
export function useCertificates(filters: CertificateFilters = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: certificatesKeys.list(filters),
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();
      return fetchCertificates(filters, token);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para atestados de um estudante específico
 */
export function useStudentCertificates(studentId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: certificatesKeys.byStudent(studentId),
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();
      return fetchCertificates({ studentId }, token);
    },
    enabled: !!user && !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para atestados por status
 */
export function useCertificatesByStatus(status: 'PENDING' | 'APPROVED' | 'REJECTED') {
  const { user } = useAuth();

  return useQuery({
    queryKey: certificatesKeys.byStatus(status),
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();
      return fetchCertificates({ status }, token);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para criar atestado
 */
export function useCreateCertificate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (certificateData: Partial<Atestado> & { studentId: string }) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      const response = await fetch('/api/certificates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(certificateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar atestado');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: certificatesKeys.lists() });
      if (variables.studentId) {
        queryClient.invalidateQueries({ queryKey: certificatesKeys.byStudent(variables.studentId) });
      }
    },
  });
}

/**
 * Hook para atualizar atestado (aprovar/rejeitar)
 */
export function useUpdateCertificate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...certificateData }: { id: string } & Partial<Atestado>) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      const response = await fetch(`/api/certificates/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(certificateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar atestado');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: certificatesKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: certificatesKeys.lists() });
    },
  });
}

/**
 * Hook para deletar atestado
 */
export function useDeleteCertificate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      const response = await fetch(`/api/certificates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao deletar atestado');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificatesKeys.all });
    },
  });
}
