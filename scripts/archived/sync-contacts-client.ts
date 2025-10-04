/**
 * SCRIPT: Sincronizar contatos da estrutura antiga para a nova (usando Client SDK)
 *
 * OBJETIVO:
 * - Ler contatos da coleção antiga (2025/lista_de_estudantes) - DADOS LIMPOS
 * - Atualizar na nova estrutura (students/{id}/contacts) com:
 *   - nome (limpo, sem parentesco)
 *   - parentesco (separado)
 *   - podeReceberWhatsapp (compatibilidade com podeReceberMensagem)
 *
 * FASE 3: Normalização de Dados
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// ==================== CONFIGURAÇÃO ====================
const DRY_RUN = false; // ⚠️ EXECUÇÃO REAL ATIVADA
const BATCH_SIZE = 10; // Processar em lotes de 10 estudantes
const ANO_LETIVO = '2025';
const TEST_MODE = false; // ✅ MODO COMPLETO: Processar TODOS os estudantes
const MAX_STUDENTS_TEST = 10; // Limitar a 10 estudantes no modo teste

// ==================== FIREBASE CLIENT ====================
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCmUo0UtaYnGjCPdCIuNbKJgFKBWPJv5yY',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'frequencia-anual.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'frequencia-anual',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'frequencia-anual.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '267076712674',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:267076712674:web:4d2872f56d8aff504dc6bb'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Credenciais de autenticação
const API_USER_EMAIL = process.env.FIREBASE_API_USER_EMAIL || 'api_habib_kyrillos@email.com';
const API_USER_PASSWORD = process.env.FIREBASE_API_USER_PASSWORD || 'qlJiif@x3a3H3O!%1nQ6X$Bm1M';

// ==================== TIPOS ====================
interface OldContact {
  nome: string;
  telefone: string;
  parentesco?: string;
  podeReceberMensagem?: boolean;
}

interface OldStudent {
  estudanteId: string;
  nome: string;
  turma?: string;
  contatos?: OldContact[];
}

interface UpdateStats {
  totalStudents: number;
  studentsProcessed: number;
  contactsUpdated: number;
  contactsCreated: number;
  errors: number;
  skipped: number;
}

// ==================== FUNÇÕES ====================

/**
 * Autenticar no Firebase
 */
async function authenticate(): Promise<void> {
  console.log('\n🔐 Autenticando no Firebase...');
  try {
    await signInWithEmailAndPassword(auth, API_USER_EMAIL, API_USER_PASSWORD);
    console.log('✅ Autenticado com sucesso');
  } catch (error) {
    console.error('❌ Erro na autenticação:', error);
    throw error;
  }
}

/**
 * Buscar estudantes da estrutura com dados limpos (escola/students)
 */
async function getStudentsFromOldStructure(): Promise<OldStudent[]> {
  console.log('\n📖 [1/4] Buscando estudantes da coleção com dados limpos...');
  console.log('   📂 Fonte: 2025/escola/students (estrutura V2)');

  try {
    const studentsRef = collection(db, ANO_LETIVO, 'escola', 'students');
    const querySnapshot = await getDocs(studentsRef);

    if (querySnapshot.empty) {
      console.error('❌ Nenhum estudante encontrado em:', `${ANO_LETIVO}/escola/students`);
      return [];
    }

    const estudantes: OldStudent[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      estudantes.push({
        estudanteId: data.estudanteId || doc.id,
        nome: data.nome,
        turma: data.turma,
        contatos: data.contatos || []
      });
    });

    console.log(`✅ Encontrados ${estudantes.length} estudantes com dados limpos`);
    return estudantes;
  } catch (error) {
    console.error('❌ Erro ao buscar estudantes:', error);
    throw error;
  }
}

/**
 * Verificar se contato já existe na nova estrutura
 */
async function checkContactExists(estudanteId: string, contactId: string): Promise<boolean> {
  try {
    const contactRef = doc(db, 'students', estudanteId, 'contacts', contactId);
    const contactSnap = await getDoc(contactRef);
    return contactSnap.exists();
  } catch (error) {
    return false;
  }
}

