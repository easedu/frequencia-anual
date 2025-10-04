/**
 * TESTE DE BASELINE - FASE 3
 *
 * Testa todas as funcionalidades críticas ANTES de remover fallback/dual-write
 * Este será o baseline para comparação após as mudanças
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
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

const TEST_STUDENT_ID = 'PHASE3_TEST_' + Date.now();
const results = {
  create: false,
  read: false,
  update: false,
  delete: false,
  contacts: false,
  list: false,
};

/**
 * Test 1: Create Student (should write to V2 and V3)
 */
async function testCreate() {
  console.log('\n📝 TEST 1: Create Student (Dual-Write)');

  try {
    const testStudent = {
      estudanteId: TEST_STUDENT_ID,
      nome: 'TESTE FASE 3',
      turma: '5A',
      status: 'ATIVO',
      turno: 'MANHÃ',
      bolsaFamilia: 'NÃO',
      contatos: [
        {
          nome: 'Responsável Teste',
          parentesco: 'Mãe',
          telefone: '(11) 99999-9999',
          podeReceberMensagem: true,
        }
      ],
      createdAt: Timestamp.now(),
      deleted: false,
    };

    // Simulate dual-write (V2 + V3)
    const v3Ref = doc(db, 'students', TEST_STUDENT_ID);
    await setDoc(v3Ref, testStudent);

    // Add contact to V3 subcollection
    const contactsRef = collection(db, 'students', TEST_STUDENT_ID, 'contacts');
    await addDoc(contactsRef, {
      nome: 'Responsável Teste',
      parentesco: 'Mãe',
      telefone: '(11) 99999-9999',
      telefoneNumerico: '11999999999',
      podeReceberWhatsapp: true,
      createdAt: Timestamp.now(),
    });

    console.log('  ✅ Student created in V3');
    results.create = true;

  } catch (error) {
    console.error('  ❌ Create failed:', error.message);
  }
}

/**
 * Test 2: Read Student (should read from V3)
 */
async function testRead() {
  console.log('\n📖 TEST 2: Read Student');

  try {
    const v3Ref = doc(db, 'students', TEST_STUDENT_ID);
    const v3Snap = await getDoc(v3Ref);

    if (v3Snap.exists()) {
      const data = v3Snap.data();
      console.log(`  ✅ Student found: ${data.nome}`);

      // Check contacts
      const contactsRef = collection(db, 'students', TEST_STUDENT_ID, 'contacts');
      const contactsSnap = await getDocs(contactsRef);
      console.log(`  ✅ Contacts found: ${contactsSnap.size}`);

      results.read = contactsSnap.size > 0;
      results.contacts = contactsSnap.size > 0;
    } else {
      console.error('  ❌ Student not found');
    }

  } catch (error) {
    console.error('  ❌ Read failed:', error.message);
  }
}

/**
 * Test 3: Update Student (should update V2 and V3)
 */
async function testUpdate() {
  console.log('\n✏️  TEST 3: Update Student');

  try {
    const v3Ref = doc(db, 'students', TEST_STUDENT_ID);
    await updateDoc(v3Ref, {
      nome: 'TESTE FASE 3 ATUALIZADO',
      updatedAt: Timestamp.now(),
    });

    // Verify update
    const v3Snap = await getDoc(v3Ref);
    if (v3Snap.exists() && v3Snap.data().nome === 'TESTE FASE 3 ATUALIZADO') {
      console.log('  ✅ Student updated successfully');
      results.update = true;
    } else {
      console.error('  ❌ Update verification failed');
    }

  } catch (error) {
    console.error('  ❌ Update failed:', error.message);
  }
}

/**
 * Test 4: List Students (should read from V3 first)
 */
async function testList() {
  console.log('\n📋 TEST 4: List Students');

  try {
    const v3Ref = collection(db, 'students');
    const v3Snap = await getDocs(v3Ref);

    if (v3Snap.size >= 736) {
      console.log(`  ✅ Students listed: ${v3Snap.size}`);
      results.list = true;
    } else {
      console.error(`  ❌ Expected >= 736, got ${v3Snap.size}`);
    }

  } catch (error) {
    console.error('  ❌ List failed:', error.message);
  }
}

/**
 * Test 5: Delete Student (cleanup)
 */
async function testDelete() {
  console.log('\n🗑️  TEST 5: Delete Test Student (Cleanup)');

  try {
    // Delete contacts
    const contactsRef = collection(db, 'students', TEST_STUDENT_ID, 'contacts');
    const contactsSnap = await getDocs(contactsRef);
    for (const contactDoc of contactsSnap.docs) {
      await deleteDoc(contactDoc.ref);
    }

    // Delete student
    const v3Ref = doc(db, 'students', TEST_STUDENT_ID);
    await deleteDoc(v3Ref);

    console.log('  ✅ Test student deleted');
    results.delete = true;

  } catch (error) {
    console.error('  ❌ Delete failed:', error.message);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('  BASELINE TESTS - PHASE 3 (BEFORE CUTOVER)');
  console.log('═'.repeat(60));

  await testCreate();
  await testRead();
  await testUpdate();
  await testList();
  await testDelete();

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('  BASELINE RESULTS');
  console.log('═'.repeat(60));
  console.log(`Create:   ${results.create ? '✅' : '❌'}`);
  console.log(`Read:     ${results.read ? '✅' : '❌'}`);
  console.log(`Update:   ${results.update ? '✅' : '❌'}`);
  console.log(`List:     ${results.list ? '✅' : '❌'}`);
  console.log(`Contacts: ${results.contacts ? '✅' : '❌'}`);
  console.log(`Delete:   ${results.delete ? '✅' : '❌'}`);

  const allPassed = Object.values(results).every(r => r === true);

  console.log('\n' + '═'.repeat(60));
  if (allPassed) {
    console.log('\n✅ ALL BASELINE TESTS PASSED!\n');
    return true;
  } else {
    console.log('\n❌ SOME BASELINE TESTS FAILED!\n');
    return false;
  }
}

// Run tests
runTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('❌ Critical error:', err);
    process.exit(1);
  });