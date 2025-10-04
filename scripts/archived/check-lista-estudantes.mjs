import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCmUo0UtaYnGjCPdCIuNbKJgFKBWPJv5yY',
  authDomain: 'frequencia-anual.firebaseapp.com',
  projectId: 'frequencia-anual',
  storageBucket: 'frequencia-anual.firebasestorage.app',
  messagingSenderId: '267076712674',
  appId: '1:267076712674:web:4d2872f56d8aff504dc6bb'
});

const db = getFirestore(app);

async function checkListaEstudantes() {
  console.log('🔍 VERIFICANDO COLEÇÃO: lista_de_estudantes\n');
  console.log('='  .repeat(70) + '\n');

  try {
    const ref = collection(db, 'lista_de_estudantes');
    const q = query(ref, limit(5));
    const snap = await getDocs(q);

    console.log(`📊 Total de documentos encontrados: ${snap.size}\n`);

    if (snap.empty) {
      console.log('❌ Coleção vazia ou não existe!');
      return;
    }

    snap.forEach((doc, index) => {
      const data = doc.data();

      console.log(`\n--- ESTUDANTE ${index + 1} ---`);
      console.log(`ID: ${doc.id}`);
      console.log(`Nome: ${data.nome || 'N/A'}`);
      console.log(`Matrícula: ${data.matricula || 'N/A'}`);
      console.log(`Email: ${data.email || 'N/A'}`);
      console.log(`Data Nascimento: ${data.dataNascimento || 'N/A'}`);
      console.log(`Endereço: ${data.endereco ? JSON.stringify(data.endereco) : 'N/A'}`);
      console.log(`Turma: ${data.turma || 'N/A'}`);
      console.log(`Turno: ${data.turno || 'N/A'}`);

      console.log('\n📋 Campos disponíveis:');
      console.log(Object.keys(data).sort().join(', '));
    });

    // Estatísticas
    console.log('\n' + '='  .repeat(70));
    console.log('\n📊 ESTATÍSTICAS GERAIS:\n');

    const allDocs = await getDocs(ref);

    let withMatricula = 0;
    let withEmail = 0;
    let withDataNasc = 0;
    let withEndereco = 0;

    allDocs.forEach(doc => {
      const d = doc.data();
      if (d.matricula && d.matricula !== '') withMatricula++;
      if (d.email && d.email !== '') withEmail++;
      if (d.dataNascimento && d.dataNascimento !== '') withDataNasc++;
      if (d.endereco) withEndereco++;
    });

    console.log(`Total de documentos: ${allDocs.size}`);
    console.log(`Com matrícula: ${withMatricula}`);
    console.log(`Com email: ${withEmail}`);
    console.log(`Com data nascimento: ${withDataNasc}`);
    console.log(`Com endereço: ${withEndereco}`);

    if (withMatricula > 0 || withEmail > 0 || withDataNasc > 0 || withEndereco > 0) {
      console.log('\n🎉 DADOS ENCONTRADOS! Podemos recuperá-los!');
    } else {
      console.log('\n❌ Dados não estão nesta coleção também...');
    }

  } catch (error) {
    console.error('❌ ERRO:', error.message);
  }

  process.exit(0);
}

checkListaEstudantes();
