/**
 * SCRIPT: Sincronizar contatos da estrutura antiga para a nova
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

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ==================== CONFIGURAÇÃO ====================
const DRY_RUN = true; // ⚠️ Mudar para false para executar de verdade
const BATCH_SIZE = 10; // Processar em lotes de 10 estudantes
const ANO_LETIVO = '2025';

// ==================== FIREBASE ADMIN ====================
let serviceAccount: any;

// Tentar parsear do FIREBASE_SERVICE_ACCOUNT_KEY primeiro
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    let jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    // Se começar com {, está OK para parsear
    if (!jsonStr.startsWith('{')) {
      const match = jsonStr.match(/(\{[\s\S]+\})/);
      if (match) jsonStr = match[1];
    }
    serviceAccount = JSON.parse(jsonStr);
    console.log('✅ Credenciais carregadas de FIREBASE_SERVICE_ACCOUNT_KEY');
  } catch (e) {
    console.warn('⚠️  Não foi possível parsear FIREBASE_SERVICE_ACCOUNT_KEY, tentando variáveis separadas...');
    serviceAccount = null;
  }
}

// Fallback: usar variáveis separadas
if (!serviceAccount) {
  serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'frequencia-anual',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  };

  console.log('✅ Tentando usar variáveis separadas');
  console.log('   Project ID:', serviceAccount.projectId);
  console.log('   Client Email:', serviceAccount.clientEmail ? '✅' : '❌');
  console.log('   Private Key:', serviceAccount.privateKey ? '✅' : '❌');

  if (!serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error('\n❌ ERRO: Credenciais não encontradas!');
    console.error('   Certifique-se de que .env.local contém FIREBASE_SERVICE_ACCOUNT_KEY');
    console.error('   OU as variáveis FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY');
    process.exit(1);
  }
}

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

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
 * Buscar estudantes da estrutura antiga
 */
async function getStudentsFromOldStructure(): Promise<OldStudent[]> {
  console.log('\n📖 [1/4] Buscando estudantes da estrutura ANTIGA...');

  try {
    const docRef = db.doc(`${ANO_LETIVO}/lista_de_estudantes`);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.error('❌ Documento não encontrado:', `${ANO_LETIVO}/lista_de_estudantes`);
      return [];
    }

    const data = docSnap.data();
    const estudantes = (data?.estudantes || []) as OldStudent[];

    console.log(`✅ Encontrados ${estudantes.length} estudantes na estrutura antiga`);
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
    const contactRef = db.doc(`students/${estudanteId}/contacts/${contactId}`);
    const contactSnap = await contactRef.get();
    return contactSnap.exists;
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
      const contactRef = db.doc(`students/${student.estudanteId}/contacts/${contactId}`);

      if (exists) {
        // ATUALIZAR contato existente
        await contactRef.update({
          nome: nomeLimpo,
          parentesco: parentescoLimpo,
          telefone: telefoneNumerico,
          telefoneNumerico: telefoneNumerico,
          podeReceberWhatsapp: podeReceberWhatsapp,
          updatedAt: FieldValue.serverTimestamp(),
          syncedFromOldStructure: true,
          syncedAt: FieldValue.serverTimestamp()
        });

        console.log(`      ✅ Atualizado`);
        stats.contactsUpdated++;
      } else {
        // CRIAR novo contato
        await contactRef.set({
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
          createdAt: FieldValue.serverTimestamp(),
          syncedFromOldStructure: true,
          syncedAt: FieldValue.serverTimestamp(),
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
    // Buscar estudantes da estrutura antiga
    const students = await getStudentsFromOldStructure();
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
  }

  console.log('\n');
  process.exit(0);
}

// Executar
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
