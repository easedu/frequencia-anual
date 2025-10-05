#!/usr/bin/env node

/**
 * Script: Mostrar interação específica de estudante
 * Objetivo: Exibir registro completo de interação criada hoje
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, orderBy } from 'firebase/firestore';

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

const studentId = '8163ee26-e994-4b26-a3ac-28085a7937f4';

async function showStudentInteraction() {
  console.log('\n📋 REGISTRO DE INTERAÇÃO - Estudante 8163ee26...\n');
  console.log('='.repeat(80));

  try {
    // Buscar em V1: 2025/interactions/{studentId}
    console.log('\n📂 V1: 2025/interactions/{studentId}\n');

    const v1Ref = collection(db, '2025', 'interactions', studentId);
    const v1Query = query(v1Ref, orderBy('date', 'desc'));
    const v1Snapshot = await getDocs(v1Query);

    console.log(`Total de interações em V1: ${v1Snapshot.size}\n`);

    if (!v1Snapshot.empty) {
      v1Snapshot.forEach((doc, index) => {
        const data = doc.data();
        const isToday = data.date === '2025-10-04' || data.date === '2025-10-05';

        console.log(`${isToday ? '🆕' : '📄'} Interação #${index + 1} ${isToday ? '(CRIADA HOJE)' : ''}`);
        console.log('─'.repeat(80));
        console.log(`ID do documento: ${doc.id}`);
        console.log(`\nDADOS COMPLETOS:`);
        console.log(JSON.stringify(data, null, 2));
        console.log('\n' + '─'.repeat(80) + '\n');
      });
    } else {
      console.log('⚠️  Nenhuma interação encontrada em V1');
    }

    // Buscar em V3: students/{studentId}/interactions
    console.log('\n📂 V3: students/{studentId}/interactions\n');

    const v3Ref = collection(db, 'students', studentId, 'interactions');
    const v3Query = query(v3Ref, orderBy('date', 'desc'));
    const v3Snapshot = await getDocs(v3Query);

    console.log(`Total de interações em V3: ${v3Snapshot.size}\n`);

    if (!v3Snapshot.empty) {
      v3Snapshot.forEach((doc, index) => {
        const data = doc.data();
        const isToday = data.date === '2025-10-04' || data.date === '2025-10-05';

        console.log(`${isToday ? '🆕' : '📄'} Interação #${index + 1} ${isToday ? '(CRIADA HOJE)' : ''}`);
        console.log('─'.repeat(80));
        console.log(`ID do documento: ${doc.id}`);
        console.log(`\nDADOS COMPLETOS:`);
        console.log(JSON.stringify(data, null, 2));
        console.log('\n' + '─'.repeat(80) + '\n');
      });
    } else {
      console.log('⚠️  Nenhuma interação encontrada em V3');
    }

  } catch (error) {
    console.error('\n❌ Erro ao buscar interação:', error);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Consulta concluída\n');
  process.exit(0);
}

showStudentInteraction();
