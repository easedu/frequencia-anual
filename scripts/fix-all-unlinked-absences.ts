/**
 * Script para corrigir TODAS as faltas não vinculadas aos atestados
 *
 * Problema: Atestados criados antes da implementação da lógica de vínculo automático
 * têm faltas que não estão marcadas como justificadas nem vinculadas ao atestado.
 *
 * Executar: npx tsx scripts/fix-all-unlinked-absences.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xccjifrggpgevqftwdkx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjY2ppZnJnZ3BnZXZxZnR3ZGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDEwNTg4OSwiZXhwIjoyMDc1NjgxODg5fQ.XMoo6NLn6NhCrjoLAZZFhiMUoDKgBbbZa5pQ6q8BXKc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAllUnlinkedAbsences() {
  console.log('🔧 Iniciando correção de TODAS as faltas não vinculadas...\n');

  // 1. Buscar TODOS os atestados
  const { data: allCertificates, error: certError } = await supabase
    .from('medical_certificates')
    .select('*')
    .order('created_at', { ascending: true });

  if (certError) {
    console.error('❌ Erro ao buscar atestados:', certError);
    return;
  }

  console.log(`📄 Encontrados ${allCertificates?.length} atestados no total\n`);

  let totalCertificatesProcessed = 0;
  let totalAbsencesUpdated = 0;
  const studentsProcessed = new Set<string>();

  for (const cert of allCertificates || []) {
    totalCertificatesProcessed++;

    // Buscar nome do estudante
    const { data: student } = await supabase
      .from('students')
      .select('name')
      .eq('id', cert.student_id)
      .single();

    const studentName = student?.name || 'Desconhecido';
    studentsProcessed.add(cert.student_id);

    console.log(`\n[${totalCertificatesProcessed}/${allCertificates?.length}] 🏥 ${studentName}`);
    console.log(`   Atestado: ${cert.start_date} a ${cert.end_date} (${cert.days_covered} dias)`);

    // 2. Buscar faltas no período do atestado
    const { data: absences, error: absError } = await supabase
      .from('student_absences')
      .select('*')
      .eq('student_id', cert.student_id)
      .gte('absence_date', cert.start_date)
      .lte('absence_date', cert.end_date);

    if (absError) {
      console.error(`   ❌ Erro ao buscar faltas:`, absError);
      continue;
    }

    if (!absences || absences.length === 0) {
      console.log(`   ℹ️  Nenhuma falta no período`);
      continue;
    }

    console.log(`   📋 Encontradas ${absences.length} faltas`);

    // 3. Atualizar faltas que precisam de vínculo
    let updatedCount = 0;
    for (const absence of absences) {
      const needsUpdate = !absence.is_justified || absence.medical_certificate_id !== cert.id;

      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('student_absences')
          .update({
            is_justified: true,
            medical_certificate_id: cert.id,
          })
          .eq('id', absence.id);

        if (updateError) {
          console.error(`   ❌ Erro ao atualizar ${absence.absence_date}:`, updateError);
        } else {
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      console.log(`   ✅ Atualizadas ${updatedCount} faltas`);
      totalAbsencesUpdated += updatedCount;
    } else {
      console.log(`   ⏭️  Todas as faltas já estavam corretas`);
    }
  }

  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ CONCLUÍDO!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Estatísticas:`);
  console.log(`   • Atestados processados: ${totalCertificatesProcessed}`);
  console.log(`   • Estudantes afetados: ${studentsProcessed.size}`);
  console.log(`   • Faltas corrigidas: ${totalAbsencesUpdated}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

fixAllUnlinkedAbsences().catch(console.error);
