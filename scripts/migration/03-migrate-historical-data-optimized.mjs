/**
 * FASE 2.1: MIGRAÇÃO HISTÓRICA DE DADOS V2 → V3 (OPTIMIZED)
 *
 * Versão otimizada com rate limiting para evitar quota exceeded
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
} from 'firebase/firestore';
import fs from 'fs';

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
const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES = 3000;
const FIRESTORE_BATCH_LIMIT = 500;
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function groupByMonth(absences) {
  const byMonth = {};
  absences.forEach(absence => {
    const month = absence.data.substring(0, 7);
    if (!byMonth[month]) {
      byMonth[month] = [];
    }
    byMonth[month].push(absence);
  });
  return byMonth;
}

async function saveCheckpoint(checkpoint) {
  const checkpointData = {
    ...checkpoint,
    lastSaved: new Date().toISOString(),
  };
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpointData, null, 2), 'utf-8');
}

function loadCheckpoint() {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    const data = fs.readFileSync(CHECKPOINT_FILE, 'utf-8');
    return JSON.parse(data);
  }
  return null;
}

async function migrateStudentWithRetry(student, studentNumber, totalStudents, retryCount = 0) {
  try {
    const absencesV2Ref = collection(db, '2025', 'faltas', 'controle');
    const absencesQuery = query(absencesV2Ref, where('estudanteId', '==', student.id));
    const absencesSnap = await getDocs(absencesQuery);

    if (absencesSnap.empty) {
      return { success: true, count: 0, summaries: 0, skipped: true };
    }

    const absences = [];
    absencesSnap.forEach(docSnap => {
      const data = docSnap.data();
      absences.push({
        data: data.data || '',
        justified: data.justified || false,
        atestadoId: data.atestadoId || null,
        createdAt: data.createdAt,
        createdBy: data.createdBy,
      });
    });

    const byMonth = groupByMonth(absences);
    const firestoreBatch = writeBatch(db);
    let operationsCount = 0;

    absences.forEach(absence => {
      const absenceRef = doc(collection(db, 'students/' + student.id + '/absences'));
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
    });

    if (operationsCount < FIRESTORE_BATCH_LIMIT) {
      await firestoreBatch.commit();
      const monthKeys = Object.keys(byMonth);
      console.log(
        '   ' + studentNumber + '/' + totalStudents + ' - ' + student.nome + ': ' +
        absences.length + ' faltas (' + monthKeys.length + ' meses) ✅'
      );
      return {
        success: true,
        count: absences.length,
        summaries: monthKeys.length,
        skipped: false,
      };
    } else {
      throw new Error('Batch excede limite: ' + operationsCount + ' operações');
    }

  } catch (error) {
    if (retryCount < MAX_RETRIES && error.code === 'resource-exhausted') {
      const waitTime = Math.pow(2, retryCount) * 2000;
      console.log('   ⚠️  Quota exceeded, aguardando ' + waitTime + 'ms...');
      await sleep(waitTime);
      return migrateStudentWithRetry(student, studentNumber, totalStudents, retryCount + 1);
    }
    throw error;
  }
}

async function migrateHistoricalData() {
  console.log('\n' + '═'.repeat(80));
  console.log('  MIGRAÇÃO HISTÓRICA: V2 → V3 (OPTIMIZED)');
  console.log('═'.repeat(80) + '\n');

  const startTime = Date.now();

  const stats = {
    totalStudents: 0,
    processedStudents: 0,
    migratedAbsences: 0,
    summariesCreated: 0,
    errors: [],
    skipped: [],
  };

  try {
    const checkpoint = loadCheckpoint();
    let startIndex = 0;

    if (checkpoint && checkpoint.processedStudents > 0) {
      console.log('📌 CHECKPOINT ENCONTRADO!\n');
      console.log('   Última execução: ' + checkpoint.lastSaved);
      console.log('   Estudantes processados: ' + checkpoint.processedStudents + '/' + checkpoint.totalStudents);
      console.log('   Status: ' + (checkpoint.status || 'em progresso'));
      
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        rl.question('\n   Deseja continuar de onde parou? (s/n): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() === 's') {
        console.log('\n   ✅ Continuando do checkpoint...\n');
        startIndex = checkpoint.processedStudents;
        stats.processedStudents = checkpoint.processedStudents || 0;
        stats.migratedAbsences = checkpoint.migratedAbsences || 0;
        stats.summariesCreated = checkpoint.summariesCreated || 0;
      } else {
        console.log('\n   ⚠️  Iniciando migração do zero...\n');
      }
    }

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
    console.log('   ✅ ' + stats.totalStudents + ' estudantes ativos carregados\n');

    console.log('2️⃣  Iniciando migração por batches...\n');
    console.log('   📦 Batch size: ' + BATCH_SIZE + ' estudantes');
    console.log('   ⏱️  Delay entre batches: ' + DELAY_BETWEEN_BATCHES + 'ms');
    console.log('   📊 Total de batches: ' + Math.ceil((students.length - startIndex) / BATCH_SIZE) + '\n');

    for (let i = startIndex; i < students.length; i += BATCH_SIZE) {
      const batch = students.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(students.length / BATCH_SIZE);

      console.log('\n📦 Batch ' + batchNumber + '/' + totalBatches + ' (' + batch.length + ' estudantes)');
      console.log('─'.repeat(80));

      for (let j = 0; j < batch.length; j++) {
        const student = batch[j];
        const studentNumber = i + j + 1;

        try {
          const result = await migrateStudentWithRetry(student, studentNumber, students.length);

          if (result.skipped) {
            console.log('   ' + studentNumber + '/' + students.length + ' - ' + student.nome + ': 0 faltas (pulando)');
            stats.skipped.push(student.id);
          } else {
            stats.migratedAbsences += result.count;
            stats.summariesCreated += result.summaries;
          }

          stats.processedStudents++;

        } catch (error) {
          console.error('   ❌ ' + studentNumber + '/' + students.length + ' - ' + student.nome + ': ERRO');
          console.error('      ' + error.message);
          stats.errors.push({ studentId: student.id, error: error.message });
        }
      }

      await saveCheckpoint({
        totalStudents: stats.totalStudents,
        processedStudents: stats.processedStudents,
        migratedAbsences: stats.migratedAbsences,
        summariesCreated: stats.summariesCreated,
        errors: stats.errors,
        skipped: stats.skipped,
        status: 'em_progresso',
      });

      if (i + BATCH_SIZE < students.length) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

    console.log('\n' + '═'.repeat(80));
    console.log('  MIGRAÇÃO CONCLUÍDA!');
    console.log('═'.repeat(80) + '\n');

    console.log('📊 Estatísticas:');
    console.log('   • Estudantes processados: ' + stats.processedStudents + '/' + stats.totalStudents);
    console.log('   • Faltas migradas: ' + stats.migratedAbsences);
    console.log('   • Summaries criados: ' + stats.summariesCreated);
    console.log('   • Estudantes sem faltas: ' + stats.skipped.length);
    console.log('   • Erros: ' + stats.errors.length);
    console.log('   • Tempo total: ' + duration + ' minutos\n');

    if (stats.errors.length > 0) {
      console.log('⚠️  Erros encontrados:');
      stats.errors.forEach(err => {
        console.log('   • ' + err.studentId + ': ' + err.error);
      });
      console.log();
    }

    await saveCheckpoint({
      ...stats,
      status: 'concluído',
    });

    console.log('✅ Migração finalizada com sucesso!');
    console.log('✅ Checkpoint salvo em: ' + CHECKPOINT_FILE);
    console.log('\n📋 Próximo passo: Executar script 04-validate-migration.mjs\n');
    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERRO CRÍTICO na migração:', error);
    
    await saveCheckpoint({
      ...stats,
      status: 'erro',
      lastError: error.message,
    });

    process.exit(1);
  }

  process.exit(0);
}

migrateHistoricalData();
