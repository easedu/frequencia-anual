#!/bin/bash

# Script para ajudar a migrar console.* para logger
# Uso: bash scripts/migrate-console-to-logger.sh

echo "🔍 Buscando arquivos com console.log/error/warn/info..."

# Buscar todos os arquivos com console.*
grep -r "console\.\(log\|error\|warn\|info\)" src/ --include="*.ts" --include="*.tsx" | \
  cut -d: -f1 | \
  sort -u > /tmp/files_with_console.txt

echo "📋 Arquivos encontrados:"
cat /tmp/files_with_console.txt

total=$(wc -l < /tmp/files_with_console.txt)
echo ""
echo "Total: $total arquivos"

echo ""
echo "📝 Para substituir manualmente, use o padrão:"
echo ""
echo "console.log(...)     → logger.debug(...)  // ou logger.info()"
echo "console.info(...)    → logger.info(...)"
echo "console.warn(...)    → logger.warn(...)"
echo "console.error(...)   → logger.error(..., error)"
echo ""
echo "Não esqueça de adicionar no topo do arquivo:"
echo "import { logger } from '@/utils/logger';"