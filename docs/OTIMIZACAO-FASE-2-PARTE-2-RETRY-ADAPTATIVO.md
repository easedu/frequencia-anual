# 🟠 FASE 2 PARTE 2: RETRY ADAPTATIVO + CIRCUIT BREAKER

**Continuação de**: [OTIMIZACAO-FASE-2-ALTA-PRIORIDADE.md](./OTIMIZACAO-FASE-2-ALTA-PRIORIDADE.md)

**Pré-requisito**: N+1 Queries e Infinite Scroll implementados ✅

---

## 🎯 OBJETIVO

**Problema**: Timeout de 8s fixo causa falhas em conexões ruins
**Solução**: Retry adaptativo + Circuit Breaker + Fallback strategies

**Impacto Esperado**: Taxa de erro 30-50% → < 5% (10x melhor)

---

## 🟠 2.3: TIMEOUT CONSERVADOR - Retry Adaptativo

### 📝 Etapa 2.3.1: Instalar Dependências de Retry

```bash
npm install p-retry p-timeout
npm install @tanstack/query-core
```

### 📝 Etapa 2.3.2: Criar Utilitário de Retry Adaptativo

**Arquivo**: `src/utils/adaptiveRetry.ts` (CRIAR NOVO)

```typescript
/**
 * Retry Adaptativo com Exponential Backoff
 *
 * Características:
 * - Timeout aumenta progressivamente (5s → 7.5s → 11.25s)
 * - Delay entre retries usa exponential backoff
 * - Circuit breaker após múltiplas falhas consecutivas
 * - Métricas de performance para ajuste dinâmico
 */

import pRetry, { AbortError, FailedAttemptError } from 'p-retry';
import pTimeout, { TimeoutError } from 'p-timeout';
import { logger } from './logger';

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

export interface RetryConfig {
  /** Número máximo de tentativas (padrão: 3) */
  maxRetries?: number;

  /** Timeout base em ms (padrão: 5000ms = 5s) */
  baseTimeout?: number;

  /** Fator de multiplicação do timeout a cada retry (padrão: 1.5) */
  timeoutMultiplier?: number;

  /** Delay base entre retries em ms (padrão: 1000ms = 1s) */
  baseDelay?: number;

  /** Fator de multiplicação do delay (exponential backoff) (padrão: 2) */
  delayMultiplier?: number;

  /** Função para determinar se erro é retryable (padrão: todos exceto AbortError) */
  shouldRetry?: (error: Error) => boolean;

  /** Callback chamado antes de cada retry */
  onRetry?: (attempt: number, error: Error) => void;

  /** Nome da operação (para logs) */
  operationName?: string;
}

const DEFAULT_CONFIG: Required<Omit<RetryConfig, 'onRetry' | 'shouldRetry'>> = {
  maxRetries: 3,
  baseTimeout: 5000, // 5s
  timeoutMultiplier: 1.5,
  baseDelay: 1000, // 1s
  delayMultiplier: 2,
  operationName: 'network-request',
};

// ============================================================================
// RETRY ADAPTATIVO
// ============================================================================

/**
 * Executa uma função com retry adaptativo e timeout progressivo
 *
 * @example
 * ```typescript
 * const data = await withAdaptiveRetry(
 *   async () => {
 *     const response = await fetch('/api/students');
 *     return response.json();
 *   },
 *   {
 *     maxRetries: 3,
 *     operationName: 'fetch-students',
 *     onRetry: (attempt, error) => {
 *       toast.warning(`Tentativa ${attempt}/3...`);
 *     }
 *   }
 * );
 * ```
 */
export async function withAdaptiveRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const startTime = performance.now();

  try {
    const result = await pRetry(
      async (attempt) => {
        // Calcular timeout para esta tentativa (progressivo)
        const attemptTimeout = cfg.baseTimeout * Math.pow(cfg.timeoutMultiplier, attempt - 1);

        logger.debug(`[${cfg.operationName}] Tentativa ${attempt}/${cfg.maxRetries}`, {
          timeout: `${attemptTimeout}ms`,
          attempt,
        });

        try {
          // Executar função com timeout
          const result = await pTimeout(fn(), {
            milliseconds: attemptTimeout,
            message: `Timeout após ${attemptTimeout}ms (tentativa ${attempt})`,
          });

          // Sucesso: logar performance
          const duration = performance.now() - startTime;
          logger.performanceLog(
            `[${cfg.operationName}] Sucesso`,
            duration,
            { attempt, timeout: attemptTimeout }
          );

          return result;
        } catch (error) {
          // Timeout ou erro de rede
          if (error instanceof TimeoutError) {
            logger.warn(`[${cfg.operationName}] Timeout na tentativa ${attempt}`, {
              timeout: attemptTimeout,
              attempt,
            });
            throw error; // pRetry vai tentar novamente
          }

          // Verificar se erro é retryable
          if (config.shouldRetry && !config.shouldRetry(error as Error)) {
            // Erro não retryable (ex: 404, 401) - abortar imediatamente
            logger.error(`[${cfg.operationName}] Erro não retryable`, {}, error as Error);
            throw new AbortError(error as Error);
          }

          throw error;
        }
      },
      {
        retries: cfg.maxRetries,
        onFailedAttempt: (error: FailedAttemptError) => {
          // Callback antes de cada retry
          logger.warn(
            `[${cfg.operationName}] Falha na tentativa ${error.attemptNumber}/${cfg.maxRetries}`,
            {
              retriesLeft: error.retriesLeft,
              error: error.message,
            }
          );

          if (config.onRetry) {
            config.onRetry(error.attemptNumber, error);
          }
        },
        // Exponential backoff delay
        minTimeout: cfg.baseDelay,
        maxTimeout: cfg.baseDelay * Math.pow(cfg.delayMultiplier, cfg.maxRetries),
        factor: cfg.delayMultiplier,
      }
    );

    return result;
  } catch (error) {
    // Todas as tentativas falharam
    const duration = performance.now() - startTime;
    logger.error(
      `[${cfg.operationName}] Todas as tentativas falharam`,
      { duration, maxRetries: cfg.maxRetries },
      error as Error
    );
    throw error;
  }
}

// ============================================================================
// CLASSIFICAÇÃO DE ERROS
// ============================================================================

/**
 * Determina se um erro HTTP é retryable
 */
export function isRetryableHttpError(statusCode: number): boolean {
  // Retryable: 408 (timeout), 429 (rate limit), 5xx (server errors)
  // Não retryable: 4xx (client errors) exceto 408 e 429
  return (
    statusCode === 408 || // Request Timeout
    statusCode === 429 || // Too Many Requests
    statusCode === 503 || // Service Unavailable
    statusCode === 504 || // Gateway Timeout
    (statusCode >= 500 && statusCode < 600) // Server errors
  );
}

/**
 * Cria função shouldRetry para requests fetch
 */
export function createFetchRetryPolicy() {
  return (error: Error): boolean => {
    // Sempre retry em timeout
    if (error instanceof TimeoutError) {
      return true;
    }

    // Retry em erros de rede
    if (error.message.includes('Failed to fetch')) {
      return true;
    }

    if (error.message.includes('NetworkError')) {
      return true;
    }

    // Retry em ERR_QUIC_PROTOCOL_ERROR (problema comum em redes ruins)
    if (error.message.includes('ERR_QUIC_PROTOCOL_ERROR')) {
      return true;
    }

    // Para outros erros, não retry por padrão
    return false;
  };
}

// ============================================================================
// MÉTRICAS DE PERFORMANCE
// ============================================================================

interface PerformanceMetrics {
  successCount: number;
  failureCount: number;
  totalAttempts: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  responseTimes: number[];
}

const metricsStore = new Map<string, PerformanceMetrics>();

/**
 * Registra métrica de performance de uma operação
 */
export function recordPerformanceMetric(
  operationName: string,
  success: boolean,
  responseTime: number
) {
  let metrics = metricsStore.get(operationName);

  if (!metrics) {
    metrics = {
      successCount: 0,
      failureCount: 0,
      totalAttempts: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      responseTimes: [],
    };
    metricsStore.set(operationName, metrics);
  }

  // Atualizar contadores
  metrics.totalAttempts++;
  if (success) {
    metrics.successCount++;
  } else {
    metrics.failureCount++;
  }

  // Adicionar response time
  metrics.responseTimes.push(responseTime);

  // Manter apenas últimos 100 response times
  if (metrics.responseTimes.length > 100) {
    metrics.responseTimes.shift();
  }

  // Recalcular métricas
  const sorted = [...metrics.responseTimes].sort((a, b) => a - b);
  metrics.averageResponseTime =
    sorted.reduce((sum, t) => sum + t, 0) / sorted.length;
  metrics.p95ResponseTime = sorted[Math.floor(sorted.length * 0.95)];
  metrics.p99ResponseTime = sorted[Math.floor(sorted.length * 0.99)];
}

/**
 * Obtém métricas de performance de uma operação
 */
export function getPerformanceMetrics(operationName: string): PerformanceMetrics | null {
  return metricsStore.get(operationName) || null;
}

/**
 * Obtém todas as métricas
 */
export function getAllPerformanceMetrics(): Record<string, PerformanceMetrics> {
  return Object.fromEntries(metricsStore);
}

/**
 * Limpa métricas
 */
export function clearPerformanceMetrics(operationName?: string) {
  if (operationName) {
    metricsStore.delete(operationName);
  } else {
    metricsStore.clear();
  }
}
```

