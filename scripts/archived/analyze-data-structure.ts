/**
 * ANÁLISE DE ESTRUTURA DE DADOS - FASE 2
 *
 * Este script analisa as 3 estruturas de dados para mapear a migração:
 * 1. Estrutura antiga: 2025/lista_de_estudantes (array com contatos)
 * 2. WhatsApp verificados: whatsapp_verified_numbers (collection)
 * 3. Nova estrutura: students/{id}/contacts (placeholders)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';

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

async function analyzeDataStructures() {
  console.log('🔍 ANÁLISE DE ESTRUTURAS DE DADOS - FASE 2\n');
  console.log('=' .repeat(80));

  // 1. ESTRUTURA ANTIGA
  console.log('\n📊 1. ESTRUTURA ANTIGA (2025/lista_de_estudantes)');
  console.log('-'.repeat(80));

  const oldStructureRef = doc(db, '2025', 'lista_de_estudantes');
  const oldStructureSnap = await getDoc(oldStructureRef);
  const oldData = oldStructureSnap.data();
  const estudantes = oldData?.estudantes || [];

  // Pegar primeiro estudante com contatos
  const estudanteComContatos = estudantes.find((e: any) => e.contatos && e.contatos.length > 0);

  if (estudanteComContatos) {
    console.log('\nESTUDANTE (exemplo):');
    console.log(JSON.stringify({
      estudanteId: estudanteComContatos.estudanteId,
      nome: estudanteComContatos.nome,
      turma: estudanteComContatos.turma,
      status: estudanteComContatos.status,
      bolsaFamilia: estudanteComContatos.bolsaFamilia,
      turno: estudanteComContatos.turno,
      totalContatos: estudanteComContatos.contatos?.length || 0
    }, null, 2));

    if (estudanteComContatos.contatos && estudanteComContatos.contatos.length > 0) {
      console.log('\nCONTATO (exemplo):');
      console.log(JSON.stringify(estudanteComContatos.contatos[0], null, 2));
    }
  }

  // 2. WHATSAPP VERIFIED NUMBERS
  console.log('\n\n📊 2. WHATSAPP VERIFIED NUMBERS (whatsapp_verified_numbers)');
  console.log('-'.repeat(80));

  const whatsappRef = collection(db, 'whatsapp_verified_numbers');
  const whatsappQuery = query(whatsappRef, limit(1));
  const whatsappSnap = await getDocs(whatsappQuery);

  if (!whatsappSnap.empty) {
    const firstWhatsapp = whatsappSnap.docs[0];
    console.log('\nWHATSAPP VERIFIED (exemplo):');
    console.log(`ID (telefone): ${firstWhatsapp.id}`);
    console.log('Dados:');
    console.log(JSON.stringify(firstWhatsapp.data(), null, 2));
  }

  // 3. NOVA ESTRUTURA (PLACEHOLDER)
  console.log('\n\n📊 3. NOVA ESTRUTURA (students/{id}/contacts) - PLACEHOLDER');
  console.log('-'.repeat(80));

  if (estudanteComContatos) {
    const newStudentRef = doc(db, 'students', estudanteComContatos.estudanteId);
    const newStudentSnap = await getDoc(newStudentRef);

    if (newStudentSnap.exists()) {
      console.log('\nESTUDANTE PLACEHOLDER:');
      console.log(JSON.stringify(newStudentSnap.data(), null, 2));

      // Verificar contatos
      const contactsRef = collection(db, 'students', estudanteComContatos.estudanteId, 'contacts');
      const contactsSnap = await getDocs(contactsRef);

      if (!contactsSnap.empty) {
        console.log('\nCONTATO PLACEHOLDER (exemplo):');
        console.log(JSON.stringify(contactsSnap.docs[0].data(), null, 2));
      }
    }
  }

  // 4. MAPEAMENTO DE CAMPOS
  console.log('\n\n📋 4. MAPEAMENTO DE CAMPOS PARA MIGRAÇÃO');
  console.log('-'.repeat(80));

  console.log(`
ESTRUTURA ANTIGA → NOVA ESTRUTURA:

De: 2025/lista_de_estudantes
    estudantes[i].contatos[j]
Para: students/{estudanteId}/contacts/{contactId}

MAPEAMENTO DE CAMPOS DO CONTATO:
┌─────────────────────────────┬──────────────────────────────────┐
│ Campo Antigo                │ Campo Novo                       │
├─────────────────────────────┼──────────────────────────────────┤
│ nome                        │ nome                             │
│ telefone                    │ telefone                         │
│ telefoneNumerico            │ telefoneNumerico                 │
│ parentesco                  │ parentesco                       │
│ podeReceberWhatsapp         │ podeReceberWhatsapp              │
│ (não existe)                │ whatsapp.verified: false         │
│ (não existe)                │ whatsapp.exists: null            │
│ (não existe)                │ whatsapp.jid: null               │
│ (não existe)                │ whatsapp.name: null              │
│ (não existe)                │ whatsapp.number: null            │
│ (não existe)                │ whatsapp.verifiedAt: null        │
│ (não existe)                │ whatsapp.verificationStatus: null│
└─────────────────────────────┴──────────────────────────────────┘

INTEGRAÇÃO COM WHATSAPP_VERIFIED_NUMBERS:
Se existir em whatsapp_verified_numbers/{telefoneNumerico}:
  whatsapp.verified = true
  whatsapp.exists = hasWhatsApp
  whatsapp.jid = jid (se existir)
  whatsapp.name = contactName (se existir)
  whatsapp.number = telefone
  whatsapp.verifiedAt = verifiedAt
  whatsapp.verificationStatus = 'verified' ou 'unavailable'

METADADOS ADICIONAIS:
  createdAt = serverTimestamp()
  migratedFrom = 'lista_de_estudantes'
  version = '1.0'
  anoLetivo = '2025'
  _placeholder = false (remover flag)
  `);

  // 5. ESTATÍSTICAS
  console.log('\n📊 5. ESTATÍSTICAS PARA PLANEJAMENTO');
  console.log('-'.repeat(80));

  let totalContatos = 0;
  let contatosComTelefone = 0;
  const telefonesUnicos = new Set();

  estudantes.forEach((e: any) => {
    if (e.contatos && Array.isArray(e.contatos)) {
      totalContatos += e.contatos.length;
      e.contatos.forEach((c: any) => {
        if (c.telefoneNumerico) {
          contatosComTelefone++;
          telefonesUnicos.add(c.telefoneNumerico);
        }
      });
    }
  });

  console.log(`
Total de estudantes: ${estudantes.length}
Total de contatos: ${totalContatos}
Contatos com telefone: ${contatosComTelefone}
Telefones únicos: ${telefonesUnicos.size}
Média de contatos/estudante: ${(totalContatos / estudantes.length).toFixed(2)}
  `);

  console.log('\n✅ ANÁLISE COMPLETA!\n');
}

analyzeDataStructures().catch(console.error);
