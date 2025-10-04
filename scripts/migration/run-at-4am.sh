#!/bin/bash

# Script para agendar execução da migração às 4h da manhã
# Uso: bash scripts/migration/run-at-4am.sh

echo "════════════════════════════════════════════════════════════════════════════════"
echo "  AGENDAMENTO DE MIGRAÇÃO V2 → V3"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "A quota do Firestore reseta às 4h da manhã (horário de Brasília)."
echo ""
echo "Este script irá:"
echo "  1. Aguardar até 4h00 da manhã"
echo "  2. Executar automaticamente a migração otimizada"
echo "  3. Retomar do checkpoint (estudante 606/736)"
echo ""
echo "Status atual:"
echo "  • Processados: 605/736 estudantes (82%)"
echo "  • Restantes: 131 estudantes"
echo "  • Tempo estimado: 15-20 minutos"
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# Calcular tempo até 4h
CURRENT_HOUR=$(date +%H)
CURRENT_MINUTE=$(date +%M)

if [ "$CURRENT_HOUR" -lt 4 ]; then
  HOURS_TO_WAIT=$((4 - CURRENT_HOUR))
  MINUTES_TO_WAIT=$((60 - CURRENT_MINUTE))
  
  if [ "$MINUTES_TO_WAIT" -eq 60 ]; then
    MINUTES_TO_WAIT=0
  else
    HOURS_TO_WAIT=$((HOURS_TO_WAIT - 1))
  fi
else
  # Se já passou das 4h, agendar para amanhã
  HOURS_TO_WAIT=$((24 - CURRENT_HOUR + 4))
  MINUTES_TO_WAIT=$((60 - CURRENT_MINUTE))
  
  if [ "$MINUTES_TO_WAIT" -eq 60 ]; then
    MINUTES_TO_WAIT=0
  else
    HOURS_TO_WAIT=$((HOURS_TO_WAIT - 1))
  fi
fi

TOTAL_MINUTES=$((HOURS_TO_WAIT * 60 + MINUTES_TO_WAIT))

echo "⏰ Horário atual: $(date '+%H:%M')"
echo "⏰ Aguardando até: 04:00"
echo "⏰ Tempo de espera: ${HOURS_TO_WAIT}h ${MINUTES_TO_WAIT}min"
echo ""

read -p "Deseja continuar e aguardar? (s/n): " response

if [ "$response" != "s" ]; then
  echo ""
  echo "❌ Cancelado pelo usuário"
  echo ""
  echo "Para executar manualmente amanhã às 4h, rode:"
  echo "  NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCmUo0UtaYnGjCPdCIuNbKJgFKBWPJv5yY \\"
  echo "  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=frequencia-anual.firebaseapp.com \\"
  echo "  NEXT_PUBLIC_FIREBASE_PROJECT_ID=frequencia-anual \\"
  echo "  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=frequencia-anual.firebasestorage.app \\"
  echo "  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=267076712674 \\"
  echo "  NEXT_PUBLIC_FIREBASE_APP_ID=1:267076712674:web:4d2872f56d8aff504dc6bb \\"
  echo "  node scripts/migration/03-migrate-historical-data-optimized.mjs"
  echo ""
  exit 0
fi

echo ""
echo "✅ Agendado! Aguardando até 04:00..."
echo "💡 Mantenha este terminal aberto"
echo ""

# Aguardar até 4h
sleep $((TOTAL_MINUTES * 60))

echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "  INICIANDO MIGRAÇÃO ÀS $(date '+%H:%M')"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# Executar migração
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCmUo0UtaYnGjCPdCIuNbKJgFKBWPJv5yY \
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=frequencia-anual.firebaseapp.com \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=frequencia-anual \
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=frequencia-anual.firebasestorage.app \
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=267076712674 \
NEXT_PUBLIC_FIREBASE_APP_ID=1:267076712674:web:4d2872f56d8aff504dc6bb \
node scripts/migration/03-migrate-historical-data-optimized.mjs

echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "  MIGRAÇÃO FINALIZADA ÀS $(date '+%H:%M')"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
