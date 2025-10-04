/**
 * Script de Correção - Adicionar campo 'deleted: false' em estudantes
 *
 * Problema: 735 estudantes não têm o campo 'deleted'
 * Solução: Adicionar deleted: false em todos que não têm o campo
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc
} from 'firebase/firestore';

// Firebase config
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

console.log('\n════════════════════════════════════════════════════════════');
console.log('  CORREÇÃO: Adicionar campo "deleted: false"');
console.log('════════════════════════════════════════════════════════════\n');

async function fixMissingDeletedField() {
  try {
    // 1. Buscar todos estudantes
    console.log('📖 Buscando todos os estudantes...');
    const studentsRef = collection(db, 'students');
    const snapshot = await getDocs(studentsRef);

    console.log(`✅ ${snapshot.size} estudantes encontrados\n`);

    // 2. Identificar quais não têm o campo 'deleted'
    const studentsWithoutDeleted = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.deleted === undefined) {
        studentsWithoutDeleted.push({
          id: doc.id,
          nome: data.nome,
          ref: doc.ref
        });
      }
    });

    console.log(`📊 Análise:`);
    console.log(`   - Com campo "deleted": ${snapshot.size - studentsWithoutDeleted.length}`);
    console.log(`   - SEM campo "deleted": ${studentsWithoutDeleted.length}\n`);

    if (studentsWithoutDeleted.length === 0) {
      console.log('✅ Todos os estudantes já têm o campo "deleted"!');
      return;
    }

    // 3. Adicionar campo 'deleted: false' em batch (500 por vez)
    console.log(`🔧 Adicionando campo "deleted: false" em ${studentsWithoutDeleted.length} estudantes...\n`);

    const BATCH_SIZE = 500;
    let processedCount = 0;
    let batchCount = 0;

    for (let i = 0; i < studentsWithoutDeleted.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchStudents = studentsWithoutDeleted.slice(i, i + BATCH_SIZE);

      batchStudents.forEach(student => {
        batch.update(student.ref, {
          deleted: false,
          updatedAt: new Date()
        });
      });

      await batch.commit();
      processedCount += batchStudents.length;
      batchCount++;

      console.log(`   ✅ Batch ${batchCount}: ${batchStudents.length} estudantes atualizados (${processedCount}/${studentsWithoutDeleted.length})`);
    }

    console.log(`\n✅ CORREÇÃO CONCLUÍDA!`);
    console.log(`   Total atualizado: ${processedCount} estudantes`);
    console.log(`   Batches executados: ${batchCount}\n`);

    // 4. Validar
    console.log('━'.repeat(60));
    console.log('🔍 VALIDAÇÃO');
    console.log('━'.repeat(60));

    const validationSnapshot = await getDocs(studentsRef);
    let stillMissing = 0;

    validationSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.deleted === undefined) {
        stillMissing++;
      }
    });

    if (stillMissing === 0) {
      console.log('✅ TODOS os 736 estudantes agora têm o campo "deleted"!\n');
    } else {
      console.log(`⚠️  Ainda faltam ${stillMissing} estudantes\n`);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Executar
fixMissingDeletedField()
  .then(() => {
    console.log('════════════════════════════════════════════════════════════\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });