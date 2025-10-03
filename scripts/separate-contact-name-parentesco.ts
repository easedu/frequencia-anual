/**
 * FASE 3: Script de correção - Separar nome e parentesco
 *
 * PROBLEMA: "Reginaldo ( pai )" está junto no campo nome
 * SOLUÇÃO: Separar em nome="Reginaldo" e parentesco="Pai"
 * PADRÃO: "Nome ( parentesco )"
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Configuração Firebase Admin
let serviceAccount: any;

// Tentar carregar de FIREBASE_SERVICE_ACCOUNT_KEY primeiro (formato JSON completo)
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    console.log('✅ Credenciais carregadas de FIREBASE_SERVICE_ACCOUNT_KEY');
  } catch (e) {
    console.error('❌ Erro ao parsear FIREBASE_SERVICE_ACCOUNT_KEY');
    throw e;
  }
} else {
  // Fallback para credenciais separadas
  serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  };
  console.log('✅ Credenciais carregadas de variáveis separadas');
}

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

// ==================== CONFIGURAÇÃO ====================
const DRY_RUN = true; // ⚠️ Alterar para false para executar de verdade

// ==================== FUNÇÕES DE NORMALIZAÇÃO ====================

/**
 * Normaliza parentesco com acentos corretos
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
 * Normaliza nome (capitaliza primeira letra de cada palavra)
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
 * Extrai nome e parentesco do padrão "Nome ( parentesco )"
 */
function extractNameAndParentesco(fullText: string): { nome: string; parentesco: string } | null {
  if (!fullText) return null;

  // Pattern: "Nome ( parentesco )" ou "Nome (parentesco)"
  const pattern = /^(.+?)\s*\(\s*(.+?)\s*\)\s*$/;
  const match = fullText.trim().match(pattern);

  if (!match) return null;

  const [, nome, parentesco] = match;

  return {
    nome: normalizeContactName(nome.trim()),
    parentesco: normalizeParentesco(parentesco.trim()),
  };
}

// ==================== PROCESSAMENTO ====================

async function processContacts() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 SEPARAR NOME E PARENTESCO - CONTATOS MIGRADOS');
  console.log('='.repeat(80));
  console.log(`🔧 Modo: ${DRY_RUN ? 'DRY RUN (sem alterações)' : 'PRODUÇÃO (alterará dados)'}`);
  console.log('='.repeat(80) + '\n');

  try {
    console.log('🔍 Buscando estudantes...\n');

    const studentsSnapshot = await db.collection('students').get();

    console.log(`📊 Total de estudantes: ${studentsSnapshot.size}\n`);

    let totalContacts = 0;
    let contactsToFix = 0;
    const fixes: any[] = [];

    // Processar cada estudante
    for (const studentDoc of studentsSnapshot.docs) {
      const studentId = studentDoc.id;
      const studentData = studentDoc.data();
      const studentName = studentData.nome || 'NOME DESCONHECIDO';

      // Buscar subcoleção de contatos
      const contactsSnapshot = await db
        .collection('students')
        .doc(studentId)
        .collection('contacts')
        .get();

      for (const contactDoc of contactsSnapshot.docs) {
        totalContacts++;
        const contactId = contactDoc.id;
        const contactData = contactDoc.data();

        // Verificar se precisa de correção
        if (
          contactData.nome &&
          contactData.nome.includes('(') &&
          contactData.nome.includes(')') &&
          (!contactData.parentesco || contactData.parentesco.trim() === '')
        ) {
          const extracted = extractNameAndParentesco(contactData.nome);

          if (extracted) {
            contactsToFix++;

            fixes.push({
              studentId,
              studentName,
              contactId,
              original: contactData.nome,
              novo: extracted,
            });

            console.log(`📝 ${studentName} (${studentId})`);
            console.log(`   Contato: ${contactId}`);
            console.log(`   ANTES: nome="${contactData.nome}", parentesco="${contactData.parentesco || 'null'}"`);
            console.log(`   DEPOIS: nome="${extracted.nome}", parentesco="${extracted.parentesco}"`);
            console.log('');
          }
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMO');
    console.log('='.repeat(80));
    console.log(`Total de estudantes escaneados: ${studentsSnapshot.size}`);
    console.log(`Total de contatos escaneados: ${totalContacts}`);
    console.log(`Contatos que precisam de correção: ${contactsToFix}`);
    console.log('='.repeat(80) + '\n');

    // Aplicar correções se não for DRY_RUN
    if (!DRY_RUN && fixes.length > 0) {
      console.log('💾 Aplicando correções...\n');

      const batch = db.batch();
      let batchCount = 0;

      for (const fix of fixes) {
        const contactRef = db
          .collection('students')
          .doc(fix.studentId)
          .collection('contacts')
          .doc(fix.contactId);

        batch.update(contactRef, {
          nome: fix.novo.nome,
          parentesco: fix.novo.parentesco,
          updatedAt: new Date(),
          _correctedBy: 'separate-contact-name-parentesco-script',
          _correctedAt: new Date(),
        });

        batchCount++;

        // Firestore batch limit é 500
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`✅ Batch de ${batchCount} operações commitado`);
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
        console.log(`✅ Últimas ${batchCount} operações commitadas`);
      }

      console.log('\n✅ CORREÇÕES APLICADAS COM SUCESSO!\n');
    } else if (DRY_RUN && fixes.length > 0) {
      console.log('⚠️  DRY RUN ATIVADO - Para executar de verdade, altere DRY_RUN = false\n');
    } else {
      console.log('✅ Nenhum contato precisa de correção!\n');
    }

  } catch (error) {
    console.error('\n❌ ERRO:', error);
    throw error;
  }
}

// Executar
processContacts()
  .then(() => {
    console.log('✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falhou:', error);
    process.exit(1);
  });
