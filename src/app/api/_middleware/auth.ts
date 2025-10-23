/**
 * Middleware de Autenticação + Timeout
 *
 * Verifica se o usuário está autenticado via Firebase Auth
 * e fornece o userId para as API Routes.
 *
 * ⚠️ IMPORTANTE: Automaticamente adiciona timeout de 8s para evitar
 * exceder o limite do Vercel Free Plan (10s).
 *
 * **NOTA**: Firebase é usado APENAS para autenticação.
 * Dados são armazenados no Supabase PostgreSQL.
 *
 * @example
 * ```typescript
 * export const GET = withAuth(async (req, userId) => {
 *   // userId está disponível aqui (Firebase UID)
 *   // Timeout de 8s aplicado automaticamente
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

export type AuthenticatedHandler<T = any> = (
  req: NextRequest,
  userId: string,
  context?: T
) => Promise<NextResponse>;

/**
 * Higher-order function que adiciona autenticação + timeout a uma API Route
 *
 * @param handler - Handler da API
 * @param timeoutMs - Timeout em ms (padrão: 8000ms)
 */
export function withAuth<T = any>(
  handler: AuthenticatedHandler<T>,
  timeoutMs: number = 8000
) {
  return async (req: NextRequest, context?: T): Promise<NextResponse> => {
    const startTime = Date.now();

    // Promise de timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        const elapsed = Date.now() - startTime;
        reject(
          new Error(
            `Auth timeout após ${elapsed}ms - ${req.method} ${req.nextUrl.pathname}`
          )
        );
      }, timeoutMs);
    });

    // Promise de autenticação + handler
    const authPromise = async (): Promise<NextResponse> => {
    try {
      // 1. Obter token de autenticação do header
      const authHeader = req.headers.get('Authorization');

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized',
            message: 'Token de autenticação ausente ou inválido.',
          },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7); // Remove "Bearer "

      // 2. Verificar token com Firebase Admin
      const decodedToken = await adminAuth.verifyIdToken(token);

      // 3. Verificar autenticação
      if (!decodedToken || !decodedToken.uid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized',
            message: 'Usuário não autenticado. Faça login para continuar.',
          },
          { status: 401 }
        );
      }

        // 4. Executar handler com userId (Firebase UID) e context (para rotas dinâmicas [id])
        return await handler(req, decodedToken.uid, context);
      } catch (error) {
        console.error('[Auth Middleware] Error:', error);
        return NextResponse.json(
          {
            success: false,
            error: 'Internal Server Error',
            message: 'Erro ao verificar autenticação.',
          },
          { status: 500 }
        );
      }
    };

    try {
      // Race: timeout vs autenticação
      const response = await Promise.race([authPromise(), timeoutPromise]);

      // Log de performance
      const elapsed = Date.now() - startTime;
      if (elapsed > 2000) {
        console.warn(`⚠️ API lenta (auth): ${req.method} ${req.nextUrl.pathname} - ${elapsed}ms`);
      }

      return response;
    } catch (error) {
      const elapsed = Date.now() - startTime;

      // Log estruturado
      console.error('❌ Erro na API (auth):', {
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
            message: 'A operação demorou muito tempo. Tente novamente.',
            details: {
              elapsed: `${elapsed}ms`,
              limit: `${timeoutMs}ms`
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
          message: error instanceof Error ? error.message : 'Erro interno',
          details: { elapsed: `${elapsed}ms` }
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware que aceita AMBOS: Bearer Token (Firebase) OU Basic Auth
 *
 * Usado para APIs que precisam ser chamadas tanto pelo frontend (Bearer Token)
 * quanto por automações internas (Basic Auth).
 *
 * @example
 * ```typescript
 * export const POST = withBearerOrBasicAuth(async (req, userId) => {
 *   // userId = Firebase UID (se Bearer) ou 'AUTOMAÇÃO' (se Basic Auth)
 * });
 * ```
 */
export function withBearerOrBasicAuth<T = any>(handler: AuthenticatedHandler<T>) {
  return async (req: NextRequest, context?: T): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get('Authorization');

      if (!authHeader) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized',
            message: 'Token de autenticação ausente.',
          },
          { status: 401 }
        );
      }

      // 🔐 OPÇÃO 1: Bearer Token (Firebase - Frontend)
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decodedToken = await adminAuth.verifyIdToken(token);

        if (!decodedToken || !decodedToken.uid) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized', message: 'Token inválido.' },
            { status: 401 }
          );
        }

        return await handler(req, decodedToken.uid, context);
      }

      // 🔐 OPÇÃO 2: Basic Auth (Automação Interna)
      if (authHeader.startsWith('Basic ')) {
        const base64Credentials = authHeader.substring(6);
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');

        const expectedUsername = process.env.API_HABIB_KYRILLOS_USERNAME;
        const expectedPassword = process.env.API_HABIB_KYRILLOS_PASSWORD;

        if (username === expectedUsername && password === expectedPassword) {
          // ✅ Basic Auth válido - usar userId especial para automação
          return await handler(req, 'AUTOMAÇÃO', context);
        }

        return NextResponse.json(
          { success: false, error: 'Unauthorized', message: 'Credenciais inválidas.' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Tipo de autenticação não suportado. Use Bearer ou Basic.',
        },
        { status: 401 }
      );
    } catch (error) {
      console.error('[BearerOrBasicAuth Middleware] Error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal Server Error', message: 'Erro ao verificar autenticação.' },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware de autenticação opcional
 * Fornece userId se autenticado, null caso contrário
 */
export type OptionalAuthHandler = (
  req: NextRequest,
  userId: string | null
) => Promise<NextResponse>;

export function withOptionalAuth(handler: OptionalAuthHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get('Authorization');

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Sem token, continua com userId = null
        return await handler(req, null);
      }

      const token = authHeader.substring(7);

      // Tentar validar com Firebase Admin
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        return await handler(req, decodedToken?.uid ?? null);
      } catch {
        // Token inválido, continua com null
        return await handler(req, null);
      }
    } catch (error) {
      console.error('[Optional Auth Middleware] Error:', error);
      // Continua sem autenticação em caso de erro
      return await handler(req, null);
    }
  };
}
