# ✅ OTIMIZAÇÃO SUPABASE - CHECKLIST DE IMPLEMENTAÇÃO

**Data:** 24/10/2025
**Tempo Total:** ~18 horas
**Fases:** 3 (Crítica, Alta, Média)

---

## 🎯 COMO USAR ESTE CHECKLIST

1. **Seguir ordem das fases** (Crítica → Alta → Média)
2. **Marcar ✅ cada item concluído**
3. **Validar** antes de prosseguir para próximo item
4. **Rollback** disponível para cada etapa

---

## 🔴 FASE 1: PRIORIDADE CRÍTICA (4 horas)

**Impacto:** -70% latência, -80% falhas
**Risco:** Baixo

### ✅ 1.1. Criar Índices PostgreSQL (30min)

#### Passo 1: Acessar Supabase Dashboard

- [ ] Abrir: https://supabase.com
- [ ] Navegar: Settings → Database → SQL Editor
- [ ] Criar nova query

#### Passo 2: Executar Script de Índices

```sql
-- 📊 ÍNDICES PARA OTIMIZAÇÃO
-- Tempo estimado de criação: 5-10 minutos

-- 1. student_absences - Queries por estudante e data
CREATE INDEX IF NOT EXISTS idx_student_absences_student_date 
ON student_absences (student_id, absence_date DESC);

-- 2. student_absences - Filtro por data e justificativa
CREATE INDEX IF NOT EXISTS idx_student_absences_date_justified 
ON student_absences (absence_date, is_justified);

-- 3. students - Filtro por status ativo
CREATE INDEX IF NOT EXISTS idx_students_active 
ON students (status, deleted) WHERE deleted = false;

-- 4. students - Busca por Firebase UUID
CREATE INDEX IF NOT EXISTS idx_students_student_id 
ON students (student_id) WHERE deleted = false;

-- 5. students - Queries combinadas (turma, turno, status)
CREATE INDEX IF NOT EXISTS idx_students_class_shift_status 
ON students (class, shift, status) WHERE deleted = false;

-- 6. student_contacts - WhatsApp habilitado
CREATE INDEX IF NOT EXISTS idx_student_contacts_whatsapp 
ON student_contacts (student_id, can_receive_whatsapp) 
WHERE can_receive_whatsapp = true;

-- 7. student_contacts - JSONB whatsapp_data
CREATE INDEX IF NOT EXISTS idx_student_contacts_whatsapp_verified 
ON student_contacts USING GIN (whatsapp_data) 
WHERE (whatsapp_data->>'verified')::boolean = true;

-- 8. student_suspensions - Período de suspensão
CREATE INDEX IF NOT EXISTS idx_student_suspensions_dates 
ON student_suspensions (student_id, start_date, end_date);
```

#### Passo 3: Validar Criação

```sql
-- Verificar índices criados
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename LIKE 'student%' 
AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Deve retornar 8+ índices
```

#### Passo 4: Testar Performance

```sql
-- Query ANTES dos índices (copiar tempo de execução)
EXPLAIN ANALYZE
SELECT * FROM student_absences 
WHERE student_id = 'some-uuid' 
AND absence_date >= '2025-10-01';

-- Query DEPOIS dos índices (deve ser 10-20x mais rápido)
-- Verificar se usa "Index Scan" (não "Seq Scan")
```

**Validação:**
- [ ] 8 índices criados
- [ ] Query usa "Index Scan"
- [ ] Tempo de execução reduzido em 80%+

---

### ✅ 1.2. Habilitar Connection Pooling (15min)

#### Passo 1: Configurar no Supabase Dashboard

- [ ] Supabase Dashboard → Settings → Database
- [ ] Seção "Connection Pooling"
- [ ] Habilitar "Transaction Mode"
- [ ] Configurar:
  - Max connections: **100**
  - Pool timeout: **30 segundos**

#### Passo 2: Atualizar supabaseAdmin.ts

Arquivo: `src/lib/supabaseAdmin.ts`

```typescript
// Adicionar após linha 52
_supabaseAdminInstance = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  // ✅ NOVO - Connection Pooling
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=30, max=100',
    },
  },
})
```

**Validação:**
- [ ] Pooling habilitado no dashboard
- [ ] Código atualizado
- [ ] Build passa: `npm run type-check`
- [ ] Testar API: `/api/students`

---

### ✅ 1.3. Implementar Timeout Adaptativo (30min)

#### Passo 1: Atualizar supabaseClient.ts

Arquivo: `src/lib/supabaseClient.ts`

Substituir função de timeout (linha 59-85) por:

```typescript
// ✅ TIMEOUT ADAPTATIVO
const getAdaptiveTimeout = (url: string) => {
  if (url.includes('/select')) {
    return 8000; // Queries simples: 8s
  } else if (url.includes('count') || url.includes('aggregate')) {
    return 15000; // Aggregations: 15s
  } else if (url.includes('rpc/')) {
    return 20000; // Stored procedures: 20s
  }
  return 10000; // Default: 10s
};

global: {
  fetch: async (url, options = {}) => {
    const controller = new AbortController();
    const timeout = getAdaptiveTimeout(url.toString());
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...(options.headers || {}),
          'Alt-Svc': 'clear',
          'apikey': supabaseAnonKey,
        }
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Supabase request timeout (${timeout}ms)`);
      }
      throw error;
    }
  }
}
```

**Validação:**
- [ ] Código atualizado
- [ ] Type-check: `npm run type-check`
- [ ] Testar timeout em query lenta
- [ ] Log mostra timeout correto

---

### ✅ 1.4. Implementar Retry Strategy (2h)

#### Passo 1: Criar utilitário de retry

Arquivo: `src/utils/retryStrategy.ts` (NOVO)

```typescript
/**
 * Retry strategy com exponential backoff
 * Para redes instáveis
 */

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: Error) => boolean;
}

