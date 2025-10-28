/**
 * Timeout Middleware para API Routes
 *
 * Wrapper universal que adiciona timeout de 8s em TODAS as APIs
 * para garantir que não excedam o limite do Vercel Free Plan (10s)
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Handler type para API routes
 */
type ApiHandler = (
  req: NextRequest,
  ...args: unknown[]
) => Promise<NextResponse | Response>;

/**
 * Wrapper que adiciona timeout automático em API routes
 *
 * @param handler - Handler da API route
 * @param timeoutMs - Timeout em milissegundos (padrão: 8000ms = 8s)
 * @returns Handler com timeout aplicado
 *
 * @example
 * export const GET = withApiTimeout(async (req: NextRequest) => {
 *   const data = await fetchData();
 *   return successResponse(data);
 * });
 */
export function withApiTimeout<T extends ApiHandler>(
  handler: T,
  timeoutMs: number = 8000
): T {
  return (async (req: NextRequest, ...args: unknown[]) => {
    const startTime = Date.now();

    // Promise do handler original
    const handlerPromise = handler(req, ...args);

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

    try {
      // Race: retorna o que completar primeiro
      const response = await Promise.race([handlerPromise, timeoutPromise]);

      // Log de performance (apenas se demorou >2s)
      const elapsed = Date.now() - startTime;
      if (elapsed > 2000) {
        console.warn(`⚠️ API lenta: ${req.method} ${req.nextUrl.pathname} - ${elapsed}ms`);
      }

      return response;
    } catch (error) {
      const elapsed = Date.now() - startTime;

      // Log de erro estruturado
      console.error('❌ Erro na API:', {
        method: req.method,
        path: req.nextUrl.pathname,
        elapsed: `${elapsed}ms`,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Retornar erro 504 Gateway Timeout se foi timeout
      if (error instanceof Error && error.message.includes('timeout')) {
        return NextResponse.json(
          {
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

      // Retornar erro 500 para outros erros
      return NextResponse.json(
        {
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
 * Wrapper combinado: Auth + Timeout
 *
 * Combina autenticação do withAuth com timeout automático
 *
 * @param handler - Handler com userId do withAuth
 * @param timeoutMs - Timeout em milissegundos (padrão: 8000ms)
 *
 * @example
 * export const GET = withAuthAndTimeout(
 *   async (req: NextRequest, _userId: string) => {
 *     const data = await fetchData(userId);
 *     return successResponse(data);
 *   }
 * );
 */
export function withAuthAndTimeout<
  T extends (req: NextRequest, userId: string, ...args: unknown[]) => Promise<NextResponse | Response>
>(handler: T, timeoutMs: number = 8000): T {
  // Importar withAuth dinamicamente para evitar circular dependency
  const { withAuth } = require('./auth') as { withAuth: (h: T) => T };

  // Aplicar timeout primeiro, depois auth
  const timeoutHandler = withApiTimeout(handler as ApiHandler, timeoutMs) as T;
  return withAuth(timeoutHandler);
}

/**
 * Verifica se uma operação está próxima do timeout
 *
 * @param startTime - Timestamp do início (Date.now())
 * @param timeoutMs - Timeout configurado em ms
 * @returns true se está em 80% ou mais do timeout
 *
 * @example
 * const startTime = Date.now();
 * // ... operação demorada
 * if (isNearTimeout(startTime, 8000)) {
 *   console.warn('Operação próxima do timeout!');
 *   return respostaParcial;
 * }
 */
export function isNearTimeout(startTime: number, timeoutMs: number = 8000): boolean {
  const elapsed = Date.now() - startTime;
  return elapsed >= timeoutMs * 0.8; // 80% do tempo
}
