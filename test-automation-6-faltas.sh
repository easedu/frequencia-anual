#!/bin/bash
# Script de Teste: Automação de Alertas - 6 Faltas em Outubro
# Execute este script para testar o fluxo completo

set -e  # Parar se houver erro

echo "🧪 TESTE DE AUTOMAÇÃO - 6 FALTAS EM OUTUBRO"
echo "==========================================="
echo ""

# Verificar se servidor está rodando
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Erro: Servidor não está rodando em http://localhost:3000"
    echo "   Execute 'npm run dev' em outro terminal primeiro"
    exit 1
fi

echo "✅ Servidor local detectado"
echo ""

# Ler credenciais
echo "📝 Configuração de Credenciais"
echo "------------------------------"
read -p "Usuário API (API_HABIB_KYRILLOS_USERNAME): " API_USER
read -sp "Senha API (API_HABIB_KYRILLOS_PASSWORD): " API_PASS
echo ""
echo ""

# Gerar Basic Auth
BASIC_AUTH=$(echo -n "$API_USER:$API_PASS" | base64)

# Ler telefone de notificação
read -p "Telefone para receber relatório (ex: 5511988384664): " NOTIFICATION_PHONE
echo ""

# ========================================
# TESTE 1: DRY-RUN (Simulação)
# ========================================
echo "🔬 TESTE 1: DRY-RUN (Simulação - não envia mensagens)"
echo "----------------------------------------------------"
echo "Executando automação em modo dry-run..."
echo ""

RESPONSE=$(curl -s -X GET \
  "http://localhost:3000/api/automation/process-absences?dryRun=true&multiple=6&notificationPhone=$NOTIFICATION_PHONE" \
  -H "Authorization: Basic $BASIC_AUTH")

echo "$RESPONSE" | jq '.'

# Verificar se foi bem-sucedido
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    EXECUTION_ID=$(echo "$RESPONSE" | jq -r '.executionId')
    echo ""
    echo "✅ Automação iniciada com sucesso!"
    echo "   Execution ID: $EXECUTION_ID"
    echo ""
    echo "⏳ Aguardando conclusão do processamento em background..."
    echo "   (Isso pode levar de 30s a 2 minutos)"
    echo ""

    # Aguardar 10 segundos
    for i in {10..1}; do
        echo -ne "   Aguardando $i segundos...\r"
        sleep 1
    done
    echo ""

    echo "📊 Status da execução:"
    echo "   Acesse: http://localhost:3000/painel-tarefas"
    echo ""
else
    echo "❌ Erro ao iniciar automação"
    echo "$RESPONSE" | jq -r '.error'
    exit 1
fi

# ========================================
# TESTE 2: ENVIO REAL (Opcional)
# ========================================
echo ""
echo "🚨 TESTE 2: ENVIO REAL (com mensagens WhatsApp)"
echo "-----------------------------------------------"
echo "⚠️  ATENÇÃO: Este teste enviará mensagens REAIS!"
echo ""
read -p "Deseja continuar com o envio real? (sim/não): " CONFIRM

if [ "$CONFIRM" == "sim" ]; then
    echo ""
    echo "📤 Executando automação com envio real..."
    echo ""

    RESPONSE_REAL=$(curl -s -X GET \
      "http://localhost:3000/api/automation/process-absences?dryRun=false&multiple=6&notificationPhone=$NOTIFICATION_PHONE" \
      -H "Authorization: Basic $BASIC_AUTH")

    echo "$RESPONSE_REAL" | jq '.'

    if echo "$RESPONSE_REAL" | jq -e '.success == true' > /dev/null; then
        EXECUTION_ID_REAL=$(echo "$RESPONSE_REAL" | jq -r '.executionId')
        echo ""
        echo "✅ Automação REAL iniciada com sucesso!"
        echo "   Execution ID: $EXECUTION_ID_REAL"
        echo ""
        echo "📱 Você receberá:"
        echo "   1. Mensagens nos WhatsApp dos responsáveis"
        echo "   2. Relatório no telefone: $NOTIFICATION_PHONE"
        echo ""
        echo "⏳ Aguarde de 1 a 2 minutos para receber o relatório"
        echo ""
    else
        echo "❌ Erro ao executar automação real"
        echo "$RESPONSE_REAL" | jq -r '.error'
    fi
else
    echo ""
    echo "✅ Teste de envio real cancelado"
fi

echo ""
echo "✅ Testes concluídos!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Verifique os logs no terminal do servidor (npm run dev)"
echo "   2. Acesse http://localhost:3000/painel-tarefas"
echo "   3. Confira seu WhatsApp para o relatório"
echo ""
echo "📚 Documentação completa: docs/TESTE-AUTOMACAO-FALTAS-6X.md"
echo ""
