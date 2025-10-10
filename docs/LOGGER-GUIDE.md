# 📝 Guia: Sistema de Logger Centralizado

> **Criado em**: 2025-10-10
> **Status**: ✅ Implementado

## 🎯 Objetivo

Sistema de logging estruturado e centralizado que substitui `console.*` calls com:

- ✅ **Níveis de log** configuráveis (debug, info, warn, error)
- ✅ **Contexto estruturado** (JSON)
- ✅ **Helpers específicos** de domínio (student, absence, whatsapp, etc)
- ✅ **Performance tracking** integrado
- ✅ **Histórico local** (localStorage)
- ✅ **Preparado** para monitoring services (Sentry, LogRocket)

## 📦 Localização

```
src/utils/logger.ts
```

## 🔧 Como Usar

### Import

```typescript
import { logger } from '@/utils/logger';
```

### Logs Básicos

```typescript
// Debug (apenas em dev com LOG_LEVEL=debug)
logger.debug('Processando dados', { userId: '123', count: 10 });

// Info (informações gerais)
logger.info('Usuário fez login', { userId: '123', timestamp: Date.now() });

// Warning (algo inesperado mas não crítico)
logger.warn('Query lenta detectada', { duration: 3500, collection: 'estudantes' });

// Error (erros críticos)
logger.error('Falha ao salvar dados', { userId: '123' }, error);
```

### Logs Específicos de Domínio

#### Operações de Estudante

```typescript
// Criar estudante
logger.studentOperation('create', estudanteId, 'João Silva', {
  turma: '5A',
  ano: 2025
});

// Atualizar
logger.studentOperation('update', estudanteId, 'João Silva', {
  field: 'turma',
  oldValue: '5A',
  newValue: '5B'
});

// Deletar
logger.studentOperation('delete', estudanteId, 'João Silva');
```

#### Operações de Faltas

```typescript
// Registrar falta
logger.absenceOperation('register', estudanteId, '15/01/2025', {
  bimestre: 1,
  tipo: 'FALTA'
});

// Justificar falta
logger.absenceOperation('justify', estudanteId, '15/01/2025', {
  atestadoId: 'atestado-123'
});
```

#### Operações de WhatsApp

```typescript
// Envio bem-sucedido
logger.whatsappOperation('send', '11987654321', 'success', {
  messageId: 'msg-123',
  estudanteNome: 'João Silva'
});

// Erro no envio
logger.whatsappOperation('send', '11987654321', 'failed', {
  error: 'Número inválido',
  retryCount: 3
});
```

#### Operações de Tarefas

```typescript
// Criar tarefa
logger.taskOperation('create', taskId, 'Contatar responsável', {
  priority: 'ALTA',
  assignedTo: userId
});

// Completar tarefa
logger.taskOperation('complete', taskId, 'Contatar responsável', {
  duration: 3600000, // 1 hora
  resolution: 'Contato realizado com sucesso'
});
```

#### Operações de Interações

```typescript
logger.interactionOperation('create', estudanteId, 'Telefonema', {
  contatoNome: 'Maria Silva',
  duracao: 600 // 10 minutos
});
```

### Performance Tracking

#### Método 1: Hook (em componentes React)

```typescript
import { usePerformanceLogger } from '@/utils/logger';

function MyComponent() {
  const { measureOperation } = usePerformanceLogger();

  const handleSave = async () => {
    await measureOperation(
      'Salvar estudante',
      async () => {
        await saveStudent(data);
      },
      { studentId: data.id, turma: data.turma }
    );
  };

  return <button onClick={handleSave}>Salvar</button>;
}
```

#### Método 2: Timer Manual

```typescript
import { createTimer } from '@/utils/logger';

async function processLargeData() {
  const timer = createTimer('Processar dados');

  try {
    // Operação pesada
    const result = await heavyOperation();

    // Registrar sucesso
    timer.end({ recordCount: result.length });

    return result;
  } catch (error) {
    // Registrar erro
    timer.endWithError(error as Error, { step: 'heavyOperation' });
    throw error;
  }
}
```

#### Método 3: Logger direto

```typescript
logger.performanceLog('Carregar dashboard', 1234, {
  studentsCount: 700,
  chartsCount: 5
});
// Resultado: ℹ️ Performance: Carregar dashboard took 1234ms
```

### Helpers Especializados

#### Firebase Errors

```typescript
try {
  await getDoc(docRef);
} catch (error) {
  logger.firebaseError('getDoc', error as Error, {
    collection: 'estudantes',
    docId: estudanteId
  });
}
```

#### User Actions

```typescript
logger.userAction('Export Excel', userId, {
  format: 'xlsx',
  recordCount: 700,
  filters: { turma: '5A' }
});
```

#### Export Operations

```typescript
const startTime = performance.now();
const data = await exportToExcel(students);
const duration = performance.now() - startTime;

logger.exportOperation('excel', students.length, duration, {
  turmas: ['5A', '5B'],
  includeDeleted: false
});
```

#### Slow Queries

