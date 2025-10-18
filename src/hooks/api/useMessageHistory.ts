/**
 * Hooks: useMessageHistory
 *
 * Hooks para gerenciamento de histórico de mensagens WhatsApp (whatsapp_message_history)
 * Consume API /api/messages/history (messageHistoryService.ts refatorado no Sprint 2)
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PaginatedResponse } from './useStudents';

// ============================================================================
// TYPES
// ============================================================================

export type MessageStatus = 'SUCCESS' | 'FAILED' | 'NO_CONTACT';

export interface WhatsAppMessageHistory {
  id: string;
  estudante_id: string;
  estudante_nome?: string;
  contato_telefone: string;
  contato_nome?: string;
  ano_referencia: number;
  mes_referencia: number;
  quantidade_faltas: number;
  task_id: string | null;
  data_primeiro_envio: string;
  status: MessageStatus;
  message_id: string | null;
  sent_at: number | null;
  retry_count: number;
  is_dry_run: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface MessageHistoryFilters {
  estudante_id?: string;
  contato_telefone?: string;
  ano_referencia?: number;
  mes_referencia?: number;
  quantidade_faltas?: number;
  status?: MessageStatus;
  is_dry_run?: boolean;
  data_primeiro_envio_start?: string;
  data_primeiro_envio_end?: string;
  page?: number;
  limit?: number;
}

export interface CreateMessageHistoryData {
  estudante_id: string;
  estudante_nome?: string;
  contato_telefone: string;
  contato_nome?: string;
  ano_referencia: number;
  mes_referencia: number;
  quantidade_faltas: number;
  task_id?: string | null;
  data_primeiro_envio?: string;
  status: MessageStatus;
  message_id?: string | null;
  sent_at?: number | null;
  retry_count?: number;
  is_dry_run?: boolean;
  metadata?: Record<string, any> | null;
}

export interface MessageHistoryStats {
  total: number;
  success: number;
  failed: number;
  noContact: number;
  byMonth: Array<{
    month: number;
    total: number;
    success: number;
    failed: number;
  }>;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para buscar histórico de mensagens com filtros e paginação
 *
 * @example
 * const { messageHistory, loading, error, pagination, refetch } = useMessageHistory({
 *   estudante_id: 'uuid-123',
 *   ano_referencia: 2025,
 *   mes_referencia: 10,
 *   status: 'SUCCESS'
 * });
 */
