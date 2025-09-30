#!/bin/bash

# Script de Deploy Automatizado
# Execute com: bash deploy.sh

echo "🚀 Iniciando deploy do Firestore..."
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Passo 1: Login
echo -e "${YELLOW}Passo 1/4: Login no Firebase${NC}"
echo "Isso abrirá o navegador para autenticação..."
npx firebase-tools login

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro no login. Tente novamente.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Login realizado com sucesso!${NC}"
echo ""

# Passo 2: Verificar projeto
echo -e "${YELLOW}Passo 2/4: Verificando projeto${NC}"
npx firebase-tools use

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao verificar projeto.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Projeto verificado!${NC}"
echo ""

# Passo 3: Deploy indexes
echo -e "${YELLOW}Passo 3/4: Deploy dos Indexes${NC}"
echo "⏱️  Isso pode levar 5-15 minutos..."
npx firebase-tools deploy --only firestore:indexes

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao fazer deploy dos indexes.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Indexes deployados!${NC}"
echo ""

# Passo 4: Deploy rules
echo -e "${YELLOW}Passo 4/4: Deploy das Security Rules${NC}"
npx firebase-tools deploy --only firestore:rules

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao fazer deploy das rules.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Rules deployadas!${NC}"
echo ""

# Sucesso!
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ DEPLOY CONCLUÍDO COM SUCESSO!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}⏱️  IMPORTANTE:${NC}"
echo "Os indexes levam 5-15 minutos para ficarem prontos."
echo "Você pode verificar o status em:"
echo "https://console.firebase.google.com"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo "1. Aguarde 5-15 minutos"
echo "2. Verifique no Firebase Console que indexes estão 'Enabled'"
echo "3. Execute: npm run dev"
echo "4. Teste a aplicação"
echo ""
echo -e "${GREEN}🚀 Sua aplicação agora estará 5-50x mais rápida!${NC}"