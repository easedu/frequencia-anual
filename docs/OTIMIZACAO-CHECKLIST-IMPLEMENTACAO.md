# ✅ Checklist de Implementação - Otimizações Supabase

> **Guia Rápido de Consulta**: Use este documento durante a implementação para marcar progresso e validar cada etapa.

---

## 📊 Progresso Geral

- [ ] **Fase 1 - Crítica** (3 itens)
- [ ] **Fase 2 - Alta** (4 itens)
- [ ] **Fase 3 - Média** (4 itens)
- [ ] **Fase 4 - Baixa** (3 itens)
- [ ] **Validação Final**
- [ ] **Deploy em Produção**

**Meta**: 60-90s → 3-5s (15-20x mais rápido)

---

## 🔴 FASE 1: CRÍTICA (Implementar PRIMEIRO)

### ✅ Item 1.1: Eliminar Over-fetching

**Impacto**: 4.2MB → 500KB (8x redução)

#### Checklist de Implementação

- [ ] **1.1.1 - Criar Tipos Estratificados**
  - [ ] Criar `src/types/optimized.ts`
  - [ ] Definir `StudentMinimal` (6 campos)
  - [ ] Definir `StudentSummary` (10 campos + agregações)
  - [ ] Definir `StudentDetailed` (15 campos + contatos limitados)
  - [ ] Definir `StudentFull` (todos os campos)
  - [ ] Export todos os tipos

- [ ] **1.1.2 - Atualizar API Route GET /api/students**
  - [ ] Adicionar parâmetro `detail` (minimal/summary/detailed/full)
  - [ ] Implementar switch case para cada nível
  - [ ] SELECT minimal: `id, student_id, name, class, shift, status`
  - [ ] SELECT summary: adicionar `birth_date, bolsa_familia` + COUNT agregações
  - [ ] SELECT detailed: adicionar `disabilities, address` + LIMIT 3 contatos
  - [ ] SELECT full: todos os campos sem limite
  - [ ] Testar cada nível via cURL

- [ ] **1.1.3 - Atualizar Frontend**
  - [ ] Modificar `useStudents.ts` para usar `detail=summary`
  - [ ] Modificar página de listagem para usar `StudentSummary`
  - [ ] Modificar modal de edição para usar `detail=full` somente quando abrir
  - [ ] Verificar tipagem TypeScript
  - [ ] Testar carregamento da lista (deve ser 8x mais rápido)

#### Validação

- [ ] Network tab mostra payload reduzido (< 500KB)
- [ ] Listagem carrega em < 3s
- [ ] Modal ainda mostra dados completos
- [ ] Sem erros TypeScript
- [ ] Sem regressões funcionais

**Documento de Referência**: `docs/OTIMIZACAO-SUPABASE-REDES-RUINS-GUIA-COMPLETO.md` → Seção 1

---

### ✅ Item 1.2: Habilitar Compressão

**Impacto**: 4MB → 500KB (8x redução, complementar ao over-fetching)

#### Checklist de Implementação

- [ ] **1.2.1 - Configurar Next.js**
  - [ ] Abrir `next.config.mjs`
  - [ ] Adicionar `compress: true`
  - [ ] Adicionar Brotli config: `br { quality: 6 }`
  - [ ] Adicionar Gzip fallback: `gzip { level: 6 }`
  - [ ] Verificar se não há conflito com outros plugins

- [ ] **1.2.2 - Atualizar API Routes**
  - [ ] Abrir cada API route (`students`, `absences`, `interactions`, etc.)
  - [ ] Adicionar header `Content-Type: application/json; charset=utf-8`
  - [ ] Não adicionar `Content-Encoding` manualmente (Next.js cuida)
  - [ ] Verificar que `NextResponse.json()` é usado (não `Response`)

- [ ] **1.2.3 - Testar Localmente**
  - [ ] `npm run build`
  - [ ] `npm start`
  - [ ] Abrir DevTools → Network
  - [ ] Verificar header `Content-Encoding: br` ou `gzip`
  - [ ] Confirmar tamanho transferido vs tamanho real

#### Validação

