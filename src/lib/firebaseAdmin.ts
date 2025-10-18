/**
 * Firebase Admin SDK Configuration
 *
 * Este arquivo configura o Firebase Admin SDK para uso server-side
 * em API routes do Next.js.
 */

import admin from 'firebase-admin';

// Inicializar Firebase Admin se ainda não foi inicializado
if (!admin.apps.length) {
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
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // A private key precisa ter as quebras de linha substituídas
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
      });
      console.log('✅ Firebase Admin inicializado com sucesso (env vars individuais)');
    }
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase Admin:', error);
  }
}

// Exportar instâncias
export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

export default admin;
