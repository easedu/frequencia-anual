/**
 * SCRIPT DE VALIDAÇÃO - FASE 1
 *
 * Valida se a migração FASE 1 (Dual-Write) está funcionando corretamente
 *
 * Testes:
 * 1. Criar estudante → deve aparecer em V2 E V3
 * 2. Atualizar estudante → deve atualizar em V2 E V3
 * 3. Ler estudante → deve ler de V3 (ou V2 se V3 vazio)
 * 4. Contatos → devem ser salvos em ambas estruturas
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  setDoc,
  writeBatch,
  addDoc,
  Timestamp,
} from 'firebase/firestore';

// Firebase config
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

const ANO_LETIVO = process.env.NEXT_PUBLIC_SCHOOL_YEAR || '2025';

// Estudante de teste
const TEST_STUDENT = {
  estudanteId: 'TEST_PHASE1_' + Date.now(),
  nome: 'TESTE FASE 1',
  turma: '5A',
  status: 'ATIVO',
  turno: 'MANHÃ',
  bolsaFamilia: 'NÃO',
  matricula: 'TEST123',
  email: 'teste@fase1.com',
  dataNascimento: '01/01/2015',
  contatos: [
    {
      nome: 'Maria',
      parentesco: 'Mãe',
      telefone: '(11) 98888-7777',
      podeReceberMensagem: true,
    },
    {
      nome: 'João',
      parentesco: 'Pai',
      telefone: '(11) 98888-6666',
      podeReceberMensagem: true,
    },
  ],
  deficiencia: {
    estudanteComDeficiencia: false,
    tipoDeficiencia: [],
    possuiBarreiras: true,
    horarioAtendimento: 'NENHUM',
    atendimentoSaude: [],
    possuiEstagiario: false,
    nomeEstagiario: 'NÃO NECESSITA',
    justificativaEstagiario: 'SEM BARREIRAS',
    ave: false,
    nomeAve: '',
    justificativaAve: [],
  },
  provaSaoPaulo: [],
};

/**
 * Write student to V2 and V3 (DUAL-WRITE)
 */
