/**
 * firebase.config.ts
 *
 * ✅ MIGRAÇÃO CONCLUÍDA PARA SUPABASE
 *
 * Firebase agora é usado APENAS para autenticação (Firebase Auth).
 * Todos os dados (leitura/escrita) usam exclusivamente Supabase.
 *
 * Firestore mantido temporariamente apenas para ferramentas de diagnóstico.
 */
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
export const db = getFirestore(firebaseApp);

// 🔥 Auth Emulator - DESABILITADO por padrão
// Para habilitar: defina NEXT_PUBLIC_USE_AUTH_EMULATOR=true no .env.local
// E rode: firebase emulators:start --only auth
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_AUTH_EMULATOR === 'true') {
    try {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        console.log('🔥 Conectado ao Firebase Auth Emulator (porta 9099)');
    } catch (error) {
        console.warn('⚠️ Erro ao conectar ao Auth Emulator:', error);
    }
} else if (typeof window !== 'undefined') {
    console.log('🌐 Usando Firebase Auth em PRODUÇÃO');
}