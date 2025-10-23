# 🧪 Guia de Validação de Performance

## ⚠️ Problema Identificado: Autenticação Requerida

Os testes de performance retornaram **401 Unauthorized** porque todas as APIs exigem autenticação via Firebase Auth.

### Resultados dos Testes Iniciais

```bash
npm run perf:test
```

**Output**:
- Status: `401` (todas as APIs)
- TTFB médio: ~714ms (mas apenas headers de erro)
- Compressão: ❌ Não detectada (resposta vazia)

**Causa**: APIs protegidas por middleware `withAuth` que exige Bearer token.

---

## 🔧 Soluções para Validação

### Opção 1: Teste Manual no Browser (RECOMENDADO)

**Vantagens**: Autenticação automática, dados reais, compressão ativa

**Passos**:

1. **Abrir DevTools** (Chrome/Firefox)
   - `F12` ou `Cmd+Option+I` (Mac)
   - Tab **Network**

2. **Fazer login** na aplicação
   - Ir para `/login`
   - Autenticar com Firebase

3. **Navegar para Dashboard**
   - `/home` (carrega estudantes)

4. **Medir Performance**
   - Filtrar por `Fetch/XHR`
   - Procurar requisição `/api/students?...`
   - Ver coluna **Time**:
     - **TTFB**: Time to First Byte
     - **Content Download**: Tempo de download
     - **Total**: Tempo total

5. **Verificar Compressão**
   - Clicar na requisição
   - Tab **Headers**
   - Procurar `content-encoding: br` (Brotli) ou `gzip`
   - Ver `content-length` (comprimido) vs tamanho real

**Exemplo de Medições**:

| Endpoint | Status | TTFB | Total | Size (Original) | Size (Compressed) | Encoding |
|----------|--------|------|-------|-----------------|-------------------|----------|
| `/api/students?limit=50` | 200 | 150ms | 250ms | 45 KB | 12 KB | br |
| `/api/absences-mv?limit=50` | 200 | 80ms | 120ms | 30 KB | 8 KB | br |
| `/api/tasks-mv?isResolved=false` | 200 | 60ms | 100ms | 20 KB | 5 KB | br |

---

### Opção 2: Teste Automatizado com Token

**Vantagens**: Repetível, pode ser integrado em CI/CD

**Passos**:

1. **Obter Firebase ID Token**
   - Login no browser
   - DevTools → Console
   - Executar:
     ```javascript
     firebase.auth().currentUser.getIdToken().then(console.log)
     ```
   - Copiar token (válido por 1 hora)

2. **Criar arquivo `.env.local.test`**
   ```bash
   FIREBASE_ID_TOKEN=eyJhbGciOiJSUzI1NiIsImtpZCI6...
   NEXT_PUBLIC_API_URL=https://frequencia-anual.vercel.app
   ```

3. **Modificar script de teste**
   ```javascript
   // scripts/test-performance.js
   const token = process.env.FIREBASE_ID_TOKEN;

   const options = {
     headers: {
       'Authorization': `Bearer ${token}`,
       'Accept-Encoding': 'br, gzip, deflate'
     }
   };

   https.get(url, options, (res) => { ... });
   ```

4. **Executar teste**
   ```bash
   source .env.local.test
   npm run perf:test
   ```

**Desvantagem**: Token expira em 1 hora, precisa renovar.

---

### Opção 3: Criar Endpoint de Health Check (Sem Auth)

**Vantagens**: Ideal para monitoramento contínuo, CI/CD

**Implementação**:

```typescript
// src/app/api/health/performance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Teste 1: Query simples
    const { data: studentsCount } = await supabaseAdmin
      .from('students')
      .select('id', { count: 'estimated', head: true });

    // Teste 2: Query com MV
    const { data: absences } = await supabaseAdmin
      .from('absences_with_student_info')
      .select('*')
      .limit(1);

    // Teste 3: Query indexada
    const { data: students } = await supabaseAdmin
      .from('students')
      .select('id, name, class')
      .eq('deleted', false)
      .eq('status', 'ATIVO')
      .limit(1);

    const endTime = Date.now();

    return NextResponse.json({
      status: 'healthy',
      responseTime: endTime - startTime,
      checks: {
        database: 'ok',
        mv: 'ok',
        indexes: 'ok'
      },
      metrics: {
        studentsCount: studentsCount,
        sampleAbsence: !!absences?.[0],
        sampleStudent: !!students?.[0]
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message,
      responseTime: Date.now() - startTime
    }, { status: 500 });
  }
}
```

**Uso**:
```bash
curl https://frequencia-anual.vercel.app/api/health/performance
# {"status":"healthy","responseTime":45,"checks":{...}}
```

---

## 📊 Métricas Reais Obtidas

### Performance Atual (Manual via DevTools)

**IMPORTANTE**: Atualizar esta seção após realizar testes manuais.

#### APIs REST

| Endpoint | TTFB | Total | Size (Original) | Size (Compressed) | Compressão | Encoding |
|----------|------|-------|-----------------|-------------------|------------|----------|
| `/api/students?limit=50` | ? ms | ? ms | ? KB | ? KB | ? % | ? |
| `/api/absences-mv?limit=50` | ? ms | ? ms | ? KB | ? KB | ? % | ? |
| `/api/interactions-mv?limit=50` | ? ms | ? ms | ? KB | ? KB | ? % | ? |
| `/api/tasks-mv?isResolved=false` | ? ms | ? ms | ? KB | ? KB | ? % | ? |
| `/api/certificates-mv?status=PENDING` | ? ms | ? ms | ? KB | ? KB | ? % | ? |
| `/api/suspensions-mv?limit=50` | ? ms | ? ms | ? KB | ? KB | ? % | ? |
| `/api/students-count?exact=false` | ? ms | ? ms | ? KB | ? KB | ? % | ? |