async function dualWriteStudent(student) {
  const batch = writeBatch(db);

  // 1. Write to V2
  const v2Ref = doc(db, ANO_LETIVO, 'escola', 'students', student.estudanteId);
  batch.set(v2Ref, {
    ...student,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  // 2. Write to V3 root
  const v3Ref = doc(db, 'students', student.estudanteId);
  const { contatos, ...studentData } = student;
  batch.set(v3Ref, {
    ...studentData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  await batch.commit();

  // 3. Write contacts to V3 subcollection
  if (student.contatos && student.contatos.length > 0) {
    for (const contato of student.contatos) {
      const contactsRef = collection(db, 'students', student.estudanteId, 'contacts');
      await addDoc(contactsRef, {
        nome: contato.nome,
        parentesco: contato.parentesco,
        telefone: contato.telefone,
        telefoneNumerico: contato.telefone.replace(/\D/g, ''),
        podeReceberWhatsapp: contato.podeReceberMensagem !== false,
        createdAt: Timestamp.now(),
      });
    }
  }
}

/**
 * Update student in V2 and V3 (DUAL-WRITE)
 */
async function dualUpdateStudent(student) {
  const batch = writeBatch(db);

  // 1. Update V2
  const v2Ref = doc(db, ANO_LETIVO, 'escola', 'students', student.estudanteId);
  batch.set(v2Ref, {
    ...student,
    updatedAt: Timestamp.now(),
  }, { merge: true });

  // 2. Update V3 root
  const v3Ref = doc(db, 'students', student.estudanteId);
  const { contatos, ...studentData } = student;
  batch.set(v3Ref, {
    ...studentData,
    updatedAt: Timestamp.now(),
  }, { merge: true });

  await batch.commit();

  // 3. Update contacts (delete all and recreate)
  const contactsRef = collection(db, 'students', student.estudanteId, 'contacts');
  const existingContacts = await getDocs(contactsRef);

  const deleteBatch = writeBatch(db);
  existingContacts.docs.forEach(doc => {
    deleteBatch.delete(doc.ref);
  });
  await deleteBatch.commit();

  // Add new contacts
  if (student.contatos && student.contatos.length > 0) {
    for (const contato of student.contatos) {
      await addDoc(contactsRef, {
        nome: contato.nome,
        parentesco: contato.parentesco,
        telefone: contato.telefone,
        telefoneNumerico: contato.telefone.replace(/\D/g, ''),
        podeReceberWhatsapp: contato.podeReceberMensagem !== false,
        createdAt: Timestamp.now(),
      });
    }
  }
}

/**
 * Read student from V3 with fallback to V2
 */
async function dualReadStudent(estudanteId) {
  // Try V3 first
  const v3Ref = doc(db, 'students', estudanteId);
  const v3Snap = await getDoc(v3Ref);

  if (v3Snap.exists()) {
    const studentData = v3Snap.data();

    // Fetch contacts
    const contactsRef = collection(db, 'students', estudanteId, 'contacts');
    const contactsSnap = await getDocs(contactsRef);

    const contatos = contactsSnap.docs.map(doc => {
      const contact = doc.data();
      return {
        nome: contact.nome,
        parentesco: contact.parentesco,
        telefone: contact.telefone,
        podeReceberMensagem: contact.podeReceberWhatsapp !== false,
      };
    });

    return {
      ...studentData,
      contatos,
    };
  }

  // Fallback to V2
  const v2Ref = doc(db, ANO_LETIVO, 'escola', 'students', estudanteId);
  const v2Snap = await getDoc(v2Ref);

  if (v2Snap.exists()) {
    return v2Snap.data();
  }

  return null;
}

/**
 * Verificar se estudante existe em V2
 */
async function checkV2Exists(estudanteId) {
  const docRef = doc(db, ANO_LETIVO, 'escola', 'students', estudanteId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
}

/**
 * Verificar se estudante existe em V3
 */
async function checkV3Exists(estudanteId) {
  const docRef = doc(db, 'students', estudanteId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
}

/**
 * Verificar se contatos existem em V3 subcoleção
 */
async function checkV3Contacts(estudanteId) {
  const contactsRef = collection(db, 'students', estudanteId, 'contacts');
  const contactsSnap = await getDocs(contactsRef);
  return contactsSnap.size;
}

/**
 * Limpar dados de teste
 */
async function cleanup(estudanteId) {
  console.log('\n🧹 Limpando dados de teste...');

  try {
    // Delete V2
    const v2Ref = doc(db, ANO_LETIVO, 'escola', 'students', estudanteId);
    await deleteDoc(v2Ref);
    console.log('  ✓ V2 deletado');
  } catch (error) {
    console.log('  ⚠️  V2 não encontrado ou erro ao deletar');
  }

  try {
    // Delete V3 root
    const v3Ref = doc(db, 'students', estudanteId);
    await deleteDoc(v3Ref);
    console.log('  ✓ V3 raiz deletado');
  } catch (error) {
    console.log('  ⚠️  V3 raiz não encontrado ou erro ao deletar');
  }

  try {
    // Delete V3 contacts
    const contactsRef = collection(db, 'students', estudanteId, 'contacts');
    const contactsSnap = await getDocs(contactsRef);
    for (const contactDoc of contactsSnap.docs) {
      await deleteDoc(contactDoc.ref);
    }
    console.log(`  ✓ ${contactsSnap.size} contatos V3 deletados`);
  } catch (error) {
    console.log('  ⚠️  Erro ao deletar contatos V3');
  }

  console.log('✅ Limpeza concluída\n');
}

/**
 * TESTE 1: Criar estudante
 */
async function test1_CreateStudent() {
  console.log('📝 TESTE 1: Criar Estudante (Dual-Write)');
  console.log('━'.repeat(60));

  try {
    // Criar estudante
    console.log('Criando estudante:', TEST_STUDENT.nome);
    await dualWriteStudent(TEST_STUDENT);

    // Aguardar propagação
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verificar V2
    const v2Exists = await checkV2Exists(TEST_STUDENT.estudanteId);
    console.log(`V2 (2025/escola/students): ${v2Exists ? '✅ Existe' : '❌ NÃO EXISTE'}`);

    // Verificar V3
    const v3Exists = await checkV3Exists(TEST_STUDENT.estudanteId);
    console.log(`V3 (students): ${v3Exists ? '✅ Existe' : '❌ NÃO EXISTE'}`);

    // Verificar contatos V3
    const contactsCount = await checkV3Contacts(TEST_STUDENT.estudanteId);
    console.log(
      `V3 Contatos: ${contactsCount === 2 ? '✅ 2 contatos' : `❌ ${contactsCount} contatos (esperado 2)`}`
    );

    const success = v2Exists && v3Exists && contactsCount === 2;
    console.log(`\nResultado: ${success ? '✅ PASSOU' : '❌ FALHOU'}\n`);

    return success;
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return false;
  }
}

/**
 * TESTE 2: Atualizar estudante
 */
async function test2_UpdateStudent() {
  console.log('✏️  TESTE 2: Atualizar Estudante (Dual-Write)');
  console.log('━'.repeat(60));

  try {
    // Atualizar estudante
    const updatedStudent = {
      ...TEST_STUDENT,
      nome: 'TESTE FASE 1 ATUALIZADO',
      email: 'atualizado@fase1.com',
      contatos: [
        {
          nome: 'Maria Silva',
          parentesco: 'Mãe',
          telefone: '(11) 98888-7777',
          podeReceberMensagem: true,
        },
      ],
    };

    console.log('Atualizando estudante...');
    await dualUpdateStudent(updatedStudent);

    // Aguardar propagação
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verificar V2
    const v2Ref = doc(db, ANO_LETIVO, 'escola', 'students', TEST_STUDENT.estudanteId);
    const v2Snap = await getDoc(v2Ref);
    const v2Updated = v2Snap.exists() && v2Snap.data()?.nome === 'TESTE FASE 1 ATUALIZADO';
    console.log(`V2 atualizado: ${v2Updated ? '✅ Sim' : '❌ Não'}`);

    // Verificar V3
    const v3Ref = doc(db, 'students', TEST_STUDENT.estudanteId);
    const v3Snap = await getDoc(v3Ref);
    const v3Updated = v3Snap.exists() && v3Snap.data()?.nome === 'TESTE FASE 1 ATUALIZADO';
    console.log(`V3 atualizado: ${v3Updated ? '✅ Sim' : '❌ Não'}`);

    // Verificar contatos atualizados em V3
    const contactsCount = await checkV3Contacts(TEST_STUDENT.estudanteId);
    console.log(
      `V3 Contatos: ${contactsCount === 1 ? '✅ 1 contato' : `❌ ${contactsCount} contatos (esperado 1)`}`
    );

    const success = v2Updated && v3Updated && contactsCount === 1;
    console.log(`\nResultado: ${success ? '✅ PASSOU' : '❌ FALHOU'}\n`);

    return success;
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return false;
  }
}

/**
 * TESTE 3: Ler estudante (com fallback)
 */
async function test3_ReadStudent() {
  console.log('📖 TESTE 3: Ler Estudante (V3 com fallback V2)');
  console.log('━'.repeat(60));

  try {
    // Ler estudante
    console.log('Lendo estudante via dual-read...');
    const student = await dualReadStudent(TEST_STUDENT.estudanteId);

    if (!student) {
      console.log('❌ Estudante não encontrado');
      return false;
    }

    console.log('✅ Estudante encontrado:', student.nome);
    console.log(`   Contatos: ${student.contatos?.length || 0}`);
    console.log(`   Email: ${student.email}`);

    const success =
      student.nome === 'TESTE FASE 1 ATUALIZADO' &&
      student.email === 'atualizado@fase1.com' &&
      student.contatos?.length === 1;

    console.log(`\nResultado: ${success ? '✅ PASSOU' : '❌ FALHOU'}\n`);

    return success;
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return false;
  }
}

/**
 * Executar todos os testes
 */
async function runAllTests() {
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('  VALIDAÇÃO FASE 1 - DUAL-WRITE');
  console.log('═'.repeat(60));
  console.log('\n');

  const results = {
    test1: false,
    test2: false,
    test3: false,
  };

  try {
    // Limpar dados anteriores
    await cleanup(TEST_STUDENT.estudanteId);

    // Executar testes
    results.test1 = await test1_CreateStudent();
    results.test2 = await test2_UpdateStudent();
    results.test3 = await test3_ReadStudent();

    // Resultado final
    console.log('═'.repeat(60));
    console.log('  RESULTADO FINAL');
    console.log('═'.repeat(60));
    console.log(`Teste 1 (Criar): ${results.test1 ? '✅ PASSOU' : '❌ FALHOU'}`);
    console.log(`Teste 2 (Atualizar): ${results.test2 ? '✅ PASSOU' : '❌ FALHOU'}`);
    console.log(`Teste 3 (Ler): ${results.test3 ? '✅ PASSOU' : '❌ FALHOU'}`);
    console.log('═'.repeat(60));

    const allPassed = results.test1 && results.test2 && results.test3;

    if (allPassed) {
      console.log('\n🎉 TODOS OS TESTES PASSARAM! FASE 1 VALIDADA! 🎉\n');
    } else {
      console.log('\n❌ ALGUNS TESTES FALHARAM. REVISAR IMPLEMENTAÇÃO.\n');
    }

    // Limpar dados de teste
    await cleanup(TEST_STUDENT.estudanteId);

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ ERRO CRÍTICO:', error);
    await cleanup(TEST_STUDENT.estudanteId);
    process.exit(1);
  }
}

// Executar
runAllTests();