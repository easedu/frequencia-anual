#!/usr/bin/env node

/**
 * Teste completo: Simular o fluxo da página perfil-estudante
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

// Simular StudentDataService.convertV3ToEstudante
function convertV3ToEstudante(studentData) {
  return {
    estudanteId: studentData.estudanteId,
    nome: studentData.nome,
    turma: studentData.turma,
    // CORREÇÃO APLICADA: usar statusEstudante em vez de status
    status: studentData.statusEstudante || studentData.status,
    turno: studentData.turno,
    deleted: studentData.deleted
  };
}

async function testCompleteFix() {
  console.log('🧪 TESTE COMPLETO DO FLUXO\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Simular StudentDataService.getStudents()
  console.log('📋 [1/3] Simulando StudentDataService.getStudents()...\n');
  
  const studentsRef = collection(db, 'students');
  const snapshot = await getDocs(studentsRef);
  
  const allStudentsData = [];
  for (const doc of snapshot.docs) {
    const studentData = doc.data();
    const student = convertV3ToEstudante(studentData);
    allStudentsData.push(student);
  }
  
  console.log(`   ✓ Total de estudantes lidos: ${allStudentsData.length}`);

  // 2. Simular o filtro da página (linha 186-192)
  console.log('\n📋 [2/3] Simulando filtro da página (linha 187)...\n');
  
  const activeStudents = allStudentsData
    .filter(s => s.status === "ATIVO")
    .sort((a, b) => a.nome.localeCompare(b.nome));
  
  console.log(`   ✓ Estudantes ATIVOS filtrados: ${activeStudents.length}`);

  // 3. Simular extração de turmas únicas (linha 1169)
  console.log('\n📋 [3/3] Simulando extração de turmas únicas (linha 1169)...\n');
  
  const uniqueTurmas = Array.from(new Set(activeStudents.map(s => s.turma))).sort((a, b) => {
    const matchA = a.match(/(\d+)([A-Z]+)/);
    const matchB = b.match(/(\d+)([A-Z]+)/);
    
    if (!matchA || !matchB) return 0;
    
    const [, numA, letterA] = matchA;
    const [, numB, letterB] = matchB;
    const numCompare = Number(numA) - Number(numB);
    if (numCompare !== 0) return numCompare;
    return letterA.localeCompare(letterB);
  });
  
  console.log(`   ✓ Turmas únicas encontradas: ${uniqueTurmas.length}`);
  console.log(`   ✓ Turmas: ${uniqueTurmas.join(', ')}`);

  // 4. Mostrar distribuição de estudantes por turma
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 DISTRIBUIÇÃO DE ESTUDANTES POR TURMA:\n');
  
  uniqueTurmas.forEach(turma => {
    const count = activeStudents.filter(s => s.turma === turma).length;
    console.log(`   ${turma}: ${count} estudantes`);
  });

  // 5. Resultado final
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (activeStudents.length > 600 && uniqueTurmas.length > 20) {
    console.log('✅ TESTE PASSOU! A página agora deve exibir:');
    console.log(`   • ${activeStudents.length} estudantes ativos`);
    console.log(`   • ${uniqueTurmas.length} turmas no dropdown`);
    console.log(`   • Estudantes organizados por turma\n`);
    console.log('🎉 CORREÇÃO APLICADA COM SUCESSO!\n');
  } else {
    console.log('❌ TESTE FALHOU! Ainda há problemas:');
    console.log(`   • Estudantes ativos: ${activeStudents.length} (esperado > 600)`);
    console.log(`   • Turmas: ${uniqueTurmas.length} (esperado > 20)\n`);
  }

  process.exit(0);
}

testCompleteFix().catch(error => {
  console.error('❌ Erro no teste:', error);
  process.exit(1);
});
