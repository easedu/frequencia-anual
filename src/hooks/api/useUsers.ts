/**
 * Hooks: useUsers
 *
 * Hooks para gerenciamento de perfis de usuários (users)
 * Consume API /api/users (userProfilesService.ts refatorado no Sprint 2)
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PaginatedResponse } from './useStudents';

// ============================================================================
// TYPES
// ============================================================================

export type UserRole = 'ADMIN' | 'USER' | 'SUPER-USER' | 'USER-PCD';

// Mapeamento entre roles do sistema e Supabase
export const ROLE_MAPPING = {
  admin: 'ADMIN' as UserRole,
  user: 'USER' as UserRole,
  teacher: 'USER' as UserRole,
  'super-user': 'SUPER-USER' as UserRole,
  'user-pcd': 'USER-PCD' as UserRole,
};

export interface UserMetadataFields {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  notifications?: boolean;
  preferences?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface UserProfile {
  id: string;
  firebase_uid: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
  metadata: UserMetadataFields | null;
  created_at: string;
  updated_at: string;
}

export interface UserFilters {
  firebase_uid?: string;
  email?: string;
  role?: UserRole;
  is_active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateUserData {
  firebase_uid: string;
  email: string;
  display_name?: string | null;
  role?: UserRole;
  is_active?: boolean;
  metadata?: UserMetadataFields | null;
}

export interface UpdateUserData {
  display_name?: string | null;
  role?: UserRole;
  is_active?: boolean;
  last_login_at?: string | null;
  metadata?: UserMetadataFields | null;
}

export interface UserMetadata {
  theme?: 'light' | 'dark' | 'system';
  favorites?: string[];
  preferences?: Record<string, unknown>;
  [key: string]: unknown;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para buscar usuários com filtros e paginação
 *
 * @example
 * const { users, loading, error, pagination, refetch } = useUsers({
 *   role: 'ADMIN',
 *   is_active: true,
 *   page: 1,
 *   limit: 20
 * });
 */
export function useUsers(filters?: UserFilters) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const fetchUsers = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.firebase_uid) params.append('firebase_uid', filters.firebase_uid);
      if (filters?.email) params.append('email', filters.email);
      if (filters?.role) params.append('role', filters.role);
      if (filters?.is_active !== undefined)
        params.append('is_active', filters.is_active.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const token = await user.getIdToken();
      const response = await fetch(`/api/users?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar usuários');
      }

      const data: PaginatedResponse<UserProfile> = await response.json();
      setUsers(data.data || []);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('[useUsers] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [
    user,
    filters?.firebase_uid,
    filters?.email,
    filters?.role,
    filters?.is_active,
    filters?.search,
    filters?.page,
    filters?.limit,
  ]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, error, pagination, refetch: fetchUsers };
}

/**
 * Hook para buscar um usuário por Firebase UID
 *
 * @example
 * const { userProfile, loading, error, refetch } = useUserByFirebaseUid('firebase-uid-123');
 */
export function useUserByFirebaseUid(firebaseUid: string | null) {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    if (!user || !firebaseUid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const response = await fetch(`/api/users/by-firebase-uid?uid=${firebaseUid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar usuário');
      }

      const data = await response.json();
      setUserProfile(data.data);
    } catch (err) {
      console.error('[useUserByFirebaseUid] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, firebaseUid]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  return { userProfile, loading, error, refetch: fetchUserProfile };
}

/**
 * Hook para buscar o perfil do usuário logado
 *
 * @example
 * const { currentUserProfile, loading, error, refetch } = useCurrentUserProfile();
 */
export function useCurrentUserProfile() {
  const { user } = useAuth();
  return useUserByFirebaseUid(user?.uid || null);
}

/**
 * Hook para buscar usuário por email
 *
 * @example
 * const { userProfile, loading, error, refetch } = useUserByEmail('usuario@exemplo.com');
 */
export function useUserByEmail(email: string | null) {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchByEmail = useCallback(async () => {
    if (!user || !email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const response = await fetch(`/api/users/by-email?email=${encodeURIComponent(email)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar usuário');
      }

      const data = await response.json();
      setUserProfile(data.data);
    } catch (err) {
      console.error('[useUserByEmail] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, email]);

  useEffect(() => {
    fetchByEmail();
  }, [fetchByEmail]);

  return { userProfile, loading, error, refetch: fetchByEmail };
}

/**
 * Hook para criar um novo usuário
 *
 * @example
 * const { createUser, loading, error } = useCreateUser();
 *
 * const newUser = await createUser({
 *   firebase_uid: 'firebase-uid-123',
 *   email: 'usuario@exemplo.com',
 *   display_name: 'João Silva',
 *   role: 'USER',
 *   is_active: true
 * });
 */
export function useCreateUser() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUser = useCallback(
    async (data: CreateUserData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch('/api/users/create', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao criar usuário');
        }

        const result = await response.json();
        return result.data as UserProfile;
      } catch (err) {
        console.error('[useCreateUser] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { createUser, loading, error };
}

/**
 * Hook para atualizar um usuário existente
 *
 * @example
 * const { updateUser, loading, error } = useUpdateUser();
 *
 * await updateUser('firebase-uid-123', {
 *   display_name: 'João Silva Atualizado',
 *   role: 'ADMIN',
 *   is_active: true
 * });
 */
export function useUpdateUser() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateUser = useCallback(
    async (firebaseUid: string, data: UpdateUserData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch('/api/users/update', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ firebase_uid: firebaseUid, ...data }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao atualizar usuário');
        }

        const result = await response.json();
        return result.data as UserProfile;
      } catch (err) {
        console.error('[useUpdateUser] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { updateUser, loading, error };
}

/**
 * Hook para atualizar último login do usuário
 *
 * @example
 * const { updateLastLogin, loading, error } = useUpdateLastLogin();
 *
 * await updateLastLogin('firebase-uid-123');
 */
export function useUpdateLastLogin() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLastLogin = useCallback(
    async (firebaseUid?: string) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch('/api/users/update-last-login', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ firebase_uid: firebaseUid || user.uid }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao atualizar último login');
        }

        const result = await response.json();
        return result.data as UserProfile;
      } catch (err) {
        console.error('[useUpdateLastLogin] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { updateLastLogin, loading, error };
}

/**
 * Hook para atualizar metadados do usuário (tema, favoritos, preferências)
 *
 * @example
 * const { updateMetadata, loading, error } = useUpdateUserMetadata();
 *
 * await updateMetadata('firebase-uid-123', {
 *   theme: 'dark',
 *   favorites: ['page1', 'page2'],
 *   preferences: { notifications: true }
 * });
 */
export function useUpdateUserMetadata() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateMetadata = useCallback(
    async (firebaseUid: string, metadata: UserMetadata) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch('/api/users/update-metadata', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ firebase_uid: firebaseUid, metadata }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao atualizar metadados');
        }

        const result = await response.json();
        return result.data as UserProfile;
      } catch (err) {
        console.error('[useUpdateUserMetadata] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { updateMetadata, loading, error };
}

/**
 * Hook para buscar todos os usuários ativos
 *
 * @example
 * const { activeUsers, loading, error, refetch } = useActiveUsers();
 */
export function useActiveUsers() {
  return useUsers({ is_active: true, limit: 9999 });
}

/**
 * Hook para buscar usuários por role
 *
 * @example
 * const { admins, loading, error, refetch } = useUsersByRole('ADMIN');
 */
export function useUsersByRole(role: UserRole) {
  return useUsers({ role, limit: 9999 });
}
