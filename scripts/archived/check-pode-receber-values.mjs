/**
 * Script para verificar os valores do campo podeReceberWhatsapp
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkValues() {
  console.log('🔍 Verificando valores de podeReceberWhatsapp\n');

  const studentsRef = collection(db, 'students');
  const studentsSnap = await getDocs(studentsRef);

  let withField = 0;
  let withoutField = 0;
  let withTrue = 0;
  let withFalse = 0;

  let count = 0;
  for (const studentDoc of studentsSnap.docs) {
    const contactsRef = collection(db, 'students', studentDoc.id, 'contacts');
    const contactsSnap = await getDocs(contactsRef);

    contactsSnap.docs.forEach((contactDoc) => {
      const data = contactDoc.data();

      if (count < 10) {
        console.log(`Contato: ${data.nome}, podeReceberWhatsapp:`, data.podeReceberWhatsapp, `(type: ${typeof data.podeReceberWhatsapp})`);
        count++;
      }

      if ('podeReceberWhatsapp' in data) {
        withField++;
        if (data.podeReceberWhatsapp === true) withTrue++;
        if (data.podeReceberWhatsapp === false) withFalse++;
      } else {
        withoutField++;
      }
    });
  }

  console.log('\n📊 ESTATÍSTICAS:');
  console.log(`   Com campo: ${withField}`);
  console.log(`   Sem campo: ${withoutField}`);
  console.log(`   Valor TRUE: ${withTrue}`);
  console.log(`   Valor FALSE: ${withFalse}`);
}

checkValues();
