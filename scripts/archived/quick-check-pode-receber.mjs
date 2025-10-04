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

async function check() {
  const studentsRef = collection(db, 'students');
  const studentsSnap = await getDocs(query(studentsRef, limit(5)));

  for (const studentDoc of studentsSnap.docs) {
    console.log(`\n👤 ${studentDoc.data().nome}:`);
    const contactsRef = collection(db, 'students', studentDoc.id, 'contacts');
    const contactsSnap = await getDocs(contactsRef);

    contactsSnap.docs.forEach(doc => {
      const d = doc.data();
      console.log(`  - ${d.nome}: podeReceberWhatsapp = ${d.podeReceberWhatsapp} (${typeof d.podeReceberWhatsapp})`);
    });
  }
}

check();
