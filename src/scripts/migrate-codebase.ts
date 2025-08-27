/**
 * Script de migração para aplicar todas as melhorias ao codebase
 * Automatiza a aplicação das correções em todos os arquivos
 */

import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

// Mapeamentos de substituição
const REPLACEMENTS = [
  // Substituir anos hard-coded
  {
    pattern: /collection\(db,\s*"2025"/g,
    replacement: 'collection(db, FIREBASE_PATHS.students()',
    description: 'Substituir coleções Firebase hard-coded'
  },
  {
    pattern: /doc\(db,\s*"2025",\s*"ano_letivo"\)/g,
    replacement: 'doc(db, FIREBASE_PATHS.academicYear())',
    description: 'Substituir documento do ano letivo'
  },
  {
    pattern: /doc\(db,\s*"2025",\s*"lista_de_estudantes"\)/g,
    replacement: 'doc(db, FIREBASE_PATHS.studentList())',
    description: 'Substituir lista de estudantes'
  },
  
  // Substituir console.* por logger
  {
    pattern: /console\.error\((.*?)\)/g,
    replacement: 'logger.error($1)',
    description: 'Substituir console.error por logger.error'
  },
  {
    pattern: /console\.warn\((.*?)\)/g,
    replacement: 'logger.warn($1)',
    description: 'Substituir console.warn por logger.warn'
  },
  {
    pattern: /console\.log\((.*?)\)/g,
    replacement: 'logger.info($1)',
    description: 'Substituir console.log por logger.info'
  },
];

// Imports necessários para adicionar
const REQUIRED_IMPORTS = [
  {
    pattern: /from ['"]@\/firebase\.config['"];?/,
    addition: `\nimport { FIREBASE_PATHS } from '@/config/constants';\nimport { logger } from '@/utils/logger';`,
    description: 'Adicionar imports de configuração e logger'
  }
];

class CodebaseMigrator {
  private filesProcessed = 0;
  private changesApplied = 0;
  private errors: string[] = [];

  async migrate() {
    console.log('🚀 Iniciando migração do codebase...\n');

    try {
      // Encontrar todos os arquivos TypeScript e JavaScript
      const files = await this.findFiles();
      console.log(`📁 Encontrados ${files.length} arquivos para processar\n`);

      // Processar cada arquivo
      for (const file of files) {
        await this.processFile(file);
      }

      // Relatório final
      this.printReport();

    } catch (error) {
      console.error('❌ Erro durante a migração:', error);
      process.exit(1);
    }
  }

  private async findFiles(): Promise<string[]> {
    const patterns = [
      'src/**/*.ts',
      'src/**/*.tsx',
      '!src/**/*.test.ts',
      '!src/**/*.test.tsx',
      '!src/**/*.d.ts',
      '!src/scripts/**/*',
      '!node_modules/**/*'
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      if (pattern.startsWith('!')) {
        // Padrões de exclusão serão tratados pelo glob
        continue;
      }
      const matches = await glob(pattern, {
        ignore: patterns.filter(p => p.startsWith('!')).map(p => p.slice(1))
      });
      files.push(...matches);
    }

    return [...new Set(files)]; // Remove duplicatas
  }

  private async processFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      let modifiedContent = content;
      let fileChanged = false;

      // Aplicar substituições
      for (const replacement of REPLACEMENTS) {
        const matches = content.match(replacement.pattern);
        if (matches && matches.length > 0) {
          modifiedContent = modifiedContent.replace(replacement.pattern, replacement.replacement);
          fileChanged = true;
          this.changesApplied += matches.length;
          console.log(`  ✅ ${replacement.description}: ${matches.length} ocorrências`);
        }
      }

      // Adicionar imports necessários
      for (const importRule of REQUIRED_IMPORTS) {
        if (importRule.pattern.test(content) && !content.includes(importRule.addition.trim())) {
          modifiedContent = modifiedContent.replace(importRule.pattern, (match) => {
            return match + importRule.addition;
          });
          fileChanged = true;
          this.changesApplied++;
          console.log(`  📦 ${importRule.description}`);
        }
      }

      // Salvar arquivo se houve mudanças
      if (fileChanged) {
        await fs.writeFile(filePath, modifiedContent, 'utf-8');
        console.log(`📝 Arquivo modificado: ${filePath}\n`);
      }

      this.filesProcessed++;

    } catch (error) {
      const errorMsg = `Erro ao processar ${filePath}: ${error}`;
      this.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }
  }

  private printReport(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO DE MIGRAÇÃO');
    console.log('='.repeat(60));
    console.log(`📁 Arquivos processados: ${this.filesProcessed}`);
    console.log(`✅ Mudanças aplicadas: ${this.changesApplied}`);
    console.log(`❌ Erros encontrados: ${this.errors.length}`);

    if (this.errors.length > 0) {
      console.log('\n❌ Erros:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }

    console.log('\n🎉 Migração concluída!');
    console.log('\n📋 Próximos passos manuais:');
    console.log('1. Revisar todos os arquivos modificados');
    console.log('2. Executar testes: npm run test');
    console.log('3. Verificar build: npm run build');
    console.log('4. Testar a aplicação manualmente');
    console.log('5. Commit das mudanças: git add . && git commit -m "feat: migrate codebase to 10/10"');
  }
}

// Executar migração se este arquivo for executado diretamente
if (require.main === module) {
  const migrator = new CodebaseMigrator();
  migrator.migrate();
}

export { CodebaseMigrator };