export function useMessageHistory(filters?: MessageHistoryFilters) {
  const { user } = useAuth();
  const [messageHistory, setMessageHistory] = useState<WhatsAppMessageHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const fetchMessageHistory = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.estudante_id) params.append('estudante_id', filters.estudante_id);
      if (filters?.contato_telefone) params.append('contato_telefone', filters.contato_telefone);
      if (filters?.ano_referencia)
        params.append('ano_referencia', filters.ano_referencia.toString());
      if (filters?.mes_referencia)
        params.append('mes_referencia', filters.mes_referencia.toString());
      if (filters?.quantidade_faltas)
        params.append('quantidade_faltas', filters.quantidade_faltas.toString());
      if (filters?.status) params.append('status', filters.status);
      if (filters?.is_dry_run !== undefined)
        params.append('is_dry_run', filters.is_dry_run.toString());
      if (filters?.data_primeiro_envio_start)
        params.append('data_primeiro_envio_start', filters.data_primeiro_envio_start);
      if (filters?.data_primeiro_envio_end)
        params.append('data_primeiro_envio_end', filters.data_primeiro_envio_end);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const token = await user.getIdToken();
      const response = await fetch(`/api/messages/history?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar histórico de mensagens');
      }

      const data: PaginatedResponse<WhatsAppMessageHistory> = await response.json();
      setMessageHistory(data.data || []);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('[useMessageHistory] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [
    user,
    filters?.estudante_id,
    filters?.contato_telefone,
    filters?.ano_referencia,
    filters?.mes_referencia,
    filters?.quantidade_faltas,
    filters?.status,
    filters?.is_dry_run,
    filters?.data_primeiro_envio_start,
    filters?.data_primeiro_envio_end,
    filters?.page,
    filters?.limit,
  ]);

  useEffect(() => {
    fetchMessageHistory();
  }, [fetchMessageHistory]);

  return { messageHistory, loading, error, pagination, refetch: fetchMessageHistory };
}

/**
 * Hook para buscar histórico de um estudante específico
 *
 * @example
 * const { studentHistory, loading, error, refetch } = useStudentMessageHistory('uuid-123');
 */
export function useStudentMessageHistory(estudanteId: string | null) {
  const { user } = useAuth();
  const [studentHistory, setStudentHistory] = useState<WhatsAppMessageHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudentHistory = useCallback(async () => {
    if (!user || !estudanteId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const response = await fetch(
        `/api/messages/history?estudante_id=${estudanteId}&limit=9999`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar histórico do estudante');
      }

      const data: PaginatedResponse<WhatsAppMessageHistory> = await response.json();
      setStudentHistory(data.data || []);
    } catch (err) {
      console.error('[useStudentMessageHistory] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, estudanteId]);

  useEffect(() => {
    fetchStudentHistory();
  }, [fetchStudentHistory]);

  return { studentHistory, loading, error, refetch: fetchStudentHistory };
}

/**
 * Hook para verificar se mensagem já foi enviada (prevenção de duplicatas)
 *
 * @example
 * const { checkIfSent, loading } = useCheckMessageSent();
 *
 * const wasSent = await checkIfSent({
 *   estudante_id: 'uuid-123',
 *   contato_telefone: '11987654321',
 *   ano_referencia: 2025,
 *   mes_referencia: 10,
 *   quantidade_faltas: 15
 * });
 */
export function useCheckMessageSent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkIfSent = useCallback(
    async (filters: {
      estudante_id: string;
      contato_telefone: string;
      ano_referencia: number;
      mes_referencia: number;
      quantidade_faltas: number;
    }) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          estudante_id: filters.estudante_id,
          contato_telefone: filters.contato_telefone,
          ano_referencia: filters.ano_referencia.toString(),
          mes_referencia: filters.mes_referencia.toString(),
          quantidade_faltas: filters.quantidade_faltas.toString(),
          limit: '1',
        });

        const token = await user.getIdToken();
        const response = await fetch(`/api/messages/history?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao verificar mensagem');
        }

        const data: PaginatedResponse<WhatsAppMessageHistory> = await response.json();
        return data.data && data.data.length > 0;
      } catch (err) {
        console.error('[useCheckMessageSent] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { checkIfSent, loading, error };
}

/**
 * Hook para registrar envio de mensagem
 *
 * @example
 * const { recordMessage, loading, error } = useRecordMessage();
 *
 * const messageRecord = await recordMessage({
 *   estudante_id: 'uuid-123',
 *   estudante_nome: 'João Silva',
 *   contato_telefone: '11987654321',
 *   contato_nome: 'Maria Silva',
 *   ano_referencia: 2025,
 *   mes_referencia: 10,
 *   quantidade_faltas: 15,
 *   status: 'SUCCESS',
 *   message_id: 'wamid.xxx',
 *   sent_at: Date.now(),
 *   task_id: 'task-uuid-123'
 * });
 */
export function useRecordMessage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordMessage = useCallback(
    async (data: CreateMessageHistoryData) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();
        const response = await fetch('/api/messages/history', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (response.status === 409) {
          // Duplicata detectada
          const errorData = await response.json();
          return {
            isDuplicate: true,
            message: errorData.error || 'Mensagem já enviada anteriormente',
            data: null,
          };
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao registrar mensagem');
        }

        const result = await response.json();
        return {
          isDuplicate: false,
          message: 'Mensagem registrada com sucesso',
          data: result.data as WhatsAppMessageHistory,
        };
      } catch (err) {
        console.error('[useRecordMessage] Error:', err);
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { recordMessage, loading, error };
}

/**
 * Hook para buscar estatísticas de mensagens
 *
 * @example
 * const { stats, loading, error, refetch } = useMessageHistoryStats(2025, 10);
 * // stats = { total: 150, success: 120, failed: 20, noContact: 10, byMonth: [...] }
 */
export function useMessageHistoryStats(anoReferencia?: number, mesReferencia?: number) {
  const { user } = useAuth();
  const [stats, setStats] = useState<MessageHistoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ limit: '9999' });
      if (anoReferencia) params.append('ano_referencia', anoReferencia.toString());
      if (mesReferencia) params.append('mes_referencia', mesReferencia.toString());

      const token = await user.getIdToken();
      const response = await fetch(`/api/messages/history?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar estatísticas');
      }

      const data: PaginatedResponse<WhatsAppMessageHistory> = await response.json();
      const records = data.data || [];

      // Calcular estatísticas
      const calculatedStats: MessageHistoryStats = {
        total: records.length,
        success: 0,
        failed: 0,
        noContact: 0,
        byMonth: [],
      };

      records.forEach((record) => {
        if (record.status === 'SUCCESS') calculatedStats.success++;
        else if (record.status === 'FAILED') calculatedStats.failed++;
        else if (record.status === 'NO_CONTACT') calculatedStats.noContact++;
      });

      // Agrupar por mês (se não filtrado por mês específico)
      if (!mesReferencia && anoReferencia) {
        const byMonth = new Map<number, { total: number; success: number; failed: number }>();

        records.forEach((record) => {
          const month = record.mes_referencia;
          if (!byMonth.has(month)) {
            byMonth.set(month, { total: 0, success: 0, failed: 0 });
          }

          const monthStats = byMonth.get(month)!;
          monthStats.total++;
          if (record.status === 'SUCCESS') monthStats.success++;
          if (record.status === 'FAILED') monthStats.failed++;
        });

        calculatedStats.byMonth = Array.from(byMonth.entries())
          .map(([month, stats]) => ({ month, ...stats }))
          .sort((a, b) => a.month - b.month);
      }

      setStats(calculatedStats);
    } catch (err) {
      console.error('[useMessageHistoryStats] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, anoReferencia, mesReferencia]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
