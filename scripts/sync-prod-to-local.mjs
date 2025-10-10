#!/usr/bin/env node

/**
 * 🔄 Sincronização: Produção → Local (Firebase Emulators)
 *
 * Este script exporta dados de produção e salva localmente
 * para uso com Firebase Emulators.
 *
 * Uso: npm run sync:prod-to-local
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Inicializar Firebase Admin
function initializeFirebase() {
  log('\n🔧 Inicializando Firebase Admin SDK...', 'blue');

  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY não encontrada no .env.local');
    }

    const serviceAccount = JSON.parse(serviceAccountKey);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });

    log('✅ Firebase inicializado com sucesso', 'green');
    return admin.firestore();
  } catch (error) {
    log(`❌ Erro ao inicializar Firebase: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Exportar coleção
async function exportCollection(db, collectionName) {
  try {
    log(`\n📦 Exportando coleção: ${collectionName}...`, 'blue');

    const snapshot = await db.collection(collectionName).get();
    const docs = [];

    snapshot.forEach(doc => {
      docs.push({
        id: doc.id,
        data: doc.data()
      });
    });

    log(`✅ ${docs.length} documentos exportados`, 'green');
    return docs;
  } catch (error) {
    log(`❌ Erro ao exportar ${collectionName}: ${error.message}`, 'red');
    return [];
  }
}

// Salvar dados localmente
function saveToLocal(collectionName, docs, outputDir) {
  try {
    const filePath = path.join(outputDir, `${collectionName}.json`);

    fs.writeFileSync(
      filePath,
      JSON.stringify(docs, null, 2),
      'utf-8'
    );

    const sizeKB = (fs.statSync(filePath).size / 1024).toFixed(2);
    log(`💾 Salvo em: ${filePath} (${sizeKB} KB)`, 'green');

    return true;
  } catch (error) {
    log(`❌ Erro ao salvar ${collectionName}: ${error.message}`, 'red');
    return false;
  }
}

// Script principal
async function main() {
  log('\n╔════════════════════════════════════════════════╗', 'bright');
  log('║   🔄 SINCRONIZAÇÃO: PRODUÇÃO → LOCAL          ║', 'bright');
  log('╚════════════════════════════════════════════════╝', 'bright');

  const startTime = Date.now();

  // 1. Preparar diretório de output
  const outputDir = path.join(__dirname, '..', 'firebase-data', 'exports');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    log(`\n📁 Diretório criado: ${outputDir}`, 'yellow');
  }

  // 2. Inicializar Firebase
  const db = initializeFirebase();

  // 3. Lista de coleções para exportar
  const collections = [
    'estudantes',
    'absences',
    'users',
    'tarefas',
    '2025', // Ano letivo
  ];

  log('\n📊 Iniciando exportação de coleções...', 'blue');
  log(`Total: ${collections.length} coleções\n`, 'yellow');

  const results = {
    success: [],
    failed: [],
    totalDocs: 0
  };

  // 4. Exportar cada coleção
  for (const collectionName of collections) {
    const docs = await exportCollection(db, collectionName);

    if (docs.length > 0) {
      const saved = saveToLocal(collectionName, docs, outputDir);

      if (saved) {
        results.success.push(collectionName);
        results.totalDocs += docs.length;
      } else {
        results.failed.push(collectionName);
      }
    } else {
      log(`⚠️  Coleção ${collectionName} vazia ou erro ao exportar`, 'yellow');
      results.failed.push(collectionName);
    }
  }

  // 5. Exportar subcoleções de estudantes (atestados, contatos)
  log('\n📦 Exportando subcoleções...', 'blue');

  const estudantesSnapshot = await db.collection('estudantes').get();
  let totalSubcollections = 0;

  for (const estudanteDoc of estudantesSnapshot.docs) {
    const estudanteId = estudanteDoc.id;

    // Exportar atestados
    const atestadosSnapshot = await db
      .collection(`estudantes/${estudanteId}/atestados`)
      .get();

    if (!atestadosSnapshot.empty) {
      const atestadosDocs = [];
      atestadosSnapshot.forEach(doc => {
        atestadosDocs.push({
          id: doc.id,
          estudanteId,
          data: doc.data()
        });
      });

      const subcollectionDir = path.join(outputDir, 'subcollections');
      if (!fs.existsSync(subcollectionDir)) {
        fs.mkdirSync(subcollectionDir, { recursive: true });
      }

      const filePath = path.join(
        subcollectionDir,
        `atestados_${estudanteId}.json`
      );

      fs.writeFileSync(
        filePath,
        JSON.stringify(atestadosDocs, null, 2),
        'utf-8'
      );

      totalSubcollections += atestadosDocs.length;
    }
  }

  log(`✅ ${totalSubcollections} documentos de subcoleções exportados`, 'green');

  // 6. Criar arquivo de metadata
  const metadata = {
    exportDate: new Date().toISOString(),
    collections: results.success,
    totalDocuments: results.totalDocs + totalSubcollections,
    exportedBy: 'sync-prod-to-local.mjs',
    version: '1.0.0'
  };

  fs.writeFileSync(
    path.join(outputDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );

  // 7. Resumo final
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  log('\n╔════════════════════════════════════════════════╗', 'bright');
  log('║             📊 RESUMO DA EXPORTAÇÃO            ║', 'bright');
  log('╚════════════════════════════════════════════════╝', 'bright');

  log(`\n✅ Coleções exportadas: ${results.success.length}`, 'green');
  results.success.forEach(name => log(`   - ${name}`, 'green'));

  if (results.failed.length > 0) {
    log(`\n❌ Coleções com falha: ${results.failed.length}`, 'red');
    results.failed.forEach(name => log(`   - ${name}`, 'red'));
  }

  log(`\n📊 Total de documentos: ${results.totalDocs + totalSubcollections}`, 'yellow');
  log(`⏱️  Tempo decorrido: ${elapsed}s`, 'yellow');
  log(`📁 Dados salvos em: ${outputDir}\n`, 'blue');

  log('╔════════════════════════════════════════════════╗', 'bright');
  log('║              ✨ PRÓXIMOS PASSOS                ║', 'bright');
  log('╚════════════════════════════════════════════════╝', 'bright');

  log('\n1. Converter JSON para formato de Emulators:', 'yellow');
  log('   npm run convert:exports', 'blue');

  log('\n2. Importar para Emulators:', 'yellow');
  log('   npm run emulators:import', 'blue');

  log('\n3. Verificar dados:', 'yellow');
  log('   http://localhost:4000\n', 'blue');

  process.exit(0);
}

// Executar
main().catch(error => {
  log(`\n❌ Erro fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
