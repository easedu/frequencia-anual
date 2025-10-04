/**
 * Script to standardize all date formats to ISO 8601
 *
 * BEFORE: Multiple formats (DD/MM/YYYY, YYYY-MM-DD, etc)
 * AFTER:  ISO 8601 only (YYYY-MM-DD for dates, ISO string for timestamps)
 *
 * Collections affected:
 * - Students (dataNascimento)
 * - Absences (data)
 * - Academic Year (dates)
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc,
  getDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore';

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();
const CURRENT_SCHOOL_YEAR = process.env.NEXT_PUBLIC_SCHOOL_YEAR || new Date().getFullYear().toString();

/**
 * Convert various date formats to ISO 8601 (YYYY-MM-DD)
 */
function standardizeDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // YYYY/MM/DD format
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
    return dateStr.replace(/\//g, '-');
  }

  // Try to parse as Date object
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.warn(`Não foi possível converter data: ${dateStr}`);
  }

  return null;
}

/**
 * Standardize students' birth dates
 */
async function standardizeStudentDates(dryRun: boolean): Promise<number> {
  console.log('\n📅 Padronizando datas de nascimento dos estudantes...');

  const studentsRef = collection(db, CURRENT_SCHOOL_YEAR, 'escola', 'students');
  const snapshot = await getDocs(studentsRef);

  let updated = 0;
  const BATCH_SIZE = 500;
  let batch = writeBatch(db);
  let batchCount = 0;

  snapshot.forEach((studentDoc) => {
    const data = studentDoc.data();

    if (data.dataNascimento) {
      const standardized = standardizeDate(data.dataNascimento);

      if (standardized && standardized !== data.dataNascimento) {
        if (!dryRun) {
          batch.update(studentDoc.ref, {
            dataNascimento: standardized,
            _dateStandardized: Timestamp.now()
          });
          batchCount++;
        }
        updated++;

        if (updated <= 5) {
          console.log(`   ${data.nome}: "${data.dataNascimento}" → "${standardized}"`);
        }
      }
    }

    // Commit batch if limit reached
    if (batchCount >= BATCH_SIZE) {
      if (!dryRun) {
        batch.commit();
        batch = writeBatch(db);
      }
      batchCount = 0;
    }
  });

  // Commit remaining
  if (batchCount > 0 && !dryRun) {
    await batch.commit();
  }

  if (updated > 5) {
    console.log(`   ... e mais ${updated - 5} estudantes`);
  }

  console.log(`   ✅ ${updated} datas de nascimento ${dryRun ? 'seriam' : 'foram'} padronizadas`);
  return updated;
}

/**
 * Standardize absence dates
 */
async function standardizeAbsenceDates(dryRun: boolean): Promise<number> {
  console.log('\n📅 Padronizando datas de faltas...');

  const absencesRef = collection(db, CURRENT_SCHOOL_YEAR, 'faltas', 'controle');
  const snapshot = await getDocs(absencesRef);

  let updated = 0;
  const BATCH_SIZE = 500;
  let batch = writeBatch(db);
  let batchCount = 0;

  snapshot.forEach((absenceDoc) => {
    const data = absenceDoc.data();

    if (data.data) {
      const standardized = standardizeDate(data.data);

      if (standardized && standardized !== data.data) {
        if (!dryRun) {
          batch.update(absenceDoc.ref, {
            data: standardized,
            _dateStandardized: Timestamp.now()
          });
          batchCount++;
        }
        updated++;

        if (updated <= 5) {
          console.log(`   Falta: "${data.data}" → "${standardized}"`);
        }
      }
    }

    // Commit batch if limit reached
    if (batchCount >= BATCH_SIZE) {
      if (!dryRun) {
        batch.commit();
        batch = writeBatch(db);
      }
      batchCount = 0;
    }
  });

  // Commit remaining
  if (batchCount > 0 && !dryRun) {
    await batch.commit();
  }

  if (updated > 5) {
    console.log(`   ... e mais ${updated - 5} faltas`);
  }

  console.log(`   ✅ ${updated} datas de faltas ${dryRun ? 'seriam' : 'foram'} padronizadas`);
  return updated;
}

/**
 * Standardize academic year dates
 */