- [ ] Header `Content-Encoding` presente
- [ ] Tamanho transferido < 600KB (com over-fetching resolvido)
- [ ] Brotli (br) usado em navegadores modernos
- [ ] Gzip usado como fallback
- [ ] Build successful sem warnings

**Documento de Referência**: `docs/OTIMIZACAO-SUPABASE-REDES-RUINS-GUIA-COMPLETO.md` → Seção 2

---

### ✅ Item 1.3: Implementar Cache com React Query

**Impacto**: 3-5s → <500ms para requisições repetidas (10x mais rápido)

#### Checklist de Implementação

- [ ] **1.3.1 - Instalar Dependências**
  - [ ] `npm install @tanstack/react-query@5.62.11`
  - [ ] `npm install @tanstack/react-query-devtools@5.62.11`
  - [ ] Verificar `package.json` atualizado

- [ ] **1.3.2 - Setup do QueryClient**
  - [ ] Criar `src/lib/queryClient.ts`
  - [ ] Configurar `staleTime: 5 * 60 * 1000` (5 min)
  - [ ] Configurar `cacheTime: 10 * 60 * 1000` (10 min)
  - [ ] Configurar `retry: 3`
  - [ ] Configurar `refetchOnWindowFocus: false`

- [ ] **1.3.3 - Wrapper no Layout**
  - [ ] Abrir `src/app/layout.tsx`
  - [ ] Import `QueryClientProvider` e `ReactQueryDevtools`
  - [ ] Envolver children com `<QueryClientProvider>`
  - [ ] Adicionar `<ReactQueryDevtools>` somente em dev

- [ ] **1.3.4 - Migrar useStudents para React Query**
  - [ ] Abrir `src/hooks/api/useStudents.ts`
  - [ ] Substituir `useState` por `useQuery`
  - [ ] Definir queryKey: `['students', { detail, filters }]`
  - [ ] Implementar queryFn com fetch da API
  - [ ] Remover lógica manual de loading/error
  - [ ] Export `{ data, isLoading, error, refetch }`

- [ ] **1.3.5 - Migrar Outros Hooks**
  - [ ] Repetir processo para `useAbsences`
  - [ ] Repetir processo para `useInteractions`
  - [ ] Repetir processo para `useTasks`
  - [ ] Repetir processo para `useMedicalCertificates`

- [ ] **1.3.6 - Adicionar HTTP Cache Headers**
  - [ ] Abrir cada API route
  - [ ] Adicionar header `Cache-Control: s-maxage=300, stale-while-revalidate=600`
  - [ ] Verificar que Vercel/CDN vai respeitar

#### Validação

- [ ] React Query Devtools aparece no canto da tela (dev)
- [ ] Primeira carga demora 3-5s, segunda carga <500ms
- [ ] Cache expira após 5 minutos (verificar re-fetch)
- [ ] Sem erros no console
- [ ] Lighthouse mostra melhoria no "Time to Interactive"

**Documento de Referência**: `docs/OTIMIZACAO-SUPABASE-REDES-RUINS-GUIA-COMPLETO.md` → Seção 3

---

## 🟠 FASE 2: ALTA PRIORIDADE (Implementar SEGUNDO)

### ✅ Item 2.1: Eliminar N+1 Queries com Materialized Views

**Impacto**: 2-5s → 300-800ms (7x mais rápido)

#### Checklist de Implementação

- [ ] **2.1.1 - Criar Materialized Views no Supabase**
  - [ ] Conectar no Supabase SQL Editor
  - [ ] Executar SQL para `absences_with_student_info`
  - [ ] Executar SQL para `interactions_with_student_info`
  - [ ] Executar SQL para `tasks_with_student_info`
  - [ ] Executar SQL para `medical_certificates_with_student_info`
  - [ ] Executar SQL para `students_summary_stats`
  - [ ] Verificar que todas as views foram criadas: `\dvm` no psql

- [ ] **2.1.2 - Configurar Refresh Automático (pg_cron)**
  - [ ] Habilitar extensão `pg_cron` no Supabase
  - [ ] Criar job para refresh a cada 5 minutos
  - [ ] SQL: `SELECT cron.schedule('refresh-views', '*/5 * * * *', ...)`
  - [ ] Testar: aguardar 5 min e verificar refresh

