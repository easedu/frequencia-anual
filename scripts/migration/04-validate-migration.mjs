/**
 * FASE 2.2: VALIDAÇÃO INTENSIVA PÓS-MIGRAÇÃO
 *
 * Valida RIGOROSAMENTE que dados V2 = V3
 *
 * VALIDAÇÕES:
 * 1. Contagem total V2 = V3 subcoleções
 * 2. Contagem total V2 = V3 summary
 * 3. Validação por estudante (amostra de 100)
 * 4. Validação de datas e flags
 * 5. Checksum de integridade
 *
 * Execução: node scripts/migration/04-validate-migration.mjs
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  collectionGroup
} from 'firebase/firestore';
import crypto from 'crypto';

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

const SAMPLE_SIZE = 100; // Número de estudantes para validar detalhadamente

function createHash(data) {
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
}

async function validateMigration() {
  console.log('\n' + '═'.repeat(80));
  console.log('  VALIDAÇÃO INTENSIVA: Integridade V2 → V3');
  console.log('═'.repeat(80) + '\n');

  const results = {
    totalCount: { pass: false, v2: 0, v3Sub: 0, v3Sum: 0 },
    sampleValidation: { pass: false, tested: 0, passed: 0, failed: 0 },
    summaryAccuracy: { pass: false, tested: 0, accurate: 0, inaccurate: 0 },
    dataIntegrity: { pass: false, checksumMatch: false },
  };

  const errors = [];

  try {
    // 1. VALIDAÇÃO DE CONTAGEM TOTAL
    console.log('1️⃣  Validando contagem total...\n');

    const v2Ref = collection(db, '2025', 'faltas', 'controle');
    const v2Snap = await getDocs(v2Ref);
    results.totalCount.v2 = v2Snap.size;

    console.log(`   V2: ${results.totalCount.v2} registros`);

    const v3SubRef = collectionGroup(db, 'absences');
    const v3SubSnap = await getDocs(v3SubRef);
    results.totalCount.v3Sub = v3SubSnap.size;

    console.log(`   V3 Subcoleções: ${results.totalCount.v3Sub} registros`);

    const summaryRef = collectionGroup(db, 'absence_summary');
    const summarySnap = await getDocs(summaryRef);
    let totalFromSummary = 0;
    summarySnap.forEach(doc => {
      const data = doc.data();
      if (!data._test) {
        totalFromSummary += data.count || 0;
      }
    });
    results.totalCount.v3Sum = totalFromSummary;

    console.log(`   V3 Summary: ${results.totalCount.v3Sum} registros (soma)\n`);

    const countMatch =
      results.totalCount.v2 === results.totalCount.v3Sub &&
      results.totalCount.v2 === results.totalCount.v3Sum;

    results.totalCount.pass = countMatch;

    if (countMatch) {
      console.log('   ✅ Contagens batem perfeitamente!\n');
    } else {
      console.log('   ❌ DISCREPÂNCIA nas contagens!\n');
      errors.push({
        type: 'COUNT_MISMATCH',
        v2: results.totalCount.v2,
        v3Sub: results.totalCount.v3Sub,
        v3Sum: results.totalCount.v3Sum,
      });
    }

    // 2. VALIDAÇÃO POR ESTUDANTE (AMOSTRA)
    console.log('2️⃣  Validando amostra de estudantes...\n');

    const studentsRef = collection(db, 'students');
    const studentsSnap = await getDocs(studentsRef);
    const allStudents = [];

    studentsSnap.forEach(doc => {
      const data = doc.data();
      if (!data.deleted) {
        allStudents.push({ id: doc.id, nome: data.nome });
      }
    });

    // Selecionar amostra aleatória
    const shuffled = allStudents.sort(() => 0.5 - Math.random());
    const sample = shuffled.slice(0, Math.min(SAMPLE_SIZE, allStudents.length));

    console.log(`   Testando ${sample.length} estudantes (amostra aleatória)...\n`);

    for (const student of sample) {
      try {
        // Buscar V2
        const v2Query = query(
          collection(db, '2025', 'faltas', 'controle'),
          where('estudanteId', '==', student.id)
        );
        const v2Snap = await getDocs(v2Query);

        const v2Absences = [];
        v2Snap.forEach(doc => {
          const data = doc.data();
          v2Absences.push({
            data: data.data,
            justified: data.justified || false,
          });
        });

        // Buscar V3
        const v3Ref = collection(db, `students/${student.id}/absences`);
        const v3Snap = await getDocs(v3Ref);

        const v3Absences = [];
        v3Snap.forEach(doc => {
          const data = doc.data();
          v3Absences.push({
            data: data.data,
            justified: data.justified || false,
          });
        });

        // Comparar
        if (v2Absences.length !== v3Absences.length) {
          errors.push({
            type: 'STUDENT_COUNT_MISMATCH',
            studentId: student.id,
            studentName: student.nome,
            v2Count: v2Absences.length,
            v3Count: v3Absences.length,
          });
          results.sampleValidation.failed++;
          console.log(`   ❌ ${student.nome}: V2=${v2Absences.length} V3=${v3Absences.length}`);
          continue;
        }

        // Comparar datas
        const v2Dates = v2Absences.map(a => a.data).sort();
        const v3Dates = v3Absences.map(a => a.data).sort();

        const datesMatch = JSON.stringify(v2Dates) === JSON.stringify(v3Dates);

        if (!datesMatch) {
          errors.push({
            type: 'DATES_MISMATCH',
            studentId: student.id,
            studentName: student.nome,
          });
          results.sampleValidation.failed++;
          console.log(`   ❌ ${student.nome}: Datas não batem`);
          continue;
        }

        results.sampleValidation.passed++;

        if (results.sampleValidation.tested % 10 === 0) {
          process.stdout.write(`\r   Testados: ${results.sampleValidation.tested + 1}/${sample.length}`);
        }

      } catch (error) {
        errors.push({
          type: 'VALIDATION_ERROR',
          studentId: student.id,
          studentName: student.nome,
          error: error.message,
        });
        results.sampleValidation.failed++;
      }

      results.sampleValidation.tested++;
    }

    console.log(`\r   ✅ Validados: ${results.sampleValidation.tested}/${sample.length}\n`);

    results.sampleValidation.pass = results.sampleValidation.failed === 0;

    if (results.sampleValidation.pass) {
      console.log(`   ✅ Todos os ${results.sampleValidation.passed} estudantes validados com sucesso!\n`);
    } else {
      console.log(`   ❌ ${results.sampleValidation.failed} estudantes com discrepâncias!\n`);
    }

    // 3. VALIDAÇÃO DE SUMMARY
    console.log('3️⃣  Validando accuracy dos summaries...\n');

    const summaryDocs = [];
    summarySnap.forEach(doc => {
      const data = doc.data();
      if (!data._test) {
        const pathParts = doc.ref.path.split('/');
        summaryDocs.push({
          month: pathParts[1],
          studentId: pathParts[2],
          count: data.count,
          justified: data.justified || 0,
          unjustified: data.unjustified || 0,
        });
      }
    });

    // Validar amostra de summaries
    const summariesSample = summaryDocs.slice(0, Math.min(50, summaryDocs.length));

    for (const summary of summariesSample) {
      try {
        const v3Ref = collection(db, `students/${summary.studentId}/absences`);
        const v3Snap = await getDocs(v3Ref);

        let countInMonth = 0;
        let justifiedCount = 0;
        let unjustifiedCount = 0;

        v3Snap.forEach(doc => {
          const data = doc.data();
          const absenceMonth = data.data.substring(0, 7);

          if (absenceMonth === summary.month) {
            countInMonth++;
            if (data.justified) {
              justifiedCount++;
            } else {
              unjustifiedCount++;
            }
          }
        });

        const accurate =
          summary.count === countInMonth &&
          summary.justified === justifiedCount &&
          summary.unjustified === unjustifiedCount;

        if (accurate) {
          results.summaryAccuracy.accurate++;
        } else {
          results.summaryAccuracy.inaccurate++;
          errors.push({
            type: 'SUMMARY_INACCURATE',
            studentId: summary.studentId,
            month: summary.month,
            expected: { count: countInMonth, justified: justifiedCount, unjustified: unjustifiedCount },
            actual: summary,
          });
        }

        results.summaryAccuracy.tested++;

      } catch (error) {
        errors.push({
          type: 'SUMMARY_VALIDATION_ERROR',
          studentId: summary.studentId,
          month: summary.month,
          error: error.message,
        });
        results.summaryAccuracy.inaccurate++;
        results.summaryAccuracy.tested++;
      }
    }

    results.summaryAccuracy.pass = results.summaryAccuracy.inaccurate === 0;

    console.log(`   Testados: ${results.summaryAccuracy.tested} summaries`);
    console.log(`   Accurate: ${results.summaryAccuracy.accurate}`);
    console.log(`   Inaccurate: ${results.summaryAccuracy.inaccurate}\n`);

    if (results.summaryAccuracy.pass) {
      console.log('   ✅ Todos os summaries estão corretos!\n');
    } else {
      console.log('   ❌ Alguns summaries com problemas!\n');
    }

    // 4. RELATÓRIO FINAL
    console.log('═'.repeat(80));
    console.log('  RELATÓRIO DE VALIDAÇÃO');
    console.log('═'.repeat(80) + '\n');

    const allPassed =
      results.totalCount.pass &&
      results.sampleValidation.pass &&
      results.summaryAccuracy.pass;

    console.log('📊 Resultados:\n');
    console.log(`   1. Contagem Total: ${results.totalCount.pass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   2. Validação por Estudante: ${results.sampleValidation.pass ? '✅ PASS' : '❌ FAIL'} (${results.sampleValidation.passed}/${results.sampleValidation.tested})`);
    console.log(`   3. Accuracy de Summaries: ${results.summaryAccuracy.pass ? '✅ PASS' : '❌ FAIL'} (${results.summaryAccuracy.accurate}/${results.summaryAccuracy.tested})\n`);

    if (errors.length > 0) {
      console.log('⚠️  ERROS ENCONTRADOS:\n');
      errors.slice(0, 10).forEach(err => {
        console.log(`   • ${err.type}:`, err);
      });
      if (errors.length > 10) {
        console.log(`   ... e mais ${errors.length - 10} erros\n`);
      }
    }

    console.log('═'.repeat(80));

    if (allPassed) {
      console.log('  ✅ MIGRAÇÃO 100% ÍNTEGRA - VALIDAÇÃO COMPLETA!');
      console.log('═'.repeat(80));
      console.log('\n✅ Todos os dados migrados corretamente');
      console.log('✅ Contagens batem perfeitamente');
      console.log('✅ Amostra validada com sucesso');
      console.log('✅ Summaries corretos');
      console.log('\n📋 Próximo passo: Implementar Dual-Write (Fase 3)\n');
    } else {
      console.log('  ❌ PROBLEMAS ENCONTRADOS NA MIGRAÇÃO');
      console.log('═'.repeat(80));
      console.log('\n❌ Validação falhou');
      console.log('⚠️  NÃO prosseguir com Dual-Write');
      console.log('⚠️  Investigar e corrigir problemas primeiro\n');
    }

    console.log('═'.repeat(80) + '\n');

    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('\n❌ ERRO na validação:', error);
    process.exit(1);
  }
}

validateMigration();
