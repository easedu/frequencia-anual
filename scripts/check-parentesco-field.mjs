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

async function checkParentescoField() {
  console.log('🔍 Verificando campo parentesco nos contatos...\n');

  try {
    const studentsRef = collection(db, 'students');
    const studentsQuery = query(studentsRef, limit(5));
    const studentsSnap = await getDocs(studentsQuery);

    for (const studentDoc of studentsSnap.docs) {
      const studentData = studentDoc.data();
      console.log(`\n📚 Estudante: ${studentData.nome}`);

      const contactsRef = collection(db, 'students', studentDoc.id, 'contacts');
      const contactsSnap = await getDocs(contactsRef);

      console.log(`   📞 Contatos: ${contactsSnap.size}\n`);

      contactsSnap.forEach((contactDoc) => {
        const contactData = contactDoc.data();
        console.log(`   - Nome: ${contactData.nome}`);
        console.log(`     Telefone: ${contactData.telefone || 'N/A'}`);
        console.log(`     Parentesco: ${contactData.parentesco || 'NÃO TEM'}`);
        console.log(`     Campos disponíveis:`, Object.keys(contactData).join(', '));
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }

  process.exit(0);
}

checkParentescoField();
