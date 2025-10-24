# 🐛 FIX: Aviso "Ano letivo não encontrado" em Redes Lentas

**Data:** 24/10/2025
**Problema:** Em redes 2G/3G, aparece aviso "Dados vazios ou não encontrados. O ano letivo 2025 não estar cadastrado no sistema"
**Causa Raiz:** Timeout ou loading lento do `AcademicYearService.getAcademicYearComplete(2025)`

---

## 📋 DIAGNÓSTICO

### Fluxo Atual (Problemático)

```typescript
// useAttendanceMarking.ts (linha 181-220)
useEffect(() => {
  const fetchAcademicYearData = async () => {
    try {
      setLoadingAcademicYear(true);
      const yearData = await AcademicYearService.getAcademicYearComplete(2025);

      if (yearData && Object.keys(yearData).length > 0) {
        setAcademicYearData(yearData);
      } else {
        console.warn("⚠️ Dados vazios ou não encontrados");  // ❌ PROBLEMA!
        setAcademicYearData(null);
      }
    } catch (error) {
      setErrorMessage("Erro ao carregar dados do ano letivo.");
    } finally {
      setLoadingAcademicYear(false);
    }
  };
  fetchAcademicYearData();
}, []);
```

### Por que acontece em redes lentas?

1. **Query complexa**: `getAcademicYearComplete()` faz **4+ queries Supabase**:
   ```typescript
   // académicYearService.ts linha 620-666
   - getBimesters(2025)          // 1 query
   - getSchoolDays(bimester1)    // 1 query
   - getSchoolDays(bimester2)    // 1 query
   - getSchoolDays(bimester3)    // 1 query
   - getSchoolDays(bimester4)    // 1 query
   ───────────────────────────────────────
   TOTAL: 5 queries sequenciais (sem paralelização)
   ```

2. **Timeout do Supabase client**: 8 segundos ([supabaseClient.ts:58](src/lib/supabaseClient.ts:58))
   - Em 2G: Cada query pode levar 3-5s
   - 5 queries × 4s = **20 segundos total**
   - **Ultrapassa o timeout de 8s!**

3. **Sem retry**: Se falha, retorna `{}` vazio

---

## 🎯 SOLUÇÃO 1: Adicionar Retry com Timeout Maior (Quick Fix - 30min)

### A. Modificar `academicYearService.ts`

**Arquivo:** `src/services/supabase/academicYearService.ts`

```typescript
// ✅ ANTES (linha 620-666)
static async getAcademicYearComplete(year: number): Promise<{...}> {
  try {
    const bimesters = await this.getBimesters(year);
    // ...
    return result;
  } catch (error) {
    logger.error(`Erro ao buscar ano letivo completo ${year}`, error as Error);
    return {}; // ❌ Retorna vazio em erro
  }
}

// ✅ DEPOIS (com retry)
static async getAcademicYearComplete(year: number): Promise<{...}> {
  const { fetchWithRetry } = await import('@/utils/retry');

  try {
    // ✅ Retry com timeout de 30s (suficiente para 2G)
    const bimesters = await fetchWithRetry(
      async () => this.getBimesters(year),
      {
        retries: 3,
        minTimeout: 2000,    // 2s
        maxTimeout: 5000,    // 5s
        globalTimeout: 30000 // 30s total
      }
    );

    if (!bimesters || bimesters.length === 0) {
      logger.warn(`Nenhum bimestre encontrado para o ano ${year}`);
      return {};
    }

    const result: any = {};
    const bimesterKeys = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

    // ✅ Buscar dias letivos em PARALELO (não sequencial)
    const schoolDaysPromises = bimesters.map(async (bimester) => {
      const { data: schoolDays, error } = await supabase
        .from('school_days')
        .select('*')
        .eq('bimester_id', bimester.id)
        .order('date', { ascending: true });

      if (error) throw error;

      const bimesterKey = bimesterKeys[bimester.bimester_number - 1];
      return {
        key: bimesterKey,
        data: {
          startDate: this.convertFromISO(bimester.start_date),
          endDate: this.convertFromISO(bimester.end_date),
          dates: (schoolDays || []).map((d: any) => ({
            date: this.convertFromISO(d.date),
            isChecked: d.is_checked,
          })),
        }
      };
    });

    // ✅ Esperar TODAS as queries em paralelo
    const schoolDaysResults = await Promise.all(schoolDaysPromises);

    // Montar resultado
    schoolDaysResults.forEach(({ key, data }) => {
      result[key] = data;
    });

    return result;
  } catch (error) {
    logger.error(`Erro ao buscar ano letivo completo ${year}`, error as Error);
    // ✅ Lançar erro ao invés de retornar vazio
    throw error;
  }
}
```