### 📝 Etapa 2.3.3: Criar Circuit Breaker

**Arquivo**: `src/utils/circuitBreaker.ts` (CRIAR NOVO)

```typescript
/**
 * Circuit Breaker Pattern
 *
 * Protege o sistema contra falhas em cascata.
 * Estados:
 * - CLOSED: Normal, requisições passam
 * - OPEN: Muitas falhas, bloqueia requisições
 * - HALF_OPEN: Testando recuperação, permite algumas requisições
 *
 * @see https://martinfowler.com/bliki/CircuitBreaker.html
 */

import { logger } from './logger';

// ============================================================================
// TYPES
// ============================================================================

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Too many failures, blocking requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export interface CircuitBreakerConfig {
  /** Nome do circuito (para logging) */
  name: string;

  /** Número de falhas consecutivas para abrir o circuito (padrão: 5) */
  failureThreshold?: number;

  /** Taxa de falhas (0-1) para abrir o circuito (padrão: 0.5 = 50%) */
  failureRateThreshold?: number;

  /** Tempo em ms para tentar fechar o circuito (padrão: 60000ms = 1 min) */
  resetTimeout?: number;

  /** Janela de tempo em ms para calcular taxa de falhas (padrão: 60000ms = 1 min) */
  windowTime?: number;

  /** Callback quando circuito abre */
  onOpen?: () => void;

  /** Callback quando circuito fecha */
  onClose?: () => void;

  /** Callback quando circuito vai para half-open */
  onHalfOpen?: () => void;
}

interface RequestRecord {
  success: boolean;
  timestamp: number;
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private consecutiveFailures = 0;
  private lastFailureTime: number | null = null;
  private requestHistory: RequestRecord[] = [];

  private readonly config: Required<
    Omit<CircuitBreakerConfig, 'onOpen' | 'onClose' | 'onHalfOpen'>
  > & Pick<CircuitBreakerConfig, 'onOpen' | 'onClose' | 'onHalfOpen'>;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      name: config.name,
      failureThreshold: config.failureThreshold ?? 5,
      failureRateThreshold: config.failureRateThreshold ?? 0.5,
      resetTimeout: config.resetTimeout ?? 60000, // 1 min
      windowTime: config.windowTime ?? 60000, // 1 min
      onOpen: config.onOpen,
      onClose: config.onClose,
      onHalfOpen: config.onHalfOpen,
    };
  }

  /**
   * Executa uma função protegida pelo circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Verificar se pode executar
    if (!this.canExecute()) {
      throw new Error(
        `Circuit breaker "${this.config.name}" is OPEN. Service is unavailable.`
      );
    }

    try {
      const result = await fn();

      // Sucesso: registrar e atualizar estado
      this.recordSuccess();
      return result;
    } catch (error) {
      // Falha: registrar e atualizar estado
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Verifica se pode executar uma requisição
   */
  private canExecute(): boolean {
    switch (this.state) {
      case CircuitState.CLOSED:
        // Normal operation
        return true;

      case CircuitState.OPEN:
        // Verificar se já passou tempo suficiente para tentar novamente
        if (this.shouldAttemptReset()) {
          this.transitionTo(CircuitState.HALF_OPEN);
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        // Permitir apenas algumas requisições de teste
        return true;

      default:
        return false;
    }
  }

  /**
   * Registra sucesso de uma requisição
   */
  private recordSuccess() {
    this.consecutiveFailures = 0;
    this.addToHistory(true);

    // Se estava em HALF_OPEN, fechar o circuito
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.CLOSED);
    }
  }

  /**
   * Registra falha de uma requisição
   */
  private recordFailure() {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    this.addToHistory(false);

    // Verificar se deve abrir o circuito
    if (this.shouldOpen()) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  /**
   * Adiciona registro ao histórico
   */
  private addToHistory(success: boolean) {
    const now = Date.now();

    this.requestHistory.push({
      success,
      timestamp: now,
    });

    // Remover registros antigos (fora da janela de tempo)
    this.requestHistory = this.requestHistory.filter(
      (record) => now - record.timestamp < this.config.windowTime
    );
  }

  /**
   * Verifica se deve abrir o circuito
   */
  private shouldOpen(): boolean {
    // Condição 1: Muitas falhas consecutivas
    if (this.consecutiveFailures >= this.config.failureThreshold) {
      return true;
    }

    // Condição 2: Taxa de falhas muito alta na janela de tempo
    if (this.requestHistory.length >= 10) {
      // Mínimo de 10 requests para calcular taxa
      const failures = this.requestHistory.filter((r) => !r.success).length;
      const failureRate = failures / this.requestHistory.length;

      if (failureRate >= this.config.failureRateThreshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Verifica se deve tentar resetar (OPEN → HALF_OPEN)
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;

    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    return timeSinceLastFailure >= this.config.resetTimeout;
  }

  /**
   * Transição de estado
   */
  private transitionTo(newState: CircuitState) {
    const oldState = this.state;
    this.state = newState;

    logger.info(`Circuit breaker "${this.config.name}" ${oldState} → ${newState}`, {
      name: this.config.name,
      oldState,
      newState,
      consecutiveFailures: this.consecutiveFailures,
      requestHistory: this.requestHistory.length,
    });

    // Callbacks
    if (newState === CircuitState.OPEN && this.config.onOpen) {
      this.config.onOpen();
    } else if (newState === CircuitState.CLOSED && this.config.onClose) {
      this.config.onClose();
    } else if (newState === CircuitState.HALF_OPEN && this.config.onHalfOpen) {
      this.config.onHalfOpen();
    }
  }

  /**
   * Obtém estado atual do circuito
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Obtém métricas do circuito
   */
  getMetrics() {
    const failures = this.requestHistory.filter((r) => !r.success).length;
    const successes = this.requestHistory.length - failures;
    const failureRate =
      this.requestHistory.length > 0 ? failures / this.requestHistory.length : 0;

    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      totalRequests: this.requestHistory.length,
      failures,
      successes,
      failureRate,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Reseta o circuito manualmente (para testes ou admin)
   */
  reset() {
    this.state = CircuitState.CLOSED;
    this.consecutiveFailures = 0;
    this.lastFailureTime = null;
    this.requestHistory = [];

    logger.info(`Circuit breaker "${this.config.name}" reset manualmente`);
  }
}

// ============================================================================
// CIRCUIT BREAKER GLOBAL REGISTRY
// ============================================================================

const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Obtém ou cria um circuit breaker
 */
export function getCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
  let breaker = circuitBreakers.get(config.name);

  if (!breaker) {
    breaker = new CircuitBreaker(config);
    circuitBreakers.set(config.name, breaker);
  }

  return breaker;
}

/**
 * Obtém todos os circuit breakers registrados
 */
export function getAllCircuitBreakers(): Map<string, CircuitBreaker> {
  return circuitBreakers;
}

/**
 * Reseta todos os circuit breakers (para testes)
 */
export function resetAllCircuitBreakers() {
  circuitBreakers.forEach((breaker) => breaker.reset());
}
```

