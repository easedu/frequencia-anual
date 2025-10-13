# 📚 Migração: Ano Letivo (Firebase → Supabase)

## 📊 Visão Geral

Migração da estrutura de ano letivo de um documento Firebase para tabelas relacionais no Supabase PostgreSQL.

**Status**: ✅ Schema criado | ⏳ Dados pendentes de migração

---

## 🔄 Comparação: Firebase vs Supabase

### **Firebase** (Estrutura Atual)

```
Collection: 2025
Document: ano_letivo
{
  "1º Bimestre": {
    startDate: "2025-02-03",
    endDate: "2025-04-25",
    dates: [
      { date: "2025-02-03", isChecked: true },
      { date: "2025-02-04", isChecked: true },
      { date: "2025-02-05", isChecked: false },
      ...
    ]
  },
  "2º Bimestre": { ... },
  "3º Bimestre": { ... },
  "4º Bimestre": { ... }
}
```

**Características**:
- ❌ Documento único (não escala para múltiplos anos)
- ❌ Array de objetos (dificulta queries)
- ❌ Chaves não padronizadas ("1º Bimestre", "2º Bimestre")
- ❌ Sem validação de integridade
- ❌ Sem contagens automáticas
- ✅ Leitura rápida (1 query)

---

### **Supabase** (Estrutura Nova)

```
Table: academic_years
┌──────────┬────────────┬────────────┬───────────────────┐
│ id       │ year       │ start_date │ total_school_days │
├──────────┼────────────┼────────────┼───────────────────┤
│ uuid     │ 2025       │ 2025-02-03 │ 200               │
└──────────┴────────────┴────────────┴───────────────────┘

Table: bimesters
┌──────────┬──────────────────┬─────────────────┬────────────┬───────────────────┐
│ id       │ academic_year_id │ bimester_number │ start_date │ school_days_count │
├──────────┼──────────────────┼─────────────────┼────────────┼───────────────────┤
│ uuid-1   │ uuid-ay          │ 1               │ 2025-02-03 │ 54                │
│ uuid-2   │ uuid-ay          │ 2               │ 2025-04-28 │ 42                │
│ uuid-3   │ uuid-ay          │ 3               │ 2025-07-21 │ 52                │
│ uuid-4   │ uuid-ay          │ 4               │ 2025-10-06 │ 52                │
└──────────┴──────────────────┴─────────────────┴────────────┴───────────────────┘

Table: school_days
┌──────────┬──────────────┬────────────┬────────────┐
│ id       │ bimester_id  │ date       │ is_checked │
├──────────┼──────────────┼────────────┼────────────┤
│ uuid-1   │ uuid-b1      │ 2025-02-03 │ true       │
│ uuid-2   │ uuid-b1      │ 2025-02-04 │ true       │
│ uuid-3   │ uuid-b1      │ 2025-02-05 │ false      │
│ ...      │ ...          │ ...        │ ...        │
└──────────┴──────────────┴────────────┴────────────┘
```

**Características**:
- ✅ Normalizado (escala para múltiplos anos)
- ✅ Queries SQL poderosas
- ✅ Chaves numéricas padronizadas (1, 2, 3, 4)
- ✅ Foreign keys (integridade referencial)
- ✅ Triggers automáticos (contagens)
- ✅ Views e functions utilitárias
- ⚠️ Leitura requer JOINs (mitigado com views)

---

## 🗄️ Schema Detalhado

### **academic_years**

Armazena informações gerais de cada ano letivo.

| Coluna            | Tipo         | Descrição                                    |
|-------------------|--------------|----------------------------------------------|
| id                | UUID         | PK, gerado automaticamente                   |
| year              | INTEGER      | Ano letivo (ex: 2025), UNIQUE               |
| start_date        | DATE         | Data de início do ano letivo                 |
| end_date          | DATE         | Data de término do ano letivo                |
| total_school_days | INTEGER      | Total de dias letivos (soma dos bimestres)   |
| created_at        | TIMESTAMPTZ  | Data de criação                              |
| updated_at        | TIMESTAMPTZ  | Data de última atualização                   |

