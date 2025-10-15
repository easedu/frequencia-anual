/**
 * Supabase Auth Provider (Preparado para migração futura)
 *
 * @description Implementação do provedor de autenticação usando Supabase Auth
 * NOTA: Este arquivo está preparado para quando migrarmos de Firebase para Supabase Auth
 *
 * Para ativar: Instalar @supabase/supabase-js e configurar variáveis de ambiente
 */

import { AuthProvider, AuthValidationResult, AuthUser } from './authProvider';

/**
 * Provedor de autenticação Supabase
 *
 * @implements {AuthProvider}
 * @future Este será usado quando migrarmos para Supabase Auth
 */
export class SupabaseAuthProvider implements AuthProvider {
  name = 'Supabase Auth';

  /**
   * Validar token JWT do Supabase
   *
   * @param token - Token JWT (do header Authorization)
   * @returns Resultado da validação com dados do usuário
   */
  async validateToken(token: string): Promise<AuthValidationResult> {
    try {
      // TODO: Implementar quando migrar para Supabase Auth
      //
      // Exemplo de implementação futura:
      //
      // import { createClient } from '@supabase/supabase-js';
      //
      // const supabase = createClient(
      //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
      //   process.env.SUPABASE_SERVICE_ROLE_KEY!
      // );
      //
      // const { data, error } = await supabase.auth.getUser(token);
      //
      // if (error || !data.user) {
      //   return {
      //     valid: false,
      //     error: error?.message || 'Token inválido'
      //   };
      // }
      //
      // const user: AuthUser = {
      //   id: data.user.id,
      //   email: data.user.email,
      //   role: data.user.role,
      //   metadata: {
      //     provider: 'supabase',
      //     emailVerified: data.user.email_confirmed_at !== null,
      //   }
      // };
      //
      // return {
      //   valid: true,
      //   user
      // };

      throw new Error('Supabase Auth não está configurado ainda. Use Firebase Auth.');

    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Erro ao validar token'
      };
    }
  }
}
