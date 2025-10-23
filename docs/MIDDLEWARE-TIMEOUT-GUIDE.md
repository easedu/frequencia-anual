# 🕐 Guia de Uso: Middleware de Timeout

## 📋 Resumo

Todas as APIs agora têm **timeout automático de 8 segundos** para evitar exceder o limite do Vercel Free Plan (10 segundos).

---

## ✅ Como Usar

### 1. APIs Autenticadas (Maioria)

**Use `withAuth()`** - Já inclui timeout automaticamente!

```typescript
// src/app/api/students/route.ts
import { withAuth } from '@/app/api/_middleware';
import { NextRequest } from 'next/server';
import { successResponse } from '@/app/api/_utils/response';

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  // ✅ Timeout de 8s aplicado automaticamente
  // ✅ userId já validado pelo Firebase Auth

  const students = await fetchStudents(userId);
  return successResponse(students);
});
```

**Nada muda!** Se você já usava `withAuth()`, o timeout já está ativo.

---

### 2. APIs Públicas (Sem Auth)

**Use `withTimeout()`** - Para APIs que não precisam de autenticação.

```typescript
// src/app/api/health/route.ts
import { withTimeout } from '@/app/api/_middleware';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withTimeout(async (req: NextRequest) => {
  // ✅ Timeout de 8s aplicado automaticamente
  // ❌ SEM validação de auth (API pública)

  return NextResponse.json({ status: 'ok' });
});
```

---

### 3. Timeout Customizado

**Quando usar**: APIs que sabidamente demoram mais (ex: exports, reports)

```typescript
import { withAuth } from '@/app/api/_middleware';

// Timeout de 9s (máximo recomendado para Free Plan)
export const GET = withAuth(
  async (req, userId) => {
    const report = await generateHeavyReport(userId);
    return successResponse(report);
  },
  9000 // ← Timeout customizado em ms
);
```

⚠️ **ATENÇÃO**: Não use mais de 9000ms (9s) no Free Plan!

---

## 🔍 Detectar se Está Próximo do Timeout

Use `isNearTimeout()` para abortar operações longas:

```typescript
import { withAuth, isNearTimeout } from '@/app/api/_middleware';

export const GET = withAuth(async (req, userId) => {
  const startTime = Date.now();
  const results = [];

  for (const item of hugeList) {
    // Verificar se está em 80% do tempo (6.4s de 8s)
    if (isNearTimeout(startTime, 8000)) {
      console.warn('⏰ Próximo do timeout, retornando resultados parciais');
      return successResponse({
        partial: true,
        processed: results.length,
        total: hugeList.length,
        data: results
      });
    }

    results.push(await processItem(item));
  }

  return successResponse({ data: results });
});
```

---

## 🎯 Respostas de Timeout

### Cliente recebe 504 Gateway Timeout

```json
{
  "success": false,
  "error": "TIMEOUT",
  "message": "A operação demorou muito tempo. Tente novamente ou simplifique a requisição.",
  "details": {
    "elapsed": "8012ms",
    "limit": "8000ms",
    "path": "/api/students"
  }
}
```

### Logs do Servidor (Vercel)

```
⚠️ API lenta (auth): GET /api/students - 5234ms
❌ Erro na API (auth): {"method":"GET","path":"/api/students","elapsed":"8012ms","error":"Auth timeout após 8012ms - GET /api/students"}
```

---

## 📊 Performance Monitoring

### Log Automático de APIs Lentas

Qualquer API que demorar **>2 segundos** gera log de warning:

```
⚠️ API lenta (auth): POST /api/students - 2345ms
```

**Ação**: Investigar e otimizar.

---

## 🚨 Erros Comuns

### Erro: "API timeout após 8012ms"

**Causa**: Operação demorou mais de 8s

**Soluções**:
1. **Otimizar query** - Adicionar índices, limitar resultados
2. **Paginar** - Dividir em múltiplas requests
3. **Cache** - Salvar resultados no Supabase/Redis
4. **Background job** - Mover para workflow assíncrono

---

### Erro: "ERR_CONNECTION_RESET" no navegador

**Causa**: Vercel matou a conexão (excedeu 10s total)

**Solução**: Verificar se `vercel.json` está com `maxDuration: 10`

```json
{
  "functions": {
    "src/app/api/**/route.ts": {
      "maxDuration": 10
    }
  }
}
```

---

## ✅ Checklist de Migração

Para migrar uma API antiga:

- [ ] API já usa `withAuth()`? → **Nada a fazer, timeout já ativo!**
- [ ] API é pública (sem auth)?
  - [ ] Adicionar `import { withTimeout } from '@/app/api/_middleware'`
  - [ ] Envolver handler com `withTimeout(async (req) => { ... })`
- [ ] API demora >5 segundos?
  - [ ] Adicionar `isNearTimeout()` checks
  - [ ] Retornar resposta parcial se próximo do limite
- [ ] API é extremamente pesada?
  - [ ] Considerar mover para background job (GitHub Actions, Vercel Cron)

---

## 📚 Exemplos Práticos

### Exemplo 1: API Simples (Já Migrada)

```typescript
// ✅ JÁ ESTÁ OK - withAuth inclui timeout
export const GET = withAuth(async (req, userId) => {
  const data = await supabaseAdmin.from('students').select('*');
  return successResponse(data);
});
```

### Exemplo 2: API Pública (Precisa Migrar)

```diff
// src/app/api/health/route.ts
+ import { withTimeout } from '@/app/api/_middleware';
- export async function GET(req: NextRequest) {
+ export const GET = withTimeout(async (req: NextRequest) => {
    return NextResponse.json({ status: 'ok' });
- }
+ });
```

### Exemplo 3: API Pesada (Com Detecção)

```typescript
export const GET = withAuth(async (req, userId) => {
  const startTime = Date.now();
  const results = [];

  // Processar em batches
  const batches = chunkArray(items, 100);

  for (const batch of batches) {
    if (isNearTimeout(startTime)) {
      // Retornar parcial
      return successResponse({
        partial: true,
        data: results,
        remaining: batches.length
      });
    }

    const batchResults = await Promise.all(
      batch.map(item => processItem(item))
    );
    results.push(...batchResults);
  }

  return successResponse({ data: results });
});
```

---

## 🔧 Troubleshooting

### Como saber se minha API está lenta?

Verifique os logs do Vercel:
1. Acesse https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em "Logs"
4. Procure por `⚠️ API lenta`

### Como otimizar uma API lenta?

1. **Verificar queries Supabase**: Adicionar índices
2. **Limitar resultados**: `.limit(100)`
3. **Usar cache**: SessionStorage ou Redis
4. **Paginar**: Dividir em múltiplas requests

---

## 📖 Referências

- **Vercel Free Plan Limits**: https://vercel.com/docs/limits/overview
- **Timeout Utils**: `src/app/api/_middleware/withTimeout.ts`
- **Auth Middleware**: `src/app/api/_middleware/auth.ts`
- **Response Utils**: `src/app/api/_utils/response.ts`

---

**Última Atualização**: 2025-01-23
**Autor**: Claude Code
