/**
 * FASE 4.1: TESTES AUTOMATIZADOS V3
 *
 * Valida estrutura e consistência V3:
 * 1. Testes de Integridade
 * 2. Testes de Performance
 * 3. Testes de Consistência V2 vs V3
 *
 * O QUE FAZ:
 * - Verifica se todos os estudantes têm subcoleções
 * - Valida summaries mensais
 * - Testa performance de queries
 * - Compara dados V2 vs V3
 *
 * Execução: node scripts/migration/06-automated-tests.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, query, where, collectionGroup } from 'firebase/firestore';

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

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  SINGLE_STUDENT_QUERY_MS: 100,  // Query de 1 estudante < 100ms
  API_SIMULATION_MS: 3000,        // Simulação API completa < 3s
  BATCH_QUERY_MS: 500,            // Query batch de 10 estudantes < 500ms
};

// Test results
const testResults = {
  integrity: {
    passed: 0,
    failed: 0,
    tests: [],
  },
  performance: {
    passed: 0,
    failed: 0,
    tests: [],
  },
  consistency: {
    passed: 0,
    failed: 0,
    tests: [],
  },
  timestamp: new Date().toISOString(),
};

/**
 * ========================================
 * 1. TESTES DE INTEGRIDADE
 * ========================================
 */
async function runIntegrityTests() {
  console.log('\n' + '═'.repeat(80));
  console.log('  1️⃣  TESTES DE INTEGRIDADE');
  console.log('═'.repeat(80) + '\n');

  try {
    // 1.1. Verificar se todos os estudantes têm subcoleção absences
    console.log('📋 Teste 1.1: Verificar subcoleções absences existem\n');

    const studentsRef = collection(db, 'students');
    const studentsSnap = await getDocs(studentsRef);

    let studentsWithAbsences = 0;
    let studentsWithoutAbsences = 0;
    const missingAbsences = [];

    for (const studentDoc of studentsSnap.docs) {
      const absencesRef = collection(db, 'students', studentDoc.id, 'absences');
      const absencesSnap = await getDocs(absencesRef);

      if (absencesSnap.size > 0) {
        studentsWithAbsences++;
      } else {
        studentsWithoutAbsences++;
        missingAbsences.push(studentDoc.id);
      }
    }

    const test1Result = {
      name: 'Subcoleções absences existem',
      passed: studentsWithoutAbsences === 0,
      details: {
        total: studentsSnap.size,
        withAbsences: studentsWithAbsences,
        withoutAbsences: studentsWithoutAbsences,
        missingList: missingAbsences.slice(0, 10), // Primeiros 10
      },
    };

    testResults.integrity.tests.push(test1Result);

    if (test1Result.passed) {
      testResults.integrity.passed++;
      console.log('   ✅ PASSOU: Todos os estudantes têm subcoleção absences');
    } else {
      testResults.integrity.failed++;
      console.log(`   ❌ FALHOU: ${studentsWithoutAbsences} estudantes sem subcoleção absences`);
      console.log(`   Exemplos: ${missingAbsences.slice(0, 5).join(', ')}`);
    }

    console.log(`   📊 ${studentsWithAbsences}/${studentsSnap.size} estudantes com faltas\n`);

    // 1.2. Verificar se summaries mensais existem
    console.log('📋 Teste 1.2: Verificar summaries mensais\n');

    const summaryRef = collectionGroup(db, 'absence_summary');
    const summarySnap = await getDocs(summaryRef);

    const monthsFound = new Set();
    let totalSummaries = 0;

    summarySnap.forEach((doc) => {
      if (!doc.data()._test) {
        totalSummaries++;
        monthsFound.add(doc.id); // ID do doc é o mês (ex: "2025-01")
      }
    });

    const test2Result = {
      name: 'Summaries mensais existem',
      passed: totalSummaries > 0 && monthsFound.size >= 1, // Pelo menos 1 mês
      details: {
        totalSummaries,
        uniqueMonths: monthsFound.size,
        months: Array.from(monthsFound).sort(),
      },
    };

    testResults.integrity.tests.push(test2Result);

    if (test2Result.passed) {
      testResults.integrity.passed++;
      console.log('   ✅ PASSOU: Summaries mensais encontrados');
      console.log(`   📊 ${totalSummaries} summaries em ${monthsFound.size} meses diferentes\n`);
    } else {
      testResults.integrity.failed++;
      console.log('   ❌ FALHOU: Nenhum summary mensal encontrado\n');
    }

    // 1.3. Verificar se counts em summaries batem com total de absences
    console.log('📋 Teste 1.3: Validar contagem em summaries\n');

    let summariesCorrect = 0;
    let summariesIncorrect = 0;
    const incorrectExamples = [];

    // Verificar uma amostra de 10 estudantes
    const sampleStudents = studentsSnap.docs.slice(0, 10);

    for (const studentDoc of sampleStudents) {
      const studentId = studentDoc.id;

      // Contar absences na subcoleção
      const absencesRef = collection(db, 'students', studentId, 'absences');
      const absencesSnap = await getDocs(absencesRef);
      const actualCount = absencesSnap.size;

      // Somar counts dos summaries
      const summaryRef = collection(db, 'students', studentId, 'absence_summary');
      const summarySnap = await getDocs(summaryRef);

      let summaryCount = 0;
      summarySnap.forEach((doc) => {
        summaryCount += doc.data().count || 0;
      });

      if (actualCount === summaryCount) {
        summariesCorrect++;
      } else {
        summariesIncorrect++;
        incorrectExamples.push({
          studentId,
          actual: actualCount,
          summary: summaryCount,
          diff: Math.abs(actualCount - summaryCount),
        });
      }
    }

    const test3Result = {
      name: 'Contagem em summaries está correta',
      passed: summariesIncorrect === 0,
      details: {
        sampleSize: sampleStudents.length,
        correct: summariesCorrect,
        incorrect: summariesIncorrect,
        examples: incorrectExamples,
      },
    };

    testResults.integrity.tests.push(test3Result);

    if (test3Result.passed) {
      testResults.integrity.passed++;
      console.log('   ✅ PASSOU: Contagens corretas em todos os summaries testados');
    } else {
      testResults.integrity.failed++;
      console.log(`   ❌ FALHOU: ${summariesIncorrect}/${sampleStudents.length} summaries com contagem incorreta`);
      console.log('   Exemplos:', JSON.stringify(incorrectExamples.slice(0, 3), null, 2));
    }

    console.log(`   📊 ${summariesCorrect}/${sampleStudents.length} summaries validados\n`);

  } catch (error) {
    console.error('❌ Erro nos testes de integridade:', error);
    testResults.integrity.failed++;
    testResults.integrity.tests.push({
      name: 'Testes de Integridade',
      passed: false,
      error: error.message,
    });
  }
}

