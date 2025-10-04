#!/usr/bin/env node

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

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

async function analyzeV3Structure() {
  console.log('🔍 ANÁLISE DA ESTRUTURA V3\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Pegar primeiro estudante
  const studentsRef = collection(db, 'students');
  const studentsSnap = await getDocs(studentsRef);
  
  if (studentsSnap.docs.length === 0) {
    console.log('❌ Nenhum estudante encontrado!');
    process.exit(1);
  }

  const firstStudent = studentsSnap.docs[0];
  const studentData = firstStudent.data();

  console.log('📋 ESTUDANTE (documento raiz):');
  console.log(`   ID: ${firstStudent.id}`);
  console.log(`   Nome: ${studentData.nome}`);
  console.log(`   Campos disponíveis:`, Object.keys(studentData));
  console.log();

  // 2. Verificar se contatos estão na RAIZ ou SUBCOLEÇÃO
  console.log('📞 VERIFICANDO CONTATOS:\n');
  
  if (studentData.contatos) {
    console.log('   ✅ Contatos EXISTEM no documento raiz!');
    console.log(`   📦 Tipo: ${Array.isArray(studentData.contatos) ? 'Array' : typeof studentData.contatos}`);
    console.log(`   📊 Quantidade: ${Array.isArray(studentData.contatos) ? studentData.contatos.length : 'N/A'}`);
    
    if (Array.isArray(studentData.contatos) && studentData.contatos.length > 0) {
      console.log(`   📝 Exemplo:`, studentData.contatos[0]);
    }
  } else {
    console.log('   ❌ Contatos NÃO existem no documento raiz');
  }

  console.log();

  // 3. Verificar subcoleção de contatos
  const contactsRef = collection(db, `students/${firstStudent.id}/contacts`);
  const contactsSnap = await getDocs(contactsRef);

  console.log('📂 SUBCOLEÇÃO "contacts":');
  console.log(`   Documentos: ${contactsSnap.docs.length}`);
  
  if (contactsSnap.docs.length > 0) {
    const firstContact = contactsSnap.docs[0].data();
    console.log(`   Campos:`, Object.keys(firstContact));
    console.log(`   Exemplo:`, firstContact);
  }

  console.log();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 4. DIAGNÓSTICO
  console.log('💡 DIAGNÓSTICO:\n');
  
  const hasRootContacts = !!studentData.contatos;
  const hasSubcollection = contactsSnap.docs.length > 0;

  if (hasRootContacts && hasSubcollection) {
    console.log('⚠️  DUPLICAÇÃO DETECTADA!');
    console.log('   - Contatos estão no DOCUMENTO RAIZ');
    console.log('   - Contatos também estão na SUBCOLEÇÃO');
    console.log('   - Isso causa queries DESNECESSÁRIAS!\n');
    console.log('📌 SOLUÇÃO:');
    console.log('   Usar APENAS contatos do documento raiz');
    console.log('   Remover busca da subcoleção contacts/');
  } else if (hasRootContacts) {
    console.log('✅ ESTRUTURA OTIMIZADA!');
    console.log('   - Contatos no documento raiz (1 query)');
    console.log('   - SEM subcoleção (nenhuma query extra)');
  } else if (hasSubcollection) {
    console.log('⚠️  ESTRUTURA ANTIGA!');
    console.log('   - Contatos APENAS na subcoleção');
    console.log('   - Precisa de queries extras');
  } else {
    console.log('❌ SEM CONTATOS!');
  }

  console.log();
  process.exit(0);
}

analyzeV3Structure().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
