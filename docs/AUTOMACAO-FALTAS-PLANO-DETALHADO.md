# 🤖 AUTOMAÇÃO DE ALERTAS DE FALTAS - PLANO DETALHADO

> **Objetivo**: Automatizar envio de mensagens WhatsApp para responsáveis de estudantes com múltiplos de faltas no mês atual, usando GitHub Actions como trigger.

---

## 📋 ÍNDICE

1. [Visão Geral](#-visão-geral)
2. [Requisitos Confirmados](#-requisitos-confirmados)
3. [Arquitetura da Solução](#-arquitetura-da-solução)
4. [Fase 1: Infraestrutura](#-fase-1-infraestrutura)
5. [Fase 2: API Orquestradora](#-fase-2-api-orquestradora)
6. [Fase 3: GitHub Actions](#-fase-3-github-actions)
7. [Fase 4: Testes](#-fase-4-testes)
8. [Fase 5: Documentação](#-fase-5-documentação)
9. [Checklist Final](#-checklist-final)

---

## 🎯 VISÃO GERAL

### Problema Atual
- Processo manual diário de consulta de faltas
- Separação manual de estudantes com/sem contatos
- Envio manual de mensagens WhatsApp
- Criação manual de tasks (chamados)
- Risco de duplicação de mensagens/tasks

### Solução Proposta
- **Trigger**: GitHub Actions (cron diário - 9h AM São Paulo)
- **Orquestração**: Nova API route `/api/automation/process-absences`
- **Histórico**: Firestore collection `whatsappMessageHistory`
- **Prevenção de Duplicatas**: Índice composto único
- **Retry**: Até 3 tentativas automáticas com delay de 5s
- **Notificações**: WhatsApp para número fixo (sucesso/falha)
- **Dry-Run**: Modo teste sem envio real

---

## ✅ REQUISITOS CONFIRMADOS

### Configurações Iniciais
- ✅ **Múltiplo de Faltas**: 3 (configurável via query param)
- ✅ **Horário**: 9h AM São Paulo/Brasil (12h UTC)
- ✅ **Dias**: Segunda a Sexta (dias úteis)
- ✅ **Telefone Admin**: 5511988384664 (notificações e relatórios)

### Regras de Negócio
- ✅ **Unicidade**: Ano + Mês + Faltas + Estudante + Contato
- ✅ **Retry**: 3 tentativas com delay de 5s entre cada
- ✅ **Delay entre envios**: 5 segundos (anti-bloqueio)
- ✅ **Priority**: Sempre 2 (rotina)
- ✅ **Created By**: AUTOMAÇÃO

### Template de Mensagem
```
🏫 EMEF Habib Kyrillos - Comunicado Importante!

Olá, [Nome Contato]! 👋

📢 Mensagem importante sobre o(a) aluno(a) *[Nome Estudante]* da turma [Turma] ([Turno]).

Percebemos que ele(a) acumulou *[Número de Faltas]* faltas neste mês. Sabemos que imprevistos acontecem, mas a presença é fundamental para o aprendizado e o sucesso escolar.

*Entre em contato com a escola ou compareça para justificar as ausências. Estamos à disposição! 😊*

📞 Contato: (11) 5621-4087
🕐 Segunda a sexta: 7h às 18h30

*Juntos pelo melhor para [Nome Estudante]!*
```

---

## 🏗️ ARQUITETURA DA SOLUÇÃO

### Fluxo Completo
```
GitHub Actions (Cron: 9h AM BRT, dias úteis)
   ↓
API Orquestradora (/api/automation/process-absences)
   ↓
1. Buscar estudantes (API absence-multiples)
2. Para cada estudante:
   ├─ Verificar histórico (whatsappMessageHistory)
   ├─ Filtrar já enviados
   └─ Para cada contato não enviado:
      ├─ Tentar enviar WhatsApp (retry 3x, delay 5s)
      ├─ Sucesso:
      │  ├─ Criar Task FECHADA (action_taken)
      │  └─ Registrar histórico (SUCCESS)
      └─ Falha (após 3 tentativas):
         ├─ Criar Task ABERTA (recommended_action)
         └─ Registrar histórico (FAILED)
   ↓
3. Estudantes sem contato:
   ├─ Verificar histórico
   ├─ Criar Task ABERTA (se novo)
   └─ Registrar histórico (NO_CONTACT)
   ↓
4. Enviar relatório WhatsApp (admin)
5. Salvar log de execução (Firestore)
```

### Estrutura de Arquivos
```
src/
├── app/api/automation/
│   └── process-absences/
│       └── route.ts                  # API Orquestradora (NOVO)
├── services/
│   ├── messageHistoryService.ts      # CRUD histórico (NOVO)
│   ├── whatsappRetryService.ts       # Retry logic (NOVO)
│   └── taskDeduplicationService.ts   # Evitar duplicatas (NOVO)
├── utils/
│   └── messageTemplates.ts           # Template WhatsApp (NOVO)
└── types/
    └── index.ts                      # Adicionar interfaces (MODIFICADO)

.github/workflows/
└── daily-absence-automation.yml      # GitHub Actions (NOVO)

docs/
└── AUTOMACAO-FALTAS-PLANO-DETALHADO.md (ESTE ARQUIVO)
```

### Firestore - Nova Coleção
```
whatsappMessageHistory/{docId}
  - estudanteId: string
  - contatoTelefone: string (apenas dígitos)
  - anoReferencia: number
  - mesReferencia: number
  - quantidadeFaltas: number
  - estudanteNome: string
  - contatoNome: string
  - taskId: string
  - dataPrimeiroEnvio: string (ISO 8601)
  - status: 'SUCCESS' | 'FAILED' | 'NO_CONTACT'
  - messageId?: string
  - sentAt?: number
  - retryCount?: number
  - isDryRun?: boolean
```

**Índice Composto Necessário**:
- estudanteId + contatoTelefone + anoReferencia + mesReferencia + quantidadeFaltas

---

## 🔧 FASE 1: INFRAESTRUTURA

### Duração Estimada: 2 horas

### 1.1 Criar Tipos TypeScript (30min)

**Arquivo**: `src/types/index.ts`

```typescript
// ========================================
// ADICIONAR ao final do arquivo
// ========================================

/**
 * Histórico de Mensagens WhatsApp Enviadas
 * Usado para prevenção de duplicatas
 */
export interface WhatsAppMessageHistory {
  // Chave de unicidade (5 campos)
  estudanteId: string;
  contatoTelefone: string;
  anoReferencia: number;
  mesReferencia: number;
  quantidadeFaltas: number;

  // Metadados
  estudanteNome: string;
  contatoNome: string;
  taskId: string;
  dataPrimeiroEnvio: string; // ISO 8601

  // Status
  status: 'SUCCESS' | 'FAILED' | 'NO_CONTACT';

  // Dados WhatsApp (se enviado)
  messageId?: string;
  sentAt?: number;
  retryCount?: number;

  // Controle
  isDryRun?: boolean;
}

/**
 * Resultado de Envio de WhatsApp com Retry
 */
export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  phone: string;
  status: 'sent' | 'not_sent';
  sentAt?: number;
  retryCount: number;
  error?: string;
}

/**
 * Resumo de Execução da Automação
 */
export interface AutomationExecutionSummary {
  executionId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  dryRun: boolean;

  // Configurações
  absenceMultiple: number;
  referenceMonth: number;
  referenceYear: number;

  // Resultados
  studentsFound: number;
  studentsWithContacts: number;
  studentsWithoutContacts: number;
  messagesAttempted: number;
  messagesSucceeded: number;
  messagesFailed: number;
  messagesSkippedAlreadySent: number;
  tasksCreated: number;
  tasksSkippedDuplicate: number;

  // Erros
  errors: Array<{
    estudanteId: string;
    estudanteNome: string;
    error: string;
  }>;
}

/**
 * Log de Execução da Automação (Firestore)
 */
export interface AutomationExecutionLog {
  executionId: string;
  timestamp: string;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
  summary: AutomationExecutionSummary;
  notificationSent: boolean;
}
```

**Checklist**:
- [ ] Adicionar interfaces ao `src/types/index.ts`
- [ ] Verificar tipos com `npm run type-check`

---

### 1.2 Criar Utils - Template de Mensagem (30min)

**Arquivo**: `src/utils/messageTemplates.ts` (NOVO)

```typescript
/**
 * Templates de Mensagens WhatsApp para Automação
 */

/**
 * Retorna nome do mês em português (minúsculas)
 */
function getMonthName(month: number): string {
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  return months[month - 1] || 'mês inválido';
}

/**
 * Gera mensagem de alerta de faltas para responsável
 */
export function generateAbsenceAlertMessage(params: {
  nomeContato: string;
  nomeEstudante: string;
  turma: string;
  turno: 'MANHÃ' | 'TARDE';
  numeroFaltas: number;
}): string {
  const { nomeContato, nomeEstudante, turma, turno, numeroFaltas } = params;

  return `🏫 EMEF Habib Kyrillos - Comunicado Importante!

Olá, ${nomeContato}! 👋

📢 Mensagem importante sobre o(a) aluno(a) *${nomeEstudante}* da turma ${turma} (${turno}).

Percebemos que ele(a) acumulou *${numeroFaltas}* faltas neste mês. Sabemos que imprevistos acontecem, mas a presença é fundamental para o aprendizado e o sucesso escolar.

*Entre em contato com a escola ou compareça para justificar as ausências. Estamos à disposição! 😊*

📞 Contato: (11) 5621-4087
🕐 Segunda a sexta: 7h às 18h30

*Juntos pelo melhor para ${nomeEstudante}!*`;
}

/**
 * Gera descrição para task fechada (mensagem enviada)
 */
export function generateTaskDescriptionSuccess(params: {
  telefone: string;
  nomeContato: string;
  numeroFaltas: number;
  mesReferencia: number;
  anoReferencia: number;
}): string {
  const { telefone, nomeContato, numeroFaltas, mesReferencia, anoReferencia } = params;
  const mesNome = getMonthName(mesReferencia);

  return `Mensagem enviada via WhatsApp ao número ${telefone} (${nomeContato}) informando que o(a) estudante possui ${numeroFaltas} faltas no mês de ${mesNome} de ${anoReferencia}.`;
}

/**
 * Gera relatório resumido de execução da automação
 */
export function generateExecutionReport(summary: {
  studentsFound: number;
  messagesSucceeded: number;
  messagesFailed: number;
  messagesSkippedAlreadySent: number;
  tasksCreated: number;
  durationMs: number;
  dryRun: boolean;
}): string {
  const {
    studentsFound,
    messagesSucceeded,
    messagesFailed,
    messagesSkippedAlreadySent,
    tasksCreated,
    durationMs,
    dryRun
  } = summary;

  const durationSec = (durationMs / 1000).toFixed(1);

  return `📊 RELATÓRIO DE EXECUÇÃO - ${dryRun ? 'MODO TESTE' : 'PRODUÇÃO'}

✅ Estudantes encontrados: ${studentsFound}
📤 Mensagens enviadas: ${messagesSucceeded}
❌ Falhas no envio: ${messagesFailed}
⏭️ Já enviadas (puladas): ${messagesSkippedAlreadySent}
📋 Tasks criadas: ${tasksCreated}
⏱️ Tempo total: ${durationSec}s

${dryRun ? '⚠️ ATENÇÃO: Este foi um teste. Nenhuma mensagem real foi enviada.' : ''}

--
Sistema Automático de Alertas`;
}

/**
 * Gera mensagem de erro crítico para administrador
 */
export function generateErrorNotification(error: {
  message: string;
  timestamp: string;
}): string {
  return `🚨 AUTOMAÇÃO DE FALTAS - ERRO

⚠️ A execução automática falhou!

📅 Data/Hora: ${new Date(error.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
❌ Erro: ${error.message}

Por favor, verifique os logs em:
https://vercel.com/dashboard/logs

--
Sistema Automático de Alertas`;
}

export { getMonthName };
```

**Checklist**:
- [ ] Criar arquivo `src/utils/messageTemplates.ts`
- [ ] Verificar tipos com `npm run type-check`
- [ ] Testar helpers manualmente no console:
  ```typescript
  import { generateAbsenceAlertMessage } from '@/utils/messageTemplates';
  const msg = generateAbsenceAlertMessage({
    nomeContato: "Edu",
    nomeEstudante: "João Silva",
    turma: "5A",
    turno: "MANHÃ",
    numeroFaltas: 7
  });
  console.log(msg);
  ```

---

### 1.3 Criar Service - Histórico de Mensagens (45min)

**Arquivo**: `src/services/messageHistoryService.ts` (NOVO)

```typescript
import { db } from '@/firebase.config';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import type { WhatsAppMessageHistory } from '@/types';
import { logger } from '@/utils/logger';

const COLLECTION_NAME = 'whatsappMessageHistory';

/**
 * Serviço para gerenciar histórico de mensagens WhatsApp enviadas
 * Previne duplicatas e rastreia status de envios
 */
export class MessageHistoryService {
  /**
   * Verifica se já foi enviada mensagem para essa combinação exata
   */
  static async wasAlreadySent(params: {
    estudanteId: string;
    contatoTelefone: string;
    anoReferencia: number;
    mesReferencia: number;
    quantidadeFaltas: number;
  }): Promise<boolean> {
    try {
      const { estudanteId, contatoTelefone, anoReferencia, mesReferencia, quantidadeFaltas } = params;

      const q = query(
        collection(db, COLLECTION_NAME),
        where('estudanteId', '==', estudanteId),
        where('contatoTelefone', '==', contatoTelefone),
        where('anoReferencia', '==', anoReferencia),
        where('mesReferencia', '==', mesReferencia),
        where('quantidadeFaltas', '==', quantidadeFaltas)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        logger.info('[MessageHistory] Mensagem já enviada anteriormente', {
          estudanteId,
          contatoTelefone,
          anoReferencia,
          mesReferencia,
          quantidadeFaltas,
          existingRecords: snapshot.size
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('[MessageHistory] Erro ao verificar histórico', error as Error);
      // Em caso de erro, assumir que NÃO foi enviado (fail-safe para enviar)
      return false;
    }
  }

  /**
   * Registra envio de mensagem no histórico
   */
  static async recordSent(data: Omit<WhatsAppMessageHistory, 'dataPrimeiroEnvio'>): Promise<string | null> {
    try {
      const historyRecord: Omit<WhatsAppMessageHistory, 'dataPrimeiroEnvio'> & {
        dataPrimeiroEnvio: ReturnType<typeof serverTimestamp>;
      } = {
        ...data,
        dataPrimeiroEnvio: serverTimestamp() as any
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), historyRecord);

      logger.info('[MessageHistory] Registro criado com sucesso', {
        docId: docRef.id,
        estudanteId: data.estudanteId,
        contatoTelefone: data.contatoTelefone,
        status: data.status
      });

      return docRef.id;
    } catch (error) {
      logger.error('[MessageHistory] Erro ao criar registro', error as Error);
      return null;
    }
  }

  /**
   * Busca todos os registros de um estudante no mês/ano
   */
  static async getStudentHistory(params: {
    estudanteId: string;
    anoReferencia: number;
    mesReferencia: number;
  }): Promise<WhatsAppMessageHistory[]> {
    try {
      const { estudanteId, anoReferencia, mesReferencia } = params;

      const q = query(
        collection(db, COLLECTION_NAME),
        where('estudanteId', '==', estudanteId),
        where('anoReferencia', '==', anoReferencia),
        where('mesReferencia', '==', mesReferencia)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        ...doc.data(),
        dataPrimeiroEnvio: doc.data().dataPrimeiroEnvio?.toDate?.()?.toISOString() || new Date().toISOString()
      })) as WhatsAppMessageHistory[];
    } catch (error) {
      logger.error('[MessageHistory] Erro ao buscar histórico do estudante', error as Error);
      return [];
    }
  }

  /**
   * Estatísticas de envios (para relatórios)
   */
  static async getStats(params: {
    anoReferencia: number;
    mesReferencia: number;
  }): Promise<{
    total: number;
    success: number;
    failed: number;
    noContact: number;
  }> {
    try {
      const { anoReferencia, mesReferencia } = params;

      const q = query(
        collection(db, COLLECTION_NAME),
        where('anoReferencia', '==', anoReferencia),
        where('mesReferencia', '==', mesReferencia)
      );

      const snapshot = await getDocs(q);

      const stats = {
        total: snapshot.size,
        success: 0,
        failed: 0,
        noContact: 0
      };

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'SUCCESS') stats.success++;
        else if (data.status === 'FAILED') stats.failed++;
        else if (data.status === 'NO_CONTACT') stats.noContact++;
      });

      return stats;
    } catch (error) {
      logger.error('[MessageHistory] Erro ao calcular estatísticas', error as Error);
      return { total: 0, success: 0, failed: 0, noContact: 0 };
    }
  }
}
```

**Checklist**:
- [ ] Criar arquivo `src/services/messageHistoryService.ts`
- [ ] Verificar imports (`npm run type-check`)
- [ ] Criar índice composto no Firestore (instruções abaixo)

---

### 1.4 Criar Índice Composto no Firestore (15min)

**IMPORTANTE**: O índice é OBRIGATÓRIO para o query funcionar.

#### Opção 1: Via Firebase Console (Recomendado)

1. Acessar: https://console.firebase.google.com
2. Selecionar projeto
3. Firestore Database → Indexes → Create Index
4. Configuração:
   - Collection ID: `whatsappMessageHistory`
   - Fields:
     - `estudanteId` (Ascending)
     - `contatoTelefone` (Ascending)
     - `anoReferencia` (Ascending)
     - `mesReferencia` (Ascending)
     - `quantidadeFaltas` (Ascending)
   - Query scope: Collection
5. Clicar "Create Index"
6. Aguardar criação (1-3 minutos)

#### Opção 2: Trigger Automático

Execute o seguinte query no código (vai falhar mas gerar link):

```typescript
import { MessageHistoryService } from '@/services/messageHistoryService';

// Isso vai falhar e mostrar link para criar índice
await MessageHistoryService.wasAlreadySent({
  estudanteId: 'test',
  contatoTelefone: '11999999999',
  anoReferencia: 2025,
  mesReferencia: 10,
  quantidadeFaltas: 3
});
```

Clicar no link do erro e criar índice.

**Checklist**:
- [ ] Índice criado no Firestore
- [ ] Status "Enabled" (verde)
- [ ] Testar query manualmente

---

### 1.5 Criar Service - Retry de WhatsApp (30min)

**Arquivo**: `src/services/whatsappRetryService.ts` (NOVO)

```typescript
import type { WhatsAppSendResult } from '@/types';
import { logger } from '@/utils/logger';

const WHATSAPP_API_URL = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || '';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 segundos

/**
 * Aguarda X milissegundos (promise-based)
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Serviço para enviar mensagens WhatsApp com retry automático
 */
export class WhatsAppRetryService {
  /**
   * Envia mensagem WhatsApp com retry (até 3 tentativas, delay 5s)
   */
  static async sendWithRetry(params: {
    phone: string;
    message: string;
    isDryRun?: boolean;
  }): Promise<WhatsAppSendResult> {
    const { phone, message, isDryRun = false } = params;

    // Modo Dry-Run: simular envio sem chamar API real
    if (isDryRun) {
      logger.info('[WhatsAppRetry] DRY-RUN: Simulando envio', { phone });
      await sleep(100); // Simular latência
      return {
        success: true,
        messageId: `DRY-RUN-${Date.now()}`,
        phone,
        status: 'sent',
        sentAt: Date.now(),
        retryCount: 0
      };
    }

    let lastError: string = '';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(`[WhatsAppRetry] Tentativa ${attempt}/${MAX_RETRIES}`, { phone });

        const response = await fetch(`${WHATSAPP_API_URL}/whatsapp/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, message })
        });

        const data = await response.json();

        if (data.success && data.data?.status === 'sent') {
          logger.info(`[WhatsAppRetry] ✅ Sucesso na tentativa ${attempt}`, {
            phone,
            messageId: data.data.messageId
          });

          return {
            success: true,
            messageId: data.data.messageId,
            phone,
            status: 'sent',
            sentAt: data.data.sentAt,
            retryCount: attempt - 1 // Quantas retries até sucesso
          };
        }

        // Falha da API (ex: número sem WhatsApp)
        lastError = data.message || 'Erro desconhecido';
        logger.warn(`[WhatsAppRetry] ⚠️ Falha na tentativa ${attempt}: ${lastError}`, { phone });

        // Se não tem WhatsApp, não adianta tentar de novo
        if (data.data?.hasWhatsApp === false) {
          logger.warn('[WhatsAppRetry] Número não possui WhatsApp, abortando retries', { phone });
          break;
        }

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Erro de rede';
        logger.error(`[WhatsAppRetry] ❌ Erro na tentativa ${attempt}`, error as Error);
      }

      // Se não foi a última tentativa, aguardar delay
      if (attempt < MAX_RETRIES) {
        logger.info(`[WhatsAppRetry] Aguardando ${RETRY_DELAY_MS}ms antes da próxima tentativa...`);
        await sleep(RETRY_DELAY_MS);
      }
    }

    // Esgotou tentativas
    logger.error(`[WhatsAppRetry] ❌ Falha após ${MAX_RETRIES} tentativas`, {
      phone,
      lastError
    });

    return {
      success: false,
      phone,
      status: 'not_sent',
      retryCount: MAX_RETRIES,
      error: lastError
    };
  }

  /**
   * Delay entre envios para evitar rate limiting (5s fixo)
   */
  static async delayBetweenMessages(): Promise<void> {
    logger.info('[WhatsAppRetry] Aguardando 5s antes do próximo envio...');
    await sleep(5000);
  }
}
```

**Checklist**:
- [ ] Criar arquivo `src/services/whatsappRetryService.ts`
- [ ] Verificar tipos (`npm run type-check`)
- [ ] Configurar env var `NEXT_PUBLIC_WHATSAPP_API_URL`

---

## ✅ FIM DA FASE 1

### Checklist Fase 1
- [ ] Tipos adicionados em `src/types/index.ts`
- [ ] Utils criado: `src/utils/messageTemplates.ts`
- [ ] Service criado: `src/services/messageHistoryService.ts`
- [ ] Service criado: `src/services/whatsappRetryService.ts`
- [ ] Índice composto criado no Firestore
- [ ] `npm run type-check` passou sem erros
- [ ] Env var `NEXT_PUBLIC_WHATSAPP_API_URL` configurada

**Próximo**: Fase 2 - API Orquestradora

---

## 🎯 FASE 2: API ORQUESTRADORA

### Duração Estimada: 3 horas

### 2.1 Criar API Route Principal (2h)

**Arquivo**: `src/app/api/automation/process-absences/route.ts` (NOVO)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import type { AutomationExecutionSummary, WhatsAppMessageHistory } from '@/types';
import { MessageHistoryService } from '@/services/messageHistoryService';
import { WhatsAppRetryService } from '@/services/whatsappRetryService';
import {
  generateAbsenceAlertMessage,
  generateTaskDescriptionSuccess,
  generateExecutionReport,
  generateErrorNotification
} from '@/utils/messageTemplates';

/**
 * API ORQUESTRADORA - AUTOMAÇÃO DE ALERTAS DE FALTAS
 *
 * Chamada pelo GitHub Actions diariamente às 9h AM (São Paulo)
 *
 * Query Params:
 * - dryRun=true|false (default: false)
 * - multiple=3 (default: 3)
 * - notificationPhone=5511988384664
 *
 * Auth: Basic Auth (mesmas credenciais da API absence-multiples)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const executionId = `exec-${Date.now()}`;

  // Query params
  const searchParams = request.nextUrl.searchParams;
  const dryRun = searchParams.get('dryRun') === 'true';
  const absenceMultiple = parseInt(searchParams.get('multiple') || '3');
  const notificationPhone = searchParams.get('notificationPhone') || '5511988384664';

  logger.info('[AUTOMATION] 🚀 Execução iniciada', {
    executionId,
    dryRun,
    absenceMultiple,
    notificationPhone
  });

  // ==========================================
  // AUTENTICAÇÃO
  // ==========================================
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return NextResponse.json(
      { success: false, error: 'Authorization header required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="API"' } }
    );
  }

  if (!authorization.startsWith('Basic ')) {
    return NextResponse.json(
      { success: false, error: 'Basic authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="API"' } }
    );
  }

  const base64Credentials = authorization.slice(6);
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  const expectedUsername = process.env.API_HABIB_KYRILLOS_USERNAME;
  const expectedPassword = process.env.API_HABIB_KYRILLOS_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return NextResponse.json(
      { success: false, error: 'Server configuration error' },
      { status: 500 }
    );
  }

  if (username !== expectedUsername || password !== expectedPassword) {
    return NextResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="API"' } }
    );
  }

  // ==========================================
  // EXECUÇÃO PRINCIPAL
  // ==========================================
  try {
    const now = new Date();
    const referenceMonth = now.getMonth() + 1; // 1-12
    const referenceYear = now.getFullYear();

    const summary: AutomationExecutionSummary = {
      executionId,
      startedAt: now.toISOString(),
      finishedAt: '',
      durationMs: 0,
      dryRun,
      absenceMultiple,
      referenceMonth,
      referenceYear,
      studentsFound: 0,
      studentsWithContacts: 0,
      studentsWithoutContacts: 0,
      messagesAttempted: 0,
      messagesSucceeded: 0,
      messagesFailed: 0,
      messagesSkippedAlreadySent: 0,
      tasksCreated: 0,
      tasksSkippedDuplicate: 0,
      errors: []
    };

    // ==========================================
    // ETAPA 1: Buscar estudantes com múltiplo de faltas
    // ==========================================
    logger.info('[AUTOMATION] 📊 Buscando estudantes...', {
      absenceMultiple,
      referenceMonth,
      referenceYear
    });

    const absenceApiUrl = `${request.nextUrl.origin}/api/students/absence-multiples?absenceMultiple=${absenceMultiple}&referenceMonth=${referenceMonth}`;

    const absenceResponse = await fetch(absenceApiUrl, {
      headers: { 'authorization': authorization }
    });

    if (!absenceResponse.ok) {
      throw new Error(`API absence-multiples falhou: ${absenceResponse.statusText}`);
    }

    const absenceData = await absenceResponse.json();

    if (!absenceData.success || !absenceData.data) {
      throw new Error('API absence-multiples retornou dados inválidos');
    }

    const students = absenceData.data; // Array de StudentWithAbsenceMultiples
    summary.studentsFound = students.length;

    logger.info('[AUTOMATION] ✅ Estudantes encontrados', {
      count: students.length
    });

    // ==========================================
    // ETAPA 2: Processar cada estudante
    // ==========================================
    for (const student of students) {
      const { estudanteId, nome, turma, turno, absencesCount, verifiedWhatsAppContacts } = student;

      logger.info(`[AUTOMATION] Processando estudante: ${nome}`, {
        estudanteId,
        absencesCount,
        contactsCount: verifiedWhatsAppContacts.length
      });

      // Tem contatos verificados?
      if (verifiedWhatsAppContacts.length === 0) {
        // ====================================
        // SEM CONTATOS: Criar task aberta
        // ====================================
        summary.studentsWithoutContacts++;

        // Verificar se já existe histórico de "sem contato"
        const alreadyRecorded = await MessageHistoryService.wasAlreadySent({
          estudanteId,
          contatoTelefone: 'NO_CONTACT',
          anoReferencia: referenceYear,
          mesReferencia: referenceMonth,
          quantidadeFaltas: absencesCount
        });

        if (alreadyRecorded) {
          logger.info(`[AUTOMATION] ⏭️ Task "sem contato" já existe, pulando...`, { estudanteId });
          summary.tasksSkippedDuplicate++;
          continue;
        }

        // Criar task ABERTA
        const taskCreated = await createTaskOpen({
          estudanteId,
          absencesCount,
          referenceMonth,
          referenceYear,
          authorization
        });

        if (taskCreated.success) {
          summary.tasksCreated++;

          // Registrar histórico
          await MessageHistoryService.recordSent({
            estudanteId,
            contatoTelefone: 'NO_CONTACT',
            anoReferencia: referenceYear,
            mesReferencia: referenceMonth,
            quantidadeFaltas: absencesCount,
            estudanteNome: nome,
            contatoNome: 'N/A',
            taskId: taskCreated.taskId,
            status: 'NO_CONTACT',
            isDryRun: dryRun
          });

          logger.info(`[AUTOMATION] ✅ Task aberta criada (sem contato)`, {
            estudanteId,
            taskId: taskCreated.taskId
          });
        } else {
          summary.errors.push({
            estudanteId,
            estudanteNome: nome,
            error: `Erro ao criar task: ${taskCreated.error}`
          });
        }

        continue;
      }

      // ====================================
      // COM CONTATOS: Processar cada um
      // ====================================
      summary.studentsWithContacts++;

      for (const contact of verifiedWhatsAppContacts) {
        const { nome: nomeContato, telefone } = contact;

        // Verificar se já foi enviado
        const alreadySent = await MessageHistoryService.wasAlreadySent({
          estudanteId,
          contatoTelefone: telefone,
          anoReferencia: referenceYear,
          mesReferencia: referenceMonth,
          quantidadeFaltas: absencesCount
        });

        if (alreadySent) {
          logger.info(`[AUTOMATION] ⏭️ Mensagem já enviada anteriormente, pulando...`, {
            estudanteId,
            telefone
          });
          summary.messagesSkippedAlreadySent++;
          continue;
        }

        // Gerar mensagem
        const message = generateAbsenceAlertMessage({
          nomeContato,
          nomeEstudante: nome,
          turma,
          turno,
          numeroFaltas: absencesCount
        });

        // Tentar enviar WhatsApp (com retry)
        summary.messagesAttempted++;

        const sendResult = await WhatsAppRetryService.sendWithRetry({
          phone: telefone,
          message,
          isDryRun: dryRun
        });

        if (sendResult.success) {
          // ====================================
          // SUCESSO: Criar task FECHADA
          // ====================================
          summary.messagesSucceeded++;

          const taskDescription = generateTaskDescriptionSuccess({
            telefone,
            nomeContato,
            numeroFaltas: absencesCount,
            mesReferencia: referenceMonth,
            anoReferencia: referenceYear
          });

          const taskCreated = await createTaskClosed({
            estudanteId,
            absencesCount,
            referenceMonth,
            referenceYear,
            actionDescription: taskDescription,
            whatsappPhone: telefone,
            authorization
          });

          if (taskCreated.success) {
            summary.tasksCreated++;

            // Registrar histórico
            await MessageHistoryService.recordSent({
              estudanteId,
              contatoTelefone: telefone,
              anoReferencia: referenceYear,
              mesReferencia: referenceMonth,
              quantidadeFaltas: absencesCount,
              estudanteNome: nome,
              contatoNome: nomeContato,
              taskId: taskCreated.taskId,
              status: 'SUCCESS',
              messageId: sendResult.messageId,
              sentAt: sendResult.sentAt,
              retryCount: sendResult.retryCount,
              isDryRun: dryRun
            });

            logger.info(`[AUTOMATION] ✅ Mensagem enviada e task fechada criada`, {
              estudanteId,
              telefone,
              taskId: taskCreated.taskId,
              retries: sendResult.retryCount
            });
          } else {
            summary.errors.push({
              estudanteId,
              estudanteNome: nome,
              error: `Mensagem enviada mas falha ao criar task: ${taskCreated.error}`
            });
          }

        } else {
          // ====================================
          // FALHA (após 3 tentativas): Task ABERTA
          // ====================================
          summary.messagesFailed++;

          const taskCreated = await createTaskOpen({
            estudanteId,
            absencesCount,
            referenceMonth,
            referenceYear,
            authorization
          });

          if (taskCreated.success) {
            summary.tasksCreated++;

            // Registrar histórico
            await MessageHistoryService.recordSent({
              estudanteId,
              contatoTelefone: telefone,
              anoReferencia: referenceYear,
              mesReferencia: referenceMonth,
              quantidadeFaltas: absencesCount,
              estudanteNome: nome,
              contatoNome: nomeContato,
              taskId: taskCreated.taskId,
              status: 'FAILED',
              retryCount: sendResult.retryCount,
              isDryRun: dryRun
            });

            logger.warn(`[AUTOMATION] ⚠️ Falha no envio após ${sendResult.retryCount} tentativas, task aberta criada`, {
              estudanteId,
              telefone,
              taskId: taskCreated.taskId,
              error: sendResult.error
            });
          } else {
            summary.errors.push({
              estudanteId,
              estudanteNome: nome,
              error: `Falha no envio E erro ao criar task: ${taskCreated.error}`
            });
          }
        }

        // Delay entre envios (evitar rate limiting)
        await WhatsAppRetryService.delayBetweenMessages();
      }
    }

    // ==========================================
    // ETAPA 3: Finalizar e enviar relatório
    // ==========================================
    const finishTime = Date.now();
    summary.finishedAt = new Date(finishTime).toISOString();
    summary.durationMs = finishTime - startTime;

    logger.info('[AUTOMATION] 🏁 Execução concluída', summary);

    // Enviar relatório para admin
    const reportMessage = generateExecutionReport({
      studentsFound: summary.studentsFound,
      messagesSucceeded: summary.messagesSucceeded,
      messagesFailed: summary.messagesFailed,
      messagesSkippedAlreadySent: summary.messagesSkippedAlreadySent,
      tasksCreated: summary.tasksCreated,
      durationMs: summary.durationMs,
      dryRun
    });

    await WhatsAppRetryService.sendWithRetry({
      phone: notificationPhone,
      message: reportMessage,
      isDryRun: false // SEMPRE enviar relatório (mesmo em dry-run)
    });

    logger.info('[AUTOMATION] 📤 Relatório enviado para admin', { notificationPhone });

    return NextResponse.json({
      success: true,
      executionId,
      summary
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    logger.error('[AUTOMATION] ❌ ERRO CRÍTICO', error as Error);

    // Enviar notificação de erro para admin
    const errorNotification = generateErrorNotification({
      message: errorMessage,
      timestamp: new Date().toISOString()
    });

    try {
      await WhatsAppRetryService.sendWithRetry({
        phone: notificationPhone,
        message: errorNotification,
        isDryRun: false
      });
    } catch (notifError) {
      logger.error('[AUTOMATION] Falha ao enviar notificação de erro', notifError as Error);
    }

    return NextResponse.json({
      success: false,
      executionId,
      error: errorMessage
    }, { status: 500 });
  }
}

// ==========================================
// HELPERS: Criar Tasks
// ==========================================

/**
 * Cria task FECHADA (mensagem enviada com sucesso)
 */
async function createTaskClosed(params: {
  estudanteId: string;
  absencesCount: number;
  referenceMonth: number;
  referenceYear: number;
  actionDescription: string;
  whatsappPhone: string;
  authorization: string;
}): Promise<{ success: boolean; taskId: string; error?: string }> {
  try {
    const { estudanteId, absencesCount, referenceMonth, referenceYear, actionDescription, whatsappPhone, authorization } = params;

    const taskData = {
      estudante_id: estudanteId,
      absences_count: absencesCount,
      reference_month: referenceMonth,
      reference_year: referenceYear,
      created_at: new Date().toISOString(),
      action_taken: 'Contato digital',
      is_resolved: true,
      priority: 2,
      created_by: 'AUTOMAÇÃO',
      processed_at: new Date().toISOString(),
      action_description: actionDescription,
      whatsapp_phone: whatsappPhone
    };

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tasks/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': authorization
      },
      body: JSON.stringify(taskData)
    });

    const result = await response.json();

    if (result.success && result.data?.taskId) {
      return {
        success: true,
        taskId: result.data.taskId
      };
    }

    return {
      success: false,
      taskId: '',
      error: result.error || 'Erro desconhecido ao criar task'
    };

  } catch (error) {
    return {
      success: false,
      taskId: '',
      error: error instanceof Error ? error.message : 'Erro de rede'
    };
  }
}

/**
 * Cria task ABERTA (falha no envio ou sem contato)
 */
async function createTaskOpen(params: {
  estudanteId: string;
  absencesCount: number;
  referenceMonth: number;
  referenceYear: number;
  authorization: string;
}): Promise<{ success: boolean; taskId: string; error?: string }> {
  try {
    const { estudanteId, absencesCount, referenceMonth, referenceYear, authorization } = params;

    const taskData = {
      estudante_id: estudanteId,
      absences_count: absencesCount,
      reference_month: referenceMonth,
      reference_year: referenceYear,
      created_at: new Date().toISOString(),
      recommended_action: 'Contato telefônico',
      is_resolved: false,
      priority: 2,
      created_by: 'AUTOMAÇÃO'
    };

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/tasks/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': authorization
      },
      body: JSON.stringify(taskData)
    });

    const result = await response.json();

    if (result.success && result.data?.taskId) {
      return {
        success: true,
        taskId: result.data.taskId
      };
    }

    return {
      success: false,
      taskId: '',
      error: result.error || 'Erro desconhecido ao criar task'
    };

  } catch (error) {
    return {
      success: false,
      taskId: '',
      error: error instanceof Error ? error.message : 'Erro de rede'
    };
  }
}
```

**Checklist**:
- [ ] Criar pasta `src/app/api/automation/process-absences/`
- [ ] Criar arquivo `route.ts`
- [ ] Verificar tipos (`npm run type-check`)
- [ ] Configurar env var `NEXT_PUBLIC_API_URL` (se necessário)

---

### 2.2 Configurar Variáveis de Ambiente (15min)

**Arquivo**: `.env.local`

```bash
# ==========================================
# AUTOMAÇÃO DE ALERTAS DE FALTAS
# ==========================================

# URL da API WhatsApp (usado pelo retry service)
NEXT_PUBLIC_WHATSAPP_API_URL=https://seu-dominio.com

# URL base da própria API (usado para chamadas internas)
NEXT_PUBLIC_API_URL=https://seu-dominio.com

# Telefone fixo para notificações de admin
AUTOMATION_NOTIFICATION_PHONE=5511988384664

# Credenciais Basic Auth (mesmas da API absence-multiples)
API_HABIB_KYRILLOS_USERNAME=seu_usuario
API_HABIB_KYRILLOS_PASSWORD=sua_senha
```

**Para Vercel** (Produção):

1. Acessar: https://vercel.com/dashboard
2. Selecionar projeto
3. Settings → Environment Variables
4. Adicionar cada variável acima

**Checklist**:
- [ ] `.env.local` configurado
- [ ] Variáveis adicionadas no Vercel (produção)
- [ ] Testar localmente: `npm run dev`

---

### 2.3 Testar API Localmente (30min)

#### Teste 1: Dry-Run Mode

```bash
# Terminal
curl -X GET \
  "http://localhost:3000/api/automation/process-absences?dryRun=true&multiple=3&notificationPhone=5511988384664" \
  -H "Authorization: Basic $(echo -n 'usuario:senha' | base64)"
```

**Resultado esperado**:
```json
{
  "success": true,
  "executionId": "exec-1234567890",
  "summary": {
    "dryRun": true,
    "studentsFound": 10,
    "messagesSucceeded": 8,
    "messagesFailed": 0,
    "messagesSkippedAlreadySent": 2,
    "tasksCreated": 10,
    "durationMs": 5000
  }
}
```

#### Teste 2: Verificar Tasks Criadas

1. Acessar: http://localhost:3000/painel-tarefas
2. Verificar se tasks foram criadas com:
   - ✅ `created_by: "AUTOMAÇÃO"`
   - ✅ `priority: 2`
   - ✅ Status correto (COMPLETED/PENDING)

#### Teste 3: Verificar Histórico no Firestore

1. Firebase Console → Firestore
2. Coleção: `whatsappMessageHistory`
3. Verificar documentos:
   - ✅ Campos corretos
   - ✅ `isDryRun: true`
   - ✅ `status: "SUCCESS"`

**Checklist**:
- [ ] Dry-run funcionou
- [ ] Tasks criadas corretamente
- [ ] Histórico salvo no Firestore
- [ ] Relatório enviado para admin

---

## ✅ FIM DA FASE 2

### Checklist Fase 2
- [ ] API Route criada: `src/app/api/automation/process-absences/route.ts`
- [ ] Variáveis de ambiente configuradas
- [ ] Testes locais passaram
- [ ] Dry-run mode funcional
- [ ] Tasks sendo criadas
- [ ] Histórico sendo salvo
- [ ] Relatório sendo enviado

**Próximo**: Fase 3 - GitHub Actions

---

## ⚙️ FASE 3: GITHUB ACTIONS

### Duração Estimada: 1 hora

### 3.1 Criar Workflow (30min)

**Arquivo**: `.github/workflows/daily-absence-automation.yml` (NOVO)

```yaml
name: Daily Absence Alerts Automation

on:
  # Cron: Segunda a Sexta, 9h AM São Paulo (12h UTC)
  schedule:
    - cron: '0 12 * * 1-5'

  # Permitir execução manual
  workflow_dispatch:
    inputs:
      dryRun:
        description: 'Dry-run mode (teste sem enviar mensagens)'
        required: false
        default: 'false'
        type: choice
        options:
          - 'true'
          - 'false'
      multiple:
        description: 'Múltiplo de faltas (3, 6, 9...)'
        required: false
        default: '3'

jobs:
  process-absences:
    name: Process Student Absences
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Configure timezone (America/Sao_Paulo)
        run: |
          sudo timedatectl set-timezone America/Sao_Paulo
          date

      - name: Call Automation API
        id: automation
        env:
          API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
          API_USER: ${{ secrets.API_HABIB_KYRILLOS_USERNAME }}
          API_PASS: ${{ secrets.API_HABIB_KYRILLOS_PASSWORD }}
          NOTIFICATION_PHONE: ${{ secrets.AUTOMATION_NOTIFICATION_PHONE }}
          DRY_RUN: ${{ github.event.inputs.dryRun || 'false' }}
          MULTIPLE: ${{ github.event.inputs.multiple || '3' }}
        run: |
          echo "🚀 Chamando API de automação..."
          echo "Dry-run: $DRY_RUN"
          echo "Multiple: $MULTIPLE"
          echo "Notification Phone: $NOTIFICATION_PHONE"

          # Criar Basic Auth
          AUTH_HEADER=$(echo -n "$API_USER:$API_PASS" | base64)

          # Chamar API
          RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
            "$API_URL/api/automation/process-absences?dryRun=$DRY_RUN&multiple=$MULTIPLE&notificationPhone=$NOTIFICATION_PHONE" \
            -H "Authorization: Basic $AUTH_HEADER")

          # Separar body e status code
          HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
          HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)

          echo "HTTP Status: $HTTP_STATUS"
          echo "Response Body:"
          echo "$HTTP_BODY" | jq '.'

          # Salvar para próximo step
          echo "http_status=$HTTP_STATUS" >> $GITHUB_OUTPUT
          echo "response_body=$HTTP_BODY" >> $GITHUB_OUTPUT

          # Verificar sucesso
          if [ "$HTTP_STATUS" -ne 200 ]; then
            echo "❌ Erro na API (HTTP $HTTP_STATUS)"
            exit 1
          fi

          SUCCESS=$(echo "$HTTP_BODY" | jq -r '.success')
          if [ "$SUCCESS" != "true" ]; then
            echo "❌ Execução falhou"
            exit 1
          fi

          echo "✅ Execução concluída com sucesso"

      - name: Display Summary
        if: always()
        run: |
          echo "### 📊 Resumo da Execução" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Status HTTP:** ${{ steps.automation.outputs.http_status }}" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Response:**" >> $GITHUB_STEP_SUMMARY
          echo '```json' >> $GITHUB_STEP_SUMMARY
          echo '${{ steps.automation.outputs.response_body }}' | jq '.' >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY

      - name: Notify on Failure
        if: failure()
        run: |
          echo "❌ Workflow falhou! Verifique os logs acima."
          echo "Notificação de erro foi enviada para o WhatsApp do admin."
```

**Checklist**:
- [ ] Criar pasta `.github/workflows/`
- [ ] Criar arquivo `daily-absence-automation.yml`
- [ ] Commit e push para GitHub

---

### 3.2 Configurar Secrets no GitHub (15min)

1. Acessar: https://github.com/seu-usuario/seu-repositorio
2. Settings → Secrets and variables → Actions
3. Clicar em "New repository secret"
4. Adicionar cada secret abaixo:

| Nome | Valor | Exemplo |
|------|-------|---------|
| `NEXT_PUBLIC_API_URL` | URL da aplicação | `https://seu-app.vercel.app` |
| `API_HABIB_KYRILLOS_USERNAME` | Usuário Basic Auth | `admin` |
| `API_HABIB_KYRILLOS_PASSWORD` | Senha Basic Auth | `senha123` |
| `AUTOMATION_NOTIFICATION_PHONE` | Telefone admin | `5511988384664` |

**Checklist**:
- [ ] Todos os 4 secrets configurados
- [ ] Valores corretos (sem espaços extras)
- [ ] Secrets salvos com sucesso

---

### 3.3 Testar Workflow Manualmente (15min)

1. Acessar: https://github.com/seu-usuario/seu-repositorio/actions
2. Clicar no workflow: "Daily Absence Alerts Automation"
3. Clicar em "Run workflow"
4. Configurar:
   - Branch: `main`
   - Dry-run: `true` (para teste)
   - Multiple: `3`
5. Clicar em "Run workflow"

**Aguardar execução** (~2-5 minutos)

**Verificar**:
- [ ] ✅ Workflow concluiu com sucesso
- [ ] ✅ Logs mostram estudantes encontrados
- [ ] ✅ Tasks criadas no Firestore
- [ ] ✅ Histórico salvo
- [ ] ✅ Relatório recebido no WhatsApp admin

**Se falhar**:
1. Verificar logs do GitHub Actions
2. Verificar secrets configurados
3. Testar API manualmente (curl)

---

## ✅ FIM DA FASE 3

### Checklist Fase 3
- [ ] Workflow criado: `.github/workflows/daily-absence-automation.yml`
- [ ] Secrets configurados no GitHub
- [ ] Teste manual executado com sucesso
- [ ] Dry-run funcionou
- [ ] Relatório recebido no WhatsApp

**Próximo**: Fase 4 - Testes Completos

---

## 🧪 FASE 4: TESTES

### Duração Estimada: 2 horas

### 4.1 Teste Completo: Dry-Run (30min)

**Objetivo**: Validar todo o fluxo sem enviar mensagens reais

#### Setup
1. Garantir que há estudantes com múltiplos de 3 faltas no mês atual
2. Se não houver, criar manualmente via Firestore:
   - Estudante com 3 faltas + contatos verificados
   - Estudante com 6 faltas + sem contatos
   - Estudante com 9 faltas + contatos verificados

#### Execução
```bash
# Executar workflow manualmente com dry-run=true
# OU via curl:
curl -X GET \
  "https://seu-app.vercel.app/api/automation/process-absences?dryRun=true&multiple=3&notificationPhone=5511988384664" \
  -H "Authorization: Basic $(echo -n 'usuario:senha' | base64)"
```

#### Validações
- [ ] API retornou sucesso (200)
- [ ] Summary correto:
  - `dryRun: true`
  - `studentsFound > 0`
  - `messagesSucceeded` ou `messagesSkippedAlreadySent > 0`
- [ ] Tasks criadas no Firestore (`userTasks`)
- [ ] Histórico salvo (`whatsappMessageHistory`) com `isDryRun: true`
- [ ] Relatório recebido no WhatsApp admin
- [ ] **NENHUMA mensagem real enviada para responsáveis**

---

### 4.2 Teste Completo: Produção (1 Estudante) (30min)

**Objetivo**: Validar fluxo real com 1 estudante apenas

#### Setup
1. Escolher 1 estudante com:
   - Exatamente 3 faltas (múltiplo)
   - 1 contato verificado
   - **IMPORTANTE**: Avisar o responsável que receberá mensagem de teste

#### Execução
```bash
curl -X GET \
  "https://seu-app.vercel.app/api/automation/process-absences?dryRun=false&multiple=3&notificationPhone=5511988384664" \
  -H "Authorization: Basic $(echo -n 'usuario:senha' | base64)"
```

#### Validações
- [ ] API retornou sucesso (200)
- [ ] Mensagem WhatsApp ENVIADA para o responsável
- [ ] Task FECHADA criada com:
  - `created_by: "AUTOMAÇÃO"`
  - `action_taken: "Contato digital"`
  - `is_resolved: true`
  - `whatsapp_phone: "11xxxxx"`
  - `action_description` correta
- [ ] Histórico salvo com:
  - `status: "SUCCESS"`
  - `messageId` presente
  - `isDryRun: false`
- [ ] Relatório recebido no WhatsApp admin

#### Teste de Idempotência
Executar API novamente (mesma requisição):

- [ ] Mensagem NÃO reenviada (pulada)
- [ ] Task NÃO duplicada
- [ ] `messagesSkippedAlreadySent` incrementou

---

### 4.3 Teste: Retry Logic (30min)

**Objetivo**: Validar retry de 3 tentativas

#### Setup
1. Temporariamente modificar `whatsappRetryService.ts`:
   ```typescript
   // APENAS PARA TESTE - Forçar falha nas 2 primeiras tentativas
   if (attempt <= 2) {
     throw new Error('Teste de retry');
   }
   ```

#### Execução
Executar API com 1 estudante

#### Validações
- [ ] Logs mostram 3 tentativas:
  - `[WhatsAppRetry] Tentativa 1/3`
  - `[WhatsAppRetry] Tentativa 2/3`
  - `[WhatsAppRetry] Tentativa 3/3`
- [ ] Delay de 5s entre tentativas
- [ ] Sucesso na 3ª tentativa
- [ ] `retryCount: 2` salvo no histórico

#### Cleanup
Reverter modificação no `whatsappRetryService.ts`

---

### 4.4 Teste: Estudante Sem Contato (15min)

**Objetivo**: Validar criação de task aberta

#### Setup
1. Estudante com 3 faltas
2. **SEM contatos verificados** (ou todos marcados como `podeReceberWhatsapp: false`)

#### Execução
Executar API

#### Validações
- [ ] Task ABERTA criada com:
  - `created_by: "AUTOMAÇÃO"`
  - `recommended_action: "Contato telefônico"`
  - `is_resolved: false`
- [ ] Histórico salvo com:
  - `status: "NO_CONTACT"`
  - `contatoTelefone: "NO_CONTACT"`

---

### 4.5 Teste: Fluxo Completo Agendado (15min)

**Objetivo**: Validar execução automática do GitHub Actions

#### Setup
1. Aguardar execução automática (9h AM)
2. **OU** ajustar cron para próximo minuto:
   ```yaml
   # Temporariamente mudar para:
   - cron: '*/5 * * * *' # A cada 5 minutos
   ```

#### Validações
- [ ] Workflow executou no horário esperado
- [ ] Logs do GitHub Actions completos
- [ ] Tasks criadas
- [ ] Relatório recebido

#### Cleanup
Reverter cron para `0 12 * * 1-5`

---

## ✅ FIM DA FASE 4

### Checklist Fase 4
- [ ] Dry-run validado
- [ ] Produção com 1 estudante validado
- [ ] Retry logic validado
- [ ] Estudante sem contato validado
- [ ] Fluxo agendado validado
- [ ] Idempotência confirmada

**Próximo**: Fase 5 - Documentação

---

## 📚 FASE 5: DOCUMENTAÇÃO

### Duração Estimada: 30 minutos

### 5.1 Atualizar CLAUDE.md (15min)

**Arquivo**: `CLAUDE.md`

Adicionar seção:

```markdown
## 🤖 AUTOMAÇÃO DE ALERTAS DE FALTAS

### Visão Geral
Sistema automatizado de envio de alertas por WhatsApp para responsáveis de estudantes com múltiplos de faltas no mês atual.

### Componentes
- **Trigger**: GitHub Actions (cron diário - 9h AM)
- **API**: `/api/automation/process-absences`
- **Histórico**: Firestore collection `whatsappMessageHistory`
- **Prevenção de Duplicatas**: Índice composto único

### Configuração

#### Variáveis de Ambiente
```bash
NEXT_PUBLIC_WHATSAPP_API_URL=https://...
NEXT_PUBLIC_API_URL=https://...
AUTOMATION_NOTIFICATION_PHONE=5511988384664
API_HABIB_KYRILLOS_USERNAME=...
API_HABIB_KYRILLOS_PASSWORD=...
```

#### GitHub Secrets
Configurar em: Settings → Secrets and variables → Actions
- `NEXT_PUBLIC_API_URL`
- `API_HABIB_KYRILLOS_USERNAME`
- `API_HABIB_KYRILLOS_PASSWORD`
- `AUTOMATION_NOTIFICATION_PHONE`

### Uso

#### Execução Manual (Dry-Run)
```bash
curl -X GET \
  "https://seu-app.vercel.app/api/automation/process-absences?dryRun=true&multiple=3" \
  -H "Authorization: Basic $(echo -n 'user:pass' | base64)"
```

#### Executar via GitHub Actions
1. Actions → Daily Absence Alerts Automation
2. Run workflow
3. Configurar dry-run e multiple

### Regras de Negócio
- **Unicidade**: Mensagem enviada apenas 1x por combinação (ano + mês + faltas + estudante + contato)
- **Retry**: 3 tentativas automáticas com delay de 5s
- **Tasks**:
  - FECHADA: Mensagem enviada com sucesso
  - ABERTA: Falha no envio OU estudante sem contato
- **Relatório**: Enviado sempre para admin (mesmo em dry-run)

### Troubleshooting

#### Mensagens duplicadas
Verificar índice composto no Firestore:
```
estudanteId + contatoTelefone + anoReferencia + mesReferencia + quantidadeFaltas
```

#### Workflow não executa
- Verificar cron (fuso UTC vs BRT)
- Verificar secrets configurados
- Verificar logs do GitHub Actions

#### API retorna 401
- Verificar Basic Auth (username/password)
- Verificar env vars em produção (Vercel)

### Documentação Completa
Ver: `docs/AUTOMACAO-FALTAS-PLANO-DETALHADO.md`
```

**Checklist**:
- [ ] Seção adicionada ao `CLAUDE.md`
- [ ] Links corretos
- [ ] Exemplos funcionais

---

### 5.2 Criar README da Automação (15min)

**Arquivo**: `docs/AUTOMACAO-FALTAS-README.md` (NOVO)

```markdown
# 🤖 Automação de Alertas de Faltas - Guia Rápido

## 🎯 O que faz?

Envia automaticamente mensagens WhatsApp para responsáveis de estudantes que acumularam múltiplos de faltas (3, 6, 9...) no mês atual.

## ⏰ Quando executa?

- **Automático**: Todos os dias úteis (Segunda a Sexta) às 9h AM (horário de São Paulo)
- **Manual**: Via GitHub Actions ou API direta

## 🔄 Fluxo

1. Busca estudantes com múltiplos de 3 faltas no mês atual
2. Para cada estudante:
   - Se **TEM contatos verificados**:
     - Verifica se já enviou mensagem (histórico)
     - Se NÃO enviou: Tenta enviar WhatsApp (até 3x)
       - Sucesso → Cria task FECHADA
       - Falha → Cria task ABERTA
   - Se **NÃO TEM contatos**:
     - Cria task ABERTA
3. Envia relatório para admin (sempre)

## 🚀 Uso

### Executar Teste (Dry-Run)

GitHub Actions:
1. https://github.com/seu-repo/actions
2. "Daily Absence Alerts Automation" → Run workflow
3. Dry-run: **true**
4. Multiple: **3**

Ou via API:
```bash
curl -X GET \
  "https://seu-app.vercel.app/api/automation/process-absences?dryRun=true&multiple=3" \
  -H "Authorization: Basic $(echo -n 'user:pass' | base64)"
```

### Executar Produção

Igual ao teste, mas `dryRun=false`

## 📊 Monitoramento

### Ver Tasks Criadas
- Acessar: https://seu-app.vercel.app/painel-tarefas
- Filtrar por `created_by: "AUTOMAÇÃO"`

### Ver Histórico de Envios
Firebase Console → Firestore → `whatsappMessageHistory`

### Ver Logs de Execução
- GitHub: https://github.com/seu-repo/actions
- Vercel: https://vercel.com/dashboard/logs

## ⚠️ Importante

- ✅ Mensagens são enviadas APENAS 1x por combinação (ano+mês+faltas+estudante+contato)
- ✅ Retry automático: 3 tentativas com delay de 5s
- ✅ Relatório sempre enviado para admin (5511988384664)
- ❌ Estudantes inativos NÃO são processados
- ❌ Contatos sem WhatsApp verificado NÃO recebem mensagem

## 🐛 Troubleshooting

### Mensagem não enviada
1. Verificar contato tem WhatsApp verificado
2. Verificar `podeReceberWhatsapp: true`
3. Verificar histórico (pode já ter sido enviado)
4. Verificar logs do Vercel

### Task duplicada
1. Verificar índice composto no Firestore
2. Verificar logs (pode ser legítimo se quantidade de faltas mudou)

### Workflow não executou
1. Verificar horário (9h AM = 12h UTC)
2. Verificar é dia útil (Segunda a Sexta)
3. Verificar GitHub Actions habilitado

## 📖 Documentação Completa

Ver: `docs/AUTOMACAO-FALTAS-PLANO-DETALHADO.md`
```

**Checklist**:
- [ ] Arquivo criado
- [ ] Links corretos
- [ ] Exemplos funcionais

---

## ✅ FIM DA FASE 5

### Checklist Fase 5
- [ ] `CLAUDE.md` atualizado
- [ ] `docs/AUTOMACAO-FALTAS-README.md` criado
- [ ] Documentação revisada
- [ ] Links testados

---

## 🎉 CHECKLIST FINAL

### Infraestrutura
- [ ] Tipos TypeScript adicionados
- [ ] Utils criado (`messageTemplates.ts`)
- [ ] Services criados (3 arquivos)
- [ ] Índice composto Firestore criado
- [ ] Variáveis de ambiente configuradas

### API
- [ ] Route criada (`/api/automation/process-absences`)
- [ ] Autenticação funcionando
- [ ] Dry-run mode funcionando
- [ ] Retry logic funcionando
- [ ] Tasks sendo criadas
- [ ] Histórico sendo salvo

### GitHub Actions
- [ ] Workflow criado
- [ ] Secrets configurados
- [ ] Cron correto (9h AM BRT = 12h UTC)
- [ ] Execução manual funciona
- [ ] Logs disponíveis

### Testes
- [ ] Dry-run validado
- [ ] Produção validada (1 estudante)
- [ ] Retry validado
- [ ] Estudante sem contato validado
- [ ] Idempotência validada
- [ ] Fluxo agendado validado

### Documentação
- [ ] `CLAUDE.md` atualizado
- [ ] `README` criado
- [ ] Este plano salvo em `docs/`

### Firestore
- [ ] Coleção `whatsappMessageHistory` existe
- [ ] Índice composto ativo
- [ ] Histórico sendo populado

### Notificações
- [ ] Relatório de sucesso recebido
- [ ] Relatório de erro recebido (teste)
- [ ] Telefone admin correto (5511988384664)

---

## 📊 MÉTRICAS DE SUCESSO

Após 1 semana de produção:

- [ ] 100% das execuções agendadas ocorreram
- [ ] 0 mensagens duplicadas
- [ ] 0 tasks duplicadas
- [ ] < 5% de falhas no envio (após retry)
- [ ] Relatório diário recebido no WhatsApp admin
- [ ] Tasks visíveis em `/painel-tarefas`

---

## 🔧 MANUTENÇÃO

### Alterar Horário de Execução
Editar `.github/workflows/daily-absence-automation.yml`:
```yaml
# 9h AM BRT = 12h UTC
- cron: '0 12 * * 1-5'

# 10h AM BRT = 13h UTC
- cron: '0 13 * * 1-5'
```

### Alterar Múltiplo de Faltas
Workflow manual ou alterar default:
```yaml
workflow_dispatch:
  inputs:
    multiple:
      default: '6' # Era 3
```

### Adicionar Feriados
Editar cron para excluir datas específicas ou criar lógica na API para verificar feriados.

---

## 📞 SUPORTE

- **Desenvolvedor**: [Seu Nome]
- **Documentação**: `docs/AUTOMACAO-FALTAS-*`
- **Issues**: GitHub Issues
- **Logs**: Vercel Dashboard

---

**Fim do Plano Detalhado** 🎉