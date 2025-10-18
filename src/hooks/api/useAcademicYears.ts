/**
 * Hooks: useAcademicYears
 *
 * Hooks para gerenciamento de anos letivos (academic_years)
 * Consume API /api/academic-years
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PaginatedResponse } from './useStudents';

// ============================================================================
// TYPES
// ============================================================================

export interface AcademicYear {
  id: string;
  year: number;
  start_date: string;
  end_date: string;
  total_school_days: number;
  created_at: string;
  updated_at: string;
}

export interface AcademicYearFilters {
  year?: number;
  page?: number;
  limit?: number;
}

export interface CreateAcademicYearData {
  year: number;
  start_date: string;
  end_date: string;
  total_school_days: number;
}

export interface UpdateAcademicYearData {
  start_date?: string;
  end_date?: string;
  total_school_days?: number;
}

export interface CountSchoolDaysParams {
  start_date: string;
  end_date: string;
  year?: number;
}

export interface CountSchoolDaysResult {
  count: number;
  period: {
    start_date: string;
    end_date: string;
    year: number;
  };
}

export interface BimesterData {
  startDate: string; // dd/mm/yyyy
  endDate: string;   // dd/mm/yyyy
  dates: { date: string; isChecked: boolean }[];
}

export interface CompleteAcademicYearData {
  '1º Bimestre': BimesterData;
  '2º Bimestre': BimesterData;
  '3º Bimestre': BimesterData;
  '4º Bimestre': BimesterData;
}

export interface SaveCompleteAcademicYearData {
  year: number;
  bimesters: CompleteAcademicYearData;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para buscar anos letivos com filtros
 *
 * @example
 * const { academicYears, loading, error, pagination, refetch } = useAcademicYears({
 *   year: 2025
 * });
 */
