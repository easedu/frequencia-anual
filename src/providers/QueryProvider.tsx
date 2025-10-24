'use client';

/**
 * React Query Provider
 *
 * ✅ OTIMIZAÇÃO FASE 1: Cache automático com React Query
 *
 * Configurações:
 * - staleTime: 5 minutos (sincronizado com MV refresh)
 * - gcTime: 10 minutos (garbage collection)
 * - retry: 3 tentativas com exponential backoff
 * - refetchOnWindowFocus: false (evitar refetches desnecessários)
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // ✅ OTIMIZAÇÃO: Criar QueryClient dentro do componente
  // Garante que cada navegador/tab tem sua própria instância
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // ✅ staleTime: Quanto tempo os dados são considerados "frescos"
            // 5 minutos (sincronizado com refresh de MVs via pg_cron)
            staleTime: 5 * 60 * 1000,

            // ✅ gcTime: Quanto tempo os dados ficam em cache após não serem usados
            // 10 minutos (2x staleTime)
            gcTime: 10 * 60 * 1000,

            // ✅ retry: Retry automático em caso de falha
            // 3 tentativas (integrado com p-retry no fetchWithRetry)
            retry: 3,

            // ✅ retryDelay: Exponential backoff
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

            // ✅ refetchOnWindowFocus: Não refetch ao focar janela
            // (Evita refetches desnecessários, dados já têm 5 min de validade)
            refetchOnWindowFocus: false,

            // ✅ refetchOnReconnect: Refetch quando reconectar internet
            refetchOnReconnect: true,

            // ✅ refetchOnMount: Refetch ao montar apenas se stale
            refetchOnMount: 'stale',
          },
          mutations: {
            // ✅ retry: Mutations não fazem retry por padrão (evitar duplicação)
            retry: 0,

            // ✅ onError global para mutations
            onError: (error) => {
              console.error('[React Query Mutation Error]', error);
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}

      {/* ✅ DevTools: Apenas em desenvolvimento */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}
