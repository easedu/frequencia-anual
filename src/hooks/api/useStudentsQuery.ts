/**
 * React Query Hooks para Students API
 *
 * OTIMIZAÇÃO: Cache automático, revalidation, prefetching
 * Substitui useStudents.ts legado (useState + useEffect)
 */

'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import type { DetailLevel } from '@/types/api-responses';

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Query keys factory para Students
 * Facilita invalidação e prefetching
 */
export const studentsKeys = {
  all: ['students'] as const,
  lists: () => [...studentsKeys.all, 'list'] as const,
  list: (filters: StudentFilters) => [...studentsKeys.lists(), filters] as const,
  details: () => [...studentsKeys.all, 'detail'] as const,
  detail: (id: string) => [...studentsKeys.details(), id] as const,
};

// ============================================================================
// TYPES
// ============================================================================

export interface StudentFilters {
  turma?: string;
  turno?: 'MANHÃ' | 'TARDE';
  status?: 'ATIVO' | 'INATIVO';
  bolsaFamilia?: 'SIM' | 'NÃO';
  estudanteComDeficiencia?: boolean;
  search?: string;
  detail?: DetailLevel;
  page?: number;
  limit?: number;
}

export interface PaginatedStudentsResponse {
  success: boolean;
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CursorPaginatedStudentsResponse {
  success: boolean;
  data: any[];
  pagination: {
    limit: number;
    total?: number;
    hasNextPage: boolean;
    nextCursor: string | null;
  };
}

// ============================================================================
// FETCHER FUNCTIONS
// ============================================================================

/**
 * Fetcher genérico com autenticação
 */
async function fetchWithAuth(url: string, token: string) {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch lista de estudantes (paginação tradicional)
 */
async function fetchStudents(
  filters: StudentFilters,
  token: string
): Promise<PaginatedStudentsResponse> {
  const params = new URLSearchParams();

  if (filters.turma) params.append('turma', filters.turma);
  if (filters.turno) params.append('turno', filters.turno);
  if (filters.status) params.append('status', filters.status);
  if (filters.bolsaFamilia) params.append('bolsaFamilia', filters.bolsaFamilia);
  if (filters.estudanteComDeficiencia !== undefined) {
    params.append('estudanteComDeficiencia', filters.estudanteComDeficiencia.toString());
  }
  if (filters.search) params.append('search', filters.search);
  if (filters.detail) params.append('detail', filters.detail);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());

  return fetchWithAuth(`/api/students?${params.toString()}`, token);
}

/**
 * Fetch estudante único por ID
 */
async function fetchStudent(id: string, token: string, detail: DetailLevel = 'full') {
  return fetchWithAuth(`/api/students/${id}?detail=${detail}`, token);
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para listar estudantes (paginação tradicional)
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useStudents({
 *   status: 'ATIVO',
 *   detail: 'minimal',
 *   page: 1,
 *   limit: 50
 * });
 * ```
 */
export function useStudents(filters: StudentFilters = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: studentsKeys.list(filters),
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();
      return fetchStudents(filters, token);
    },
    enabled: !!user,
    // Cache config já vem do QueryProvider global
  });
}

/**
 * Hook para buscar estudante único
 *
 * @example
 * ```tsx
 * const { data: student, isLoading } = useStudent(estudanteId, 'detailed');
 * ```
 */
export function useStudent(id: string, detail: DetailLevel = 'full') {
  const { user } = useAuth();

  return useQuery({
    queryKey: studentsKeys.detail(id),
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();
      return fetchStudent(id, token, detail);
    },
    enabled: !!user && !!id,
  });
}

/**
 * Hook para infinite scroll (Fase 2 - cursor-based pagination)
 *
 * @example
 * ```tsx
 * const {
 *   data,
 *   fetchNextPage,
 *   hasNextPage,
 *   isFetchingNextPage
 * } = useInfiniteStudents({ status: 'ATIVO' });
 * ```
 */
export function useInfiniteStudents(filters: Omit<StudentFilters, 'page' | 'limit'> = {}) {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: [...studentsKeys.lists(), 'infinite', filters],
    queryFn: async ({ pageParam = null }) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      const params = new URLSearchParams();
      if (filters.turma) params.append('turma', filters.turma);
      if (filters.turno) params.append('turno', filters.turno);
      if (filters.status) params.append('status', filters.status);
      if (filters.bolsaFamilia) params.append('bolsaFamilia', filters.bolsaFamilia);
      if (filters.search) params.append('search', filters.search);
      if (filters.detail) params.append('detail', filters.detail);
      params.append('limit', '50');

      // ✅ OTIMIZAÇÃO Fase 2: cursor-based pagination
      if (pageParam) {
        params.append('cursor', pageParam);
      }

      return fetchWithAuth(`/api/students?${params.toString()}`, token) as Promise<CursorPaginatedStudentsResponse>;
    },
    getNextPageParam: (lastPage) => {
      // Fase 2: retornar nextCursor
      return lastPage.pagination.hasNextPage ? lastPage.pagination.nextCursor : undefined;
    },
    initialPageParam: null,
    enabled: !!user,
  });
}

/**
 * Hook para criar estudante
 *
 * @example
 * ```tsx
 * const createStudent = useCreateStudent();
 *
 * await createStudent.mutateAsync({
 *   nome: 'João Silva',
 *   turma: '5A',
 *   // ...
 * });
 * ```
 */
export function useCreateStudent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studentData: any) => {
      if (!user) throw new Error('Usuário não autenticado');
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
        throw new Error(errorData.message || 'Erro ao criar estudante');
      }

      return response.json();
    },
    onSuccess: () => {
      // ✅ Invalidar cache de listagens após criar
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() });
    },
  });
}

/**
 * Hook para atualizar estudante
 *
 * @example
 * ```tsx
 * const updateStudent = useUpdateStudent();
 *
 * await updateStudent.mutateAsync({
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   nome: 'João Silva Atualizado',
 * });
 * ```
 */
export function useUpdateStudent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...studentData }: any) => {
      if (!user) throw new Error('Usuário não autenticado');
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
        throw new Error(errorData.message || 'Erro ao atualizar estudante');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // ✅ Invalidar cache específico + listagens
      queryClient.invalidateQueries({ queryKey: studentsKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() });
    },
  });
}

/**
 * Hook para deletar estudante (soft delete)
 *
 * @example
 * ```tsx
 * const deleteStudent = useDeleteStudent();
 *
 * await deleteStudent.mutateAsync('550e8400-e29b-41d4-a716-446655440000');
 * ```
 */
export function useDeleteStudent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      const token = await user.getIdToken();

      const response = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao deletar estudante');
      }

      return response.json();
    },
    onSuccess: (data, id) => {
      // ✅ Invalidar cache
      queryClient.invalidateQueries({ queryKey: studentsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() });
    },
  });
}

// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

/**
 * Prefetch lista de estudantes (útil para otimizar navegação)
 *
 * @example
 * ```tsx
 * const queryClient = useQueryClient();
 * prefetchStudents(queryClient, { status: 'ATIVO' });
 * ```
 */
export async function prefetchStudents(
  queryClient: any,
  filters: StudentFilters,
  user: any
) {
  if (!user) return;

  const token = await user.getIdToken();

  await queryClient.prefetchQuery({
    queryKey: studentsKeys.list(filters),
    queryFn: () => fetchStudents(filters, token),
  });
}

/**
 * Prefetch estudante específico
 */
export async function prefetchStudent(
  queryClient: any,
  id: string,
  user: any,
  detail: DetailLevel = 'full'
) {
  if (!user) return;

  const token = await user.getIdToken();

  await queryClient.prefetchQuery({
    queryKey: studentsKeys.detail(id),
    queryFn: () => fetchStudent(id, token, detail),
  });
}
