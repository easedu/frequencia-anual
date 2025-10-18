/**
 * Hooks: useTasks
 *
 * Hooks para gerenciamento de tarefas (user_tasks)
 * Consume API /api/tasks (taskService.ts refatorado no Sprint 2)
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PaginatedResponse } from './useStudents';

// ============================================================================
// TYPES
// ============================================================================

export interface UserTask {
  id: string;
  student_id: string;
  student_name?: string;
  title: string;
  description: string;
  task_type:
    | 'CONTACT_FAMILY'
    | 'FOLLOW_UP'
    | 'DOCUMENT_REQUEST'
    | 'MEETING'
    | 'HOME_VISIT'
    | 'CONSELHO_TUTELAR'
    | 'ADMINISTRATIVE'
    | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  due_date: string | null;
  assigned_to: string | null;
  assigned_to_name?: string | null;
  created_by: string;
  created_by_name?: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_by_name?: string | null;
  action_taken: string | null;
  notes: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface TaskFilters {
  student_id?: string;
  is_resolved?: boolean;
  created_by?: string;
  assigned_to?: string;
  task_type?: UserTask['task_type'];
  priority?: UserTask['priority'];
  status?: UserTask['status'];
  due_date_start?: string;
  due_date_end?: string;
  page?: number;
  limit?: number;
}

export interface CreateTaskData {
  student_id: string;
  title: string;
  description: string;
  task_type: UserTask['task_type'];
  priority?: UserTask['priority'];
  status?: UserTask['status'];
  due_date?: string | null;
  assigned_to?: string | null;
  notes?: string | null;
  metadata?: Record<string, any> | null;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  task_type?: UserTask['task_type'];
  priority?: UserTask['priority'];
  status?: UserTask['status'];
  due_date?: string | null;
  assigned_to?: string | null;
  is_resolved?: boolean;
  action_taken?: string | null;
  notes?: string | null;
  metadata?: Record<string, any> | null;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para buscar tarefas com filtros e paginação
 *
 * @example
 * const { tasks, loading, error, pagination, refetch } = useTasks({
 *   student_id: 'uuid-123',
 *   is_resolved: false,
 *   page: 1,
 *   limit: 20
 * });
 */
export function useTasks(filters?: TaskFilters) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.student_id) params.append('student_id', filters.student_id);
      if (filters?.is_resolved !== undefined)
        params.append('is_resolved', filters.is_resolved.toString());
      if (filters?.created_by) params.append('created_by', filters.created_by);
      if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to);
      if (filters?.task_type) params.append('task_type', filters.task_type);
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.due_date_start) params.append('due_date_start', filters.due_date_start);
      if (filters?.due_date_end) params.append('due_date_end', filters.due_date_end);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const token = await user.getIdToken();
      const response = await fetch(`/api/tasks?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar tarefas');
      }

      const data: PaginatedResponse<UserTask> = await response.json();
      setTasks(data.data || []);
      setPagination({
        page: data.pagination?.page || 1,
        limit: data.pagination?.limit || 50,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0,
      });
    } catch (err) {
      console.error('[useTasks] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [
    user,
    filters?.student_id,
    filters?.is_resolved,
    filters?.created_by,
    filters?.assigned_to,
    filters?.task_type,
    filters?.priority,
    filters?.status,
    filters?.due_date_start,
    filters?.due_date_end,
    filters?.page,
    filters?.limit,
  ]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, pagination, refetch: fetchTasks };
}

/**
 * Hook para buscar uma tarefa específica por ID
 *
 * @example
 * const { task, loading, error, refetch } = useTask('task-uuid-123');
 */
export function useTask(taskId: string | null) {
  const { user } = useAuth();
  const [task, setTask] = useState<UserTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTask = useCallback(async () => {
    if (!user || !taskId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const response = await fetch(`/api/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        setTask(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar tarefa');
      }

      const data = await response.json();
      setTask(data.data);
    } catch (err) {
      console.error('[useTask] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  return { task, loading, error, refetch: fetchTask };
}

/**
 * Hook para criar uma nova tarefa
 *
 * @example
 * const { createTask, loading, error } = useCreateTask();
 *
 * const newTask = await createTask({
 *   student_id: 'uuid-123',
 *   title: 'Contatar responsável',
 *   description: 'Estudante com 15 faltas consecutivas',
 *   task_type: 'CONTACT_FAMILY',
 *   priority: 'HIGH',
 *   due_date: '2025-10-20'
 * });
 */
export function useCreateTask() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTask = useCallback(
    async (data: CreateTaskData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao criar tarefa');
        }

        const result = await response.json();
        return result.data as UserTask;
      } catch (err) {
        console.error('[useCreateTask] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { createTask, loading, error };
}

/**
 * Hook para atualizar uma tarefa existente
 *
 * @example
 * const { updateTask, loading, error } = useUpdateTask();
 *
 * await updateTask('task-uuid-123', {
 *   status: 'COMPLETED',
 *   is_resolved: true,
 *   action_taken: 'Responsável contatado por telefone'
 * });
 */
export function useUpdateTask() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTask = useCallback(
    async (taskId: string, data: UpdateTaskData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao atualizar tarefa');
        }

        const result = await response.json();
        return result.data as UserTask;
      } catch (err) {
        console.error('[useUpdateTask] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { updateTask, loading, error };
}

/**
 * Hook para deletar uma tarefa
 *
 * @example
 * const { deleteTask, loading, error } = useDeleteTask();
 *
 * await deleteTask('task-uuid-123');
 */
export function useDeleteTask() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteTask = useCallback(
    async (taskId: string) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao deletar tarefa');
        }

        const result = await response.json();
        return result.data;
      } catch (err) {
        console.error('[useDeleteTask] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { deleteTask, loading, error };
}

/**
 * Hook para marcar uma tarefa como resolvida
 *
 * @example
 * const { markTaskAsResolved, loading, error } = useMarkTaskAsResolved();
 *
 * await markTaskAsResolved('task-uuid-123', 'Contato realizado com sucesso');
 */
export function useMarkTaskAsResolved() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markTaskAsResolved = useCallback(
    async (taskId: string, actionTaken?: string) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_resolved: true,
            status: 'COMPLETED',
            action_taken: actionTaken || null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao marcar tarefa como resolvida');
        }

        const result = await response.json();
        return result.data as UserTask;
      } catch (err) {
        console.error('[useMarkTaskAsResolved] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { markTaskAsResolved, loading, error };
}

/**
 * Hook para atribuir uma tarefa a um usuário
 *
 * @example
 * const { assignTask, loading, error } = useAssignTask();
 *
 * await assignTask('task-uuid-123', 'user-uuid-456');
 */
export function useAssignTask() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignTask = useCallback(
    async (taskId: string, assignToUserId: string) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assigned_to: assignToUserId,
            status: 'IN_PROGRESS',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao atribuir tarefa');
        }

        const result = await response.json();
        return result.data as UserTask;
      } catch (err) {
        console.error('[useAssignTask] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { assignTask, loading, error };
}
