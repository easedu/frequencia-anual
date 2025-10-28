#!/usr/bin/env node

/**
 * Migration Script: Prova São Paulo (Firebase → Supabase)
 *
 * Migra dados da Prova São Paulo do backup do Firebase para a coluna exam_scores do Supabase.
 *
 * Uso:
 *   node scripts/migrate-prova-sao-paulo.mjs
 *   node scripts/migrate-prova-sao-paulo.mjs --dry-run  # Apenas simula
 *
 * Pré-requisitos:
 *   - Migration 009 executada (coluna exam_scores criada)
 *   - Backup do Firebase em backups/students-backup-*.json
 *   - Variáveis de ambiente configuradas
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis de ambiente faltando:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 50; // Processar em lotes de 50

// ============================================================================
// Helper Functions
// ============================================================================

function findLatestBackup() {
  const backupsDir = path.join(__dirname, '..', 'backups');
  const files = fs.readdirSync(backupsDir);

  const studentBackups = files
    .filter(f => f.startsWith('students-backup-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (studentBackups.length === 0) {
    throw new Error('Nenhum backup de estudantes encontrado em backups/');
  }

  return path.join(backupsDir, studentBackups[0]);
}

async function resolveFirebaseUUIDToInternal(firebaseUUID) {
  const { data, error } = await supabase
    .from('students')
    .select('id')
    .eq('student_id', firebaseUUID)
    .eq('deleted', false)
    .maybeSingle();

  if (error) {
    console.error(`  ❌ Erro ao resolver UUID ${firebaseUUID}:`, error.message);
    return null;
  }

  return data?.id || null;
}

async function updateExamScores(internalId, examScores) {
  const { error } = await supabase
    .from('students')
    .update({ exam_scores: examScores })
    .eq('id', internalId);

  if (error) {
    console.error(`  ❌ Erro ao atualizar exam_scores:`, error.message);
    return false;
  }

  return true;
}

// ============================================================================
// Main Migration Logic
// ============================================================================

async function migrate() {
  console.log('🎓 Migração: Prova São Paulo (Firebase → Supabase)');
  console.log('='.repeat(60));
  console.log('');

  if (DRY_RUN) {
    console.log('⚠️  MODO DRY-RUN: Nenhuma alteração será feita no banco\n');
  }

  // 1. Load backup
  console.log('📂 Carregando backup do Firebase...');
  const backupPath = findLatestBackup();
  console.log(`   Arquivo: ${path.basename(backupPath)}`);

  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
  const students = backup.data;

  console.log(`   Total de estudantes no backup: ${students.length}\n`);

  // 2. Filter students with exam data
  const studentsWithExams = students.filter(s =>
    s.provaSaoPaulo && Array.isArray(s.provaSaoPaulo) && s.provaSaoPaulo.length > 0
  );

  console.log(`📊 Estudantes com dados da Prova São Paulo: ${studentsWithExams.length}\n`);

  if (studentsWithExams.length === 0) {
    console.log('✅ Nenhum dado para migrar. Concluído!');
    return;
  }

  // 3. Migrate in batches
  const summary = {
    total: studentsWithExams.length,
    success: 0,
    notFound: 0,
    errors: 0,
    skipped: 0,
  };

  console.log('🔄 Iniciando migração...\n');

  for (let i = 0; i < studentsWithExams.length; i += BATCH_SIZE) {
    const batch = studentsWithExams.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(studentsWithExams.length / BATCH_SIZE);

    console.log(`📦 Lote ${batchNum}/${totalBatches} (${batch.length} estudantes)`);

    for (const student of batch) {
      const firebaseUUID = student.estudanteId;
      const examScores = student.provaSaoPaulo;

      // Check if already has data in Supabase
      const { data: existing } = await supabase
        .from('students')
        .select('id, exam_scores')
        .eq('student_id', firebaseUUID)
        .eq('deleted', false)
        .maybeSingle();

      if (!existing) {
        console.log(`  ⚠️  ${student.nome}: Não encontrado no Supabase`);
        summary.notFound++;
        continue;
      }

      // Skip if already has data
      if (existing.exam_scores && existing.exam_scores.length > 0) {
        console.log(`  ⏭️  ${student.nome}: Já possui dados (${existing.exam_scores.length} registros)`);
        summary.skipped++;
        continue;
      }

      // Migrate data
      if (DRY_RUN) {
        console.log(`  🔍 ${student.nome}: ${examScores.length} registros (DRY-RUN)`);
        summary.success++;
      } else {
        const success = await updateExamScores(existing.id, examScores);

        if (success) {
          console.log(`  ✅ ${student.nome}: ${examScores.length} registros migrados`);
          summary.success++;
        } else {
          console.log(`  ❌ ${student.nome}: Erro ao migrar`);
          summary.errors++;
        }
      }
    }

    console.log('');

    // Small delay between batches
    if (i + BATCH_SIZE < studentsWithExams.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // 4. Summary
  console.log('='.repeat(60));
  console.log('📊 RESUMO DA MIGRAÇÃO');
  console.log('='.repeat(60));
  console.log(`Total de estudantes:     ${summary.total}`);
  console.log(`✅ Migrados com sucesso:  ${summary.success}`);
  console.log(`⏭️  Já possuíam dados:     ${summary.skipped}`);
  console.log(`⚠️  Não encontrados:       ${summary.notFound}`);
  console.log(`❌ Erros:                 ${summary.errors}`);
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n⚠️  MODO DRY-RUN: Execute sem --dry-run para aplicar as mudanças');
  } else {
    console.log('\n✅ Migração concluída!');
  }
}

// ============================================================================
// Execute
// ============================================================================

migrate().catch(error => {
  console.error('\n❌ Erro fatal durante migração:', error);
  process.exit(1);
});