- [ ] **2.1.3 - Atualizar Tipos TypeScript**
  - [ ] Criar interface `AbsenceWithStudentInfo` em `src/types/optimized.ts`
  - [ ] Criar interface `InteractionWithStudentInfo`
  - [ ] Criar interface `TaskWithStudentInfo`
  - [ ] Criar interface `MedicalCertificateWithStudentInfo`
  - [ ] Criar interface `StudentSummaryStats`

- [ ] **2.1.4 - Atualizar API Routes**
  - [ ] `/api/absences/route.ts`: SELECT FROM `absences_with_student_info`
  - [ ] `/api/interactions/route.ts`: SELECT FROM `interactions_with_student_info`
  - [ ] `/api/tasks/route.ts`: SELECT FROM `tasks_with_student_info`
  - [ ] `/api/medical-certificates/route.ts`: SELECT FROM `medical_certificates_with_student_info`
  - [ ] Remover `.select('*, students(*)')` (já vem na view)
  - [ ] Verificar tipagem correta

- [ ] **2.1.5 - Atualizar Frontend**
  - [ ] Modificar hooks para usar novos tipos
  - [ ] Verificar que dados de estudante ainda aparecem
  - [ ] Testar todas as telas (listagens, cards, modais)

#### Validação

- [ ] Queries no Supabase Dashboard mostram tempo reduzido (< 800ms)
- [ ] Network tab mostra resposta mais rápida
- [ ] Dados de estudante aparecem sem necessidade de segunda query
- [ ] pg_cron logs mostram refresh funcionando
- [ ] Sem regressões visuais

**Documento de Referência**: `docs/OTIMIZACAO-FASE-2-ALTA-PRIORIDADE.md` → Seção 1

---

### ✅ Item 2.2: Implementar Infinite Scroll

**Impacto**: 28s (14 páginas sequenciais) → 3-5s (carga inicial + incremental)

#### Checklist de Implementação

- [ ] **2.2.1 - Instalar Dependências**
  - [ ] `npm install react-intersection-observer`
  - [ ] Verificar compatibilidade com React 19

- [ ] **2.2.2 - Atualizar API Route com Cursor Pagination**
  - [ ] Abrir `/api/students/route.ts`
  - [ ] Adicionar parâmetro `cursor` (opcional)
  - [ ] Implementar query com `.gt('id', cursor)` se cursor existe
  - [ ] Ordenar por `id` ASC
  - [ ] Limitar a 50 registros
  - [ ] Retornar `nextCursor` (último `id` da página)

- [ ] **2.2.3 - Migrar Hook para useInfiniteQuery**
  - [ ] Abrir `src/hooks/api/useStudents.ts`
  - [ ] Substituir `useQuery` por `useInfiniteQuery`
  - [ ] Definir `queryFn` com `pageParam` (cursor)
  - [ ] Implementar `getNextPageParam` retornando `nextCursor`
  - [ ] Export `{ data, fetchNextPage, hasNextPage, isFetchingNextPage }`

- [ ] **2.2.4 - Implementar Infinite Scroll no Componente**
  - [ ] Abrir componente de listagem (ex: `StudentTable.tsx`)
  - [ ] Import `useInView` de `react-intersection-observer`
  - [ ] Flatear `data.pages` para array único
  - [ ] Adicionar `<div ref={ref}>` ao final da lista
  - [ ] Trigger `fetchNextPage()` quando `inView && hasNextPage`
  - [ ] Mostrar loading spinner quando `isFetchingNextPage`

- [ ] **2.2.5 - Remover Paginação Antiga**
  - [ ] Remover lógica de `fetchAllPages` de `paginationHelper.ts`
  - [ ] Remover botões "Próxima Página" / "Página Anterior"
  - [ ] Limpar código não usado

#### Validação

- [ ] Primeira carga mostra 50 registros em < 3s
- [ ] Scroll até o final carrega próxima página automaticamente
- [ ] Spinner aparece durante carregamento incremental
- [ ] Não há requisições duplicadas
- [ ] Funciona em mobile (touch scroll)