### 📝 Etapa 2.3.4: Integrar Retry + Circuit Breaker no Supabase Client

**Arquivo**: `src/lib/supabaseClient.ts` (ATUALIZAR)

```typescript
/**
 * Supabase Client com Retry Adaptativo e Circuit Breaker
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabaseClient';
import {
  withAdaptiveRetry,
  createFetchRetryPolicy,
  recordPerformanceMetric,
} from '@/utils/adaptiveRetry';
import { getCircuitBreaker, CircuitState } from '@/utils/circuitBreaker';
import { logger } from '@/utils/logger';

let _supabaseInstance: SupabaseClient<Database> | null = null;

// ✅ Circuit Breaker para Supabase
const supabaseCircuitBreaker = getCircuitBreaker({
  name: 'supabase-client',
  failureThreshold: 5, // 5 falhas consecutivas
  failureRateThreshold: 0.5, // 50% de taxa de falhas
  resetTimeout: 60000, // 1 min
  windowTime: 60000, // 1 min
  onOpen: () => {
    logger.error('⚠️ Circuit Breaker ABERTO para Supabase', {
      message: 'Muitas falhas detectadas. Requests bloqueadas por 1 minuto.',
    });
    // Opcional: mostrar toast para usuário
    // toast.error('Problemas de conexão detectados. Tentando reconectar...');
  },
  onClose: () => {
    logger.info('✅ Circuit Breaker FECHADO para Supabase', {
      message: 'Conexão restabelecida.',
    });
  },
  onHalfOpen: () => {
    logger.info('🔄 Circuit Breaker HALF-OPEN para Supabase', {
      message: 'Testando reconexão...',
    });
  },
});

function getSupabaseClient(): SupabaseClient<Database> {
  if (_supabaseInstance) {
    return _supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('❌ Missing Supabase environment variables!');
  }

  _supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      // ✅ Fetch customizado com Retry + Circuit Breaker + Timeout Adaptativo
      fetch: async (url, options = {}) => {
        const startTime = performance.now();

        try {
          // Verificar circuit breaker
          if (supabaseCircuitBreaker.getState() === CircuitState.OPEN) {
            throw new Error(
              'Supabase Circuit Breaker is OPEN. Connection unavailable. Trying again in 1 minute.'
            );
          }

          // Executar fetch com retry adaptativo
          const response = await supabaseCircuitBreaker.execute(async () => {
            return await withAdaptiveRetry(
              async () => {
                // Fetch real com headers otimizados
                const fetchResponse = await fetch(url, {
                  ...options,
                  headers: {
                    ...(options.headers || {}),
                    'Alt-Svc': 'clear', // Desabilita QUIC (problemas em redes ruins)
                    'apikey': supabaseAnonKey,
                  },
                });

                // Verificar se response é OK
                if (!fetchResponse.ok && fetchResponse.status >= 500) {
                  throw new Error(`Supabase error: ${fetchResponse.status}`);
                }

                return fetchResponse;
              },
              {
                maxRetries: 3,
                baseTimeout: 5000, // 5s
                timeoutMultiplier: 1.5, // 5s, 7.5s, 11.25s
                baseDelay: 1000,
                delayMultiplier: 2,
                shouldRetry: createFetchRetryPolicy(),
                operationName: 'supabase-fetch',
              }
            );
          });

          // Registrar métrica de sucesso
          const duration = performance.now() - startTime;
          recordPerformanceMetric('supabase-fetch', true, duration);

          return response;
        } catch (error) {
          // Registrar métrica de falha
          const duration = performance.now() - startTime;
          recordPerformanceMetric('supabase-fetch', false, duration);

          logger.error('Supabase fetch failed', { url }, error as Error);
          throw error;
        }
      },
    },
  });

  return _supabaseInstance;
}

// Export as proxy (lazy initialization)
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    return (getSupabaseClient() as any)[prop];
  },
});

// Export circuit breaker para monitoramento
export { supabaseCircuitBreaker };

// ... (resto do arquivo permanece igual)
```

