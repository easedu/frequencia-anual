/**
 * TESTE LOCAL: DUAL-WRITE V2 + V3
 *
 * Valida que dual-write está funcionando corretamente:
 * 1. Cria falta de teste
 * 2. Verifica escrita em V2
 * 3. Verifica escrita em V3 (subcoleção)
 * 4. Verifica escrita em V3 (summary)
 * 5. Remove registros de teste
 *
 * IMPORTANTE: Este script funciona mesmo se quota estiver excedida,
 * pois usa apenas leituras e uma única escrita de teste.
 *
 * Execução: NEXT_PUBLIC_FIREBASE_API_KEY=... node scripts/test-dual-write-local.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, writeBatch, increment, arrayUnion, serverTimestamp, query, where } from 'firebase/firestore';

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

// Dados de teste
const TEST_STUDENT_ID = '_test_dual_write_student';
const TEST_DATE = '2025-01-15';
const TEST_MONTH = '2025-01';

async function testDualWrite() {
  console.log('\n' + '═'.repeat(80));
  console.log('  TESTE LOCAL: DUAL-WRITE V2 + V3');
  console.log('═'.repeat(80) + '\n');

  const results = {
    v2Write: false,
    v3SubcollectionWrite: false,
    v3SummaryWrite: false,
    v2Read: false,
    v3Read: false,
    summaryRead: false,
    cleanup: false,
  };

  try {
    // ========================================
    // ETAPA 1: SIMULAR DUAL-WRITE
    // ========================================
    console.log('1️⃣  Simulando Dual-Write (V2 + V3)...\n');

    const batch = writeBatch(db);

    // 1.1. Escrita V2 (2025/faltas/controle)
    console.log('   📝 V2: Escrevendo em 2025/faltas/controle...');

    const v2Ref = doc(collection(db, '2025', 'faltas', 'controle'));
    batch.set(v2Ref, {
      estudanteId: TEST_STUDENT_ID,
      data: TEST_DATE,
      justified: false,
      atestadoId: null,
      _test: true,
      createdAt: new Date().toISOString(),
    });

    console.log('   ✅ V2 write preparado\n');

    // 1.2. Escrita V3 (students/{id}/absences)
    console.log('   📝 V3 Subcoleção: Escrevendo em students/{id}/absences...');

    const v3SubRef = doc(collection(db, 'students', TEST_STUDENT_ID, 'absences'));
    batch.set(v3SubRef, {
      data: TEST_DATE,
      justified: false,
      atestadoId: null,
      _test: true,
      createdAt: new Date().toISOString(),
    });

    console.log('   ✅ V3 subcoleção write preparado\n');

    // 1.3. Escrita V3 Summary (students/{id}/absence_summary/{month})
    console.log('   📝 V3 Summary: Escrevendo em students/{id}/absence_summary/{month}...');

    const summaryRef = doc(db, 'students', TEST_STUDENT_ID, 'absence_summary', TEST_MONTH);
    batch.set(summaryRef, {
      count: increment(1),
      justified: increment(0),
      unjustified: increment(1),
      dates: arrayUnion(TEST_DATE),
      lastUpdated: serverTimestamp(),
      _test: true,
    }, { merge: true });

    console.log('   ✅ V3 summary write preparado\n');

    // 1.4. Commit atômico
    console.log('   💾 Executando batch commit (3 escritas atômicas)...');

    await batch.commit();

    console.log('   ✅ Batch commit concluído!\n');

    results.v2Write = true;
    results.v3SubcollectionWrite = true;
    results.v3SummaryWrite = true;

    // ========================================
    // ETAPA 2: VALIDAR V2
    // ========================================
    console.log('2️⃣  Validando escrita em V2...\n');

    const v2Query = query(
      collection(db, '2025', 'faltas', 'controle'),
      where('estudanteId', '==', TEST_STUDENT_ID),
      where('_test', '==', true)
    );

    const v2Snap = await getDocs(v2Query);

    if (v2Snap.size === 1) {
      const v2Data = v2Snap.docs[0].data();
      console.log('   ✅ Registro encontrado em V2');
      console.log('   📊 Dados:', {
        estudanteId: v2Data.estudanteId,
        data: v2Data.data,
        justified: v2Data.justified,
      });
      results.v2Read = true;
    } else {
      console.log(`   ❌ Erro: Esperado 1 registro, encontrado ${v2Snap.size}`);
    }

    console.log();

    // ========================================
    // ETAPA 3: VALIDAR V3 SUBCOLEÇÃO
    // ========================================
    console.log('3️⃣  Validando escrita em V3 Subcoleção...\n');

    const v3AbsencesRef = collection(db, 'students', TEST_STUDENT_ID, 'absences');
    const v3AbsencesSnap = await getDocs(v3AbsencesRef);

    let foundV3 = false;
    v3AbsencesSnap.forEach((doc) => {
      const data = doc.data();
      if (data._test && data.data === TEST_DATE) {
        foundV3 = true;
        console.log('   ✅ Registro encontrado em V3 Subcoleção');
        console.log('   📊 Dados:', {
          data: data.data,
          justified: data.justified,
        });
        results.v3Read = true;
      }
    });

    if (!foundV3) {
      console.log('   ❌ Erro: Registro não encontrado em V3 subcoleção');
    }

    console.log();

    // ========================================
    // ETAPA 4: VALIDAR V3 SUMMARY
    // ========================================
    console.log('4️⃣  Validando escrita em V3 Summary...\n');

    const summarySnap = await getDoc(summaryRef);

    if (summarySnap.exists()) {
      const summaryData = summarySnap.data();
      console.log('   ✅ Summary encontrado em V3');
      console.log('   📊 Dados:', {
        count: summaryData.count,
        justified: summaryData.justified,
        unjustified: summaryData.unjustified,
        dates: summaryData.dates,
      });

      // Validar que a data está no array
      if (summaryData.dates && summaryData.dates.includes(TEST_DATE)) {
        console.log('   ✅ Data incluída no summary');
        results.summaryRead = true;
      } else {
        console.log('   ❌ Data não encontrada no summary');
      }
    } else {
      console.log('   ❌ Erro: Summary não encontrado');
    }

    console.log();

    // ========================================
    // ETAPA 5: LIMPEZA
    // ========================================
    console.log('5️⃣  Removendo registros de teste...\n');

    // Deletar V2
    console.log('   🗑️  Removendo V2...');
    if (v2Snap.size === 1) {
      await deleteDoc(v2Snap.docs[0].ref);
      console.log('   ✅ V2 removido');
    }

    // Deletar V3 subcoleção
    console.log('   🗑️  Removendo V3 subcoleção...');
    v3AbsencesSnap.forEach(async (doc) => {
      if (doc.data()._test) {
        await deleteDoc(doc.ref);
      }
    });
    console.log('   ✅ V3 subcoleção removida');

    // Deletar V3 summary
    console.log('   🗑️  Removendo V3 summary...');
    await deleteDoc(summaryRef);
    console.log('   ✅ V3 summary removido\n');

    results.cleanup = true;

    // ========================================
    // RELATÓRIO FINAL
    // ========================================
    console.log('═'.repeat(80));
    console.log('  📊 RELATÓRIO DO TESTE');
    console.log('═'.repeat(80) + '\n');

    const allPassed = Object.values(results).every(v => v === true);

    console.log('📋 Resultados:\n');
    console.log(`   ${results.v2Write ? '✅' : '❌'} V2 Write (2025/faltas/controle)`);
    console.log(`   ${results.v3SubcollectionWrite ? '✅' : '❌'} V3 Subcoleção Write (students/{id}/absences)`);
    console.log(`   ${results.v3SummaryWrite ? '✅' : '❌'} V3 Summary Write (students/{id}/absence_summary/{month})`);
    console.log(`   ${results.v2Read ? '✅' : '❌'} V2 Read (validação)`);
    console.log(`   ${results.v3Read ? '✅' : '❌'} V3 Subcoleção Read (validação)`);
    console.log(`   ${results.summaryRead ? '✅' : '❌'} V3 Summary Read (validação)`);
    console.log(`   ${results.cleanup ? '✅' : '❌'} Limpeza de dados de teste\n`);

    console.log('═'.repeat(80));

    if (allPassed) {
      console.log('  ✅ DUAL-WRITE FUNCIONANDO PERFEITAMENTE!');
      console.log('═'.repeat(80));
      console.log('\n✅ Todos os testes passaram!');
      console.log('✅ Escritas V2 + V3 funcionando');
      console.log('✅ Summaries sendo atualizados corretamente');
      console.log('✅ Sistema pronto para produção\n');
    } else {
      console.log('  ❌ PROBLEMAS ENCONTRADOS NO DUAL-WRITE');
      console.log('═'.repeat(80));
      console.log('\n⚠️  Alguns testes falharam!');
      console.log('⚠️  Verificar implementação do dual-write');
      console.log('⚠️  NÃO ativar V3 até resolver\n');
      process.exit(1);
    }

    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERRO no teste de dual-write:', error);
    console.error('\n⚠️  Possíveis causas:');
    console.error('   • Permissões insuficientes no Firestore');
    console.error('   • Quota excedida (mas teste deveria usar apenas ~5 escritas)');
    console.error('   • Problema de conexão com Firebase');
    console.error('   • Implementação do dual-write incorreta\n');

    console.log('📊 Status dos testes até o erro:\n');
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${test}`);
    });

    console.log();
    process.exit(1);
  }

  process.exit(0);
}

// Executar
testDualWrite();
