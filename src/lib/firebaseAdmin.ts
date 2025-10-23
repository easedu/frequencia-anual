/**
 * Firebase Admin SDK Configuration
 *
 * ⚠️ DEPRECIADO: Use lib/auth/firebaseAuthProvider.ts
 *
 * Este arquivo foi mantido APENAS para compatibilidade retroativa.
 * Todas as novas implementações devem usar FirebaseAuthProvider.
 *
 * IMPORTANTE: Este arquivo redireciona para a implementação moderna
 * para evitar múltiplas inicializações do Firebase Admin.
 */

import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/**
 * @deprecated Use FirebaseAuthProvider do lib/auth
 */
export function getAdminAuth() {
  const apps = getApps();
  if (apps.length === 0) {
    throw new Error(
      'Firebase Admin não inicializado. Use FirebaseAuthProvider.validateToken() ao invés de getAdminAuth()'
    );
  }
  return getAuth(apps[0]);
}

/**
 * @deprecated Firestore não é mais usado (migrado para Supabase)
 */
export function getAdminDb() {
  throw new Error(
    'Firestore foi descontinuado. Use Supabase (lib/supabaseAdmin.ts)'
  );
}

// Exportar compatibilidade com código legado
export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_target, prop) {
    return (getAdminAuth() as any)[prop];
  }
});

export const adminDb = new Proxy({} as any, {
  get() {
    throw new Error('Firestore descontinuado. Use Supabase.');
  }
});
