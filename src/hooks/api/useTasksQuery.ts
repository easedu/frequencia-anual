/**
 * React Query Hooks para Tasks API
 *
 * ✅ OTIMIZAÇÃO: Usa Materialized Views (tasks-mv)
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

export const tasksKeys = {
  all: ['tasks'] as const,
  lists: () => [...tasksKeys.all, 'list'] as const,
  list: (filters: TaskFilters) => [...tasksKeys.lists(), filters] as const,
  details: () => [...tasksKeys.all, 'detail'] as const,
  detail: (id: string) => [...tasksKeys.details(), id] as const,
  byStudent: (studentId: string) => [...tasksKeys.all, 'byStudent', studentId] as const,
  byResolved: (isResolved: boolean) => [...tasksKeys.all, 'byResolved', isResolved] as const,
};

// ============================================================================
// TYPES
// ============================================================================

export interface TaskFilters {
  studentId?: string;
  isResolved?: boolean;
  createdBy?: string;
  limit?: number;
  cursor?: string;
}

export interface TaskData {
  id: string;
  studentId: string;
  title: string;
  description: string;
  taskType: string;
  priority: string;
  status: string;
  dueDate?: string;
  isResolved: boolean;
  [key: string]: unknown;
}

export interface TaskResponse {
  success: boolean;
  data: TaskData[];
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

async function fetchTasks(
  filters: TaskFilters,
  token: string
): Promise<TaskResponse> {
  const params = new URLSearchParams();

  if (filters.studentId) params.append('studentId', filters.studentId);
  if (filters.isResolved !== undefined) params.append('isResolved', filters.isResolved.toString());
  if (filters.createdBy) params.append('createdBy', filters.createdBy);
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.cursor) params.append('cursor', filters.cursor);

  const response = await apiCircuitBreaker.execute(async () => {
    return fetchWithRetry(`/api/tasks-mv?${params.toString()}`, {
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
 * Hook para listar tarefas (com MV)
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useTasks({ isResolved: false });
 * ```
 */
export function useTasks(filters: TaskFilters = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: tasksKeys.list(filters),
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();
      return fetchTasks(filters, token);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para tarefas de um estudante específico
 */
export function useStudentTasks(studentId: string, isResolved?: boolean) {
  const { user } = useAuth();

  return useQuery({
    queryKey: tasksKeys.byStudent(studentId),
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();
      return fetchTasks({ studentId, isResolved }, token);
    },
    enabled: !!user && !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para tarefas abertas/fechadas
 */
export function useTasksByStatus(isResolved: boolean) {
  const { user } = useAuth();

  return useQuery({
    queryKey: tasksKeys.byResolved(isResolved),
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();
      return fetchTasks({ isResolved }, token);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para criar tarefa
 */
export interface CreateTaskInput {
  studentId: string;
  title: string;
  description: string;
  taskType: string;
  priority?: string;
  status?: string;
  dueDate?: string;
  metadata?: Record<string, unknown>;
}

export function useCreateTask() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskData: CreateTaskInput) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar tarefa');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() });
      if (variables.studentId) {
        queryClient.invalidateQueries({ queryKey: tasksKeys.byStudent(variables.studentId) });
      }
    },
  });
}

/**
 * Hook para atualizar tarefa (resolver/reabrir)
 */
export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id: string;
  isResolved?: boolean;
  actionTaken?: string;
}

export function useUpdateTask() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...taskData }: UpdateTaskInput) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar tarefa');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() });
    },
  });
}

/**
 * Hook para deletar tarefa
 */
export function useDeleteTask() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao deletar tarefa');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}