**Constraints**:
- `valid_year`: year >= 2020 AND year <= 2100
- `valid_dates`: end_date > start_date
- `UNIQUE(year)`: Apenas um registro por ano

**Triggers**:
- `update_updated_at_column`: Atualiza updated_at automaticamente
- `trigger_update_academic_year_total_*`: Atualiza total_school_days quando bimesters mudam

---

### **bimesters**

Armazena os períodos de cada bimestre.

| Coluna             | Tipo         | Descrição                                    |
|--------------------|--------------|----------------------------------------------|
| id                 | UUID         | PK, gerado automaticamente                   |
| academic_year_id   | UUID         | FK → academic_years(id), CASCADE             |
| bimester_number    | INTEGER      | Número do bimestre (1, 2, 3 ou 4)           |
| start_date         | DATE         | Data de início do bimestre                   |
| end_date           | DATE         | Data de término do bimestre                  |
| school_days_count  | INTEGER      | Total de dias letivos marcados (isChecked)   |
| created_at         | TIMESTAMPTZ  | Data de criação                              |
| updated_at         | TIMESTAMPTZ  | Data de última atualização                   |

**Constraints**:
- `valid_bimester_number`: bimester_number >= 1 AND <= 4
- `valid_bimester_dates`: end_date > start_date
- `UNIQUE(academic_year_id, bimester_number)`: Um bimestre por ano

**Triggers**:
- `update_updated_at_column`: Atualiza updated_at automaticamente
- `trigger_update_bimester_count_*`: Atualiza school_days_count quando school_days mudam

**Indexes**:
- `idx_bimesters_academic_year`: ON (academic_year_id)
- `idx_bimesters_year_number`: ON (academic_year_id, bimester_number)

---

### **school_days**

Armazena cada dia letivo individualmente (equivalente ao array `dates[]` do Firebase).

| Coluna       | Tipo         | Descrição                                    |
|--------------|--------------|----------------------------------------------|
| id           | UUID         | PK, gerado automaticamente                   |
| bimester_id  | UUID         | FK → bimesters(id), CASCADE                  |
| date         | DATE         | Data do dia letivo (ISO: YYYY-MM-DD)         |
| is_checked   | BOOLEAN      | Se o dia é válido (isChecked do Firebase)    |
| created_at   | TIMESTAMPTZ  | Data de criação                              |
| updated_at   | TIMESTAMPTZ  | Data de última atualização                   |

**Constraints**:
- `UNIQUE(bimester_id, date)`: Um registro por dia em cada bimestre

**Triggers**:
- `update_updated_at_column`: Atualiza updated_at automaticamente
- `trigger_update_bimester_count_*`: Atualiza school_days_count no bimester pai

**Indexes**:
- `idx_school_days_bimester`: ON (bimester_id)
- `idx_school_days_date`: ON (date)
- `idx_school_days_is_checked`: ON (is_checked)
- `idx_school_days_bimester_checked`: ON (bimester_id, is_checked) ← **Performance critical**

---

## 🔍 Views e Functions

### **View: v_school_days_detail**

Dias letivos com informações completas de bimestre e ano.

```sql
SELECT * FROM v_school_days_detail
WHERE academic_year = 2025
  AND bimester_number = 1
  AND is_checked = TRUE
ORDER BY date;
```

**Colunas**:
- id, date, is_checked (de school_days)
- bimester_number, bimester_start, bimester_end (de bimesters)
- academic_year, academic_year_id, bimester_id (joins)

---

### **View: v_bimester_summary**

Resumo de cada bimestre com contagens de dias.

```sql
SELECT * FROM v_bimester_summary
WHERE academic_year = 2025;
```

**Colunas**:
- id, bimester_number, start_date, end_date (de bimesters)
- school_days_count (de bimesters.school_days_count)
- academic_year, academic_year_id (de academic_years)
- total_days_in_range (COUNT de school_days)
- checked_days (COUNT WHERE is_checked = TRUE)

