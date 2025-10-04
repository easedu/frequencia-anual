/**
 * Script de Diagnóstico - Investigar problema com V3
 *
 * Problema: Apenas 1 estudante aparece na página perfil-estudante
 * Esperado: 736 estudantes
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';

// Firebase config from env
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
console.log('  DIAGNÓSTICO V3 - POR QUE SÓ 1 ESTUDANTE APARECE?');
console.log('════════════════════════════════════════════════════════════\n');

console.log('📋 Configuração Firebase:');
console.log(`   Project ID: ${firebaseConfig.projectId}`);
console.log(`   Auth Domain: ${firebaseConfig.authDomain}\n`);

// 1. Verificar coleção V3 students (SEM filtros)
console.log('━'.repeat(60));
console.log('1️⃣  TESTE: Ler TODOS estudantes V3 (sem filtros)');
console.log('━'.repeat(60));

try {
  const studentsRef = collection(db, 'students');
  const snapshot = await getDocs(studentsRef);

  console.log(`✅ Total de documentos em 'students': ${snapshot.size}`);

  if (snapshot.size > 0) {
    console.log('\n📄 Primeiros 5 documentos:');
    snapshot.docs.slice(0, 5).forEach((doc, i) => {
      const data = doc.data();
      console.log(`   ${i + 1}. ${doc.id}`);
      console.log(`      nome: ${data.nome || 'N/A'}`);
      console.log(`      deleted: ${data.deleted !== undefined ? data.deleted : 'CAMPO NÃO EXISTE'}`);
      console.log(`      status: ${data.status || 'N/A'}`);
    });
  }
} catch (error) {
  console.error('❌ Erro ao ler students:', error.message);
}

// 2. Verificar com filtro deleted == false
console.log('\n━'.repeat(60));
console.log('2️⃣  TESTE: Ler com filtro deleted == false');
console.log('━'.repeat(60));

try {
  const studentsRef = collection(db, 'students');
  const q = query(
    studentsRef,
    where('deleted', '==', false),
    orderBy('nome')
  );
  const snapshot = await getDocs(q);

  console.log(`✅ Com filtro 'deleted == false': ${snapshot.size} documentos`);

  if (snapshot.size > 0) {
    console.log('\n📄 Primeiros 3 documentos:');
    snapshot.docs.slice(0, 3).forEach((doc, i) => {
      const data = doc.data();
      console.log(`   ${i + 1}. ${data.nome} (${doc.id})`);
    });
  }
} catch (error) {
  console.error('❌ Erro com filtro:', error.message);
  console.log('💡 Possível causa: Índice composto não existe para deleted + nome');
}

// 3. Contar documentos COM campo deleted
console.log('\n━'.repeat(60));
console.log('3️⃣  ANÁLISE: Distribuição do campo "deleted"');
console.log('━'.repeat(60));

try {
  const studentsRef = collection(db, 'students');
  const snapshot = await getDocs(studentsRef);

  let withDeletedField = 0;
  let deletedTrue = 0;
  let deletedFalse = 0;
  let withoutDeletedField = 0;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.deleted !== undefined) {
      withDeletedField++;
      if (data.deleted === true) {
        deletedTrue++;
      } else {
        deletedFalse++;
      }
    } else {
      withoutDeletedField++;
    }
  });

  console.log(`📊 Total de documentos: ${snapshot.size}`);
  console.log(`   ✅ Com campo "deleted": ${withDeletedField}`);
  console.log(`      - deleted: true = ${deletedTrue}`);
  console.log(`      - deleted: false = ${deletedFalse}`);
  console.log(`   ❌ SEM campo "deleted": ${withoutDeletedField}`);

  if (withoutDeletedField > 0) {
    console.log('\n⚠️  PROBLEMA IDENTIFICADO!');
    console.log(`   ${withoutDeletedField} estudantes NÃO têm o campo "deleted"`);
    console.log('   O filtro where("deleted", "==", false) os exclui da query!');

    console.log('\n📄 Exemplos de estudantes SEM campo "deleted":');
    let count = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.deleted === undefined && count < 3) {
        console.log(`   - ${data.nome} (${doc.id})`);
        count++;
      }
    }
  }
} catch (error) {
  console.error('❌ Erro na análise:', error.message);
}

// 4. Verificar STHEPHANY especificamente
console.log('\n━'.repeat(60));
console.log('4️⃣  VERIFICAR: Por que STHEPHANY aparece?');
console.log('━'.repeat(60));

try {
  const studentsRef = collection(db, 'students');
  const snapshot = await getDocs(studentsRef);

  const sthephany = snapshot.docs.find(doc =>
    doc.data().nome?.toUpperCase().includes('STHEPHANY')
  );

  if (sthephany) {
    const data = sthephany.data();
    console.log('✅ STHEPHANY encontrada:');
    console.log(`   ID: ${sthephany.id}`);
    console.log(`   Nome: ${data.nome}`);
    console.log(`   deleted: ${data.deleted !== undefined ? data.deleted : 'CAMPO NÃO EXISTE'}`);
    console.log(`   status: ${data.status}`);
    console.log(`   Campos: ${Object.keys(data).join(', ')}`);
  }
} catch (error) {
  console.error('❌ Erro:', error.message);
}

// 5. Testar query exata do StudentDataService
console.log('\n━'.repeat(60));
console.log('5️⃣  TESTE: Query EXATA usada pelo StudentDataService');
console.log('━'.repeat(60));

try {
  const studentsRef = collection(db, 'students');

  // Primeiro tentar COM filtro e orderBy (como no código)
  try {
    const qWithBoth = query(
      studentsRef,
      where('deleted', '==', false),
      orderBy('nome')
    );
    const snapshotWithBoth = await getDocs(qWithBoth);
    console.log(`✅ Query com where + orderBy: ${snapshotWithBoth.size} resultados`);
  } catch (err) {
    console.log('❌ Query com where + orderBy FALHOU:', err.message);
    console.log('   💡 Provavelmente falta índice composto');
  }

  // Tentar só com orderBy
  const qOnlyOrder = query(studentsRef, orderBy('nome'));
  const snapshotOnlyOrder = await getDocs(qOnlyOrder);
  console.log(`✅ Query só com orderBy: ${snapshotOnlyOrder.size} resultados`);

} catch (error) {
  console.error('❌ Erro:', error.message);
}

console.log('\n════════════════════════════════════════════════════════════');
console.log('  FIM DO DIAGNÓSTICO');
console.log('════════════════════════════════════════════════════════════\n');

process.exit(0);