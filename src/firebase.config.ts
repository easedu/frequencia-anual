// firebase.config.ts
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

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

// 🔥 Conectar aos Firebase Emulators se estiver rodando localmente
// ⚠️ DESABILITADO TEMPORARIAMENTE - Para habilitar, inicie os emulators com: firebase emulators:start
/*
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    try {
        connectFirestoreEmulator(db, 'localhost', 8080);
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        console.log('🔥 Conectado aos Firebase Emulators (Firestore: 8080, Auth: 9099)');
    } catch (error) {
        // Emulators já conectados ou não disponíveis
        console.log('ℹ️ Firebase Emulators não disponíveis ou já conectados');
    }
}
*/
console.log('🌐 Usando Firebase em produção (Emulators desabilitados)');