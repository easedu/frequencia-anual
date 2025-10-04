#!/bin/bash

# Carregar variáveis do .env.local
set -a
source .env.local
set +a

# Executar script
npx ts-node scripts/separate-contact-name-parentesco.ts
