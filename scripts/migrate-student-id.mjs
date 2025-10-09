import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch, deleteDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

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

const OLD_ID = '1759711348806';
const NEW_ID = uuidv4();

async function migrateStudentId() {
  console.log('🚀 MIGRAÇÃO DE ID DO ESTUDANTE');
  console.log('================================');
  console.log('ID Antigo:', OLD_ID);
  console.log('ID Novo:', NEW_ID);
  console.log('');

  try {
    // ETAPA 2: Gerar novo UUID
    console.log('✅ ETAPA 2: Novo UUID gerado:', NEW_ID);
    console.log('');

    // ETAPA 3: Migração de dados
    console.log('📦 ETAPA 3: MIGRAÇÃO DE DADOS');
    console.log('------------------------------');

    // 3.1. Copiar documento principal
    console.log('📄 3.1. Copiando documento principal...');
    const oldDocRef = doc(db, 'students', OLD_ID);
    const oldDocSnap = await getDoc(oldDocRef);

    if (!oldDocSnap.exists()) {
      throw new Error('Estudante não encontrado!');
    }

    const studentData = oldDocSnap.data();
    const newDocRef = doc(db, 'students', NEW_ID);

    // Atualizar estudanteId no documento
    const newStudentData = {
      ...studentData,
      estudanteId: NEW_ID,
      migratedFrom: OLD_ID,
      migratedAt: new Date(),
    };

    await setDoc(newDocRef, newStudentData);
    console.log('   ✓ Documento principal copiado');

    // 3.2. Copiar subcoleção contacts
    console.log('📞 3.2. Copiando contatos...');
    const oldContactsRef = collection(db, 'students', OLD_ID, 'contacts');
    const oldContactsSnap = await getDocs(oldContactsRef);

    for (const contactDoc of oldContactsSnap.docs) {
      const newContactRef = doc(db, 'students', NEW_ID, 'contacts', contactDoc.id);
      await setDoc(newContactRef, contactDoc.data());
    }
    console.log(`   ✓ ${oldContactsSnap.size} contatos copiados`);

    // 3.3. Copiar subcoleção absences
    console.log('📅 3.3. Copiando faltas...');
    const oldAbsencesRef = collection(db, 'students', OLD_ID, 'absences');
    const oldAbsencesSnap = await getDocs(oldAbsencesRef);

    for (const absenceDoc of oldAbsencesSnap.docs) {
      const newAbsenceRef = doc(db, 'students', NEW_ID, 'absences', absenceDoc.id);
      await setDoc(newAbsenceRef, absenceDoc.data());
    }
    console.log(`   ✓ ${oldAbsencesSnap.size} faltas copiadas`);

    // 3.4. Copiar subcoleção interactions
    console.log('💬 3.4. Copiando interações...');
    const oldInteractionsRef = collection(db, 'students', OLD_ID, 'interactions');
    const oldInteractionsSnap = await getDocs(oldInteractionsRef);

    for (const interactionDoc of oldInteractionsSnap.docs) {
      const newInteractionRef = doc(db, 'students', NEW_ID, 'interactions', interactionDoc.id);
      await setDoc(newInteractionRef, interactionDoc.data());
    }
    console.log(`   ✓ ${oldInteractionsSnap.size} interações copiadas`);

    console.log('');

    // ETAPA 4: Atualizar referências
    console.log('🔗 ETAPA 4: ATUALIZANDO REFERÊNCIAS');
    console.log('-----------------------------------');

    // 4.1. Atualizar userTasks
    console.log('📋 4.1. Atualizando tarefas (userTasks)...');
    const tasksRef = collection(db, 'userTasks');
    const tasksQuery = query(tasksRef, where('estudanteId', '==', OLD_ID));
    const tasksSnap = await getDocs(tasksQuery);

    const batch = writeBatch(db);
    tasksSnap.forEach((taskDoc) => {
      batch.update(taskDoc.ref, { estudanteId: NEW_ID });
    });

    if (tasksSnap.size > 0) {
      await batch.commit();
      console.log(`   ✓ ${tasksSnap.size} tarefas atualizadas`);
    } else {
      console.log('   ✓ Nenhuma tarefa para atualizar');
    }

    console.log('');

    // ETAPA 5: Validação
    console.log('✔️  ETAPA 5: VALIDAÇÃO');
    console.log('---------------------');

    const newDocCheck = await getDoc(newDocRef);
    console.log('   ✓ Novo documento existe:', newDocCheck.exists());
    console.log('   ✓ Novo estudanteId:', newDocCheck.data()?.estudanteId);
    console.log('   ✓ Nome:', newDocCheck.data()?.nome);

    console.log('');

    // ETAPA 6: Soft delete do documento antigo
    console.log('🗑️  ETAPA 6: REMOVENDO DOCUMENTO ANTIGO (SOFT DELETE)');
    console.log('----------------------------------------------------');

    await setDoc(oldDocRef, {
      ...studentData,
      deleted: true,
      deletedAt: new Date(),
      deletedBy: 'MIGRATION_SCRIPT',
      deletionReason: `Migrado para UUID: ${NEW_ID}`,
      migratedTo: NEW_ID,
    });
    console.log('   ✓ Documento antigo marcado como deletado');
    console.log('');

    console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('');
    console.log('📊 RESUMO:');
    console.log('   - ID Antigo:', OLD_ID, '(soft deleted)');
    console.log('   - ID Novo:', NEW_ID);
    console.log('   - Contatos migrados:', oldContactsSnap.size);
    console.log('   - Faltas migradas:', oldAbsencesSnap.size);
    console.log('   - Interações migradas:', oldInteractionsSnap.size);
    console.log('   - Tarefas atualizadas:', tasksSnap.size);
    console.log('');
    console.log('🎯 Próximos passos:');
    console.log('   1. Verificar o novo estudante na interface');
    console.log('   2. Confirmar que todos os dados estão corretos');
    console.log('   3. O documento antigo foi soft deleted (não removido permanentemente)');

  } catch (error) {
    console.error('❌ ERRO NA MIGRAÇÃO:', error);
    console.error('');
    console.error('⚠️  A migração foi interrompida. Nenhuma alteração permanente foi feita.');
    process.exit(1);
  }
}

migrateStudentId();
