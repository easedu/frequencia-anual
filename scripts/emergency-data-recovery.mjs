import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCmUo0UtaYnGjCPdCIuNbKJgFKBWPJv5yY',
  authDomain: 'frequencia-anual.firebaseapp.com',
  projectId: 'frequencia-anual',
  storageBucket: 'frequencia-anual.firebasestorage.app',
  messagingSenderId: '267076712674',
  appId: '1:267076712674:web:4d2872f56d8aff504dc6bb'
});

const db = getFirestore(app);

async function emergencyDataRecovery() {
  console.log('🚨 RECUPERAÇÃO EMERGENCIAL DE DADOS\n');
  console.log('='  .repeat(70) + '\n');

  try {
    // 1. VERIFICAR SUBCOLEÇÃO oldData
    console.log('📂 ETAPA 1: Verificando subcoleção oldData nos estudantes...\n');

    const studentsRef = collection(db, 'students');
    const studentsSnap = await getDocs(studentsRef);

    let foundInOldData = 0;
    let samplesOldData = [];

    for (const studentDoc of studentsSnap.docs.slice(0, 10)) {
      const studentData = studentDoc.data();

      // Verificar subcoleção oldData
      const oldDataRef = collection(db, 'students', studentDoc.id, 'oldData');
      const oldDataSnap = await getDocs(oldDataRef);

      if (!oldDataSnap.empty) {
        foundInOldData++;

        oldDataSnap.forEach(oldDoc => {
          const oldData = oldDoc.data();

          if (oldData.matricula || oldData.email || oldData.dataNascimento || oldData.endereco) {
            samplesOldData.push({
              estudanteId: studentDoc.id,
              estudanteNome: studentData.nome,
              oldDataId: oldDoc.id,
              matricula: oldData.matricula || 'N/A',
              email: oldData.email || 'N/A',
              dataNascimento: oldData.dataNascimento || 'N/A',
              endereco: oldData.endereco ? 'TEM' : 'N/A'
            });
          }
        });
      }

      // Verificar documento específico migratedData
      const migratedRef = doc(db, 'students', studentDoc.id, 'oldData', 'migratedData');
      const migratedSnap = await getDoc(migratedRef);

      if (migratedSnap.exists()) {
        const migData = migratedSnap.data();

        if (migData.matricula || migData.email || migData.dataNascimento || migData.endereco) {
          samplesOldData.push({
            estudanteId: studentDoc.id,
            estudanteNome: studentData.nome,
            oldDataId: 'migratedData',
            matricula: migData.matricula || 'N/A',
            email: migData.email || 'N/A',
            dataNascimento: migData.dataNascimento || 'N/A',
            endereco: migData.endereco ? 'TEM' : 'N/A'
          });
        }
      }
    }

    console.log(`✅ Estudantes com subcoleção oldData: ${foundInOldData}`);
    if (samplesOldData.length > 0) {
      console.log('\n🎉 DADOS ENCONTRADOS EM oldData:');
      console.log(JSON.stringify(samplesOldData, null, 2));
    } else {
      console.log('❌ Nenhum dado encontrado em oldData\n');
    }

    // 2. VERIFICAR CAMPO migratedFrom
    console.log('\n' + '='  .repeat(70));
    console.log('📂 ETAPA 2: Rastreando dados via migratedFrom...\n');

    let foundViaReference = 0;
    const samplesReference = [];

    for (const studentDoc of studentsSnap.docs.slice(0, 10)) {
      const studentData = studentDoc.data();

      if (studentData.migratedFrom) {
        console.log(`🔍 Estudante ${studentData.nome} foi migrado de: ${studentData.migratedFrom}`);
        foundViaReference++;

        samplesReference.push({
          estudanteId: studentDoc.id,
          estudanteNome: studentData.nome,
          migratedFrom: studentData.migratedFrom
        });
      }
    }

    console.log(`\n✅ Estudantes com referência migratedFrom: ${foundViaReference}`);
    if (samplesReference.length > 0) {
      console.log('\n📋 Referências encontradas:');
      console.log(JSON.stringify(samplesReference, null, 2));
    }

    // 3. BUSCAR COLEÇÕES DE BACKUP
    console.log('\n' + '='  .repeat(70));
    console.log('📂 ETAPA 3: Procurando coleções de backup...\n');

    const possibleBackupCollections = [
      'backups',
      'backup_students',
      'students_backup',
      'old_students',
      'students_old',
      'migration_backup',
      'pre_migration',
      'estudantes_backup',
      'backup_2025'
    ];

    for (const collName of possibleBackupCollections) {
      try {
        const backupRef = collection(db, collName);
        const backupSnap = await getDocs(backupRef);

        if (!backupSnap.empty) {
          console.log(`\n✅ COLEÇÃO ENCONTRADA: ${collName} (${backupSnap.size} documentos)`);

          const firstDoc = backupSnap.docs[0].data();
          console.log('  Campos disponíveis:', Object.keys(firstDoc).join(', '));

          if (firstDoc.matricula || firstDoc.email || firstDoc.dataNascimento) {
            console.log('  🎉 CONTÉM DADOS COMPLETOS!');
          }
        }
      } catch (error) {
        // Silenciar erros de permissão
      }
    }

  } catch (error) {
    console.error('❌ ERRO:', error);
  }

  process.exit(0);
}

emergencyDataRecovery();