/**
 * ========================================
 * 2. TESTES DE PERFORMANCE
 * ========================================
 */
async function runPerformanceTests() {
  console.log('\n' + '═'.repeat(80));
  console.log('  2️⃣  TESTES DE PERFORMANCE');
  console.log('═'.repeat(80) + '\n');

  try {
    // 2.1. Query de 1 estudante < 100ms
    console.log('⚡ Teste 2.1: Query de 1 estudante\n');

    const studentsRef = collection(db, 'students');
    const studentsSnap = await getDocs(studentsRef);

    if (studentsSnap.empty) {
      throw new Error('Nenhum estudante encontrado para teste');
    }

    const randomStudent = studentsSnap.docs[0];
    const studentId = randomStudent.id;

    const startTime = performance.now();
    const absencesRef = collection(db, 'students', studentId, 'absences');
    const absencesSnap = await getDocs(absencesRef);
    const endTime = performance.now();

    const queryTime = endTime - startTime;

    const test1Result = {
      name: 'Query de 1 estudante',
      passed: queryTime < PERFORMANCE_THRESHOLDS.SINGLE_STUDENT_QUERY_MS,
      details: {
        queryTimeMs: Math.round(queryTime),
        threshold: PERFORMANCE_THRESHOLDS.SINGLE_STUDENT_QUERY_MS,
        recordsReturned: absencesSnap.size,
      },
    };

    testResults.performance.tests.push(test1Result);

    if (test1Result.passed) {
      testResults.performance.passed++;
      console.log(`   ✅ PASSOU: Query em ${Math.round(queryTime)}ms (< ${PERFORMANCE_THRESHOLDS.SINGLE_STUDENT_QUERY_MS}ms)`);
    } else {
      testResults.performance.failed++;
      console.log(`   ❌ FALHOU: Query em ${Math.round(queryTime)}ms (> ${PERFORMANCE_THRESHOLDS.SINGLE_STUDENT_QUERY_MS}ms)`);
    }

    console.log(`   📊 ${absencesSnap.size} registros retornados\n`);

    // 2.2. Query batch de 10 estudantes < 500ms
    console.log('⚡ Teste 2.2: Query batch de 10 estudantes\n');

    const batchStudents = studentsSnap.docs.slice(0, 10);
    const batchStartTime = performance.now();

    const batchPromises = batchStudents.map(async (studentDoc) => {
      const absencesRef = collection(db, 'students', studentDoc.id, 'absences');
      return await getDocs(absencesRef);
    });

    const batchResults = await Promise.all(batchPromises);
    const batchEndTime = performance.now();

    const batchQueryTime = batchEndTime - batchStartTime;
    const totalRecords = batchResults.reduce((sum, snap) => sum + snap.size, 0);

    const test2Result = {
      name: 'Query batch de 10 estudantes',
      passed: batchQueryTime < PERFORMANCE_THRESHOLDS.BATCH_QUERY_MS,
      details: {
        queryTimeMs: Math.round(batchQueryTime),
        threshold: PERFORMANCE_THRESHOLDS.BATCH_QUERY_MS,
        studentsQueried: batchStudents.length,
        totalRecords,
      },
    };

    testResults.performance.tests.push(test2Result);

    if (test2Result.passed) {
      testResults.performance.passed++;
      console.log(`   ✅ PASSOU: Batch query em ${Math.round(batchQueryTime)}ms (< ${PERFORMANCE_THRESHOLDS.BATCH_QUERY_MS}ms)`);
    } else {
      testResults.performance.failed++;
      console.log(`   ❌ FALHOU: Batch query em ${Math.round(batchQueryTime)}ms (> ${PERFORMANCE_THRESHOLDS.BATCH_QUERY_MS}ms)`);
    }

    console.log(`   📊 ${totalRecords} registros de ${batchStudents.length} estudantes\n`);

    // 2.3. Simulação API completa < 3s
    console.log('⚡ Teste 2.3: Simulação API completa (GET /api/students/consecutive-absences)\n');

    const apiStartTime = performance.now();

    // Simular query da API: pegar todos os estudantes e suas faltas
    const allStudentsRef = collection(db, 'students');
    const allStudentsSnap = await getDocs(allStudentsRef);

    // Para cada estudante, pegar summary (mais rápido que absences individuais)
    const apiPromises = allStudentsSnap.docs.map(async (studentDoc) => {
      const summaryRef = collection(db, 'students', studentDoc.id, 'absence_summary');
      return await getDocs(summaryRef);
    });

    await Promise.all(apiPromises);
    const apiEndTime = performance.now();

    const apiTime = apiEndTime - apiStartTime;

    const test3Result = {
      name: 'Simulação API completa',
      passed: apiTime < PERFORMANCE_THRESHOLDS.API_SIMULATION_MS,
      details: {
        queryTimeMs: Math.round(apiTime),
        threshold: PERFORMANCE_THRESHOLDS.API_SIMULATION_MS,
        studentsProcessed: allStudentsSnap.size,
      },
    };

    testResults.performance.tests.push(test3Result);

    if (test3Result.passed) {
      testResults.performance.passed++;
      console.log(`   ✅ PASSOU: API simulada em ${Math.round(apiTime)}ms (< ${PERFORMANCE_THRESHOLDS.API_SIMULATION_MS}ms)`);
    } else {
      testResults.performance.failed++;
      console.log(`   ❌ FALHOU: API simulada em ${Math.round(apiTime)}ms (> ${PERFORMANCE_THRESHOLDS.API_SIMULATION_MS}ms)`);
    }

    console.log(`   📊 ${allStudentsSnap.size} estudantes processados\n`);

  } catch (error) {
    console.error('❌ Erro nos testes de performance:', error);
    testResults.performance.failed++;
    testResults.performance.tests.push({
      name: 'Testes de Performance',
      passed: false,
      error: error.message,
    });
  }
}

