#!/usr/bin/env node

/**
 * Script de validação: Confirmar que a correção resolve o problema
 */

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

async function validateFix() {
  console.log('✅ VALIDAÇÃO DA CORREÇÃO\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const studentsRef = collection(db, 'students');
  const snapshot = await getDocs(studentsRef);

  const allStudents = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Simular a lógica do convertV3ToEstudante
    const student = {
      estudanteId: data.estudanteId,
      nome: data.nome,
      turma: data.turma,
      // CORREÇÃO: usar statusEstudante em vez de status
      status: data.statusEstudante || data.status,
      deleted: data.deleted
    };

    allStudents.push(student);
  }

  // Simular o filtro da página (linha 186-192)
  const activeStudents = allStudents
    .filter(s => s.status === "ATIVO" && s.deleted !== true)
    .sort((a, b) => a.nome.localeCompare(b.nome));

  console.log('📊 RESULTADO DA SIMULAÇÃO:\n');
  console.log(`   Total de documentos no DB: ${allStudents.length}`);
  console.log(`   Estudantes ATIVOS (após correção): ${activeStudents.length}`);
  console.log(`   Estudantes INATIVOS: ${allStudents.filter(s => s.status === "INATIVO").length}`);
  console.log(`   Outros status: ${allStudents.filter(s => s.status !== "ATIVO" && s.status !== "INATIVO").length}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (activeStudents.length > 600) {
    console.log('✅ SUCESSO! A correção resolveu o problema!');
    console.log(`   ${activeStudents.length} estudantes ativos serão exibidos na página.\n`);

    // Mostrar exemplos de turmas
    const turmas = [...new Set(activeStudents.map(s => s.turma))].sort();
    console.log(`📚 Turmas disponíveis (${turmas.length} turmas):`)
    console.log(`   ${turmas.slice(0, 10).join(', ')}${turmas.length > 10 ? '...' : ''}\n`);

  } else {
    console.log('❌ PROBLEMA! Ainda há algo errado.');
    console.log(`   Apenas ${activeStudents.length} estudantes ativos encontrados.\n`);
  }

  process.exit(0);
}

validateFix().catch(error => {
  console.error('❌ Erro na validação:', error);
  process.exit(1);
});
