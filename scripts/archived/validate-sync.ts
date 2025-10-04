/**
 * SCRIPT: Validar sincronização de contatos
 * Verifica se os dados foram migrados corretamente
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Firebase Config
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

// IDs dos 3 primeiros estudantes processados (NOVA EXECUÇÃO)
const STUDENT_IDS_TO_VALIDATE = [
  '00597fff-31f9-4522-ab65-83d17b87ddbf', // ANA VALENTINA
  '0063f718-1379-4191-8396-19269cf857d8', // KAUE GABRIEL
  '01f15a18-a107-48f6-8e5a-a59c175f5f5f'  // TAYLOR ALVES (2 contatos)
];

async function authenticate() {
  await signInWithEmailAndPassword(auth, 'api_habib_kyrillos@email.com', 'qlJiif@x3a3H3O!%1nQ6X$Bm1M');
  console.log('✅ Autenticado\n');
}

async function validateStudent(estudanteId: string, index: number) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📝 VALIDAÇÃO ${index + 1}/3`);
  console.log(`${'='.repeat(60)}`);

  try {
    // Buscar contatos da NOVA estrutura
    const contactsRef = collection(db, 'students', estudanteId, 'contacts');
    const contactsSnap = await getDocs(contactsRef);

    if (contactsSnap.empty) {
      console.log('❌ ERRO: Nenhum contato encontrado na nova estrutura!');
      return false;
    }

    console.log(`✅ Encontrados ${contactsSnap.size} contatos\n`);

    let allValid = true;

    contactsSnap.forEach((doc, idx) => {
      const data = doc.data();
      console.log(`📞 Contato ${idx + 1} (${doc.id}):`);
      console.log(`   Nome: ${data.nome}`);
      console.log(`   Parentesco: ${data.parentesco || '(não definido)'}`);
      console.log(`   Telefone: ${data.telefoneNumerico || data.telefone}`);
      console.log(`   Pode receber WhatsApp: ${data.podeReceberWhatsapp ? 'SIM' : 'NÃO'}`);
      console.log(`   Sincronizado: ${data.syncedFromOldStructure ? 'SIM' : 'NÃO'}`);

      // Validações
      const validations = {
        hasNome: !!data.nome,
        hasTelefone: !!data.telefoneNumerico || !!data.telefone,
        hasPodeReceber: data.podeReceberWhatsapp !== undefined,
        hasSyncFlag: data.syncedFromOldStructure === true
      };

      if (!validations.hasNome || !validations.hasTelefone || !validations.hasPodeReceber) {
        console.log(`   ⚠️  AVISO: Campos faltando!`);
        if (!validations.hasNome) console.log(`      - Nome está vazio`);
        if (!validations.hasTelefone) console.log(`      - Telefone está vazio`);
        if (!validations.hasPodeReceber) console.log(`      - podeReceberWhatsapp não definido`);
        allValid = false;
      } else {
        console.log(`   ✅ Todos os campos OK`);
      }
      console.log();
    });

    return allValid;

  } catch (error) {
    console.error('❌ ERRO ao validar:', error);
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 VALIDAÇÃO DE SINCRONIZAÇÃO DE CONTATOS');
  console.log('═══════════════════════════════════════════════════════════\n');

  await authenticate();

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < STUDENT_IDS_TO_VALIDATE.length; i++) {
    const isValid = await validateStudent(STUDENT_IDS_TO_VALIDATE[i], i);
    if (isValid) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 RESULTADO DA VALIDAÇÃO');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Estudantes válidos: ${successCount}/${STUDENT_IDS_TO_VALIDATE.length}`);
  console.log(`❌ Estudantes com problemas: ${failCount}/${STUDENT_IDS_TO_VALIDATE.length}`);

  if (failCount === 0) {
    console.log('\n🎉 VALIDAÇÃO 100% BEM-SUCEDIDA!');
    console.log('   Todos os dados foram migrados corretamente.');
  } else {
    console.log('\n⚠️  VALIDAÇÃO PARCIAL');
    console.log('   Alguns dados precisam de revisão.');
  }

  console.log('\n');
  process.exit(failCount === 0 ? 0 : 1);
}

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