**Documento de Referência**: `docs/OTIMIZACAO-FASE-2-ALTA-PRIORIDADE.md` → Seção 2

---

### ✅ Item 2.3: Retry Adaptativo com Exponential Backoff

**Impacto**: Taxa de erro 30-50% → <5% (10x mais confiável)

#### Checklist de Implementação

- [ ] **2.3.1 - Instalar Dependências**
  - [ ] `npm install p-retry p-timeout`
  - [ ] Verificar versões compatíveis

- [ ] **2.3.2 - Criar Utilitário de Retry**
  - [ ] Criar `src/utils/adaptiveRetry.ts`
  - [ ] Implementar `withAdaptiveRetry()` com p-retry
  - [ ] Configurar timeout adaptativo (5s → 7.5s → 11.25s)
  - [ ] Configurar delay exponencial (1s → 2s → 4s)
  - [ ] Máximo 3 tentativas
  - [ ] Export interface `RetryConfig`

- [ ] **2.3.3 - Integrar com Supabase Client**
  - [ ] Abrir `src/lib/supabaseClient.ts`
  - [ ] Wrap custom fetch com `withAdaptiveRetry()`
  - [ ] Passar configuração padrão
  - [ ] Testar que não quebra queries existentes

- [ ] **2.3.4 - Testar Retry**
  - [ ] Simular rede lenta (DevTools → Network → Slow 3G)
  - [ ] Fazer requisição que normalmente falharia
  - [ ] Verificar console logs mostrando retry
  - [ ] Confirmar sucesso após retry

#### Validação

- [ ] Requisições que falhavam agora succedem após retry
- [ ] Logs mostram tentativas (1, 2, 3)
- [ ] Timeout aumenta gradualmente
- [ ] Após 3 falhas, erro é propagado corretamente
- [ ] Sem degradação de performance em rede boa

**Documento de Referência**: `docs/OTIMIZACAO-FASE-2-PARTE-2-RETRY-ADAPTATIVO.md` → Seção 1

---

### ✅ Item 2.4: Circuit Breaker Pattern

**Impacto**: Evita sobrecarga do servidor em caso de falhas repetidas

#### Checklist de Implementação

- [ ] **2.4.1 - Instalar Dependência**
  - [ ] `npm install cockatiel`

- [ ] **2.4.2 - Criar Circuit Breaker**
  - [ ] Criar `src/utils/circuitBreaker.ts`
  - [ ] Configurar thresholds (5 falhas consecutivas → OPEN)
  - [ ] Configurar timeout de recuperação (30s)
  - [ ] Criar breakers por endpoint (`students`, `absences`, etc.)
  - [ ] Export função `withCircuitBreaker()`

- [ ] **2.4.3 - Integrar com React Query**
  - [ ] Modificar `queryClient.ts`
  - [ ] Wrap `queryFn` de todos os hooks com circuit breaker
  - [ ] Adicionar fallback quando circuito está OPEN
  - [ ] Mostrar mensagem amigável ao usuário

- [ ] **2.4.4 - Monitoramento**
  - [ ] Criar endpoint `/api/health/circuit-status`
  - [ ] Retornar estado de cada circuit breaker
  - [ ] Adicionar ao dashboard de monitoramento

#### Validação

- [ ] Após 5 falhas, circuit breaker abre
- [ ] Requisições falham rapidamente quando OPEN (não tenta servidor)
- [ ] Após 30s, tenta novamente (HALF-OPEN)
- [ ] Se sucesso, fecha circuito (CLOSED)
- [ ] Endpoint `/api/health/circuit-status` retorna JSON correto

**Documento de Referência**: `docs/OTIMIZACAO-FASE-2-PARTE-2-RETRY-ADAPTATIVO.md` → Seção 2

---

## 🟡 FASE 3: MÉDIA PRIORIDADE (Implementar TERCEIRO)

### ✅ Item 3.1: Otimizar Índices PostgreSQL

**Impacto**: +100ms/query → +10ms/query (10x mais rápido)

#### Checklist de Implementação

