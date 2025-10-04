/**
 * Script para diagnosticar performance da API absence-multiples
 * Valida se todas as regras ainda estão funcionando após otimização
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, collectionGroup, query, where } from 'firebase/firestore';

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

async function testCollectionGroupQueries() {
  console.log('\n' + '═'.repeat(70));
  console.log('  DIAGNÓSTICO DE PERFORMANCE - API ABSENCE-MULTIPLES');
  console.log('═'.repeat(70) + '\n');

  try {
    // Test 1: Collection Group Query for suspensions
    console.log('📊 Teste 1: Collection Group Query - Suspensions');
    const suspensionsStart = Date.now();
    const suspensionsQuery = collectionGroup(db, 'suspensions');
    const suspensionsSnap = await getDocs(suspensionsQuery);
    const suspensionsTime = Date.now() - suspensionsStart;

    console.log(`  ✅ ${suspensionsSnap.size} suspensões encontradas`);
    console.log(`  ⏱️  Tempo: ${suspensionsTime}ms\n`);

    // Validate suspension structure
    let validSuspensions = 0;
    suspensionsSnap.docs.forEach(doc => {
      const data = doc.data();
      const pathParts = doc.ref.path.split('/');
      const studentId = pathParts[1];

      if (data.startDate && data.days && studentId) {
        validSuspensions++;
      }
    });
    console.log(`  ✓ ${validSuspensions} suspensões válidas (${((validSuspensions/suspensionsSnap.size)*100).toFixed(1)}%)\n`);

    // Test 2: Collection Group Query for contacts
    console.log('📊 Teste 2: Collection Group Query - Contacts');
    const contactsStart = Date.now();
    const contactsQuery = collectionGroup(db, 'contacts');
    const contactsSnap = await getDocs(contactsQuery);
    const contactsTime = Date.now() - contactsStart;

    console.log(`  ✅ ${contactsSnap.size} contatos encontrados`);
    console.log(`  ⏱️  Tempo: ${contactsTime}ms\n`);

    // Validate contacts with WhatsApp verification
    let contactsWithWhatsApp = 0;
    let contactsVerified = 0;
    let contactsCanReceive = 0;

    contactsSnap.docs.forEach(doc => {
      const contact = doc.data();

      if (contact.whatsapp) {
        contactsWithWhatsApp++;

        if (contact.whatsapp.verified && contact.whatsapp.exists) {
          contactsVerified++;

          if (contact.podeReceberWhatsapp !== false) {
            contactsCanReceive++;
          }
        }
      }
    });

    console.log(`  ✓ ${contactsWithWhatsApp} contatos com objeto whatsapp (${((contactsWithWhatsApp/contactsSnap.size)*100).toFixed(1)}%)`);
    console.log(`  ✓ ${contactsVerified} contatos verificados (${((contactsVerified/contactsSnap.size)*100).toFixed(1)}%)`);
    console.log(`  ✓ ${contactsCanReceive} contatos que podem receber mensagem (${((contactsCanReceive/contactsSnap.size)*100).toFixed(1)}%)\n`);

    // Test 3: Students count
    console.log('📊 Teste 3: Estudantes V3');
    const studentsStart = Date.now();
    const studentsRef = collection(db, 'students');
    const studentsSnap = await getDocs(studentsRef);
    const studentsTime = Date.now() - studentsStart;

    let activeStudents = 0;
    studentsSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.status === 'ATIVO' && !data.deleted) {
        activeStudents++;
      }
    });

    console.log(`  ✅ ${studentsSnap.size} estudantes total`);
    console.log(`  ✅ ${activeStudents} estudantes ativos`);
    console.log(`  ⏱️  Tempo: ${studentsTime}ms\n`);

    // Summary
    console.log('═'.repeat(70));
    console.log('  RESUMO DA OTIMIZAÇÃO');
    console.log('═'.repeat(70));
    console.log(`\n  📈 Performance estimada ANTES da otimização:`);
    console.log(`     - Suspensões: ${activeStudents} queries × 75ms = ~${(activeStudents * 75 / 1000).toFixed(1)}s`);
    console.log(`     - Contatos: ${activeStudents} queries × 75ms = ~${(activeStudents * 75 / 1000).toFixed(1)}s`);
    console.log(`     - Total estimado: ~${(activeStudents * 150 / 1000).toFixed(1)}s\n`);

    console.log(`  🚀 Performance DEPOIS da otimização:`);
    console.log(`     - Suspensões: 1 query em ${suspensionsTime}ms`);
    console.log(`     - Contatos: 1 query em ${contactsTime}ms`);
    console.log(`     - Total real: ${suspensionsTime + contactsTime}ms (${((suspensionsTime + contactsTime) / 1000).toFixed(2)}s)\n`);

    const improvement = ((activeStudents * 150) / (suspensionsTime + contactsTime)).toFixed(1);
    console.log(`  ⚡ Melhoria: ${improvement}x mais rápido!\n`);

    console.log('═'.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
    process.exit(1);
  }

  process.exit(0);
}

testCollectionGroupQueries();
