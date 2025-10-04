import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const db = getFirestore(app);

async function diagnose() {
  console.log('🔍 Verificando estrutura de dados WhatsApp nos contatos\n');

  const studentsRef = collection(db, 'students');
  const studentsSnap = await getDocs(query(studentsRef, limit(10)));

  for (const studentDoc of studentsSnap.docs) {
    const contactsRef = collection(db, 'students', studentDoc.id, 'contacts');
    const contactsSnap = await getDocs(contactsRef);

    if (contactsSnap.size > 0) {
      console.log(`\n👤 ${studentDoc.data().nome}:`);
      contactsSnap.docs.forEach(doc => {
        const d = doc.data();
        console.log(`  📞 ${d.nome}:`);
        console.log(`     - telefone: ${d.telefone}`);
        console.log(`     - podeReceberWhatsapp: ${d.podeReceberWhatsapp}`);
        console.log(`     - whatsapp:`, d.whatsapp);
        console.log(`     - Todos os campos:`, Object.keys(d));
      });
      break; // Apenas 1 estudante com contatos
    }
  }
}

diagnose();
