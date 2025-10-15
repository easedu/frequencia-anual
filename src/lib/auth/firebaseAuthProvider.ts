/**
 * Firebase Auth Provider
 *
 * @description Implementação do provedor de autenticação usando Firebase Admin SDK
 * Valida tokens JWT do Firebase Auth no servidor
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { AuthProvider, AuthValidationResult, AuthUser } from './authProvider';

/**
 * Inicializar Firebase Admin (singleton)
 */
let adminApp: App | null = null;
let adminAuth: Auth | null = null;

function getFirebaseAdmin(): { app: App; auth: Auth } {
  if (adminApp && adminAuth) {
    return { app: adminApp, auth: adminAuth };
  }

  // Verificar se já existe alguma app inicializada
  const apps = getApps();
  if (apps.length > 0) {
    adminApp = apps[0];
    adminAuth = getAuth(adminApp);
    return { app: adminApp, auth: adminAuth };
  }

  // Inicializar nova app
  try {
    // Tentar usar o service account JSON completo primeiro
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      // Parse do JSON do service account
      const serviceAccount = JSON.parse(serviceAccountKey);

      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });

      adminAuth = getAuth(adminApp);
      console.log('✅ Firebase Admin inicializado com sucesso (usando FIREBASE_SERVICE_ACCOUNT_KEY)');
      return { app: adminApp, auth: adminAuth };
    }

    // Fallback para variáveis separadas (se configuradas)
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Firebase Admin não configurado. Defina FIREBASE_SERVICE_ACCOUNT_KEY ou (FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)'
      );
    }

    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    adminAuth = getAuth(adminApp);
    console.log('✅ Firebase Admin inicializado com sucesso (usando variáveis separadas)');
    return { app: adminApp, auth: adminAuth };

  } catch (error) {
    throw new Error(
      `Erro ao inicializar Firebase Admin: ${error instanceof Error ? error.message : 'unknown'}`
    );
  }
}

/**
 * Provedor de autenticação Firebase
 *
 * @implements {AuthProvider}
 */
export class FirebaseAuthProvider implements AuthProvider {
  name = 'Firebase Auth';

  /**
   * Validar token JWT do Firebase
   *
   * @param token - Token JWT (do header Authorization)
   * @returns Resultado da validação com dados do usuário
   */
  async validateToken(token: string): Promise<AuthValidationResult> {
    try {
      const { auth } = getFirebaseAdmin();

      // Verificar e decodificar token
      const decodedToken = await auth.verifyIdToken(token);

      // Criar objeto de usuário normalizado
      const user: AuthUser = {
        id: decodedToken.uid,           // Firebase usa 'uid'
        email: decodedToken.email,
        role: decodedToken.role as string | undefined, // Custom claim (se configurado)
        metadata: {
          provider: 'firebase',
          emailVerified: decodedToken.email_verified,
          authTime: decodedToken.auth_time,
          issuedAt: decodedToken.iat,
          expiresAt: decodedToken.exp,
        }
      };

      return {
        valid: true,
        user
      };

    } catch (error) {
      // Tratar diferentes tipos de erros
      if (error instanceof Error) {
        // Token expirado
        if (error.message.includes('expired')) {
          return {
            valid: false,
            error: 'Token expirado'
          };
        }

        // Token inválido
        if (error.message.includes('invalid')) {
          return {
            valid: false,
            error: 'Token inválido'
          };
        }

        // Erro genérico
        return {
          valid: false,
          error: error.message
        };
      }

      return {
        valid: false,
        error: 'Erro desconhecido ao validar token'
      };
    }
  }
}
