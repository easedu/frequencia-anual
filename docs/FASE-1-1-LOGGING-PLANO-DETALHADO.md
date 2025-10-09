# 📋 PLANO DETALHADO - Fase 1.1: Logging Consistente

> **Duração Estimada**: 4-6 horas
> **Prioridade**: ⭐⭐⭐ CRÍTICA (base para todo resto)
> **Complexidade**: Baixa-Média

---

## 🎯 OBJETIVOS

1. Melhorar logger existente (`src/utils/logger.ts`)
2. Substituir todos os `console.*` por logger centralizado (34 arquivos)
3. Adicionar helpers específicos do domínio
4. Documentar padrões de logging
5. Preparar para monitoramento futuro (Sentry, etc)

---

## 🔍 ANÁLISE DO ESTADO ATUAL

### ✅ Pontos Fortes

O `src/utils/logger.ts` já tem:
- Classe Logger com níveis (debug, info, warn, error)
- Formatação estruturada
- Helpers específicos (firebaseError, userAction, performanceLog)
- Hook usePerformanceLogger
- Preparado para sendToMonitoringService

### ⚠️ Problemas Identificados

1. **34 arquivos com console.*** espalhados:
   ```
   src/app/cadastrar-estudante/page.tsx
   src/app/perfil-estudante/page.tsx
   src/components/StudentForm.tsx
   src/services/whatsappDataService.ts
   src/app/api/whatsapp/send/route.ts
   ... +29 arquivos
   ```

2. **Logger silencia debug/info em dev** (linha 34-45):
   ```typescript
   // PROBLEMA: Dificulta debugging!
   if (this.isDevelopment) {
     // debug e info são silenciados
   }
   ```

3. **Falta controle via env var**:
   - Não consegue ligar/desligar logs sem mudar código

4. **Falta helpers do domínio**:
   - studentOperation()
   - absenceOperation()
   - whatsappOperation()
   - taskOperation()

---

## 📝 PLANO DE IMPLEMENTAÇÃO

### **Etapa 1: Melhorar Logger** (2-3h)

#### 1.1 Adicionar Variável de Ambiente

**Arquivo**: `.env.local`

```bash
# Adicionar no final do arquivo
# Logging Configuration
NEXT_PUBLIC_LOG_LEVEL=debug  # debug | info | warn | error
NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=true  # true | false
```

**Arquivo**: `.env.example` (criar se não existir)

```bash
# Firebase (copiar do .env.local)
NEXT_PUBLIC_FIREBASE_API_KEY=your_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Logging
NEXT_PUBLIC_LOG_LEVEL=info
NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=false
```

---

#### 1.2 Melhorar `src/utils/logger.ts`

**Mudanças**:

```typescript
/**
 * Sistema de logging centralizado e seguro
 * Substitui console.* calls com logging estruturado
 *
 * Environment Variables:
 * - NEXT_PUBLIC_LOG_LEVEL: Nível mínimo de log (debug|info|warn|error)
 * - NEXT_PUBLIC_ENABLE_CONSOLE_LOGS: Habilita logs no console (true|false)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logLevel: LogLevel;
  private enableConsoleLogs: boolean;

  constructor() {
    // Ler nível de log do env (padrão: info)
    this.logLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'info';

    // Habilitar console logs (padrão: true em dev, false em prod)
    this.enableConsoleLogs =
      process.env.NEXT_PUBLIC_ENABLE_CONSOLE_LOGS === 'true'
      || this.isDevelopment;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context } = entry;
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    // Verificar se deve logar este nível
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    const formattedMessage = this.formatMessage(entry);

    // Console logs (se habilitado)
    if (this.enableConsoleLogs) {
      switch (level) {
        case 'debug':
          console.log(`🔍 ${formattedMessage}`, context || '');
          break;
        case 'info':
          console.info(`ℹ️  ${formattedMessage}`, context || '');
          break;
        case 'warn':
          console.warn(`⚠️  ${formattedMessage}`, context || '', error || '');
          break;
        case 'error':
          console.error(`❌ ${formattedMessage}`, context || '', error || '');
          break;
      }
    }

    // Em produção, enviar erros para serviço de monitoramento
    if (!this.isDevelopment && level === 'error') {
      this.sendToMonitoringService(entry);
    }

    // Salvar em localStorage (últimos 100 logs)
    if (typeof window !== 'undefined') {
      this.saveToLocalStorage(entry);
    }
  }

  private sendToMonitoringService(entry: LogEntry) {
    // Implementar integração com Sentry, LogRocket, etc.
    // Por enquanto, apenas salvar localmente
    try {
      if (typeof window !== 'undefined') {
        const errorLogs = JSON.parse(localStorage.getItem('app-error-logs') || '[]');
        errorLogs.push(entry);
        // Manter apenas os últimos 50 erros
        if (errorLogs.length > 50) {
          errorLogs.splice(0, errorLogs.length - 50);
        }
        localStorage.setItem('app-error-logs', JSON.stringify(errorLogs));
      }
    } catch (err) {
      // Falha silenciosa
    }
  }

  private saveToLocalStorage(entry: LogEntry) {
    try {
      const logs = JSON.parse(localStorage.getItem('app-logs') || '[]');
      logs.push(entry);
      // Manter apenas os últimos 100 logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      localStorage.setItem('app-logs', JSON.stringify(logs));
    } catch (err) {
      // Falha silenciosa em caso de problemas com localStorage
    }
  }

  // Métodos públicos
  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>, error?: Error) {
    this.log('warn', message, context, error);
  }

  error(message: string, context?: Record<string, any>, error?: Error) {
    this.log('error', message, context, error);
  }

  // Helpers específicos do domínio

  firebaseError(operation: string, error: Error, context?: Record<string, any>) {
    this.error(
      `Firebase operation failed: ${operation}`,
      { ...context, operation },
      error
    );
  }

  userAction(action: string, userId?: string, context?: Record<string, any>) {
    this.info(
      `User action: ${action}`,
      { ...context, action, userId }
    );
  }

  performanceLog(operation: string, duration: number, context?: Record<string, any>) {
    const level = duration > 2000 ? 'warn' : 'info';
    this[level](
      `Performance: ${operation} took ${duration}ms`,
      { ...context, operation, duration }
    );
  }

  // NOVOS helpers específicos do domínio

  studentOperation(
    operation: 'create' | 'update' | 'delete' | 'read',
    studentId: string,
    studentName?: string,
    context?: Record<string, any>
  ) {
    this.info(
      `Student ${operation}: ${studentName || studentId}`,
      { ...context, operation, studentId, studentName }
    );
  }

  absenceOperation(
    operation: 'register' | 'justify' | 'delete',
    studentId: string,
    date: string,
    context?: Record<string, any>
  ) {
    this.info(
      `Absence ${operation}: ${studentId} on ${date}`,
      { ...context, operation, studentId, date }
    );
  }

  whatsappOperation(
    operation: 'send' | 'verify' | 'error',
    phone: string,
    status: 'success' | 'failed',
    context?: Record<string, any>
  ) {
    const level = status === 'success' ? 'info' : 'error';
    this[level](
      `WhatsApp ${operation}: ${phone} - ${status}`,
      { ...context, operation, phone, status }
    );
  }

  taskOperation(
    operation: 'create' | 'update' | 'complete' | 'delete',
    taskId: string,
    taskTitle?: string,
    context?: Record<string, any>
  ) {
    this.info(
      `Task ${operation}: ${taskTitle || taskId}`,
      { ...context, operation, taskId, taskTitle }
    );
  }

  interactionOperation(
    operation: 'create' | 'update' | 'delete',
    studentId: string,
    type: string,
    context?: Record<string, any>
  ) {
    this.info(
      `Interaction ${operation}: ${type} for ${studentId}`,
      { ...context, operation, studentId, type }
    );
  }

  // Helper para operações de export
  exportOperation(
    format: 'excel' | 'pdf' | 'csv',
    recordCount: number,
    duration: number,
    context?: Record<string, any>
  ) {
    this.info(
      `Export ${format}: ${recordCount} records in ${duration}ms`,
      { ...context, format, recordCount, duration }
    );
  }

  // Helper para queries lentas
  slowQuery(
    collection: string,
    duration: number,
    filters?: Record<string, any>
  ) {
    this.warn(
      `Slow Firestore query: ${collection} took ${duration}ms`,
      { collection, duration, filters }
    );
  }
}

export const logger = new Logger();

// Hook para medir performance de operações
export const usePerformanceLogger = () => {
  const measureOperation = async <T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> => {
    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      logger.performanceLog(operation, duration, context);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error(
        `Operation failed: ${operation}`,
        { ...context, operation, duration },
        error as Error
      );
      throw error;
    }
  };

  return { measureOperation };
};

// Helper para criar timers
export const createTimer = (operation: string) => {
  const startTime = performance.now();

  return {
    end: (context?: Record<string, any>) => {
      const duration = performance.now() - startTime;
      logger.performanceLog(operation, duration, context);
      return duration;
    },
    endWithError: (error: Error, context?: Record<string, any>) => {
      const duration = performance.now() - startTime;
      logger.error(
        `Operation failed: ${operation}`,
        { ...context, operation, duration },
        error
      );
      return duration;
    }
  };
};
```

