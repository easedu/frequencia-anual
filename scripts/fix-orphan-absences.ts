/**
 * Script to fix orphan absences that reference old invalid estudanteId
 * Uses the ID mapping from the previous fix to update absences
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, writeBatch } from 'firebase/firestore';

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();
const CURRENT_SCHOOL_YEAR = process.env.NEXT_PUBLIC_SCHOOL_YEAR || new Date().getFullYear().toString();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Known ID mappings from previous fix
const ID_MAPPINGS = [
  { oldId: '1756605914539', newId: 'ce5ac93c-bad9-4f82-af87-ffac12eb395f', nome: '### TESTE ###' },
  { oldId: '1757001128332', newId: 'a732e702-b956-409c-aad0-ffc4f4c801ca', nome: 'RAY ENRIQUE DA SILVA CONCEIÇÃO' },
  { oldId: '1757525819223', newId: '7b49137a-c6b1-4065-abe4-c889945708b0', nome: 'LEANDRO DA SILVA ARAGÃO BARBOSA' }
];

async function fixOrphanAbsences() {
  console.log('🔍 Iniciando correção de faltas órfãs...\n');
  console.log(`📅 Ano letivo: ${CURRENT_SCHOOL_YEAR}\n`);

  try {
    // Get all absences
    console.log('📊 Buscando registros de faltas...');
    const absencesCollection = collection(db, CURRENT_SCHOOL_YEAR, 'faltas', 'controle');
    const absencesSnapshot = await getDocs(absencesCollection);
    console.log(`   Total de registros: ${absencesSnapshot.size}\n`);

    // Find orphan absences
    const orphanAbsences: any[] = [];
    const absencesToUpdate = new Map<string, string>(); // oldId -> newId

    absencesSnapshot.forEach((absenceDoc) => {
      const data = absenceDoc.data();
      if (!UUID_PATTERN.test(data.estudanteId)) {
        orphanAbsences.push({
          docId: absenceDoc.id,
          estudanteId: data.estudanteId,
          data: data.data,
          ref: absenceDoc.ref
        });

        // Check if we have a mapping for this ID
        const mapping = ID_MAPPINGS.find(m => m.oldId === data.estudanteId);
        if (mapping) {
          absencesToUpdate.set(absenceDoc.id, mapping.newId);
        }
      }
    });

    console.log(`❌ Encontradas ${orphanAbsences.length} faltas com estudanteId inválido\n`);

    if (orphanAbsences.length === 0) {
      console.log('✅ Não há faltas órfãs para corrigir!');
      return;
    }

    // Group by estudanteId
    const groupedByStudent = new Map<string, number>();
    orphanAbsences.forEach(absence => {
      const count = groupedByStudent.get(absence.estudanteId) || 0;
      groupedByStudent.set(absence.estudanteId, count + 1);
    });

    console.log('📋 Faltas agrupadas por estudanteId:');
    for (const [estudanteId, count] of groupedByStudent.entries()) {
      const mapping = ID_MAPPINGS.find(m => m.oldId === estudanteId);
      if (mapping) {
        console.log(`   - ${estudanteId} (${mapping.nome}): ${count} faltas → ${mapping.newId}`);
      } else {
        console.log(`   - ${estudanteId}: ${count} faltas → ⚠️  MAPEAMENTO NÃO ENCONTRADO`);
      }
    }
    console.log();

    if (absencesToUpdate.size === 0) {
      console.log('⚠️  Nenhum mapeamento encontrado para os IDs inválidos!');
      console.log('   Por favor, verifique os IDs manualmente.\n');
      return;
    }

    console.log(`🔧 Atualizando ${absencesToUpdate.size} registros de faltas...\n`);

    // Update in batches (Firestore batch limit is 500)
    const BATCH_SIZE = 500;
    const orphanRefs = Array.from(absencesToUpdate.entries());
    let totalUpdated = 0;

    for (let i = 0; i < orphanRefs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchItems = orphanRefs.slice(i, i + BATCH_SIZE);

      for (const [docId, newId] of batchItems) {
        const orphan = orphanAbsences.find(a => a.docId === docId);
        if (orphan) {
          batch.update(orphan.ref, { estudanteId: newId });
        }
      }

      await batch.commit();
      totalUpdated += batchItems.length;
      console.log(`   ✅ Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${batchItems.length} registros atualizados`);
    }

    console.log();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 RESUMO DA CORREÇÃO\n');
    console.log(`✅ ${totalUpdated} faltas corrigidas com sucesso`);
    console.log('✅ Todos os estudanteId agora são UUID válidos');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Erro ao corrigir faltas órfãs:', error);
    throw error;
  }
}

// Run the script
fixOrphanAbsences()
  .then(() => {
    console.log('\n✅ Script concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro ao executar script:', error);
    process.exit(1);
  });