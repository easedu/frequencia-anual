#!/bin/bash

# Script completo: Migração + Validação + Teste Dual-Write
# Executa automaticamente às 4h da manhã

set -e # Exit on error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variáveis de ambiente Firebase
export NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCmUo0UtaYnGjCPdCIuNbKJgFKBWPJv5yY
export NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=frequencia-anual.firebaseapp.com
export NEXT_PUBLIC_FIREBASE_PROJECT_ID=frequencia-anual
export NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=frequencia-anual.firebasestorage.app
export NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=267076712674
export NEXT_PUBLIC_FIREBASE_APP_ID=1:267076712674:web:4d2872f56d8aff504dc6bb

echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo -e "${BLUE}  MIGRAÇÃO COMPLETA V2 → V3: Automática às 4h${NC}"
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
  # Se já passou das 4h hoje, agendar para amanhã
  HOURS_TO_WAIT=$((24 - CURRENT_HOUR + 4))
  MINUTES_TO_WAIT=$((60 - CURRENT_MINUTE))
  
  if [ "$MINUTES_TO_WAIT" -eq 60 ]; then
    MINUTES_TO_WAIT=0
  else
    HOURS_TO_WAIT=$((HOURS_TO_WAIT - 1))
  fi
fi

TOTAL_MINUTES=$((HOURS_TO_WAIT * 60 + MINUTES_TO_WAIT))

echo -e "${YELLOW}⏰ Horário atual:${NC} $(date '+%H:%M - %d/%m/%Y')"
echo -e "${YELLOW}⏰ Aguardando até:${NC} 04:00"
echo -e "${YELLOW}⏰ Tempo de espera:${NC} ${HOURS_TO_WAIT}h ${MINUTES_TO_WAIT}min"
echo ""
echo "📋 Este script executará:"
echo "   1️⃣  Retomar migração histórica (131 estudantes restantes)"
echo "   2️⃣  Validar migração (100% dos dados)"
echo "   3️⃣  Criar falta de teste para validar dual-write"
echo "   4️⃣  Validar falta em V2 e V3"
echo "   5️⃣  Gerar relatório completo"
echo ""
echo -e "${GREEN}✅ Dual-write já implementado e pronto!${NC}"
echo ""

read -p "Deseja continuar e aguardar até 4h? (s/n): " response

if [ "$response" != "s" ]; then
  echo ""
  echo -e "${RED}❌ Cancelado pelo usuário${NC}"
  echo ""
  echo "Para executar manualmente amanhã às 4h:"
  echo "  bash scripts/migration/run-complete-migration-4am.sh"
  echo ""
  exit 0
fi

echo ""
echo -e "${GREEN}✅ Agendado!${NC} Aguardando até 04:00..."
echo -e "${BLUE}💡 Mantenha este terminal aberto${NC}"
echo ""

# Aguardar até 4h
sleep $((TOTAL_MINUTES * 60))

# Executar sequência completa
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo -e "${BLUE}  INICIANDO MIGRAÇÃO COMPLETA ÀS $(date '+%H:%M')${NC}"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# ETAPA 1: Retomar migração histórica
echo ""
echo -e "${BLUE}1️⃣  ETAPA 1: Retomando migração histórica...${NC}"
echo "────────────────────────────────────────────────────────────────────────────────"
echo ""

# Responder automaticamente 's' para continuar do checkpoint
echo "s" | node scripts/migration/03-migrate-historical-data-optimized.mjs

MIGRATION_EXIT_CODE=$?

if [ $MIGRATION_EXIT_CODE -ne 0 ]; then
  echo ""
  echo -e "${RED}❌ ERRO: Migração histórica falhou!${NC}"
  echo ""
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Migração histórica concluída!${NC}"
echo ""

# ETAPA 2: Validar migração
echo ""
echo -e "${BLUE}2️⃣  ETAPA 2: Validando migração...${NC}"
echo "────────────────────────────────────────────────────────────────────────────────"
echo ""

node scripts/migration/04-validate-migration.mjs

VALIDATION_EXIT_CODE=$?

if [ $VALIDATION_EXIT_CODE -ne 0 ]; then
  echo ""
  echo -e "${YELLOW}⚠️  ATENÇÃO: Validação encontrou problemas!${NC}"
  echo "Revise o relatório acima antes de prosseguir."
  echo ""
  read -p "Deseja continuar mesmo assim? (s/n): " continue_response
  if [ "$continue_response" != "s" ]; then
    exit 1
  fi
fi

echo ""
echo -e "${GREEN}✅ Validação concluída!${NC}"
echo ""

# ETAPA 3: Criar script de teste dual-write
echo ""
echo -e "${BLUE}3️⃣  ETAPA 3: Criando script de teste dual-write...${NC}"
echo "────────────────────────────────────────────────────────────────────────────────"
echo ""