---

### **Etapa 2: Criar Script de Migration** (1h)

**Arquivo**: `scripts/migrate-console-to-logger.sh`

```bash
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
```

Tornar executável:
```bash
chmod +x scripts/migrate-console-to-logger.sh
```

---

### **Etapa 3: Substituir console.* em Arquivos Críticos** (2-3h)

**Prioridade de arquivos** (fazer nesta ordem):

#### 3.1 **Services** (30-45 min)
```
✅ src/services/studentDataService.ts (JÁ USA logger)
🔴 src/services/whatsappDataService.ts
🔴 src/services/taskService.ts
🔴 src/services/whatsappService.ts (se existir)
```

**Exemplo de migração**:

```typescript
// ANTES (whatsappDataService.ts)
try {
  const result = await sendWhatsApp(phone, message);
  console.log('WhatsApp enviado:', result);
} catch (error) {
  console.error('Erro ao enviar WhatsApp:', error);
}

// DEPOIS
import { logger } from '@/utils/logger';

try {
  const result = await sendWhatsApp(phone, message);
  logger.whatsappOperation('send', phone, 'success', { result });
} catch (error) {
  logger.whatsappOperation('send', phone, 'failed', { error });
  logger.firebaseError('sendWhatsApp', error as Error, { phone });
}
```

---

#### 3.2 **Pages** (30-45 min)
```
🔴 src/app/cadastrar-estudante/page.tsx
🔴 src/app/perfil-estudante/page.tsx
🔴 src/app/controlar-faltas/page.tsx
🔴 src/app/home/page.tsx
```

**Exemplo**:

```typescript
// ANTES (cadastrar-estudante/page.tsx)
const handleSubmit = async (data: Student) => {
  try {
    console.log('Salvando estudante:', data);
    await StudentDataService.addStudent(data);
    console.log('Estudante salvo com sucesso');
  } catch (error) {
    console.error('Erro ao salvar:', error);
  }
};

// DEPOIS
import { logger } from '@/utils/logger';

const handleSubmit = async (data: Student) => {
  try {
    logger.debug('Iniciando salvamento de estudante', { nome: data.nome });
    await StudentDataService.addStudent(data);
    logger.studentOperation('create', data.estudanteId, data.nome);
  } catch (error) {
    logger.error('Erro ao salvar estudante', { nome: data.nome }, error as Error);
  }
};
```

---

#### 3.3 **Components** (30-45 min)
```
🔴 src/components/StudentForm.tsx
🔴 src/components/WhatsAppModal.tsx
🔴 src/components/TaskManager.tsx
```

---

#### 3.4 **API Routes** (30-45 min)
```
🔴 src/app/api/whatsapp/send/route.ts
🔴 src/app/api/whatsapp/verify/route.ts
🔴 src/app/api/tasks/create/route.ts
🔴 src/app/api/students/absence-multiples/route.ts
```

**Exemplo**:

```typescript
// ANTES (api/whatsapp/send/route.ts)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Request body:', body);

    const result = await sendWhatsApp(body.phone, body.message);
    console.log('WhatsApp enviado:', result);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro ao enviar' }, { status: 500 });
  }
}

// DEPOIS
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  const timer = createTimer('api_whatsapp_send');

  try {
    const body = await request.json();
    logger.debug('WhatsApp API request', { phone: body.phone });

    const result = await sendWhatsApp(body.phone, body.message);
    logger.whatsappOperation('send', body.phone, 'success', { result });

    timer.end({ success: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.whatsappOperation('send', body.phone || 'unknown', 'failed');
    timer.endWithError(error as Error);
    return NextResponse.json({ error: 'Erro ao enviar' }, { status: 500 });
  }
}
```

---

### **Etapa 4: Documentar Padrões** (30 min)