- [ ] **3.1.1 - Criar Índices Compostos**
  - [ ] Conectar no Supabase SQL Editor
  - [ ] `CREATE INDEX idx_students_class_status ON students(class, status)`
  - [ ] `CREATE INDEX idx_absences_student_date ON student_absences(student_id, absence_date DESC)`
  - [ ] `CREATE INDEX idx_absences_date_bimester ON student_absences(absence_date, bimester)`
  - [ ] `CREATE INDEX idx_interactions_student_date ON family_interactions(student_id, interaction_date DESC)`
  - [ ] `CREATE INDEX idx_tasks_student_resolved ON user_tasks(student_id, is_resolved, due_date)`
  - [ ] `CREATE INDEX idx_certificates_student_dates ON medical_certificates(student_id, start_date, end_date)`
  - [ ] `CREATE INDEX idx_contacts_student_whatsapp ON student_contacts(student_id, can_receive_whatsapp)`

- [ ] **3.1.2 - Criar Índices Parciais**
  - [ ] `CREATE INDEX idx_students_active ON students(class, shift) WHERE status = 'ATIVO' AND deleted = false`
  - [ ] `CREATE INDEX idx_absences_unjustified ON student_absences(student_id, absence_date) WHERE is_justified = false`
  - [ ] `CREATE INDEX idx_tasks_open ON user_tasks(assigned_to, due_date) WHERE is_resolved = false`

- [ ] **3.1.3 - Criar Índices GIN (JSONB)**
  - [ ] `CREATE INDEX idx_students_address_gin ON students USING GIN (address)`
  - [ ] `CREATE INDEX idx_students_disabilities_gin ON students USING GIN (disabilities)`
  - [ ] `CREATE INDEX idx_contacts_whatsapp_gin ON student_contacts USING GIN (whatsapp_data)`

#### Validação

- [ ] `\di` no psql lista todos os índices criados
- [ ] Queries no Supabase Dashboard mostram uso de índices
- [ ] Performance melhorou (< 50ms para queries simples)
- [ ] Sem impacto negativo em INSERT/UPDATE

**Documento de Referência**: `docs/OTIMIZACAO-FASES-3-4-E-VALIDACAO-CONSOLIDADO.md` → Fase 3.1

---

### ✅ Item 3.2: EXPLAIN ANALYZE das Queries Críticas

**Impacto**: Identificar gargalos não previstos

#### Checklist de Implementação

- [ ] **3.2.1 - Executar EXPLAIN ANALYZE**
  - [ ] Query 1: SELECT students com filtros (class + status)
  - [ ] Query 2: SELECT absences com JOIN student
  - [ ] Query 3: SELECT interactions com ORDER BY date
  - [ ] Query 4: SELECT tasks abertas por assigned_to
  - [ ] Query 5: COUNT absences por estudante/bimestre
  - [ ] Query 6: SELECT certificates com range de datas
  - [ ] Query 7: SELECT contacts com whatsapp_data filter
  - [ ] Query 8: Materialized view refresh time
  - [ ] Query 9: Aggregação de stats (students_summary_stats)
  - [ ] Query 10: Busca full-text em students (se implementado)

- [ ] **3.2.2 - Analisar Planos de Execução**
  - [ ] Verificar "Seq Scan" → substituir por "Index Scan"
  - [ ] Verificar "cost" está baixo (< 100)
  - [ ] Verificar "rows" estimado vs real
  - [ ] Identificar operações caras (Sort, Hash Join)

- [ ] **3.2.3 - Otimizar Queries Problemáticas**
  - [ ] Adicionar índices faltantes
  - [ ] Reescrever queries ineficientes
  - [ ] Considerar particionamento de tabelas grandes

#### Validação

- [ ] Todas as queries críticas usam índices
- [ ] Cost total < 1000 para queries principais
- [ ] Execution time < 100ms para 90% das queries

**Documento de Referência**: `docs/OTIMIZACAO-FASES-3-4-E-VALIDACAO-CONSOLIDADO.md` → Fase 3.2

---

### ✅ Item 3.3: Connection Pooling

**Impacto**: Reduzir latência de conexão em ~50ms/query

#### Checklist de Implementação

- [ ] **3.3.1 - Habilitar Supabase Pooler**
  - [ ] Acessar Supabase Dashboard → Settings → Database
  - [ ] Copiar "Connection pooling URL" (porta 6543)
  - [ ] Atualizar `SUPABASE_URL` no Vercel (usar URL com pooler)
  - [ ] Testar conexão

- [ ] **3.3.2 - Configurar Pool Size**
  - [ ] Definir `max_connections` adequado (Supabase default: 60)
  - [ ] Verificar que não excede limite do plano
  - [ ] Monitorar uso de conexões no dashboard

#### Validação

- [ ] Dashboard mostra conexões usando pooler
- [ ] Latência de conexão reduzida (verificar logs)
- [ ] Sem erros de "too many connections"

**Documento de Referência**: `docs/OTIMIZACAO-FASES-3-4-E-VALIDACAO-CONSOLIDADO.md` → Fase 3.3

---

### ✅ Item 3.4: Prefetching de Dados Críticos

**Impacto**: Melhorar perceived performance

#### Checklist de Implementação

- [ ] **3.4.1 - Identificar Dados Críticos**
  - [ ] Lista de estudantes (primeira página)
  - [ ] Estatísticas do dashboard
  - [ ] Dados do usuário logado

- [ ] **3.4.2 - Implementar Prefetch no Layout**
  - [ ] Modificar `src/app/layout.tsx`
  - [ ] Usar `queryClient.prefetchQuery()` para dados críticos
  - [ ] Executar em paralelo com `Promise.all()`

- [ ] **3.4.3 - Prefetch on Hover**
  - [ ] Adicionar `onMouseEnter` em botões/links
  - [ ] Prefetch dados da página destino
  - [ ] Ex: ao passar mouse em "Ver Detalhes", prefetch dados do estudante

#### Validação

- [ ] React Query Devtools mostra dados prefetched
- [ ] Navegação parece instantânea
- [ ] Sem over-fetching (só prefetch quando provável)

**Documento de Referência**: `docs/OTIMIZACAO-FASES-3-4-E-VALIDACAO-CONSOLIDADO.md` → Fase 3.4

---

## 🟢 FASE 4: BAIXA PRIORIDADE (Implementar POR ÚLTIMO)

### ✅ Item 4.1: Substituir count: 'exact' por 'estimated'

**Impacto**: +50-100ms → +5-10ms (10x mais rápido)

#### Checklist de Implementação

- [ ] **4.1.1 - Identificar Uso de count: 'exact'**
  - [ ] Buscar no código: `grep -r "count: 'exact'" src/`
  - [ ] Listar todas as ocorrências

- [ ] **4.1.2 - Avaliar Necessidade**
  - [ ] Para paginação: pode usar 'estimated'
  - [ ] Para estatísticas não-críticas: pode usar 'estimated'
  - [ ] Para relatórios financeiros: manter 'exact'

- [ ] **4.1.3 - Substituir**
  - [ ] Modificar queries para `count: 'estimated'`
  - [ ] Ou remover count completamente se não necessário
  - [ ] Testar que UI ainda funciona

#### Validação

- [ ] Contadores mostram valores aproximados (ex: "~150 estudantes")
- [ ] Performance melhorou (~50ms por query)
- [ ] Sem impacto em funcionalidades críticas

**Documento de Referência**: `docs/OTIMIZACAO-FASES-3-4-E-VALIDACAO-CONSOLIDADO.md` → Fase 4.1

---

### ✅ Item 4.2: Otimização de Bundle

**Impacto**: Bundle < 500KB

#### Checklist de Implementação

- [ ] **4.2.1 - Analisar Bundle Atual**
  - [ ] `npm run build`
  - [ ] `npm run analyze` (se configurado)
  - [ ] Identificar pacotes grandes

- [ ] **4.2.2 - Tree Shaking**
  - [ ] Substituir imports completos por específicos
  - [ ] Ex: `import debounce from 'lodash/debounce'` ao invés de `import _ from 'lodash'`