**Benefícios:**
- ✅ **3 tentativas automáticas** (se falhar)
- ✅ **Queries em paralelo** (5 queries → 2 queries efetivas)
- ✅ **Timeout de 30s** (suficiente para 2G)
- ✅ **Lança erro** ao invés de retornar vazio (hook pode tratar)

**Impacto:**
- **Antes**: 5 queries × 4s = 20s sequencial → **TIMEOUT**
- **Depois**: 1 query + (4 queries em paralelo) = 4s + 4s = **8s** ✅

---

### B. Melhorar Feedback no Hook

**Arquivo:** `src/hooks/useAttendanceMarking.ts`

```typescript
// ✅ ANTES (linha 180-220) - Mostra warning mesmo em loading
useEffect(() => {
  const fetchAcademicYearData = async () => {
    try {
      setLoadingAcademicYear(true);
      const yearData = await AcademicYearService.getAcademicYearComplete(2025);

      if (yearData && Object.keys(yearData).length > 0) {
        setAcademicYearData(yearData);
      } else {
        console.warn("⚠️ Dados vazios");  // ❌ Mostra mesmo em loading lento
      }
    } catch (error) {
      setErrorMessage("Erro ao carregar dados do ano letivo.");
    } finally {
      setLoadingAcademicYear(false);
    }
  };
  fetchAcademicYearData();
}, []);

// ✅ DEPOIS - Timeout progressivo com mensagens amigáveis
useEffect(() => {
  const fetchAcademicYearData = async () => {
    let timeoutMessage: NodeJS.Timeout;

    try {
      setLoadingAcademicYear(true);
      setErrorMessage(""); // Limpa erro anterior

      // ✅ Feedback progressivo para conexões lentas
      timeoutMessage = setTimeout(() => {
        console.info("[useAttendanceMarking] ⏳ Conexão lenta detectada, aguarde...");
        // Opcional: Mostrar toast
        // toast.info("Conexão lenta detectada. Aguarde...", { duration: 5000 });
      }, 8000); // 8s

      const { AcademicYearService } = await import('@/services/supabase/academicYearService');
      const yearData = await AcademicYearService.getAcademicYearComplete(2025);

      clearTimeout(timeoutMessage); // ✅ Limpa timeout de aviso

      if (yearData && Object.keys(yearData).length > 0) {
        console.log("[useAttendanceMarking] ✅ Dados carregados com sucesso");
        setAcademicYearData(yearData);
        setErrorMessage("");
        setTimeout(() => setAcademicYearLoaded(true), 0);
      } else {
        console.warn("[useAttendanceMarking] ⚠️ Dados vazios (verificar se ano 2025 está cadastrado)");
        setAcademicYearData(null);
        setErrorMessage("Ano letivo 2025 não encontrado. Cadastre em 'Configurações'.");
        setTimeout(() => setAcademicYearLoaded(true), 0);
      }
    } catch (error) {
      clearTimeout(timeoutMessage!);
      console.error("[useAttendanceMarking] ❌ Erro no fetch", error);
      logger.error("Erro ao carregar ano letivo", error as Error);

      // ✅ Mensagem de erro mais específica
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      setErrorMessage(`Erro ao carregar ano letivo: ${errorMsg}`);
      setTimeout(() => setAcademicYearLoaded(true), 0);
    } finally {
      console.log("[useAttendanceMarking] Finalizando loading");
      setLoadingAcademicYear(false);
    }
  };

  fetchAcademicYearData();
}, []);
```

**Benefícios:**
- ✅ **Feedback progressivo** ("Conexão lenta detectada")
- ✅ **Não mostra erro** durante loading
- ✅ **Mensagem específica** se ano não cadastrado
- ✅ **Cleanup de timeouts**

