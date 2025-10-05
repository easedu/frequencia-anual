#!/usr/bin/env node

/**
 * Script de Diagnóstico: Estrutura de Interações no Firebase
 *
 * Objetivo: Verificar onde as interações estão sendo armazenadas:
 * - V1: students/interactions/{studentId}
 * - V3: students/{studentId}/interactions
 *
 * Execução:
 * NEXT_PUBLIC_FIREBASE_API_KEY=... node scripts/check-interactions-structure.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit, collectionGroup } from 'firebase/firestore';

// Configuração do Firebase (via env vars)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkInteractionsStructure() {
  console.log('🔍 DIAGNÓSTICO: Estrutura de Interações no Firebase\n');
  console.log('═'.repeat(70));

  // 1. Verificar estrutura V1: 2025/interactions/{studentId}/{docId}
  console.log('\n📂 VERIFICANDO V1: 2025/interactions/{studentId} (subcoleção por estudante)');
  console.log('─'.repeat(70));

  try {
    // Pegar 3 estudantes para verificar suas interações V1
    const studentsRef = collection(db, 'students');
    const studentsSnapshot = await getDocs(query(studentsRef, limit(3)));

    if (studentsSnapshot.empty) {
      console.log('❌ Nenhum estudante encontrado para verificar V1');
    } else {
      let totalV1Interactions = 0;

      for (const studentDoc of studentsSnapshot.docs) {
        const studentId = studentDoc.id;
        const studentName = studentDoc.data().nome || 'Sem nome';

        // Path V1: 2025/interactions/{studentId}
        const v1Path = `2025/interactions/${studentId}`;
        const v1Snapshot = await getDocs(collection(db, v1Path));

        if (!v1Snapshot.empty) {
          console.log(`\n   ✅ ${studentName} (${studentId}): ${v1Snapshot.size} interações V1`);
          totalV1Interactions += v1Snapshot.size;

          // Mostrar 2 primeiras interações
          v1Snapshot.docs.slice(0, 2).forEach(doc => {
            const data = doc.data();
            console.log(`      - ${data.type || 'Sem tipo'} | ${data.date || 'Sem data'}`);
            console.log(`        "${data.description?.substring(0, 60) || 'Sem descrição'}..."`);
          });
        } else {
          console.log(`   ⚠️  ${studentName} (${studentId}): 0 interações V1`);
        }
      }

      console.log(`\n   📊 TOTAL V1: ${totalV1Interactions} interações encontradas`);
    }
  } catch (error) {
    console.log(`⚠️  ERRO: ${error.message}`);
  }

  // 2. Verificar estrutura V3 usando collectionGroup
  console.log('\n\n📂 VERIFICANDO V3: students/{studentId}/interactions');
  console.log('─'.repeat(70));

  try {
    const v3Query = query(collectionGroup(db, 'interactions'), limit(10));
    const v3Snapshot = await getDocs(v3Query);

    if (v3Snapshot.empty) {
      console.log('❌ V3 VAZIO: Nenhuma subcoleção "interactions" encontrada em students/*');
    } else {
      console.log(`✅ V3 ENCONTRADO: ${v3Snapshot.size} interações em subcoleções`);
      console.log('\nAmostra (primeiras 10 interações):');

      const groupedByStudent = {};
      v3Snapshot.forEach(doc => {
        const path = doc.ref.path; // Ex: students/ABC123/interactions/XYZ
        const studentId = path.split('/')[1];

        if (!groupedByStudent[studentId]) {
          groupedByStudent[studentId] = [];
        }
        groupedByStudent[studentId].push({
          id: doc.id,
          ...doc.data()
        });
      });

      Object.entries(groupedByStudent).forEach(([studentId, interactions]) => {
        console.log(`\n   📚 Student: ${studentId} (${interactions.length} interações)`);
        interactions.forEach(interaction => {
          console.log(`      - ${interaction.type || 'Sem tipo'} | ${interaction.date || 'Sem data'}`);
          console.log(`        "${interaction.description?.substring(0, 60)}..."`);
        });
      });
    }
  } catch (error) {
    console.log(`⚠️  ERRO ao verificar V3: ${error.message}`);
  }

  // 3. Verificar estudantes na coleção V3 principal
  console.log('\n\n📂 VERIFICANDO: students (coleção principal V3)');
  console.log('─'.repeat(70));

  try {
    const studentsSnapshot = await getDocs(query(collection(db, 'students'), limit(3)));

    if (studentsSnapshot.empty) {
      console.log('❌ Nenhum estudante encontrado na coleção "students"');
    } else {
      console.log(`✅ ${studentsSnapshot.size} estudantes encontrados (amostra)`);

      for (const studentDoc of studentsSnapshot.docs) {
        console.log(`\n   👤 ${studentDoc.data().nome || 'Sem nome'} (ID: ${studentDoc.id})`);

        // Verificar se tem subcoleção interactions
        const interactionsRef = collection(db, `students/${studentDoc.id}/interactions`);
        const interactionsSnap = await getDocs(query(interactionsRef, limit(3)));

        if (interactionsSnap.empty) {
          console.log('      ⚠️  Sem interações na subcoleção');
        } else {
          console.log(`      ✅ ${interactionsSnap.size} interações na subcoleção (amostra)`);
        }
      }
    }
  } catch (error) {
    console.log(`⚠️  ERRO ao verificar students: ${error.message}`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('✅ DIAGNÓSTICO CONCLUÍDO\n');
}

// Executar
checkInteractionsStructure()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ ERRO FATAL:', error);
    process.exit(1);
  });
