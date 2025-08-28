#!/usr/bin/env node

/**
 * Script para gerar todos os ícones PWA automaticamente
 * Requer: npm install sharp (biblioteca de processamento de imagem)
 * 
 * Uso: 
 * 1. Coloque sua imagem base como 'icon-source.png' na pasta /public/
 * 2. Execute: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuração dos tamanhos de ícones necessários
const ICON_SIZES = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' }, 
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' }
];

// Ícones de atalhos (opcionais)
const SHORTCUT_ICONS = [
  { size: 96, name: 'shortcut-mark-attendance.png', color: '#10b981' },
  { size: 96, name: 'shortcut-control-attendance.png', color: '#f59e0b' },
  { size: 96, name: 'shortcut-report.png', color: '#8b5cf6' }
];

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const SOURCE_ICON = path.join(PUBLIC_DIR, 'icon-source.png');

async function generateIcons() {
  console.log('🎨 Iniciando geração de ícones PWA...\n');

  // Verificar se existe arquivo fonte
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error('❌ Arquivo fonte não encontrado!');
    console.log('📝 Por favor:');
    console.log('   1. Crie um ícone de 1024x1024px');
    console.log('   2. Salve como: /public/icon-source.png');
    console.log('   3. Execute novamente este script');
    process.exit(1);
  }

  try {
    // Verificar se sharp está instalado
    const sharpInfo = await sharp(SOURCE_ICON).metadata();
    console.log(`📏 Imagem fonte: ${sharpInfo.width}x${sharpInfo.height}px`);
    
    if (sharpInfo.width < 512 || sharpInfo.height < 512) {
      console.warn('⚠️  Recomendado: imagem fonte de pelo menos 512x512px para melhor qualidade');
    }

  } catch (error) {
    if (error.message.includes('sharp')) {
      console.error('❌ Sharp não está instalado!');
      console.log('📦 Instale com: npm install sharp --save-dev');
      process.exit(1);
    }
    throw error;
  }

  // Gerar ícones principais
  console.log('🔄 Gerando ícones principais...');
  for (const icon of ICON_SIZES) {
    const outputPath = path.join(PUBLIC_DIR, icon.name);
    
    await sharp(SOURCE_ICON)
      .resize(icon.size, icon.size, {
        kernel: sharp.kernel.lanczos3,
        fit: 'fill',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(outputPath);
    
    console.log(`  ✅ ${icon.name} (${icon.size}x${icon.size}px)`);
  }

  // Gerar favicon tradicional
  console.log('\n🔄 Gerando favicon...');
  await sharp(SOURCE_ICON)
    .resize(32, 32)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon-32x32.png'));
  
  await sharp(SOURCE_ICON)
    .resize(16, 16) 
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon-16x16.png'));

  console.log('  ✅ favicon-32x32.png');
  console.log('  ✅ favicon-16x16.png');

  // Gerar ícones de atalhos (se desejado)
  if (process.argv.includes('--shortcuts')) {
    console.log('\n🔄 Gerando ícones de atalhos...');
    await generateShortcutIcons();
  }

  // Gerar apple-touch-icons
  console.log('\n🔄 Gerando Apple Touch Icons...');
  const appleSizes = [57, 60, 72, 76, 114, 120, 144, 152, 180];
  
  for (const size of appleSizes) {
    const outputPath = path.join(PUBLIC_DIR, `apple-touch-icon-${size}x${size}.png`);
    await sharp(SOURCE_ICON)
      .resize(size, size)
      .png({ quality: 90 })
      .toFile(outputPath);
    console.log(`  ✅ apple-touch-icon-${size}x${size}.png`);
  }

  // Gerar ícone padrão do Apple
  await sharp(SOURCE_ICON)
    .resize(180, 180)
    .png({ quality: 90 })
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  console.log('  ✅ apple-touch-icon.png (padrão)');

  console.log('\n🎉 Geração de ícones concluída com sucesso!');
  console.log('\n📋 Resumo:');
  console.log(`   • ${ICON_SIZES.length} ícones PWA principais`);
  console.log(`   • ${appleSizes.length + 1} ícones Apple Touch`);
  console.log('   • 2 favicons tradicionais');
  
  if (process.argv.includes('--shortcuts')) {
    console.log(`   • ${SHORTCUT_ICONS.length} ícones de atalhos`);
  }

  console.log('\n💡 Próximos passos:');
  console.log('   1. Verificar se todos os ícones estão em /public/');
  console.log('   2. Executar: npm run build');
  console.log('   3. Testar PWA: Application → Manifest (DevTools)');
}

async function generateShortcutIcons() {
  // Criar ícones coloridos para atalhos
  for (const shortcut of SHORTCUT_ICONS) {
    const outputPath = path.join(PUBLIC_DIR, shortcut.name);
    
    // Criar fundo colorido + ícone sobreposto
    await sharp({
      create: {
        width: shortcut.size,
        height: shortcut.size,
        channels: 4,
        background: shortcut.color
      }
    })
    .composite([{
      input: await sharp(SOURCE_ICON)
        .resize(Math.round(shortcut.size * 0.6))
        .png()
        .toBuffer(),
      gravity: 'centre'
    }])
    .png()
    .toFile(outputPath);
    
    console.log(`  ✅ ${shortcut.name} (${shortcut.color})`);
  }
}

// Função para verificar dependências
async function checkDependencies() {
  try {
    require('sharp');
    return true;
  } catch (error) {
    return false;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkDependencies().then(hasSharp => {
    if (!hasSharp) {
      console.error('❌ Dependência sharp não encontrada!');
      console.log('📦 Instale com: npm install sharp --save-dev');
      process.exit(1);
    }
    
    generateIcons().catch(error => {
      console.error('❌ Erro na geração de ícones:', error);
      process.exit(1);
    });
  });
}

module.exports = { generateIcons };