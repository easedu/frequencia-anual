#!/usr/bin/env node

/**
 * Análise detalhada: Contar chamadas ao Firebase
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

let callCount = 0;
const callLog = [];

// Interceptar getDocs
const originalGetDocs = getDocs;
const trackedGetDocs = async (...args) => {
  callCount++;
  const path = args[0]?.path || args[0]?._query?.path?.segments?.join('/') || 'unknown';
  callLog.push({ call: callCount, path, type: 'getDocs' });
  console.log(`[${callCount}] getDocs: ${path}`);
  return originalGetDocs(...args);
};

async function simulatePageLoad() {
  console.log('🔍 SIMULANDO CARREGAMENTO DA PÁGINA TELEFONES\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Buscar estudantes
  console.log('📋 [1] Buscando estudantes...');
  const studentsRef = collection(db, 'students');
  const q = query(studentsRef, where('deleted', '==', false), orderBy('nome'));
  const studentsSnap = await trackedGetDocs(q);
  console.log(`   ✓ ${studentsSnap.docs.length} estudantes encontrados\n`);

  // 2. Buscar contatos (paralelo)
  console.log('📞 [2] Buscando contatos em paralelo...');
  const studentIds = studentsSnap.docs.slice(0, 60).map(doc => doc.id); // Primeiros 60
  
  const contactPromises = studentIds.map(async (estudanteId) => {
    const contactsRef = collection(db, `students/${estudanteId}/contacts`);
    return trackedGetDocs(contactsRef);
  });

  await Promise.all(contactPromises);
  console.log(`   ✓ Contatos carregados\n`);

  // 3. Estrutura antiga (whatsapp_verified_numbers)
  console.log('📦 [3] Buscando dados de verificação WhatsApp...');
  const whatsappRef = collection(db, 'whatsapp_verified_numbers');
  await trackedGetDocs(whatsappRef);
  console.log(`   ✓ Verificações carregadas\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 RESUMO DE CHAMADAS:\n');
  console.log(`   Total de requests: ${callCount}`);
  console.log(`   - 1 query de estudantes`);
  console.log(`   - ${callCount - 2} queries de contatos`);
  console.log(`   - 1 query de verificações WhatsApp`);
  
  console.log('\n💡 ANÁLISE:\n');
  if (callCount === 62) {
    console.log('   ✅ Número esperado de requests (1 + 60 + 1)');
    console.log('   📝 60 estudantes com contatos (primeiros da lista)');
  } else if (callCount > 62) {
    console.log(`   ⚠️  ${callCount - 62} requests extras detectadas!`);
  }

  process.exit(0);
}

simulatePageLoad().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
