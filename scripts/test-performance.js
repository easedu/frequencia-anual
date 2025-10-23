#!/usr/bin/env node
/**
 * Script de Teste de Performance
 * Mede tempo de carregamento em diferentes cenários
 */

const https = require('https');
const http = require('http');

const PRODUCTION_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://frequencia-anual.vercel.app';
const API_ENDPOINTS = [
  '/api/students?limit=50',
  '/api/students?limit=50&selectStrategy=minimal',
  '/api/students?limit=50&selectStrategy=preview',
  '/api/absences?limit=50',
  '/api/interactions?limit=50'
];

async function measureEndpoint(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (res) => {
      let data = '';
      let firstByteTime = null;

      res.on('data', (chunk) => {
        if (!firstByteTime) {
          firstByteTime = Date.now() - startTime;
        }
        data += chunk;
      });

      res.on('end', () => {
        const endTime = Date.now();
        const totalTime = endTime - startTime;

        resolve({
          url,
          statusCode: res.statusCode,
          ttfb: firstByteTime,
          totalTime,
          size: Buffer.byteLength(data),
          compressed: res.headers['content-encoding'],
          cacheControl: res.headers['cache-control']
        });
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('🚀 Iniciando testes de performance...\n');
  console.log(`Base URL: ${PRODUCTION_URL}\n`);

  const results = [];

  for (const endpoint of API_ENDPOINTS) {
    const url = `${PRODUCTION_URL}${endpoint}`;
    console.log(`📊 Testando: ${endpoint}`);

    try {
      const result = await measureEndpoint(url);
      results.push(result);

      console.log(`  ✅ Status: ${result.statusCode}`);
      console.log(`  ⏱️  TTFB: ${result.ttfb}ms`);
      console.log(`  ⏱️  Total: ${result.totalTime}ms`);
      console.log(`  📦 Tamanho: ${(result.size / 1024).toFixed(2)} KB`);
      console.log(`  🗜️  Compressão: ${result.compressed || 'nenhuma'}`);
      console.log(`  💾 Cache: ${result.cacheControl || 'nenhum'}\n`);
    } catch (error) {
      console.error(`  ❌ Erro: ${error.message}\n`);
    }
  }

  // Resumo
  console.log('📊 RESUMO GERAL\n');
  console.log('='.repeat(50));

  const avgTTFB = results.reduce((sum, r) => sum + r.ttfb, 0) / results.length;
  const avgTotal = results.reduce((sum, r) => sum + r.totalTime, 0) / results.length;
  const totalSize = results.reduce((sum, r) => sum + r.size, 0);
  const hasCompression = results.some(r => r.compressed);

  console.log(`TTFB Médio: ${avgTTFB.toFixed(0)}ms`);
  console.log(`Tempo Total Médio: ${avgTotal.toFixed(0)}ms`);
  console.log(`Payload Total: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log(`Compressão Ativa: ${hasCompression ? '✅ SIM' : '❌ NÃO'}`);
  console.log('='.repeat(50));

  // Avaliação
  console.log('\n🎯 AVALIAÇÃO\n');

  if (avgTotal < 500) {
    console.log('✅ EXCELENTE: Tempo médio < 500ms');
  } else if (avgTotal < 2000) {
    console.log('⚠️  BOM: Tempo médio < 2s');
  } else if (avgTotal < 5000) {
    console.log('⚠️  MODERADO: Tempo médio < 5s');
  } else {
    console.log('❌ LENTO: Tempo médio > 5s');
  }

  if (hasCompression) {
    console.log('✅ Compressão habilitada');
  } else {
    console.log('❌ Compressão NÃO detectada');
  }

  // Salvar resultados
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fs = require('fs');
  const path = require('path');

  const resultsDir = path.join(__dirname, '..', 'docs', 'performance');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const resultsFile = path.join(resultsDir, `performance-${timestamp}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    url: PRODUCTION_URL,
    summary: {
      avgTTFB,
      avgTotal,
      totalSize,
      hasCompression
    },
    results
  }, null, 2));

  console.log(`\n📁 Resultados salvos em: ${resultsFile}`);
}

runTests().catch(console.error);
