/**
 * FASE 0.2: ANÁLISE DE QUALIDADE DOS DADOS
 *
 * Identifica problemas nos dados ANTES da migração:
 * - Estudantes órfãos (IDs inexistentes)
 * - Datas inválidas
 * - Duplicatas
 * - Campos faltando
 *
 * Execução: node scripts/migration/01-analyze-data-quality.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

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

async function analyzeDataQuality() {
  console.log('\n' + '═'.repeat(80));
  console.log('  ANÁLISE DE QUALIDADE: Absences V2');
  console.log('═'.repeat(80) + '\n');

  const issues = {
    orphanStudents: [],
    invalidDates: [],
    duplicates: [],
    missingFields: [],
    justifiedWithoutAtestado: [],
  };

  try {
    // 1. Carregar todos os estudantes válidos
    console.log('📥 Carregando estudantes...');
    const studentsRef = collection(db, 'students');
    const studentsSnap = await getDocs(studentsRef);
    const validStudentIds = new Set();

    studentsSnap.forEach(doc => {
      const data = doc.data();
      if (!data.deleted) {
        validStudentIds.add(doc.id);
      }
    });

    console.log(`   ✅ ${validStudentIds.size} estudantes ativos carregados\n`);

    // 2. Carregar todas as faltas
    console.log('📥 Carregando faltas...');
    const absencesRef = collection(db, '2025', 'faltas', 'controle');
    const absencesSnap = await getDocs(absencesRef);

    console.log(`   ✅ ${absencesSnap.size} faltas carregadas\n`);

    // 3. Analisar cada falta
    console.log('🔍 Analisando qualidade dos dados...\n');

    const seenKeys = new Map(); // Para detectar duplicatas

    let analyzed = 0;
    absencesSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;

      analyzed++;

      // Verificar campos obrigatórios
      if (!data.estudanteId || !data.data) {
        issues.missingFields.push({
          id,
          missing: [],
        });
        if (!data.estudanteId) issues.missingFields[issues.missingFields.length - 1].missing.push('estudanteId');
        if (!data.data) issues.missingFields[issues.missingFields.length - 1].missing.push('data');
      }

      // Verificar estudante órfão
      if (data.estudanteId && !validStudentIds.has(data.estudanteId)) {
        issues.orphanStudents.push({
          id,
          estudanteId: data.estudanteId,
          data: data.data,
        });
      }

      // Verificar formato de data válido (YYYY-MM-DD)
      if (data.data) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(data.data)) {
          issues.invalidDates.push({
            id,
            estudanteId: data.estudanteId,
            data: data.data,
            format: 'Formato esperado: YYYY-MM-DD',
          });
        } else {
          // Validar se é data real
          const [year, month, day] = data.data.split('-').map(Number);
          const dateObj = new Date(year, month - 1, day);
          if (
            dateObj.getFullYear() !== year ||
            dateObj.getMonth() !== month - 1 ||
            dateObj.getDate() !== day
          ) {
            issues.invalidDates.push({
              id,
              estudanteId: data.estudanteId,
              data: data.data,
              format: 'Data inválida',
            });
          }
        }
      }

      // Verificar duplicatas (mesmo estudante + mesma data)
      if (data.estudanteId && data.data) {
        const key = `${data.estudanteId}|${data.data}`;
        if (seenKeys.has(key)) {
          issues.duplicates.push({
            id,
            estudanteId: data.estudanteId,
            data: data.data,
            firstOccurrence: seenKeys.get(key),
          });
        } else {
          seenKeys.set(key, id);
        }
      }

      // Verificar faltas justificadas sem atestado
      if (data.justified && !data.atestadoId) {
        issues.justifiedWithoutAtestado.push({
          id,
          estudanteId: data.estudanteId,
          data: data.data,
        });
      }

      // Progresso
      if (analyzed % 1000 === 0) {
        process.stdout.write(`\r   Analisados: ${analyzed}/${absencesSnap.size}`);
      }
    });

    console.log(`\r   ✅ ${analyzed} registros analisados\n`);

    // 4. Relatório
    console.log('═'.repeat(80));
    console.log('  RELATÓRIO DE QUALIDADE');
    console.log('═'.repeat(80) + '\n');

    const totalIssues =
      issues.orphanStudents.length +
      issues.invalidDates.length +
      issues.duplicates.length +
      issues.missingFields.length +
      issues.justifiedWithoutAtestado.length;

    console.log(`📊 Total de registros analisados: ${analyzed}`);
    console.log(`📊 Total de problemas encontrados: ${totalIssues}\n`);

    // Estudantes órfãos
    console.log(`❌ Estudantes órfãos (ID não existe em students/): ${issues.orphanStudents.length}`);
    if (issues.orphanStudents.length > 0) {
      console.log(`   Exemplos (primeiros 5):`);
      issues.orphanStudents.slice(0, 5).forEach(issue => {
        console.log(`   • ID falta: ${issue.id}`);
        console.log(`     Estudante: ${issue.estudanteId}`);
        console.log(`     Data: ${issue.data}\n`);
      });
      if (issues.orphanStudents.length > 5) {
        console.log(`   ... e mais ${issues.orphanStudents.length - 5} casos\n`);
      }
    }

    // Datas inválidas
    console.log(`❌ Datas inválidas: ${issues.invalidDates.length}`);
    if (issues.invalidDates.length > 0) {
      console.log(`   Exemplos (primeiros 5):`);
      issues.invalidDates.slice(0, 5).forEach(issue => {
        console.log(`   • ID falta: ${issue.id}`);
        console.log(`     Data: ${issue.data}`);
        console.log(`     Problema: ${issue.format}\n`);
      });
      if (issues.invalidDates.length > 5) {
        console.log(`   ... e mais ${issues.invalidDates.length - 5} casos\n`);
      }
    }

    // Duplicatas
    console.log(`⚠️  Duplicatas (mesmo estudante + data): ${issues.duplicates.length}`);
    if (issues.duplicates.length > 0) {
      console.log(`   Exemplos (primeiros 5):`);
      issues.duplicates.slice(0, 5).forEach(issue => {
        console.log(`   • Estudante: ${issue.estudanteId}`);
        console.log(`     Data: ${issue.data}`);
        console.log(`     IDs duplicados: ${issue.firstOccurrence}, ${issue.id}\n`);
      });
      if (issues.duplicates.length > 5) {
        console.log(`   ... e mais ${issues.duplicates.length - 5} casos\n`);
      }
    }

    // Campos faltando
    console.log(`❌ Campos obrigatórios faltando: ${issues.missingFields.length}`);
    if (issues.missingFields.length > 0) {
      console.log(`   Exemplos (primeiros 5):`);
      issues.missingFields.slice(0, 5).forEach(issue => {
        console.log(`   • ID: ${issue.id}`);
        console.log(`     Campos faltando: ${issue.missing.join(', ')}\n`);
      });
      if (issues.missingFields.length > 5) {
        console.log(`   ... e mais ${issues.missingFields.length - 5} casos\n`);
      }
    }

    // Justificadas sem atestado
    console.log(`⚠️  Faltas justificadas sem atestadoId: ${issues.justifiedWithoutAtestado.length}`);
    if (issues.justifiedWithoutAtestado.length > 0) {
      console.log(`   (Isso pode ser normal - algumas justificativas não têm atestado)\n`);
    }

    // 5. Conclusão
    console.log('═'.repeat(80));
    console.log('  RECOMENDAÇÕES');
    console.log('═'.repeat(80) + '\n');

    const criticalIssues =
      issues.orphanStudents.length +
      issues.invalidDates.length +
      issues.missingFields.length;

    if (criticalIssues === 0) {
      console.log('✅ DADOS EM EXCELENTE ESTADO!');
      console.log('   Nenhum problema crítico encontrado.');
      console.log('   Pode prosseguir com a migração com segurança.\n');

      if (issues.duplicates.length > 0) {
        console.log('⚠️  ATENÇÃO: Existem duplicatas.');
        console.log('   Recomendado: Executar script de remoção de duplicatas ANTES da migração.\n');
      }
    } else {
      console.log('❌ PROBLEMAS CRÍTICOS ENCONTRADOS!');
      console.log('   É NECESSÁRIO corrigir os seguintes problemas antes da migração:\n');

      if (issues.orphanStudents.length > 0) {
        console.log(`   • ${issues.orphanStudents.length} estudantes órfãos`);
        console.log(`     Ação: Deletar esses registros ou corrigir estudanteId\n`);
      }

      if (issues.invalidDates.length > 0) {
        console.log(`   • ${issues.invalidDates.length} datas inválidas`);
        console.log(`     Ação: Corrigir formato das datas para YYYY-MM-DD\n`);
      }

      if (issues.missingFields.length > 0) {
        console.log(`   • ${issues.missingFields.length} registros com campos faltando`);
        console.log(`     Ação: Preencher campos obrigatórios ou deletar registros\n`);
      }

      console.log('   ⚠️  NÃO PROSSEGUIR com migração até resolver esses problemas!\n');
    }

    console.log('═'.repeat(80) + '\n');

    // Retornar código de saída baseado em problemas críticos
    process.exit(criticalIssues > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ ERRO na análise:', error);
    process.exit(1);
  }
}

analyzeDataQuality();
