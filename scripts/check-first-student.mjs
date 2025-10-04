import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore';

const app = initializeApp({
  projectId: 'frequencia-anual',
});

const db = getFirestore(app);

async function checkFirstStudent() {
  console.log('🔍 Verificando primeiro estudante com dados completos...\n');

  try {
    // Buscar estudante com matrícula
    const withMatricula = await getDocs(
      query(collection(db, 'students'), where('matricula', '!=', null), limit(1))
    );
    
    if (!withMatricula.empty) {
      const doc = withMatricula.docs[0];
      const data = doc.data();
      console.log('📋 ESTUDANTE COM MATRÍCULA:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Nenhum estudante tem matrícula cadastrada!');
    }

  } catch (error) {
    console.error('Erro:', error.message);
  }

  process.exit(0);
}

checkFirstStudent();