### 📝 Etapa 2.3.5: Criar Endpoint de Monitoramento

**Arquivo**: `src/app/api/admin/network-health/route.ts` (CRIAR NOVO)

```typescript
/**
 * API Route: /api/admin/network-health
 *
 * Monitoramento de saúde de rede e circuit breakers
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/app/api/_middleware/auth';
import { successResponse } from '@/app/api/_utils/response';
import { handleError } from '@/app/api/_utils/errorHandler';
import { getAllPerformanceMetrics } from '@/utils/adaptiveRetry';
import { getAllCircuitBreakers } from '@/utils/circuitBreaker';

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // Métricas de performance
    const performanceMetrics = getAllPerformanceMetrics();

    // Estados dos circuit breakers
    const circuitBreakersMap = getAllCircuitBreakers();
    const circuitBreakers: Record<string, any> = {};

    circuitBreakersMap.forEach((breaker, name) => {
      circuitBreakers[name] = breaker.getMetrics();
    });

    return successResponse(
      {
        performanceMetrics,
        circuitBreakers,
        timestamp: new Date().toISOString(),
      },
      'Health check successful'
    );
  } catch (error) {
    return handleError(error, 'GET /api/admin/network-health');
  }
});
```

### 📝 Etapa 2.3.6: Criar Componente de Status de Rede (opcional)

