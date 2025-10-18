/**
 * Hooks: useSuspensions, useMedicalCertificates, useInteractions
 *
 * Hooks consolidados para entidades menores
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PaginatedResponse } from './useStudents';
import type { WhatsAppMessageStatus, StatusHistoryEntry } from '@/types';

// ============================================================================
// SUSPENSIONS
// ============================================================================

export interface Suspension {
  id: string;
  student_id: string;
  start_date: string;
  end_date: string;
  days_suspended: number;
  reason: string;
  description?: string | null;
  severity?: 'LEVE' | 'MODERADA' | 'GRAVE' | null;
  created_at: string;
  updated_at: string;
}

export interface SuspensionFilters {
  estudanteId?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  limit?: number;
}

export function useSuspensions(filters?: SuspensionFilters) {
  const { user } = useAuth();
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });

  const fetchSuspensions = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    // ⚠️ IMPORTANTE: Não buscar se não houver estudanteId (evita buscar todas as suspensões)
    if (!filters?.estudanteId) {
      setSuspensions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters?.estudanteId) params.append('estudanteId', filters.estudanteId);
      if (filters?.dataInicio) params.append('dataInicio', filters.dataInicio);
      if (filters?.dataFim) params.append('dataFim', filters.dataFim);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const token = await user.getIdToken();
      const response = await fetch(`/api/suspensions?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Erro ao buscar suspensões');
      const data: PaginatedResponse<Suspension> = await response.json();
      setSuspensions(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error('[useSuspensions] Error:', err);
      setError((err as Error).message);
    } finally { setLoading(false); }
  }, [user, filters?.estudanteId, filters?.dataInicio, filters?.dataFim, filters?.page, filters?.limit]);

  useEffect(() => { fetchSuspensions(); }, [fetchSuspensions]);
  return { suspensions, loading, error, pagination, refetch: fetchSuspensions };
}

export function useCreateSuspension() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSuspension = useCallback(async (data: any) => {
    if (!user) throw new Error('Usuário não autenticado');
    try {
      setLoading(true);
      setError(null);
      const token = await user.getIdToken();
      const response = await fetch('/api/suspensions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Erro ao criar suspensão');
      return (await response.json()).data;
    } catch (err) {
      console.error('[useCreateSuspension] Error:', err);
      setError((err as Error).message);
      throw err;
    } finally { setLoading(false); }
  }, [user]);

  return { createSuspension, loading, error };
}

export function useUpdateSuspension() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSuspension = useCallback(async (id: string, data: any) => {
    if (!user) throw new Error('Usuário não autenticado');
    try {
      setLoading(true);
      setError(null);
      const token = await user.getIdToken();
      const response = await fetch(`/api/suspensions/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Erro ao atualizar suspensão');
      return (await response.json()).data;
    } catch (err) {
      console.error('[useUpdateSuspension] Error:', err);
      setError((err as Error).message);
      throw err;
    } finally { setLoading(false); }
  }, [user]);

  return { updateSuspension, loading, error };
}

export function useDeleteSuspension() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteSuspension = useCallback(async (id: string) => {
    if (!user) throw new Error('Usuário não autenticado');
    try {
      setLoading(true);
      setError(null);
      const token = await user.getIdToken();
      const response = await fetch(`/api/suspensions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Erro ao deletar suspensão');
      return (await response.json()).data;
    } catch (err) {
      console.error('[useDeleteSuspension] Error:', err);
      setError((err as Error).message);
      throw err;
    } finally { setLoading(false); }
  }, [user]);

  return { deleteSuspension, loading, error };
}

// ============================================================================
// MEDICAL CERTIFICATES
// ============================================================================

export interface MedicalCertificate {
  id: string;
  student_id: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
  notes?: string | null;
  file_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicalCertificateFilters {
  estudanteId?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  limit?: number;
}

export function useMedicalCertificates(filters?: MedicalCertificateFilters) {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<MedicalCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });

  const fetchCertificates = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    // ⚠️ IMPORTANTE: Não buscar se não houver estudanteId (evita buscar todos os atestados)
    if (!filters?.estudanteId) {
      setCertificates([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters?.estudanteId) params.append('estudanteId', filters.estudanteId);
      if (filters?.dataInicio) params.append('dataInicio', filters.dataInicio);
      if (filters?.dataFim) params.append('dataFim', filters.dataFim);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const token = await user.getIdToken();
      const response = await fetch(`/api/medical-certificates?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Erro ao buscar atestados');
      const data: PaginatedResponse<MedicalCertificate> = await response.json();
      setCertificates(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error('[useMedicalCertificates] Error:', err);
      setError((err as Error).message);
    } finally { setLoading(false); }
  }, [user, filters?.estudanteId, filters?.dataInicio, filters?.dataFim, filters?.page, filters?.limit]);

  useEffect(() => { fetchCertificates(); }, [fetchCertificates]);
  return { certificates, loading, error, pagination, refetch: fetchCertificates };
}

export function useCreateMedicalCertificate() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCertificate = useCallback(async (data: any) => {
    if (!user) throw new Error('Usuário não autenticado');
    try {
      setLoading(true);
      setError(null);
      const token = await user.getIdToken();
      const response = await fetch('/api/medical-certificates', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Erro ao criar atestado');
      return (await response.json()).data;
    } catch (err) {
      console.error('[useCreateMedicalCertificate] Error:', err);
      setError((err as Error).message);
      throw err;
    } finally { setLoading(false); }
  }, [user]);

  return { createCertificate, loading, error };
}

export function useUpdateMedicalCertificate() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCertificate = useCallback(async (id: string, data: any) => {
    if (!user) throw new Error('Usuário não autenticado');
    try {
      setLoading(true);
      setError(null);
      const token = await user.getIdToken();
      const response = await fetch(`/api/medical-certificates/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Erro ao atualizar atestado');
      return (await response.json()).data;
    } catch (err) {
      console.error('[useUpdateMedicalCertificate] Error:', err);
      setError((err as Error).message);
      throw err;
    } finally { setLoading(false); }
  }, [user]);

  return { updateCertificate, loading, error };
}

export function useDeleteMedicalCertificate() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteCertificate = useCallback(async (id: string) => {
    if (!user) throw new Error('Usuário não autenticado');
    try {
      setLoading(true);
      setError(null);
      const token = await user.getIdToken();
      const response = await fetch(`/api/medical-certificates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Erro ao deletar atestado');
      return (await response.json()).data;
    } catch (err) {
      console.error('[useDeleteMedicalCertificate] Error:', err);
      setError((err as Error).message);
      throw err;
    } finally { setLoading(false); }
  }, [user]);

  return { deleteCertificate, loading, error };
}

// ============================================================================
// INTERACTIONS
// ============================================================================

// ✅ ATUALIZADO: Agora bate com FamilyInteraction e com o que a API retorna
export interface Interaction {
  id: string;
  studentId: string;  // camelCase (API já retorna assim)
  type: string;       // interaction_type mapeado pela API
  date: string;       // interaction_date mapeado pela API
  description: string;
  createdBy: string;  // created_by mapeado pela API
  sensitive: boolean; // is_sensitive mapeado pela API
  // Campos WhatsApp (retornados pela API)
  whatsappMessage?: string;
  whatsappPhones?: string[];
  whatsappMessageId?: string;
  whatsappStatus?: WhatsAppMessageStatus;  // ✅ Tipo correto (não string genérico)
  whatsappStatusHistory?: StatusHistoryEntry[];  // ✅ Tipo correto (não any[])
  whatsappSentAt?: string;
  whatsappDeliveredAt?: string;
  whatsappReadAt?: string;
  whatsappPlayedAt?: string;
  whatsappUpdatedAt?: string;
  createdAt?: string;
}

export interface InteractionFilters {
  estudanteId?: string;
  tipo?: string;
  responsavel?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  limit?: number;
}

export function useInteractions(filters?: InteractionFilters) {
  const { user } = useAuth();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });

  const fetchInteractions = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    // ⚠️ IMPORTANTE: Não buscar se não houver estudanteId (evita buscar todas as interações)
    if (!filters?.estudanteId) {
      setInteractions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters?.estudanteId) params.append('estudanteId', filters.estudanteId);
      if (filters?.tipo) params.append('tipo', filters.tipo);
      if (filters?.responsavel) params.append('responsavel', filters.responsavel);
      if (filters?.dataInicio) params.append('dataInicio', filters.dataInicio);
      if (filters?.dataFim) params.append('dataFim', filters.dataFim);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const token = await user.getIdToken();
      const response = await fetch(`/api/interactions?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Erro ao buscar interações');
      const data: PaginatedResponse<Interaction> = await response.json();

      setInteractions(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error('[useInteractions] Error:', err);
      setError((err as Error).message);
    } finally { setLoading(false); }
  }, [user, filters?.estudanteId, filters?.tipo, filters?.responsavel, filters?.dataInicio, filters?.dataFim, filters?.page, filters?.limit]);

  useEffect(() => { fetchInteractions(); }, [fetchInteractions]);
  return { interactions, loading, error, pagination, refetch: fetchInteractions };
}

export function useCreateInteraction() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createInteraction = useCallback(async (data: any) => {
    if (!user) throw new Error('Usuário não autenticado');
    try {
      setLoading(true);
      setError(null);
      const token = await user.getIdToken();
      const response = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Erro ao criar interação');
      return (await response.json()).data;
    } catch (err) {
      console.error('[useCreateInteraction] Error:', err);
      setError((err as Error).message);
      throw err;
    } finally { setLoading(false); }
  }, [user]);

  return { createInteraction, loading, error };
}

export function useUpdateInteraction() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateInteraction = useCallback(async (id: string, data: any) => {
    if (!user) throw new Error('Usuário não autenticado');
    try {
      setLoading(true);
      setError(null);
      const token = await user.getIdToken();
      const response = await fetch(`/api/interactions/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Erro ao atualizar interação');
      return (await response.json()).data;
    } catch (err) {
      console.error('[useUpdateInteraction] Error:', err);
      setError((err as Error).message);
      throw err;
    } finally { setLoading(false); }
  }, [user]);

  return { updateInteraction, loading, error };
}

export function useDeleteInteraction() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteInteraction = useCallback(async (id: string) => {
    if (!user) throw new Error('Usuário não autenticado');
    try {
      setLoading(true);
      setError(null);
      const token = await user.getIdToken();
      const response = await fetch(`/api/interactions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Erro ao deletar interação');
      return (await response.json()).data;
    } catch (err) {
      console.error('[useDeleteInteraction] Error:', err);
      setError((err as Error).message);
      throw err;
    } finally { setLoading(false); }
  }, [user]);

  return { deleteInteraction, loading, error };
}
