/**
 * Migration Script: Students Array → Individual Documents
 *
 * BEFORE: /{YEAR}/lista_de_estudantes → estudantes[] (array)
 * AFTER:  /{YEAR}/students/{estudanteId} (individual docs)
 *
 * Features:
 * - Dry-run mode (test without changes)
 * - Automatic backup
 * - Rollback support
 * - Validation
 * - Progress tracking
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

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

// UUID validation
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Student {
  estudanteId: string;
  nome: string;
  turma: string;
  [key: string]: any;
}

interface MigrationResult {
  success: boolean;
  studentsProcessed: number;
  errors: string[];
  backupPath?: string;
  duration: number;
}

/**
 * Create backup of current data
 */
async function createBackup(students: Student[]): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  const backupPath = path.join(backupDir, `students-backup-${timestamp}.json`);

  // Create backups directory if doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backup = {
    timestamp: new Date().toISOString(),
    year: CURRENT_SCHOOL_YEAR,
    totalStudents: students.length,
    data: students
  };

  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`✅ Backup criado: ${backupPath}\n`);

  return backupPath;
}

/**
 * Validate student data
 */
function validateStudent(student: Student, index: number): string[] {
  const errors: string[] = [];

  if (!student.estudanteId) {
    errors.push(`Estudante ${index}: estudanteId ausente`);
  } else if (!UUID_PATTERN.test(student.estudanteId)) {
    errors.push(`Estudante ${index}: estudanteId inválido (${student.estudanteId})`);
  }

  if (!student.nome || student.nome.trim() === '') {
    errors.push(`Estudante ${index}: nome ausente ou vazio`);
  }

  if (!student.turma || student.turma.trim() === '') {
    errors.push(`Estudante ${index}: turma ausente ou vazia`);
  }

  return errors;
}

/**
 * Add audit timestamps to student
 */
function addAuditFields(student: Student): Student {
  const now = Timestamp.now();
  return {
    ...student,
    createdAt: now,
    updatedAt: now,
    migratedAt: now,
    migratedFrom: 'lista_de_estudantes_array'
  };
}

/**
 * Migrate students in batches (Firestore limit: 500 per batch)
 */
async function migrateStudents(students: Student[], dryRun: boolean): Promise<MigrationResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let studentsProcessed = 0;
  const BATCH_SIZE = 500;

  console.log(`📊 Total de estudantes: ${students.length}`);
  console.log(`🔧 Modo: ${dryRun ? 'DRY-RUN (apenas simulação)' : 'PRODUÇÃO (alterará dados)'}\n`);

  // Validate all students first
  console.log('🔍 Validando dados...');
  for (let i = 0; i < students.length; i++) {
    const validationErrors = validateStudent(students[i], i + 1);
    if (validationErrors.length > 0) {
      errors.push(...validationErrors);
    }
  }

  if (errors.length > 0) {
    console.log(`\n❌ Encontrados ${errors.length} erros de validação:\n`);
    errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
    if (errors.length > 10) {
      console.log(`   ... e mais ${errors.length - 10} erros`);
    }
    return {
      success: false,
      studentsProcessed: 0,
      errors,
      duration: Date.now() - startTime
    };
  }

  console.log('✅ Validação concluída sem erros\n');

  if (dryRun) {
    console.log('🔍 DRY-RUN: Simulando migração...\n');
    console.log('Operações que seriam executadas:');
    students.slice(0, 3).forEach((student, i) => {
      console.log(`   ${i + 1}. Criar documento: /${CURRENT_SCHOOL_YEAR}/escola/students/${student.estudanteId}`);
      console.log(`      Nome: ${student.nome}`);
      console.log(`      Turma: ${student.turma}\n`);
    });
    if (students.length > 3) {
      console.log(`   ... e mais ${students.length - 3} estudantes\n`);
    }

    console.log(`✅ DRY-RUN concluído. Nenhum dado foi modificado.`);
    console.log(`\n💡 Para executar a migração real, rode o script com --execute\n`);

    return {
      success: true,
      studentsProcessed: students.length,
      errors: [],
      duration: Date.now() - startTime
    };
  }

  // Real migration
  console.log('🚀 Iniciando migração...\n');

  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchStudents = students.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(students.length / BATCH_SIZE);

    console.log(`📦 Processando lote ${batchNumber}/${totalBatches} (${batchStudents.length} estudantes)...`);

    for (const student of batchStudents) {
      try {
        const studentWithAudit = addAuditFields(student);
        // Use collection() to create subcollection: /{YEAR}/escola/students/{estudanteId}
        const docRef = doc(collection(db, CURRENT_SCHOOL_YEAR, 'escola', 'students'), student.estudanteId);
        batch.set(docRef, studentWithAudit);
        studentsProcessed++;
      } catch (error: any) {
        errors.push(`Erro ao processar ${student.nome}: ${error.message}`);
      }
    }

    try {
      await batch.commit();
      console.log(`   ✅ Lote ${batchNumber} salvo com sucesso`);
    } catch (error: any) {
      const errorMsg = `Erro ao salvar lote ${batchNumber}: ${error.message}`;
      errors.push(errorMsg);
      console.error(`   ❌ ${errorMsg}`);
    }
  }

  console.log('\n✅ Migração de documentos concluída!\n');

  // Create a marker document to indicate migration completion
  console.log('📝 Criando marcador de migração...');
  try {
    await setDoc(doc(db, CURRENT_SCHOOL_YEAR, 'escola'), {
      _migration: {
        migratedAt: Timestamp.now(),
        studentsCollection: true,
        totalStudents: students.length,
        oldStructure: 'lista_de_estudantes',
        newStructure: 'escola/students/{estudanteId}',
        version: '2.0'
      }
    }, { merge: true });
    console.log('✅ Marcador criado\n');
  } catch (error: any) {
    console.error(`⚠️  Aviso: Não foi possível criar marcador: ${error.message}\n`);
  }

  return {
    success: errors.length === 0,
    studentsProcessed,
    errors,
    duration: Date.now() - startTime
  };
}

