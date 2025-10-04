/**
 * Validar que a correção funcionou
 * Query EXATA do StudentDataService deve retornar 736 estudantes
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs
} from 'firebase/firestore';

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

console.log('\n════════════════════════════════════════════════════════════');
console.log('  VALIDAÇÃO DA CORREÇÃO');
console.log('════════════════════════════════════════════════════════════\n');

async function validate() {
  try {
    // Query EXATA usada pelo StudentDataService
    const studentsRef = collection(db, 'students');
    const q = query(
      studentsRef,
      where('deleted', '==', false),
      orderBy('nome')
    );

    console.log('🔍 Executando query do StudentDataService:');
    console.log('   collection: students');
    console.log('   where: deleted == false');
    console.log('   orderBy: nome\n');

    const snapshot = await getDocs(q);

    console.log('📊 RESULTADO:');
    console.log(`   Total de estudantes: ${snapshot.size}\n`);

    if (snapshot.size === 736) {
      console.log('✅ SUCESSO! Todos os 736 estudantes aparecem na query!');
      console.log('\n📄 Primeiros 5 estudantes:');
      snapshot.docs.slice(0, 5).forEach((doc, i) => {
        const data = doc.data();
        console.log(`   ${i + 1}. ${data.nome}`);
      });
      console.log('\n📄 Últimos 5 estudantes:');
      snapshot.docs.slice(-5).forEach((doc, i) => {
        const data = doc.data();
        console.log(`   ${snapshot.size - 4 + i}. ${data.nome}`);
      });
    } else if (snapshot.size === 1) {
      console.log('❌ AINDA COM PROBLEMA! Apenas 1 estudante retornado');
      const data = snapshot.docs[0].data();
      console.log(`   Estudante: ${data.nome}`);
    } else {
      console.log(`⚠️  Número inesperado: ${snapshot.size} estudantes`);
    }

    // Verificar se STHEPHANY está lá
    const sthephany = snapshot.docs.find(doc =>
      doc.data().nome?.toUpperCase().includes('STHEPHANY')
    );
    console.log(`\n🔍 STHEPHANY na lista: ${sthephany ? '✅ Sim' : '❌ Não'}`);

    // Verificar se outros estudantes estão lá
    const kaue = snapshot.docs.find(doc =>
      doc.data().nome?.toUpperCase().includes('KAUE GABRIEL')
    );
    console.log(`🔍 KAUE GABRIEL na lista: ${kaue ? '✅ Sim' : '❌ Não'}`);

  } catch (error) {
    console.error('❌ Erro na query:', error.message);
    if (error.message.includes('index')) {
      console.log('\n💡 PROBLEMA: Falta criar índice composto no Firestore!');
      console.log('   Campos: deleted (ascending) + nome (ascending)');
      console.log('\n   URL para criar: https://console.firebase.google.com/project/frequencia-anual/firestore/indexes');
    }
  }
}

validate()
  .then(() => {
    console.log('\n════════════════════════════════════════════════════════════\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });