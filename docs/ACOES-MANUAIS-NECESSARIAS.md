# ⚠️ AÇÕES MANUAIS NECESSÁRIAS - Otimização Supabase

> **IMPORTANTE**: Este documento lista **TODAS as ações que VOCÊ precisa executar manualmente** para completar o deploy da otimização.

---

## 📋 RESUMO EXECUTIVO

✅ **O que JÁ está pronto** (código commitado):
- Código do backend (APIs, types, utils)
- Código do frontend (hooks, componentes)
- SQL migrations (arquivos `.sql` prontos)
- Documentação completa

⚠️ **O que VOCÊ precisa fazer MANUALMENTE**:
1. Executar SQL migrations no Supabase
2. Configurar secrets no GitHub (opcional, se usar Actions)
3. Migrar componentes frontend para React Query
4. Testar e validar

---

## 🎯 AÇÃO MANUAL #1: EXECUTAR SQL MIGRATIONS NO SUPABASE

### ⏱️ Tempo Estimado: 15-30 minutos

### Passo a Passo

#### 1. Acessar Supabase Dashboard

1. Abrir: https://supabase.com/dashboard
2. Login com sua conta
3. Selecionar projeto: **frequencia-anual** (ou nome do seu projeto)

#### 2. Abrir SQL Editor

- Menu lateral → **SQL Editor**
- Clicar em **"+ New query"**

#### 3. Executar Migration 1 - Materialized Views

**O QUE FAZER**:

1. **Abrir o arquivo localmente**:
   ```bash
   # No terminal do seu computador
   cat supabase/migrations/01_create_materialized_views.sql
   ```

2. **Copiar TODO o conteúdo do arquivo**
   - Selecionar tudo (Cmd+A / Ctrl+A)
   - Copiar (Cmd+C / Ctrl+C)

3. **Colar no SQL Editor do Supabase**
   - Colar no editor (Cmd+V / Ctrl+V)

4. **Executar**:
   - Clicar em **"RUN"** (botão verde, canto inferior direito)
   - Aguardar execução (2-5 minutos)

5. **Verificar Sucesso**:
   ```sql
   -- Copiar e executar esta query para verificar:
   SELECT * FROM get_mv_metadata();
   ```

   **Resultado Esperado**: Tabela com 5 linhas:
   ```
   view_name                         | row_count | total_size | last_refresh
   ----------------------------------|-----------|------------|-------------
   absences_with_student_info        | 1234      | 256 kB     | 2025-01-...
   interactions_with_student_info    | 567       | 128 kB     | 2025-01-...
   tasks_with_student_info          | 890       | 192 kB     | 2025-01-...
   certificates_with_student_info    | 123       | 64 kB      | 2025-01-...
   suspensions_with_student_info     | 45        | 32 kB      | 2025-01-...
   ```

**⚠️ Se der erro**:
- Ler mensagem de erro
- Comum: "permission denied" → Seu usuário não tem permissão para criar extensões
  - Solução: Contatar suporte do Supabase ou usar usuário admin
- Comum: "already exists" → Migration já foi executada antes
  - Solução: Pular para próxima migration

#### 4. Executar Migration 2 - pg_cron (Refresh Automático)

**O QUE FAZER**:

1. **Abrir arquivo**:
   ```bash
   cat supabase/migrations/02_configure_pg_cron.sql
   ```

2. **Copiar e colar no SQL Editor**

3. **Executar** (RUN)

4. **Verificar Sucesso**:
   ```sql
   -- Verificar job criado
   SELECT * FROM cron.job WHERE jobname = 'refresh-all-mvs';
   ```

   **Resultado Esperado**:
   ```
   jobid | schedule     | command                                     | active
   ------|--------------|---------------------------------------------|-------
   1     | */5 * * * *  | SELECT * FROM refresh_all_materialized...  | true
   ```

5. **Testar Refresh Manual**:
   ```sql
   SELECT * FROM refresh_all_materialized_views();
   ```

   **Resultado Esperado**: Tabela com duração de refresh de cada MV:
   ```
   view_name                      | refresh_time        | duration_ms
   -------------------------------|---------------------|------------
   absences_with_student_info     | 2025-01-09 10:30:00 | 234
   ...
   ```

**⚠️ Se der erro "extension pg_cron does not exist"**:

pg_cron pode não estar disponível no seu plano do Supabase.

**Solução Alternativa - GitHub Actions**:

1. **Pular Migration 2** (não executar pg_cron)

