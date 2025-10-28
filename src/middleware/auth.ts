/**
 * Middleware de Autenticação
 *
 * @description Valida autenticação de usuários nas API Routes
 * Funciona com Firebase Auth (atual) e Supabase Auth (futuro)
 *
 * @usage
 * import { validateAuth } from '@/middleware/auth';
 *
 * export async function POST(request: NextRequest) {
 *   const authResult = await validateAuth(request);
 *   if (authResult instanceof NextResponse) return authResult;
 *
 *   const { user } = authResult;
 *   // ... usar user.id, user.email, etc
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthProvider } from '@/lib/auth';
import { AuthUser } from '@/lib/auth/authProvider';
import { logger } from '@/utils/logger';

/**
 * Resultado de autenticação bem-sucedida
 */
export interface AuthenticatedRequest {
  valid: true;
  user: AuthUser;
}

/**
 * Resultado de autenticação (sucesso ou erro)
 */
export type AuthResult = AuthenticatedRequest | NextResponse;

/**
 * Validar autenticação do usuário
 *
 * @param request - Request do Next.js
 * @returns AuthenticatedRequest (se válido) ou NextResponse com erro 401
 *
 * @example
 * const authResult = await validateAuth(request);
 * if (authResult instanceof NextResponse) {
 *   return authResult; // Retorna erro 401
 * }
 *
 * const { user } = authResult; // Usuário autenticado
 * console.log(user.id, user.email);
 */
export async function validateAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // Extrair token do header Authorization
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      logger.warn('Auth attempt without Authorization header', {
        url: request.url,
        method: request.method
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Token de autenticação não fornecido'
        },
        { status: 401 }
      );
    }

    // Verificar formato: "Bearer <token>"
    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('Auth attempt with invalid Authorization format', {
        url: request.url,
        format: authHeader.substring(0, 10) + '...'
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Formato de token inválido. Use: Authorization: Bearer <token>'
        },
        { status: 401 }
      );
    }

    // Extrair token
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      logger.warn('Auth attempt with empty token');

      return NextResponse.json(
        {
          success: false,
          error: 'Token vazio'
        },
        { status: 401 }
      );
    }

    // Validar token usando provedor configurado (Firebase ou Supabase)
    const authProvider = getAuthProvider();
    const result = await authProvider.validateToken(token);

    if (!result.valid || !result.user) {
      logger.warn('Auth token validation failed', {
        provider: authProvider.name,
        error: result.error,
        url: request.url
      });

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Token inválido ou expirado'
        },
        { status: 401 }
      );
    }

    // Autenticação bem-sucedida!

    return {
      valid: true,
      user: result.user
    };

  } catch (error) {
    logger.error('Auth validation error', {
      url: request.url
    }, error as Error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao validar autenticação'
      },
      { status: 500 }
    );
  }
}

/**
 * Verificar se usuário é admin (exemplo de autorização customizada)
 *
 * @param user - Usuário autenticado
 * @returns true se for admin
 *
 * @future Implementar lógica de roles/permissões
 */
export function isAdmin(user: AuthUser): boolean {
  // TODO: Implementar lógica de verificação de role
  // Pode usar custom claims do Firebase ou RLS do Supabase
  return user.role === 'admin';
}
