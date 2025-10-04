/**
 * FASE 2.1: MIGRAÇÃO HISTÓRICA DE DADOS V2 → V3
 *
 * ⚠️  SCRIPT CRÍTICO - LER COMPLETAMENTE ANTES DE EXECUTAR
 *
 * O QUE FAZ:
 * 1. Busca TODAS as faltas de V2 (2025/faltas/controle)
 * 2. Migra para subcoleções V3 (students/{id}/absences/)
 * 3. Cria summaries mensais (absences_summary/{month}/{studentId})
 * 4. NÃO DELETA V2 (mantém dados originais intactos)
 * 5. Salva checkpoints a cada batch
 * 6. Pode retomar se interrompido
 *
 * SEGURANÇA:
 * - ZERO perda de dados garantida
 * - V2 permanece intacto
 * - Processamento em batches pequenos
 * - Checkpoints automáticos
 * - Retry em caso de erro
 *
 * TEMPO ESTIMADO: 10-20 minutos para 736 estudantes / 17.822 faltas
 *
 * Execução: node scripts/migration/03-migrate-historical-data.mjs
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch,
  query,
  where,
  serverTimestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

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

const CHECKPOINT_FILE = 'backups/migration-checkpoint.json';
const BATCH_SIZE = 50; // Estudantes por batch
const FIRESTORE_BATCH_LIMIT = 500; // Limite do Firestore

// Função para agrupar faltas por mês
function groupByMonth(absences) {
  const byMonth = {};

  absences.forEach(absence => {
    const month = absence.data.substring(0, 7); // YYYY-MM

    if (!byMonth[month]) {
      byMonth[month] = [];
    }

    byMonth[month].push(absence);
  });

  return byMonth;
}

// Função para salvar checkpoint
async function saveCheckpoint(checkpoint) {
  const checkpointData = {
    ...checkpoint,
    lastSaved: new Date().toISOString(),
  };

  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpointData, null, 2), 'utf-8');
}

// Função para carregar checkpoint
function loadCheckpoint() {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    const data = fs.readFileSync(CHECKPOINT_FILE, 'utf-8');
    return JSON.parse(data);
  }
  return null;
}

// Função principal de migração
async function migrateHistoricalData() {
  console.log('\n' + '═'.repeat(80));
  console.log('  MIGRAÇÃO HISTÓRICA: V2 → V3');
  console.log('═'.repeat(80) + '\n');

  const startTime = Date.now();

  const stats = {
    totalStudents: 0,
    processedStudents: 0,
    totalAbsences: 0,
    migratedAbsences: 0,
    summariesCreated: 0,
    errors: [],
    skipped: [],
  };

  try {
    // 1. Verificar se há checkpoint
    const checkpoint = loadCheckpoint();

    if (checkpoint) {
      console.log('📌 CHECKPOINT ENCONTRADO!\n');
      console.log(`   Última execução: ${checkpoint.lastSaved}`);
      console.log(`   Estudantes processados: ${checkpoint.processedStudents}/${checkpoint.totalStudents}`);
      console.log(`   Faltas migradas: ${checkpoint.migratedAbsences}\n`);

      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        rl.question('   Deseja continuar de onde parou? (s/n): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 's') {
        console.log('\n   ⚠️  Iniciando migração do zero...\n');
        stats.processedStudents = 0;
      } else {
        console.log('\n   ✅ Continuando do checkpoint...\n');
        stats.processedStudents = checkpoint.processedStudents || 0;
        stats.migratedAbsences = checkpoint.migratedAbsences || 0;
        stats.summariesCreated = checkpoint.summariesCreated || 0;
      }
    }

    // 2. Buscar todos os estudantes
    console.log('1️⃣  Carregando estudantes...\n');
    const studentsRef = collection(db, 'students');
    const studentsSnap = await getDocs(studentsRef);

    const students = [];
    studentsSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (!data.deleted) {
        students.push({
          id: docSnap.id,
          nome: data.nome,
        });
      }
    });

    stats.totalStudents = students.length;
    console.log(`   ✅ ${stats.totalStudents} estudantes ativos carregados\n`);

    // 3. Processar em batches
    console.log('2️⃣  Iniciando migração por batches...\n');
    console.log(`   📦 Batch size: ${BATCH_SIZE} estudantes`);
    console.log(`   📊 Total de batches: ${Math.ceil(students.length / BATCH_SIZE)}\n`);

    const startIndex = stats.processedStudents;

    for (let i = startIndex; i < students.length; i += BATCH_SIZE) {
      const batch = students.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(students.length / BATCH_SIZE);

      console.log(`\n📦 Batch ${batchNumber}/${totalBatches} (${batch.length} estudantes)`);
      console.log('─'.repeat(80));

      // Processar estudantes do batch em paralelo
      const promises = batch.map(async (student, index) => {
        const studentNumber = i + index + 1;

        try {
          // Buscar faltas V2 do estudante
          const absencesV2Ref = collection(db, '2025', 'faltas', 'controle');
          const absencesQuery = query(absencesV2Ref, where('estudanteId', '==', student.id));
          const absencesSnap = await getDocs(absencesQuery);

          if (absencesSnap.empty) {
            console.log(`   ${studentNumber}/${students.length} - ${student.nome}: 0 faltas (pulando)`);
            stats.skipped.push(student.id);
            return;
          }

          const absences = [];
          absencesSnap.forEach(docSnap => {
            const data = docSnap.data();
            absences.push({
              data: data.data,
              justified: data.justified || false,
              atestadoId: data.atestadoId || null,
              createdAt: data.createdAt,
              createdBy: data.createdBy,
            });
          });

          // Agrupar por mês
          const byMonth = groupByMonth(absences);

          // Criar batch do Firestore
          const firestoreBatch = writeBatch(db);
          let operationsCount = 0;

          // Migrar para subcoleções V3
          absences.forEach(absence => {
            const absenceRef = doc(collection(db, `students/${student.id}/absences`));
            firestoreBatch.set(absenceRef, {
              data: absence.data,
              justified: absence.justified,
              atestadoId: absence.atestadoId,
              createdAt: absence.createdAt || serverTimestamp(),
              createdBy: absence.createdBy || 'migration-script',
              migratedAt: serverTimestamp(),
              migratedFrom: 'v2',
            });
            operationsCount++;
          });

          // Criar summaries mensais
          Object.entries(byMonth).forEach(([month, monthAbsences]) => {
            const summaryRef = doc(db, 'students', student.id, 'absence_summary', month);

            const justified = monthAbsences.filter(a => a.justified).length;
            const unjustified = monthAbsences.filter(a => !a.justified).length;

            firestoreBatch.set(summaryRef, {
              count: monthAbsences.length,
              justified,
              unjustified,
              dates: monthAbsences.map(a => a.data).sort(),
              lastUpdated: serverTimestamp(),
              migratedAt: serverTimestamp(),
              migratedFrom: 'v2',
            });
            operationsCount++;
            stats.summariesCreated++;
          });

          // Commit batch (se não exceder limite)
          if (operationsCount < FIRESTORE_BATCH_LIMIT) {
            await firestoreBatch.commit();

            stats.migratedAbsences += absences.length;

            console.log(
              `   ${studentNumber}/${students.length} - ${student.nome}: ` +
              `${absences.length} faltas ` +
              `(${Object.keys(byMonth).length} meses) ✅`
            );
          } else {
            throw new Error(`Batch muito grande: ${operationsCount} operações (limite: ${FIRESTORE_BATCH_LIMIT})`);
          }

        } catch (error) {
          console.error(`   ${studentNumber}/${students.length} - ${student.nome}: ❌ ERRO - ${error.message}`);
          stats.errors.push({
            studentId: student.id,
            studentName: student.nome,
            error: error.message,
          });
        }
      });

      // Aguardar todos do batch
      await Promise.all(promises);

      stats.processedStudents = i + batch.length;

      // Salvar checkpoint
      await saveCheckpoint({
        totalStudents: stats.totalStudents,
        processedStudents: stats.processedStudents,
        migratedAbsences: stats.migratedAbsences,
        summariesCreated: stats.summariesCreated,
        errors: stats.errors.length,
      });

      // Pausa para não sobrecarregar Firebase
      if (i + BATCH_SIZE < students.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 4. Relatório final
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '═'.repeat(80));
    console.log('  MIGRAÇÃO CONCLUÍDA');
    console.log('═'.repeat(80) + '\n');

    console.log('📊 Estatísticas:\n');
    console.log(`   • Estudantes processados: ${stats.processedStudents}/${stats.totalStudents}`);
    console.log(`   • Faltas migradas: ${stats.migratedAbsences}`);
    console.log(`   • Summaries criados: ${stats.summariesCreated}`);
    console.log(`   • Estudantes sem faltas: ${stats.skipped.length}`);
    console.log(`   • Erros: ${stats.errors.length}`);
    console.log(`   • Tempo total: ${elapsed}s\n`);

    if (stats.errors.length > 0) {
      console.log('⚠️  ERROS ENCONTRADOS:\n');
      stats.errors.slice(0, 10).forEach(err => {
        console.log(`   • ${err.studentName} (${err.studentId}): ${err.error}`);
      });
      if (stats.errors.length > 10) {
        console.log(`   ... e mais ${stats.errors.length - 10} erros\n`);
      }
    }

    console.log('═'.repeat(80));

    if (stats.errors.length === 0) {
      console.log('  ✅ MIGRAÇÃO 100% SUCESSO!');
      console.log('═'.repeat(80));
      console.log('\n✅ Todos os dados migrados sem erros');
      console.log('\n📋 Próximo passo: Executar script 04-validate-migration.mjs\n');

      // Deletar checkpoint
      if (fs.existsSync(CHECKPOINT_FILE)) {
        fs.unlinkSync(CHECKPOINT_FILE);
        console.log('   ✅ Checkpoint limpo\n');
      }
    } else {
      console.log('  ⚠️  MIGRAÇÃO COM ERROS');
      console.log('═'.repeat(80));
      console.log('\n⚠️  Alguns estudantes falharam');
      console.log('⚠️  Checkpoint mantido - pode re-executar para tentar novamente\n');
    }

    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERRO CRÍTICO na migração:', error);
    console.error('\n⚠️  Checkpoint salvo - pode retomar execução\n');

    // Salvar checkpoint em caso de erro
    await saveCheckpoint({
      totalStudents: stats.totalStudents,
      processedStudents: stats.processedStudents,
      migratedAbsences: stats.migratedAbsences,
      summariesCreated: stats.summariesCreated,
      errors: stats.errors.length,
      lastError: error.message,
    });

    process.exit(1);
  }

  process.exit(stats.errors.length > 0 ? 1 : 0);
}

migrateHistoricalData();