2. **Configurar GitHub Actions** (ver [Ação Manual #2](#-ação-manual-2-configurar-github-actions-alternativa-ao-pg_cron))

#### 5. Executar Migration 3 - Índices Compostos

**O QUE FAZER**:

1. **Abrir arquivo**:
   ```bash
   cat supabase/migrations/03_create_composite_indexes.sql
   ```

2. **Copiar e colar no SQL Editor**

3. **Executar** (RUN)

4. ⏱️ **AGUARDAR 5-30 minutos**
   - Criação de índices é demorada (depende do volume de dados)
   - NÃO fechar a página
   - Queries continuam funcionando normalmente durante criação

5. **Monitorar Progresso** (opcional):
   ```sql
   -- Executar em outra aba do SQL Editor
   SELECT
     relname AS table_name,
     phase,
     blocks_done,
     blocks_total,
     ROUND(100.0 * blocks_done / NULLIF(blocks_total, 0), 2) AS progress_pct
   FROM pg_stat_progress_create_index;
   ```

6. **Verificar Sucesso**:
   ```sql
   -- Listar índices criados
   SELECT
     tablename,
     indexname,
     pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
   FROM pg_indexes
   WHERE schemaname = 'public'
     AND indexname LIKE 'idx_%'
   ORDER BY tablename, indexname;
   ```

   **Resultado Esperado**: 20-30 índices criados

#### 6. Executar Migration 4 - Ferramentas de Análise

**O QUE FAZER**:

1. **Abrir arquivo**:
   ```bash
   cat supabase/migrations/04_query_analysis_tools.sql
   ```

2. **Copiar, colar e executar**

3. **Verificar Sucesso**:
   ```sql
   -- Testar função
   SELECT * FROM get_table_statistics();
   ```

   **Resultado Esperado**: Tabela com estatísticas de todas as tabelas

#### 7. Executar Migration 5 - Otimizações Finais

**O QUE FAZER**:

1. **Abrir arquivo**:
   ```bash
   cat supabase/migrations/05_phase4_final_optimizations.sql
   ```

2. **Copiar, colar e executar**

3. **Verificar Sucesso**:
   ```sql
   -- Testar views criadas
   SELECT * FROM student_statistics;
   SELECT * FROM absence_statistics;
   SELECT * FROM task_statistics;
   ```

   **Resultado Esperado**: Dados agregados instantâneos

#### 8. Otimizar Todas as Tabelas (ANALYZE)

**O QUE FAZER**:

```sql
-- Executar no SQL Editor
SELECT * FROM optimize_all_tables();
```

**Resultado Esperado**: Tabela com status de otimização de cada tabela

---

## 🔑 AÇÃO MANUAL #2: CONFIGURAR GITHUB ACTIONS (Alternativa ao pg_cron)

### ⏱️ Tempo Estimado: 5 minutos

### ⚠️ Necessário APENAS SE:
- pg_cron não funcionou (erro na Migration 2)
- Seu plano Supabase não suporta pg_cron

### Passo a Passo

#### 1. Obter Service Role Key do Supabase

1. **Supabase Dashboard** → Seu projeto
2. Menu lateral → **Settings** → **API**
3. Seção **"Project API keys"**
4. Copiar o valor de **"service_role"** (secret, NÃO expor publicamente)

#### 2. Obter Project URL

- Na mesma página (**Settings → API**)
- Copiar **"Project URL"**
- Exemplo: `https://xyzabc123.supabase.co`

#### 3. Configurar Secrets no GitHub

1. **Abrir repositório no GitHub**:
   - https://github.com/easedu/frequencia-anual

2. **Settings** → **Secrets and variables** → **Actions**

3. **Clicar em "New repository secret"**

4. **Criar secret #1**:
   - Name: `SUPABASE_URL`
   - Value: (colar Project URL copiado)
   - Clicar **"Add secret"**

5. **Criar secret #2**:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: (colar Service Role Key copiado)
   - Clicar **"Add secret"**

#### 4. Habilitar GitHub Actions

1. **Settings** → **Actions** → **General**
2. Seção **"Actions permissions"**
3. Selecionar: **"Allow all actions and reusable workflows"**
4. **Save**

#### 5. Testar Workflow

1. **GitHub** → Seu repositório → **Actions**
2. Menu lateral → **"Refresh Materialized Views"**
3. Clicar em **"Run workflow"** (botão direito)
4. Configurar:
   - Branch: `optimization/supabase-network-performance` (ou `main` se já fez merge)
   - force_refresh: `true`
5. Clicar **"Run workflow"** (botão verde)

#### 6. Verificar Execução

- Aguardar 1-2 minutos
- Clicar no workflow que apareceu
- Ver logs
- **Sucesso**: Checkmark verde ✅
- **Falha**: X vermelho ❌ → Clicar para ver erro

**⚠️ Se falhar**:
- Verificar se secrets estão corretos
- Verificar se function `refresh_all_materialized_views()` existe no Supabase
- Ver logs detalhados do erro

---

## 🔄 AÇÃO MANUAL #3: MIGRAR COMPONENTES PARA REACT QUERY

### ⏱️ Tempo Estimado: 2-4 horas (dependendo de quantos componentes)

### Componentes que Precisam Migração

Qualquer componente que atualmente usa:
```typescript
// PADRÃO ANTIGO (manual fetch)
const [students, setStudents] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function fetchData() {
    setLoading(true);
    const response = await fetch('/api/students');
    const data = await response.json();
    setStudents(data);
    setLoading(false);
  }
  fetchData();
}, []);
```

### Como Migrar (Exemplo)

**ANTES** - `src/app/cadastrar-estudante/page.tsx`:
```typescript
'use client';
import { useState, useEffect } from 'react';

export default function CadastrarEstudantePage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudents() {
      const response = await fetch('/api/students');
      const data = await response.json();
      setStudents(data.data || []);
      setLoading(false);
    }
    fetchStudents();
  }, []);

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <StudentTable students={students} />
    </div>
  );
}
```

**DEPOIS** (COM REACT QUERY):
```typescript
'use client';
import { useStudents } from '@/hooks/api/useStudentsQuery';

export default function CadastrarEstudantePage() {
  const { data, isLoading, error } = useStudents({
    detail: 'summary', // ou 'minimal' para listagem simples
    // filters opcionais:
    // status: 'ATIVO',
    // class: '5A',
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar: {error.message}</div>;

  const students = data?.data || [];

  return (
    <div>
      <StudentTable students={students} />
    </div>
  );
}
```

### Componentes Prioritários para Migrar

1. **`src/app/cadastrar-estudante/page.tsx`**
   - Lista principal de estudantes
   - Alto impacto (página mais acessada)

2. **`src/app/home/page.tsx`** (Dashboard)
   - KPIs de estudantes
   - Usar `detail: 'minimal'` para contagens

3. **`src/app/controlar-faltas/page.tsx`**
   - Lista de estudantes com faltas
   - Usar `detail: 'summary'`

4. **`src/app/gerenciador-tarefas/page.tsx`**
   - Lista de estudantes com tarefas
   - Usar `detail: 'summary'`

### Como Implementar Infinite Scroll (Opcional)

**Exemplo** - Lista de estudantes com scroll infinito:

```typescript
'use client';
import { useInfiniteStudents } from '@/hooks/api/useStudentsQuery';
import { InfiniteScrollContainer } from '@/components/shared/InfiniteScrollContainer';
import { StudentCard } from '@/components/StudentCard';

export default function StudentListPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useInfiniteStudents({
    detail: 'summary',
    limit: 20, // 20 por página
  });

  if (isLoading) return <div>Carregando primeira página...</div>;

  const allStudents = data?.pages.flatMap(page => page.data) ?? [];

  return (
    <InfiniteScrollContainer
      onLoadMore={fetchNextPage}
      hasMore={hasNextPage}
      isLoading={isLoading}
      isFetchingNextPage={isFetchingNextPage}
      loadingMessage="Carregando mais estudantes..."
      endMessage="Fim da lista"
    >
      {allStudents.map(student => (
        <StudentCard key={student.id} student={student} />
      ))}
    </InfiniteScrollContainer>
  );
}
```

### Checklist de Migração por Componente

Para cada componente:
- [ ] Identificar onde faz fetch manual
- [ ] Substituir por hook do React Query
- [ ] Escolher `detail` level apropriado
- [ ] Testar carregamento
- [ ] Testar cache (navegar pra fora e voltar → dados instantâneos)
- [ ] Testar erro (simular desconexão)
- [ ] Verificar React Query DevTools

---

## ✅ AÇÃO MANUAL #4: TESTAR E VALIDAR

### ⏱️ Tempo Estimado: 30-60 minutos

### Testes Obrigatórios

#### 1. Testar APIs Backend

**No terminal do seu computador**:

```bash
# Testar detail=minimal
curl "https://seu-app.vercel.app/api/students?detail=minimal" | jq '.data[0]'

# Deve retornar APENAS:
# {
#   "id": "...",
#   "estudanteId": "...",
#   "nome": "...",
#   "turma": "...",
#   "turno": "...",
#   "status": "..."
# }

# Testar detail=summary
curl "https://seu-app.vercel.app/api/students?detail=summary" | jq '.data[0]'

# Deve incluir: dataNascimento, bolsaFamilia, totalContatos, totalFaltas

# Testar cursor pagination
curl "https://seu-app.vercel.app/api/students?detail=minimal&limit=10" | jq '.pagination'

# Deve retornar:
# {
#   "hasNextPage": true,
#   "nextCursor": "ce5ac93c-bad9-4f82-af87-ffac12eb395f",
#   "limit": 10
# }
```

#### 2. Testar Compression

```bash
curl -I "https://seu-app.vercel.app/api/students?detail=minimal" \
  -H "Accept-Encoding: br, gzip"

# Procurar linha: content-encoding: br (ou gzip)
```

#### 3. Testar Cache Headers

```bash
curl -I "https://seu-app.vercel.app/api/students?detail=minimal"

# Procurar linha:
# cache-control: public, s-maxage=60, stale-while-revalidate=300
```

#### 4. Testar React Query (no Browser)

1. **Abrir app no navegador**: https://seu-app.vercel.app
2. **Abrir DevTools** (F12)
3. **Verificar React Query DevTools** (ícone no canto da tela)
4. **Navegar para página com lista de estudantes**
5. **No DevTools, aba React Query**:
   - Deve aparecer query: `students-list-{...}`
   - Status: `fresh` (5min), depois `stale`
   - Cache data visível

6. **Testar cache**:
   - Navegar para outra página
   - Voltar para lista de estudantes
   - **Resultado esperado**: Dados aparecem INSTANTANEAMENTE (do cache)

#### 5. Testar Infinite Scroll (se implementado)

1. Abrir página com infinite scroll
2. Scroll até o fim
3. **Resultado esperado**:
   - Loading spinner aparece
   - Próxima página carrega automaticamente
   - Scroll continua suave (60 FPS)

#### 6. Testar Performance em 3G

1. **Chrome DevTools** → **Network tab**
2. Dropdown "No throttling" → **"Slow 3G"**
3. **Recarregar página** (Cmd+R / Ctrl+R)
4. **Medir tempo de carregamento**:
   - Antes: 60-90 segundos
   - Depois esperado: 3-5 segundos

#### 7. Testar Materialized Views no Supabase

**Supabase SQL Editor**:

```sql
-- Query ANTIGA (N+1 com JOIN)
EXPLAIN ANALYZE
SELECT a.*, s.name, s.class
FROM student_absences a
LEFT JOIN students s ON a.student_id = s.id
WHERE s.deleted = false
LIMIT 50;

-- Anotar tempo: Planning Time + Execution Time

-- Query NOVA (MV pré-computada)
EXPLAIN ANALYZE
SELECT *
FROM absences_with_student_info
LIMIT 50;

-- Anotar tempo e comparar
-- Deve ser 5-10x mais rápido
```

---

## 📊 RESULTADOS ESPERADOS

### Se Tudo Deu Certo

| Teste | Resultado Esperado |
|-------|-------------------|
| **API /students?detail=minimal** | Payload ~50KB (antes: 4.2MB) |
| **Compression** | `content-encoding: br` presente |
| **Cache headers** | `cache-control: public, s-maxage=60...` |
| **React Query cache** | Navegação instantânea (<100ms) |
| **3G load time** | 3-5s (antes: 60-90s) |
| **MV queries** | 5-10x mais rápidas que JOIN manual |
| **Índices** | Queries usam `Index Scan` (não `Seq Scan`) |

### Se Algo Deu Errado

**Ver**: `docs/OTIMIZACAO-GUIA-COMPLETO-DEPLOYMENT.md` → Seção **Troubleshooting**

Ou perguntar no chat com detalhes do erro.

---

## 📝 PRÓXIMOS PASSOS (Após Validação)

1. **Criar Pull Request**:
   ```bash
   # No GitHub
   # Branch: optimization/supabase-network-performance → main
   ```

2. **Merge para main**

3. **Criar Release no GitHub**:
   - Tag: `v2.0.0-optimization-complete`
   - Title: "Otimização de Performance Supabase"
   - Description: (resumo das melhorias)

4. **Monitorar por 48-72h**:
   - Vercel Analytics
   - Supabase Query Performance
   - Feedback de usuários

5. **Se tudo OK**: Deploy está completo! 🎉

6. **Se houver problemas**: Ver plano de Rollback no guia completo

---

## 🆘 PRECISA DE AJUDA?

### Erro na Execução de SQL Migration

**Me envie**:
1. Qual migration (01, 02, 03, 04 ou 05)
2. Mensagem de erro completa
3. Print da tela se possível

### Erro no GitHub Actions

**Me envie**:
1. Link do workflow que falhou
2. Logs do erro
3. Confirmação de que secrets estão configurados

### Dúvida sobre Migração de Componente

**Me envie**:
1. Caminho do arquivo do componente
2. Código atual que quer migrar
3. Dúvida específica

### Teste de Performance Não Bateu com Esperado

**Me envie**:
1. Qual teste (API, 3G, MV, etc)
2. Resultado obtido vs esperado
3. Prints do Network tab ou SQL EXPLAIN

---

**IMPORTANTE**: Siga esta ordem:
1. SQL Migrations (Ação Manual #1)
2. GitHub Actions SE NECESSÁRIO (Ação Manual #2)
3. Testar e Validar (Ação Manual #4)
4. Migrar Componentes GRADUALMENTE (Ação Manual #3)

Não pule etapas! Cada fase depende da anterior.
