/**
 * Retry Adaptativo com Exponential Backoff
 * Usa p-retry para requisições resilientes
 */

import pRetry, { AbortError } from 'p-retry';
import pTimeout from 'p-timeout';

export interface RetryOptions {
  /** Número máximo de tentativas (padrão: 3) */
  retries?: number;
  /** Fator de multiplicação do delay (padrão: 2) */
  factor?: number;
  /** Timeout mínimo em ms (padrão: 1000) */
  minTimeout?: number;
  /** Timeout máximo em ms (padrão: 5000) */
  maxTimeout?: number;
  /** Timeout global da requisição em ms (padrão: 30000) */
  requestTimeout?: number;
  /** Função para determinar se deve retentar (padrão: apenas erros de rede) */
  shouldRetry?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  retries: 3,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 5000,
  requestTimeout: 30000,
  shouldRetry: (error: Error) => {
    // Não retentar erros 4xx (erro do cliente)
    if (error.message.includes('400') || error.message.includes('404') || error.message.includes('401')) {
      return false;
    }
    // Retentar erros 5xx e erros de rede
    return true;
  }
};

/**
 * Executa uma função com retry adaptativo
 *
 * @example
 * const data = await retryWithBackoff(
 *   () => fetch('/api/students').then(r => r.json()),
 *   { retries: 3, minTimeout: 1000 }
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const run = async () => {
    try {
      // Adicionar timeout global
      const result = await pTimeout(fn(), {
        milliseconds: opts.requestTimeout,
        message: `Request timeout after ${opts.requestTimeout}ms`
      });

      return result;
    } catch (error) {
      const err = error as Error;

      // Verificar se deve retentar
      if (!opts.shouldRetry(err)) {
        // AbortError para de retentar imediatamente
        throw new AbortError(err.message);
      }

      throw err;
    }
  };

  return pRetry(run, {
    retries: opts.retries,
    factor: opts.factor,
    minTimeout: opts.minTimeout,
    maxTimeout: opts.maxTimeout,
    onFailedAttempt: (context) => {
      const errorMessage = (context as unknown as { message?: string }).message || 'Unknown error';
      console.warn(
        `[Retry] Tentativa ${(context as { attemptNumber: number }).attemptNumber} falhou. ` +
        `${(context as { retriesLeft: number }).retriesLeft} tentativas restantes. ` +
        `Erro: ${errorMessage}`
      );
    }
  });
}

/**
 * Wrapper para fetch com retry automático
 *
 * @example
 * const response = await fetchWithRetry('/api/students', {
 *   method: 'GET',
 *   headers: { ... }
 * });
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return retryWithBackoff(
    async () => {
      const response = await fetch(url, init);

      // Lançar erro para HTTP 5xx (servidor) para que retry aconteça
      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      // Para 4xx, não retentar (erro do cliente)
      if (!response.ok) {
        throw new AbortError(`Client error: ${response.status} ${response.statusText}`);
      }

      return response;
    },
    retryOptions
  );
}

/**
 * Hook React para usar fetch com retry
 *
 * @example
 * const { data, loading, error, refetch } = useFetchWithRetry('/api/students');
 */
export function useFetchWithRetry<T = unknown>(
  url: string,
  options?: {
    fetchOptions?: RequestInit;
    retryOptions?: RetryOptions;
    enabled?: boolean;
  }
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithRetry(
        url,
        options?.fetchOptions,
        options?.retryOptions
      );

      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [url, options?.fetchOptions, options?.retryOptions]);

  React.useEffect(() => {
    if (options?.enabled !== false) {
      fetchData();
    }
  }, [fetchData, options?.enabled]);

  return { data, loading, error, refetch: fetchData };
}

// Exportar React para o hook
import React from 'react';
