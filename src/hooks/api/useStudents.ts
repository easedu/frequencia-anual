/**
 * Hook: useStudents
 *
 * Consome a API REST /api/students (não Supabase direto)
 * Substitui chamadas diretas ao supabase.from('students')
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchAllPages } from '@/utils/paginationHelper';

// ============================================================================
// TYPES
// ============================================================================

export interface Student {
  id: string;
  student_id: string;
  name: string;
  class: string;
  shift: 'MANHÃ' | 'TARDE';
  status: 'ATIVO' | 'INATIVO' | 'TRANSFERIDO';
  birth_date?: string | null;
  school_year: string;
  registration_number?: string | null;
  bolsa_familia?: 'SIM' | 'NÃO' | null;
  address?: Record<string, any>;
  disabilities?: Array<Record<string, any>>;
  student_contacts?: Array<any>;
  created_at: string;
  updated_at: string;
}

export interface StudentFilters {
  turma?: string;
  turno?: 'MANHÃ' | 'TARDE';
  status?: 'ATIVO' | 'INATIVO' | 'TRANSFERIDO';
  bolsa_familia?: 'SIM' | 'NÃO';
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// HOOK: useStudents (GET with filters)
// ============================================================================

export function useStudents(filters?: StudentFilters) {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const fetchStudents = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 🔄 PAGINAÇÃO RECURSIVA: Se não há filtros específicos de página, carregar TODOS
      const shouldLoadAll = !filters?.page && !filters?.limit;

      if (shouldLoadAll) {
        const token = await user.getIdToken();

        const allLoadedStudents = await fetchAllPages<Student>({
          baseUrl: '/api/students',
          token,
          filters: {
            turma: filters?.turma,
            turno: filters?.turno,
            status: filters?.status,
            bolsaFamilia: filters?.bolsa_familia, // ✅ API espera camelCase
            search: filters?.search,
          },
          resourceName: 'estudantes'
        });

        setStudents(allLoadedStudents);
        setPagination({
          page: 1,
          limit: allLoadedStudents.length,
          total: allLoadedStudents.length,
          totalPages: 1
        });
      } else {
        // Carregamento normal (com página específica)
        const params = new URLSearchParams();
        if (filters?.turma) params.append('turma', filters.turma);
        if (filters?.turno) params.append('turno', filters.turno);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.bolsa_familia) params.append('bolsaFamilia', filters.bolsa_familia); // ✅ API espera camelCase
        if (filters?.search) params.append('search', filters.search);
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());

        const token = await user.getIdToken();

        const response = await fetch(`/api/students?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao buscar estudantes');
        }

        const data: PaginatedResponse<Student> = await response.json();

        setStudents(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('[useStudents] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, filters?.turma, filters?.turno, filters?.status, filters?.bolsa_familia, filters?.search, filters?.page, filters?.limit]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return {
    students,
    loading,
    error,
    pagination,
    refetch: fetchStudents,
  };
}

// ============================================================================
// HOOK: useStudent (GET by ID)
// ============================================================================

export function useStudent(id: string | null) {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudent = useCallback(async () => {
    if (!user || !id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();

      const response = await fetch(`/api/students/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar estudante');
      }

      const data: ApiResponse<{ student: Student }> = await response.json();
      setStudent(data.data?.student || null);
    } catch (err) {
      console.error('[useStudent] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  return {
    student,
    loading,
    error,
    refetch: fetchStudent,
  };
}

// ============================================================================
// MUTATION: useCreateStudent (POST)
// ============================================================================

export function useCreateStudent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createStudent = useCallback(async (studentData: any) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();

      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar estudante');
      }

      const data: ApiResponse<{ id: string }> = await response.json();
      return data.data;
    } catch (err) {
      console.error('[useCreateStudent] Error:', err);
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    createStudent,
    loading,
    error,
  };
}

// ============================================================================
// MUTATION: useUpdateStudent (PUT)
// ============================================================================

export function useUpdateStudent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStudent = useCallback(async (id: string, studentData: any) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();

      const response = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar estudante');
      }

      const data: ApiResponse<{ id: string; updated: boolean }> = await response.json();
      return data.data;
    } catch (err) {
      console.error('[useUpdateStudent] Error:', err);
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    updateStudent,
    loading,
    error,
  };
}

// ============================================================================
// MUTATION: useDeleteStudent (DELETE - soft delete)
// ============================================================================

export function useDeleteStudent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteStudent = useCallback(async (id: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();

      const response = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao deletar estudante');
      }

      const data: ApiResponse<{ id: string; deleted: boolean }> = await response.json();
      return data.data;
    } catch (err) {
      console.error('[useDeleteStudent] Error:', err);
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    deleteStudent,
    loading,
    error,
  };
}