**Arquivo**: `src/components/NetworkHealthIndicator.tsx` (CRIAR NOVO)

```typescript
/**
 * Indicador visual de saúde de rede
 * Mostra status do circuit breaker e performance
 */

'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabaseCircuitBreaker } from '@/lib/supabaseClient';
import { CircuitState } from '@/utils/circuitBreaker';

export function NetworkHealthIndicator() {
  const [circuitState, setCircuitState] = useState<CircuitState>(CircuitState.CLOSED);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    // Atualizar a cada 5 segundos
    const interval = setInterval(() => {
      const state = supabaseCircuitBreaker.getState();
      const metricsData = supabaseCircuitBreaker.getMetrics();

      setCircuitState(state);
      setMetrics(metricsData);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Não mostrar nada se estiver OK
  if (circuitState === CircuitState.CLOSED && metrics?.failureRate === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {circuitState === CircuitState.CLOSED && (
        <Badge variant="outline" className="gap-2">
          <Wifi className="w-4 h-4 text-green-500" />
          <span>Conexão estável</span>
        </Badge>
      )}

      {circuitState === CircuitState.HALF_OPEN && (
        <Badge variant="outline" className="gap-2 bg-yellow-50">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <span>Reconectando...</span>
        </Badge>
      )}

      {circuitState === CircuitState.OPEN && (
        <Badge variant="destructive" className="gap-2">
          <WifiOff className="w-4 h-4" />
          <span>Problemas de conexão</span>
        </Badge>
      )}

      {metrics && (
        <div className="text-xs text-muted-foreground mt-1">
          Taxa de erro: {(metrics.failureRate * 100).toFixed(1)}%
        </div>
      )}
    </div>
  );
}
```

