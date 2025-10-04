import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

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

async function checkContactStructure() {
  console.log('🔍 Verificando estrutura de contatos...\n');

  try {
    const studentId = 'ce5ac93c-bad9-4f82-af87-ffac12eb395f';

    // 1. Buscar estudante
    const studentRef = doc(db, 'students', studentId);
    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists()) {
      console.log('❌ Estudante não encontrado!');
      return;
    }

    const studentData = studentSnap.data();
    console.log('📋 Estudante:', {
      nome: studentData.nome,
      turma: studentData.turma
    });

    // 2. Buscar subcoleção de contatos
    const contactsRef = collection(db, 'students', studentId, 'contacts');
    const contactsSnap = await getDocs(contactsRef);

    console.log(`\n📞 Total de contatos: ${contactsSnap.size}\n`);

    // 3. Listar IDs reais
    const contacts = [];
    contactsSnap.forEach((doc) => {
      const data = doc.data();
      contacts.push({
        id: doc.id,
        nome: data.nome,
        telefone: data.telefone,
        hasWhatsappField: !!data.whatsapp
      });
    });

    // Ordenar por ID para comparação
    contacts.sort((a, b) => a.id.localeCompare(b.id));

    contacts.forEach((contact, index) => {
      const expectedId = `contact_${index + 1}`;
      const match = contact.id === expectedId;
      
      console.log(`Contato ${index + 1}:`);
      console.log(`  ID real: ${contact.id}`);
      console.log(`  ID esperado (índice): ${expectedId}`);
      console.log(`  ${match ? '✅' : '❌'} Match: ${match}`);
      console.log(`  Nome: ${contact.nome}`);
      console.log(`  Telefone: ${contact.telefone}`);
      console.log(`  Tem campo whatsapp: ${contact.hasWhatsappField}`);
      console.log('');
    });

    // 4. Verificar array de contatos
    const contatosArray = studentData.contatos || [];
    console.log(`\n📊 Resumo:`);
    console.log(`  Array 'contatos' no doc: ${contatosArray.length} itens`);
    console.log(`  Subcoleção 'contacts': ${contactsSnap.size} documentos`);
    
    if (contatosArray.length !== contactsSnap.size) {
      console.log(`  ⚠️  DIFERENÇA DETECTADA!`);
    }

    // 5. Comparar telefones
    console.log(`\n📋 Comparação de telefones:\n`);
    contatosArray.forEach((contato, index) => {
      const expectedId = `contact_${index + 1}`;
      const matchingContact = contacts.find(c => c.id === expectedId);
      
      console.log(`Posição ${index} no array:`);
      console.log(`  Telefone no array: ${contato.telefone}`);
      console.log(`  ID esperado: ${expectedId}`);
      if (matchingContact) {
        console.log(`  ✅ Encontrado na subcoleção: ${matchingContact.telefone}`);
        console.log(`  Match telefone: ${contato.telefone === matchingContact.telefone}`);
      } else {
        console.log(`  ❌ NÃO encontrado na subcoleção com ID ${expectedId}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  }

  process.exit(0);
}

checkContactStructure();
