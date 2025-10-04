/**
 * FASE 0.1: BACKUP COMPLETO DE ABSENCES
 *
 * Exporta TODAS as faltas de 2025/faltas/controle para arquivo JSON
 * CRÍTICO: Este backup é a garantia de ZERO perda de dados
 *
 * Execução: node scripts/migration/00-backup-absences.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

async function backupAbsences() {
  console.log('\n' + '═'.repeat(80));
  console.log('  BACKUP COMPLETO: Absences V2 (2025/faltas/controle)');
  console.log('═'.repeat(80) + '\n');

  const startTime = Date.now();

  try {
    // 1. Buscar TODAS as faltas
    console.log('📥 Buscando todas as faltas do Firestore...');
    const absencesRef = collection(db, '2025', 'faltas', 'controle');
    const snapshot = await getDocs(absencesRef);

    const totalDocs = snapshot.size;
    console.log(`   ✅ ${totalDocs} documentos encontrados\n`);

    // 2. Extrair dados
    console.log('📊 Extraindo dados dos documentos...');
    const absences = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      absences.push({
        id: doc.id,
        estudanteId: data.estudanteId,
        data: data.data,
        justified: data.justified,
        atestadoId: data.atestadoId || null,
        turma: data.turma || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        createdBy: data.createdBy || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        updatedBy: data.updatedBy || null,
        deleted: data.deleted || false,
        deletedAt: data.deletedAt?.toDate?.()?.toISOString() || null,
        deletedBy: data.deletedBy || null,
      });
    });

    console.log(`   ✅ ${absences.length} registros extraídos\n`);

    // 3. Criar nome do arquivo com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `absences-backup-${timestamp}.json`;
    const filepath = path.join('backups', filename);

    // 4. Salvar arquivo
    console.log('💾 Salvando backup em arquivo...');
    const backupData = {
      timestamp: new Date().toISOString(),
      source: '2025/faltas/controle',
      totalRecords: absences.length,
      records: absences,
    };

    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log(`   ✅ Arquivo salvo: ${filepath}\n`);

    // 5. Calcular checksum MD5
    console.log('🔐 Calculando checksum MD5...');
    const fileContent = fs.readFileSync(filepath, 'utf-8');
    const checksum = crypto.createHash('md5').update(fileContent).digest('hex');

    // Salvar checksum em arquivo separado
    const checksumFile = `${filepath}.md5`;
    fs.writeFileSync(checksumFile, `${checksum}  ${filename}\n`, 'utf-8');
    console.log(`   ✅ Checksum: ${checksum}`);
    console.log(`   ✅ Salvo em: ${checksumFile}\n`);

    // 6. Estatísticas
    const fileSize = fs.statSync(filepath).size;
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

    console.log('═'.repeat(80));
    console.log('  BACKUP CONCLUÍDO COM SUCESSO');
    console.log('═'.repeat(80));
    console.log(`\n📊 Estatísticas:`);
    console.log(`   • Total de registros: ${absences.length}`);
    console.log(`   • Tamanho do arquivo: ${fileSizeMB} MB`);
    console.log(`   • Checksum MD5: ${checksum}`);
    console.log(`   • Tempo de execução: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

    // 7. Análise rápida dos dados
    console.log(`\n📈 Análise rápida:`);
    const justified = absences.filter(a => a.justified).length;
    const unjustified = absences.filter(a => !a.justified).length;
    const deleted = absences.filter(a => a.deleted).length;
    const uniqueStudents = new Set(absences.map(a => a.estudanteId)).size;
    const uniqueDates = new Set(absences.map(a => a.data)).size;

    console.log(`   • Estudantes únicos: ${uniqueStudents}`);
    console.log(`   • Datas únicas: ${uniqueDates}`);
    console.log(`   • Faltas justificadas: ${justified}`);
    console.log(`   • Faltas não justificadas: ${unjustified}`);
    console.log(`   • Registros deletados (soft): ${deleted}`);

    console.log(`\n✅ VALIDAÇÃO:`);
    console.log(`   • Arquivo existe: ${fs.existsSync(filepath) ? 'SIM ✓' : 'NÃO ✗'}`);
    console.log(`   • Tamanho > 0: ${fileSize > 0 ? 'SIM ✓' : 'NÃO ✗'}`);
    console.log(`   • Checksum gerado: ${fs.existsSync(checksumFile) ? 'SIM ✓' : 'NÃO ✗'}`);
    console.log(`   • Total no arquivo = Total no Firestore: ${absences.length === totalDocs ? 'SIM ✓' : 'NÃO ✗'}`);

    console.log('\n' + '═'.repeat(80));
    console.log('  ⚠️  IMPORTANTE: Guardar este backup em local seguro!');
    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERRO no backup:', error);
    console.error('\n⚠️  ATENÇÃO: Backup falhou! NÃO prosseguir com migração!\n');
    process.exit(1);
  }

  process.exit(0);
}

backupAbsences();