/**
 * ========================================
 * 3. TESTES DE CONSISTÊNCIA V2 vs V3
 * ========================================
 */
async function runConsistencyTests() {
  console.log('\n' + '═'.repeat(80));
  console.log('  3️⃣  TESTES DE CONSISTÊNCIA V2 vs V3');
  console.log('═'.repeat(80) + '\n');

  try {
    // 3.1. Comparar contagem total V2 vs V3
    console.log('🔄 Teste 3.1: Contagem total V2 vs V3\n');

    // V2: 2025/faltas/controle
    const v2Ref = collection(db, '2025', 'faltas', 'controle');
    const v2Snap = await getDocs(v2Ref);
    const v2Total = v2Snap.size;

    // V3: collectionGroup absences
    const v3Ref = collectionGroup(db, 'absences');
    const v3Snap = await getDocs(v3Ref);

    let v3Total = 0;
    v3Snap.forEach((doc) => {
      const path = doc.ref.path;
      if (path.startsWith('students/') && path.includes('/absences/')) {
        v3Total++;
      }
    });

    const discrepancy = Math.abs(v2Total - v3Total);
    const discrepancyPercent = v2Total > 0 ? (discrepancy / v2Total) * 100 : 0;

    const test1Result = {
      name: 'Contagem total V2 vs V3',
      passed: discrepancyPercent <= 1, // Aceitar até 1% de diferença
      details: {
        v2Total,
        v3Total,
        discrepancy,
        discrepancyPercent: discrepancyPercent.toFixed(2),
      },
    };

    testResults.consistency.tests.push(test1Result);

    if (test1Result.passed) {
      testResults.consistency.passed++;
      console.log(`   ✅ PASSOU: Contagem V2 vs V3 consistente (${discrepancyPercent.toFixed(2)}% diferença)`);
    } else {
      testResults.consistency.failed++;
      console.log(`   ❌ FALHOU: Discrepância de ${discrepancyPercent.toFixed(2)}% entre V2 e V3`);
    }

    console.log(`   📊 V2: ${v2Total} | V3: ${v3Total} | Diferença: ${discrepancy}\n`);

    // 3.2. Verificar dados idênticos em amostra
    console.log('🔄 Teste 3.2: Dados idênticos em amostra (5 estudantes)\n');

    const studentsRef = collection(db, 'students');
    const studentsSnap = await getDocs(studentsRef);

    const sampleStudents = studentsSnap.docs.slice(0, 5);
    let identicalCount = 0;
    let differentCount = 0;
    const differences = [];

    for (const studentDoc of sampleStudents) {
      const studentId = studentDoc.id;

      // V2: Query por estudanteId
      const v2Query = query(
        collection(db, '2025', 'faltas', 'controle'),
        where('estudanteId', '==', studentId)
      );
      const v2StudentSnap = await getDocs(v2Query);
      const v2Dates = new Set();
      v2StudentSnap.forEach((doc) => {
        v2Dates.add(doc.data().data);
      });

      // V3: Subcoleção absences
      const v3AbsencesRef = collection(db, 'students', studentId, 'absences');
      const v3AbsencesSnap = await getDocs(v3AbsencesRef);
      const v3Dates = new Set();
      v3AbsencesSnap.forEach((doc) => {
        v3Dates.add(doc.data().data);
      });

      // Comparar sets
      const v2Only = [...v2Dates].filter(d => !v3Dates.has(d));
      const v3Only = [...v3Dates].filter(d => !v2Dates.has(d));

      if (v2Only.length === 0 && v3Only.length === 0) {
        identicalCount++;
      } else {
        differentCount++;
        differences.push({
          studentId,
          v2Count: v2Dates.size,
          v3Count: v3Dates.size,
          v2Only: v2Only.slice(0, 3),
          v3Only: v3Only.slice(0, 3),
        });
      }
    }

    const test2Result = {
      name: 'Dados idênticos em amostra',
      passed: differentCount === 0,
      details: {
        sampleSize: sampleStudents.length,
        identical: identicalCount,
        different: differentCount,
        differences: differences,
      },
    };

    testResults.consistency.tests.push(test2Result);

    if (test2Result.passed) {
      testResults.consistency.passed++;
      console.log(`   ✅ PASSOU: Todos os ${sampleStudents.length} estudantes têm dados idênticos V2/V3`);
    } else {
      testResults.consistency.failed++;
      console.log(`   ❌ FALHOU: ${differentCount}/${sampleStudents.length} estudantes com diferenças V2/V3`);
      console.log('   Diferenças:', JSON.stringify(differences, null, 2));
    }

    console.log(`   📊 ${identicalCount}/${sampleStudents.length} estudantes consistentes\n`);

  } catch (error) {
    console.error('❌ Erro nos testes de consistência:', error);
    testResults.consistency.failed++;
    testResults.consistency.tests.push({
      name: 'Testes de Consistência',
      passed: false,
      error: error.message,
    });
  }
}

