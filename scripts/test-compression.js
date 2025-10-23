#!/usr/bin/env node

/**
 * Script de Teste de Compressão
 * Valida Brotli e Gzip em produção
 *
 * Uso:
 *   node scripts/test-compression.js
 *   node scripts/test-compression.js https://seu-app.vercel.app
 */

const https = require('https');
const { URL } = require('url');

const BASE_URL = process.argv[2] || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Endpoints críticos para testar compressão
const ENDPOINTS = [
  // APIs REST
  '/api/students?limit=50',
  '/api/absences-mv?limit=50',
  '/api/interactions-mv?limit=50',
  '/api/tasks-mv?limit=50',
  '/api/certificates-mv?limit=50',
  '/api/suspensions-mv?limit=50',
  '/api/students-count',

  // Páginas HTML
  '/',
  '/home',
  '/cadastrar-estudante',
  '/controlar-faltas',

  // Assets estáticos
  '/_next/static/css/app.css',
  '/_next/static/chunks/main.js',
];

// Cores para output
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

function formatPercentage(percent) {
  if (percent >= 70) {
    return `${colors.green}${percent.toFixed(1)}%${colors.reset}`;
  } else if (percent >= 50) {
    return `${colors.yellow}${percent.toFixed(1)}%${colors.reset}`;
  } else {
    return `${colors.red}${percent.toFixed(1)}%${colors.reset}`;
  }
}

