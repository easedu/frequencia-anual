/**
 * 🚀 MIGRAÇÃO DE DADOS DE DEFICIÊNCIA: Firestore → Supabase
 *
 * Este script migra dados de deficiência do Firestore para o Supabase.
 *
 * ESTRUTURA FIRESTORE:
 * 2025/lista_de_estudantes/estudantes (array) → cada estudante tem campo "deficiencia"
 *
 * ESTRUTURA SUPABASE:
 * students.disabilities (JSONB array)
 *
 * USO:
 * node scripts/migrate-disabilities-from-firestore.mjs
 *
 * FLAGS:
 * --dry-run : Simula migração sem escrever no Supabase
 * --limit=N : Limita a N estudantes (para testes)
 *
 * EXEMPLO:
 * node scripts/migrate-disabilities-from-firestore.mjs --dry-run --limit=5
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// ═══════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════

// Ler .env.local
const envFile = readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

// Parse flags de linha de comando
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitMatch = args.find(arg => arg.startsWith('--limit='));
const limit = limitMatch ? parseInt(limitMatch.split('=')[1]) : null;

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🚀 MIGRAÇÃO: Dados de Deficiência (Firestore → Supabase)');
console.log('═══════════════════════════════════════════════════════════\n');
console.log(`Modo: ${dryRun ? '🧪 DRY-RUN (simulação)' : '✍️  PRODUÇÃO (escrita real)'}`);
if (limit) console.log(`Limite: ${limit} estudantes`);
console.log('');

// ═══════════════════════════════════════════════════════════
// INICIALIZAR FIREBASE
// ═══════════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

console.log('✅ Firebase conectado');

// ═══════════════════════════════════════════════════════════
// INICIALIZAR SUPABASE
// ═══════════════════════════════════════════════════════════

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY; // Service role = full access

if (!supabaseServiceKey) {
  console.error('❌ ERRO: SUPABASE_SERVICE_ROLE_KEY não encontrada no .env.local');
  console.error('   Adicione: SUPABASE_SERVICE_ROLE_KEY=sua_service_key');
  console.error('   Obtenha em: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('✅ Supabase conectado\n');

// ═══════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════

/**
 * Converte dados de deficiência do formato Firestore para Supabase
 */
function convertDeficienciaToDisabilities(deficiencia) {
  if (!deficiencia || !deficiencia.estudanteComDeficiencia) {
    return []; // Sem deficiência
  }

  const disabilities = [];

  // Iterar sobre os tipos de deficiência
  const tipos = deficiencia.tipoDeficiencia || [];

  tipos.forEach(tipo => {
    disabilities.push({
      type: tipo,
      description: null,
      cid: null,
      aee_type: deficiencia.aee || null,
      needs_ave: !!deficiencia.nomeAve,
      ave_name: deficiencia.nomeAve || null,
      ave_justification: deficiencia.justificativaAve || null,
      estagiario_name: deficiencia.nomeEstagiario || null,
      instituicao: deficiencia.instituicao || null,
      horario_atendimento: deficiencia.horarioAtendimento || null,
      possui_barreiras: deficiencia.possuiBarreiras !== undefined ? deficiencia.possuiBarreiras : true,
    });
  });

  // Se não tem tipos mas tem flag de deficiência, criar um registro genérico
  if (disabilities.length === 0 && deficiencia.estudanteComDeficiencia) {
    disabilities.push({
      type: 'NÃO ESPECIFICADO',
      description: null,
      cid: null,
      aee_type: deficiencia.aee || null,
      needs_ave: !!deficiencia.nomeAve,
      ave_name: deficiencia.nomeAve || null,
      ave_justification: deficiencia.justificativaAve || null,
      estagiario_name: deficiencia.nomeEstagiario || null,
      instituicao: deficiencia.instituicao || null,
      horario_atendimento: deficiencia.horarioAtendimento || null,
      possui_barreiras: deficiencia.possuiBarreiras !== undefined ? deficiencia.possuiBarreiras : true,
    });
  }

  return disabilities;
}

