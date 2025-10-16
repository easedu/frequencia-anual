#!/usr/bin/env node

/**
 * Script para consultar mensagens WhatsApp de um estudante no Supabase
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ler .env.local
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;
const STUDENT_ID = process.argv[2] || 'ce5ac93c-bad9-4f82-af87-ffac12eb395f';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis Supabase não configuradas!');
  process.exit(1);
}

console.log('🔍 Consultando mensagens WhatsApp do estudante...');
console.log('📌 Student ID:', STUDENT_ID);
console.log('');

async function queryMessages() {
  try {
    // 1. Buscar ID interno do Supabase
    const studentResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/students?student_id=eq.${STUDENT_ID}&select=id`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!studentResponse.ok) {
      throw new Error(`Erro ao buscar estudante: ${studentResponse.status}`);
    }

    const students = await studentResponse.json();

    if (students.length === 0) {
      console.log('❌ Estudante não encontrado no Supabase!');
      console.log('');
      console.log('Possíveis causas:');
      console.log('  - Student ID incorreto');
      console.log('  - Estudante ainda não migrado para Supabase');
      return;
    }

    const internalStudentId = students[0].id;
    console.log('✅ Estudante encontrado (ID interno:', internalStudentId + ')');
    console.log('');

    // 2. Buscar interações com WhatsApp
    const interactionsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/family_interactions?student_id=eq.${internalStudentId}&whatsapp_message_id=not.is.null&select=*&order=created_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!interactionsResponse.ok) {
      throw new Error(`Erro ao buscar interações: ${interactionsResponse.status}`);
    }

    const interactions = await interactionsResponse.json();

    console.log('═'.repeat(80));
    console.log(`📨 MENSAGENS WHATSAPP ENCONTRADAS: ${interactions.length}`);
    console.log('═'.repeat(80));
    console.log('');

    if (interactions.length === 0) {
      console.log('Nenhuma mensagem WhatsApp encontrada para este estudante.');
      return;
    }

    // 3. Exibir cada mensagem
    interactions.forEach((msg, index) => {
      const num = index + 1;
      const date = new Date(msg.created_at).toLocaleString('pt-BR');
      const status = msg.whatsapp_status || 'N/A';
      const messageId = msg.whatsapp_message_id || 'N/A';

      console.log(`┌─ Mensagem #${num}`);
      console.log(`│  📅 Data: ${date}`);
      console.log(`│  📝 Descrição: ${msg.description || 'N/A'}`);
      console.log(`│  🆔 Message ID: ${messageId}`);
      console.log(`│  📊 Status Atual: ${status}`);
      console.log(`│  📱 Telefones: ${JSON.stringify(msg.whatsapp_phones || [])}`);
      console.log(`│`);
      console.log(`│  ⏰ Timestamps:`);
      console.log(`│     Enviado: ${msg.whatsapp_sent_at || 'N/A'}`);
      console.log(`│     Entregue: ${msg.whatsapp_delivered_at || 'N/A'}`);
      console.log(`│     Lido: ${msg.whatsapp_read_at || 'N/A'}`);
      console.log(`│     Atualizado: ${msg.whatsapp_updated_at || 'N/A'}`);

      // Histórico de status (se existir)
      if (msg.whatsapp_status_history && Array.isArray(msg.whatsapp_status_history)) {
        console.log(`│`);
        console.log(`│  📜 Histórico de Status:`);
        msg.whatsapp_status_history.forEach((history, idx) => {
          const historyDate = new Date(history.timestamp).toLocaleString('pt-BR');
          console.log(`│     ${idx + 1}. ${history.status} - ${historyDate} (${history.source || 'unknown'})`);
        });
      }

      console.log(`└${'─'.repeat(78)}`);
      console.log('');
    });

    // 4. Estatísticas
    console.log('═'.repeat(80));
    console.log('📊 ESTATÍSTICAS');
    console.log('═'.repeat(80));

    const statusCount = interactions.reduce((acc, msg) => {
      const status = msg.whatsapp_status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} mensagens`);
    });
    console.log('');

    // 5. Mensagens com problema (SENT há muito tempo)
    const problematicMessages = interactions.filter(msg => {
      if (msg.whatsapp_status !== 'SENT') return false;

      const sentAt = msg.whatsapp_sent_at ? new Date(msg.whatsapp_sent_at) : new Date(msg.created_at);
      const hoursSinceSent = (Date.now() - sentAt.getTime()) / (1000 * 60 * 60);

      return hoursSinceSent > 1; // Mais de 1 hora em SENT
    });

    if (problematicMessages.length > 0) {
      console.log('⚠️  MENSAGENS COM STATUS DESATUALIZADO:');
      console.log(`   ${problematicMessages.length} mensagens em "SENT" há mais de 1 hora`);
      console.log('');
      console.log('   IDs das mensagens:');
      problematicMessages.forEach(msg => {
        const hoursSinceSent = msg.whatsapp_sent_at
          ? ((Date.now() - new Date(msg.whatsapp_sent_at).getTime()) / (1000 * 60 * 60)).toFixed(1)
          : 'N/A';
        console.log(`   - ${msg.whatsapp_message_id} (${hoursSinceSent}h em SENT)`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

queryMessages();
