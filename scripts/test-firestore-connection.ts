import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log('Config:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain
});

if (getApps().length === 0) {
    initializeApp(firebaseConfig);
}

const db = getFirestore();

async function test() {
    try {
        console.log('\nTestando conexão com Firestore...\n');

        // Testar caminho 2025
        console.log(`\nTestando caminho: 2025/escola/students`);
        try {
            const ref = collection(db, '2025', 'escola', 'students');
            const snapshot = await getDocs(ref);
            console.log(`  ✅ Documentos encontrados: ${snapshot.size}`);

            if (!snapshot.empty) {
                const firstDoc = snapshot.docs[0];
                console.log(`  📄 Primeiro documento ID: ${firstDoc.id}`);
                const data = firstDoc.data();
                if (data.contatos) {
                    console.log(`     Contatos: ${JSON.stringify(data.contatos, null, 2)}`);
                }
            }
        } catch (error: any) {
            console.log(`  ❌ Erro: ${error.message}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    }
}

test();
