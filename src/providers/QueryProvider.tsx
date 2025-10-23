/**
 * React Query Provider
 *
 * Gerencia cache global de todas as queries da aplicação
 * OTIMIZAÇÃO: Cache automático, revalidation, prefetching
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, ReactNode } from 'react';

// ============================================================================
// CONFIGURAÇÃO DE CACHE
// ============================================================================

const CACHE_CONFIG = {
  // Dados considerados "fresh" por 5 minutos
  staleTime: 5 * 60 * 1000, // 5 min

  // Dados mantidos em cache por 30 minutos (mesmo se stale)
  gcTime: 30 * 60 * 1000, // 30 min (era cacheTime em v4, agora é gcTime em v5)

  // Retry automático em caso de falha
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),

  // Não refetch automaticamente ao focar janela
  refetchOnWindowFocus: false,

  // Não refetch ao reconectar (dados ainda estão válidos)
  refetchOnReconnect: false,

  // Não refetch ao montar (usar cache se disponível)
  refetchOnMount: false,
};

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // ✅ useState garante que QueryClient seja criado apenas uma vez
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: CACHE_CONFIG,
          mutations: {
            retry: 1, // Mutations: apenas 1 retry
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* ✅ DevTools apenas em desenvolvimento */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
