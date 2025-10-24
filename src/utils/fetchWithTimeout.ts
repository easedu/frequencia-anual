/**
 * Fetch wrapper com timeout configurável e keepalive para redes 2G/3G
 * 
 * @param url - URL da requisição
 * @param options - Opções do fetch
 * @param timeoutMs - Timeout em milissegundos (padrão: 60000 = 60s)
 * @returns Response do fetch
 * @throws Error se timeout excedido
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 60000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      keepalive: true, // Manter conexão em redes instáveis
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // Verificar se foi timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Timeout ao fazer requisição para ${url} (rede muito lenta). Tente novamente.`
      );
    }

    throw error;
  }
}
