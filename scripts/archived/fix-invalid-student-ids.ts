/**
 * Script to fix invalid estudanteId format in Firebase
 * Converts non-UUID format to UUID and updates all references
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

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

// Get current school year
const CURRENT_SCHOOL_YEAR = process.env.NEXT_PUBLIC_SCHOOL_YEAR || new Date().getFullYear().toString();

// UUID regex pattern
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Student {
  estudanteId: string;
  nome: string;
  turma: string;
  turno: string;
  [key: string]: any;
}

interface IdMapping {
  oldId: string;
  newId: string;
  nome: string;
  turma: string;
}

async function isValidUUID(id: string): Promise<boolean> {
  return UUID_PATTERN.test(id);
}

async function fixInvalidStudentIds() {
  console.log('🔍 Iniciando verificação de estudanteId inválidos...\n');

  try {
    // 1. Get all students
    console.log(`📅 Ano letivo: ${CURRENT_SCHOOL_YEAR}\n`);
    const studentsRef = doc(db, CURRENT_SCHOOL_YEAR, 'lista_de_estudantes');
    const studentsDoc = await getDoc(studentsRef);

    if (!studentsDoc.exists()) {
      console.log('❌ Documento de estudantes não encontrado');
      return;
    }

    const data = studentsDoc.data();
    const students: Student[] = data?.estudantes || [];

    console.log(`📊 Total de estudantes no banco: ${students.length}\n`);

    // 2. Identify invalid IDs
    const invalidStudents: Student[] = [];
    const idMappings: IdMapping[] = [];

    for (const student of students) {
      const isValid = await isValidUUID(student.estudanteId);
      if (!isValid) {
        invalidStudents.push(student);
        const newId = uuidv4();
        idMappings.push({
          oldId: student.estudanteId,
          newId,
          nome: student.nome,
          turma: student.turma
        });
      }
    }

    if (invalidStudents.length === 0) {
      console.log('✅ Todos os estudanteId estão no formato correto (UUID)');
      return;
    }

    console.log(`❌ Encontrados ${invalidStudents.length} estudantes com ID inválido:\n`);
    invalidStudents.forEach((student, index) => {
      console.log(`${index + 1}. ID: ${student.estudanteId}`);
      console.log(`   Nome: ${student.nome}`);
      console.log(`   Turma: ${student.turma}`);
      console.log(`   Turno: ${student.turno}`);
      console.log(`   Novo UUID: ${idMappings[index].newId}\n`);
    });

    // 3. Update student records
    console.log('🔧 Atualizando registros de estudantes...');
    const updatedStudents = students.map(student => {
      const mapping = idMappings.find(m => m.oldId === student.estudanteId);
      if (mapping) {
        return {
          ...student,
          estudanteId: mapping.newId
        };
      }
      return student;
    });

    await setDoc(studentsRef, { estudantes: updatedStudents }, { merge: false });
    console.log('✅ Estudantes atualizados com sucesso\n');

    // 4. Update absences references (collection-based)
    console.log('🔧 Verificando e atualizando referências em faltas...');
    const absencesCollection = collection(db, CURRENT_SCHOOL_YEAR, 'faltas', 'controle');
    const absencesSnapshot = await getDocs(absencesCollection);

    let absencesUpdated = 0;
    const absencesBatch = writeBatch(db);

    absencesSnapshot.forEach((absenceDoc) => {
      const data = absenceDoc.data();
      const mapping = idMappings.find(m => m.oldId === data.estudanteId);
      if (mapping) {
        absencesUpdated++;
        absencesBatch.update(absenceDoc.ref, { estudanteId: mapping.newId });
      }
    });

    if (absencesUpdated > 0) {
      await absencesBatch.commit();
      console.log(`✅ ${absencesUpdated} registros de faltas atualizados\n`);
    } else {
      console.log('ℹ️  Nenhum registro de falta necessitou atualização\n');
    }

    // 5. Update atestados references (collection-based)
    console.log('🔧 Verificando e atualizando referências em atestados...');
    const atestadosCollection = collection(db, CURRENT_SCHOOL_YEAR, 'atestados');
    const atestadosSnapshot = await getDocs(atestadosCollection);

    let atestadosUpdated = 0;
    const atestadosBatch = writeBatch(db);

    atestadosSnapshot.forEach((atestadoDoc) => {
      const docId = atestadoDoc.id;
      const mapping = idMappings.find(m => m.oldId === docId);
      if (mapping) {
        // Need to create new doc with new ID and delete old one
        const newDocRef = doc(db, CURRENT_SCHOOL_YEAR, 'atestados', mapping.newId);
        atestadosBatch.set(newDocRef, atestadoDoc.data());
        atestadosBatch.delete(atestadoDoc.ref);
        atestadosUpdated++;
      }
    });

    if (atestadosUpdated > 0) {
      await atestadosBatch.commit();
      console.log(`✅ ${atestadosUpdated} registros de atestados atualizados\n`);
    } else {
      console.log('ℹ️  Nenhum registro de atestado necessitou atualização\n');
    }

    // 6. Update family interactions references (collection-based)
    console.log('🔧 Verificando e atualizando referências em interações familiares...');
    const interacoesCollection = collection(db, CURRENT_SCHOOL_YEAR, 'interactions');
    const interacoesSnapshot = await getDocs(interacoesCollection);

    let interacoesUpdated = 0;
    const interacoesBatch = writeBatch(db);

    interacoesSnapshot.forEach((interacaoDoc) => {
      const docId = interacaoDoc.id;
      const mapping = idMappings.find(m => m.oldId === docId);
      if (mapping) {
        const newDocRef = doc(db, CURRENT_SCHOOL_YEAR, 'interactions', mapping.newId);
        interacoesBatch.set(newDocRef, interacaoDoc.data());
        interacoesBatch.delete(interacaoDoc.ref);
        interacoesUpdated++;
      }
    });

    if (interacoesUpdated > 0) {
      await interacoesBatch.commit();
      console.log(`✅ ${interacoesUpdated} registros de interações atualizadas\n`);
    } else {
      console.log('ℹ️  Nenhum registro de interação necessitou atualização\n');
    }

    // Note: Ocorrências não fazem parte da estrutura Firebase atual baseada no código
    console.log('ℹ️  Pulando ocorrências (não encontrado na estrutura atual)\n');

    // 8. Update tasks references
    console.log('🔧 Verificando e atualizando referências em tarefas...');
    const tasksRef = collection(db, 'tasks');
    const tasksSnapshot = await getDocs(tasksRef);

    let tasksUpdated = 0;
    const batch = writeBatch(db);

    tasksSnapshot.forEach((taskDoc) => {
      const task = taskDoc.data();
      const mapping = idMappings.find(m => m.oldId === task.estudanteId);
      if (mapping) {
        tasksUpdated++;
        batch.update(taskDoc.ref, { estudanteId: mapping.newId });
      }
    });

    if (tasksUpdated > 0) {
      await batch.commit();
      console.log(`✅ ${tasksUpdated} tarefas atualizadas\n`);
    } else {
      console.log('ℹ️  Nenhuma tarefa necessitou atualização\n');
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 RESUMO DA CORREÇÃO\n');
    console.log(`✅ ${invalidStudents.length} estudantes corrigidos`);
    console.log('✅ Todas as referências atualizadas\n');
    console.log('Mapeamento de IDs:');
    idMappings.forEach((mapping, index) => {
      console.log(`\n${index + 1}. ${mapping.nome} (${mapping.turma})`);
      console.log(`   Antigo: ${mapping.oldId}`);
      console.log(`   Novo:   ${mapping.newId}`);
    });
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Erro ao corrigir estudanteId:', error);
    throw error;
  }
}

// Run the script
fixInvalidStudentIds()
  .then(() => {
    console.log('\n✅ Script concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro ao executar script:', error);
    process.exit(1);
  });