async function testCompression(url, encoding) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'Accept-Encoding': encoding,
        'User-Agent': 'Compression-Test-Script/1.0',
      },
    };

    const client = parsedUrl.protocol === 'https:' ? https : require('http');

    const startTime = Date.now();

    const req = client.request(options, (res) => {
      let uncompressedSize = 0;
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
        uncompressedSize += chunk.length;
      });

      res.on('end', () => {
        const totalTime = Date.now() - startTime;
        const contentEncoding = res.headers['content-encoding'] || 'none';
        const contentLength = parseInt(res.headers['content-length'] || uncompressedSize);
        const contentType = res.headers['content-type'] || 'unknown';

        resolve({
          statusCode: res.statusCode,
          encoding: contentEncoding,
          compressedSize: contentLength,
          uncompressedSize: uncompressedSize,
          contentType: contentType,
          responseTime: totalTime,
          headers: res.headers,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testEndpoint(endpoint) {
  const fullUrl = `${BASE_URL}${endpoint}`;

  console.log(`\n${colors.cyan}${colors.bright}Testing:${colors.reset} ${endpoint}`);

  try {
    // Test 1: Brotli
    const brotliResult = await testCompression(fullUrl, 'br, gzip, deflate');

    // Test 2: Gzip (fallback)
    const gzipResult = await testCompression(fullUrl, 'gzip, deflate');

    // Test 3: No compression (baseline)
    const noCompressionResult = await testCompression(fullUrl, 'identity');

    // Análise
    const originalSize = noCompressionResult.uncompressedSize;
    const actualEncoding = brotliResult.encoding;
    const compressedSize = brotliResult.compressedSize;
    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

    // Output
    console.log(`${colors.dim}Content-Type:${colors.reset} ${brotliResult.contentType}`);
    console.log(`${colors.dim}Encoding:${colors.reset} ${actualEncoding === 'none' ? colors.red + 'NONE ⚠️' + colors.reset : colors.green + actualEncoding.toUpperCase() + ' ✅' + colors.reset}`);
    console.log(`${colors.dim}Original:${colors.reset} ${formatBytes(originalSize)}`);
    console.log(`${colors.dim}Compressed:${colors.reset} ${formatBytes(compressedSize)}`);
    console.log(`${colors.dim}Reduction:${colors.reset} ${formatPercentage(compressionRatio)}`);
    console.log(`${colors.dim}Response Time:${colors.reset} ${brotliResult.responseTime}ms`);

    // Verificações
    const checks = [];

    if (actualEncoding === 'br') {
      checks.push(`${colors.green}✅ Brotli enabled${colors.reset}`);
    } else if (actualEncoding === 'gzip') {
      checks.push(`${colors.yellow}⚠️  Gzip fallback (Brotli not available)${colors.reset}`);
    } else {
      checks.push(`${colors.red}❌ No compression!${colors.reset}`);
    }

    if (compressionRatio >= 70) {
      checks.push(`${colors.green}✅ Excellent compression (≥70%)${colors.reset}`);
    } else if (compressionRatio >= 50) {
      checks.push(`${colors.yellow}⚠️  Good compression (50-70%)${colors.reset}`);
    } else if (compressionRatio > 0) {
      checks.push(`${colors.red}❌ Poor compression (<50%)${colors.reset}`);
    } else {
      checks.push(`${colors.red}❌ No compression benefit${colors.reset}`);
    }

    console.log(checks.join(' | '));

    return {
      endpoint,
      encoding: actualEncoding,
      originalSize,
      compressedSize,
      compressionRatio,
      responseTime: brotliResult.responseTime,
      passed: actualEncoding !== 'none' && compressionRatio >= 50,
    };

  } catch (error) {
    console.log(`${colors.red}❌ ERROR:${colors.reset} ${error.message}`);
    return {
      endpoint,
      error: error.message,
      passed: false,
    };
  }
}

async function main() {
  console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════╗
║         TESTE DE COMPRESSÃO BROTLI/GZIP                   ║
║         Testing: ${BASE_URL.padEnd(30)}       ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}`);

  const results = [];

  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }

  // Resumo
  console.log(`\n${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════╗
║                        SUMMARY                            ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}`);

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalOriginal = results.reduce((sum, r) => sum + (r.originalSize || 0), 0);
  const totalCompressed = results.reduce((sum, r) => sum + (r.compressedSize || 0), 0);
  const avgCompression = ((totalOriginal - totalCompressed) / totalOriginal) * 100;
  const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;

  console.log(`Endpoints Tested:     ${results.length}`);
  console.log(`Passed:               ${colors.green}${passed}${colors.reset}`);
  console.log(`Failed:               ${failed > 0 ? colors.red : colors.green}${failed}${colors.reset}`);
  console.log(`Total Original Size:  ${formatBytes(totalOriginal)}`);
  console.log(`Total Compressed:     ${formatBytes(totalCompressed)}`);
  console.log(`Average Compression:  ${formatPercentage(avgCompression)}`);
  console.log(`Average Response:     ${avgResponseTime.toFixed(0)}ms`);

  // Encodings usados
  const encodings = {};
  results.forEach(r => {
    if (r.encoding) {
      encodings[r.encoding] = (encodings[r.encoding] || 0) + 1;
    }
  });

  console.log(`\nEncodings:`);
  Object.entries(encodings).forEach(([enc, count]) => {
    const color = enc === 'br' ? colors.green : enc === 'gzip' ? colors.yellow : colors.red;
    console.log(`  ${color}${enc.toUpperCase()}${colors.reset}: ${count} endpoint(s)`);
  });

  // Recomendações
  console.log(`\n${colors.bright}Recommendations:${colors.reset}`);

  if (encodings['none'] || encodings['identity']) {
    console.log(`${colors.red}❌ Some endpoints have NO compression. Enable Brotli/Gzip in Vercel.${colors.reset}`);
  }

  if (avgCompression < 70) {
    console.log(`${colors.yellow}⚠️  Average compression is ${avgCompression.toFixed(1)}%. Target: ≥70%.${colors.reset}`);
  }

  if (!encodings['br']) {
    console.log(`${colors.yellow}⚠️  Brotli not detected. Ensure Vercel has Brotli enabled.${colors.reset}`);
  } else {
    console.log(`${colors.green}✅ Brotli compression is working!${colors.reset}`);
  }

  if (avgCompression >= 70 && encodings['br']) {
    console.log(`${colors.green}✅ Compression is EXCELLENT! No action needed.${colors.reset}`);
  }

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
