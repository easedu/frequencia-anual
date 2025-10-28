/**
 * Hooks: useWhatsAppVerified
 *
 * Hooks para gerenciamento de números WhatsApp verificados (whatsapp_verified_numbers)
 * Consume API /api/whatsapp/verified (whatsappDataService.ts refatorado no Sprint 2)
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PaginatedResponse } from './useStudents';

// ============================================================================
// TYPES
// ============================================================================

export type VerificationStatus = 'VERIFIED' | 'NOT_FOUND' | 'INVALID' | 'PENDING';

export interface VerificationMetadata {
  source?: 'api' | 'webhook' | 'manual';
  apiProvider?: string;
  lastError?: string;
  retryCount?: number;
  [key: string]: unknown;
}

export interface WhatsAppVerifiedNumber {
  id: string;
  phone_number: string;
  has_whatsapp: boolean;
  jid: string | null;
  contact_name: string | null;
  verification_status: VerificationStatus;
  verified_at: string;
  last_checked_at: string | null;
  metadata: VerificationMetadata | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppVerifiedFilters {
  phone_number?: string;
  has_whatsapp?: boolean;
  verification_status?: VerificationStatus;
  verified_after?: string;
  verified_before?: string;
  page?: number;
  limit?: number;
}

export interface CreateWhatsAppVerifiedData {
  phone_number: string;
  has_whatsapp: boolean;
  jid?: string | null;
  contact_name?: string | null;
  verification_status?: VerificationStatus;
  metadata?: VerificationMetadata | null;
}

export interface UpdateWhatsAppVerifiedData {
  has_whatsapp?: boolean;
  jid?: string | null;
  contact_name?: string | null;
  verification_status?: VerificationStatus;
  last_checked_at?: string | null;
  metadata?: VerificationMetadata | null;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para buscar números WhatsApp verificados com filtros e paginação
 *
 * @example
 * const { verifiedNumbers, loading, error, pagination, refetch } = useWhatsAppVerified({
 *   has_whatsapp: true,
 *   verification_status: 'VERIFIED',
 *   page: 1,
 *   limit: 50
 * });
 */