---

## 🚀 SOLUÇÃO 2: Cache + API Route (Solução Definitiva - 2h)

### Por que é melhor?

1. **API Route faz queries no server-side** (Supabase Admin)
   - Sem RLS overhead
   - Conexão rápida (server-to-server)

2. **Cache agressivo**
   - Dados do ano letivo mudam raramente
   - Cache de 1 hora (ou até reiniciar app)

3. **Stored Procedure** (melhor performance)
   - 1 query ao invés de 5
   - Pré-compilado no PostgreSQL

### A. Criar API Route

**Novo arquivo:** `src/app/api/academic-years/[year]/complete/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { cache } from '@/utils/cache';

interface RouteParams {
  params: Promise<{
    year: string;
  }>;
}

// ✅ Cache de 1 hora (dados do ano letivo mudam raramente)
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

export async function GET(
  req: NextRequest,
  context: RouteParams
) {
  try {
    const params = await context.params;
    const year = parseInt(params.year);

    if (isNaN(year)) {
      return NextResponse.json(
        { success: false, error: 'Ano inválido' },
        { status: 400 }
      );
    }

    // ✅ Verificar cache primeiro
    const cacheKey = `academic-year-complete-${year}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    // ✅ Buscar bimestres
    const { data: bimesters, error: bimestersError } = await supabaseAdmin
      .from('bimesters')
      .select(`
        id,
        bimester_number,
        start_date,
        end_date,
        school_days_count,
        academic_years!inner(year)
      `)
      .eq('academic_years.year', year)
      .order('bimester_number', { ascending: true });

    if (bimestersError) {
      throw bimestersError;
    }

    if (!bimesters || bimesters.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Ano letivo ${year} não cadastrado`
      }, { status: 404 });
    }

    // ✅ Buscar dias letivos em PARALELO (não sequencial)
    const schoolDaysPromises = bimesters.map(async (bimester) => {
      const { data: schoolDays, error } = await supabaseAdmin
        .from('school_days')
        .select('date, is_checked')
        .eq('bimester_id', bimester.id)
        .order('date', { ascending: true });

      if (error) throw error;

      return {
        bimester_number: bimester.bimester_number,
        start_date: bimester.start_date,
        end_date: bimester.end_date,
        school_days: schoolDays || []
      };
    });

    const schoolDaysResults = await Promise.all(schoolDaysPromises);

    // ✅ Formatar no formato legado (compatibilidade)
    const bimesterKeys = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];
    const result: any = {};

    schoolDaysResults.forEach((bimData) => {
      const key = bimesterKeys[bimData.bimester_number - 1];
      const [year, month, day] = bimData.start_date.split('-');
      const startDate = `${day}/${month}/${year}`;
      const [year2, month2, day2] = bimData.end_date.split('-');
      const endDate = `${day2}/${month2}/${year2}`;

      result[key] = {
        startDate,
        endDate,
        dates: bimData.school_days.map((d: any) => {
          const [y, m, d2] = d.date.split('-');
          return {
            date: `${d2}/${m}/${y}`,
            isChecked: d.is_checked
          };
        })
      };
    });

    // ✅ Salvar no cache
    cache.set(cacheKey, result, CACHE_TTL);

    return NextResponse.json({
      success: true,
      data: result,
      cached: false
    });
  } catch (error) {
    console.error('Erro ao buscar ano letivo completo:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
```

### B. Modificar Service para usar API Route

**Arquivo:** `src/services/supabase/academicYearService.ts`

```typescript
// ✅ ADICIONAR método com API Route
static async getAcademicYearCompleteViaAPI(year: number): Promise<{...}> {
  const { fetchWithRetry } = await import('@/utils/retry');

  try {
    const response = await fetchWithRetry(
      () => fetch(`/api/academic-years/${year}/complete`),
      {
        retries: 3,
        minTimeout: 2000,
        maxTimeout: 5000,
        globalTimeout: 30000
      }
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erro ao buscar ano letivo');
    }

    return result.data || {};
  } catch (error) {
    logger.error(`Erro ao buscar ano letivo ${year} via API`, error as Error);
    throw error;
  }
}
```

### C. Atualizar Hook para usar nova API

**Arquivo:** `src/hooks/useAttendanceMarking.ts`

```typescript
// ✅ Trocar linha 187
// ANTES:
const yearData = await AcademicYearService.getAcademicYearComplete(2025);

// DEPOIS:
const yearData = await AcademicYearService.getAcademicYearCompleteViaAPI(2025);
```

---

## 📊 COMPARAÇÃO DE PERFORMANCE

| Métrica | Antes (Sequencial) | Solução 1 (Retry + Paralelo) | Solução 2 (API + Cache) |
|---------|-------------------|------------------------------|-------------------------|
| **Queries** | 5 sequenciais | 1 + 4 paralelos | 1 + 4 paralelos (server-side) |
| **Tempo (3G)** | 20s (timeout) | 8s | 1s (cached) / 5s (miss) |
| **Tempo (2G)** | Falha | 15s | 1s (cached) / 10s (miss) |
| **Retry** | ❌ Não | ✅ 3 tentativas | ✅ 3 tentativas |
| **Cache** | ❌ Não | ❌ Não | ✅ 1 hora |
| **RLS Overhead** | ✅ Client-side | ✅ Client-side | ❌ Server-side (Admin) |
| **Complexidade** | Baixa | Baixa | Média |
| **Tempo Impl** | - | 30min | 2h |

---

## ✅ PLANO DE AÇÃO

### Quick Fix (30 minutos) - Solução 1

1. **Modificar `academicYearService.ts`** (10min)
   - Adicionar retry com `fetchWithRetry`
   - Paralelizar queries de `school_days`
   - Timeout de 30s

2. **Melhorar feedback no hook** (10min)
   - Adicionar timeout progressivo (8s)
   - Mensagens amigáveis ("Conexão lenta detectada")
   - Cleanup de timeouts

3. **Testar em rede lenta** (10min)
   - Chrome DevTools → Network → Slow 3G
   - Verificar se mensagem de erro não aparece mais
   - Confirmar que dados carregam corretamente

### Solução Definitiva (2 horas) - Solução 2

4. **Criar API Route** (45min)
   - `/api/academic-years/[year]/complete/route.ts`
   - Cache de 1 hora
   - Queries paralelas

5. **Adicionar método no service** (15min)
   - `getAcademicYearCompleteViaAPI()`

6. **Atualizar hook** (5min)
   - Trocar chamada de método

7. **Testar exaustivamente** (30min)
   - 3G, 2G, Offline
   - Cache hit/miss
   - Erro de rede

8. **Documentar** (25min)
   - Atualizar CLAUDE.md
   - Adicionar README da API

---

## 🧪 TESTES

### Testar Rede Lenta

```bash
# Chrome DevTools
1. Abrir DevTools (F12)
2. Network tab
3. Dropdown "No throttling" → "Slow 3G"
4. Recarregar página /marcar-faltas
5. Observar console: NÃO deve aparecer warning
6. Aguardar carregamento (até 15s)
7. Verificar que dados carregam corretamente
```

### Testar Retry

```bash
# Simular falha temporária
1. DevTools → Network → Block request pattern
2. Padrão: "academic_years"
3. Aguardar 5s
4. Desbloquear
5. Verificar que retry funcionou (logs no console)
```

### Testar Cache (Solução 2)

```bash
# 1ª chamada (cache miss)
curl http://localhost:3000/api/academic-years/2025/complete
# Deve retornar: "cached": false

# 2ª chamada (cache hit)
curl http://localhost:3000/api/academic-years/2025/complete
# Deve retornar: "cached": true (instantâneo)
```

---

## 📚 REFERÊNCIAS

- **Retry Strategy**: `src/utils/retry.ts` (p-retry)
- **Cache System**: `src/utils/cache.ts`
- **Supabase Timeout**: `src/lib/supabaseClient.ts:58` (8s)
- **Academic Year Service**: `src/services/supabase/academicYearService.ts`
- **Hook Attendance Marking**: `src/hooks/useAttendanceMarking.ts`

---

**Criado em:** 24/10/2025
**Autor:** Claude Code
**Status:** ⏳ Aguardando implementação