export function useAcademicYears(filters?: AcademicYearFilters) {
  const { user } = useAuth();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
  });

  const fetchAcademicYears = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.year) params.append('year', filters.year.toString());
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const token = await user.getIdToken();
      const response = await fetch(`/api/academic-years?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar anos letivos');
      }

      const data: PaginatedResponse<AcademicYear> = await response.json();
      setAcademicYears(data.data || []);
      setPagination(data.pagination || { page: 1, limit: 100, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('[useAcademicYears] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, filters?.year, filters?.page, filters?.limit]);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  return { academicYears, loading, error, pagination, refetch: fetchAcademicYears };
}

/**
 * Hook para buscar ano letivo específico por ano
 *
 * @example
 * const { academicYear, loading, error, refetch } = useAcademicYear(2025);
 */
export function useAcademicYear(year: number | null) {
  const { user } = useAuth();
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAcademicYear = useCallback(async () => {
    if (!user || !year) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const response = await fetch(`/api/academic-years/${year}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        setAcademicYear(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar ano letivo');
      }

      const data = await response.json();
      setAcademicYear(data.data);
    } catch (err) {
      console.error('[useAcademicYear] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, year]);

  useEffect(() => {
    fetchAcademicYear();
  }, [fetchAcademicYear]);

  return { academicYear, loading, error, refetch: fetchAcademicYear };
}

/**
 * Hook para buscar o ano letivo atual (ano corrente)
 *
 * @example
 * const { currentYear, loading, error, refetch } = useCurrentAcademicYear();
 */
export function useCurrentAcademicYear() {
  const { user } = useAuth();
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentYear = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const response = await fetch('/api/academic-years/current', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        setCurrentYear(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar ano letivo atual');
      }

      const data = await response.json();
      setCurrentYear(data.data);
    } catch (err) {
      console.error('[useCurrentAcademicYear] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCurrentYear();
  }, [fetchCurrentYear]);

  return { currentYear, loading, error, refetch: fetchCurrentYear };
}

/**
 * Hook para criar ou atualizar (upsert) ano letivo
 *
 * @example
 * const { createOrUpdateYear, loading, error } = useCreateAcademicYear();
 *
 * const newYear = await createOrUpdateYear({
 *   year: 2025,
 *   start_date: '2025-02-01',
 *   end_date: '2025-12-20',
 *   total_school_days: 200
 * });
 */
export function useCreateAcademicYear() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrUpdateYear = useCallback(
    async (data: CreateAcademicYearData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch('/api/academic-years', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao criar/atualizar ano letivo');
        }

        const result = await response.json();
        return result.data as AcademicYear;
      } catch (err) {
        console.error('[useCreateAcademicYear] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { createOrUpdateYear, loading, error };
}

/**
 * Hook para atualizar ano letivo existente
 *
 * @example
 * const { updateYear, loading, error } = useUpdateAcademicYear();
 *
 * await updateYear(2025, {
 *   total_school_days: 205
 * });
 */
export function useUpdateAcademicYear() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateYear = useCallback(
    async (year: number, data: UpdateAcademicYearData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch(`/api/academic-years/${year}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao atualizar ano letivo');
        }

        const result = await response.json();
        return result.data as AcademicYear;
      } catch (err) {
        console.error('[useUpdateAcademicYear] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { updateYear, loading, error };
}

/**
 * Hook para deletar ano letivo
 *
 * ⚠️ ATENÇÃO: Deleta também bimesters e school_days relacionados (cascade)
 *
 * @example
 * const { deleteYear, loading, error } = useDeleteAcademicYear();
 *
 * await deleteYear(2025);
 */
export function useDeleteAcademicYear() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteYear = useCallback(
    async (year: number) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch(`/api/academic-years/${year}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao deletar ano letivo');
        }

        const result = await response.json();
        return result.data;
      } catch (err) {
        console.error('[useDeleteAcademicYear] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { deleteYear, loading, error };
}

/**
 * Hook para contar dias letivos em um período específico
 *
 * @example
 * const { count, loading, error, refetch } = useCountSchoolDays({
 *   start_date: '2025-02-01',
 *   end_date: '2025-04-30',
 *   year: 2025
 * });
 */
export function useCountSchoolDays(params: CountSchoolDaysParams | null) {
  const { user } = useAuth();
  const [result, setResult] = useState<CountSchoolDaysResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCount = useCallback(async () => {
    if (!user || !params) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      queryParams.append('start_date', params.start_date);
      queryParams.append('end_date', params.end_date);
      if (params.year) queryParams.append('year', params.year.toString());

      const token = await user.getIdToken();
      const response = await fetch(
        `/api/academic-years/count-school-days?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao contar dias letivos');
      }

      const data = await response.json();
      setResult(data.data);
    } catch (err) {
      console.error('[useCountSchoolDays] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, params?.start_date, params?.end_date, params?.year]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return {
    count: result?.count ?? 0,
    period: result?.period,
    loading,
    error,
    refetch: fetchCount,
  };
}

// ============================================================================
// HOOKS - OPERAÇÕES COMPLEXAS (Complete Academic Year)
// ============================================================================

/**
 * Hook para buscar ano letivo completo (bimestres + dias letivos)
 * Formato compatível com a página cadastrar-ano-letivo
 *
 * @example
 * const { academicYearComplete, loading, error, refetch } = useAcademicYearComplete(2025);
 */
export function useAcademicYearComplete(year: number | null) {
  const { user } = useAuth();
  const [academicYearComplete, setAcademicYearComplete] = useState<CompleteAcademicYearData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComplete = useCallback(async () => {
    if (!user || !year) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const response = await fetch(
        `/api/academic-years/complete?year=${year}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar ano letivo completo');
      }

      const data = await response.json();

      // Se o objeto está vazio, definir como null
      const isEmpty = Object.keys(data.data || {}).length === 0;
      setAcademicYearComplete(isEmpty ? null : data.data);
    } catch (err) {
      console.error('[useAcademicYearComplete] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, year]);

  useEffect(() => {
    fetchComplete();
  }, [fetchComplete]);

  return {
    academicYearComplete,
    loading,
    error,
    refetch: fetchComplete,
  };
}

/**
 * Hook para salvar ano letivo completo (academic_years + bimesters + school_days + absence_control)
 *
 * @example
 * const { saveComplete, loading, error } = useSaveAcademicYearComplete();
 *
 * await saveComplete({
 *   year: 2025,
 *   bimesters: {
 *     '1º Bimestre': { startDate: '01/02/2025', endDate: '30/04/2025', dates: [...] },
 *     ...
 *   }
 * });
 */
export function useSaveAcademicYearComplete() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveComplete = useCallback(
    async (data: SaveCompleteAcademicYearData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch('/api/academic-years/complete', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao salvar ano letivo completo');
        }

        const result = await response.json();
        return result.data;
      } catch (err) {
        console.error('[useSaveAcademicYearComplete] Error:', err);
        const errorMessage = (err as Error).message;
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return {
    saveComplete,
    loading,
    error,
  };
}
