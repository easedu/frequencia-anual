/**
 * Timeout Wrapper Universal para APIs Públicas
 *
 * Use este wrapper em APIs que NÃO precisam de autenticação
 * mas ainda precisam de timeout para evitar exceder Vercel Free Plan.
 *
 * Para APIs autenticadas, use withAuth() (já inclui timeout).
 */

import { NextRequest, NextResponse } from 'next/server';

export type PublicApiHandler = (
  req: NextRequest,
  ...args: unknown[]
) => Promise<NextResponse | Response>;

/**
 * Wrapper que adiciona timeout em APIs públicas (sem auth)
 *
 * @param handler - Handler da API
 * @param timeoutMs - Timeout em ms (padrão: 8000ms = 8s)
 *
 * @example
 * ```typescript
 * // API pública com timeout
 * export const GET = withTimeout(async (req: NextRequest) => {
 *   const data = await fetchPublicData();
 *   return NextResponse.json(data);
 * });
 * ```
 */
export function withTimeout<T extends PublicApiHandler>(
  handler: T,
  timeoutMs: number = 8000
): T {
  return (async (req: NextRequest, ...args: unknown[]) => {
    const startTime = Date.now();

    // Promise de timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        const elapsed = Date.now() - startTime;
        reject(
          new Error(
            `API timeout após ${elapsed}ms (limite: ${timeoutMs}ms) - ${req.method} ${req.nextUrl.pathname}`
          )
        );
      }, timeoutMs);
    });

    // Promise do handler
    const handlerPromise = handler(req, ...args);

    try {
      // Race: retorna o que completar primeiro
      const response = await Promise.race([handlerPromise, timeoutPromise]);

      // Log de performance (apenas se >2s)
      const elapsed = Date.now() - startTime;
      if (elapsed > 2000) {
        console.warn(`⚠️ API lenta (public): ${req.method} ${req.nextUrl.pathname} - ${elapsed}ms`);
      }

      return response;
    } catch (error) {
      const elapsed = Date.now() - startTime;

      // Log estruturado
      console.error('❌ Erro na API (public):', {
        method: req.method,
        path: req.nextUrl.pathname,
        elapsed: `${elapsed}ms`,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Retornar 504 se foi timeout
      if (error instanceof Error && error.message.includes('timeout')) {
        return NextResponse.json(
          {
            success: false,
            error: 'TIMEOUT',
            message: 'A operação demorou muito tempo. Tente novamente ou simplifique a requisição.',
            details: {
              elapsed: `${elapsed}ms`,
              limit: `${timeoutMs}ms`,
              path: req.nextUrl.pathname
            }
          },
          { status: 504 }
        );
      }

      // Retornar 500 para outros erros
      return NextResponse.json(
        {
          success: false,
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erro interno do servidor',
          details: {
            elapsed: `${elapsed}ms`,
            path: req.nextUrl.pathname
          }
        },
        { status: 500 }
      );
    }
  }) as T;
}

/**
 * Verifica se está próximo do timeout
 *
 * @param startTime - Date.now() do início da operação
 * @param timeoutMs - Timeout configurado em ms
 * @returns true se elapsed >= 80% do timeout
 *
 * @example
 * ```typescript
 * const startTime = Date.now();
 * // ... operação demorada
 * if (isNearTimeout(startTime, 8000)) {
 *   // Abortar ou retornar resposta parcial
 *   return NextResponse.json({ partial: true, data });
 * }
 * ```
 */
export function isNearTimeout(startTime: number, timeoutMs: number = 8000): boolean {
  const elapsed = Date.now() - startTime;
  return elapsed >= timeoutMs * 0.8; // 80% do tempo
}
