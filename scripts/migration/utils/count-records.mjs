/**
 * UTILS: CONTAR REGISTROS
 *
 * Conta registros em V2 e V3 de forma rápida
 *
 * Execução: node scripts/migration/utils/count-records.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, collectionGroup, getCountFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function countRecords() {
  console.log('\n📊 Contagem Rápida de Registros\n');

  try {
    // V2
    const v2Ref = collection(db, '2025', 'faltas', 'controle');
    const v2Count = await getCountFromServer(v2Ref);
    console.log(`V2 (2025/faltas/controle): ${v2Count.data().count}`);

    // V3 Subcoleções
    try {
      const v3Ref = collectionGroup(db, 'absences');
      const v3Count = await getCountFromServer(v3Ref);
      console.log(`V3 Subcoleções (students/{id}/absences): ${v3Count.data().count}`);
    } catch {
      console.log(`V3 Subcoleções: 0 (não migrado)`);
    }

    // V3 Summary
    try {
      const summaryRef = collectionGroup(db, 'absence_summary');
      const summarySnap = await getDocs(summaryRef);
      let total = 0;
      summarySnap.forEach(doc => {
        const data = doc.data();
        if (!data._test) total += data.count || 0;
      });
      console.log(`V3 Summary (soma de counts): ${total}`);
    } catch {
      console.log(`V3 Summary: 0 (não migrado)`);
    }

    console.log();
  } catch (error) {
    console.error('Erro:', error.message);
  }

  process.exit(0);
}

countRecords();
