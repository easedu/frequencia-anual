# 📋 Guia de Logging - Projeto Frequência Anual

> **Criado em**: 2025-10-09
> **Versão**: 1.0
> **Autor**: Claude Code + Time de Desenvolvimento

---

## 📖 Índice

1. [Quando Usar Cada Nível](#quando-usar-cada-nível)
2. [Helpers do Domínio](#helpers-do-domínio)
3. [Performance Logging](#performance-logging)
4. [Boas Práticas](#boas-práticas)
5. [Configuração](#configuração)
6. [Ver Logs](#ver-logs)
7. [Integração Futura](#integração-futura-com-sentry)

---

## Quando Usar Cada Nível

### 🔍 debug
**Uso**: Informações de debugging detalhadas, úteis apenas em desenvolvimento

**Exemplos**:
```typescript
logger.debug('Valor da variável', { value });
logger.debug('Entrando na função calculateRisk', { studentId });
logger.debug('Estado do formulário', { formData });
```

**Quando aparece**:
- ✅ Apenas se `NEXT_PUBLIC_LOG_LEVEL=debug`
- ✅ Console com emoji 🔍

---

### ℹ️  info
**Uso**: Informações importantes do fluxo normal da aplicação

**Exemplos**:
```typescript
logger.info('Estudante cadastrado com sucesso');
logger.info('Carregando lista de estudantes', { count: 150 });
logger.studentOperation('create', studentId, studentName);
logger.userAction('login', userId);
```

**Quando aparece**:
- ✅ Se `NEXT_PUBLIC_LOG_LEVEL=debug` ou `info`
- ✅ Console com emoji ℹ️

---

### ⚠️  warn
**Uso**: Situações anormais mas recuperáveis

**Exemplos**:
```typescript
logger.warn('Query lenta detectada', { duration: 3500, collection: 'students' });
logger.warn('Campo opcional faltando', { field: 'email' });
logger.slowQuery('students', 3500, { turma: '5A' });
logger.warn('Tentativa de login com email inválido', { email });
```

**Quando aparece**:
- ✅ Se `NEXT_PUBLIC_LOG_LEVEL=debug`, `info` ou `warn`
- ✅ Console com emoji ⚠️

---

### ❌ error
**Uso**: Erros que impedem uma operação

**Exemplos**:
```typescript
logger.error('Falha ao salvar estudante', { studentId }, error);
logger.firebaseError('addStudent', error, { studentId });
logger.error('Falha na autenticação', { email }, authError);
```

**Quando aparece**:
- ✅ Sempre (todos os níveis mostram errors)
- ✅ Console com emoji ❌
- ✅ Salvo em localStorage separado (`app-error-logs`)
- ✅ Em produção, enviado para monitoramento

---

## Helpers do Domínio

### studentOperation
**Uso**: Operações com estudantes

```typescript
logger.studentOperation(
  'create',      // operation: 'create' | 'update' | 'delete' | 'read'
  studentId,     // ID do estudante
  studentName,   // Nome (opcional)
  { turma: '5A' } // Contexto adicional (opcional)
);
```

**Exemplos**:
```typescript
// Criar
logger.studentOperation('create', newStudent.estudanteId, newStudent.nome);

// Atualizar
logger.studentOperation('update', student.estudanteId, student.nome, {
  changedFields: ['turma', 'turno']
});

// Deletar (soft-delete)
logger.studentOperation('delete', studentId, studentName, {
  reason: 'transferência'
});

// Ler
logger.studentOperation('read', studentId);
```

---

### absenceOperation
**Uso**: Registro e justificativa de faltas

```typescript
logger.absenceOperation(
  'register',    // operation: 'register' | 'justify' | 'delete'
  studentId,     // ID do estudante
  '15012025',    // Data (DDMMYYYY)
  { bimester: 1 } // Contexto (opcional)
);
```

**Exemplos**:
```typescript
// Registrar falta
logger.absenceOperation('register', studentId, date, {
  bimester: getCurrentBimester()
});

// Justificar com atestado
logger.absenceOperation('justify', studentId, date, {
  atestadoId: 'atst-123',
  reason: 'Atestado médico'
});

// Remover falta
logger.absenceOperation('delete', studentId, date, {
  reason: 'Registro duplicado'
});
```

---

### whatsappOperation
**Uso**: Envio e verificação de WhatsApp

```typescript
logger.whatsappOperation(
  'send',        // operation: 'send' | 'verify' | 'error'
  phone,         // Número de telefone
  'success',     // status: 'success' | 'failed'
  { messageId }  // Contexto (opcional)
);
```

**Exemplos**:
```typescript
// Envio bem-sucedido
logger.whatsappOperation('send', phone, 'success', {
  messageId: 'msg-xyz',
  message: message.substring(0, 50) // Preview
});

// Falha no envio
logger.whatsappOperation('send', phone, 'failed', {
  error: error.message,
  attempts: 3
});

// Verificação de número
logger.whatsappOperation('verify', phone, 'success', {
  isValid: true
});
```

---

### taskOperation
**Uso**: Gerenciamento de tarefas

```typescript
logger.taskOperation(
  'create',      // operation: 'create' | 'update' | 'complete' | 'delete'
  taskId,        // ID da tarefa
  taskTitle,     // Título (opcional)
  { assignedTo } // Contexto (opcional)
);
```

**Exemplos**:
```typescript
// Criar tarefa
logger.taskOperation('create', newTask.id, newTask.title, {
  assignedTo: userId,
  priority: 'high'
});

// Completar tarefa
logger.taskOperation('complete', task.id, task.title, {
  completedBy: userId,
  duration: completionTime
});
```

---

### interactionOperation
**Uso**: Registro de interações familiares

```typescript
logger.interactionOperation(
  'create',      // operation: 'create' | 'update' | 'delete'
  studentId,     // ID do estudante
  'telefonema',  // Tipo de interação
  { duration }   // Contexto (opcional)
);
```

**Exemplos**:
```typescript
// Registrar telefonema
logger.interactionOperation('create', studentId, 'telefonema', {
  duration: '15 min',
  outcome: 'Responsável comprometeu-se a acompanhar'
});

// Registrar visita domiciliar
logger.interactionOperation('create', studentId, 'visita_domiciliar', {
  participants: ['Coordenador', 'Professor'],
  findings: 'Situação familiar estável'
});
```

---

### exportOperation
**Uso**: Exportações de dados

```typescript
logger.exportOperation(
  'excel',       // format: 'excel' | 'pdf' | 'csv'
  recordCount,   // Número de registros exportados
  duration,      // Duração em ms
  { filters }    // Contexto (opcional)
);
```

**Exemplos**:
```typescript
const timer = createTimer('export-excel');
const records = await generateExcel(students);
const duration = timer.end();

logger.exportOperation('excel', students.length, duration, {
  filters: { turma: '5A', bimester: 1 }
});
```

---

### slowQuery
**Uso**: Detectar queries lentas do Firestore

```typescript
logger.slowQuery(
  collection,    // Nome da coleção
  duration,      // Duração em ms
  filters        // Filtros aplicados (opcional)
);
```

**Exemplos**:
```typescript
const startTime = performance.now();
const students = await getDocs(query(...));
const duration = performance.now() - startTime;

if (duration > 1000) {
  logger.slowQuery('students', duration, {
    turma: '5A',
    status: 'ATIVO'
  });
}
```

---

## Performance Logging

### Com Hook `usePerformanceLogger`

```typescript
import { usePerformanceLogger } from '@/utils/logger';

function MyComponent() {
  const { measureOperation } = usePerformanceLogger();

  const loadStudents = async () => {
    const students = await measureOperation(
      'fetchStudents',
      () => StudentDataService.getStudents(),
      { includeDeleted: false }
    );
    return students;
  };
}
```

**Vantagens**:
- ✅ Loga automaticamente duração
- ✅ Captura erros automaticamente
- ✅ Retorna resultado normalmente

---

### Com `createTimer`

```typescript
import { createTimer } from '@/utils/logger';

async function calculateRiskScores(students: Student[]) {
  const timer = createTimer('calculateRiskScores');

  try {
    const scores = students.map(s => calculateRisk(s));
    timer.end({ studentCount: students.length });
    return scores;
  } catch (error) {
    timer.endWithError(error as Error, { studentCount: students.length });
    throw error;
  }
}
```

**Vantagens**:
- ✅ Controle manual de início/fim
- ✅ Útil para operações síncronas
- ✅ Flexível para contextos variados

---

## Boas Práticas

### ✅ Sempre Inclua Contexto

```typescript
// ❌ RUIM - Sem contexto
logger.info('Operação concluída');

// ✅ BOM - Com contexto
logger.info('Operação concluída', {
  userId,
  operation: 'export',
  format: 'excel',
  recordCount: 150
});
```

---

### ✅ Sanitize Dados Sensíveis

```typescript
// ❌ NUNCA LOGAR DADOS SENSÍVEIS
logger.debug('Senha digitada', { password });
logger.debug('Token de acesso', { token });
logger.info('CPF do usuário', { cpf: '123.456.789-00' });

// ✅ LOGAR APENAS DADOS PÚBLICOS/IDENTIFICADORES
logger.debug('Tentativa de login', { email: user.email });
logger.info('Token gerado', { tokenId: 'tk-abc123', expiresIn: 3600 });
logger.debug('Dados do estudante', {
  estudanteId: student.estudanteId,
  nome: student.nome
});
```

---

### ✅ Use Helpers Específicos do Domínio

```typescript
// ❌ Genérico demais
logger.info('Estudante criado');
logger.info('Operação de estudante concluída');

// ✅ Específico e padronizado
logger.studentOperation('create', studentId, studentName);
logger.studentOperation('update', studentId, studentName, { turma: '5B' });
```

---

### ✅ Performance > 2000ms = Warning

```typescript
// O logger automaticamente marca como WARNING se > 2000ms
logger.performanceLog('loadDashboard', 2500); // ⚠️  Será WARN

// Mas você pode forçar manualmente:
if (duration > 1000) {
  logger.warn('Operação lenta', { operation: 'exportExcel', duration });
}
```

---

### ✅ Erros Sempre com Objeto Error

```typescript
// ❌ RUIM - String como erro
try {
  await saveData();
} catch (error) {
  logger.error('Erro ao salvar', { data }, 'algo deu errado');
}

// ✅ BOM - Passar o Error object
try {
  await saveData();
} catch (error) {
  logger.error('Erro ao salvar', { data }, error as Error);
  // ou usar helper:
  logger.firebaseError('saveData', error as Error, { data });
}
```

---

## Configuração

### Variáveis de Ambiente

**Arquivo**: `.env.local` (desenvolvimento)

```bash
# Nível mínimo de log (debug, info, warn, error)
NEXT_PUBLIC_LOG_LEVEL=debug

# Habilitar/desabilitar logs no console
NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=true
```

**Arquivo**: `.env.production` (produção)

```bash
# Em produção, apenas warnings e errors
NEXT_PUBLIC_LOG_LEVEL=warn

# Desabilitar console em produção
NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=false
```

---

### Níveis de Log - O que Aparece?

| Nível Configurado | debug | info | warn | error |
|-------------------|-------|------|------|-------|
| `debug` | ✅ | ✅ | ✅ | ✅ |
| `info` | ❌ | ✅ | ✅ | ✅ |
| `warn` | ❌ | ❌ | ✅ | ✅ |
| `error` | ❌ | ❌ | ❌ | ✅ |

---

## Ver Logs

### No Browser (Development)

Console do navegador mostra todos os logs com emojis:
- 🔍 `debug` - Azul claro
- ℹ️  `info` - Azul
- ⚠️  `warn` - Amarelo
- ❌ `error` - Vermelho

**Dica**: Use filtros do console para ver apenas um tipo:
```
Filtrar: 🔍  → Ver apenas debug
Filtrar: ❌  → Ver apenas errors
```

---

### No localStorage

#### Todos os logs (últimos 100)
```javascript
// No console do browser
const logs = JSON.parse(localStorage.getItem('app-logs') || '[]');
console.table(logs);

// Filtrar por nível
const errors = logs.filter(l => l.level === 'error');
console.table(errors);

// Ver log mais recente
console.log(logs[logs.length - 1]);
```

#### Apenas erros (últimos 50)
```javascript
const errors = JSON.parse(localStorage.getItem('app-error-logs') || '[]');
console.table(errors);

// Ver erro mais recente com stack trace
console.log(errors[errors.length - 1]);
```

---

### Limpar Logs

```javascript
// Limpar todos os logs
localStorage.removeItem('app-logs');

// Limpar apenas erros
localStorage.removeItem('app-error-logs');

// Limpar tudo do localStorage
localStorage.clear();
```

---

## Integração Futura com Sentry

O logger já está preparado para integração com Sentry. Quando contratar:

### 1. Instalar Sentry

```bash
npm install @sentry/nextjs
```

### 2. Configurar

```bash
npx @sentry/wizard@latest -i nextjs
```

### 3. Atualizar logger.ts

```typescript
// Em src/utils/logger.ts
import * as Sentry from '@sentry/nextjs';

private sendToMonitoringService(entry: LogEntry) {
  // Enviar para Sentry
  Sentry.captureException(entry.error, {
    level: entry.level as any,
    extra: entry.context,
    tags: {
      operation: entry.context?.operation,
      studentId: entry.context?.studentId,
    }
  });

  // Ainda salvar em localStorage também
  try {
    if (typeof window !== 'undefined') {
      const errorLogs = JSON.parse(localStorage.getItem('app-error-logs') || '[]');
      errorLogs.push(entry);
      if (errorLogs.length > 50) {
        errorLogs.splice(0, errorLogs.length - 50);
      }
      localStorage.setItem('app-error-logs', JSON.stringify(errorLogs));
    }
  } catch (err) {
    // Falha silenciosa
  }
}
```

### 4. Adicionar User Context

```typescript
// Em src/hooks/useAuth.ts ou após login
import * as Sentry from '@sentry/nextjs';

Sentry.setUser({
  id: user.uid,
  email: user.email,
});
```

---

## Exemplos Completos

### Exemplo 1: Cadastro de Estudante

```typescript
import { logger, createTimer } from '@/utils/logger';

async function handleSubmit(data: Student) {
  const timer = createTimer('createStudent');

  try {
    logger.debug('Iniciando cadastro de estudante', {
      nome: data.nome,
      turma: data.turma
    });

    // Validação
    if (!data.nome || !data.turma) {
      logger.warn('Dados obrigatórios faltando', {
        missingFields: {
          nome: !data.nome,
          turma: !data.turma
        }
      });
      return;
    }

    // Salvar
    await StudentDataService.addStudent(data);

    // Log de sucesso
    logger.studentOperation('create', data.estudanteId, data.nome, {
      turma: data.turma,
      turno: data.turno
    });

    timer.end({ success: true });
  } catch (error) {
    logger.firebaseError('addStudent', error as Error, {
      nome: data.nome,
      turma: data.turma
    });

    timer.endWithError(error as Error);
    throw error;
  }
}
```

---

### Exemplo 2: API Route com Logging

```typescript
// src/app/api/whatsapp/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logger, createTimer } from '@/utils/logger';

export async function POST(request: NextRequest) {
  const timer = createTimer('api_whatsapp_send');

  try {
    const body = await request.json();

    logger.debug('WhatsApp API request recebido', {
      phone: body.phone,
      messageLength: body.message?.length
    });

    // Validação
    if (!body.phone || !body.message) {
      logger.warn('Request inválido', {
        missingFields: {
          phone: !body.phone,
          message: !body.message
        }
      });

      timer.end({ success: false, reason: 'validation' });
      return NextResponse.json(
        { error: 'Dados obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Enviar WhatsApp
    const result = await sendWhatsApp(body.phone, body.message);

    logger.whatsappOperation('send', body.phone, 'success', {
      messageId: result.id,
      timestamp: result.timestamp
    });

    timer.end({ success: true });
    return NextResponse.json({ success: true, result });

  } catch (error) {
    logger.whatsappOperation('send', body?.phone || 'unknown', 'failed');
    logger.firebaseError('whatsappSend', error as Error, {
      phone: body?.phone
    });

    timer.endWithError(error as Error);
    return NextResponse.json(
      { error: 'Erro ao enviar WhatsApp' },
      { status: 500 }
    );
  }
}
```

---

### Exemplo 3: Hook com Performance Logging

```typescript
import { useState, useEffect } from 'react';
import { usePerformanceLogger } from '@/utils/logger';
import { logger } from '@/utils/logger';

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { measureOperation } = usePerformanceLogger();

  useEffect(() => {
    async function fetchStudents() {
      try {
        setLoading(true);

        logger.debug('Iniciando busca de estudantes');

        const data = await measureOperation(
          'fetchAllStudents',
          () => StudentDataService.getStudents(),
          { includeDeleted: false }
        );

        setStudents(data);
        logger.info('Estudantes carregados', { count: data.length });

      } catch (err) {
        logger.error('Erro ao carregar estudantes', {}, err as Error);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchStudents();
  }, [measureOperation]);

  return { students, loading, error };
}
```

---

## Checklist de Migration

Ao migrar arquivo de `console.*` para `logger`:

- [ ] Importar logger: `import { logger } from '@/utils/logger';`
- [ ] Substituir `console.log()` por `logger.debug()` ou `logger.info()`
- [ ] Substituir `console.info()` por `logger.info()`
- [ ] Substituir `console.warn()` por `logger.warn()`
- [ ] Substituir `console.error()` por `logger.error(, , error)`
- [ ] Adicionar contexto quando possível
- [ ] Usar helpers do domínio quando aplicável
- [ ] Testar no browser
- [ ] Verificar que logs aparecem corretamente

---

## Suporte

Dúvidas ou problemas com logging?

1. Consultar este documento
2. Ver exemplos em `src/services/studentDataService.ts`
3. Verificar env vars no `.env.local`
4. Limpar localStorage se logs parecem bugados
5. Reiniciar servidor dev

---

**Documento mantido por**: Time de Desenvolvimento
**Última atualização**: 2025-10-09