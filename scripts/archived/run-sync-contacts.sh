#!/bin/bash

# Script para executar sincronização de contatos com variáveis de ambiente

# Carregar variáveis de ambiente do .env.local
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
  echo "✅ Variáveis de ambiente carregadas de .env.local"
else
  echo "❌ Arquivo .env.local não encontrado!"
  exit 1
fi

# Executar script TypeScript
npx ts-node scripts/sync-contacts-from-old-to-new.ts
