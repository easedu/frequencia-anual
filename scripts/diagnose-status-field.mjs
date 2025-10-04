#!/usr/bin/env node

/**
 * Script de Diagnóstico: Status da Migração V2 → V3
 * Verifica checkpoint e fornece informações sobre o que fazer a seguir
 */

import fs from 'fs';
import path from 'path';

const CHECKPOINT_FILE = 'backups/migration-checkpoint.json';

console.log('\n' + '═'.repeat(80));
console.log('  DIAGNÓSTICO: Status da Migração V2 → V3');
console.log('═'.repeat(80) + '\n');

// Verificar se checkpoint existe
if (!fs.existsSync(CHECKPOINT_FILE)) {
  console.log('❌ Checkpoint não encontrado!');
  console.log('📍 Arquivo esperado: ' + CHECKPOINT_FILE);
  console.log('\n⚠️  A migração não foi iniciada ou o arquivo foi deletado.\n');
  console.log('Para iniciar a migração, execute:');
  console.log('  bash scripts/migration/run-at-4am.sh');
  console.log('\nOU execute manualmente:');
  console.log('  node scripts/migration/03-migrate-historical-data-optimized.mjs\n');
  process.exit(1);
}

// Ler checkpoint
const checkpointData = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));

console.log('📋 CHECKPOINT ENCONTRADO\n');
console.log('═'.repeat(80));

// Status geral
console.log('\n📊 STATUS GERAL:\n');
console.log('   • Total de estudantes: ' + checkpointData.totalStudents);
console.log('   • Processados: ' + checkpointData.processedStudents + '/' + checkpointData.totalStudents);
console.log('   • Restantes: ' + (checkpointData.totalStudents - checkpointData.processedStudents));

const percentage = ((checkpointData.processedStudents / checkpointData.totalStudents) * 100).toFixed(1);
console.log('   • Progresso: ' + percentage + '%');

console.log('\n📈 ESTATÍSTICAS:\n');
console.log('   • Faltas migradas: ' + checkpointData.migratedAbsences);
console.log('   • Summaries criados: ' + checkpointData.summariesCreated);
console.log('   • Estudantes sem faltas: ' + checkpointData.skipped.length);
console.log('   • Erros encontrados: ' + checkpointData.errors.length);

console.log('\n⏰ ÚLTIMA EXECUÇÃO:\n');
console.log('   • Data/Hora: ' + checkpointData.lastSaved);
console.log('   • Status: ' + (checkpointData.status || 'desconhecido'));

if (checkpointData.note) {
  console.log('   • Nota: ' + checkpointData.note);
}

// Erros
if (checkpointData.errors.length > 0) {
  console.log('\n⚠️  ERROS REGISTRADOS:\n');
  checkpointData.errors.slice(0, 5).forEach(err => {
    console.log('   • ' + err.studentId + ': ' + err.error);
  });
  if (checkpointData.errors.length > 5) {
    console.log('   ... e mais ' + (checkpointData.errors.length - 5) + ' erros');
  }
}

// Recomendações
console.log('\n═'.repeat(80));
console.log('  PRÓXIMOS PASSOS');
console.log('═'.repeat(80) + '\n');

if (checkpointData.status === 'concluído') {
  console.log('✅ MIGRAÇÃO CONCLUÍDA!\n');
  console.log('Execute o script de validação:');
  console.log('  node scripts/migration/04-validate-migration.mjs\n');
} else if (checkpointData.status === 'interrupted_quota_exceeded' || checkpointData.status === 'em_progresso') {
  const remaining = checkpointData.totalStudents - checkpointData.processedStudents;
  const estimatedMinutes = Math.ceil(remaining / 10 * 1.5);
  
  console.log('⏳ MIGRAÇÃO INCOMPLETA\n');
  console.log('Restam ' + remaining + ' estudantes para processar.');
  console.log('Tempo estimado: ' + estimatedMinutes + ' minutos\n');
  
  // Verificar horário atual
  const now = new Date();
  const currentHour = now.getHours();
  
  if (currentHour >= 4 && currentHour < 23) {
    console.log('✅ A quota já foi resetada! Você pode retomar agora.\n');
    console.log('Para retomar a migração, execute:');
    console.log('  node scripts/migration/03-migrate-historical-data-optimized.mjs\n');
    console.log('Quando perguntar se deseja continuar do checkpoint, digite: s\n');
  } else {
    console.log('⏰ A quota reseta às 4h da manhã (horário de Brasília).\n');
    
    const hoursUntil4am = currentHour < 4 ? (4 - currentHour) : (24 - currentHour + 4);
    
    console.log('Opção 1: Agendar execução automática às 4h');
    console.log('  bash scripts/migration/run-at-4am.sh\n');
    
    console.log('Opção 2: Executar manualmente amanhã às 4h');
    console.log('  node scripts/migration/03-migrate-historical-data-optimized.mjs\n');
    
    console.log('Opção 3: Upgrade para Blaze (pay-as-you-go) e executar agora');
    console.log('  https://console.firebase.google.com/project/frequencia-anual/usage\n');
    
    console.log('Tempo até reset da quota: ~' + hoursUntil4am + ' horas\n');
  }
} else {
  console.log('⚠️  Status desconhecido: ' + checkpointData.status + '\n');
  console.log('Verifique o arquivo de checkpoint manualmente:');
  console.log('  cat ' + CHECKPOINT_FILE + '\n');
}

console.log('═'.repeat(80));
console.log('\n📖 Documentação completa: docs/RETOMAR-MIGRACAO.md\n');
