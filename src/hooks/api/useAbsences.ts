/**
 * Hook: useAbsences
 *
 * Consome a API REST /api/absences
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PaginatedResponse, ApiResponse } from './useStudents';

// ============================================================================
// TYPES
// ============================================================================

export interface Absence {
  id: string;
  student_id: string;
  absence_date: string;
  bimester?: string | null;
  is_justified: boolean;
  medical_certificate_id?: string | null;
  suspension_id?: string | null;
  created_at: string;
}

export interface AbsenceFilters {
  estudanteId?: string;
  bimestre?: string;
  justificada?: boolean;
  dataInicio?: string;
  dataFim?: string;
  turma?: string;
  page?: number;
  limit?: number;
}

export interface BulkAbsenceResult {
  success: boolean;
  data: {
    inserted: number;
    skipped: number;
    total: number;
    insertedIds: string[];
    skippedDates?: string[];
  };
  message: string;
}

// ============================================================================
// HOOK: useAbsences (GET with filters)
// ============================================================================

export function useAbsences(filters?: AbsenceFilters) {
  const { user } = useAuth();
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const fetchAbsences = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // ✅ GUARD: Não buscar todas as faltas quando não há estudante selecionado
    // Se filters.estudanteId for undefined/empty, retorna vazio ao invés de buscar TUDO
    if (!filters?.estudanteId) {
      setAbsences([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.estudanteId) params.append('estudanteId', filters.estudanteId);
      if (filters?.bimestre) params.append('bimestre', filters.bimestre);
      if (filters?.justificada !== undefined) params.append('justificada', filters.justificada.toString());
      if (filters?.dataInicio) params.append('dataInicio', filters.dataInicio);
      if (filters?.dataFim) params.append('dataFim', filters.dataFim);
      if (filters?.turma) params.append('turma', filters.turma);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const token = await user.getIdToken();

      const response = await fetch(`/api/absences?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[useAbsences] ❌ Error response:', errorData);
        throw new Error(errorData.error || 'Erro ao buscar faltas');
      }

      const data: PaginatedResponse<Absence> = await response.json();

      setAbsences(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error('[useAbsences] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, filters?.estudanteId, filters?.bimestre, filters?.justificada, filters?.dataInicio, filters?.dataFim, filters?.turma, filters?.page, filters?.limit]);

  useEffect(() => {
    fetchAbsences();
  }, [fetchAbsences]);

  return {
    absences,
    loading,
    error,
    pagination,
    refetch: fetchAbsences,
  };
}

// ============================================================================
// HOOK: useAbsence (GET by ID)
// ============================================================================

export function useAbsence(id: string | null) {
  const { user } = useAuth();
  const [absence, setAbsence] = useState<Absence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAbsence = useCallback(async () => {
    if (!user || !id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();

      const response = await fetch(`/api/absences/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar falta');
      }

      const data: ApiResponse<{ absence: Absence }> = await response.json();
      setAbsence(data.data?.absence || null);
    } catch (err) {
      console.error('[useAbsence] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    fetchAbsence();
  }, [fetchAbsence]);

  return {
    absence,
    loading,
    error,
    refetch: fetchAbsence,
  };
}

// ============================================================================
// MUTATION: useCreateAbsence (POST)
// ============================================================================

export function useCreateAbsence() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAbsence = useCallback(async (absenceData: any) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      setLoading(true);
      setError(null);

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
        throw new Error(errorData.error || 'Erro ao criar falta');
      }

      const data: ApiResponse<{ id: string }> = await response.json();
      return data.data;
    } catch (err) {
      console.error('[useCreateAbsence] Error:', err);
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    createAbsence,
    loading,
    error,
  };
}

// ============================================================================
// MUTATION: useCreateBulkAbsences (POST /api/absences/bulk)
// ============================================================================

export function useCreateBulkAbsences() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBulkAbsences = useCallback(async (bulkData: { estudanteId: string; datas: string[] }) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();

      const response = await fetch('/api/absences/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bulkData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar faltas em lote');
      }

      const data: BulkAbsenceResult = await response.json();
      return data.data;
    } catch (err) {
      console.error('[useCreateBulkAbsences] Error:', err);
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    createBulkAbsences,
    loading,
    error,
  };
}

// ============================================================================
// MUTATION: useUpdateAbsence (PUT)
// ============================================================================

export function useUpdateAbsence() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateAbsence = useCallback(async (id: string, absenceData: any) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();

      const response = await fetch(`/api/absences/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(absenceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar falta');
      }

      const data: ApiResponse<{ id: string; updated: boolean }> = await response.json();
      return data.data;
    } catch (err) {
      console.error('[useUpdateAbsence] Error:', err);
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    updateAbsence,
    loading,
    error,
  };
}

// ============================================================================
// MUTATION: useDeleteAbsence (DELETE)
// ============================================================================

export function useDeleteAbsence() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAbsence = useCallback(async (id: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();

      const response = await fetch(`/api/absences/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao deletar falta');
      }

      const data: ApiResponse<{ id: string; deleted: boolean }> = await response.json();
      return data.data;
    } catch (err) {
      console.error('[useDeleteAbsence] Error:', err);
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    deleteAbsence,
    loading,
    error,
  };
}
