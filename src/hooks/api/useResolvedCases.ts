/**
 * Hooks: useResolvedCases
 *
 * Hooks para gerenciamento de casos resolvidos (resolved_consecutive_absence_cases)
 * Consume API /api/resolved-cases
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PaginatedResponse } from './useStudents';

// ============================================================================
// TYPES
// ============================================================================

export interface ResolvedCase {
  id: string;
  student_id: string;
  interaction_id: string | null;
  resolved_at: string;
  resolved_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResolvedCaseFilters {
  student_id?: string;
  resolved_by?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface CreateResolvedCaseData {
  student_id: string;
  interaction_id?: string;
  resolved_at: string;
  resolved_by: string;
  notes?: string;
}

export interface UpdateResolvedCaseData {
  interaction_id?: string;
  resolved_at?: string;
  resolved_by?: string;
  notes?: string;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para buscar casos resolvidos com filtros
 *
 * @example
 * const { resolvedCases, loading, error, pagination, refetch } = useResolvedCases({
 *   student_id: 'uuid-123',
 *   resolved_by: 'Prof. João Silva'
 * });
 */
export function useResolvedCases(filters?: ResolvedCaseFilters) {
  const { user } = useAuth();
  const [resolvedCases, setResolvedCases] = useState<ResolvedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
  });

  const fetchResolvedCases = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.student_id) params.append('student_id', filters.student_id);
      if (filters?.resolved_by) params.append('resolved_by', filters.resolved_by);
      if (filters?.start_date) params.append('start_date', filters.start_date);
      if (filters?.end_date) params.append('end_date', filters.end_date);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const token = await user.getIdToken();
      const response = await fetch(`/api/resolved-cases?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar casos resolvidos');
      }

      const data: PaginatedResponse<ResolvedCase> = await response.json();
      setResolvedCases(data.data || []);
      setPagination(data.pagination || { page: 1, limit: 100, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('[useResolvedCases] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [
    user,
    filters?.student_id,
    filters?.resolved_by,
    filters?.start_date,
    filters?.end_date,
    filters?.page,
    filters?.limit,
  ]);

  useEffect(() => {
    fetchResolvedCases();
  }, [fetchResolvedCases]);

  return { resolvedCases, loading, error, pagination, refetch: fetchResolvedCases };
}

/**
 * Hook para buscar caso resolvido específico por ID
 *
 * @example
 * const { resolvedCase, loading, error, refetch } = useResolvedCase('case-uuid-123');
 */
export function useResolvedCase(caseId: string | null) {
  const { user } = useAuth();
  const [resolvedCase, setResolvedCase] = useState<ResolvedCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResolvedCase = useCallback(async () => {
    if (!user || !caseId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const response = await fetch(`/api/resolved-cases/${caseId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        setResolvedCase(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar caso resolvido');
      }

      const data = await response.json();
      setResolvedCase(data.data);
    } catch (err) {
      console.error('[useResolvedCase] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, caseId]);

  useEffect(() => {
    fetchResolvedCase();
  }, [fetchResolvedCase]);

  return { resolvedCase, loading, error, refetch: fetchResolvedCase };
}

/**
 * Hook para buscar caso resolvido por student_id
 *
 * @example
 * const { resolvedCase, loading, error, refetch } = useResolvedCaseByStudent('student-uuid-123');
 */
export function useResolvedCaseByStudent(studentId: string | null) {
  const { resolvedCases, loading, error, refetch } = useResolvedCases({
    student_id: studentId || undefined,
    limit: 1,
  });

  const resolvedCase = resolvedCases.length > 0 ? resolvedCases[0] : null;

  return { resolvedCase, loading, error, refetch };
}

/**
 * Hook para criar novo caso resolvido
 *
 * @example
 * const { createResolvedCase, loading, error } = useCreateResolvedCase();
 *
 * const newCase = await createResolvedCase({
 *   student_id: 'uuid-123',
 *   resolved_at: '2025-10-17T14:30:00Z',
 *   resolved_by: 'Prof. João Silva',
 *   notes: 'Caso resolvido após reunião com família'
 * });
 */
export function useCreateResolvedCase() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createResolvedCase = useCallback(
    async (data: CreateResolvedCaseData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch('/api/resolved-cases', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao criar caso resolvido');
        }

        const result = await response.json();
        return result.data as ResolvedCase;
      } catch (err) {
        console.error('[useCreateResolvedCase] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { createResolvedCase, loading, error };
}

/**
 * Hook para atualizar caso resolvido existente
 *
 * @example
 * const { updateResolvedCase, loading, error } = useUpdateResolvedCase();
 *
 * await updateResolvedCase('case-uuid-123', {
 *   notes: 'Atualização após nova reunião'
 * });
 */
export function useUpdateResolvedCase() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateResolvedCase = useCallback(
    async (caseId: string, data: UpdateResolvedCaseData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch(`/api/resolved-cases/${caseId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao atualizar caso resolvido');
        }

        const result = await response.json();
        return result.data as ResolvedCase;
      } catch (err) {
        console.error('[useUpdateResolvedCase] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { updateResolvedCase, loading, error };
}

/**
 * Hook para deletar caso resolvido
 *
 * @example
 * const { deleteResolvedCase, loading, error } = useDeleteResolvedCase();
 *
 * await deleteResolvedCase('case-uuid-123');
 */
export function useDeleteResolvedCase() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteResolvedCase = useCallback(
    async (caseId: string) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch(`/api/resolved-cases/${caseId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao deletar caso resolvido');
        }

        const result = await response.json();
        return result.data;
      } catch (err) {
        console.error('[useDeleteResolvedCase] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { deleteResolvedCase, loading, error };
}
