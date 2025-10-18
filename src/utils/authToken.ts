/**
 * Auth Token Helper
 *
 * Fornece o token de autenticação Firebase para uso em serviços.
 * Centraliza a lógica de obtenção do token para evitar duplicação.
 */

import { auth } from '@/firebase.config';

/**
 * Obtém o token de autenticação do usuário logado
 *
 * @returns Token JWT do Firebase ou null se não autenticado
 * @throws Error se houver problema ao obter o token
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;

    if (!user) {
      console.warn('[authToken] Usuário não autenticado');
      return null;
    }

    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('[authToken] Erro ao obter token:', error);
    throw error;
  }
}

/**
 * Obtém headers de autenticação prontos para fetch
 *
 * @returns Headers com Authorization Bearer token
 * @throws Error se usuário não estiver autenticado
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('Usuário não autenticado. Faça login para continuar.');
  }

  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
