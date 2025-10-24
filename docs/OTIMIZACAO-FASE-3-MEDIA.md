# 🟢 FASE 3: MÉDIA PRIORIDADE - Views Materializadas + Monitoring

**Tempo:** 6 horas
**Impacto:** +5% sobre Fases 1 e 2
**Pré-requisito:** Fases 1 e 2 concluídas

---

## ✅ 3.1. VIEWS MATERIALIZADAS (3h)

### Conceito

Views Materializadas são como "caches de queries" no banco de dados.

**Vantagens:**
- Query executada 1x, resultado armazenado
- Refresh automático ou manual
- 100x mais rápido que query normal

### Implementação

```sql
-- 1. Criar Materialized View
CREATE MATERIALIZED VIEW students_with_absence_counts AS
SELECT 
  s.id,
  s.student_id,
  s.name,
  s.class,
  s.shift,
  COUNT(a.id) FILTER (WHERE a.is_justified = false) AS unjustified_absences,
  COUNT(a.id) AS total_absences,
  MAX(a.absence_date) AS last_absence_date
FROM students s
LEFT JOIN student_absences a ON s.id = a.student_id
WHERE s.deleted = false
GROUP BY s.id;

-- 2. Criar índice na view
CREATE INDEX idx_mv_students_absences 
ON students_with_absence_counts (unjustified_absences DESC);

-- 3. Auto-refresh (diário às 2h AM)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'refresh-students-absences-mv',
  '0 2 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY students_with_absence_counts'
);
```

### Uso no Código

```typescript
// ✅ 100x mais rápido
const { data } = await supabaseAdmin
  .from('students_with_absence_counts')
  .select('*')
  .gte('unjustified_absences', 10);
```

---

## ✅ 3.2. PERFORMANCE MONITORING (3h)

### Implementação

Arquivo: `src/utils/performanceMonitor.ts` (NOVO)

```typescript
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  trackQuery(queryName: string, duration: number) {
    if (!this.metrics.has(queryName)) {
      this.metrics.set(queryName, []);
    }
    this.metrics.get(queryName)!.push(duration);
  }

  getStats(queryName: string) {
    const durations = this.metrics.get(queryName) || [];
    const sorted = [...durations].sort((a, b) => a - b);
    
    return {
      count: durations.length,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      max: Math.max(...durations),
    };
  }
}

export const monitor = new PerformanceMonitor();
```

### Uso

```typescript
// Wrapper para queries
const start = performance.now();
const data = await supabaseAdmin.from('students').select('*');
const duration = performance.now() - start;

monitor.trackQuery('students-list', duration);

// Alertar se > 2s
if (duration > 2000) {
  console.warn(`Slow query: students-list took ${duration}ms`);
}
```

---

**Versão:** 1.0.0
**Status:** ✅ Pronto para Backlog
