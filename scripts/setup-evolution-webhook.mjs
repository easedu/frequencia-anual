#!/usr/bin/env node

/**
 * Script para configurar webhook na Evolution API
 *
 * Uso:
 *   node scripts/setup-evolution-webhook.mjs
 *
 * Ou com URL customizada:
 *   WEBHOOK_URL=https://seu-dominio.com node scripts/setup-evolution-webhook.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ler .env.local manualmente
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const EVOLUTION_API_BASE_URL = process.env.EVOLUTION_API_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME;

// URL do webhook (usa env var ou localhost)
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/evolution/webhooks/message-status';

if (!EVOLUTION_API_BASE_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
  console.error('❌ Variáveis de ambiente faltando!');
  console.error('   EVOLUTION_API_BASE_URL:', EVOLUTION_API_BASE_URL ? '✅' : '❌');
  console.error('   EVOLUTION_API_KEY:', EVOLUTION_API_KEY ? '✅' : '❌');
  console.error('   EVOLUTION_INSTANCE_NAME:', EVOLUTION_INSTANCE_NAME ? '✅' : '❌');
  process.exit(1);
}

console.log('🔧 Configurando webhook na Evolution API...\n');
console.log('📍 Instance:', EVOLUTION_INSTANCE_NAME);
console.log('🌐 Webhook URL:', WEBHOOK_URL);
console.log('');

async function setupWebhook() {
  try {
    // 1. Verificar instância
    console.log('1️⃣ Verificando instância...');
    const instanceCheck = await fetch(
      `${EVOLUTION_API_BASE_URL}/instance/connectionState/${EVOLUTION_INSTANCE_NAME}`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      }
    );

    if (!instanceCheck.ok) {
      throw new Error(`Instância não encontrada ou indisponível (status: ${instanceCheck.status})`);
    }

    const instanceData = await instanceCheck.json();
    console.log('   ✅ Instância ativa:', instanceData.instance?.state || 'open');
    console.log('');

    // 2. Configurar webhook
    console.log('2️⃣ Configurando webhook para eventos de mensagens...');

    const webhookConfig = {
      url: WEBHOOK_URL,
      webhook_by_events: false, // Receber todos eventos no mesmo endpoint
      webhook_base64: false,
      events: [
        'MESSAGES_UPDATE', // ← ESTE É O EVENTO IMPORTANTE!
        'MESSAGES_UPSERT',
        'SEND_MESSAGE'
      ]
    };

    const webhookResponse = await fetch(
      `${EVOLUTION_API_BASE_URL}/webhook/set/${EVOLUTION_INSTANCE_NAME}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify(webhookConfig)
      }
    );

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      throw new Error(`Erro ao configurar webhook: ${webhookResponse.status} - ${errorText}`);
    }

    const webhookData = await webhookResponse.json();
    console.log('   ✅ Webhook configurado com sucesso!');
    console.log('');

    // 3. Verificar configuração
    console.log('3️⃣ Verificando configuração...');
    const verifyResponse = await fetch(
      `${EVOLUTION_API_BASE_URL}/webhook/find/${EVOLUTION_INSTANCE_NAME}`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      }
    );

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log('   ✅ Configuração verificada:');
      console.log('      URL:', verifyData.webhook?.url || 'N/A');
      console.log('      Eventos:', verifyData.webhook?.events || []);
      console.log('');
    }

    // 4. Instruções
    console.log('═'.repeat(60));
    console.log('✅ WEBHOOK CONFIGURADO COM SUCESSO!');
    console.log('═'.repeat(60));
    console.log('');
    console.log('📝 Próximos passos:');
    console.log('');
    console.log('1. Mantenha o servidor rodando:');
    console.log('   npm run dev');
    console.log('');
    console.log('2. Envie uma mensagem WhatsApp (via aplicação)');
    console.log('');
    console.log('3. Aguarde 5-10 segundos');
    console.log('');
    console.log('4. Você verá logs no terminal como:');
    console.log('   📨 WEBHOOK #1 RECEBIDO: ...');
    console.log('   🔍 [Webhook] Dados extraídos...');
    console.log('   ✅ [Webhook] Processamento concluído...');
    console.log('');
    console.log('🔍 Monitoramento visual:');
    console.log('   http://localhost:3000/webhook-monitor');
    console.log('');
    console.log('⚠️  IMPORTANTE:');
    console.log('   - O webhook só funciona se o servidor estiver rodando');
    console.log('   - Em produção, use a URL pública (ngrok/vercel)');
    console.log('   - Se usar localhost, a Evolution API deve estar na mesma rede');
    console.log('');

  } catch (error) {
    console.error('❌ Erro ao configurar webhook:', error.message);
    console.error('');
    console.error('💡 Dicas:');
    console.error('   - Verifique se a Evolution API está acessível');
    console.error('   - Confirme se a API Key está correta');
    console.error('   - Verifique se a instância está conectada');
    process.exit(1);
  }
}

setupWebhook();