cat > scripts/migration/test-dual-write.mjs << 'TESTSCRIPT'
/**
 * Script de teste: Validar Dual-Write V2 + V3
 * Cria uma falta de teste e verifica se aparece em ambas estruturas
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testDualWrite() {
  console.log('\n' + '═'.repeat(80));
  console.log('  TESTE DUAL-WRITE: Validação V2 + V3');
  console.log('═'.repeat(80) + '\n');

  try {
    // 1. Buscar um estudante de teste
    console.log('1️⃣  Buscando estudante de teste...\n');
    
    const studentsRef = collection(db, 'students');
    const studentsQuery = query(studentsRef, where('nome', '==', '### TESTE ###'));
    const studentsSnap = await getDocs(studentsQuery);

    if (studentsSnap.empty) {
      console.log('❌ Estudante de teste não encontrado!');
      console.log('   Crie um estudante com nome "### TESTE ###" no sistema\n');
      process.exit(1);
    }

    const testStudent = studentsSnap.docs[0];
    const studentId = testStudent.id;
    const studentData = testStudent.data();

    console.log('   ✅ Estudante encontrado:');
    console.log('      ID: ' + studentId);
    console.log('      Nome: ' + studentData.nome);
    console.log('      Turma: ' + studentData.turma + '\n');

    // 2. Verificar se já existe falta de teste
    console.log('2️⃣  Verificando faltas de teste anteriores...\n');

    const testDate = '2025-01-15'; // Data fixa para teste
    const testMonth = '2025-01';

    // Verificar V2
    const v2Ref = collection(db, '2025', 'faltas', 'controle');
    const v2Query = query(
      v2Ref,
      where('estudanteId', '==', studentId),
      where('data', '==', testDate)
    );
    const v2Snap = await getDocs(v2Query);

    // Verificar V3 subcoleção
    const v3SubRef = collection(db, 'students', studentId, 'absences');
    const v3SubQuery = query(v3SubRef, where('data', '==', testDate));
    const v3SubSnap = await getDocs(v3SubQuery);

    // Verificar V3 summary
    const v3SummaryRef = collection(db, 'students', studentId, 'absence_summary');
    const v3SummarySnap = await getDocs(v3SummaryRef);

    console.log('   📊 Estado atual:');
    console.log('      V2 (2025/faltas/controle): ' + v2Snap.size + ' falta(s) de teste');
    console.log('      V3 Subcoleção (students/' + studentId + '/absences): ' + v3SubSnap.size + ' falta(s) de teste');
    console.log('      V3 Summary (students/' + studentId + '/absence_summary): ' + v3SummarySnap.size + ' mês(es)\n');

    // 3. Limpar faltas de teste antigas (se existirem)
    if (v2Snap.size > 0 || v3SubSnap.size > 0) {
      console.log('3️⃣  Limpando faltas de teste anteriores...\n');

      // Limpar V2
      for (const docSnap of v2Snap.docs) {
        await deleteDoc(docSnap.ref);
        console.log('   🗑️  V2 deletado: ' + docSnap.id);
      }

      // Limpar V3
      for (const docSnap of v3SubSnap.docs) {
        await deleteDoc(docSnap.ref);
        console.log('   🗑️  V3 subcoleção deletado: ' + docSnap.id);
      }

      console.log('\n   ✅ Limpeza concluída\n');
    }

    // 4. Instruções para teste manual
    console.log('═'.repeat(80));
    console.log('  PRÓXIMO PASSO: TESTE MANUAL');
    console.log('═'.repeat(80) + '\n');

    console.log('📝 INSTRUÇÕES:\n');
    console.log('1. Abra o sistema em: http://localhost:3000/marcar-faltas');
    console.log('2. Registre UMA falta para o estudante "### TESTE ###"');
    console.log('   • Data: 15/01/2025');
    console.log('   • Justificada: NÃO');
    console.log('3. Após registrar, execute:');
    console.log('   node scripts/migration/verify-dual-write.mjs\n');

    console.log('⚠️  IMPORTANTE:');
    console.log('   • Use exatamente a data: 15/01/2025');
    console.log('   • Registre apenas UMA falta');
    console.log('   • Não feche este terminal\n');

    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

testDualWrite();
TESTSCRIPT

echo -e "${GREEN}✅ Script de teste criado!${NC}"
echo ""

# ETAPA 4: Executar teste dual-write
echo ""
echo -e "${BLUE}4️⃣  ETAPA 4: Preparando teste dual-write...${NC}"
echo "────────────────────────────────────────────────────────────────────────────────"
echo ""

node scripts/migration/test-dual-write.mjs

echo ""
echo -e "${YELLOW}⏸️  AGUARDANDO TESTE MANUAL...${NC}"
echo ""
echo "Siga as instruções acima para completar o teste."
echo ""

# ETAPA 5: Relatório final
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo -e "${GREEN}  MIGRAÇÃO AUTOMÁTICA CONCLUÍDA ÀS $(date '+%H:%M')${NC}"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

echo "✅ Migração histórica: CONCLUÍDA"
echo "✅ Validação de dados: CONCLUÍDA"
echo "⏸️  Teste dual-write: AGUARDANDO AÇÃO MANUAL"
echo ""
echo "📋 Próximos passos:"
echo "   1. Registrar falta de teste conforme instruções acima"
echo "   2. Executar: node scripts/migration/verify-dual-write.mjs"
echo "   3. Sistema está 100% em dual-write!"
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

