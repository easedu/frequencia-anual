/**
 * Hook: Polling de Status WhatsApp com Intervalo Adaptativo
 *
 * Atualiza automaticamente o status das mensagens WhatsApp
 * sem precisar recarregar a página.
 *
 * 🎯 POLLING ADAPTATIVO:
 * - SENT: 5 segundos (precisa ser rápido para capturar DELIVERED)
 * - DELIVERED: 60 segundos (espera razoável para capturar READ)
 * - READ/FAILED: Para polling (estados finais)
 *
 * ⚠️ IMPORTANTE: Não assume que READ sempre chegará (depende do contato ter
 * confirmação de leitura habilitada). Por isso, continua fazendo polling
 * por tempo limitado após DELIVERED.
 *
 * @example
 * const refreshedInteractions = useWhatsAppStatusPolling(interactions, {
 *   enabled: true,
 *   studentId: '123',
 *   fastInterval: 5000, // 5s para SENT
 *   slowInterval: 60000, // 60s para DELIVERED
 *   maxPollingTime: 600000 // 10 minutos
 * });
 */

import { useState, useEffect, useRef } from 'react';
import { InteractionService } from '@/services/supabase/interactionService';
import type { FamilyInteraction } from '@/types';

interface PollingOptions {
  enabled?: boolean;
  fastInterval?: number; // Intervalo rápido para SENT (padrão: 5s)
  slowInterval?: number; // Intervalo lento para DELIVERED (padrão: 60s)
  studentId?: string;
  maxPollingTime?: number; // Tempo máximo de polling (padrão: 10min)
}

export function useWhatsAppStatusPolling(
  initialInteractions: FamilyInteraction[],
  options: PollingOptions = {}
) {
  const {
    enabled = true,
    fastInterval = 5000, // 5 segundos para SENT
    slowInterval = 60000, // 60 segundos (1 minuto) para DELIVERED
    studentId,
    maxPollingTime = 600000 // 10 minutos (tempo razoável para ler mensagens)
  } = options;

  const [interactions, setInteractions] = useState<FamilyInteraction[]>(initialInteractions);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number | null>(null);
  const currentIntervalRef = useRef<number>(fastInterval);

  // Atualizar quando prop mudar
  useEffect(() => {
    setInteractions(initialInteractions);
  }, [initialInteractions]);

  useEffect(() => {
    // Só fazer polling se estiver habilitado e tiver studentId
    if (!enabled || !studentId) {
      return;
    }

    // 🎯 Determinar tipo de mensagens pendentes
    const hasSentMessages = interactions.some(
      interaction => interaction.whatsappStatus === 'SENT'
    );
    const hasDeliveredMessages = interactions.some(
      interaction => interaction.whatsappStatus === 'DELIVERED'
    );
    const hasPendingMessages = hasSentMessages || hasDeliveredMessages;

    // Se não houver mensagens pendentes (apenas READ/FAILED ou sem mensagens), parar polling
    if (!hasPendingMessages) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        pollingStartTimeRef.current = null;
      }
      return;
    }

    // 🎯 POLLING ADAPTATIVO: Escolher intervalo baseado no status
    const targetInterval = hasSentMessages ? fastInterval : slowInterval;

    // Se mudou o intervalo, reiniciar polling
    const needsIntervalChange = currentIntervalRef.current !== targetInterval;
    if (needsIntervalChange && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      currentIntervalRef.current = targetInterval;
    }

    // Iniciar contador de tempo se ainda não iniciou
    if (!pollingStartTimeRef.current) {
      pollingStartTimeRef.current = Date.now();
    }

    // Verificar se excedeu tempo máximo de polling
    const elapsedTime = Date.now() - pollingStartTimeRef.current;
    if (elapsedTime > maxPollingTime) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        pollingStartTimeRef.current = null;
      }
      return;
    }

    // Função de atualização
    const refreshStatuses = async () => {
      try {
        const updatedInteractions = await InteractionService.getStudentInteractions(studentId);

        // Verificar se houve mudança no status
        const hasChanges = updatedInteractions.some((updated, index) => {
          const current = interactions[index];
          return current &&
                 updated.whatsappMessageId === current.whatsappMessageId &&
                 updated.whatsappStatus !== current.whatsappStatus;
        });

        if (hasChanges) {
          setInteractions(updatedInteractions);
        }
      } catch (error) {
        console.error('[WhatsAppPolling] Erro ao atualizar status:', error);
      }
    };

    // Iniciar polling se ainda não iniciou
    if (!intervalRef.current) {
      intervalRef.current = setInterval(refreshStatuses, targetInterval);
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, studentId, fastInterval, slowInterval, maxPollingTime, interactions]);

  return interactions;
}