export async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error) => {
      return error.name === 'AbortError' ||
             error.message.includes('network') ||
             error.message.includes('fetch') ||
             error.message.includes('timeout');
    }
  } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetcher();
    } catch (error) {
      const err = error as Error;
      const isLastRetry = attempt === maxRetries;
      const isRetryable = shouldRetry(err);

      if (isLastRetry || !isRetryable) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      
      console.warn(`[Retry ${attempt + 1}/${maxRetries}] ${err.message} - aguardando ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}

// Export conveniente
export const retryFetch = fetchWithRetry;
```

#### Passo 2: Integrar no supabaseClient.ts

```typescript
// Adicionar import no topo
import { fetchWithRetry } from '@/utils/retryStrategy';

// Atualizar global.fetch (linha 60-85)
global: {
  fetch: async (url, options = {}) => {
    return fetchWithRetry(
      async () => {
        const controller = new AbortController();
        const timeout = getAdaptiveTimeout(url.toString());
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
              ...(options.headers || {}),
              'Alt-Svc': 'clear',
              'apikey': supabaseAnonKey,
            }
          });
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      },
      {
        maxRetries: 3,
        baseDelay: 1000,
      }
    );
  }
}
```

**Validação:**
- [ ] Arquivo criado: `retryStrategy.ts`
- [ ] Import adicionado
- [ ] Type-check passa
- [ ] Testar com DevTools → Network → Offline
- [ ] Verificar 3 tentativas no console

---

## ✅ Validação Final da Fase 1

### Testes de Integração

```bash
# 1. Build
npm run type-check
npm run build

# 2. Testar API principal
curl http://localhost:3000/api/students?page=1&limit=10

# 3. Verificar performance
# - Tempo de resposta < 2s
# - Sem erros de timeout
# - Retry funciona (testar offline)
```

### Checklist de Validação

- [ ] **Índices:** 8 criados, queries usam Index Scan
- [ ] **Pooling:** Habilitado, conexões reutilizadas
- [ ] **Timeout:** Adaptativo funciona (8s/15s/20s)
- [ ] **Retry:** 3 tentativas em caso de falha

### Métricas Esperadas

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Latência média | 15s | 4s | -73% |
| Taxa de timeout | 40% | 10% | -75% |
| Taxa de sucesso | 60% | 90% | +50% |

---

## 🟡 FASE 2: ALTA PRIORIDADE (8 horas)

**Ver:** `OTIMIZACAO-FASE-2-ALTA-PRIORIDADE.md`

Resumo:
- [ ] 2.1. Criar Stored Procedure (4h)
- [ ] 2.2. Implementar Service Worker (4h)

---

## 🟢 FASE 3: MÉDIA PRIORIDADE (6 horas)

**Ver:** `OTIMIZACAO-FASE-3-MEDIA.md`

Resumo:
- [ ] 3.1. Views Materializadas (3h)
- [ ] 3.2. Performance Monitoring (3h)

---

## 🔄 ROLLBACK PROCEDURES

### Rollback Fase 1

#### 1.1. Remover Índices

```sql
-- Remover todos os índices criados
DROP INDEX IF EXISTS idx_student_absences_student_date;
DROP INDEX IF EXISTS idx_student_absences_date_justified;
DROP INDEX IF EXISTS idx_students_active;
DROP INDEX IF EXISTS idx_students_student_id;
DROP INDEX IF EXISTS idx_students_class_shift_status;
DROP INDEX IF EXISTS idx_student_contacts_whatsapp;
DROP INDEX IF EXISTS idx_student_contacts_whatsapp_verified;
DROP INDEX IF EXISTS idx_student_suspensions_dates;
```

#### 1.2. Desabilitar Pooling

- Supabase Dashboard → Connection Pooling → Desabilitar

#### 1.3. Reverter Código

```bash
# Reverter commits
git log --oneline -10
git revert <commit-hash>

# Ou restaurar do backup
git checkout main -- src/lib/supabaseClient.ts
git checkout main -- src/lib/supabaseAdmin.ts
```

---

## 📊 TRACKING DE PROGRESSO

### Dashboard de Métricas

Monitorar durante implementação:

| Fase | Status | Tempo | Impacto Real |
|------|--------|-------|--------------|
| 1.1 Índices | ⏸️ | - | - |
| 1.2 Pooling | ⏸️ | - | - |
| 1.3 Timeout | ⏸️ | - | - |
| 1.4 Retry | ⏸️ | - | - |

Legendas:
- ⏸️ Não iniciado
- 🔄 Em andamento
- ✅ Concluído
- ❌ Bloqueado

---

## 📞 SUPORTE

### Em caso de dúvidas:

1. **Fase 1 detalhada:** `OTIMIZACAO-FASE-1-CRITICA.md`
2. **Validação:** `OTIMIZACAO-VALIDACAO-E-TESTES.md`
3. **Análise técnica:** `OTIMIZACAO-SUPABASE-REDES-RUINS-GUIA-COMPLETO.md`

---

**Última atualização:** 24/10/2025
**Versão:** 1.0.0
**Status:** ✅ Pronto para Uso
