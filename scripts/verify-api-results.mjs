#!/usr/bin/env node

/**
 * Script de Validação: Verificar resultados da API /tasks/create
 *
 * Valida se:
 * 1. Tasks foram criadas corretamente
 * 2. Interação foi salva em V1 (2025/interactions/{studentId}/{id})
 * 3. Interação foi salva em V3 (students/{studentId}/interactions/{id})
 * 4. Campos da task estão preenchidos corretamente
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Configuração do Firebase
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

// IDs dos testes (pegar do output anterior)
const STUDENT_ID = '00597fff-31f9-4522-ab65-83d17b87ddbf';
const TASK_ID_PENDENTE = 'D5tdMEsCdQLHUzROmTsT';
const TASK_ID_RESOLVIDA = 'f8IBlTRPkG4VYRsavEci';
const INTERACTION_ID = 'XQHkhPrZ6XYasQPKG7ws';

async function verifyResults() {
  console.log('🔍 VALIDAÇÃO: Resultados da API /tasks/create\n');
  console.log('═'.repeat(70));

  let allPassed = true;

  // ========== TESTE 1: Task Pendente ==========
  console.log('\n📋 TESTE 1: Task Pendente');
  console.log('─'.repeat(70));

  try {
    const taskPendenteRef = doc(db, 'userTasks', TASK_ID_PENDENTE);
    const taskPendenteSnap = await getDoc(taskPendenteRef);

    if (!taskPendenteSnap.exists()) {
      console.log('❌ Task pendente NÃO ENCONTRADA');
      allPassed = false;
    } else {
      const data = taskPendenteSnap.data();
      console.log('✅ Task pendente encontrada');
      console.log(`   Status: ${data.status}`);
      console.log(`   Estudante: ${data.studentName}`);
      console.log(`   Faltas: ${data.absencesCount}`);
      console.log(`   Bimestre: ${data.bimestre}`);
      console.log(`   Prioridade: ${data.priority}`);
      console.log(`   Ação recomendada: ${data.recommendedAction}`);

      // Validações
      if (data.status !== 'PENDING') {
        console.log('   ⚠️  Status deveria ser PENDING');
        allPassed = false;
      }
      if (data.interactionId) {
        console.log('   ⚠️  interactionId deveria ser undefined');
        allPassed = false;
      }
    }
  } catch (error) {
    console.log(`❌ Erro ao verificar task pendente: ${error.message}`);
    allPassed = false;
  }

  // ========== TESTE 2: Task Resolvida ==========
  console.log('\n\n📋 TESTE 2: Task Resolvida');
  console.log('─'.repeat(70));

  try {
    const taskResolvidaRef = doc(db, 'userTasks', TASK_ID_RESOLVIDA);
    const taskResolvidaSnap = await getDoc(taskResolvidaRef);

    if (!taskResolvidaSnap.exists()) {
      console.log('❌ Task resolvida NÃO ENCONTRADA');
      allPassed = false;
    } else {
      const data = taskResolvidaSnap.data();
      console.log('✅ Task resolvida encontrada');
      console.log(`   Status: ${data.status}`);
      console.log(`   Estudante: ${data.studentName}`);
      console.log(`   Faltas: ${data.absencesCount}`);
      console.log(`   Bimestre: ${data.bimestre}`);
      console.log(`   Prioridade: ${data.priority}`);
      console.log(`   Resolvido por: ${data.resolvedBy}`);
      console.log(`   Interaction ID: ${data.interactionId}`);
      console.log(`   Interaction Type: ${data.interactionType}`);
      console.log(`   Interaction Description: ${data.interactionDescription?.substring(0, 60)}...`);

      // Validações CRÍTICAS
      const issues = [];
      if (data.status !== 'COMPLETED') issues.push('Status deveria ser COMPLETED');
      if (!data.interactionId) issues.push('interactionId está faltando');
      if (!data.interactionType) issues.push('interactionType está faltando');
      if (!data.interactionDescription) issues.push('interactionDescription está faltando');

      if (issues.length > 0) {
        console.log('\n   ⚠️  PROBLEMAS ENCONTRADOS:');
        issues.forEach(issue => console.log(`      - ${issue}`));
        allPassed = false;
      } else {
        console.log('\n   ✅ Todos os campos obrigatórios preenchidos!');
      }
    }
  } catch (error) {
    console.log(`❌ Erro ao verificar task resolvida: ${error.message}`);
    allPassed = false;
  }

  // ========== TESTE 3: Interação V1 ==========
  console.log('\n\n📂 TESTE 3: Interação V1 (2025/interactions/{studentId}/{id})');
  console.log('─'.repeat(70));

  try {
    const interactionV1Ref = doc(db, '2025', 'interactions', STUDENT_ID, INTERACTION_ID);
    const interactionV1Snap = await getDoc(interactionV1Ref);

    if (!interactionV1Snap.exists()) {
      console.log('❌ Interação V1 NÃO ENCONTRADA');
      allPassed = false;
    } else {
      const data = interactionV1Snap.data();
      console.log('✅ Interação V1 encontrada');
      console.log(`   Tipo: ${data.type}`);
      console.log(`   Data: ${data.date}`);
      console.log(`   Criado por: ${data.createdBy}`);
      console.log(`   Student ID: ${data.studentId}`);
      console.log(`   Descrição: ${data.description?.substring(0, 80)}...`);

      if (!data.studentId) {
        console.log('   ⚠️  Campo studentId está faltando (necessário para V1)');
        allPassed = false;
      }
    }
  } catch (error) {
    console.log(`❌ Erro ao verificar interação V1: ${error.message}`);
    allPassed = false;
  }

  // ========== TESTE 4: Interação V3 ==========
  console.log('\n\n📂 TESTE 4: Interação V3 (students/{studentId}/interactions/{id})');
  console.log('─'.repeat(70));

  try {
    const interactionV3Ref = doc(db, 'students', STUDENT_ID, 'interactions', INTERACTION_ID);
    const interactionV3Snap = await getDoc(interactionV3Ref);

    if (!interactionV3Snap.exists()) {
      console.log('❌ Interação V3 NÃO ENCONTRADA');
      allPassed = false;
    } else {
      const data = interactionV3Snap.data();
      console.log('✅ Interação V3 encontrada');
      console.log(`   Tipo: ${data.type}`);
      console.log(`   Data: ${data.date}`);
      console.log(`   Criado por: ${data.createdBy}`);
      console.log(`   Ano Letivo: ${data.anoLetivo}`);
      console.log(`   Descrição: ${data.description?.substring(0, 80)}...`);

      if (!data.anoLetivo) {
        console.log('   ⚠️  Campo anoLetivo está faltando (necessário para V3)');
        allPassed = false;
      }
    }
  } catch (error) {
    console.log(`❌ Erro ao verificar interação V3: ${error.message}`);
    allPassed = false;
  }

  // ========== RESULTADO FINAL ==========
  console.log('\n' + '═'.repeat(70));
  if (allPassed) {
    console.log('✅ VALIDAÇÃO COMPLETA: TODOS OS TESTES PASSARAM!\n');
    console.log('🎉 A API está funcionando corretamente:');
    console.log('   ✓ Tasks são criadas com todos os campos');
    console.log('   ✓ Interações são salvas em V1 (compatibilidade)');
    console.log('   ✓ Interações são salvas em V3 (futuro)');
    console.log('   ✓ Campos interactionType e interactionDescription preenchidos');
  } else {
    console.log('❌ VALIDAÇÃO FALHOU: Alguns problemas foram encontrados\n');
    console.log('Revise os logs acima para detalhes.');
    process.exit(1);
  }
  console.log('═'.repeat(70) + '\n');
}

verifyResults()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ ERRO FATAL:', error);
    process.exit(1);
  });