```typescript
const startTime = performance.now();
const students = await getDocs(query(...));
const duration = performance.now() - startTime;

if (duration > 1000) {
  logger.slowQuery('estudantes', duration, {
    filters: { turma: '5A', status: 'ATIVO' },
    resultCount: students.size
  });
}
```

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
# .env.local

# Nível mínimo de log (debug|info|warn|error)
# Padrão: info
NEXT_PUBLIC_LOG_LEVEL=debug

# Habilitar logs no console
# Padrão: true em dev, false em prod
NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=true
```

### Níveis de Log

| Nível | Quando usar | Exemplo |
|-------|-------------|---------|
| `debug` | Informações detalhadas de debug | "Variável X = 10", "Entrando na função Y" |
| `info` | Operações normais | "Usuário fez login", "Estudante criado" |
| `warn` | Algo inesperado mas não crítico | "Query lenta", "Contato sem WhatsApp" |
| `error` | Erros críticos | "Falha ao salvar", "API retornou 500" |

**Hierarquia**: Se `LOG_LEVEL=warn`, apenas `warn` e `error` são logados.

## 📊 Visualizar Logs

### Console do Browser

```typescript
// Logs aparecem automaticamente no console com emojis:
// 🔍 DEBUG
// ℹ️ INFO
// ⚠️ WARNING
// ❌ ERROR
```

### LocalStorage

```javascript
// Ver últimos 100 logs
JSON.parse(localStorage.getItem('app-logs'))

// Ver últimos 50 erros
JSON.parse(localStorage.getItem('app-error-logs'))
```

### Página de Logs (futura implementação)

```typescript
// src/app/admin/logs/page.tsx
export default function LogsPage() {
  const logs = JSON.parse(localStorage.getItem('app-logs') || '[]');

  return (
    <div>
      <h1>System Logs</h1>
      <table>
        {logs.map(log => (
          <tr key={log.timestamp}>
            <td>{log.level}</td>
            <td>{log.timestamp}</td>
            <td>{log.message}</td>
            <td>{JSON.stringify(log.context)}</td>
          </tr>
        ))}
      </table>
    </div>
  );
}
```

## 🚀 Integração com Monitoring Services

### Sentry (exemplo)

```typescript
// src/utils/logger.ts

import * as Sentry from '@sentry/nextjs';

private sendToMonitoringService(entry: LogEntry) {
  if (entry.error) {
    Sentry.captureException(entry.error, {
      level: entry.level,
      extra: entry.context,
      tags: {
        operation: entry.context?.operation
      }
    });
  } else {
    Sentry.captureMessage(entry.message, {
      level: entry.level,
      extra: entry.context
    });
  }
}
```

### LogRocket (exemplo)

```typescript
import LogRocket from 'logrocket';

private sendToMonitoringService(entry: LogEntry) {
  if (entry.level === 'error') {
    LogRocket.captureException(entry.error!, {
      extra: entry.context
    });
  }

  LogRocket.log(entry.level, entry.message, entry.context);
}
```

## ✅ Boas Práticas

### ✅ DO

```typescript
// Sempre use logger ao invés de console
logger.info('Operação concluída'); // ✅

// Adicione contexto relevante
logger.error('Falha ao salvar', { userId, estudanteId }, error); // ✅

// Use helpers específicos de domínio
logger.studentOperation('create', id, name); // ✅

// Track performance de operações pesadas
const timer = createTimer('Processar 1000 registros');
// ...
timer.end({ recordCount: 1000 }); // ✅
```

### ❌ DON'T

```typescript
// Não use console.log diretamente
console.log('Debug info'); // ❌

// Não logue dados sensíveis
logger.info('User logged in', { password: '123456' }); // ❌

// Não logue em loops
students.forEach(s => {
  logger.info('Processing', { studentId: s.id }); // ❌ 700 logs!
});

// Use batch logging
logger.info('Processing students', {
  total: students.length,
  ids: students.map(s => s.id).slice(0, 10) // primeiros 10
}); // ✅
```

## 🎯 Checklist de Uso

Ao implementar nova funcionalidade:

- [ ] Substituir `console.*` por `logger.*`
- [ ] Adicionar contexto relevante (IDs, counts, etc)
- [ ] Usar helper de domínio quando disponível
- [ ] Track performance de operações pesadas (> 500ms)
- [ ] Logar erros com contexto completo
- [ ] Não logar dados sensíveis (passwords, tokens)
- [ ] Usar nível apropriado (debug/info/warn/error)

## 📚 Referências

- **Arquivo**: `src/utils/logger.ts`
- **Exemplos de Uso**: Ver código existente em services/

## 🎓 Migração de Código Existente

### Buscar console.* calls

```bash
# Encontrar todos os console.log
grep -r "console\." src --include="*.ts" --include="*.tsx"

# Substituir por logger apropriado
```

### Antes:

```typescript
console.log('Creating student:', studentData);
// ...
console.error('Error:', error);
```

### Depois:

```typescript
logger.studentOperation('create', studentId, studentData.nome, {
  turma: studentData.turma
});
// ...
logger.firebaseError('createStudent', error as Error, {
  estudanteId: studentId
});
```

---

**Criado por**: Claude Code - Fase 1 de Melhorias
**Versão**: 1.0.0