// ═══════════════════════════════════════════════════════════
// MIGRAÇÃO
// ═══════════════════════════════════════════════════════════

async function migrate() {
  try {
    console.log('📊 Buscando dados do Firestore...\n');

    // Buscar documento principal
    const listaRef = doc(db, '2025', 'lista_de_estudantes');
    const listaSnapshot = await getDoc(listaRef);

    if (!listaSnapshot.exists()) {
      console.error('❌ Documento 2025/lista_de_estudantes não encontrado');
      process.exit(1);
    }

    const data = listaSnapshot.data();
    let estudantes = data.estudantes || [];

    console.log(`✅ ${estudantes.length} estudantes encontrados no Firestore`);

    // Filtrar apenas estudantes COM deficiência
    const estudantesComDeficiencia = estudantes.filter(est => {
      const def = est.deficiencia;
      return (
        def?.estudanteComDeficiencia ||
        (def?.tipoDeficiencia && def.tipoDeficiencia.length > 0) ||
        def?.nomeEstagiario !== 'NÃO NECESSITA' ||
        def?.nomeAve ||
        def?.aee
      );
    });

    console.log(`✅ ${estudantesComDeficiencia.length} estudantes COM dados de deficiência\n`);

    // Aplicar limite se especificado
    if (limit && estudantesComDeficiencia.length > limit) {
      estudantesComDeficiencia.splice(limit);
      console.log(`⚠️  Limitando a ${limit} estudantes (flag --limit)\n`);
    }

    // Estatísticas
    let migrados = 0;
    let erros = 0;
    let naoEncontrados = 0;

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📝 Iniciando migração...\n');

    for (const estudante of estudantesComDeficiencia) {
      const estudanteId = estudante.estudanteId;
      const nome = estudante.nome;
      const deficiencia = estudante.deficiencia;

      console.log(`\n🔹 Processando: ${nome} (ID: ${estudanteId})`);

      // Converter deficiência para formato Supabase
      const disabilities = convertDeficienciaToDisabilities(deficiencia);

      console.log(`   └─ ${disabilities.length} tipo(s) de deficiência identificado(s)`);

      if (!dryRun) {
        // Buscar estudante no Supabase
        const { data: studentData, error: selectError } = await supabase
          .from('students')
          .select('id, student_id, name')
          .eq('student_id', estudanteId)
          .single();

        if (selectError || !studentData) {
          console.log(`   ❌ Estudante não encontrado no Supabase (ID: ${estudanteId})`);
          naoEncontrados++;
          continue;
        }

        console.log(`   ✅ Encontrado no Supabase: ${studentData.name}`);

        // Atualizar campo disabilities
        const { error: updateError } = await supabase
          .from('students')
          .update({ disabilities })
          .eq('student_id', estudanteId);

        if (updateError) {
          console.log(`   ❌ Erro ao atualizar: ${updateError.message}`);
          erros++;
        } else {
          console.log(`   ✅ Migrado com sucesso!`);
          migrados++;
        }
      } else {
        // Modo dry-run: apenas simular
        console.log(`   🧪 [DRY-RUN] Seria atualizado com:`);
        console.log(JSON.stringify(disabilities, null, 2));
        migrados++;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // RELATÓRIO FINAL
    // ═══════════════════════════════════════════════════════════

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 RELATÓRIO FINAL');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`Total processados:     ${estudantesComDeficiencia.length}`);
    console.log(`✅ Migrados com sucesso: ${migrados}`);
    console.log(`❌ Erros:                ${erros}`);
    console.log(`⚠️  Não encontrados:     ${naoEncontrados}`);

    if (dryRun) {
      console.log('\n🧪 Modo DRY-RUN: Nenhum dado foi modificado no Supabase');
      console.log('   Execute sem --dry-run para aplicar as mudanças');
    } else {
      console.log('\n✅ Migração concluída!');
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ ERRO FATAL:', error);
    process.exit(1);
  }
}

// Executar migração
migrate();
