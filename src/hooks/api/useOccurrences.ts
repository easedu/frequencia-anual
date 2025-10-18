/**
 * Hooks: useOccurrences
 *
 * Hooks para gerenciamento de ocorrências disciplinares (student_occurrences)
 * Consume API /api/occurrences (studentOccurrencesService.ts refatorado no Sprint 2)
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PaginatedResponse } from './useStudents';

// ============================================================================
// TYPES
// ============================================================================

export type OccurrenceSeverity = 'LEVE' | 'MODERADA' | 'GRAVE';

export type OccurrenceType =
  | 'DISCIPLINAR'
  | 'COMPORTAMENTAL'
  | 'ACADEMICA'
  | 'FREQUENCIA'
  | 'INDISCIPLINA'
  | 'OUTRA';

export type NotificationMethod =
  | 'TELEFONE'
  | 'WHATSAPP'
  | 'PRESENCIAL'
  | 'CARTA'
  | 'EMAIL'
  | 'OUTRA';

export interface StudentOccurrence {
  id: string;
  student_id: string;
  student_name?: string;
  occurrence_date: string;
  occurrence_type: OccurrenceType;
  severity: OccurrenceSeverity;
  description: string;
  action_taken: string | null;
  family_notified: boolean;
  notification_date: string | null;
  notification_method: NotificationMethod | null;
  follow_up_required: boolean;
  follow_up_notes: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_by_name?: string | null;
  reported_by: string;
  reported_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OccurrenceFilters {
  student_id?: string;
  occurrence_type?: OccurrenceType;
  severity?: OccurrenceSeverity;
  resolved?: boolean;
  family_notified?: boolean;
  follow_up_required?: boolean;
  occurrence_date_start?: string;
  occurrence_date_end?: string;
  page?: number;
  limit?: number;
}

export interface CreateOccurrenceData {
  student_id: string;
  occurrence_date: string;
  occurrence_type: OccurrenceType;
  severity: OccurrenceSeverity;
  description: string;
  action_taken?: string | null;
  family_notified?: boolean;
  notification_date?: string | null;
  notification_method?: NotificationMethod | null;
  follow_up_required?: boolean;
  follow_up_notes?: string | null;
}

export interface UpdateOccurrenceData {
  occurrence_date?: string;
  occurrence_type?: OccurrenceType;
  severity?: OccurrenceSeverity;
  description?: string;
  action_taken?: string | null;
  family_notified?: boolean;
  notification_date?: string | null;
  notification_method?: NotificationMethod | null;
  follow_up_required?: boolean;
  follow_up_notes?: string | null;
  resolved?: boolean;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para buscar ocorrências com filtros e paginação
 *
 * @example
 * const { occurrences, loading, error, pagination, refetch } = useOccurrences({
 *   student_id: 'uuid-123',
 *   severity: 'GRAVE',
 *   resolved: false
 * });
 */
export function useOccurrences(filters?: OccurrenceFilters) {
  const { user } = useAuth();
  const [occurrences, setOccurrences] = useState<StudentOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const fetchOccurrences = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.student_id) params.append('student_id', filters.student_id);
      if (filters?.occurrence_type) params.append('occurrence_type', filters.occurrence_type);
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.resolved !== undefined)
        params.append('resolved', filters.resolved.toString());
      if (filters?.family_notified !== undefined)
        params.append('family_notified', filters.family_notified.toString());
      if (filters?.follow_up_required !== undefined)
        params.append('follow_up_required', filters.follow_up_required.toString());
      if (filters?.occurrence_date_start)
        params.append('occurrence_date_start', filters.occurrence_date_start);
      if (filters?.occurrence_date_end)
        params.append('occurrence_date_end', filters.occurrence_date_end);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const token = await user.getIdToken();
      const response = await fetch(`/api/occurrences?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar ocorrências');
      }

      const data: PaginatedResponse<StudentOccurrence> = await response.json();
      setOccurrences(data.data || []);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('[useOccurrences] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [
    user,
    filters?.student_id,
    filters?.occurrence_type,
    filters?.severity,
    filters?.resolved,
    filters?.family_notified,
    filters?.follow_up_required,
    filters?.occurrence_date_start,
    filters?.occurrence_date_end,
    filters?.page,
    filters?.limit,
  ]);

  useEffect(() => {
    fetchOccurrences();
  }, [fetchOccurrences]);

  return { occurrences, loading, error, pagination, refetch: fetchOccurrences };
}

/**
 * Hook para buscar uma ocorrência específica por ID
 *
 * @example
 * const { occurrence, loading, error, refetch } = useOccurrence('occurrence-uuid-123');
 */
export function useOccurrence(occurrenceId: string | null) {
  const { user } = useAuth();
  const [occurrence, setOccurrence] = useState<StudentOccurrence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOccurrence = useCallback(async () => {
    if (!user || !occurrenceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const response = await fetch(`/api/occurrences/${occurrenceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        setOccurrence(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar ocorrência');
      }

      const data = await response.json();
      setOccurrence(data.data);
    } catch (err) {
      console.error('[useOccurrence] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, occurrenceId]);

  useEffect(() => {
    fetchOccurrence();
  }, [fetchOccurrence]);

  return { occurrence, loading, error, refetch: fetchOccurrence };
}

/**
 * Hook para criar uma nova ocorrência
 *
 * @example
 * const { createOccurrence, loading, error } = useCreateOccurrence();
 *
 * const newOccurrence = await createOccurrence({
 *   student_id: 'uuid-123',
 *   occurrence_date: '2025-10-17',
 *   occurrence_type: 'INDISCIPLINA',
 *   severity: 'MODERADA',
 *   description: 'Estudante desrespeitou colega durante aula',
 *   action_taken: 'Conversa com coordenação',
 *   family_notified: true,
 *   notification_method: 'TELEFONE'
 * });
 */
export function useCreateOccurrence() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOccurrence = useCallback(
    async (data: CreateOccurrenceData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch('/api/occurrences', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao criar ocorrência');
        }

        const result = await response.json();
        return result.data as StudentOccurrence;
      } catch (err) {
        console.error('[useCreateOccurrence] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { createOccurrence, loading, error };
}

/**
 * Hook para atualizar uma ocorrência existente
 *
 * @example
 * const { updateOccurrence, loading, error } = useUpdateOccurrence();
 *
 * await updateOccurrence('occurrence-uuid-123', {
 *   resolved: true,
 *   action_taken: 'Reunião com família realizada'
 * });
 */
export function useUpdateOccurrence() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateOccurrence = useCallback(
    async (occurrenceId: string, data: UpdateOccurrenceData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch(`/api/occurrences/${occurrenceId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao atualizar ocorrência');
        }

        const result = await response.json();
        return result.data as StudentOccurrence;
      } catch (err) {
        console.error('[useUpdateOccurrence] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { updateOccurrence, loading, error };
}

/**
 * Hook para deletar uma ocorrência
 *
 * @example
 * const { deleteOccurrence, loading, error } = useDeleteOccurrence();
 *
 * await deleteOccurrence('occurrence-uuid-123');
 */
export function useDeleteOccurrence() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteOccurrence = useCallback(
    async (occurrenceId: string) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch(`/api/occurrences/${occurrenceId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao deletar ocorrência');
        }

        const result = await response.json();
        return result.data;
      } catch (err) {
        console.error('[useDeleteOccurrence] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { deleteOccurrence, loading, error };
}
