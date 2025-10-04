#!/usr/bin/env node

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function checkStatusFields() {
  console.log('🔍 Verificando campos de status dos estudantes\n');

  const studentsRef = collection(db, 'students');
  const snapshot = await getDocs(studentsRef);

  const statusCount = {};
  const statusEstudanteCount = {};
  let sampleDocs = [];

  snapshot.docs.forEach(doc => {
    const data = doc.data();

    // Contar status
    const status = data.status || 'undefined';
    statusCount[status] = (statusCount[status] || 0) + 1;

    // Contar statusEstudante
    const statusEstudante = data.statusEstudante || 'undefined';
    statusEstudanteCount[statusEstudante] = (statusEstudanteCount[statusEstudante] || 0) + 1;

    // Coletar exemplos
    if (sampleDocs.length < 5) {
      sampleDocs.push({
        id: doc.id,
        nome: data.nome,
        turma: data.turma,
        status: data.status,
        statusEstudante: data.statusEstudante,
        deleted: data.deleted
      });
    }
  });

  console.log('📊 CONTAGEM POR CAMPO "status":');
  Object.entries(statusCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

  console.log('\n📊 CONTAGEM POR CAMPO "statusEstudante":');
  Object.entries(statusEstudanteCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

  console.log('\n📋 EXEMPLOS DE DOCUMENTOS:');
  sampleDocs.forEach((doc, i) => {
    console.log(`\n   Exemplo ${i + 1}:`);
    console.log(`   Nome: ${doc.nome}`);
    console.log(`   Turma: ${doc.turma}`);
    console.log(`   status: ${doc.status}`);
    console.log(`   statusEstudante: ${doc.statusEstudante}`);
    console.log(`   deleted: ${doc.deleted}`);
  });

  console.log('\n💡 RECOMENDAÇÃO:');
  console.log('   O campo correto a usar é: "statusEstudante"');
  console.log('   Filtrar por: statusEstudante === "ATIVO"');

  process.exit(0);
}

checkStatusFields().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});