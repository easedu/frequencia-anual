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

export type AuthenticatedHandler<T = unknown> = (
  req: NextRequest,
  userId: string,
  context?: T
) => Promise<NextResponse>;

/**
 * Higher-order function que adiciona autenticação a uma API Route
 */
export function withAuth<T = unknown>(handler: AuthenticatedHandler<T>) {
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
export function withBearerOrBasicAuth<T = unknown>(handler: AuthenticatedHandler<T>) {
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