### 📝 Etapa 2.3.7: Integrar no Layout

**Arquivo**: `src/app/layout.tsx` (adicionar)

```typescript
import { NetworkHealthIndicator } from '@/components/NetworkHealthIndicator';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors />
            {/* ✅ Indicador de saúde de rede */}
            <NetworkHealthIndicator />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

### 📝 Etapa 2.3.8: Validar Retry e Circuit Breaker

**Teste Manual com Chrome DevTools**:

```bash
# 1. Abrir Chrome DevTools
# Network → Throttling → Custom → Add
# - Download: 100 kbps
# - Upload: 50 kbps
# - Latency: 1000ms

# 2. Navegar para página de estudantes
# - Observar retries no console
# - Verificar indicador de rede

# 3. Desconectar internet (Offline)
# - Circuit breaker deve abrir após 5 falhas
# - Indicador deve mostrar "Problemas de conexão"

# 4. Reconectar internet
# - Circuit breaker vai para HALF_OPEN
# - Após 1 requisição bem-sucedida, fecha (CLOSED)
```

**Teste Automatizado**:

**Arquivo**: `scripts/test-retry-circuit-breaker.mjs` (CRIAR NOVO)

```javascript
/**
 * Teste de Retry Adaptativo e Circuit Breaker
 */