/**
 * Normalizar nome (capitalizar)
 */
function normalizeContactName(name: string): string {
  if (!name) return '';

  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalizar parentesco (com acentos corretos)
 */
function normalizeParentesco(parentesco: string): string {
  if (!parentesco) return '';

  const normalized = parentesco.trim().toLowerCase();

  const map: Record<string, string> = {
    'mae': 'Mãe', 'mãe': 'Mãe',
    'pai': 'Pai',
    'avo': 'Avó', 'avó': 'Avó', 'avô': 'Avô',
    'tio': 'Tio', 'tia': 'Tia',
    'irmao': 'Irmão', 'irmã': 'Irmã', 'irmão': 'Irmão', 'irma': 'Irmã',
    'responsavel': 'Responsável', 'responsável': 'Responsável',
    'tutor': 'Tutor', 'tutora': 'Tutora',
    'padrasto': 'Padrasto', 'madrasta': 'Madrasta',
  };

  return map[normalized] || (normalized.charAt(0).toUpperCase() + normalized.slice(1));
}

/**
 * Atualizar contatos de um estudante
 */
async function updateStudentContacts(
  student: OldStudent,
  stats: UpdateStats
): Promise<void> {
  if (!student.contatos || student.contatos.length === 0) {
    stats.skipped++;
    return;
  }

  console.log(`\n👤 Processando: ${student.nome} (${student.estudanteId})`);
  console.log(`   📞 ${student.contatos.length} contatos`);

  for (let i = 0; i < student.contatos.length; i++) {
    const contact = student.contatos[i];
    const contactId = `contact_${i + 1}`;

    try {
      // Limpar telefone
      const telefoneNumerico = contact.telefone.replace(/\D/g, '');

      if (!telefoneNumerico || telefoneNumerico.length < 10) {
        console.log(`   ⚠️  Telefone inválido: ${contact.telefone}`);
        stats.skipped++;
        continue;
      }

      // Preparar dados normalizados
      const nomeLimpo = normalizeContactName(contact.nome);
      const parentescoLimpo = contact.parentesco ? normalizeParentesco(contact.parentesco) : null;
      const podeReceberWhatsapp = contact.podeReceberMensagem !== false; // Default true

      console.log(`   📝 Contato ${i + 1}: ${nomeLimpo}${parentescoLimpo ? ` (${parentescoLimpo})` : ''}`);
      console.log(`      Tel: ${telefoneNumerico}`);
      console.log(`      Pode receber: ${podeReceberWhatsapp ? 'SIM' : 'NÃO'}`);

      if (DRY_RUN) {
        console.log(`      🔍 [DRY-RUN] Seria atualizado em: students/${student.estudanteId}/contacts/${contactId}`);
        stats.contactsUpdated++;
        continue;
      }

      // Verificar se contato existe
      const exists = await checkContactExists(student.estudanteId, contactId);
      const contactRef = doc(db, 'students', student.estudanteId, 'contacts', contactId);

      if (exists) {
        // ATUALIZAR contato existente
        await updateDoc(contactRef, {
          nome: nomeLimpo,
          parentesco: parentescoLimpo,
          telefone: telefoneNumerico,
          telefoneNumerico: telefoneNumerico,
          podeReceberWhatsapp: podeReceberWhatsapp,
          updatedAt: serverTimestamp(),
          syncedFromOldStructure: true,
          syncedAt: serverTimestamp()
        });

        console.log(`      ✅ Atualizado`);
        stats.contactsUpdated++;
      } else {
        // CRIAR novo contato
        await setDoc(contactRef, {
          id: contactId,
          nome: nomeLimpo,
          parentesco: parentescoLimpo,
          telefone: telefoneNumerico,
          telefoneNumerico: telefoneNumerico,
          podeReceberWhatsapp: podeReceberWhatsapp,
          anoLetivo: ANO_LETIVO,
          version: '1.0',
          _placeholder: false,
          migratedFrom: 'lista_de_estudantes',
          createdAt: serverTimestamp(),
          syncedFromOldStructure: true,
          syncedAt: serverTimestamp(),
          whatsapp: {
            verified: false,
            exists: false,
            verificationStatus: 'pending',
            number: telefoneNumerico,
            name: null,
            jid: null,
            verifiedAt: null
          }
        });

        console.log(`      ✅ Criado`);
        stats.contactsCreated++;
      }

    } catch (error) {
      console.error(`   ❌ Erro ao processar contato ${i + 1}:`, error);
      stats.errors++;
    }
  }

  stats.studentsProcessed++;
}

/**
 * Função principal
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔄 SINCRONIZAÇÃO DE CONTATOS: ANTIGA → NOVA ESTRUTURA');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📅 Ano letivo: ${ANO_LETIVO}`);
  console.log(`🔍 Modo: ${DRY_RUN ? 'DRY-RUN (simulação)' : 'EXECUÇÃO REAL'}`);
  console.log(`📦 Tamanho do lote: ${BATCH_SIZE} estudantes`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (DRY_RUN) {
    console.log('⚠️  MODO DRY-RUN ATIVO - Nenhuma alteração será feita');
    console.log('   Para executar de verdade, altere DRY_RUN = false\n');
  }

  const stats: UpdateStats = {
    totalStudents: 0,
    studentsProcessed: 0,
    contactsUpdated: 0,
    contactsCreated: 0,
    errors: 0,
    skipped: 0
  };

  try {
    // Autenticar
    await authenticate();

    // Buscar estudantes da estrutura antiga
    let students = await getStudentsFromOldStructure();

    // MODO TESTE: Limitar a apenas alguns estudantes
    if (TEST_MODE) {
      console.log(`\n⚠️  MODO TESTE ATIVO - Processando apenas ${MAX_STUDENTS_TEST} estudantes`);
      students = students.slice(0, MAX_STUDENTS_TEST);
    }

    stats.totalStudents = students.length;

    if (students.length === 0) {
      console.log('⚠️  Nenhum estudante encontrado. Encerrando...');
      return;
    }

    console.log('\n📝 [2/4] Processando contatos em lotes...\n');

    // Processar em lotes
    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const batch = students.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(students.length / BATCH_SIZE);

      console.log(`\n📦 Lote ${batchNum}/${totalBatches} (${batch.length} estudantes)`);
      console.log('─────────────────────────────────────────────────────');

      for (const student of batch) {
        await updateStudentContacts(student, stats);
      }

      // Pequeno delay entre lotes
      if (i + BATCH_SIZE < students.length) {
        console.log('\n⏳ Aguardando 500ms antes do próximo lote...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

  } catch (error) {
    console.error('\n❌ ERRO FATAL:', error);
    process.exit(1);
  }

  // Relatório final
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 RELATÓRIO FINAL');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📚 Total de estudantes: ${stats.totalStudents}`);
  console.log(`✅ Estudantes processados: ${stats.studentsProcessed}`);
  console.log(`📝 Contatos atualizados: ${stats.contactsUpdated}`);
  console.log(`✨ Contatos criados: ${stats.contactsCreated}`);
  console.log(`⏭️  Estudantes pulados (sem contatos): ${stats.skipped}`);
  console.log(`❌ Erros: ${stats.errors}`);
  console.log('═══════════════════════════════════════════════════════════');

  if (DRY_RUN) {
    console.log('\n⚠️  MODO DRY-RUN - Nenhuma alteração foi feita no banco');
    console.log('   Para executar de verdade, altere DRY_RUN = false');
  } else {
    console.log('\n✅ Sincronização concluída com sucesso!');
    if (TEST_MODE) {
      console.log('\n⚠️  MODO TESTE - Apenas os primeiros 10 estudantes foram processados');
      console.log('   Para processar todos, altere TEST_MODE = false');
    }
  }

  console.log('\n');
  process.exit(0);
}

// Executar
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
