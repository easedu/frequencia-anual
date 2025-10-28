/**
 * Firebase Admin SDK Configuration
 *
 * Este arquivo configura o Firebase Admin SDK para uso server-side
 * em API routes do Next.js.
 *
 * IMPORTANTE: Lazy initialization para evitar erros durante build.
 * O Firebase Admin só é inicializado quando realmente usado (runtime).
 */

import admin from 'firebase-admin';

/**
 * Inicializa o Firebase Admin (lazy initialization)
 * Chamado automaticamente pelos getters abaixo
 */
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return; // Já inicializado
  }

  try {
    // Tentar usar service account JSON completo primeiro
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
      });
      console.log('✅ Firebase Admin inicializado com sucesso (service account JSON)');
    } else {
      // Fallback: usar variáveis individuais
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Variáveis de ambiente do Firebase Admin não configuradas');
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        databaseURL: `https://${projectId}.firebaseio.com`,
      });
      console.log('✅ Firebase Admin inicializado com sucesso (env vars individuais)');
    }
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase Admin:', error);
    throw error;
  }
}

/**
 * Getter lazy para Firestore Admin
 * Inicializa Firebase Admin apenas quando realmente usado
 */
export function getAdminDb() {
  initializeFirebaseAdmin();
  return admin.firestore();
}

/**
 * Getter lazy para Auth Admin
 * Inicializa Firebase Admin apenas quando realmente usado
 */
export function getAdminAuth() {
  initializeFirebaseAdmin();
  return admin.auth();
}

// Exportar instâncias (lazy) - mantém compatibilidade com código existente
export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_target, prop: string | symbol) {
    const db = getAdminDb();
    const value = db[prop as keyof admin.firestore.Firestore];
    return typeof value === 'function' ? value.bind(db) : value;
  }
});

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(_target, prop: string | symbol) {
    const auth = getAdminAuth();
    const value = auth[prop as keyof admin.auth.Auth];
    return typeof value === 'function' ? value.bind(auth) : value;
  }
});

export default admin;
