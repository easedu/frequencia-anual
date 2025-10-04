/**
 * VALIDAÇÃO DA MIGRAÇÃO V3
 *
 * Valida que todos os estudantes de V2 foram migrados corretamente para V3
 * - Verifica existência de todos os estudantes
 * - Valida campos obrigatórios
 * - Verifica contatos
 * - Gera relatório de inconsistências
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
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

const results = {
  totalV2: 0,
  totalV3: 0,
  validated: 0,
  missing: [],
  fieldsErrors: [],
  contactsErrors: [],
  success: true
};

/**
 * Validate required fields
 */
function validateRequiredFields(student, source) {
  const required = ['estudanteId', 'nome', 'turma', 'status', 'turno'];
  const missing = [];

  for (const field of required) {
    if (!student[field]) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    results.fieldsErrors.push({
      id: student.estudanteId || student.id,
      nome: student.nome || 'NOME AUSENTE',
      source,
      missingFields: missing
    });
    results.success = false;
  }

  return missing.length === 0;
}

/**
 * Validate V2 student exists in V3
 */
async function validateStudent(v2Student) {
  const studentId = v2Student.id;
  const v2Data = v2Student.data();

  // Check if exists in V3
  const v3Ref = doc(db, 'students', studentId);
  const v3Snap = await getDoc(v3Ref);

  if (!v3Snap.exists()) {
    results.missing.push({
      id: studentId,
      nome: v2Data.nome,
      turma: v2Data.turma
    });
    results.success = false;
    return false;
  }

  const v3Data = v3Snap.data();

  // Validate required fields in V3
  validateRequiredFields(v3Data, 'V3');

  // Validate contacts
  const v2Contacts = v2Data.contatos || [];
  const contactsRef = collection(db, 'students', studentId, 'contacts');
  const contactsSnap = await getDocs(contactsRef);
  const v3Contacts = contactsSnap.docs;

  // Allow ±1 difference (normalization might have removed duplicates or empty)
  const contactsDiff = Math.abs(v2Contacts.length - v3Contacts.length);

  if (contactsDiff > 1) {
    results.contactsErrors.push({
      id: studentId,
      nome: v2Data.nome,
      v2Contacts: v2Contacts.length,
      v3Contacts: v3Contacts.length,
      diff: contactsDiff
    });
  }

  results.validated++;
  return true;
}

/**
 * Main validation function
 */
async function runValidation() {
  console.log('\n' + '═'.repeat(60));
  console.log('  VALIDAÇÃO DA MIGRAÇÃO V2 → V3');
  console.log('═'.repeat(60) + '\n');

  // Get all V2 students
  const v2Ref = collection(db, '2025', 'escola', 'students');
  const v2Snap = await getDocs(v2Ref);
  results.totalV2 = v2Snap.size;

  // Get all V3 students
  const v3Ref = collection(db, 'students');
  const v3Snap = await getDocs(v3Ref);
  results.totalV3 = v3Snap.size;

  console.log(`📊 Validando ${results.totalV2} estudantes...\n`);

  // Validate each V2 student
  let progress = 0;
  for (const v2Student of v2Snap.docs) {
    await validateStudent(v2Student);

    progress++;
    if (progress % 100 === 0) {
      console.log(`   Validados: ${progress}/${results.totalV2}`);
    }
  }

  console.log(`   Validados: ${progress}/${results.totalV2}\n`);

  // Print results
  console.log('═'.repeat(60));
  console.log('  RESULTADO DA VALIDAÇÃO');
  console.log('═'.repeat(60));
  console.log(`📊 Total V2: ${results.totalV2}`);
  console.log(`📊 Total V3: ${results.totalV3}`);
  console.log(`✅ Validados: ${results.validated}`);
  console.log(`❌ Ausentes em V3: ${results.missing.length}`);
  console.log(`⚠️  Erros de campos: ${results.fieldsErrors.length}`);
  console.log(`⚠️  Erros de contatos: ${results.contactsErrors.length}`);

  // Print detailed errors
  if (results.missing.length > 0) {
    console.log('\n❌ ESTUDANTES AUSENTES EM V3:');
    results.missing.forEach(s => {
      console.log(`  - ${s.nome} (${s.turma}) [${s.id}]`);
    });
  }

  if (results.fieldsErrors.length > 0) {
    console.log('\n⚠️  ERROS DE CAMPOS OBRIGATÓRIOS:');
    results.fieldsErrors.forEach(s => {
      console.log(`  - ${s.nome} [${s.id}]: ${s.missingFields.join(', ')}`);
    });
  }

  if (results.contactsErrors.length > 0) {
    console.log('\n⚠️  DIVERGÊNCIAS DE CONTATOS (>1):');
    results.contactsErrors.forEach(s => {
      console.log(`  - ${s.nome}: V2=${s.v2Contacts}, V3=${s.v3Contacts} (diff: ${s.diff})`);
    });
  }

  console.log('\n' + '═'.repeat(60));

  if (results.success && results.totalV2 === results.totalV3) {
    console.log('\n🎉 VALIDAÇÃO 100% APROVADA! MIGRAÇÃO COMPLETA! 🎉\n');
    return true;
  } else {
    console.log('\n❌ VALIDAÇÃO FALHOU. REVISAR ERROS ACIMA.\n');
    return false;
  }
}

// Run validation
runValidation()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('❌ Erro crítico:', err);
    process.exit(1);
  });
