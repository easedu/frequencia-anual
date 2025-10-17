/**
 * Middleware de Autenticação
 *
 * Verifica se o usuário está autenticado via Supabase Auth
 * e fornece o userId para as API Routes.
 *
 * @example
 * ```typescript
 * export const GET = withAuth(async (req, userId) => {
 *   // userId está disponível aqui
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export type AuthenticatedHandler = (
  req: NextRequest,
  userId: string
) => Promise<NextResponse>;

/**
 * Higher-order function que adiciona autenticação a uma API Route
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
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

      // 2. Verificar token com Supabase Admin
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(token);

      // 3. Verificar autenticação
      if (error || !user) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized',
            message: 'Usuário não autenticado. Faça login para continuar.',
          },
          { status: 401 }
        );
      }

      // 4. Executar handler com userId
      return await handler(req, user.id);
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
      const {
        data: { user },
      } = await supabaseAdmin.auth.getUser(token);

      return await handler(req, user?.id ?? null);
    } catch (error) {
      console.error('[Optional Auth Middleware] Error:', error);
      // Continua sem autenticação em caso de erro
      return await handler(req, null);
    }
  };
}
