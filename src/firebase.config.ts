/**
 * firebase.config.ts
 *
 * ✅ MIGRAÇÃO CONCLUÍDA PARA SUPABASE
 *
 * Firebase é usado APENAS para autenticação (Firebase Auth).
 * Todos os dados (leitura/escrita) usam exclusivamente Supabase PostgreSQL.
 *
 * PRÓXIMO: Migrar auth para Supabase Auth e remover Firebase completamente.
 *
 * ⚠️ LAZY INITIALIZATION: Firebase só é inicializado no browser (runtime)
 * para evitar erros durante SSR/build com variáveis de ambiente.
 */
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Lazy initialization - só inicializa quando realmente usado
let _firebaseApp: FirebaseApp | null = null;
let _firebaseAuth: Auth | null = null;

/**
 * Inicializa Firebase (lazy) - apenas no browser
 */
function initializeFirebase(): { app: FirebaseApp; auth: Auth } {
    // Só executar no browser
    if (typeof window === 'undefined') {
        throw new Error('Firebase client não pode ser usado no servidor (SSR)');
    }

    // Se já inicializado, retornar instâncias existentes
    if (_firebaseApp && _firebaseAuth) {
        return { app: _firebaseApp, auth: _firebaseAuth };
    }

    // Verificar se já existe alguma app (de outra inicialização)
    const existingApps = getApps();
    if (existingApps.length > 0) {
        _firebaseApp = existingApps[0];
        _firebaseAuth = getAuth(_firebaseApp);
        console.log('🔐 Firebase Auth reutilizado (já inicializado)');
        return { app: _firebaseApp, auth: _firebaseAuth };
    }

    // Validar env vars antes de inicializar
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        throw new Error(
            'Firebase env vars não configuradas. Verifique NEXT_PUBLIC_FIREBASE_* no .env.local'
        );
    }

    // Inicializar nova app
    try {
        _firebaseApp = initializeApp(firebaseConfig);
        _firebaseAuth = getAuth(_firebaseApp);
        console.log('🔐 Firebase Auth inicializado (apenas autenticação)');
        return { app: _firebaseApp, auth: _firebaseAuth };
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error);
        throw error;
    }
}

/**
 * Getter lazy para Firebase App
 * Inicializa apenas quando usado (no browser)
 */
export function getFirebaseApp(): FirebaseApp {
    const { app } = initializeFirebase();
    return app;
}

/**
 * Getter lazy para Firebase Auth
 * Inicializa apenas quando usado (no browser)
 */
export function getFirebaseAuth(): Auth {
    const { auth } = initializeFirebase();
    return auth;
}

// Exportar com Proxy para lazy initialization (compatibilidade com código existente)
export const firebaseApp = new Proxy({} as FirebaseApp, {
    get(_target, prop) {
        return (getFirebaseApp() as any)[prop];
    }
});

export const auth = new Proxy({} as Auth, {
    get(_target, prop) {
        return (getFirebaseAuth() as any)[prop];
    }
});