export function useWhatsAppVerified(filters?: WhatsAppVerifiedFilters) {
  const { user } = useAuth();
  const [verifiedNumbers, setVerifiedNumbers] = useState<WhatsAppVerifiedNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const fetchVerifiedNumbers = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.phone_number) params.append('phone_number', filters.phone_number);
      if (filters?.has_whatsapp !== undefined)
        params.append('has_whatsapp', filters.has_whatsapp.toString());
      if (filters?.verification_status)
        params.append('verification_status', filters.verification_status);
      if (filters?.verified_after) params.append('verified_after', filters.verified_after);
      if (filters?.verified_before) params.append('verified_before', filters.verified_before);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const token = await user.getIdToken();
      const response = await fetch(`/api/whatsapp/verified?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar números verificados');
      }

      const data: PaginatedResponse<WhatsAppVerifiedNumber> = await response.json();
      setVerifiedNumbers(data.data || []);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('[useWhatsAppVerified] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [
    user,
    filters?.phone_number,
    filters?.has_whatsapp,
    filters?.verification_status,
    filters?.verified_after,
    filters?.verified_before,
    filters?.page,
    filters?.limit,
  ]);

  useEffect(() => {
    fetchVerifiedNumbers();
  }, [fetchVerifiedNumbers]);

  return { verifiedNumbers, loading, error, pagination, refetch: fetchVerifiedNumbers };
}

/**
 * Hook para buscar um número WhatsApp verificado por ID
 *
 * @example
 * const { verifiedNumber, loading, error, refetch } = useWhatsAppVerifiedById('verified-uuid-123');
 */
export function useWhatsAppVerifiedById(verifiedId: string | null) {
  const { user } = useAuth();
  const [verifiedNumber, setVerifiedNumber] = useState<WhatsAppVerifiedNumber | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVerifiedNumber = useCallback(async () => {
    if (!user || !verifiedId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const response = await fetch(`/api/whatsapp/verified/${verifiedId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        setVerifiedNumber(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar número verificado');
      }

      const data = await response.json();
      setVerifiedNumber(data.data);
    } catch (err) {
      console.error('[useWhatsAppVerifiedById] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, verifiedId]);

  useEffect(() => {
    fetchVerifiedNumber();
  }, [fetchVerifiedNumber]);

  return { verifiedNumber, loading, error, refetch: fetchVerifiedNumber };
}

/**
 * Hook para buscar verificação de um número específico (por telefone)
 *
 * @example
 * const { verifiedNumber, loading, error, refetch } = useWhatsAppVerifiedByPhone('11987654321');
 */
export function useWhatsAppVerifiedByPhone(phoneNumber: string | null) {
  const { user } = useAuth();
  const [verifiedNumber, setVerifiedNumber] = useState<WhatsAppVerifiedNumber | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchByPhone = useCallback(async () => {
    if (!user || !phoneNumber) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const response = await fetch(
        `/api/whatsapp/verified?phone_number=${encodeURIComponent(phoneNumber)}&limit=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar número verificado');
      }

      const data: PaginatedResponse<WhatsAppVerifiedNumber> = await response.json();
      setVerifiedNumber(data.data && data.data.length > 0 ? data.data[0] : null);
    } catch (err) {
      console.error('[useWhatsAppVerifiedByPhone] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, phoneNumber]);

  useEffect(() => {
    fetchByPhone();
  }, [fetchByPhone]);

  return { verifiedNumber, loading, error, refetch: fetchByPhone };
}

/**
 * Hook para criar/salvar um número WhatsApp verificado (upsert automático)
 *
 * @example
 * const { saveVerifiedNumber, loading, error } = useSaveWhatsAppVerified();
 *
 * const verifiedNumber = await saveVerifiedNumber({
 *   phone_number: '11987654321',
 *   has_whatsapp: true,
 *   jid: '5511987654321@s.whatsapp.net',
 *   contact_name: 'João Silva',
 *   verification_status: 'VERIFIED'
 * });
 */
export function useSaveWhatsAppVerified() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveVerifiedNumber = useCallback(
    async (data: CreateWhatsAppVerifiedData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch('/api/whatsapp/verified', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao salvar número verificado');
        }

        const result = await response.json();
        return result.data as WhatsAppVerifiedNumber;
      } catch (err) {
        console.error('[useSaveWhatsAppVerified] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { saveVerifiedNumber, loading, error };
}

/**
 * Hook para atualizar um número WhatsApp verificado existente
 *
 * @example
 * const { updateVerifiedNumber, loading, error } = useUpdateWhatsAppVerified();
 *
 * await updateVerifiedNumber('verified-uuid-123', {
 *   has_whatsapp: false,
 *   verification_status: 'NOT_FOUND',
 *   last_checked_at: new Date().toISOString()
 * });
 */
export function useUpdateWhatsAppVerified() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateVerifiedNumber = useCallback(
    async (verifiedId: string, data: UpdateWhatsAppVerifiedData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch(`/api/whatsapp/verified/${verifiedId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao atualizar número verificado');
        }

        const result = await response.json();
        return result.data as WhatsAppVerifiedNumber;
      } catch (err) {
        console.error('[useUpdateWhatsAppVerified] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { updateVerifiedNumber, loading, error };
}

/**
 * Hook para deletar um número WhatsApp verificado
 *
 * @example
 * const { deleteVerifiedNumber, loading, error } = useDeleteWhatsAppVerified();
 *
 * await deleteVerifiedNumber('verified-uuid-123');
 */
export function useDeleteWhatsAppVerified() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteVerifiedNumber = useCallback(
    async (verifiedId: string) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch(`/api/whatsapp/verified/${verifiedId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao deletar número verificado');
        }

        const result = await response.json();
        return result.data;
      } catch (err) {
        console.error('[useDeleteWhatsAppVerified] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { deleteVerifiedNumber, loading, error };
}

/**
 * Hook para verificar se um número tem WhatsApp (batch)
 *
 * @example
 * const { verifyNumbers, loading, error } = useVerifyWhatsAppNumbers();
 *
 * const results = await verifyNumbers(['11987654321', '11912345678']);
 * // results = [{phone, hasWhatsApp, jid}, ...]
 */
export function useVerifyWhatsAppNumbers() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyNumbers = useCallback(
    async (phoneNumbers: string[]) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch('/api/whatsapp/verify', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phoneNumbers }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao verificar números');
        }

        const result = await response.json();
        return result.data as Array<{
          phone: string;
          hasWhatsApp: boolean;
          jid: string | null;
          name: string | null;
        }>;
      } catch (err) {
        console.error('[useVerifyWhatsAppNumbers] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { verifyNumbers, loading, error };
}