/**
 * ========================================
 * MAIN - EXECUTAR TODOS OS TESTES
 * ========================================
 */
async function runAllTests() {
  console.log('\n' + '═'.repeat(80));
  console.log('  TESTES AUTOMATIZADOS V3 - VALIDAÇÃO COMPLETA');
  console.log('═'.repeat(80));

  const startTime = performance.now();

  // Executar testes
  await runIntegrityTests();
  await runPerformanceTests();
  await runConsistencyTests();

  const endTime = performance.now();
  const totalTime = endTime - startTime;

  // Relatório final
  console.log('\n' + '═'.repeat(80));
  console.log('  📊 RELATÓRIO FINAL');
  console.log('═'.repeat(80) + '\n');

  const totalPassed =
    testResults.integrity.passed +
    testResults.performance.passed +
    testResults.consistency.passed;

  const totalFailed =
    testResults.integrity.failed +
    testResults.performance.failed +
    testResults.consistency.failed;

  const totalTests = totalPassed + totalFailed;

  console.log('📈 Resumo por Categoria:\n');
  console.log(`   Integridade:   ${testResults.integrity.passed}/${testResults.integrity.passed + testResults.integrity.failed} ✅`);
  console.log(`   Performance:   ${testResults.performance.passed}/${testResults.performance.passed + testResults.performance.failed} ⚡`);
  console.log(`   Consistência:  ${testResults.consistency.passed}/${testResults.consistency.passed + testResults.consistency.failed} 🔄\n`);

  console.log('📊 Totais:\n');
  console.log(`   Total de Testes: ${totalTests}`);
  console.log(`   ✅ Passaram:     ${totalPassed}`);
  console.log(`   ❌ Falharam:     ${totalFailed}`);
  console.log(`   ⏱️  Tempo Total:  ${Math.round(totalTime)}ms\n`);

  // Salvar relatório
  const report = {
    ...testResults,
    summary: {
      totalTests,
      totalPassed,
      totalFailed,
      successRate: ((totalPassed / totalTests) * 100).toFixed(2) + '%',
      totalTimeMs: Math.round(totalTime),
    },
    executedAt: new Date().toISOString(),
  };

  const fs = await import('fs');
  const reportPath = 'backups/automated-tests-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('═'.repeat(80));
  console.log(`📄 Relatório salvo em: ${reportPath}`);
  console.log('═'.repeat(80) + '\n');

  // Exit code
  const allPassed = totalFailed === 0;

  if (allPassed) {
    console.log('✅ TODOS OS TESTES PASSARAM! Sistema V3 validado.\n');
    process.exit(0);
  } else {
    console.log('❌ ALGUNS TESTES FALHARAM. Revisar antes de ativar V3.\n');
    process.exit(1);
  }
}

// Executar
runAllTests();
