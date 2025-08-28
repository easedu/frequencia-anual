#!/usr/bin/env node

/**
 * Bundle Size Monitor
 * Tracks and reports bundle size changes over time
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Bundle size thresholds (in KB)
const THRESHOLDS = {
  maxTotalSize: 500, // Maximum total First Load JS size
  maxPageSize: 150,  // Maximum individual page size
  warningThreshold: 0.1, // Warn if bundle grows by more than 10%
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
  log('🔍 Analyzing bundle size...', 'blue');
  
  try {
    // Build and capture output
    const buildOutput = execSync('npm run build', { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Parse bundle information
    const { routes, sharedSize } = parseBundleOutput(buildOutput);
    
    if (routes.length === 0) {
      log('⚠️  Could not parse bundle output', 'yellow');
      return;
    }
    
    // Generate report
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
    };
    
    // Check thresholds
    const maxTotalSize = Math.max(...routes.map(r => r.totalSize));
    const maxPageSize = Math.max(...routes.map(r => r.pageSize));
    
    if (maxTotalSize > THRESHOLDS.maxTotalSize) {
      report.errors.push(`Total bundle size ${maxTotalSize}KB exceeds threshold ${THRESHOLDS.maxTotalSize}KB`);
    }
    
    if (maxPageSize > THRESHOLDS.maxPageSize) {
      report.warnings.push(`Largest page ${maxPageSize}KB exceeds warning threshold ${THRESHOLDS.maxPageSize}KB`);
    }
    
    // Save report
    const reportPath = path.join(process.cwd(), 'bundle-analysis.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Display summary
    log('📊 Bundle Analysis Summary:', 'green');
    log(`   Shared JS: ${report.sharedSize}KB`);
    log(`   Total Routes: ${routes.length}`);
    log(`   Largest Page: ${maxPageSize}KB`);
    log(`   Largest Total: ${maxTotalSize}KB`);
    
    if (report.warnings.length > 0) {
      log('⚠️  Warnings:', 'yellow');
      report.warnings.forEach(warning => log(`   • ${warning}`, 'yellow'));
    }
    
    if (report.errors.length > 0) {
      log('❌ Errors:', 'red');
      report.errors.forEach(error => log(`   • ${error}`, 'red'));
      process.exit(1);
    }
    
    log('✅ Bundle analysis completed successfully!', 'green');
    log(`📄 Report saved to: ${reportPath}`, 'blue');
    
  } catch (error) {
    log(`❌ Bundle analysis failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Compare with previous build if available
function compareWithPrevious() {
  const currentReportPath = path.join(process.cwd(), 'bundle-analysis.json');
  const previousReportPath = path.join(process.cwd(), 'bundle-analysis.previous.json');
  
  if (!fs.existsSync(currentReportPath) || !fs.existsSync(previousReportPath)) {
    return;
  }
  
  try {
    const current = JSON.parse(fs.readFileSync(currentReportPath, 'utf8'));
    const previous = JSON.parse(fs.readFileSync(previousReportPath, 'utf8'));
    
    const currentMax = Math.max(...current.routes.map(r => r.totalSize));
    const previousMax = Math.max(...previous.routes.map(r => r.totalSize));
    
    const change = currentMax - previousMax;
    const changePercent = (change / previousMax) * 100;
    
    if (Math.abs(changePercent) > 1) {
      const color = change > 0 ? 'yellow' : 'green';
      const symbol = change > 0 ? '📈' : '📉';
      log(`${symbol} Bundle size changed by ${changePercent.toFixed(1)}% (${change.toFixed(1)}KB)`, color);
    }
    
  } catch (error) {
    log(`⚠️  Could not compare with previous build: ${error.message}`, 'yellow');
  }
}

// Main execution
if (require.main === module) {
  analyzeBundleSize();
  compareWithPrevious();
}