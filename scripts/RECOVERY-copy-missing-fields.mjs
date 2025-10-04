/**
 * 🚨 SCRIPT DE RECUPERAÇÃO DE DADOS
 *
 * Copia campos faltantes (matricula, email, dataNascimento, endereco)
 * da estrutura V2 (2025/escola/students) para V3 (students)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCmUo0UtaYnGjCPdCIuNbKJgFKBWPJv5yY',
  authDomain: 'frequencia-anual.firebaseapp.com',
  projectId: 'frequencia-anual',
  storageBucket: 'frequencia-anual.firebasestorage.app',
  messagingSenderId: '267076712674',
  appId: '1:267076712674:web:4d2872f56d8aff504dc6bb'
});

const db = getFirestore(app);

// MODO DE EXECUÇÃO
const MODE = process.env.MODE || 'DRY_RUN'; // DRY_RUN | TEST | FULL
const BATCH_SIZE = 500;
const TEST_LIMIT = 10;

async function recoveryMissingFields() {
  console.log('\n' + '═'.repeat(70));
  console.log(`  🚨 RECUPERAÇÃO DE DADOS V2 → V3 [${MODE}]`);
  console.log('═'.repeat(70) + '\n');

  if (MODE === 'DRY_RUN') {
    console.log('⚠️  DRY RUN MODE - Simulação, nenhuma alteração será feita\n');
  } else if (MODE === 'TEST') {
    console.log(`⚠️  TEST MODE - Processando apenas ${TEST_LIMIT} estudantes\n`);
  } else {
    console.log('🚀 FULL MODE - Recuperação completa\n');
  }

  try {
    // 1. Buscar todos os dados da V2
    console.log('📂 Carregando dados de V2 (2025/escola/students)...');
    const v2Ref = collection(db, '2025', 'escola', 'students');
    const v2Snap = await getDocs(v2Ref);

    console.log(`✅ ${v2Snap.size} documentos encontrados em V2\n`);

    // 2. Criar mapa de dados V2 por ID
    const v2Data = new Map();

    v2Snap.docs.forEach(doc => {
      const data = doc.data();
      v2Data.set(doc.id, {
        matricula: data.matricula || null,
        email: data.email || null,
        dataNascimento: data.dataNascimento || null,
        endereco: data.endereco || null
      });
    });

    // 3. Buscar documentos V3
    console.log('📂 Carregando dados de V3 (students)...');
    const v3Ref = collection(db, 'students');
    const v3Snap = await getDocs(v3Ref);

    console.log(`✅ ${v3Snap.size} documentos encontrados em V3\n`);

    // 4. Processar atualizações
    const updates = [];

    v3Snap.docs.forEach(v3Doc => {
      const v3CurrentData = v3Doc.data();
      const v2OriginalData = v2Data.get(v3Doc.id);

      if (!v2OriginalData) {
        // Não tem dados em V2 para este estudante
        return;
      }

      // Verificar quais campos estão faltando em V3
      const fieldsToUpdate = {};

      if (!v3CurrentData.matricula && v2OriginalData.matricula) {
        fieldsToUpdate.matricula = v2OriginalData.matricula;
      }

      if (!v3CurrentData.email && v2OriginalData.email) {
        fieldsToUpdate.email = v2OriginalData.email;
      }

      if (!v3CurrentData.dataNascimento && v2OriginalData.dataNascimento) {
        fieldsToUpdate.dataNascimento = v2OriginalData.dataNascimento;
      }

      if (!v3CurrentData.endereco && v2OriginalData.endereco) {
        fieldsToUpdate.endereco = v2OriginalData.endereco;
      }

      if (Object.keys(fieldsToUpdate).length > 0) {
        updates.push({
          id: v3Doc.id,
          nome: v3CurrentData.nome,
          fields: fieldsToUpdate
        });
      }
    });

    console.log(`📊 Estudantes que precisam de atualização: ${updates.length}\n`);

    if (updates.length === 0) {
      console.log('✅ Todos os dados já estão sincronizados!\n');
      return;
    }

    // Aplicar limite no modo TEST
    const updatesToProcess = MODE === 'TEST'
      ? updates.slice(0, TEST_LIMIT)
      : updates;

    console.log(`🔄 Processando ${updatesToProcess.length} atualizações...\n`);

    // 5. Executar atualizações em lotes
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < updatesToProcess.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchUpdates = updatesToProcess.slice(i, i + BATCH_SIZE);

      batchUpdates.forEach(update => {
        const docRef = doc(db, 'students', update.id);
        batch.update(docRef, update.fields);
      });

      if (MODE !== 'DRY_RUN') {
        try {
          await batch.commit();
          updated += batchUpdates.length;

          // Log de progresso
          console.log(`  ✓ Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${batchUpdates.length} estudantes atualizados`);
        } catch (error) {
          console.error(`  ❌ Erro no lote ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
          failed += batchUpdates.length;
        }
      } else {
        // DRY RUN - apenas simular
        batchUpdates.forEach(update => {
          console.log(`  [SIMULAÇÃO] ${update.nome}:`);
          Object.entries(update.fields).forEach(([field, value]) => {
            const displayValue = typeof value === 'object'
              ? 'OBJECT'
              : (value?.toString().substring(0, 30) || 'null');
            console.log(`    ${field}: ${displayValue}`);
          });
        });
        updated += batchUpdates.length;
      }
    }

    // 6. Resumo
    console.log('\n' + '═'.repeat(70));
    console.log('  RESUMO DA RECUPERAÇÃO');
    console.log('═'.repeat(70));
    console.log(`Total encontrados para atualizar: ${updates.length}`);
    console.log(`Processados nesta execução: ${updatesToProcess.length}`);
    console.log(`✅ Sucesso: ${updated}`);
    console.log(`❌ Falhas: ${failed}`);
    console.log('═'.repeat(70) + '\n');

    if (MODE === 'DRY_RUN') {
      console.log('💡 Para executar a recuperação real, use:');
      console.log('   MODE=FULL node scripts/RECOVERY-copy-missing-fields.mjs\n');
    } else if (MODE === 'TEST') {
      console.log('💡 Para recuperar TODOS os dados, use:');
      console.log('   MODE=FULL node scripts/RECOVERY-copy-missing-fields.mjs\n');
    } else {
      console.log('🎉 RECUPERAÇÃO CONCLUÍDA!\n');
    }

  } catch (error) {
    console.error('❌ ERRO CRÍTICO:', error);
    throw error;
  }
}

// Executar
recoveryMissingFields()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
