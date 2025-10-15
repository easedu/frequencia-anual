/**
 * Provedor de Autenticação (Abstração)
 *
 * @description Interface comum para diferentes provedores de autenticação
 * Permite trocar entre Firebase Auth, Supabase Auth, Auth0, etc. sem modificar código
 *
 * @pattern Strategy Pattern
 */

/**
 * Usuário autenticado (normalizado entre provedores)
 */
export interface AuthUser {
  id: string;              // uid (Firebase) ou id (Supabase)
  email?: string;          // Email do usuário
  role?: string;           // Role/função (se usar custom claims ou RLS)
  metadata?: Record<string, unknown>; // Dados extras do provedor
}

/**
 * Resultado de validação de token
 */
export interface AuthValidationResult {
  valid: boolean;          // Se token é válido
  user?: AuthUser;         // Dados do usuário (se válido)
  error?: string;          // Mensagem de erro (se inválido)
}

/**
 * Interface de Provedor de Autenticação
 *
 * @description Todos os provedores (Firebase, Supabase, etc) devem implementar esta interface
 */
export interface AuthProvider {
  /**
   * Validar token JWT do usuário
   *
   * @param token - Token JWT (geralmente extraído do header Authorization)
   * @returns Resultado da validação com dados do usuário
   */
  validateToken(token: string): Promise<AuthValidationResult>;

  /**
   * Nome do provedor (para logs e debugging)
   */
  name: string;
}
