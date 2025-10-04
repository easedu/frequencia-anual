/**
 * MIGRAÇÃO V2 → V3
 *
 * Script de migração completa dos dados históricos
 * - Identifica estudantes em V2 que não existem em V3
 * - Migra dados do estudante e contatos
 * - Suporta DRY_RUN, TEST, e FULL modes
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  writeBatch,
  addDoc,
  Timestamp,
} from 'firebase/firestore';

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

// MODE: DRY_RUN | TEST | FULL
const MODE = process.env.MODE || 'DRY_RUN';
const TEST_LIMIT = 10;

/**
 * Normalize contact name
 */
function normalizeContactName(name) {
  if (!name || typeof name !== 'string') return '';

  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalize parentesco
 */
function normalizeParentesco(parentesco) {
  if (!parentesco || typeof parentesco !== 'string') return '';

  const normalized = parentesco.trim().toLowerCase();

  const parentescoMap = {
    'mae': 'Mãe',
    'mãe': 'Mãe',
    'pai': 'Pai',
    'avo': 'Avó',
    'avó': 'Avó',
    'avô': 'Avô',
    'tio': 'Tio',
    'tia': 'Tia',
    'irmao': 'Irmão',
    'irmã': 'Irmã',
    'irmão': 'Irmão',
    'irma': 'Irmã',
    'responsavel': 'Responsável',
    'responsável': 'Responsável',
    'tutor': 'Tutor',
    'tutora': 'Tutora',
  };

  return parentescoMap[normalized] ||
         (normalized.charAt(0).toUpperCase() + normalized.slice(1));
}

/**
 * Extract numeric phone
 */
function extractNumericPhone(telefone) {
  return telefone.replace(/\D/g, '');
}

/**
 * Find students that need migration (V2 but not in V3)
 */
async function findStudentsToMigrate() {
  console.log('\n🔍 Procurando estudantes para migrar...\n');

  // Get all V2 students
  const v2Ref = collection(db, '2025', 'escola', 'students');
  const v2Snap = await getDocs(v2Ref);

  // Get all V3 students
  const v3Ref = collection(db, 'students');
  const v3Snap = await getDocs(v3Ref);

  // Create Set of V3 IDs for fast lookup
  const v3Ids = new Set(v3Snap.docs.map(doc => doc.id));

  // Find students in V2 but not in V3
  const toMigrate = [];

  v2Snap.docs.forEach(doc => {
    if (!v3Ids.has(doc.id)) {
      toMigrate.push({
        id: doc.id,
        data: doc.data()
      });
    }
  });

  console.log(`📊 V2: ${v2Snap.size} estudantes`);
  console.log(`📊 V3: ${v3Snap.size} estudantes`);
  console.log(`📝 Para migrar: ${toMigrate.length} estudantes\n`);

  return toMigrate;
}

/**
 * Migrate a single student to V3
 */
async function migrateStudent(student) {
  const { id, data } = student;

  try {
    // 1. Create student document in V3
    const v3StudentRef = doc(db, 'students', id);

    const v3StudentData = {
      estudanteId: id,
      nome: data.nome,
      turma: data.turma,
      status: data.status || 'ATIVO',
      turno: data.turno,
      bolsaFamilia: data.bolsaFamilia,
      matricula: data.matricula,
      email: data.email,
      dataNascimento: data.dataNascimento,
      endereco: data.endereco,
      deficiencia: data.deficiencia,
      provaSaoPaulo: data.provaSaoPaulo || [],
      createdAt: data.createdAt || Timestamp.now(),
      updatedAt: data.updatedAt || Timestamp.now(),
      deleted: data.deleted || false,
    };

    // Remove undefined fields
    const cleanData = Object.fromEntries(
      Object.entries(v3StudentData).filter(([_, v]) => v !== undefined)
    );

    if (MODE !== 'DRY_RUN') {
      const batch = writeBatch(db);
      batch.set(v3StudentRef, cleanData);
      await batch.commit();
    }

    console.log(`  ✓ ${data.nome} (${id})`);

    // 2. Migrate contacts to subcollection
    if (data.contatos && data.contatos.length > 0) {
      const contactsRef = collection(db, 'students', id, 'contacts');

      for (const contato of data.contatos) {
        const contactData = {
          nome: normalizeContactName(contato.nome),
          parentesco: normalizeParentesco(contato.parentesco || ''),
          telefone: contato.telefone || '',
          telefoneNumerico: extractNumericPhone(contato.telefone || ''),
          podeReceberWhatsapp: contato.podeReceberMensagem !== false,
          createdAt: Timestamp.now(),
        };

        const cleanContactData = Object.fromEntries(
          Object.entries(contactData).filter(([_, v]) => v !== undefined)
        );

        if (MODE !== 'DRY_RUN') {
          await addDoc(contactsRef, cleanContactData);
        }
      }

      console.log(`    → ${data.contatos.length} contatos migrados`);
    }

    return { success: true, id };

  } catch (error) {
    console.error(`  ❌ Erro ao migrar ${data.nome}:`, error.message);
    return { success: false, id, error: error.message };
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('\n' + '═'.repeat(60));
  console.log(`  MIGRAÇÃO V2 → V3 [${MODE}]`);
  console.log('═'.repeat(60));

  if (MODE === 'DRY_RUN') {
    console.log('\n⚠️  DRY RUN MODE - Nenhuma alteração será feita\n');
  } else if (MODE === 'TEST') {
    console.log(`\n⚠️  TEST MODE - Migrando apenas ${TEST_LIMIT} estudantes\n`);
  } else {
    console.log('\n🚀 FULL MODE - Migração completa\n');
  }

  // Find students to migrate
  const studentsToMigrate = await findStudentsToMigrate();

  if (studentsToMigrate.length === 0) {
    console.log('✅ Nenhum estudante para migrar. Todos já estão em V3!\n');
    return;
  }

  // Apply limit for TEST mode
  const studentsToProcess = MODE === 'TEST'
    ? studentsToMigrate.slice(0, TEST_LIMIT)
    : studentsToMigrate;

  console.log(`📦 Processando ${studentsToProcess.length} estudantes...\n`);

  // Migrate students
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  for (const student of studentsToProcess) {
    const result = await migrateStudent(student);

    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({
        id: result.id,
        error: result.error
      });
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('  RESUMO DA MIGRAÇÃO');
  console.log('═'.repeat(60));
  console.log(`✅ Sucesso: ${results.success}`);
  console.log(`❌ Falhas: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\n⚠️  Erros:');
    results.errors.forEach(err => {
      console.log(`  - ${err.id}: ${err.error}`);
    });
  }

  console.log('\n' + '═'.repeat(60) + '\n');

  if (MODE === 'DRY_RUN') {
    console.log('💡 Para executar a migração real, use:');
    console.log('   MODE=FULL node scripts/migrate-to-v3.mjs\n');
  }
}

// Run migration
runMigration()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erro crítico:', err);
    process.exit(1);
  });