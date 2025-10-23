/**
 * API Timeout Utilities
 *
 * Helpers para gerenciar timeouts em API routes do Vercel Free Plan (10s max)
 */

/**
 * Executa uma promise com timeout
 * @param promise - Promise a executar
 * @param timeoutMs - Timeout em milissegundos (padrão: 8000ms = 8s)
 * @param timeoutMessage - Mensagem de erro personalizada
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 8000,
  timeoutMessage = 'Operação excedeu o tempo limite'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Verifica se uma operação está próxima do timeout do Vercel
 * @param startTime - Timestamp do início da operação
 * @param maxDuration - Duração máxima em ms (padrão: 10000 = 10s)
 * @returns true se está próximo do timeout (>80%)
 */
export function isNearTimeout(startTime: number, maxDuration: number = 10000): boolean {
  const elapsed = Date.now() - startTime;
  return elapsed > maxDuration * 0.8; // 80% do tempo
}

/**
 * Cria um AbortController que aborta após timeout
 * @param timeoutMs - Timeout em milissegundos
 */
export function createTimeoutController(timeoutMs: number = 8000): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    controller,
    cleanup: () => clearTimeout(timeoutId)
  };
}

/**
 * Wrapper para fetch com timeout automático
 * @param url - URL para fetch
 * @param options - Opções de fetch
 * @param timeoutMs - Timeout em milissegundos (padrão: 5000ms)
 */
export async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs: number = 5000
): Promise<Response> {
  const { controller, cleanup } = createTimeoutController(timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    cleanup();
    return response;
  } catch (error) {
    cleanup();
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout após ${timeoutMs}ms: ${url}`);
    }
    throw error;
  }
}
