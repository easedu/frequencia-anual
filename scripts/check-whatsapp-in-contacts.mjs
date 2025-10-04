#!/usr/bin/env node

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

async function checkWhatsAppData() {
  console.log('🔍 VERIFICANDO DADOS DE WHATSAPP NOS CONTATOS V3\n');

  const studentsRef = collection(db, 'students');
  const studentsSnap = await getDocs(studentsRef);

  let totalContacts = 0;
  let contactsWithWhatsApp = 0;

  for (const studentDoc of studentsSnap.docs.slice(0, 10)) {
    const contactsRef = collection(db, `students/${studentDoc.id}/contacts`);
    const contactsSnap = await getDocs(contactsRef);

    contactsSnap.docs.forEach(contactDoc => {
      const contact = contactDoc.data();
      totalContacts++;

      if (contact.whatsapp) {
        contactsWithWhatsApp++;
        if (contactsWithWhatsApp === 1) {
          console.log('📞 EXEMPLO DE CONTATO COM WHATSAPP:');
          console.log(JSON.stringify(contact, null, 2));
          console.log();
        }
      }
    });
  }

  console.log('📊 RESULTADO (primeiros 10 estudantes):');
  console.log(`   Total de contatos: ${totalContacts}`);
  console.log(`   Contatos com dados WhatsApp: ${contactsWithWhatsApp}`);
  console.log();

  if (contactsWithWhatsApp > 0) {
    console.log('✅ DADOS DE WHATSAPP JÁ ESTÃO NOS CONTATOS V3!');
    console.log('💡 Podemos eliminar a query whatsapp_verified_numbers');
  } else {
    console.log('❌ Dados de WhatsApp NÃO estão nos contatos V3');
    console.log('⚠️  Precisamos manter a query whatsapp_verified_numbers');
  }

  process.exit(0);
}

checkWhatsAppData().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
