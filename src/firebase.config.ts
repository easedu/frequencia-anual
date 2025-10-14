/**
 * firebase.config.ts
 *
 * ✅ MIGRAÇÃO CONCLUÍDA PARA SUPABASE
 *
 * Firebase é usado APENAS para autenticação (Firebase Auth).
 * Todos os dados (leitura/escrita) usam exclusivamente Supabase PostgreSQL.
 *
 * PRÓXIMO: Migrar auth para Supabase Auth e remover Firebase completamente.
 */
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

if (typeof window !== 'undefined') {
    console.log('🔐 Firebase Auth inicializado (apenas autenticação)');
    console.log('📊 Todos os dados vêm do Supabase PostgreSQL');
}