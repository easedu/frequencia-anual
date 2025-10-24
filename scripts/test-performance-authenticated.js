#!/usr/bin/env node

/**
 * Script de Teste de Performance com Autenticação Firebase
 *
 * Realiza login automático e testa performance de APIs autenticadas
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configurações
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyC5SXUUT_YkI0v0jPkwQTfmNkRXZEMmCNQ';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://frequencia-anual.vercel.app';
const EMAIL = process.argv[2] || process.env.TEST_EMAIL;
const PASSWORD = process.argv[3] || process.env.TEST_PASSWORD;

// APIs a testar
const API_ENDPOINTS = [
  '/api/students?limit=50',
  '/api/students?limit=50&detail=minimal',
  '/api/absences-mv?limit=50',
  '/api/interactions-mv?limit=50',
  '/api/tasks-mv?limit=50',
  '/api/certificates-mv?limit=50',
  '/api/suspensions-mv?limit=50',
  '/api/students-count?exact=false',
];

// Cores
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Fazer login no Firebase e obter ID Token
 */
async function firebaseLogin(email, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email,
      password,
      returnSecureToken: true
    });

    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      port: 443,
      path: `/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          resolve(response.idToken);
        } else {
          reject(new Error(`Login failed: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Testar endpoint com autenticação
 */
async function measureEndpoint(url, token) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept-Encoding': 'br, gzip, deflate',
        'Accept': 'application/json',
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      let firstByteTime = null;
      const chunks = [];

      res.on('data', (chunk) => {
        if (!firstByteTime) {
          firstByteTime = Date.now() - startTime;
        }
        chunks.push(chunk);
        data += chunk;
      });

      res.on('end', () => {
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        const uncompressedSize = Buffer.byteLength(data);

        resolve({
          url,
          statusCode: res.statusCode,
          ttfb: firstByteTime,
          totalTime,
          size: uncompressedSize,
          compressed: res.headers['content-encoding'] || 'none',
          cacheControl: res.headers['cache-control'],
          contentType: res.headers['content-type'],
          contentLength: parseInt(res.headers['content-length'] || uncompressedSize),
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout (30s)'));
    });
    req.end();
  });
}

/**
 * Executar testes
 */
async function main() {
  console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════╗
║     TESTE DE PERFORMANCE COM AUTENTICAÇÃO FIREBASE        ║
║     Base URL: ${BASE_URL.padEnd(30)}       ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Validar credenciais
  if (!EMAIL || !PASSWORD) {
    console.error(`${colors.red}❌ ERRO: Credenciais não fornecidas${colors.reset}`);
    console.log(`\nUso:`);
    console.log(`  node scripts/test-performance-authenticated.js <email> <senha>`);
    console.log(`  ou export TEST_EMAIL=... && export TEST_PASSWORD=...`);
    process.exit(1);
  }

  try {
    // Login
    console.log(`${colors.dim}🔐 Fazendo login...${colors.reset}`);
    const token = await firebaseLogin(EMAIL, PASSWORD);
    console.log(`${colors.green}✅ Login bem-sucedido${colors.reset}\n`);

    // Testar endpoints
    const results = [];

    for (const endpoint of API_ENDPOINTS) {
      const fullUrl = `${BASE_URL}${endpoint}`;
      console.log(`${colors.cyan}📊 Testando:${colors.reset} ${endpoint}`);

      try {
        const result = await measureEndpoint(fullUrl, token);

        // Output
        const statusColor = result.statusCode === 200 ? colors.green : colors.red;
        console.log(`  ${statusColor}✅ Status: ${result.statusCode}${colors.reset}`);
        console.log(`  ⏱️  TTFB: ${result.ttfb}ms`);
        console.log(`  ⏱️  Total: ${result.totalTime}ms`);
        console.log(`  📦 Tamanho: ${formatBytes(result.size)}`);

        const compressionRatio = ((result.size - result.contentLength) / result.size * 100).toFixed(1);
        const compressionColor = compressionRatio >= 70 ? colors.green : compressionRatio >= 50 ? colors.yellow : colors.red;

        if (result.compressed !== 'none') {
          console.log(`  🗜️  Compressão: ${compressionColor}${result.compressed.toUpperCase()} (${compressionRatio}% redução)${colors.reset}`);
        } else {
          console.log(`  🗜️  Compressão: ${colors.red}NENHUMA${colors.reset}`);
        }

        console.log(`  💾 Cache: ${result.cacheControl || 'not specified'}`);
        console.log('');

        results.push(result);
      } catch (error) {
        console.log(`  ${colors.red}❌ ERRO: ${error.message}${colors.reset}\n`);
        results.push({
          url: fullUrl,
          error: error.message,
          statusCode: 0,
          ttfb: 0,
          totalTime: 0,
          size: 0,
        });
      }
    }

    // Resumo
    console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════╗
║                     RESUMO GERAL                          ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}`);

    const successfulResults = results.filter(r => r.statusCode === 200);
    const avgTTFB = successfulResults.length > 0
      ? (successfulResults.reduce((sum, r) => sum + r.ttfb, 0) / successfulResults.length).toFixed(0)
      : 0;
    const avgTotal = successfulResults.length > 0
      ? (successfulResults.reduce((sum, r) => sum + r.totalTime, 0) / successfulResults.length).toFixed(0)
      : 0;
    const totalSize = successfulResults.reduce((sum, r) => sum + r.size, 0);
    const compressionActive = successfulResults.some(r => r.compressed !== 'none');

    console.log(`Total de Endpoints: ${results.length}`);
    console.log(`Sucesso: ${colors.green}${successfulResults.length}${colors.reset}`);
    console.log(`Falhas: ${colors.red}${results.length - successfulResults.length}${colors.reset}`);
    console.log(`\nTTFB Médio: ${avgTTFB}ms`);
    console.log(`Tempo Total Médio: ${avgTotal}ms`);
    console.log(`Payload Total: ${formatBytes(totalSize)}`);
    console.log(`Compressão Ativa: ${compressionActive ? colors.green + '✅ SIM' : colors.red + '❌ NÃO'}${colors.reset}`);

    // Avaliação
    console.log(`\n${colors.bright}🎯 AVALIAÇÃO${colors.reset}\n`);

    if (avgTTFB < 200) {
      console.log(`${colors.green}✅ EXCELENTE: TTFB médio < 200ms${colors.reset}`);
    } else if (avgTTFB < 500) {
      console.log(`${colors.yellow}⚠️  BOM: TTFB médio < 500ms${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ LENTO: TTFB médio > 500ms - Requer otimização${colors.reset}`);
    }

    if (compressionActive) {
      console.log(`${colors.green}✅ Compressão DETECTADA${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Compressão NÃO detectada${colors.reset}`);
    }

    // Salvar resultados
    const outputDir = path.join(__dirname, '../docs/performance');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const outputFile = path.join(outputDir, `performance-auth-${timestamp}.json`);

    const reportData = {
      timestamp,
      baseUrl: BASE_URL,
      summary: {
        totalEndpoints: results.length,
        successful: successfulResults.length,
        failed: results.length - successfulResults.length,
        avgTTFB,
        avgTotal,
        totalSize,
        compressionActive,
      },
      results,
    };

    fs.writeFileSync(outputFile, JSON.stringify(reportData, null, 2));
    console.log(`\n📁 Resultados salvos em: ${outputFile}`);

    // Exit code
    process.exit(successfulResults.length === results.length ? 0 : 1);

  } catch (error) {
    console.error(`${colors.red}❌ ERRO FATAL: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

main();
