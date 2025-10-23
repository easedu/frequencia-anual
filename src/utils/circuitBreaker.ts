/**
 * Circuit Breaker Pattern
 * Protege contra falhas em cascata
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Funcionando normalmente
  OPEN = 'OPEN',         // Muitas falhas, rejeita requisições
  HALF_OPEN = 'HALF_OPEN' // Tentando recuperar
}

export interface CircuitBreakerOptions {
  /** Limite de falhas antes de abrir o circuito (padrão: 5) */
  failureThreshold?: number;
  /** Timeout em ms para tentar fechar novamente (padrão: 60000 = 1min) */
  resetTimeout?: number;
  /** Callback quando o circuito abre */
  onOpen?: () => void;
  /** Callback quando o circuito fecha */
  onClose?: () => void;
  /** Callback quando o circuito meio-abre */
  onHalfOpen?: () => void;
}

const DEFAULT_OPTIONS: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minuto
  onOpen: () => console.warn('[Circuit Breaker] ABERTO - Bloqueando requisições'),
  onClose: () => console.log('[Circuit Breaker] FECHADO - Requisições normais'),
  onHalfOpen: () => console.log('[Circuit Breaker] MEIO-ABERTO - Tentando recuperar')
};

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private options: Required<CircuitBreakerOptions>;

  constructor(options?: CircuitBreakerOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Executa uma função protegida pelo circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Se circuito está ABERTO
    if (this.state === CircuitState.OPEN) {
      // Verificar se já passou o tempo de reset
      if (this.shouldAttemptReset()) {
        this.halfOpen();
      } else {
        throw new Error('Circuit breaker is OPEN - rejecting requests');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Marca sucesso - reseta contador de falhas
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.close();
    }
  }

  /**
   * Marca falha - incrementa contador
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    // Se ultrapassou o limite, abre o circuito
    if (this.failureCount >= this.options.failureThreshold) {
      this.open();
    }
  }

  /**
   * Abre o circuito (bloqueia requisições)
   */
  private open(): void {
    this.state = CircuitState.OPEN;
    this.options.onOpen();
  }

  /**
   * Fecha o circuito (volta ao normal)
   */
  private close(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.options.onClose();
  }

  /**
   * Meio-abre o circuito (tenta recuperar)
   */
  private halfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.options.onHalfOpen();
  }

  /**
   * Verifica se deve tentar resetar o circuito
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    return Date.now() - this.lastFailureTime >= this.options.resetTimeout;
  }

  /**
   * Retorna o estado atual do circuito
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Retorna estatísticas do circuito
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      timeSinceLastFailure: this.lastFailureTime
        ? Date.now() - this.lastFailureTime
        : null
    };
  }

  /**
   * Reseta manualmente o circuito
   */
  reset(): void {
    this.close();
  }
}

/**
 * Circuit Breaker Global para APIs
 * Use uma instância compartilhada por serviço
 */
export const apiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000
});

/**
 * Wrapper para fetch com circuit breaker
 */
export async function fetchWithCircuitBreaker(
  url: string,
  init?: RequestInit,
  breaker: CircuitBreaker = apiCircuitBreaker
): Promise<Response> {
  return breaker.execute(async () => {
    const response = await fetch(url, init);

    // Considerar erro 5xx como falha
    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`);
    }

    return response;
  });
}

/**
 * Hook React para usar circuit breaker
 */
import React from 'react';

export function useCircuitBreaker(options?: CircuitBreakerOptions) {
  const breakerRef = React.useRef(new CircuitBreaker(options));
  const [state, setState] = React.useState(breakerRef.current.getState());

  // Atualizar estado quando mudar
  React.useEffect(() => {
    const interval = setInterval(() => {
      setState(breakerRef.current.getState());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    breaker: breakerRef.current,
    state,
    stats: breakerRef.current.getStats(),
    reset: () => breakerRef.current.reset()
  };
}
