#!/usr/bin/env node

/**
 * Script para cadastrar Ano Letivo 2025 no Supabase
 *
 * Uso:
 * node scripts/setup-academic-year-2025.mjs
 */

import fetch from 'node-fetch';

// ============================================================================
// CONFIGURAÇÃO - AJUSTE CONFORME NECESSÁRIO
// ============================================================================

const ACADEMIC_YEAR_DATA = {
  year: 2025,
  bimesters: {
    '1º Bimestre': {
      startDate: '03/02/2025', // Segunda-feira após Carnaval
      endDate: '30/04/2025',
      dates: generateSchoolDays('2025-02-03', '2025-04-30')
    },
    '2º Bimestre': {
      startDate: '05/05/2025',
      endDate: '11/07/2025',
      dates: generateSchoolDays('2025-05-05', '2025-07-11')
    },
    '3º Bimestre': {
      startDate: '28/07/2025',
      endDate: '03/10/2025',
      dates: generateSchoolDays('2025-07-28', '2025-10-03')
    },
    '4º Bimestre': {
      startDate: '06/10/2025',
      endDate: '19/12/2025',
      dates: generateSchoolDays('2025-10-06', '2025-12-19')
    }
  }
};

// Feriados de 2025 (ajustar conforme necessário)
const HOLIDAYS_2025 = [
  '2025-01-01', // Ano Novo
  '2025-02-17', // Carnaval
  '2025-02-18', // Carnaval
  '2025-02-19', // Carnaval
  '2025-04-18', // Paixão
  '2025-04-21', // Tiradentes
  '2025-05-01', // Dia do Trabalho
  '2025-06-19', // Corpus Christi
  '2025-07-09', // Revolução Constitucionalista (SP)
  '2025-09-07', // Independência
  '2025-10-12', // Nossa Senhora Aparecida
  '2025-11-02', // Finados
  '2025-11-15', // Proclamação da República
  '2025-11-20', // Consciência Negra
  '2025-12-25', // Natal
];

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Gera dias letivos entre duas datas (exclui finais de semana e feriados)
 */
function generateSchoolDays(startISO, endISO) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const days = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay();

    // Pular finais de semana (0 = Domingo, 6 = Sábado)
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Pular feriados
    if (HOLIDAYS_2025.includes(dateStr)) continue;

    // Converter para formato brasileiro DD/MM/YYYY
    const [year, month, day] = dateStr.split('-');
    const brazilianDate = `${day}/${month}/${year}`;

    days.push({
      date: brazilianDate,
      isChecked: true // Todos são dias letivos por padrão
    });
  }

  return days;
}

/**
 * Salva ano letivo via API
 */
async function saveAcademicYear() {
  try {
    console.log('🔄 Salvando ano letivo 2025 no Supabase...\n');

    // Mostrar resumo
    console.log('📊 Resumo:');
    Object.entries(ACADEMIC_YEAR_DATA.bimesters).forEach(([name, data]) => {
      console.log(`   ${name}: ${data.dates.length} dias letivos (${data.startDate} - ${data.endDate})`);
    });

    const totalDays = Object.values(ACADEMIC_YEAR_DATA.bimesters)
      .reduce((sum, b) => sum + b.dates.length, 0);
    console.log(`   TOTAL: ${totalDays} dias letivos\n`);

    // IMPORTANTE: Você precisa fornecer um token de autenticação
    console.log('⚠️  ATENÇÃO: Este script precisa de autenticação!');
    console.log('   Alternativa 1: Acesse /cadastrar-ano-letivo pela interface');
    console.log('   Alternativa 2: Configure um token de admin abaixo\n');

    // Se você tiver um token de admin, descomente e configure:
    /*
    const response = await fetch('http://localhost:3000/api/academic-years/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer SEU_TOKEN_AQUI'
      },
      body: JSON.stringify(ACADEMIC_YEAR_DATA)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro na API: ${response.status} - ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    console.log('✅ Ano letivo salvo com sucesso!');
    console.log(result);
    */

    // Por enquanto, apenas gera o JSON para você copiar
    console.log('📋 Copie o JSON abaixo e cole na interface em /cadastrar-ano-letivo:\n');
    console.log(JSON.stringify(ACADEMIC_YEAR_DATA, null, 2));

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

// ============================================================================
// EXECUÇÃO
// ============================================================================

saveAcademicYear();
