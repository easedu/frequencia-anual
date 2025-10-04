/**
 * CHECK MIGRATION STATE
 * Verifica estado atual da migração V2 -> V3
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

async function checkState() {
  console.log('\n' + '═'.repeat(60));
  console.log('  ESTADO ATUAL DA MIGRAÇÃO V2 → V3');
  console.log('═'.repeat(60) + '\n');

  // Check V2
  const v2Ref = collection(db, '2025', 'escola', 'students');
  const v2Snap = await getDocs(v2Ref);
  console.log(`📊 V2 (2025/escola/students): ${v2Snap.size} estudantes`);

  // Check V3
  const v3Ref = collection(db, 'students');
  const v3Snap = await getDocs(v3Ref);
  console.log(`📊 V3 (students): ${v3Snap.size} estudantes`);

  // Count V3 contacts
  let totalContacts = 0;
  for (const doc of v3Snap.docs) {
    const contactsRef = collection(db, 'students', doc.id, 'contacts');
    const contactsSnap = await getDocs(contactsRef);
    totalContacts += contactsSnap.size;
  }
  console.log(`📊 V3 Contatos: ${totalContacts}`);

  // Calculate migration status
  const migrationPercentage = v2Snap.size > 0 ? ((v3Snap.size / v2Snap.size) * 100).toFixed(1) : 0;
  console.log(`\n📈 Progresso da migração: ${migrationPercentage}%`);
  console.log(`📝 Faltam migrar: ${v2Snap.size - v3Snap.size} estudantes\n`);

  console.log('═'.repeat(60) + '\n');
}

checkState()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
  });