**Arquivo**: `docs/LOGGING-GUIDELINES.md`

```markdown
# 📋 Guia de Logging - Projeto Frequência Anual

## Quando Usar Cada Nível

### debug
Informações de debugging detalhadas, úteis apenas em desenvolvimento:
```typescript
logger.debug('Valor da variável', { value });
logger.debug('Entrando na função calculateRisk', { studentId });
```

### info
Informações importantes do fluxo normal:
```typescript
logger.info('Estudante cadastrado com sucesso');
logger.studentOperation('create', studentId, studentName);
logger.userAction('login', userId);
```

### warn
Situações anormais mas recuperáveis:
```typescript
logger.warn('Query lenta detectada', { duration: 3500, collection: 'students' });
logger.warn('Campo opcional faltando', { field: 'email' });
logger.slowQuery('students', 3500, { turma: '5A' });
```

### error
Erros que impedem operação:
```typescript
logger.error('Falha ao salvar estudante', { studentId }, error);
logger.firebaseError('addStudent', error, { studentId });
```

## Helpers do Domínio

### studentOperation
```typescript
logger.studentOperation('create', studentId, studentName);
logger.studentOperation('update', studentId, studentName, { turma: '5A' });
logger.studentOperation('delete', studentId);
```

### absenceOperation
```typescript
logger.absenceOperation('register', studentId, '15012025');
logger.absenceOperation('justify', studentId, '15012025', { atestadoId });
```

### whatsappOperation
```typescript
logger.whatsappOperation('send', phone, 'success', { messageId });
logger.whatsappOperation('send', phone, 'failed', { error });
```

### taskOperation
```typescript
logger.taskOperation('create', taskId, taskTitle);
logger.taskOperation('complete', taskId, taskTitle, { completedBy: userId });
```

### Performance Logging

**Com hook**:
```typescript
const { measureOperation } = usePerformanceLogger();

const students = await measureOperation(
  'fetchStudents',
  () => StudentDataService.getStudents(),
  { filters }
);
```

**Com timer**:
```typescript
const timer = createTimer('calculateRiskScores');
const scores = calculateRiskScores(students);
timer.end({ studentCount: students.length });
```

## Boas Práticas

✅ **Sempre inclua contexto**:
```typescript
logger.info('Operação concluída', { userId, operation: 'export', format: 'excel' });
```

✅ **Sanitize dados sensíveis**:
```typescript
// ❌ NÃO
logger.debug('Senha digitada', { password });

// ✅ SIM
logger.debug('Tentativa de login', { email: user.email });
```

✅ **Use helpers específicos do domínio**:
```typescript
// ❌ Genérico
logger.info('Estudante criado');

// ✅ Específico
logger.studentOperation('create', studentId, studentName);
```

## Configuração

### Variáveis de Ambiente

```bash
# .env.local
NEXT_PUBLIC_LOG_LEVEL=debug  # debug|info|warn|error
NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=true
```

### Em Produção

```bash
# .env.production
NEXT_PUBLIC_LOG_LEVEL=warn
NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=false
```

## Ver Logs

### No Browser (Development)
Console do navegador mostra todos os logs com emojis:
- 🔍 debug
- ℹ️  info
- ⚠️  warn
- ❌ error

### No localStorage
```javascript
// No console do browser
const logs = JSON.parse(localStorage.getItem('app-logs'));
console.table(logs);

// Apenas erros
const errors = JSON.parse(localStorage.getItem('app-error-logs'));
console.table(errors);
```

## Integração Futura com Sentry

O logger já está preparado. Quando contratar Sentry:

```typescript
// Em src/utils/logger.ts - método sendToMonitoringService
import * as Sentry from '@sentry/nextjs';

private sendToMonitoringService(entry: LogEntry) {
  Sentry.captureException(entry.error, {
    level: entry.level,
    extra: entry.context,
  });
}
```
```

---

### **Etapa 5: Testar** (30 min)

#### 5.1 Testar em Development

```bash
# 1. Adicionar variáveis em .env.local
NEXT_PUBLIC_LOG_LEVEL=debug
NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=true

# 2. Reiniciar servidor
npm run dev

# 3. Navegar pelo app e verificar logs no console
# Deve ver emojis: 🔍 ℹ️ ⚠️ ❌

# 4. Verificar localStorage
# No console do browser:
localStorage.getItem('app-logs')
```

