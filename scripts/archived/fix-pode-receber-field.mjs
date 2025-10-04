/**
 * Script para corrigir o campo podeReceberWhatsapp nos contatos
 * Adiciona o campo podeReceberWhatsapp com valor true para todos os contatos que não possuem
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';

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

const MODE = process.env.MODE || 'DRY_RUN'; // DRY_RUN, TEST, FULL
const BATCH_SIZE = 500;

async function fixPodeReceberField() {
  console.log('🔧 CORREÇÃO: Campo podeReceberWhatsapp\n');
  console.log('='.repeat(80));
  console.log(`Modo: ${MODE}`);
  console.log('='.repeat(80) + '\n');

  try {
    const studentsRef = collection(db, 'students');
    const studentsSnap = await getDocs(studentsRef);

    console.log(`📊 Total de estudantes: ${studentsSnap.size}\n`);

    const updates = [];

    for (const studentDoc of studentsSnap.docs) {
      const contactsRef = collection(db, 'students', studentDoc.id, 'contacts');
      const contactsSnap = await getDocs(contactsRef);

      for (const contactDoc of contactsSnap.docs) {
        const contactData = contactDoc.data();

        // Se não tem o campo podeReceberWhatsapp, adicionar com valor true
        if (!('podeReceberWhatsapp' in contactData)) {
          updates.push({
            studentId: studentDoc.id,
            studentName: studentDoc.data().nome,
            contactId: contactDoc.id,
            contactName: contactData.nome,
            contactPhone: contactData.telefone,
          });
        }
      }
    }

    console.log(`\n📈 RESUMO:`);
    console.log(`   Contatos a atualizar: ${updates.length}`);

    if (MODE === 'DRY_RUN') {
      console.log('\n⚠️  DRY RUN - Nenhuma alteração será feita');
      console.log('\nPrimeiros 10 contatos a serem atualizados:');
      updates.slice(0, 10).forEach((update, index) => {
        console.log(`   ${index + 1}. ${update.studentName} > ${update.contactName} (${update.contactPhone})`);
      });
      console.log('\nPara executar de verdade, rode: MODE=FULL node scripts/fix-pode-receber-field.mjs');
      return;
    }

    if (MODE === 'TEST') {
      console.log('\n🧪 MODO TEST - Atualizando apenas 10 contatos...');
      updates.splice(10);
    }

    console.log(`\n🚀 Atualizando ${updates.length} contatos...`);

    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchUpdates = updates.slice(i, i + BATCH_SIZE);

      batchUpdates.forEach((update) => {
        const contactRef = doc(db, 'students', update.studentId, 'contacts', update.contactId);
        batch.update(contactRef, {
          podeReceberWhatsapp: true,
        });
      });

      try {
        await batch.commit();
        successCount += batchUpdates.length;
        console.log(`   ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchUpdates.length} contatos atualizados`);
      } catch (error) {
        errorCount += batchUpdates.length;
        console.error(`   ❌ Erro no batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
      }

      processedCount += batchUpdates.length;
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ FINALIZADO!');
    console.log('='.repeat(80));
    console.log(`   Processados: ${processedCount}`);
    console.log(`   Sucesso: ${successCount}`);
    console.log(`   Erros: ${errorCount}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

fixPodeReceberField();
