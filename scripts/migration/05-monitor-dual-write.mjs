/**
 * FASE 3.4: MONITORAMENTO DE DUAL-WRITE
 * 
 * Compara dados entre V2 e V3 para identificar discrepâncias
 * Executa diariamente durante período de dual-write
 * 
 * O QUE FAZ:
 * 1. Conta total de faltas em V2
 * 2. Conta total de faltas em V3 (subcoleções)
 * 3. Conta total de faltas em V3 (summaries)
 * 4. Identifica discrepâncias > 1%
 * 5. Reporta problemas encontrados
 * 
 * Execução: node scripts/migration/05-monitor-dual-write.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, collectionGroup } from 'firebase/firestore';

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

const ALERT_THRESHOLD_PERCENT = 1; // Alertar se discrepância > 1%

async function monitorDualWrite() {
  console.log('\n' + '═'.repeat(80));
  console.log('  MONITORAMENTO DUAL-WRITE: V2 vs V3');
  console.log('═'.repeat(80) + '\n');

  const results = {
    v2Total: 0,
    v3SubcollectionTotal: 0,
    v3SummaryTotal: 0,
    discrepancyV2vsV3Sub: 0,
    discrepancyV2vsV3Summary: 0,
    alerts: [],
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Contar total V2
    console.log('1️⃣  Contando faltas em V2 (2025/faltas/controle)...\n');
    
    const v2Ref = collection(db, '2025', 'faltas', 'controle');
    const v2Snap = await getDocs(v2Ref);
    results.v2Total = v2Snap.size;

    console.log(`   ✅ V2 Total: ${results.v2Total} faltas\n`);

    // 2. Contar total V3 (subcoleções)
    console.log('2️⃣  Contando faltas em V3 Subcoleções (students/{id}/absences)...\n');

    try {
      const v3SubRef = collectionGroup(db, 'absences');
      const v3SubSnap = await getDocs(v3SubRef);
      
      // Filtrar apenas subcoleções de students (não outras 'absences')
      let v3SubCount = 0;
      v3SubSnap.forEach(doc => {
        const path = doc.ref.path;
        // Verificar se path é students/{id}/absences/{docId}
        if (path.startsWith('students/') && path.includes('/absences/')) {
          v3SubCount++;
        }
      });

      results.v3SubcollectionTotal = v3SubCount;
      console.log(`   ✅ V3 Subcoleções: ${results.v3SubcollectionTotal} faltas\n`);
    } catch (error) {
      console.log(`   ⚠️  V3 Subcoleções: Erro ao contar (${error.message})\n`);
      results.v3SubcollectionTotal = 0;
    }

    // 3. Contar total V3 (summaries)
    console.log('3️⃣  Contando faltas em V3 Summaries (students/{id}/absence_summary)...\n');

    try {
      const v3SummaryRef = collectionGroup(db, 'absence_summary');
      const v3SummarySnap = await getDocs(v3SummaryRef);

      let v3SummaryCount = 0;
      v3SummarySnap.forEach(doc => {
        const data = doc.data();
        // Ignorar documentos de teste
        if (!data._test) {
          v3SummaryCount += (data.count || 0);
        }
      });

      results.v3SummaryTotal = v3SummaryCount;
      console.log(`   ✅ V3 Summaries: ${results.v3SummaryTotal} faltas (soma de counts)\n`);
    } catch (error) {
      console.log(`   ⚠️  V3 Summaries: Erro ao contar (${error.message})\n`);
      results.v3SummaryTotal = 0;
    }

    // 4. Calcular discrepâncias
    console.log('═'.repeat(80));
    console.log('  ANÁLISE DE DISCREPÂNCIAS');
    console.log('═'.repeat(80) + '\n');

    // V2 vs V3 Subcoleções
    if (results.v2Total > 0) {
      results.discrepancyV2vsV3Sub = 
        Math.abs((results.v3SubcollectionTotal - results.v2Total) / results.v2Total * 100);
      
      results.discrepancyV2vsV3Summary = 
        Math.abs((results.v3SummaryTotal - results.v2Total) / results.v2Total * 100);
    }

    console.log('📊 Comparação:\n');
    console.log(`   V2 (referência):           ${results.v2Total.toLocaleString()} faltas`);
    console.log(`   V3 Subcoleções:            ${results.v3SubcollectionTotal.toLocaleString()} faltas`);
    console.log(`   V3 Summaries:              ${results.v3SummaryTotal.toLocaleString()} faltas\n`);

    console.log('📈 Discrepâncias:\n');
    console.log(`   V2 vs V3 Subcoleções:      ${results.discrepancyV2vsV3Sub.toFixed(2)}%`);
    console.log(`   V2 vs V3 Summaries:        ${results.discrepancyV2vsV3Summary.toFixed(2)}%\n`);

    // 5. Gerar alertas
    console.log('═'.repeat(80));
    console.log('  ALERTAS');
    console.log('═'.repeat(80) + '\n');

    let hasAlerts = false;

    if (results.discrepancyV2vsV3Sub > ALERT_THRESHOLD_PERCENT) {
      const alert = `🚨 ALERTA: Discrepância V2 vs V3 Subcoleções (${results.discrepancyV2vsV3Sub.toFixed(2)}%) excede limite de ${ALERT_THRESHOLD_PERCENT}%`;
      results.alerts.push(alert);
      console.log(alert);
      hasAlerts = true;
    }

    if (results.discrepancyV2vsV3Summary > ALERT_THRESHOLD_PERCENT) {
      const alert = `🚨 ALERTA: Discrepância V2 vs V3 Summaries (${results.discrepancyV2vsV3Summary.toFixed(2)}%) excede limite de ${ALERT_THRESHOLD_PERCENT}%`;
      results.alerts.push(alert);
      console.log(alert);
      hasAlerts = true;
    }

    if (!hasAlerts) {
      console.log('✅ Nenhum alerta - Dual-write funcionando corretamente!\n');
    } else {
      console.log('\n⚠️  Ações recomendadas:');
      console.log('   1. Verificar logs de erro de dual-write');
      console.log('   2. Executar validação detalhada');
      console.log('   3. Verificar se migração histórica completou');
      console.log('   4. Verificar permissões do Firestore\n');
    }

    // 6. Salvar relatório
    console.log('═'.repeat(80));
    console.log('  RELATÓRIO');
    console.log('═'.repeat(80) + '\n');

    const report = {
      ...results,
      status: hasAlerts ? 'COM_ALERTAS' : 'OK',
      executedAt: new Date().toISOString(),
    };

    const reportPath = 'backups/dual-write-monitoring.json';
    const fs = await import('fs');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    console.log('📄 Relatório salvo em: ' + reportPath);
    console.log('📊 Status: ' + report.status);
    console.log('⏰ Executado em: ' + report.executedAt + '\n');

    console.log('═'.repeat(80) + '\n');

    process.exit(hasAlerts ? 1 : 0);

  } catch (error) {
    console.error('\n❌ ERRO no monitoramento:', error);
    console.error(error);
    process.exit(1);
  }
}

monitorDualWrite();
