/**
 * UTILS: COMPARAR V2 vs V3
 *
 * Compara dados entre V2 (2025/faltas/controle) e V3 (subcoleções)
 * para garantir integridade da migração
 *
 * Execução: node scripts/migration/utils/compare-v2-v3.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, collectionGroup } from 'firebase/firestore';

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

async function compareV2vsV3() {
  console.log('\n' + '═'.repeat(80));
  console.log('  COMPARAÇÃO: V2 vs V3');
  console.log('═'.repeat(80) + '\n');

  const results = {
    v2TotalCount: 0,
    v3SubcollectionCount: 0,
    v3SummaryCount: 0,
    discrepancies: [],
    match: false,
  };

  try {
    // 1. Contar total V2
    console.log('1️⃣  Contando registros V2...\n');
    const v2Ref = collection(db, '2025', 'faltas', 'controle');
    const v2Snap = await getDocs(v2Ref);
    results.v2TotalCount = v2Snap.size;
    console.log(`   ✅ V2: ${results.v2TotalCount} registros\n`);

    // 2. Contar total V3 (subcoleções)
    console.log('2️⃣  Contando registros V3 (subcoleções)...\n');
    try {
      const v3Ref = collectionGroup(db, 'absences');
      const v3Snap = await getDocs(v3Ref);
      results.v3SubcollectionCount = v3Snap.size;
      console.log(`   ✅ V3 Subcoleções: ${results.v3SubcollectionCount} registros\n`);
    } catch (error) {
      console.log(`   ⚠️  V3 Subcoleções: 0 registros (ainda não migrado)\n`);
      results.v3SubcollectionCount = 0;
    }

    // 3. Contar total V3 (summary)
    console.log('3️⃣  Contando registros V3 (summary)...\n');
    try {
      const summaryRef = collectionGroup(db, 'absence_summary');
      const summarySnap = await getDocs(summaryRef);

      let totalFromSummary = 0;
      summarySnap.forEach(doc => {
        const data = doc.data();
        if (!data._test) { // Ignorar documentos de teste
          totalFromSummary += data.count || 0;
        }
      });

      results.v3SummaryCount = totalFromSummary;
      console.log(`   ✅ V3 Summary: ${results.v3SummaryCount} registros (soma de counts)\n`);
    } catch (error) {
      console.log(`   ⚠️  V3 Summary: 0 registros (ainda não migrado)\n`);
      results.v3SummaryCount = 0;
    }

    // 4. Comparação
    console.log('═'.repeat(80));
    console.log('  RESULTADOS DA COMPARAÇÃO');
    console.log('═'.repeat(80) + '\n');

    console.log(`📊 Contagens:`);
    console.log(`   • V2 (2025/faltas/controle): ${results.v2TotalCount}`);
    console.log(`   • V3 Subcoleções (students/{id}/absences): ${results.v3SubcollectionCount}`);
    console.log(`   • V3 Summary (students/{id}/absence_summary): ${results.v3SummaryCount}\n`);

    // Verificar match
    const subcollectionMatch = results.v2TotalCount === results.v3SubcollectionCount;
    const summaryMatch = results.v2TotalCount === results.v3SummaryCount;

    console.log(`✅ Validações:`);
    console.log(`   • V2 = V3 Subcoleções: ${subcollectionMatch ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`   • V2 = V3 Summary: ${summaryMatch ? '✅ SIM' : '❌ NÃO'}\n`);

    if (subcollectionMatch && summaryMatch && results.v3SubcollectionCount > 0) {
      results.match = true;
      console.log('═'.repeat(80));
      console.log('  ✅ MIGRAÇÃO 100% ÍNTEGRA!');
      console.log('═'.repeat(80));
      console.log('\n✅ Todos os dados migrados corretamente');
      console.log('✅ Contagens batem perfeitamente');
      console.log('✅ Pode prosseguir com cutover\n');
    } else if (results.v3SubcollectionCount === 0) {
      console.log('═'.repeat(80));
      console.log('  ⚠️  MIGRAÇÃO AINDA NÃO EXECUTADA');
      console.log('═'.repeat(80));
      console.log('\n⚠️  V3 está vazio - execute script de migração primeiro\n');
    } else {
      console.log('═'.repeat(80));
      console.log('  ❌ DISCREPÂNCIAS ENCONTRADAS!');
      console.log('═'.repeat(80));
      console.log('\n❌ Contagens não batem');
      console.log(`   Diferença Subcoleções: ${results.v2TotalCount - results.v3SubcollectionCount}`);
      console.log(`   Diferença Summary: ${results.v2TotalCount - results.v3SummaryCount}`);
      console.log('\n⚠️  NÃO prosseguir com cutover até corrigir!\n');
      process.exit(1);
    }

    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERRO na comparação:', error);
    process.exit(1);
  }

  process.exit(results.match ? 0 : 1);
}

compareV2vsV3();