- [ ] **4.2.3 - Lazy Loading**
  - [ ] Identificar componentes pesados (charts, modais)
  - [ ] Usar `React.lazy()` e `Suspense`
  - [ ] Ex: `const HeavyChart = lazy(() => import('./HeavyChart'))`

- [ ] **4.2.4 - Code Splitting**
  - [ ] Verificar que Next.js está fazendo split automático
  - [ ] Revisar `next.config.mjs` para otimizações

#### Validação

- [ ] Bundle total < 500KB
- [ ] First Load JS < 200KB
- [ ] Lazy loading funciona sem flash de conteúdo

**Documento de Referência**: `docs/OTIMIZACAO-FASES-3-4-E-VALIDACAO-CONSOLIDADO.md` → Fase 4.2

---

### ✅ Item 4.3: Limpeza Final

**Impacto**: Código mais limpo e manutenível

#### Checklist de Implementação

- [ ] **4.3.1 - Remover Código Não Usado**
  - [ ] Deletar `src/hooks/useSupabase.ts` (deprecated)
  - [ ] Deletar `src/hooks/useSupabaseDoc.ts` (deprecated)
  - [ ] Remover imports não usados
  - [ ] Rodar `npm run lint` e corrigir warnings

- [ ] **4.3.2 - Remover Console Logs**
  - [ ] Buscar: `grep -r "console.log" src/`
  - [ ] Substituir por logger ou remover
  - [ ] Manter apenas logs críticos (erros)

- [ ] **4.3.3 - Minificar CSS**
  - [ ] Verificar que Next.js está minificando em produção
  - [ ] Remover CSS não usado (PurgeCSS já integrado no Tailwind)

#### Validação

- [ ] `npm run lint` não mostra warnings
- [ ] `npm run type-check` passa sem erros
- [ ] Build size reduzido
- [ ] Sem console.logs em produção

**Documento de Referência**: `docs/OTIMIZACAO-FASES-3-4-E-VALIDACAO-CONSOLIDADO.md` → Fase 4.3

---

## ✅ VALIDAÇÃO COMPLETA

### Testes de Performance

- [ ] **Lighthouse Audit (3G Slow)**
  - [ ] Performance Score > 85
  - [ ] First Contentful Paint < 3s
  - [ ] Largest Contentful Paint < 5s
  - [ ] Time to Interactive < 6s
  - [ ] Total Blocking Time < 600ms
  - [ ] Cumulative Layout Shift < 0.1

- [ ] **WebPageTest (3G Slow - 400ms RTT)**
  - [ ] First Byte < 2s
  - [ ] Start Render < 4s
  - [ ] Fully Loaded < 10s
  - [ ] Requests < 50
  - [ ] Bytes In < 1MB

- [ ] **Testes Manuais**
  - [ ] Conexão 3G real em smartphone
  - [ ] Listagem de estudantes carrega < 5s
  - [ ] Infinite scroll funciona suavemente
  - [ ] Cache funciona (segunda carga < 1s)
  - [ ] Retry funciona em rede instável

### Testes de Regressão

- [ ] **Funcionalidades Críticas**
  - [ ] Login funciona
  - [ ] CRUD de estudantes funciona
  - [ ] Registro de faltas funciona
  - [ ] Envio de WhatsApp funciona
  - [ ] Relatórios funcionam
  - [ ] Dashboard carrega corretamente

- [ ] **Dados**
  - [ ] Nenhum dado foi perdido
  - [ ] Contagens batem com banco
  - [ ] JOINs retornam dados corretos
  - [ ] Agregações estão corretas

### Monitoramento Pós-Deploy

- [ ] **Vercel Analytics**
  - [ ] Configurado e coletando dados
  - [ ] Web Vitals < thresholds
  - [ ] Error rate < 5%

- [ ] **Supabase Dashboard**
  - [ ] Queries < 100ms (p95)
  - [ ] Connection pool saudável
  - [ ] Materialized views refreshing
  - [ ] Índices sendo usados

- [ ] **Health Checks**
  - [ ] `/api/health` retorna 200
  - [ ] `/api/health/circuit-status` retorna estado correto
  - [ ] GitHub Actions executando health checks