async function standardizeAcademicYearDates(dryRun: boolean): Promise<number> {
  console.log('\n📅 Padronizando datas do ano letivo...');

  const yearRef = doc(db, CURRENT_SCHOOL_YEAR, 'ano_letivo');
  const yearDoc = await getDoc(yearRef);

  if (!yearDoc.exists()) {
    console.log('   ⚠️  Documento ano_letivo não encontrado');
    return 0;
  }

  const data = yearDoc.data();
  let updated = 0;
  const updatedData: any = {};

  for (const [bimestre, bimData] of Object.entries(data)) {
    const bim = bimData as any;

    if (bim.startDate) {
      const standardized = standardizeDate(bim.startDate);
      if (standardized && standardized !== bim.startDate) {
        console.log(`   ${bimestre} início: "${bim.startDate}" → "${standardized}"`);
        if (!updatedData[bimestre]) updatedData[bimestre] = { ...bim };
        updatedData[bimestre].startDate = standardized;
        updated++;
      }
    }

    if (bim.endDate) {
      const standardized = standardizeDate(bim.endDate);
      if (standardized && standardized !== bim.endDate) {
        console.log(`   ${bimestre} fim: "${bim.endDate}" → "${standardized}"`);
        if (!updatedData[bimestre]) updatedData[bimestre] = { ...bim };
        updatedData[bimestre].endDate = standardized;
        updated++;
      }
    }

    if (bim.dates && Array.isArray(bim.dates)) {
      const standardizedDates = bim.dates.map((d: any) => {
        if (d.date) {
          const standardized = standardizeDate(d.date);
          if (standardized && standardized !== d.date) {
            updated++;
            return { ...d, date: standardized };
          }
        }
        return d;
      });

      if (!updatedData[bimestre]) updatedData[bimestre] = { ...bim };
      updatedData[bimestre].dates = standardizedDates;
    }
  }

  if (Object.keys(updatedData).length > 0 && !dryRun) {
    await setDoc(yearRef, updatedData, { merge: true });
  }

  console.log(`   ✅ ${updated} datas do ano letivo ${dryRun ? 'seriam' : 'foram'} padronizadas`);
  return updated;
}

/**
 * Main function
 */
async function standardizeDates(dryRun: boolean = true) {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📅 PADRONIZAÇÃO DE DATAS PARA ISO 8601');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`📅 Ano letivo: ${CURRENT_SCHOOL_YEAR}`);
  console.log(`🔧 Modo: ${dryRun ? 'DRY-RUN (simulação)' : 'PRODUÇÃO (alterará dados)'}\n`);

  try {
    const startTime = Date.now();

    // Standardize all collections
    const studentsUpdated = await standardizeStudentDates(dryRun);
    const absencesUpdated = await standardizeAbsenceDates(dryRun);
    const yearUpdated = await standardizeAcademicYearDates(dryRun);

    const total = studentsUpdated + absencesUpdated + yearUpdated;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 RESUMO DA PADRONIZAÇÃO');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`Estudantes: ${studentsUpdated} datas`);
    console.log(`Faltas: ${absencesUpdated} datas`);
    console.log(`Ano letivo: ${yearUpdated} datas`);
    console.log(`\nTotal: ${total} datas ${dryRun ? 'identificadas' : 'padronizadas'}`);
    console.log(`Duração: ${duration}s`);

    if (dryRun && total > 0) {
      console.log('\n💡 Para executar a padronização real, rode com --execute');
    }

    if (!dryRun && total > 0) {
      console.log('\n🎉 Padronização concluída com sucesso!');
      console.log('\n📋 Formato padronizado: YYYY-MM-DD (ISO 8601)');
      console.log('   Exemplo: 2025-03-15');
    }

    if (total === 0) {
      console.log('\n✅ Todas as datas já estão no formato ISO 8601!');
    }

    console.log('\n═══════════════════════════════════════════════════════\n');
  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    throw error;
  }
}

// Parse arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

if (dryRun) {
  console.log('ℹ️  Rodando em modo DRY-RUN (simulação)\n');
}

// Run
standardizeDates(dryRun)
  .then(() => {
    console.log('✅ Script concluído!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falhou:', error);
    process.exit(1);
  });