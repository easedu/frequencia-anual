/**
 * FASE 0.3: CRIAR ESTRUTURA V3 NO FIRESTORE
 *
 * Prepara collections V3 (sem dados ainda):
 * - absences_summary/ (vazia)
 * - Testa permissões de leitura/escrita
 * - Valida que estrutura está pronta
 *
 * IMPORTANTE: NÃO migra dados, apenas prepara estrutura
 *
 * Execução: node scripts/migration/02-create-v3-structure.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

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

async function createV3Structure() {
  console.log('\n' + '═'.repeat(80));
  console.log('  CRIAR ESTRUTURA V3: Preparação para Migração');
  console.log('═'.repeat(80) + '\n');

  const tests = {
    summaryCollectionCreated: false,
    summaryWriteTest: false,
    summaryReadTest: false,
    summaryDeleteTest: false,
    subcollectionWriteTest: false,
    subcollectionReadTest: false,
    subcollectionDeleteTest: false,
  };

  try {
    // 1. Criar subcollection students/{id}/absence_summary/ com documento de teste
    console.log('1️⃣  Criando subcollection students/{id}/absence_summary/...\n');

    const testMonth = '2025-01';
    const testStudentId = '_test_student_migration';
    const summaryRef = doc(db, 'students', testStudentId, 'absence_summary', testMonth);

    console.log(`   📝 Criando documento de teste: students/${testStudentId}/absence_summary/${testMonth}`);

    await setDoc(summaryRef, {
      count: 0,
      justified: 0,
      unjustified: 0,
      dates: [],
      lastUpdated: new Date().toISOString(),
      _test: true,
      _purpose: 'Teste de criação de estrutura V3',
      _createdAt: new Date().toISOString(),
    });

    tests.summaryCollectionCreated = true;
    tests.summaryWriteTest = true;
    console.log('   ✅ Documento criado com sucesso\n');

    // 2. Testar leitura do summary
    console.log('2️⃣  Testando leitura de students/{id}/absence_summary/...\n');

    const summarySnap = await getDoc(summaryRef);

    if (summarySnap.exists()) {
      const data = summarySnap.data();
      console.log('   ✅ Leitura bem-sucedida');
      console.log(`   📊 Dados lidos:`, {
        count: data.count,
        _test: data._test,
      });
      tests.summaryReadTest = true;
    } else {
      throw new Error('Documento de teste não encontrado após criação');
    }

    console.log();

    // 3. Testar subcoleção students/{id}/absences/
    console.log('3️⃣  Testando subcoleção students/{id}/absences/...\n');

    const testAbsenceRef = doc(
      db,
      'students',
      testStudentId,
      'absences',
      '_test_absence'
    );

    console.log(`   📝 Criando documento de teste: students/${testStudentId}/absences/_test_absence`);

    await setDoc(testAbsenceRef, {
      data: '2025-01-15',
      justified: false,
      atestadoId: null,
      _test: true,
      _createdAt: new Date().toISOString(),
    });

    tests.subcollectionWriteTest = true;
    console.log('   ✅ Subcoleção criada com sucesso\n');

    // 4. Testar leitura da subcoleção
    console.log('4️⃣  Testando leitura de subcoleção...\n');

    const absenceSnap = await getDoc(testAbsenceRef);

    if (absenceSnap.exists()) {
      const data = absenceSnap.data();
      console.log('   ✅ Leitura bem-sucedida');
      console.log(`   📊 Dados lidos:`, {
        data: data.data,
        justified: data.justified,
      });
      tests.subcollectionReadTest = true;
    } else {
      throw new Error('Documento de teste de subcoleção não encontrado');
    }

    console.log();

    // 5. Limpar documentos de teste
    console.log('5️⃣  Limpando documentos de teste...\n');

    await deleteDoc(summaryRef);
    tests.summaryDeleteTest = true;
    console.log('   ✅ Summary de teste deletado');

    await deleteDoc(testAbsenceRef);
    tests.subcollectionDeleteTest = true;
    console.log('   ✅ Subcoleção de teste deletada\n');

    // 6. Relatório final
    console.log('═'.repeat(80));
    console.log('  VALIDAÇÃO DA ESTRUTURA V3');
    console.log('═'.repeat(80) + '\n');

    const allPassed = Object.values(tests).every(t => t === true);

    console.log('📊 Resultados dos Testes:\n');
    console.log(`   • Subcollection students/{id}/absence_summary/ criada: ${tests.summaryCollectionCreated ? '✅' : '❌'}`);
    console.log(`   • Escrita em students/{id}/absence_summary/: ${tests.summaryWriteTest ? '✅' : '❌'}`);
    console.log(`   • Leitura de students/{id}/absence_summary/: ${tests.summaryReadTest ? '✅' : '❌'}`);
    console.log(`   • Deleção de students/{id}/absence_summary/: ${tests.summaryDeleteTest ? '✅' : '❌'}`);
    console.log(`   • Escrita em students/{id}/absences/: ${tests.subcollectionWriteTest ? '✅' : '❌'}`);
    console.log(`   • Leitura de students/{id}/absences/: ${tests.subcollectionReadTest ? '✅' : '❌'}`);
    console.log(`   • Deleção de students/{id}/absences/: ${tests.subcollectionDeleteTest ? '✅' : '❌'}`);

    console.log('\n' + '═'.repeat(80));

    if (allPassed) {
      console.log('  ✅ ESTRUTURA V3 PRONTA PARA MIGRAÇÃO!');
      console.log('═'.repeat(80));
      console.log('\n✅ Todos os testes passaram!');
      console.log('✅ Permissões de leitura/escrita OK');
      console.log('✅ Collections funcionando corretamente\n');
      console.log('📋 Próximo passo: Executar script 03-migrate-historical-data.mjs\n');
    } else {
      console.log('  ❌ PROBLEMAS ENCONTRADOS NA ESTRUTURA V3');
      console.log('═'.repeat(80));
      console.log('\n⚠️  Alguns testes falharam!');
      console.log('⚠️  Verificar permissões do Firestore');
      console.log('⚠️  NÃO prosseguir com migração até resolver\n');
      process.exit(1);
    }

    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERRO ao criar estrutura V3:', error);
    console.error('\n⚠️  Possíveis causas:');
    console.error('   • Permissões insuficientes no Firestore');
    console.error('   • Regras de segurança bloqueando escrita');
    console.error('   • Problema de conexão com Firebase\n');

    console.log('📊 Status dos testes até o erro:\n');
    Object.entries(tests).forEach(([test, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${test}`);
    });

    console.log();
    process.exit(1);
  }

  process.exit(0);
}

createV3Structure();
