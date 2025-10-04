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

async function findV2Data() {
  console.log('🚨 BUSCA EMERGENCIAL DE DADOS V2\n');
  console.log('='  .repeat(70) + '\n');

  try {
    // VERIFICAR ESTRUTURA V2: 2025/escola/students
    console.log('📂 Verificando: 2025/escola/students\n');

    const v2Ref = collection(db, '2025', 'escola', 'students');
    const v2Query = query(v2Ref, limit(10));
    const v2Snap = await getDocs(v2Query);

    if (v2Snap.empty) {
      console.log('❌ Coleção vazia ou sem acesso!\n');
    } else {
      console.log(`✅ Encontrados ${v2Snap.size} documentos!\n`);

      v2Snap.forEach((doc, index) => {
        const data = doc.data();

        console.log(`\n--- ESTUDANTE V2 #${index + 1} ---`);
        console.log(`ID: ${doc.id}`);
        console.log(`Nome: ${data.nome}`);
        console.log(`Matrícula: ${data.matricula || 'N/A'}`);
        console.log(`Email: ${data.email || 'N/A'}`);
        console.log(`Data Nascimento: ${data.dataNascimento || 'N/A'}`);
        console.log(`Endereço: ${data.endereco ? 'TEM' : 'N/A'}`);
        console.log(`Turma: ${data.turma}`);

        if (data.endereco) {
          console.log(`Endereço completo:`, JSON.stringify(data.endereco));
        }
      });

      // Estatísticas
      console.log('\n' + '='  .repeat(70));
      console.log('\n📊 ESTATÍSTICAS V2:\n');

      const allV2 = await getDocs(v2Ref);

      let withMatricula = 0;
      let withEmail = 0;
      let withDataNasc = 0;
      let withEndereco = 0;

      allV2.forEach(doc => {
        const d = doc.data();
        if (d.matricula && d.matricula !== '') withMatricula++;
        if (d.email && d.email !== '') withEmail++;
        if (d.dataNascimento && d.dataNascimento !== '') withDataNasc++;
        if (d.endereco) withEndereco++;
      });

      console.log(`Total V2: ${allV2.size}`);
      console.log(`Com matrícula: ${withMatricula}`);
      console.log(`Com email: ${withEmail}`);
      console.log(`Com data nascimento: ${withDataNasc}`);
      console.log(`Com endereço: ${withEndereco}`);

      if (withMatricula > 10 || withDataNasc > 10) {
        console.log('\n🎉🎉🎉 DADOS ENCONTRADOS EM V2! PODEMOS RECUPERAR! 🎉🎉🎉');
      }
    }

  } catch (error) {
    console.error('❌ ERRO:', error.message);

    if (error.message.includes('permission')) {
      console.log('\n⚠️  Sem permissão para acessar 2025/escola/students');
      console.log('   Verifique as regras do Firestore');
    }
  }

  process.exit(0);
}

findV2Data();