import { withAdaptiveRetry } from '../src/utils/adaptiveRetry.ts';
import { getCircuitBreaker, CircuitState } from '../src/utils/circuitBreaker.ts';

async function testRetryAdaptativo() {
  console.log('🧪 Testando Retry Adaptativo...\n');

  let attemptCount = 0;

  try {
    const result = await withAdaptiveRetry(
      async () => {
        attemptCount++;
        console.log(`  Tentativa ${attemptCount}...`);

        // Simular falha nas primeiras 2 tentativas
        if (attemptCount < 3) {
          throw new Error('Network error (simulated)');
        }

        return { success: true, data: 'OK' };
      },
      {
        maxRetries: 3,
        operationName: 'test-retry',
        onRetry: (attempt, error) => {
          console.log(`  ⚠️ Retry ${attempt}: ${error.message}`);
        },
      }
    );

    console.log('  ✅ Sucesso após', attemptCount, 'tentativas\n');
    return true;
  } catch (error) {
    console.log('  ❌ Falha:', error.message, '\n');
    return false;
  }
}

async function testCircuitBreaker() {
  console.log('🧪 Testando Circuit Breaker...\n');

  const breaker = getCircuitBreaker({
    name: 'test-breaker',
    failureThreshold: 3,
    resetTimeout: 5000, // 5s para teste
  });

  // Simular 3 falhas consecutivas (abrir circuito)
  console.log('  Simulando 3 falhas...');
  for (let i = 1; i <= 3; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error('Failed');
      });
    } catch (error) {
      console.log(`  Falha ${i}:`, error.message);
    }
  }

  console.log('  Estado do circuito:', breaker.getState());
  console.log('  Métricas:', breaker.getMetrics(), '\n');

  // Tentar executar com circuito aberto (deve falhar imediatamente)
  console.log('  Tentando executar com circuito ABERTO...');
  try {
    await breaker.execute(async () => 'success');
    console.log('  ❌ NÃO DEVERIA TER EXECUTADO!\n');
    return false;
  } catch (error) {
    console.log('  ✅ Bloqueado corretamente:', error.message, '\n');
  }

  // Aguardar timeout e tentar novamente (half-open)
  console.log('  Aguardando 5s para resetar...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log('  Tentando executar após timeout...');
  await breaker.execute(async () => 'success');
  console.log('  ✅ Circuito fechado novamente\n');

  return true;
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  TESTE: RETRY + CIRCUIT BREAKER');
  console.log('═══════════════════════════════════════════\n');

  const test1 = await testRetryAdaptativo();
  const test2 = await testCircuitBreaker();

  console.log('═══════════════════════════════════════════');
  console.log('  RESULTADO:');
  console.log('  - Retry Adaptativo:', test1 ? '✅ PASSOU' : '❌ FALHOU');
  console.log('  - Circuit Breaker:', test2 ? '✅ PASSOU' : '❌ FALHOU');
  console.log('═══════════════════════════════════════════');
}

