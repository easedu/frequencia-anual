/**
 * Auth Provider - Barrel Export e Factory
 *
 * @description Exporta interface e implementações de provedores de autenticação
 * Factory Pattern para escolher qual provedor usar
 */

import { AuthProvider } from './authProvider';
import { FirebaseAuthProvider } from './firebaseAuthProvider';
import { SupabaseAuthProvider } from './supabaseAuthProvider';

/**
 * Factory: Obter provedor de autenticação configurado
 *
 * @returns Instância do provedor de autenticação
 *
 * @example
 * // No .env.local:
 * // AUTH_PROVIDER=firebase (ou supabase)
 *
 * const authProvider = getAuthProvider();
 * const result = await authProvider.validateToken(token);
 */
export function getAuthProvider(): AuthProvider {
  const provider = process.env.AUTH_PROVIDER || 'firebase';

  switch (provider.toLowerCase()) {
    case 'firebase':
      return new FirebaseAuthProvider();

    case 'supabase':
      return new SupabaseAuthProvider();

    default:
      throw new Error(
        `Auth provider "${provider}" não suportado. Use "firebase" ou "supabase".`
      );
  }
}

// Exports
export * from './authProvider';
export { FirebaseAuthProvider } from './firebaseAuthProvider';
export { SupabaseAuthProvider } from './supabaseAuthProvider';
