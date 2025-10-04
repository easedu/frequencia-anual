#!/usr/bin/env node

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Inicializar Firebase Admin com credenciais do ambiente
const app = initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = getFirestore(app);

async function diagnoseContactIds() {
  console.log('🔍 Diagnosticando IDs de contatos...\n');

  try {
    // Pegar um estudante específico que teve o erro
    const studentId = 'ce5ac93c-bad9-4f82-af87-ffac12eb395f';

    console.log(`📚 Analisando estudante: ${studentId}\n`);

    // 1. Buscar o documento do estudante
    const studentDoc = await db.collection('students').doc(studentId).get();

    if (!studentDoc.exists) {
      console.log('❌ Estudante não encontrado!');
      return;
    }

    const studentData = studentDoc.data();
    console.log('📋 Dados do estudante:', {
      nome: studentData.nome,
      turma: studentData.turma
    });

    // 2. Buscar subcoleção de contatos
    const contactsSnapshot = await db
      .collection('students')
      .doc(studentId)
      .collection('contacts')
      .get();

    console.log(`\n📞 Total de contatos encontrados: ${contactsSnapshot.size}\n`);

    // 3. Listar todos os IDs reais dos documentos
    contactsSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`Contato ${index + 1}:`);
      console.log(`  ID do documento: ${doc.id}`);
      console.log(`  ID esperado: contact_${index + 1}`);
      console.log(`  ✅ Match: ${doc.id === `contact_${index + 1}`}`);
      console.log(`  Nome: ${data.nome}`);
      console.log(`  Telefone: ${data.telefone}`);
      console.log(`  Tem whatsapp field: ${!!data.whatsapp}`);
      if (data.whatsapp) {
        console.log(`  WhatsApp:`, data.whatsapp);
      }
      console.log('');
    });

    // 4. Verificar se há diferença entre contatos no documento vs subcoleção
    const contatosInDoc = studentData.contatos || [];
    console.log(`📋 Contatos no array 'contatos': ${contatosInDoc.length}`);
    console.log(`📁 Contatos na subcoleção: ${contactsSnapshot.size}`);

    if (contatosInDoc.length !== contactsSnapshot.size) {
      console.log('⚠️  ATENÇÃO: Quantidade diferente entre array e subcoleção!');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

diagnoseContactIds();
