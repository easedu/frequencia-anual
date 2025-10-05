#!/usr/bin/env node

/**
 * Diagnóstico: Verificar task e interação
 * Estudante: 8163ee26-e994-4b26-a3ac-28085a7937f4
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

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

const STUDENT_ID = '8163ee26-e994-4b26-a3ac-28085a7937f4';

async function diagnose() {
  console.log('🔍 DIAGNÓSTICO: Task e Interação\n');
  console.log('═'.repeat(70));

  // 1. Buscar tasks do estudante
  console.log('\n📋 BUSCANDO TASKS DO ESTUDANTE');
  console.log('─'.repeat(70));

  const tasksQuery = query(
    collection(db, 'userTasks'),
    where('estudanteId', '==', STUDENT_ID)
  );
  const tasksSnapshot = await getDocs(tasksQuery);

  if (tasksSnapshot.empty) {
    console.log('❌ Nenhuma task encontrada');
    return;
  }

  console.log(`✅ ${tasksSnapshot.size} task(s) encontrada(s)\n`);

  for (const taskDoc of tasksSnapshot.docs) {
    const task = taskDoc.data();
    console.log(`📌 Task ID: ${taskDoc.id}`);
    console.log(`   Status: ${task.status}`);
    console.log(`   Estudante: ${task.studentName}`);
    console.log(`   Criada em: ${task.createdAt}`);
    console.log(`   Interaction ID: ${task.interactionId || 'N/A'}`);
    console.log(`   Interaction Type: ${task.interactionType || 'N/A'}`);
    console.log(`   Interaction Description: ${task.interactionDescription?.substring(0, 60) || 'N/A'}...`);

    // Se tem interactionId, verificar se existe
    if (task.interactionId) {
      console.log('\n🔍 VERIFICANDO INTERAÇÃO:');
      console.log('─'.repeat(70));

      // V1
      const v1Path = `2025/interactions/${STUDENT_ID}/${task.interactionId}`;
      console.log(`   Testando V1: ${v1Path}`);
      const v1Doc = await getDoc(doc(db, '2025', 'interactions', STUDENT_ID, task.interactionId));
      console.log(`   Resultado: ${v1Doc.exists() ? '✅ EXISTE' : '❌ NÃO EXISTE'}`);

      if (v1Doc.exists()) {
        console.log('   Dados V1:', JSON.stringify(v1Doc.data(), null, 2));
      }

      // V3
      const v3Path = `students/${STUDENT_ID}/interactions/${task.interactionId}`;
      console.log(`\n   Testando V3: ${v3Path}`);
      const v3Doc = await getDoc(doc(db, 'students', STUDENT_ID, 'interactions', task.interactionId));
      console.log(`   Resultado: ${v3Doc.exists() ? '✅ EXISTE' : '❌ NÃO EXISTE'}`);

      if (v3Doc.exists()) {
        console.log('   Dados V3:', JSON.stringify(v3Doc.data(), null, 2));
      }

      // Verificar coleção completa de interações V1
      console.log('\n📂 TODAS AS INTERAÇÕES V1 DO ESTUDANTE:');
      console.log('─'.repeat(70));
      const v1CollectionSnapshot = await getDocs(collection(db, '2025', 'interactions', STUDENT_ID));
      console.log(`   Total: ${v1CollectionSnapshot.size} interações`);

      v1CollectionSnapshot.forEach(doc => {
        console.log(`   - ${doc.id}: ${doc.data().type} (${doc.data().date})`);
      });

      // Verificar coleção completa de interações V3
      console.log('\n📂 TODAS AS INTERAÇÕES V3 DO ESTUDANTE:');
      console.log('─'.repeat(70));
      const v3CollectionSnapshot = await getDocs(collection(db, 'students', STUDENT_ID, 'interactions'));
      console.log(`   Total: ${v3CollectionSnapshot.size} interações`);

      v3CollectionSnapshot.forEach(doc => {
        console.log(`   - ${doc.id}: ${doc.data().type} (${doc.data().date})`);
      });
    }

    console.log('\n' + '═'.repeat(70));
  }
}

diagnose()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ ERRO:', error);
    process.exit(1);
  });
