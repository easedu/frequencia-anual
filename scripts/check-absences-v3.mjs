/**
 * Verificar se dados de absences estão em V3
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

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

async function checkAbsences() {
  console.log('\n🔍 Verificando estrutura de absences...\n');

  try {
    // Verificar V1/V2: students/faltas/controle
    console.log('1️⃣  V1/V2: students/faltas/controle');
    const v1Ref = collection(db, 'students', 'faltas', 'controle');
    const v1Snap = await getDocs(query(v1Ref, limit(5)));
    console.log(`   ✅ ${v1Snap.size} documentos encontrados (amostra)`);
    if (v1Snap.size > 0) {
      const sample = v1Snap.docs[0].data();
      console.log(`   📄 Estrutura:`, Object.keys(sample));
    }

    // Verificar V3: students/{id}/absences
    console.log('\n2️⃣  V3: students/{id}/absences (subcoleções)');
    const studentsRef = collection(db, 'students');
    const studentsSnap = await getDocs(query(studentsRef, limit(5)));

    let v3Count = 0;
    for (const studentDoc of studentsSnap.docs) {
      const absencesRef = collection(db, 'students', studentDoc.id, 'absences');
      const absencesSnap = await getDocs(absencesRef);
      if (absencesSnap.size > 0) {
        v3Count += absencesSnap.size;
        console.log(`   📌 Estudante ${studentDoc.id}: ${absencesSnap.size} faltas`);
        if (absencesSnap.size > 0) {
          const sample = absencesSnap.docs[0].data();
          console.log(`      Estrutura:`, Object.keys(sample));
        }
      }
    }

    console.log(`\n   Total V3 (amostra de 5 estudantes): ${v3Count} faltas`);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 CONCLUSÃO:');
    if (v1Snap.size > 0 && v3Count === 0) {
      console.log('   ⚠️  Dados estão APENAS em V1/V2');
      console.log('   📌 API deve usar: students/faltas/controle');
    } else if (v1Snap.size === 0 && v3Count > 0) {
      console.log('   ✅ Dados migrados para V3');
      console.log('   📌 API pode usar: students/{id}/absences');
    } else if (v1Snap.size > 0 && v3Count > 0) {
      console.log('   ⚠️  Dados em AMBAS estruturas (V1/V2 e V3)');
      console.log('   📌 API deve usar a mais completa');
    }
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erro:', error);
  }

  process.exit(0);
}

checkAbsences();
