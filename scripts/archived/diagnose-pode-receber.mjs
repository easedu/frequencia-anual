/**
 * Script para diagnosticar o campo podeReceberMensagem nos contatos
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

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

async function diagnoseContacts() {
  console.log('🔍 DIAGNÓSTICO: Campo podeReceberMensagem\n');
  console.log('='.repeat(80));

  try {
    // Buscar todos os estudantes
    const studentsRef = collection(db, 'students');
    const studentsSnap = await getDocs(studentsRef);

    console.log(`\n📊 Total de estudantes: ${studentsSnap.size}\n`);

    let totalContacts = 0;
    let contactsWithField = 0;
    let contactsWithoutField = 0;
    let contactsWithTrue = 0;
    let contactsWithFalse = 0;

    // Analisar primeiros 5 estudantes em detalhes
    let count = 0;
    for (const studentDoc of studentsSnap.docs) {
      if (count < 5) {
        console.log(`\n👤 Estudante: ${studentDoc.data().nome} (ID: ${studentDoc.id})`);

        const contactsRef = collection(db, 'students', studentDoc.id, 'contacts');
        const contactsSnap = await getDocs(contactsRef);

        console.log(`   Contatos: ${contactsSnap.size}`);

        contactsSnap.docs.forEach((contactDoc, index) => {
          const contactData = contactDoc.data();
          console.log(`   📞 Contato ${index + 1} (${contactDoc.id}):`);
          console.log(`      Nome: ${contactData.nome || 'N/A'}`);
          console.log(`      Telefone: ${contactData.telefone || 'N/A'}`);
          console.log(`      Parentesco: ${contactData.parentesco || 'N/A'}`);
          console.log(`      podeReceberMensagem: ${contactData.podeReceberMensagem}`);
          console.log(`      Tipo: ${typeof contactData.podeReceberMensagem}`);
          console.log(`      Todos os campos:`, Object.keys(contactData));
        });

        count++;
      }

      // Estatísticas gerais
      const contactsRef = collection(db, 'students', studentDoc.id, 'contacts');
      const contactsSnap = await getDocs(contactsRef);

      contactsSnap.docs.forEach((contactDoc) => {
        totalContacts++;
        const contactData = contactDoc.data();

        if ('podeReceberMensagem' in contactData) {
          contactsWithField++;
          if (contactData.podeReceberMensagem === true) {
            contactsWithTrue++;
          } else if (contactData.podeReceberMensagem === false) {
            contactsWithFalse++;
          }
        } else {
          contactsWithoutField++;
        }
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📈 ESTATÍSTICAS GERAIS:');
    console.log(`   Total de contatos: ${totalContacts}`);
    console.log(`   Com campo 'podeReceberMensagem': ${contactsWithField} (${((contactsWithField/totalContacts)*100).toFixed(2)}%)`);
    console.log(`   Sem campo 'podeReceberMensagem': ${contactsWithoutField} (${((contactsWithoutField/totalContacts)*100).toFixed(2)}%)`);
    console.log(`   Com valor TRUE: ${contactsWithTrue} (${((contactsWithTrue/totalContacts)*100).toFixed(2)}%)`);
    console.log(`   Com valor FALSE: ${contactsWithFalse} (${((contactsWithFalse/totalContacts)*100).toFixed(2)}%)`);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

diagnoseContacts();
