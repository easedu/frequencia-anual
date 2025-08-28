#!/usr/bin/env node

/**
 * Bundle Size Monitor Pro
 * Análise avançada de bundle size com alertas e recomendações
 * Integrado com o sistema de build do Next.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Limites de bundle size otimizados para o projeto (em KB)
const THRESHOLDS = {
  maxTotalSize: 120,    // 120KB - First Load JS total (atual do projeto)
  maxPageSize: 80,      // 80KB - Páginas individuais  
  maxChunkSize: 60,     // 60KB - Chunks individuais
  warningThreshold: 0.15, // 15% - Limite de crescimento para aviso
  errorThreshold: 0.25,   // 25% - Limite de crescimento para erro
  
  // Limites específicos por página (baseado na análise atual)
  pageSpecific: {
    '/cadastrar-estudante': 85,     // Página mais complexa
    '/controlar-faltas': 75,        // Página de controle
    '/perfil-estudante': 110,       // Página mais pesada atual
    '/relatorio-bolsa-familia': 12, // Página de relatório (leve)
    '/home': 8,                     // Página inicial (leve)
    '/login': 6,                    // Página de login (muito leve)
  }
};

// Color codes for console output
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseBundleOutput(output) {
  const lines = output.split('\n');
  const routeRegex = /^[├└│]\s*[○●λ]\s*(\/[^\s]*)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/;
  const sharedRegex = /^\+\s*First Load JS shared by all\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/;
  
  const routes = [];
  let sharedSize = 0;
  
  for (const line of lines) {
    const routeMatch = line.match(routeRegex);
    if (routeMatch) {
      const [, route, pageSizeNum, pageSizeUnit, totalSizeNum, totalSizeUnit] = routeMatch;
      routes.push({
        route,
        pageSize: convertToKB(parseFloat(pageSizeNum), pageSizeUnit),
        totalSize: convertToKB(parseFloat(totalSizeNum), totalSizeUnit),
      });
    }
    
    const sharedMatch = line.match(sharedRegex);
    if (sharedMatch) {
      const [, sizeNum, sizeUnit] = sharedMatch;
      sharedSize = convertToKB(parseFloat(sizeNum), sizeUnit);
    }
  }
  
  return { routes, sharedSize };
}

function convertToKB(size, unit) {
  switch (unit.toLowerCase()) {
    case 'b': return size / 1024;
    case 'kb': return size;
    case 'mb': return size * 1024;
    default: return size;
  }
}

function analyzeBundleSize() {
  log('🔍 Analisando bundle size...', 'blue');
  
  try {
    // Executar build e capturar output
    const buildOutput = execSync('npm run build 2>&1', { 
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 // 1MB buffer
    });
    
    // Parse das informações do bundle
    const { routes, sharedSize } = parseBundleOutput(buildOutput);
    
    if (routes.length === 0) {
      log('⚠️  Não foi possível analisar o output do build', 'yellow');
      log('Output capturado:', 'yellow');
      console.log(buildOutput.slice(-500)); // Últimos 500 chars para debug
      return;
    }
    
    // Carregar relatório anterior para comparação
    const previousReport = loadPreviousReport();
    
    // Gerar relatório atual
    const report = {
      timestamp: new Date().toISOString(),
      sharedSize: Math.round(sharedSize * 10) / 10,
      routes: routes.map(r => ({
        ...r,
        pageSize: Math.round(r.pageSize * 10) / 10,
        totalSize: Math.round(r.totalSize * 10) / 10,
      })),
      warnings: [],
      errors: [],
      recommendations: [],
      performance: {
        totalPages: routes.length,
        averagePageSize: Math.round((routes.reduce((sum, r) => sum + r.pageSize, 0) / routes.length) * 10) / 10,
        largestPage: routes.reduce((max, r) => r.pageSize > max.pageSize ? r : max, routes[0]),
        totalBundleSize: Math.round((sharedSize + routes.reduce((sum, r) => sum + r.pageSize, 0)) * 10) / 10
      }
    };
    
    // Verificar limites gerais
    analyzeGeneralThresholds(report, routes, sharedSize);
    
    // Verificar limites específicos por página
    analyzePageSpecificThresholds(report, routes);
    
    // Comparar com relatório anterior
    if (previousReport) {
      compareWithPrevious(report, previousReport);
    }
    
    // Gerar recomendações
    generateOptimizationRecommendations(report, routes);
    
    // Salvar relatório
    const reportPath = path.join(process.cwd(), 'bundle-analysis.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Display summary
    // Exibir resumo
    displayAnalysisResults(report);
    
    // Exit code baseado nos erros
    if (report.errors.length > 0) {
      log(`\\n❌ Build falhou devido a ${report.errors.length} erro(s) de bundle size`, 'red');
      process.exit(1);
    }
    
    log('\\n✅ Análise de bundle concluída com sucesso!', 'green');
    
  } catch (error) {
    log(`❌ Erro durante análise: ${error.message}`, 'red');
    process.exit(1);
  }
}

function loadPreviousReport() {
  const reportPath = path.join(process.cwd(), 'bundle-analysis.json');
  try {
    if (fs.existsSync(reportPath)) {
      return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    }
  } catch (error) {
    log(`⚠️  Erro ao carregar relatório anterior: ${error.message}`, 'yellow');
  }
  return null;
}

function analyzeGeneralThresholds(report, routes, sharedSize) {
  const maxTotalSize = Math.max(...routes.map(r => r.totalSize));
  const maxPageSize = Math.max(...routes.map(r => r.pageSize));
  
  // Verificar total First Load JS
  if (maxTotalSize > THRESHOLDS.maxTotalSize) {
    report.errors.push({
      type: 'total_size_exceeded',
      message: `First Load JS total excede limite: ${maxTotalSize}KB > ${THRESHOLDS.maxTotalSize}KB`,
      route: routes.find(r => r.totalSize === maxTotalSize)?.route
    });
  } else if (maxTotalSize > THRESHOLDS.maxTotalSize * 0.9) {
    report.warnings.push({
      type: 'total_size_warning',
      message: `First Load JS próximo do limite: ${maxTotalSize}KB (limite: ${THRESHOLDS.maxTotalSize}KB)`,
      route: routes.find(r => r.totalSize === maxTotalSize)?.route
    });
  }
  
  // Verificar páginas individuais
  if (maxPageSize > THRESHOLDS.maxPageSize) {
    report.warnings.push({
      type: 'page_size_warning',
      message: `Página individual excede limite recomendado: ${maxPageSize}KB > ${THRESHOLDS.maxPageSize}KB`,
      route: routes.find(r => r.pageSize === maxPageSize)?.route
    });
  }
  
  // Verificar shared bundle
  if (sharedSize > THRESHOLDS.maxChunkSize) {
    report.warnings.push({
      type: 'shared_size_warning',
      message: `Shared bundle muito grande: ${sharedSize}KB > ${THRESHOLDS.maxChunkSize}KB`
    });
  }
}

function analyzePageSpecificThresholds(report, routes) {
  routes.forEach(route => {
    const specificLimit = THRESHOLDS.pageSpecific[route.route];
    if (specificLimit && route.pageSize > specificLimit) {
      const severity = route.pageSize > specificLimit * 1.5 ? 'errors' : 'warnings';
      report[severity].push({
        type: 'page_specific_limit',
        message: `${route.route}: ${route.pageSize}KB excede limite específico de ${specificLimit}KB`,
        route: route.route,
        current: route.pageSize,
        limit: specificLimit
      });
    }
  });
}

function compareWithPrevious(report, previousReport) {
  if (!previousReport.routes) return;
  
  const previousRoutes = new Map(previousReport.routes.map(r => [r.route, r]));
  
  report.routes.forEach(currentRoute => {
    const previousRoute = previousRoutes.get(currentRoute.route);
    if (!previousRoute) return;
    
    const growth = ((currentRoute.pageSize - previousRoute.pageSize) / previousRoute.pageSize);
    
    if (growth > THRESHOLDS.errorThreshold) {
      report.errors.push({
        type: 'bundle_growth_error',
        message: `${currentRoute.route}: Crescimento crítico de ${(growth * 100).toFixed(1)}% (${previousRoute.pageSize}KB → ${currentRoute.pageSize}KB)`,
        route: currentRoute.route,
        growth: growth * 100,
        previous: previousRoute.pageSize,
        current: currentRoute.pageSize
      });
    } else if (growth > THRESHOLDS.warningThreshold) {
      report.warnings.push({
        type: 'bundle_growth_warning',
        message: `${currentRoute.route}: Crescimento de ${(growth * 100).toFixed(1)}% (${previousRoute.pageSize}KB → ${currentRoute.pageSize}KB)`,
        route: currentRoute.route,
        growth: growth * 100,
        previous: previousRoute.pageSize,
        current: currentRoute.pageSize
      });
    }
  });
}

function generateOptimizationRecommendations(report, routes) {
  const recommendations = [];
  
  // Recomendar para páginas grandes
  const largePages = routes.filter(r => r.pageSize > 50).sort((a, b) => b.pageSize - a.pageSize);
  
  if (largePages.length > 0) {
    recommendations.push({
      category: 'Páginas Grandes',
      items: largePages.slice(0, 3).map(page => ({
        page: page.route,
        size: page.pageSize,
        suggestions: getPageOptimizationSuggestions(page.route)
      }))
    });
  }
  
  // Recomendar otimizações gerais
  if (report.sharedSize > 45) { // Se shared > 45KB
    recommendations.push({
      category: 'Bundle Compartilhado',
      items: [{
        suggestion: 'Considere implementar code splitting mais granular',
        details: [
          'Lazy load componentes não-críticos',
          'Dynamic imports para bibliotecas pesadas',
          'Tree shaking das dependências'
        ]
      }]
    });
  }
  
  report.recommendations = recommendations;
}

function getPageOptimizationSuggestions(route) {
  const suggestions = {
    '/cadastrar-estudante': [
      'Implementar lazy loading para formulários complexos',
      'Quebrar componente StudentForm em partes menores',
      'Dynamic import para bibliotecas de validação'
    ],
    '/controlar-faltas': [
      'Lazy load para componentes de calendário',
      'Code splitting para funcionalidades avançadas',
      'Otimizar imports de bibliotecas de data'
    ],
    '/perfil-estudante': [
      'Implementar virtualization para listas grandes',
      'Lazy load de gráficos e visualizações',
      'Dynamic imports para componentes de análise'
    ]
  };
  
  return suggestions[route] || [
    'Implementar lazy loading',
    'Code splitting para componentes grandes',
    'Otimizar imports de bibliotecas'
  ];
}

function displayAnalysisResults(report) {
  console.log('\\n📊 RELATÓRIO DE BUNDLE SIZE\\n');
  console.log('┌─' + '─'.repeat(50) + '─┐');
  console.log('│ ' + 'RESUMO GERAL'.padEnd(50) + ' │');
  console.log('├─' + '─'.repeat(50) + '─┤');
  console.log('│ ' + `📦 Total de páginas: ${report.performance.totalPages}`.padEnd(50) + ' │');
  console.log('│ ' + `🔗 Shared JS: ${report.sharedSize}KB`.padEnd(50) + ' │');
  console.log('│ ' + `📊 Tamanho médio: ${report.performance.averagePageSize}KB`.padEnd(50) + ' │');
  console.log('│ ' + `🎯 Maior página: ${report.performance.largestPage.route} (${report.performance.largestPage.pageSize}KB)`.padEnd(50) + ' │');
  console.log('└─' + '─'.repeat(50) + '─┘');
  
  // Exibir detalhes das páginas
  console.log('\\n📄 DETALHES POR PÁGINA:\\n');
  report.routes.forEach(route => {
    const statusIcon = getPageStatusIcon(route, report);
    const specificLimit = THRESHOLDS.pageSpecific[route.route];
    const limitInfo = specificLimit ? `/${specificLimit}KB` : '';
    
    console.log(`${statusIcon} ${route.route.padEnd(25)} ${String(route.pageSize + 'KB').padEnd(8)} (Total: ${route.totalSize}KB${limitInfo})`);
  });
  
  // Exibir alertas
  if (report.errors.length > 0 || report.warnings.length > 0) {
    console.log('\\n🚨 ALERTAS:\\n');
    
    report.errors.forEach(error => {
      log(`❌ ERRO: ${error.message}`, 'red');
    });
    
    report.warnings.forEach(warning => {
      log(`⚠️  AVISO: ${warning.message}`, 'yellow');
    });
  }
  
  // Exibir recomendações
  if (report.recommendations.length > 0) {
    console.log('\\n💡 RECOMENDAÇÕES DE OTIMIZAÇÃO:\\n');
    
    report.recommendations.forEach(category => {
      log(`🎯 ${category.category}:`, 'blue');
      
      if (category.items[0].page) {
        // Recomendações específicas por página
        category.items.forEach(item => {
          console.log(`   📄 ${item.page} (${item.size}KB):`);
          item.suggestions.forEach(suggestion => {
            console.log(`      • ${suggestion}`);
          });
        });
      } else {
        // Recomendações gerais
        category.items.forEach(item => {
          console.log(`   • ${item.suggestion}`);
          if (item.details) {
            item.details.forEach(detail => {
              console.log(`     - ${detail}`);
            });
          }
        });
      }
      console.log();
    });
  }
}

function getPageStatusIcon(route, report) {
  const hasError = report.errors.some(e => e.route === route.route);
  const hasWarning = report.warnings.some(w => w.route === route.route);
  
  if (hasError) return '❌';
  if (hasWarning) return '⚠️ ';
  return '✅';
}

// Executar análise se chamado diretamente
if (require.main === module) {
  analyzeBundleSize();
}

module.exports = {
  analyzeBundleSize,
  THRESHOLDS
};