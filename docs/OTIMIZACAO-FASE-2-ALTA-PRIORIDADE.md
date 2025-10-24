# 🟡 FASE 2: ALTA PRIORIDADE - Service Worker + Stored Procedure

**Tempo:** 8 horas
**Impacto:** +25% sobre Fase 1 (total: 95% melhoria)
**Pré-requisito:** Fase 1 concluída

---

## 🎯 OBJETIVOS

- ✅ Eliminar N+1 Query Problem (Stored Procedure)
- ✅ Suporte offline completo (Service Worker)
- ✅ Compressão de payload (GZIP + selective fields)

---

## ✅ 2.1. CRIAR STORED PROCEDURE (4h)

### Passo 1: Criar Função SQL

Supabase Dashboard → SQL Editor:

```sql
-- Stored Procedure: Eliminação do N+1 Problem
-- Ver código completo em: OTIMIZACAO-SUPABASE-REDES-RUINS-GUIA-COMPLETO.md
-- Seção: "PROBLEMA #1"

CREATE OR REPLACE FUNCTION get_students_with_absences(
  p_month TEXT,
  p_absence_multiple INT,
  p_school_days TEXT[]
)
RETURNS TABLE(...) AS $$
-- [Código completo no guia técnico]
$$ LANGUAGE plpgsql;
```

### Passo 2: Migrar API Route

Arquivo: `src/app/api/students/absence-multiples/route.ts`

```typescript
// ❌ ANTES - 21 queries
const suspensions = await loadStudentSuspensions(studentIds);
const absences = await loadStudentAbsencesForMonth(...);
const contacts = await loadVerifiedWhatsAppContacts(...);

// ✅ DEPOIS - 1 query
const { data, error } = await supabaseAdmin.rpc('get_students_with_absences', {
  p_month: referenceMonth,
  p_absence_multiple: absenceMultiple,
  p_school_days: schoolDaysInMonth
});

if (error) {
  return errorResponse('DATABASE_ERROR', error.message, 500);
}

return successResponse({
  data,
  metadata: {
    totalStudents: data.length,
    executionTimeMs: Date.now() - startTime
  }
});
```

**Validação:**
- [ ] Função criada no Supabase
- [ ] API migrada e testada
- [ ] Tempo < 5s para 700 estudantes
- [ ] Dados corretos (comparar com versão antiga)

---

## ✅ 2.2. SERVICE WORKER + OFFLINE (4h)

### Passo 1: Criar Service Worker

Arquivo: `public/sw.js` (NOVO)

```javascript
const CACHE_NAME = 'frequencia-anual-v1';
const SUPABASE_CACHE = 'supabase-cache-v1';

// URLs para cache offline
const STATIC_URLS = ['/', '/home', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_URLS))
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Estratégia 1: Supabase - Network First (fallback cache)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(SUPABASE_CACHE).then(cache => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then(cached => {
            return cached || new Response(
              JSON.stringify({ success: false, error: 'Offline', offline: true }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // Estratégia 2: Static - Cache First
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
```

### Passo 2: Registrar Service Worker

Arquivo: `src/app/layout.tsx`

```typescript
// Adicionar no useEffect principal
useEffect(() => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('✅ Service Worker registered');
      })
      .catch(error => {
        console.error('❌ Service Worker registration failed:', error);
      });
  }
}, []);
```

**Validação:**
- [ ] Service Worker registrado
- [ ] DevTools → Application → Service Workers mostra ativo
- [ ] Testar offline: DevTools → Network → Offline
- [ ] Dados em cache funcionam

---

## ✅ 2.3. COMPRESSÃO GZIP (30min)

### Passo 1: Habilitar no Cliente

```typescript
// supabaseClient.ts - Adicionar header
global: {
  headers: {
    'Accept-Encoding': 'gzip, deflate, br',
  }
}
```

### Passo 2: Selective Fields

```typescript
// ❌ ANTES - Busca TUDO
.select('*, student_contacts(*)')

// ✅ DEPOIS - Apenas campos necessários
.select(`
  id,
  student_id,
  name,
  class,
  shift,
  status,
  student_contacts!inner(
    id,
    name,
    phone_numeric,
    can_receive_whatsapp,
    whatsapp_data
  )
`)
```

**Redução:** 5MB → 800KB (-84%)

---

## 📊 VALIDAÇÃO DA FASE 2

### Métricas Esperadas

| Métrica | Fase 1 | Fase 2 | Melhoria |
|---------|--------|--------|----------|
| Queries/request | 21 | 1 | -95% |
| Latência | 4-8s | 2-5s | -60% |
| Tráfego | 5MB | 800KB | -84% |
| Offline support | 0% | 100% | +100% |

### Checklist

- [ ] Stored procedure testada e validada
- [ ] Service Worker ativo
- [ ] Modo offline funciona
- [ ] Compressão ativa
- [ ] Payload reduzido em 80%+

---

**Versão:** 1.0.0
**Status:** ✅ Pronto para Implementação