**Documento de Referência**: `docs/OTIMIZACAO-FASES-3-4-E-VALIDACAO-CONSOLIDADO.md` → Seções de Validação e Monitoramento

---

## 🚀 DEPLOY EM PRODUÇÃO

### Pré-Deploy

- [ ] **Backup Completo**
  - [ ] Backup do banco Supabase
  - [ ] Git tag da versão atual: `git tag pre-optimization-v1.0`
  - [ ] Documentar estado atual (métricas baseline)

- [ ] **Testes em Staging**
  - [ ] Deploy em ambiente staging
  - [ ] Rodar suite completa de testes
  - [ ] Validar com usuários reais (beta testers)
  - [ ] Coletar feedback

### Deploy Gradual

- [ ] **Fase 1 - Deploy Backend (APIs + DB)**
  - [ ] Deploy materialized views
  - [ ] Deploy índices
  - [ ] Deploy APIs atualizadas
  - [ ] Monitorar por 24h

- [ ] **Fase 2 - Deploy Frontend (Cache + Infinite Scroll)**
  - [ ] Deploy com React Query
  - [ ] Deploy infinite scroll
  - [ ] Monitorar por 24h

- [ ] **Fase 3 - Ativar Otimizações Finais**
  - [ ] Ativar compressão
  - [ ] Ativar retry adaptativo
  - [ ] Ativar circuit breaker
  - [ ] Monitorar continuamente

### Pós-Deploy

- [ ] **Verificação Imediata (primeiras 2h)**
  - [ ] Verificar logs de erro
  - [ ] Verificar métricas de performance
  - [ ] Verificar feedback de usuários
  - [ ] Verificar circuit breaker não está OPEN

- [ ] **Monitoramento (primeiras 48h)**
  - [ ] Web Vitals melhoraram?
  - [ ] Taxa de erro caiu?
  - [ ] Reclamações reduziram?
  - [ ] Server load estável?

- [ ] **Documentação Final**
  - [ ] Atualizar CLAUDE.md com novas práticas
  - [ ] Documentar métricas antes/depois
  - [ ] Criar runbook de troubleshooting
  - [ ] Compartilhar resultados com time

---

## 📊 MÉTRICAS DE SUCESSO

### Antes (Baseline)

- **Tempo de Carregamento**: 60-90s
- **Taxa de Erro**: 30-50%
- **Payload**: 4.2MB
- **Queries por Página**: 14+ (sequenciais)
- **Lighthouse Performance**: ~40

### Depois (Meta)

- **Tempo de Carregamento**: 3-5s (15-20x mais rápido) ✅
- **Taxa de Erro**: <5% (10x mais confiável) ✅
- **Payload**: <500KB (8x menor) ✅
- **Queries por Página**: 1 + incrementais (infinite scroll) ✅
- **Lighthouse Performance**: >85 ✅

---

## 🎯 PRÓXIMOS PASSOS

1. **Começar pela Fase 1** (Crítica)
   - Item 1.1: Over-fetching
   - Item 1.2: Compressão
   - Item 1.3: React Query

2. **Validar Fase 1 antes de continuar**
   - Performance melhorou?
   - Sem regressões?
   - Deploy em staging OK?

3. **Continuar para Fase 2** (Alta)
   - Implementar com cuidado
   - Testar extensivamente
   - Monitorar de perto

4. **Fases 3 e 4 podem ser incrementais**
   - Não bloqueiam deploy
   - Podem ser feitas em sprints seguintes
   - Priorizar conforme necessidade

---

## 📝 NOTAS IMPORTANTES

- ⚠️ **SEMPRE fazer backup antes de qualquer mudança no banco**
- ⚠️ **Testar em staging ANTES de produção**
- ⚠️ **Monitorar CONTINUAMENTE após cada fase**
- ⚠️ **Ter plano de rollback pronto** (ver documentação de Rollback)
- ⚠️ **Comunicar mudanças ao time e usuários**

---

**Documento Criado**: 2025-01-18
**Última Atualização**: 2025-01-18
**Status**: ✅ Pronto para Implementação
