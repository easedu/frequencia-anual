/**
 * Hook: useContacts
 *
 * Consome a API REST /api/contacts
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PaginatedResponse, ApiResponse } from './useStudents';

// ============================================================================
// TYPES
// ============================================================================

export interface Contact {
  id: string;
  student_id: string;
  name: string;
  relationship?: string | null;
  phone?: string | null;
  phone_numeric?: string | null;
  email?: string | null;
  can_receive_whatsapp: boolean;
  whatsapp_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ContactFilters {
  estudanteId?: string;
  podeReceberMensagem?: boolean;
  whatsappVerified?: boolean;
  page?: number;
  limit?: number;
}

// ============================================================================
// HOOK: useContacts (GET with filters)
// ============================================================================

export function useContacts(filters?: ContactFilters) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const fetchContacts = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.estudanteId) params.append('estudanteId', filters.estudanteId);
      if (filters?.podeReceberMensagem !== undefined) params.append('podeReceberMensagem', filters.podeReceberMensagem.toString());
      if (filters?.whatsappVerified !== undefined) params.append('whatsappVerified', filters.whatsappVerified.toString());
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const token = await user.getIdToken();

      const response = await fetch(`/api/contacts?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar contatos');
      }

      const data: PaginatedResponse<Contact> = await response.json();
      setContacts(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error('[useContacts] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, filters?.estudanteId, filters?.podeReceberMensagem, filters?.whatsappVerified, filters?.page, filters?.limit]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    loading,
    error,
    pagination,
    refetch: fetchContacts,
  };
}

// ============================================================================
// HOOK: useContact (GET by ID)
// ============================================================================

export function useContact(id: string | null) {
  const { user } = useAuth();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContact = useCallback(async () => {
    if (!user || !id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();

      const response = await fetch(`/api/contacts/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar contato');
      }

      const data: ApiResponse<{ contact: Contact }> = await response.json();
      setContact(data.data?.contact || null);
    } catch (err) {
      console.error('[useContact] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  return {
    contact,
    loading,
    error,
    refetch: fetchContact,
  };
}

// ============================================================================
// MUTATION: useCreateContact (POST)
// ============================================================================

export function useCreateContact() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createContact = useCallback(async (contactData: Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at'>>) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar contato');
      }

      const data: ApiResponse<{ id: string }> = await response.json();
      return data.data;
    } catch (err) {
      console.error('[useCreateContact] Error:', err);
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    createContact,
    loading,
    error,
  };
}

// ============================================================================
// MUTATION: useUpdateContact (PUT)
// ============================================================================

export function useUpdateContact() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateContact = useCallback(async (id: string, contactData: Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at'>>) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();

      const response = await fetch(`/api/contacts/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar contato');
      }

      const data: ApiResponse<{ id: string; updated: boolean }> = await response.json();
      return data.data;
    } catch (err) {
      console.error('[useUpdateContact] Error:', err);
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    updateContact,
    loading,
    error,
  };
}

// ============================================================================
// MUTATION: useDeleteContact (DELETE)
// ============================================================================

export function useDeleteContact() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteContact = useCallback(async (id: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();

      const response = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao deletar contato');
      }

      const data: ApiResponse<{ id: string; deleted: boolean }> = await response.json();
      return data.data;
    } catch (err) {
      console.error('[useDeleteContact] Error:', err);
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    deleteContact,
    loading,
    error,
  };
}
