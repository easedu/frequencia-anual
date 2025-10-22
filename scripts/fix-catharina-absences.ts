/**
 * Script para corrigir faltas não vinculadas aos atestados
 *
 * Caso: CATHARINA SOARES RAMOS tem atestados mas faltas não estão vinculadas
 *
 * Executar: npx tsx scripts/fix-catharina-absences.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xccjifrggpgevqftwdkx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjY2ppZnJnZ3BnZXZxZnR3ZGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDEwNTg4OSwiZXhwIjoyMDc1NjgxODg5fQ.XMoo6NLn6NhCrjoLAZZFhiMUoDKgBbbZa5pQ6q8BXKc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCatharinaAbsences() {
  console.log('🔧 Iniciando correção de faltas da CATHARINA...\n');

  const studentId = '30f7d11f-cd4f-42ef-b9ef-8ed2a59b03ab'; // Internal ID

  // 1. Buscar todos os atestados da estudante
  const { data: certificates, error: certError } = await supabase
    .from('medical_certificates')
    .select('*')
    .eq('student_id', studentId)
    .order('start_date', { ascending: true });

  if (certError) {
    console.error('❌ Erro ao buscar atestados:', certError);
    return;
  }

  console.log(`📄 Encontrados ${certificates?.length} atestados:\n`);

  let totalUpdated = 0;

  for (const cert of certificates || []) {
    console.log(`\n🏥 Atestado ID: ${cert.id}`);
    console.log(`   Período: ${cert.start_date} a ${cert.end_date}`);
    console.log(`   Dias: ${cert.days_covered}`);

    // 2. Buscar faltas no período do atestado
    const { data: absences, error: absError } = await supabase
      .from('student_absences')
      .select('*')
      .eq('student_id', studentId)
      .gte('absence_date', cert.start_date)
      .lte('absence_date', cert.end_date);

    if (absError) {
      console.error(`   ❌ Erro ao buscar faltas:`, absError);
      continue;
    }

    console.log(`   📋 Encontradas ${absences?.length} faltas no período`);

    // 3. Atualizar cada falta
    for (const absence of absences || []) {
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
          console.error(`   ❌ Erro ao atualizar falta ${absence.absence_date}:`, updateError);
        } else {
          console.log(`   ✅ Atualizada falta: ${absence.absence_date}`);
          totalUpdated++;
        }
      } else {
        console.log(`   ⏭️  Falta ${absence.absence_date} já está correta`);
      }
    }
  }

  console.log(`\n\n✅ Concluído! Total de faltas atualizadas: ${totalUpdated}`);
}

fixCatharinaAbsences().catch(console.error);