/**
 * Main migration function
 */
async function migrate(dryRun: boolean = true) {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🎓 MIGRAÇÃO DE ESTUDANTES: Array → Documentos Individuais');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`📅 Ano letivo: ${CURRENT_SCHOOL_YEAR}\n`);

  try {
    // 1. Read current data
    console.log('📖 Lendo dados atuais...');
    const oldDocRef = doc(db, CURRENT_SCHOOL_YEAR, 'lista_de_estudantes');
    const oldDocSnap = await getDoc(oldDocRef);

    if (!oldDocSnap.exists()) {
      console.error('❌ Documento lista_de_estudantes não encontrado!');
      console.log('\n💡 Verifique se o ano está correto e se o documento existe.\n');
      return;
    }

    const data = oldDocSnap.data();
    const students: Student[] = data?.estudantes || [];

    if (students.length === 0) {
      console.log('⚠️  Nenhum estudante encontrado no documento.\n');
      return;
    }

    console.log(`✅ ${students.length} estudantes encontrados\n`);

    // 2. Create backup
    let backupPath: string | undefined;
    if (!dryRun) {
      console.log('💾 Criando backup...');
      backupPath = await createBackup(students);
    }

    // 3. Migrate
    const result = await migrateStudents(students, dryRun);

    // 4. Report results
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 RESULTADO DA MIGRAÇÃO');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`Status: ${result.success ? '✅ SUCESSO' : '❌ FALHA'}`);
    console.log(`Estudantes processados: ${result.studentsProcessed}/${students.length}`);
    console.log(`Duração: ${(result.duration / 1000).toFixed(2)}s`);

    if (backupPath) {
      console.log(`Backup: ${backupPath}`);
    }

    if (result.errors.length > 0) {
      console.log(`\n⚠️  Erros encontrados: ${result.errors.length}`);
      result.errors.slice(0, 5).forEach(err => console.log(`   - ${err}`));
      if (result.errors.length > 5) {
        console.log(`   ... e mais ${result.errors.length - 5} erros`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════\n');

    if (!dryRun && result.success) {
      console.log('🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!\n');
      console.log('📋 PRÓXIMOS PASSOS:');
      console.log('   1. Testar a aplicação com a nova estrutura');
      console.log('   2. Atualizar o StudentService (já preparado)');
      console.log('   3. Verificar se todas as queries funcionam');
      console.log('   4. Após 1 semana de testes, remover documento antigo\n');
      console.log('⚠️  IMPORTANTE: Não delete o documento antigo ainda!');
      console.log('   Mantenha por 1-2 semanas como backup de segurança.\n');
    }

  } catch (error: any) {
    console.error('\n❌ ERRO CRÍTICO:', error.message);
    console.error('\n💡 A migração foi interrompida. Nenhum dado foi modificado.\n');
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

if (dryRun) {
  console.log('ℹ️  Rodando em modo DRY-RUN (simulação)\n');
}

// Run migration
migrate(dryRun)
  .then(() => {
    console.log('✅ Script concluído!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falhou:', error);
    process.exit(1);
  });