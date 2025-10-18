/**
 * Hooks: useAbsenceControl
 *
 * Hooks para gerenciamento de controle de faltas (absence_control)
 * Consume API /api/absence-control
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PaginatedResponse } from './useStudents';

// ============================================================================
// TYPES
// ============================================================================

export interface AbsenceControl {
  id: string;
  academic_year: number;
  bimester: number;
  school_days: number;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AbsenceControlFilters {
  academic_year: number;
  bimester?: number;
  page?: number;
  limit?: number;
}

export interface CreateAbsenceControlData {
  academic_year: number;
  bimester: number;
  school_days: number;
  start_date?: string;
  end_date?: string;
  notes?: string;
  created_by?: string;
}

export interface UpdateAbsenceControlData {
  school_days?: number;
  start_date?: string;
  end_date?: string;
  notes?: string;
  updated_by?: string;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para buscar controles de faltas (dias letivos por bimestre)
 *
 * @example
 * const { controls, loading, error, pagination, refetch } = useAbsenceControls({
 *   academic_year: 2025,
 *   bimester: 1
 * });
 */
export function useAbsenceControls(filters: AbsenceControlFilters) {
  const { user } = useAuth();
  const [controls, setControls] = useState<AbsenceControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
  });

  const fetchControls = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('academic_year', filters.academic_year.toString());
      if (filters.bimester) params.append('bimester', filters.bimester.toString());
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const token = await user.getIdToken();
      const response = await fetch(`/api/absence-control?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar controles de faltas');
      }

      const data: PaginatedResponse<AbsenceControl> = await response.json();
      setControls(data.data || []);
      setPagination(data.pagination || { page: 1, limit: 100, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('[useAbsenceControls] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, filters.academic_year, filters.bimester, filters.page, filters.limit]);

  useEffect(() => {
    fetchControls();
  }, [fetchControls]);

  return { controls, loading, error, pagination, refetch: fetchControls };
}

/**
 * Hook para buscar controle de faltas específico por ID
 *
 * @example
 * const { control, loading, error, refetch } = useAbsenceControl('control-uuid-123');
 */
export function useAbsenceControl(controlId: string | null) {
  const { user } = useAuth();
  const [control, setControl] = useState<AbsenceControl | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchControl = useCallback(async () => {
    if (!user || !controlId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const response = await fetch(`/api/absence-control/${controlId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        setControl(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar controle de faltas');
      }

      const data = await response.json();
      setControl(data.data);
    } catch (err) {
      console.error('[useAbsenceControl] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, controlId]);

  useEffect(() => {
    fetchControl();
  }, [fetchControl]);

  return { control, loading, error, refetch: fetchControl };
}

/**
 * Hook para buscar controle por ano e bimestre
 *
 * @example
 * const { control, loading, error, refetch } = useAbsenceControlByYearBimester(2025, 1);
 */
export function useAbsenceControlByYearBimester(year: number, bimester: number) {
  const { controls, loading, error, refetch } = useAbsenceControls({
    academic_year: year,
    bimester,
    limit: 1,
  });

  const control = controls.length > 0 ? controls[0] : null;

  return { control, loading, error, refetch };
}

/**
 * Hook para criar ou atualizar (upsert) controle de faltas
 *
 * @example
 * const { createOrUpdateControl, loading, error } = useCreateAbsenceControl();
 *
 * const newControl = await createOrUpdateControl({
 *   academic_year: 2025,
 *   bimester: 1,
 *   school_days: 50,
 *   start_date: '2025-02-01',
 *   end_date: '2025-04-30'
 * });
 */
export function useCreateAbsenceControl() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrUpdateControl = useCallback(
    async (data: CreateAbsenceControlData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch('/api/absence-control', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao criar/atualizar controle de faltas');
        }

        const result = await response.json();
        return result.data as AbsenceControl;
      } catch (err) {
        console.error('[useCreateAbsenceControl] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { createOrUpdateControl, loading, error };
}

/**
 * Hook para atualizar controle de faltas existente
 *
 * @example
 * const { updateControl, loading, error } = useUpdateAbsenceControl();
 *
 * await updateControl('control-uuid-123', {
 *   school_days: 52,
 *   notes: 'Ajustado após feriados'
 * });
 */
export function useUpdateAbsenceControl() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateControl = useCallback(
    async (controlId: string, data: UpdateAbsenceControlData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch(`/api/absence-control/${controlId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao atualizar controle de faltas');
        }

        const result = await response.json();
        return result.data as AbsenceControl;
      } catch (err) {
        console.error('[useUpdateAbsenceControl] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { updateControl, loading, error };
}

/**
 * Hook para deletar controle de faltas
 *
 * @example
 * const { deleteControl, loading, error } = useDeleteAbsenceControl();
 *
 * await deleteControl('control-uuid-123');
 */
export function useDeleteAbsenceControl() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteControl = useCallback(
    async (controlId: string) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch(`/api/absence-control/${controlId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao deletar controle de faltas');
        }

        const result = await response.json();
        return result.data;
      } catch (err) {
        console.error('[useDeleteAbsenceControl] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { deleteControl, loading, error };
}
