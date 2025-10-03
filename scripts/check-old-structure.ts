/**
 * Script para verificar dados da estrutura antiga
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCmUo0UtaYnGjCPdCIuNbKJgFKBWPJv5yY',
  authDomain: 'frequencia-anual.firebaseapp.com',
  projectId: 'frequencia-anual',
  storageBucket: 'frequencia-anual.firebasestorage.app',
  messagingSenderId: '267076712674',
  appId: '1:267076712674:web:4d2872f56d8aff504dc6bb'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function main() {
  // Autenticar
  await signInWithEmailAndPassword(auth, 'api_habib_kyrillos@email.com', 'qlJiif@x3a3H3O!%1nQ6X$Bm1M');
  console.log('✅ Autenticado\n');

  // Buscar AGATHA SANTANA ARAUJO da estrutura antiga
  const docRef = doc(db, '2025', 'lista_de_estudantes');
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    console.log('❌ Documento não encontrado');
    return;
  }

  const data = docSnap.data();
  const estudantes = data.estudantes || [];

  const agatha = estudantes.find((e: any) => e.estudanteId === 'b2e1a215-5640-4c09-aba8-131af8857236');

  if (!agatha) {
    console.log('❌ AGATHA não encontrada');
    return;
  }

  console.log('📝 AGATHA SANTANA ARAUJO (estrutura antiga):');
  console.log(JSON.stringify({
    nome: agatha.nome,
    estudanteId: agatha.estudanteId,
    contatos: agatha.contatos
  }, null, 2));
}

main().catch(console.error);
