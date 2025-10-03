#!/bin/bash

# Script para executar sincronização de contatos (Client SDK)

echo "🚀 Iniciando sincronização de contatos..."
echo ""

# Executar com tsx (sem necessidade de .env.local, usa valores hardcoded)
npx tsx scripts/sync-contacts-client.ts
