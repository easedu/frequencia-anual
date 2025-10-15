/**
 * Evolution API - Cliente HTTP Base
 *
 * @description Cliente HTTP genérico para comunicação com Evolution API
 * Gerencia autenticação, timeouts, tratamento de erros
 */

import { evolutionConfig, buildEvolutionUrl } from '@/lib/whatsapp/evolutionConfig';
import { EvolutionError } from '@/types/whatsapp/evolution';
import { logger } from '@/utils/logger';

/**
 * Cliente HTTP base para Evolution API
 */
export class EvolutionClient {
  /**
   * Fazer requisição à Evolution API
   *
   * @param endpoint - Endpoint da API (ex: "/message/sendText/{instance}")
   * @param options - Opções da requisição (método, body, etc)
   * @returns Resposta parseada da API
   *
   * @throws {Error} Se requisição falhar ou API retornar erro
   */
  static async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = buildEvolutionUrl(endpoint);
    const method = options.method || 'GET';

    try {
      logger.debug('Evolution API Request', {
        endpoint,
        method,
        url: url.replace(evolutionConfig.apiKey, '***') // Ocultar API key nos logs
      });

      // Criar AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        evolutionConfig.timeout || 30000
      );

      try {
        const response = await fetch(url, {
          ...options,
          method,
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionConfig.apiKey,
            ...options.headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Tentar parsear resposta
        let data: any;
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          data = { message: text };
        }

        // Verificar se resposta foi bem-sucedida
        if (!response.ok) {
          const error = data as EvolutionError;

          logger.error('Evolution API Error Response', {
            status: response.status,
            statusText: response.statusText,
            error: error.message || error.error,
            endpoint
          });

          throw new Error(
            error.message || error.error || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        logger.debug('Evolution API Success', {
          status: response.status,
          endpoint
        });

        return data as T;

      } catch (fetchError) {
        clearTimeout(timeoutId);

        // Tratar erro de timeout
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          logger.error('Evolution API Timeout', {
            endpoint,
            timeout: evolutionConfig.timeout
          });
          throw new Error(`Timeout: Evolution API não respondeu em ${evolutionConfig.timeout}ms`);
        }

        throw fetchError;
      }

    } catch (error) {
      // Tratamento de erros genéricos
      if (error instanceof Error) {
        // Erro de rede
        if (error.message.includes('Failed to fetch') || error.message.includes('fetch failed')) {
          logger.error('Evolution API Network Error', { endpoint }, error);
          throw new Error(
            'Erro de rede: Não foi possível conectar à Evolution API. Verifique se o servidor está rodando.'
          );
        }

        // Erro CORS
        if (error.message.includes('CORS')) {
          logger.error('Evolution API CORS Error', { endpoint }, error);
          throw new Error('Erro CORS: Evolution API não permite requisições deste domínio.');
        }
      }

      logger.error('Evolution API Request Failed', { endpoint }, error as Error);
      throw error;
    }
  }

  /**
   * POST request
   *
   * @param endpoint - Endpoint da API
   * @param body - Corpo da requisição
   * @returns Resposta parseada
   */
  static async post<T = unknown>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * GET request
   *
   * @param endpoint - Endpoint da API
   * @returns Resposta parseada
   */
  static async get<T = unknown>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  /**
   * PUT request
   *
   * @param endpoint - Endpoint da API
   * @param body - Corpo da requisição
   * @returns Resposta parseada
   */
  static async put<T = unknown>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   *
   * @param endpoint - Endpoint da API
   * @returns Resposta parseada
   */
  static async delete<T = unknown>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}
