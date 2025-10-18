/**
 * Hooks: useAutomationExecutions
 *
 * Hooks para gerenciamento de execuções de automação (automation_executions)
 * Consume API /api/automation-executions
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PaginatedResponse } from './useStudents';

// ============================================================================
// TYPES
// ============================================================================

export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface AutomationExecution {
  id: string;
  status: ExecutionStatus;
  total_students: number;
  processed_students: number;
  current_student_index: number;
  processed_student_ids: string[];
  students_data: any; // JSONB
  results: any; // JSONB
  error_message: string | null;
  dry_run: boolean;
  absence_multiple: number | null;
  notification_phone: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationExecutionFilters {
  status?: ExecutionStatus;
  dry_run?: boolean;
  absence_multiple?: number;
  page?: number;
  limit?: number;
}

export interface CreateAutomationExecutionData {
  total_students: number;
  students_data: any;
  dry_run?: boolean;
  absence_multiple?: number;
  notification_phone?: string;
}

export interface UpdateExecutionStatusData {
  status: ExecutionStatus;
}

export interface UpdateCheckpointData {
  processed_students: number;
  current_student_index: number;
  processed_student_ids: string[];
  results: any;
}

export interface UpdateErrorData {
  error_message: string;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para buscar execuções de automação com filtros
 *
 * @example
 * const { executions, loading, error, pagination, refetch } = useAutomationExecutions({
 *   status: 'COMPLETED',
 *   dry_run: false
 * });
 */
export function useAutomationExecutions(filters?: AutomationExecutionFilters) {
  const { user } = useAuth();
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const fetchExecutions = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.dry_run !== undefined)
        params.append('dry_run', filters.dry_run.toString());
      if (filters?.absence_multiple)
        params.append('absence_multiple', filters.absence_multiple.toString());
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const token = await user.getIdToken();
      const response = await fetch(`/api/automation-executions?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar execuções de automação');
      }

      const data: PaginatedResponse<AutomationExecution> = await response.json();
      setExecutions(data.data || []);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('[useAutomationExecutions] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [
    user,
    filters?.status,
    filters?.dry_run,
    filters?.absence_multiple,
    filters?.page,
    filters?.limit,
  ]);

  useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  return { executions, loading, error, pagination, refetch: fetchExecutions };
}

/**
 * Hook para buscar execução de automação específica por ID
 *
 * @example
 * const { execution, loading, error, refetch } = useAutomationExecution('execution-uuid-123');
 */
export function useAutomationExecution(executionId: string | null) {
  const { user } = useAuth();
  const [execution, setExecution] = useState<AutomationExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExecution = useCallback(async () => {
    if (!user || !executionId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const response = await fetch(`/api/automation-executions/${executionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        setExecution(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar execução de automação');
      }

      const data = await response.json();
      setExecution(data.data);
    } catch (err) {
      console.error('[useAutomationExecution] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, executionId]);

  useEffect(() => {
    fetchExecution();
  }, [fetchExecution]);

  return { execution, loading, error, refetch: fetchExecution };
}

/**
 * Hook para criar nova execução de automação
 *
 * @example
 * const { createExecution, loading, error } = useCreateAutomationExecution();
 *
 * const newExecution = await createExecution({
 *   total_students: 25,
 *   students_data: { students: [...] },
 *   dry_run: false,
 *   absence_multiple: 3,
 *   notification_phone: '5511988384664'
 * });
 */
export function useCreateAutomationExecution() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createExecution = useCallback(
    async (data: CreateAutomationExecutionData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch('/api/automation-executions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao criar execução de automação');
        }

        const result = await response.json();
        return result.data as AutomationExecution;
      } catch (err) {
        console.error('[useCreateAutomationExecution] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { createExecution, loading, error };
}

/**
 * Hook para atualizar status de execução de automação
 *
 * @example
 * const { updateStatus, loading, error } = useUpdateExecutionStatus();
 *
 * await updateStatus('execution-uuid-123', { status: 'RUNNING' });
 */
export function useUpdateExecutionStatus() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = useCallback(
    async (executionId: string, data: UpdateExecutionStatusData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch(`/api/automation-executions/${executionId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao atualizar status da execução');
        }

        const result = await response.json();
        return result.data as AutomationExecution;
      } catch (err) {
        console.error('[useUpdateExecutionStatus] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { updateStatus, loading, error };
}

/**
 * Hook para atualizar checkpoint (progresso) de execução de automação
 *
 * @example
 * const { updateCheckpoint, loading, error } = useUpdateExecutionCheckpoint();
 *
 * await updateCheckpoint('execution-uuid-123', {
 *   processed_students: 10,
 *   current_student_index: 10,
 *   processed_student_ids: ['uuid1', 'uuid2'],
 *   results: { sent: 8, failed: 2 }
 * });
 */
export function useUpdateExecutionCheckpoint() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCheckpoint = useCallback(
    async (executionId: string, data: UpdateCheckpointData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch(`/api/automation-executions/${executionId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao atualizar checkpoint da execução');
        }

        const result = await response.json();
        return result.data as AutomationExecution;
      } catch (err) {
        console.error('[useUpdateExecutionCheckpoint] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { updateCheckpoint, loading, error };
}

/**
 * Hook para atualizar erro de execução de automação
 *
 * @example
 * const { updateError, loading, error } = useUpdateExecutionError();
 *
 * await updateError('execution-uuid-123', {
 *   error_message: 'Erro ao processar estudante X'
 * });
 */
export function useUpdateExecutionError() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateError = useCallback(
    async (executionId: string, data: UpdateErrorData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch(`/api/automation-executions/${executionId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao registrar erro da execução');
        }

        const result = await response.json();
        return result.data as AutomationExecution;
      } catch (err) {
        console.error('[useUpdateExecutionError] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { updateError, loading, error };
}

/**
 * Hook para deletar execução de automação
 *
 * @example
 * const { deleteExecution, loading, error } = useDeleteAutomationExecution();
 *
 * await deleteExecution('execution-uuid-123');
 */
export function useDeleteAutomationExecution() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteExecution = useCallback(
    async (executionId: string) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch(`/api/automation-executions/${executionId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao deletar execução de automação');
        }

        const result = await response.json();
        return result.data;
      } catch (err) {
        console.error('[useDeleteAutomationExecution] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { deleteExecution, loading, error };
}