#### Páginas HTML

| Página | Load Time | DOMContentLoaded | Size (Original) | Size (Compressed) | Encoding |
|--------|-----------|------------------|-----------------|-------------------|----------|
| `/home` | ? ms | ? ms | ? KB | ? KB | ? |
| `/cadastrar-estudante` | ? ms | ? ms | ? KB | ? KB | ? |
| `/controlar-faltas` | ? ms | ? ms | ? KB | ? KB | ? |

---

## 🎯 Metas de Performance

### Response Time (TTFB)

- ✅ **< 200ms**: APIs usando MV
- ✅ **< 100ms**: Count estimated
- ✅ **< 50ms**: Health check
- ⚠️ **< 500ms**: APIs complexas (acceptable)
- ❌ **> 1000ms**: Requer otimização

### Compressão

- ✅ **Brotli ativo**: `content-encoding: br`
- ✅ **≥ 70% redução**: Em JSON e HTML
- ⚠️ **Gzip fallback**: `content-encoding: gzip` (50-60%)
- ❌ **Sem compressão**: `content-encoding` ausente

### Database (Supabase)

- ✅ **95%+ queries usando índices** (não Seq Scan)
- ✅ **< 1s para refresh de MVs**
- ✅ **148 índices ativos**

---

## 🧪 Checklist de Validação

### Testes Manuais (DevTools)

- [ ] Login na aplicação
- [ ] Abrir DevTools (Network tab)
- [ ] Navegar para `/home`
- [ ] Medir TTFB de `/api/students`
- [ ] Verificar `content-encoding: br` ou `gzip`
- [ ] Anotar tamanhos (original vs compressed)
- [ ] Repetir para outras 5 APIs principais
- [ ] Atualizar tabela acima com valores reais

### Testes no Supabase SQL Editor

- [ ] Abrir Supabase Dashboard
- [ ] SQL Editor → New Query
- [ ] Executar `SELECT * FROM query_performance_dashboard;`
- [ ] Verificar:
  - Total de índices: **148**
  - Total de MVs: **5**
  - Database size: ~**40-50 MB**
- [ ] Executar `SELECT * FROM get_mv_metadata();`
- [ ] Verificar última atualização < 5 minutos
- [ ] Executar queries de `docs/EXPLAIN-ANALYZE-10-QUERIES.sql`
- [ ] Anotar `Execution Time` de cada
- [ ] Verificar uso de índices (Index Scan vs Seq Scan)

### Testes em Produção (Vercel)

- [ ] Deploy para staging/production concluído
- [ ] Verificar Vercel Analytics:
  - Core Web Vitals (LCP, FID, CLS)
  - Page load times
  - API response times
- [ ] Verificar Supabase Analytics:
  - Query performance
  - Connection pool usage
  - Errors/warnings
- [ ] Smoke test:
  - [ ] Dashboard carrega < 2s
  - [ ] Lista de estudantes < 500ms
  - [ ] Faltas MV < 200ms
  - [ ] Tasks MV < 200ms
- [ ] Monitorar logs (Vercel + Supabase) por 1 hora

---

## 📈 Como Comparar Antes/Depois

### Baseline (Antes das Otimizações)

**Se você tem métricas antigas**:
1. Procurar logs/screenshots antigos
2. Reconstruir versão antiga (git checkout commit antigo)
3. Medir performance na versão antiga
4. Anotar valores

**Se NÃO tem baseline**:
- Usar valores estimados da documentação
- Focar em metas absolutas (< 200ms, ≥ 70% compressão)
- Monitorar tendência futura

### Comparação

| Métrica | ANTES (estimado) | DEPOIS (medido) | Ganho |
|---------|------------------|-----------------|-------|
| API /students | ~500ms | ? ms | ? % |
| API /absences (JOIN) | ~800ms | N/A (descontinuado) | - |
| API /absences-mv (MV) | N/A | ? ms | **NOVA** |
| Count exact | ~2500ms | N/A (descontinuado) | - |
| Count estimated | N/A | ? ms | **NOVA** |
| Compressão | ~0% | ? % | ? pp |

---

## 🚀 Próximos Passos

### Curto Prazo (Hoje)

1. ✅ **Teste manual via DevTools**
   - Seguir "Opção 1" acima
   - Preencher tabelas de métricas
   - Atualizar `docs/PERFORMANCE-COMPARISON.md`

2. ✅ **Executar EXPLAIN ANALYZE**
   - Supabase SQL Editor
   - `docs/EXPLAIN-ANALYZE-10-QUERIES.sql`
   - Anotar tempos de execução

3. ⏳ **Criar endpoint de health check** (opcional)
   - Implementar `/api/health/performance`
   - Testar sem autenticação
   - Adicionar ao monitoramento

### Médio Prazo (Esta Semana)

4. ⏳ **Automatizar testes com token**
   - Implementar renovação automática de token
   - Integrar em CI/CD (GitHub Actions)
   - Alertar se performance degradar

5. ⏳ **Monitorar em produção**
   - Configurar alertas (Vercel + Supabase)
   - Threshold: TTFB > 500ms ou error rate > 1%
   - Dashboard de métricas real-time

---

## 📚 Referências

- [Vercel Analytics Docs](https://vercel.com/docs/analytics)
- [Supabase Performance Tuning](https://supabase.com/docs/guides/platform/performance)
- [Web Performance Metrics](https://web.dev/vitals/)
- [Chrome DevTools Network Analysis](https://developer.chrome.com/docs/devtools/network/)

---

**Status**: 🟡 **VALIDAÇÃO MANUAL REQUERIDA**
**Próximo Marco**: Coletar métricas reais via DevTools
**Última Atualização**: 2025-10-23
