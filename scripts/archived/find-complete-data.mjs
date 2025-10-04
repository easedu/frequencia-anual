import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCmUo0UtaYnGjCPdCIuNbKJgFKBWPJv5yY',
  authDomain: 'frequencia-anual.firebaseapp.com',
  projectId: 'frequencia-anual',
  storageBucket: 'frequencia-anual.firebasestorage.app',
  messagingSenderId: '267076712674',
  appId: '1:267076712674:web:4d2872f56d8aff504dc6bb'
});

const db = getFirestore(app);

async function findCompleteData() {
  const ref = collection(db, 'students');

  const all = await getDocs(ref);

  let withMatricula = 0;
  let withEmail = 0;
  let withDataNasc = 0;
  let withEndereco = 0;

  const samples = [];

  all.docs.forEach(doc => {
    const d = doc.data();
    if (d.matricula && d.matricula !== '') withMatricula++;
    if (d.email && d.email !== '') withEmail++;
    if (d.dataNascimento && d.dataNascimento !== '') withDataNasc++;
    if (d.endereco) withEndereco++;

    if (d.matricula || d.email || d.dataNascimento || d.endereco) {
      samples.push({
        id: doc.id,
        nome: d.nome,
        matricula: d.matricula || 'N/A',
        email: d.email || 'N/A',
        dataNascimento: d.dataNascimento || 'N/A',
        endereco: d.endereco ? 'TEM' : 'N/A'
      });
    }
  });

  console.log('📊 ESTATÍSTICAS:');
  console.log(`Total estudantes: ${all.size}`);
  console.log(`Com matrícula: ${withMatricula}`);
  console.log(`Com email: ${withEmail}`);
  console.log(`Com data nascimento: ${withDataNasc}`);
  console.log(`Com endereço: ${withEndereco}`);
  console.log(`\n📝 AMOSTRAS (primeiros 10 com dados):`);
  console.log(JSON.stringify(samples.slice(0, 10), null, 2));

  process.exit(0);
}

findCompleteData();
