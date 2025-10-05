#!/bin/bash

###############################################################################
# Script de Teste: API /tasks/create
#
# Testa 2 cenários:
# 1. Task PENDENTE (is_resolved = false)
# 2. Task RESOLVIDA (is_resolved = true) com interação
#
# Uso: bash scripts/test-tasks-api.sh
###############################################################################

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
API_URL="http://localhost:3001/api/tasks/create"
USERNAME="habib-api"
PASSWORD="tnLVETwcwL8gy4ZJTtUDLAAdL4BXm8"
AUTH_HEADER="Authorization: Basic $(echo -n "$USERNAME:$PASSWORD" | base64)"

# ID de um estudante real do Firebase (pegar do diagnóstico anterior)
STUDENT_ID="00597fff-31f9-4522-ab65-83d17b87ddbf"  # ANA VALENTINA

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  TESTE API: /tasks/create${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

###############################################################################
# TESTE 1: Task PENDENTE (sem interação)
###############################################################################
echo -e "${YELLOW}📋 TESTE 1: Criar task PENDENTE (is_resolved = false)${NC}"
echo -e "${YELLOW}─────────────────────────────────────────────────────────────${NC}\n"

PAYLOAD_PENDENTE=$(cat <<EOF
{
  "estudante_id": "$STUDENT_ID",
  "absences_count": 8,
  "reference_month": 10,
  "reference_year": 2025,
  "priority": 1,
  "created_at": "2025-10-05T10:00:00Z",
  "created_by": "Sistema de Teste",
  "recommended_action": "Contato com família necessário",
  "is_resolved": false
}
EOF
)

echo "Payload:"
echo "$PAYLOAD_PENDENTE" | jq '.'
echo ""

RESPONSE_1=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d "$PAYLOAD_PENDENTE")

echo "Resposta:"
echo "$RESPONSE_1" | jq '.'

# Verificar sucesso
if echo "$RESPONSE_1" | jq -e '.success == true' > /dev/null; then
  TASK_ID_1=$(echo "$RESPONSE_1" | jq -r '.data.taskId')
  echo -e "\n${GREEN}✅ TESTE 1 PASSOU!${NC}"
  echo -e "   Task ID: ${GREEN}$TASK_ID_1${NC}"
else
  echo -e "\n${RED}❌ TESTE 1 FALHOU!${NC}"
  exit 1
fi

echo -e "\n"

###############################################################################
# TESTE 2: Task RESOLVIDA (com interação)
###############################################################################
echo -e "${YELLOW}📋 TESTE 2: Criar task RESOLVIDA com interação (is_resolved = true)${NC}"
echo -e "${YELLOW}─────────────────────────────────────────────────────────────${NC}\n"

PAYLOAD_RESOLVIDA=$(cat <<EOF
{
  "estudante_id": "$STUDENT_ID",
  "absences_count": 10,
  "reference_month": 9,
  "reference_year": 2025,
  "priority": 0,
  "created_at": "2025-09-20T09:00:00Z",
  "created_by": "Sistema de Teste",
  "processed_at": "2025-10-05T14:00:00Z",
  "solved_by": "Professor Teste",
  "recommended_action": "Contato telefônico com família",
  "action_taken": "Contato telefônico realizado",
  "action_type": "Contato telefônico",
  "action_description": "Conversei com a mãe da estudante. Ela informou que a filha estava com problemas de saúde mas já está recuperada. Prometeu que não haverá mais faltas.",
  "is_resolved": true
}
EOF
)

echo "Payload:"
echo "$PAYLOAD_RESOLVIDA" | jq '.'
echo ""

RESPONSE_2=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d "$PAYLOAD_RESOLVIDA")

echo "Resposta:"
echo "$RESPONSE_2" | jq '.'

# Verificar sucesso
if echo "$RESPONSE_2" | jq -e '.success == true' > /dev/null; then
  TASK_ID_2=$(echo "$RESPONSE_2" | jq -r '.data.taskId')
  INTERACTION_ID=$(echo "$RESPONSE_2" | jq -r '.data.interactionId')
  echo -e "\n${GREEN}✅ TESTE 2 PASSOU!${NC}"
  echo -e "   Task ID: ${GREEN}$TASK_ID_2${NC}"
  echo -e "   Interaction ID: ${GREEN}$INTERACTION_ID${NC}"
else
  echo -e "\n${RED}❌ TESTE 2 FALHOU!${NC}"
  exit 1
fi

echo -e "\n"

###############################################################################
# RESUMO FINAL
###############################################################################
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ TODOS OS TESTES PASSARAM!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

echo "📊 Resultados:"
echo "   • Teste 1 (Pendente): Task $TASK_ID_1"
echo "   • Teste 2 (Resolvida): Task $TASK_ID_2 + Interação $INTERACTION_ID"
echo ""
echo "🔍 Próximos passos:"
echo "   1. Verificar no Firebase Console:"
echo "      - userTasks/$TASK_ID_1 (pendente)"
echo "      - userTasks/$TASK_ID_2 (resolvida)"
echo "      - 2025/interactions/$STUDENT_ID/$INTERACTION_ID (V1)"
echo "      - students/$STUDENT_ID/interactions/$INTERACTION_ID (V3)"
echo ""
echo "   2. Verificar logs do servidor (terminal do npm run dev)"
echo ""
