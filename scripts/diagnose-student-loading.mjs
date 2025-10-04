#!/usr/bin/env node

/**
 * Script de diagnóstico: Verificar por que nenhum estudante está sendo carregado
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';

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

async function diagnose() {
  console.log('🔍 DIAGNÓSTICO: Verificando estrutura do Firebase\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Verificar coleção V3 (students)
  console.log('📁 [1/4] Verificando coleção V3: students/');
  try {
    const studentsRef = collection(db, 'students');
    const snapshot = await getDocs(studentsRef);

    console.log(`   ✓ Coleção existe`);
    console.log(`   ✓ Total de documentos: ${snapshot.docs.length}`);

    if (snapshot.docs.length > 0) {
      const firstDoc = snapshot.docs[0];
      const data = firstDoc.data();
      console.log(`   ✓ Primeiro documento ID: ${firstDoc.id}`);
      console.log(`   ✓ Campos do documento:`, Object.keys(data));
      console.log(`   ✓ Status: ${data.status || 'N/A'}`);
      console.log(`   ✓ Deleted: ${data.deleted !== undefined ? data.deleted : 'campo não existe'}`);

      // Verificar quantos estudantes ativos
      const activeCount = snapshot.docs.filter(doc => {
        const d = doc.data();
        return d.status === 'ATIVO' && d.deleted !== true;
      }).length;
      console.log(`   ✓ Estudantes ATIVOS (status=ATIVO e deleted!=true): ${activeCount}`);

      // Verificar contatos
      console.log(`\n   🔍 Verificando contatos do primeiro estudante...`);
      const contactsRef = collection(db, `students/${firstDoc.id}/contacts`);
      const contactsSnap = await getDocs(contactsRef);
      console.log(`   ✓ Contatos encontrados: ${contactsSnap.docs.length}`);
      if (contactsSnap.docs.length > 0) {
        const firstContact = contactsSnap.docs[0].data();
        console.log(`   ✓ Campos do contato:`, Object.keys(firstContact));
      }
    } else {
      console.log(`   ⚠️  PROBLEMA: Nenhum documento encontrado na coleção students/`);
    }
  } catch (error) {
    console.log(`   ❌ ERRO ao acessar coleção students/:`, error.message);
    if (error.code === 'permission-denied') {
      console.log(`   ℹ️  Possível problema de permissões no Firestore Rules`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 2. Tentar query com where e orderBy (como o StudentDataService faz)
  console.log('📁 [2/4] Testando query com where e orderBy (como o código faz)');
  try {
    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, where('deleted', '==', false), orderBy('nome'));
    const snapshot = await getDocs(q);

    console.log(`   ✓ Query executada com sucesso`);
    console.log(`   ✓ Documentos retornados: ${snapshot.docs.length}`);

  } catch (error) {
    console.log(`   ❌ ERRO na query:`, error.message);
    if (error.code === 'failed-precondition') {
      console.log(`   ⚠️  PROBLEMA: Índice composto não existe!`);
      console.log(`   💡 SOLUÇÃO: O código tem fallback para isso, então não deveria travar`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 3. Verificar estrutura V2 (2025/escola/students)
  console.log('📁 [3/4] Verificando estrutura V2: 2025/escola/students');
  try {
    const v2Path = '2025/escola/students';
    const v2Ref = collection(db, v2Path);
    const v2Snapshot = await getDocs(v2Ref);

    console.log(`   ✓ Coleção existe`);
    console.log(`   ✓ Total de documentos: ${v2Snapshot.docs.length}`);

  } catch (error) {
    console.log(`   ❌ ERRO ao acessar V2:`, error.message);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 4. Verificar ano_letivo
  console.log('📁 [4/4] Verificando configuração ano_letivo');
  try {
    const anoLetivoRef = doc(db, '2025', 'ano_letivo');
    const anoLetivoSnap = await getDoc(anoLetivoRef);

    if (anoLetivoSnap.exists()) {
      console.log(`   ✓ Documento existe`);
      const data = anoLetivoSnap.data();
      console.log(`   ✓ Bimestres configurados:`, Object.keys(data).filter(k => k.includes('Bimestre')));
    } else {
      console.log(`   ⚠️  Documento ano_letivo não existe`);
    }
  } catch (error) {
    console.log(`   ❌ ERRO:`, error.message);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // RESUMO
  console.log('📊 RESUMO DO DIAGNÓSTICO:\n');
  console.log('1. Verifique se há estudantes na coleção students/');
  console.log('2. Verifique se os estudantes têm status="ATIVO"');
  console.log('3. Verifique se os estudantes NÃO têm deleted=true');
  console.log('4. Verifique se há índice composto (deleted + nome) no Firestore');
  console.log('\n');

  process.exit(0);
}

diagnose().catch(error => {
  console.error('❌ Erro fatal no diagnóstico:', error);
  process.exit(1);
});