#### 5.2 Testar em Production (simulado)

```bash
# 1. Build de produção
NEXT_PUBLIC_LOG_LEVEL=warn \
NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=false \
npm run build

# 2. Iniciar
npm start

# 3. Verificar que console está limpo
# (apenas warns e errors devem aparecer)
```

#### 5.3 Checklist de Testes

- [ ] Logs aparecem no console em dev com emojis
- [ ] Logs debug só aparecem se LOG_LEVEL=debug
- [ ] Logs são salvos no localStorage
- [ ] Performance logs mostram duração correta
- [ ] Helpers do domínio funcionam (studentOperation, etc)
- [ ] Em produção, console está limpo (apenas warn/error)
- [ ] Erros incluem stack trace

---

## 📊 RESUMO DE ARQUIVOS MODIFICADOS

### Arquivos Novos (3)
1. `scripts/migrate-console-to-logger.sh` (helper de migration)
2. `docs/LOGGING-GUIDELINES.md` (documentação)
3. `.env.example` (exemplo de env vars)

### Arquivos Modificados (36+)

#### Críticos (fazer primeiro)
1. ✅ `src/utils/logger.ts` (melhorias)
2. 🔴 `.env.local` (adicionar LOG_LEVEL e ENABLE_CONSOLE_LOGS)
3. 🔴 `src/services/whatsappDataService.ts`
4. 🔴 `src/services/taskService.ts`
5. 🔴 `src/app/cadastrar-estudante/page.tsx`
6. 🔴 `src/app/controlar-faltas/page.tsx`
7. 🔴 `src/app/api/whatsapp/send/route.ts`
8. 🔴 `src/components/StudentForm.tsx`

#### Secundários (fazer depois)
9-42. Outros 34 arquivos com console.*

---

## ⏱️ ESTIMATIVA DETALHADA

| Etapa | Descrição | Tempo |
|-------|-----------|-------|
| 1 | Melhorar logger.ts | 1-1.5h |
| 2 | Criar script de migration | 0.5h |
| 3.1 | Migrar services (4 arquivos) | 0.5-1h |
| 3.2 | Migrar pages (4 arquivos) | 0.5-1h |
| 3.3 | Migrar components (3 arquivos) | 0.5h |
| 3.4 | Migrar API routes (4 arquivos) | 0.5-1h |
| 4 | Documentar padrões | 0.5h |
| 5 | Testar | 0.5h |
| **TOTAL** | | **4.5-6.5h** |

---

## 🎯 CRITÉRIOS DE SUCESSO

### ✅ Deve Funcionar

- [ ] Logger melhorado com env vars
- [ ] Helpers do domínio funcionando
- [ ] Console limpo em produção
- [ ] Logs no localStorage
- [ ] Performance logging funcionando
- [ ] Todos os services usando logger
- [ ] Todas as pages principais usando logger
- [ ] Todas as API routes usando logger
- [ ] Documentação completa em LOGGING-GUIDELINES.md

### ✅ Testes Passam

```bash
npm run type-check  # Sem erros TypeScript
npm run lint        # Sem warnings
npm run build       # Build com sucesso
```

---

## 📚 PRÓXIMOS PASSOS

Após concluir Fase 1.1, seguir para:
- **Fase 1.2**: Centralizar Schemas Zod
- **Fase 1.3**: Error Boundaries

---

## 💡 DICAS DE IMPLEMENTAÇÃO

1. **Trabalhe em branch**:
   ```bash
   git checkout -b feat/fase1-1-logging
   ```

2. **Commits incrementais**:
   ```bash
   git commit -m "feat(logging): melhorar logger com env vars"
   git commit -m "feat(logging): adicionar helpers do domínio"
   git commit -m "refactor(services): substituir console por logger"
   ```

3. **Teste continuamente**:
   - Após cada arquivo modificado, teste no browser
   - Verifique console e localStorage

4. **Não precisa fazer todos os 34 arquivos de uma vez**:
   - Foque nos críticos primeiro (services, pages, APIs)
   - Deixe componentes secundários para depois

5. **Use Search & Replace do VSCode**:
   - Cmd+Shift+F (Mac) ou Ctrl+Shift+H (Windows)
   - Buscar: `console\.log\(`
   - Mas revise caso a caso (contexto importa!)

---

**Quer começar? Responda "sim" e eu crio o código atualizado do logger.ts para você!**