import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCmUo0UtaYnGjCPdCIuNbKJgFKBWPJv5yY',
  authDomain: 'frequencia-anual.firebaseapp.com',
  projectId: 'frequencia-anual',
  storageBucket: 'frequencia-anual.firebasestorage.app',
  messagingSenderId: '267076712674',
  appId: '1:267076712674:web:4d2872f56d8aff504dc6bb'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function diagnoseTableData() {
  console.log('🔍 Diagnosticando dados dos estudantes...\n');

  try {
    const studentsRef = collection(db, 'students');
    const studentsQuery = query(studentsRef, limit(5));
    const studentsSnap = await getDocs(studentsQuery);

    console.log(`📊 Total de estudantes analisados: ${studentsSnap.size}\n`);

    studentsSnap.forEach((doc, index) => {
      const data = doc.data();
      
      console.log(`\n========== ESTUDANTE ${index + 1} ==========`);
      console.log(`ID: ${doc.id}`);
      console.log(`Nome: ${data.nome || 'N/A'}`);
      console.log(`Matrícula: ${data.matricula || 'NÃO TEM'}`);
      console.log(`Data Nascimento: ${data.dataNascimento || 'NÃO TEM'}`);
      console.log(`Email: ${data.email || 'NÃO TEM'}`);
      console.log(`Turma: ${data.turma || 'N/A'}`);
      console.log(`Turno: ${data.turno || 'N/A'}`);
      
      if (data.endereco) {
        console.log('Endereço:');
        console.log(`  Rua: ${data.endereco.rua || 'N/A'}`);
        console.log(`  Número: ${data.endereco.numero || 'N/A'}`);
        console.log(`  Bairro: ${data.endereco.bairro || 'N/A'}`);
        console.log(`  Cidade: ${data.endereco.cidade || 'N/A'}`);
        console.log(`  CEP: ${data.endereco.cep || 'N/A'}`);
      } else {
        console.log('Endereço: NÃO TEM');
      }
      
      console.log('\nCampos disponíveis no documento:');
      console.log(Object.keys(data).sort().join(', '));
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  }

  process.exit(0);
}

diagnoseTableData();