---

### **Function: get_school_days_in_period**

Conta dias letivos (isChecked=true) em um período específico.

```sql
SELECT get_school_days_in_period('2025-02-03', '2025-04-25', 2025);
-- Retorna: 54 (dias do 1º bimestre)

SELECT get_school_days_in_period('2025-02-03', '2025-12-19', 2025);
-- Retorna: 200 (ano inteiro)
```

**Parâmetros**:
- `p_start_date`: Data de início (DATE)
- `p_end_date`: Data de fim (DATE)
- `p_year`: Ano letivo (INTEGER, default: ano atual)

**Retorno**: INTEGER (quantidade de dias)

---

### **Function: get_school_days_up_to_today**

Conta dias letivos até a data atual.

```sql
SELECT get_school_days_up_to_today(2025);
-- Retorna: Depende da data atual (ex: 156 em 10/01/2025)
```

**Parâmetros**:
- `p_year`: Ano letivo (INTEGER, default: ano atual)

**Retorno**: INTEGER (quantidade de dias)

---

## 🔐 Row Level Security (RLS)

### **Policies Atuais (Desenvolvimento)**

**Status**: ✅ Ativas e permissivas

```sql
-- academic_years
CREATE POLICY "Allow all for development - academic_years"
  ON academic_years FOR ALL
  USING (true) WITH CHECK (true);

-- bimesters
CREATE POLICY "Allow all for development - bimesters"
  ON bimesters FOR ALL
  USING (true) WITH CHECK (true);

-- school_days
CREATE POLICY "Allow all for development - school_days"
  ON school_days FOR ALL
  USING (true) WITH CHECK (true);
```

**⚠️ IMPORTANTE**: Estas policies permitem acesso total. Em produção, substituir por policies baseadas em autenticação.

---

### **Policies Sugeridas para Produção**

```sql
-- academic_years: Todos leem, apenas admins escrevem
CREATE POLICY "Anyone can read academic years"
  ON academic_years FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify academic years"
  ON academic_years FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- bimesters: Mesma lógica
CREATE POLICY "Anyone can read bimesters"
  ON bimesters FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify bimesters"
  ON bimesters FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- school_days: Mesma lógica
CREATE POLICY "Anyone can read school days"
  ON school_days FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify school days"
  ON school_days FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_users));
```

---

## 📊 Performance

### **Queries Otimizadas**

#### 1. Buscar dias letivos de um bimestre
```sql
-- ✅ BOM: Usa index idx_school_days_bimester_checked
SELECT date
FROM school_days
WHERE bimester_id = 'uuid-do-bimestre'
  AND is_checked = TRUE
ORDER BY date;
```

#### 2. Buscar total de dias de um ano
```sql
-- ✅ MELHOR: Usa coluna desnormalizada (atualizada por trigger)
SELECT total_school_days
FROM academic_years
WHERE year = 2025;

-- ✅ BOM: Usa index idx_bimesters_academic_year
SELECT SUM(school_days_count)
FROM bimesters
WHERE academic_year_id = (SELECT id FROM academic_years WHERE year = 2025);
```

#### 3. Buscar dias em período customizado
```sql
-- ✅ MELHOR: Usa function otimizada
SELECT get_school_days_in_period('2025-02-03', '2025-06-27', 2025);

-- ✅ BOM: Query manual (se precisar dos detalhes)
SELECT COUNT(*)
FROM school_days sd
JOIN bimesters b ON sd.bimester_id = b.id
JOIN academic_years ay ON b.academic_year_id = ay.id
WHERE ay.year = 2025
  AND sd.date >= '2025-02-03'
  AND sd.date <= '2025-06-27'
  AND sd.is_checked = TRUE;
```

---

### **Indexes Críticos**

| Index                               | Tabela       | Uso                                          |
|-------------------------------------|--------------|----------------------------------------------|
| `idx_school_days_bimester_checked`  | school_days  | **CRÍTICO** - Filtro por bimestre e marcado  |
| `idx_bimesters_year_number`         | bimesters    | Buscar bimestre específico de um ano         |
| `idx_school_days_date`              | school_days  | Queries por período de datas                 |

