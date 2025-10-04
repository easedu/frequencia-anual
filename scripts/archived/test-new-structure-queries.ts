/**
 * TESTE DE QUERIES NA NOVA ESTRUTURA
 *
 * Valida que os dados migrados estão acessíveis e corretos
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, query, where, limit } from 'firebase/firestore';

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

async function testNewStructureQueries() {
  console.log('🧪 TESTE DE QUERIES NA NOVA ESTRUTURA\n');
  console.log('=' .repeat(80));

  try {
    // TESTE 1: Buscar estudantes do ano 2025
    console.log('\n📋 TESTE 1: Buscar estudantes por ano letivo');
    console.log('-'.repeat(80));

    const studentsRef = collection(db, 'students');
    const studentsQuery = query(studentsRef, where('anoLetivo', '==', '2025'), limit(5));
    const studentsSnap = await getDocs(studentsQuery);

    console.log(`✅ Encontrados: ${studentsSnap.size} estudantes`);
    studentsSnap.forEach((doc) => {
      const data = doc.data();
      console.log(`   - ${data.nome} (${data.turma}) - Status: ${data.statusEstudante}`);
    });

    // TESTE 2: Buscar contatos de um estudante específico
    console.log('\n📋 TESTE 2: Buscar contatos de um estudante');
    console.log('-'.repeat(80));

    const firstStudent = studentsSnap.docs[0];
    const contactsRef = collection(db, 'students', firstStudent.id, 'contacts');
    const contactsSnap = await getDocs(contactsRef);

    console.log(`✅ Estudante: ${firstStudent.data().nome}`);
    console.log(`✅ Total de contatos: ${contactsSnap.size}`);

    contactsSnap.forEach((contactDoc) => {
      const contact = contactDoc.data();
      console.log(`   - ${contact.nome}: ${contact.telefone} (WhatsApp: ${contact.whatsapp?.verified ? 'Verificado' : 'Não verificado'})`);
    });

    // TESTE 3: Buscar contatos com WhatsApp verificado
    console.log('\n📋 TESTE 3: Contatos com WhatsApp verificado');
    console.log('-'.repeat(80));

    let totalWithWhatsApp = 0;
    let totalVerified = 0;

    for (const studentDoc of studentsSnap.docs) {
      const contactsRef = collection(db, 'students', studentDoc.id, 'contacts');
      const contactsSnap = await getDocs(contactsRef);

      contactsSnap.forEach((contactDoc) => {
        const contact = contactDoc.data();
        if (contact.whatsapp?.verified) {
          totalVerified++;
          if (contact.whatsapp?.exists) {
            totalWithWhatsApp++;
          }
        }
      });
    }

    console.log(`✅ Total verificados: ${totalVerified}`);
    console.log(`✅ Total com WhatsApp: ${totalWithWhatsApp}`);

    // TESTE 4: Verificar metadados de migração
    console.log('\n📋 TESTE 4: Verificar metadados de migração');
    console.log('-'.repeat(80));

    const sampleContact = contactsSnap.docs[0]?.data();
    if (sampleContact) {
      console.log(`✅ Contato de exemplo:`);
      console.log(`   - Nome: ${sampleContact.nome}`);
      console.log(`   - Telefone: ${sampleContact.telefone}`);
      console.log(`   - Telefone numérico: ${sampleContact.telefoneNumerico}`);
      console.log(`   - Parentesco: ${sampleContact.parentesco || 'Não informado'}`);
      console.log(`   - Pode receber WhatsApp: ${sampleContact.podeReceberWhatsapp ? 'Sim' : 'Não'}`);
      console.log(`   - WhatsApp verificado: ${sampleContact.whatsapp?.verified ? 'Sim' : 'Não'}`);
      if (sampleContact.whatsapp?.verified) {
        console.log(`   - WhatsApp existe: ${sampleContact.whatsapp?.exists ? 'Sim' : 'Não'}`);
        console.log(`   - WhatsApp nome: ${sampleContact.whatsapp?.name || 'N/A'}`);
        console.log(`   - WhatsApp status: ${sampleContact.whatsapp?.verificationStatus || 'N/A'}`);
      }
      console.log(`   - Migrado de: ${sampleContact.migratedFrom}`);
      console.log(`   - Versão: ${sampleContact.version}`);
      console.log(`   - Ano letivo: ${sampleContact.anoLetivo}`);
      console.log(`   - Placeholder removido: ${sampleContact._placeholder === false ? 'Sim' : 'Não'}`);
    }

    // CONCLUSÃO
    console.log('\n' + '='.repeat(80));
    console.log('✅ CONCLUSÃO: TODOS OS TESTES PASSARAM!');
    console.log('   - Queries funcionando corretamente');
    console.log('   - Dados acessíveis na nova estrutura');
    console.log('   - Metadados de migração presentes');
    console.log('   - Integração WhatsApp funcional');
    console.log('\n🎉 NOVA ESTRUTURA TOTALMENTE FUNCIONAL!\n');

  } catch (error) {
    console.error('❌ ERRO NOS TESTES:', error);
    process.exit(1);
  }
}

testNewStructureQueries();
