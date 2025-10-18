/**
 * Middleware de Autenticação
 *
 * Verifica se o usuário está autenticado via Firebase Auth
 * e fornece o userId para as API Routes.
 *
 * **NOTA**: Firebase é usado APENAS para autenticação.
 * Dados são armazenados no Supabase PostgreSQL.
 *
 * @example
 * ```typescript
 * export const GET = withAuth(async (req, userId) => {
 *   // userId está disponível aqui (Firebase UID)
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
 * Higher-order function que adiciona autenticação a uma API Route
 */
export function withAuth<T = any>(handler: AuthenticatedHandler<T>) {
  return async (req: NextRequest, context?: T): Promise<NextResponse> => {
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
