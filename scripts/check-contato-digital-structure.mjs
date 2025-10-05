#!/usr/bin/env node

/**
 * Script de diagnóstico: Verificar estrutura de interações "Contato digital"
 * Objetivo: Verificar se whatsappMessage está sendo salvo corretamente
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore';

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

async function checkContatoDigitalStructure() {
  console.log('\n🔍 DIAGNÓSTICO: Estrutura de interações "Contato digital"\n');
  console.log('='.repeat(80));

  try {
    // Buscar em V1: 2025/interactions/{studentId}
    console.log('\n📂 Verificando V1: 2025/interactions/{studentId}...\n');

    // Primeiro pegar todos os students para iterar
    const studentsRef = collection(db, 'students');
    const studentsSnapshot = await getDocs(studentsRef);

    let foundContatoDigital = false;
    let totalInteractions = 0;

    for (const studentDoc of studentsSnapshot.docs) {
      const studentId = studentDoc.id;
      const studentInteractionsRef = collection(db, '2025', 'interactions', studentId);
      const q = query(studentInteractionsRef, where('type', '==', 'Contato digital'), limit(5));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        console.log(`\n✅ Estudante ${studentId.substring(0, 8)}... tem ${snapshot.size} interações "Contato digital":\n`);
        foundContatoDigital = true;

        snapshot.forEach((doc) => {
          const data = doc.data();
          totalInteractions++;

          console.log(`   📋 ID: ${doc.id}`);
          console.log(`   📅 Data: ${data.date || 'N/A'}`);
          console.log(`   👤 Criado por: ${data.createdBy || 'N/A'}`);
          console.log(`   📝 Descrição: ${data.description?.substring(0, 50) || 'N/A'}...`);
          console.log(`   💬 whatsappMessage: ${data.whatsappMessage ? '✅ EXISTE' : '❌ NÃO EXISTE'}`);

          if (data.whatsappMessage) {
            console.log(`      Mensagem: "${data.whatsappMessage.substring(0, 60)}..."`);
          }

          console.log(`   📞 whatsappPhones: ${data.whatsappPhones ? '✅ EXISTE' : '❌ NÃO EXISTE'}`);

          if (data.whatsappPhones) {
            console.log(`      Telefones: ${JSON.stringify(data.whatsappPhones)}`);
          }

          console.log(`   🔑 Campos disponíveis: ${Object.keys(data).join(', ')}`);
          console.log('');
        });
      }
    }

    if (!foundContatoDigital) {
      console.log('\n⚠️  Nenhuma interação "Contato digital" encontrada em V1');
    } else {
      console.log(`\n📊 Total de interações "Contato digital" encontradas: ${totalInteractions}`);
    }

  } catch (error) {
    console.error('\n❌ Erro ao verificar estrutura:', error);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Diagnóstico concluído\n');
  process.exit(0);
}

checkContatoDigitalStructure();