---

## 🚀 Migração de Dados

### **Script de Migração**

**Arquivo**: `scripts/migrate-academic-year-to-supabase.mjs`

**Fluxo**:
1. Busca `2025/ano_letivo` do Firebase
2. Extrai 4 bimestres e seus arrays de dates
3. Insere em `academic_years` (1 row)
4. Insere em `bimesters` (4 rows)
5. Insere em `school_days` (N rows, um por cada date)
6. Verifica contagens finais

**Resultado Esperado**:
```
academic_years: 1 row
bimesters: 4 rows
school_days: ~200+ rows
Total dias letivos marcados: 200
```

---

## 🔧 Service Layer

### **academicYearService.ts** (A ser criado)

```typescript
export class AcademicYearService {
  // Buscar ano letivo com bimestres
  static async getAcademicYear(year: number): Promise<AcademicYear>;

  // Buscar bimestres de um ano
  static async getBimesters(year: number): Promise<Bimester[]>;

  // Buscar dias letivos de um bimestre
  static async getSchoolDays(bimesterId: string): Promise<SchoolDay[]>;

  // Contar dias letivos em período
  static async countSchoolDaysInPeriod(
    startDate: string,
    endDate: string,
    year: number
  ): Promise<number>;

  // Contar dias letivos até hoje
  static async countSchoolDaysUpToToday(year: number): Promise<number>;
}
```

---

## 🎯 Hooks a Atualizar

### **useBimesterPeriods.ts**

**Antes** (Firebase):
```typescript
const { data: anoLetivoData } = useFirebaseDoc('2025/ano_letivo');
// Processa chaves "1º Bimestre", "2º Bimestre", etc.
```

**Depois** (Supabase):
```typescript
const { data: bimesters } = useQuery({
  queryKey: ['bimesters', 2025],
  queryFn: () => AcademicYearService.getBimesters(2025)
});
// Array já ordenado por bimester_number
```

---

### **useSchoolDays.ts**

**Antes** (Firebase):
```typescript
const { data: anoLetivoData } = useFirebaseDoc('2025/ano_letivo');
// Filtra arrays dates por isChecked
```

**Depois** (Supabase):
```typescript
const { data: schoolDays } = useQuery({
  queryKey: ['schoolDays', bimesterId],
  queryFn: () => AcademicYearService.getSchoolDays(bimesterId)
});
// Já filtrado is_checked = TRUE
```

---

## ✅ Checklist de Migração

- [ ] **PASSO 1**: Executar `003_academic_year.sql` no Supabase Dashboard
- [ ] **PASSO 2**: Verificar tables criadas (academic_years, bimesters, school_days)
- [ ] **PASSO 3**: Executar `migrate-academic-year-to-supabase.mjs`
- [ ] **PASSO 4**: Verificar dados migrados (contagens corretas)
- [ ] **PASSO 5**: Criar `src/services/supabase/academicYearService.ts`
- [ ] **PASSO 6**: Atualizar `useBimesterPeriods.ts` para usar Supabase
- [ ] **PASSO 7**: Atualizar `useSchoolDays.ts` para usar Supabase
- [ ] **PASSO 8**: Testar `src/app/controlar-faltas/page.tsx`
- [ ] **PASSO 9**: Validar contagens (200 dias letivos, bimestres corretos)
- [ ] **PASSO 10**: Remover dependências do Firebase (opcional)

---

## 📚 Referências

- **Migration SQL**: `supabase-migrations/003_academic_year.sql`
- **Script de Dados**: `scripts/migrate-academic-year-to-supabase.mjs`
- **Instruções**: `EXECUTAR-MIGRATION-ANO-LETIVO.md`
- **Estrutura Firebase Original**: `2025/ano_letivo`

---

**Última atualização**: 2025-01-10
**Versão**: 1.0.0
**Status**: ⏳ Aguardando execução da migração