main();
```

**Executar teste**:

```bash
npx tsx scripts/test-retry-circuit-breaker.mjs
```

**Critérios de Sucesso**:

- ✅ Retry tenta 3 vezes antes de falhar
- ✅ Timeout aumenta progressivamente (5s → 7.5s → 11.25s)
- ✅ Circuit breaker abre após 5 falhas consecutivas
- ✅ Circuit breaker fecha após sucesso em HALF_OPEN
- ✅ Indicador de rede mostra status correto
- ✅ Taxa de erro em 3G < 5%

---

## 🟠 2.4: Resumo da Fase 2

**Checklist Completo**:

### N+1 Queries (Materialized Views)
- [ ] ✅ 5 MVs criadas (absences, interactions, tasks, certificates, suspensions)
- [ ] ✅ Índices criados para cada MV
- [ ] ✅ Função de refresh global criada
- [ ] ✅ Cron job configurado (pg_cron ou GitHub Actions)
- [ ] ✅ APIs migradas para usar MVs
- [ ] ✅ Query time reduzido em 5-10x (validado)
- [ ] ✅ Endpoint de monitoring criado (/api/admin/materialized-views)

### Paginação Ineficiente (Infinite Scroll)
- [ ] ✅ Cursor-based pagination implementada no backend
- [ ] ✅ useInfiniteStudents criado
- [ ] ✅ InfiniteScrollContainer criado
- [ ] ✅ Componentes migrados para infinite scroll
- [ ] ✅ UX progressiva validada (dados aparecem imediatamente)
- [ ] ✅ Performance em 3G: < 2s por página

### Timeout Conservador (Retry + Circuit Breaker)
- [ ] ✅ adaptiveRetry.ts criado e testado
- [ ] ✅ circuitBreaker.ts criado e testado
- [ ] ✅ Supabase client integrado com retry + circuit breaker
- [ ] ✅ NetworkHealthIndicator criado
- [ ] ✅ Endpoint de monitoring criado (/api/admin/network-health)
- [ ] ✅ Testes automatizados passando
- [ ] ✅ Taxa de erro < 5% em 3G validada

**Métricas Esperadas Após Fase 2**:

| Métrica | Após Fase 1 | Após Fase 2 | Melhoria |
|---------|-------------|-------------|----------|
| Loading Time (3G) | 15-20s | 5-8s | **3x** |
| Query Time (com JOIN) | 2-5s | 300-800ms | **7x** |
| UX (primeira interação) | 15s | < 1s | **15x** |
| Taxa de erro | 15-20% | < 5% | **4x** |

**Tempo Estimado Fase 2**: 3-4 dias

**Deploy Fase 2**:

```bash
# 1. Commit
git add .
git commit -m "feat(optimization): Fase 2 - MVs, Infinite Scroll, Retry + Circuit Breaker"

# 2. Push
git push origin optimization/supabase-network-performance

# 3. Validar
npm run lighthouse:staging
npm run test:compression:prod

# 4. Criar tag
git tag -a v1.2-optimization-high -m "Fase 2: Altas prioridades concluídas"
git push origin v1.2-optimization-high
```

---

**FIM DA FASE 2** ✅

**PRÓXIMO**: Fase 3 (Otimizações Médias) → Índices, Explain Analyze, Connection Pooling
