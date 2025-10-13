# 🚀 Guia Passo a Passo: Migração Firebase → Supabase

> **Data de início**: 2025-10-11
> **Tempo estimado**: 30-40 horas em 2-3 semanas
> **Nível de confiança atual**: 90% (backup validado)

---

## 📊 SITUAÇÃO ATUAL

### ✅ O que já temos

- **Backup completo validado**: `firestore-backup-2025-10-11.json`
- **Dados confirmados**:
  - 739 estudantes
  - 1,313 interações (31 V3 + 1,265 V1 + 17 V1 família)
  - 333 tarefas
  - 1,427 números WhatsApp
  - 17 usuários
- **Estatísticas**: 3,803 documentos totais
- **Validação**: Todos os checks críticos passaram ✅

### ⏳ Próximos passos

1. **HOJE**: Setup e preparação (4h)
2. **AMANHÃ 04:00 AM+**: Discovery completo + Consolidação
3. **Dia 3-4**: Importação para Supabase
4. **Semana 2-3**: Migração gradual

---

## 🔧 FASE 0: PREPARAÇÃO (HOJE - 4h)

### Passo 1: Instalar Dependências (15min)

```bash
# 1. Instalar Supabase SDK
npm install @supabase/supabase-js

# 2. Instalar utilitários
npm install date-fns

# 3. Instalar Supabase CLI globalmente
npm install -g supabase

# 4. Fazer login
supabase login
```

**Como fazer login no Supabase CLI**:
- Executar `supabase login`
- Abrirá navegador para gerar token
- Copiar token e colar no terminal

---

### Passo 2: Criar Projeto Supabase (15min)

#### 2.1 Via Dashboard

1. Acesse: https://supabase.com/dashboard
2. Clique em "New Project"
3. Configurações:
   - **Name**: `frequencia-anual`
   - **Database Password**: _(guarde em segurança!)_
   - **Region**: `South America (São Paulo)`
   - **Pricing Plan**: `Free`
4. Clique em "Create new project"
5. Aguarde ~2 minutos (provisionamento)

#### 2.2 Obter Credenciais

Após criação, copie:

```bash
# Em: Settings → API

# Project URL
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co

# anon (public) key
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# service_role key (NUNCA expor no cliente!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

#### 2.3 Salvar em .env.local

```bash
# Criar arquivo .env.local
cat >> .env.local << 'EOF'

# ═══════════════════════════════════════════════════════════
# SUPABASE
# ═══════════════════════════════════════════════════════════

NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Feature flags (desligado durante migração)
NEXT_PUBLIC_USE_SUPABASE_READS=false
NEXT_PUBLIC_USE_SUPABASE_WRITES=false

EOF
```

---

### Passo 3: Criar Cliente Supabase (30min)

#### 3.1 Cliente para o Navegador

```typescript
// src/lib/supabaseClient.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types para o Database (gerados depois do schema)
export type Database = {
  public: {
    Tables: {
      estudantes: {
        Row: {
          id: string
          estudante_id: string
          nome: string
          turma: string
          // ... outros campos
        }
        Insert: Omit<Database['public']['Tables']['estudantes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['estudantes']['Insert']>
      }
      // ... outras tabelas
    }
  }
}
```

#### 3.2 Cliente para Server-Side (com service_role)

```typescript
// src/lib/supabaseAdmin.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase service role key')
}

// ATENÇÃO: Apenas usar em server-side (API routes, Server Components)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
```

---

### Passo 4: Definir Schema SQL (2h)

**Já criamos um schema completo em** `docs/SCHEMA-SQL-SUPABASE.md`.

Vou criar a migration inicial:

```bash
# 1. Inicializar Supabase localmente
supabase init

# 2. Link com projeto remoto
supabase link --project-ref xxxxx

# 3. Criar migration inicial
supabase migration new initial_schema
```

Isso cria: `supabase/migrations/XXXXXXX_initial_schema.sql`

**Copiar o schema completo para esse arquivo** (vou criar abaixo).

---

### Passo 5: Aplicar Schema no Supabase (30min)

```bash
# 1. Aplicar migration remotamente
supabase db push

# 2. Verificar se tabelas foram criadas
supabase db dump --schema public

# 3. Abrir no Dashboard
# Supabase Dashboard → Table Editor → Ver todas as tabelas
```

**Esperado**: Ver todas as tabelas criadas:
- `estudantes`
- `contatos`
- `absences`
- `atestados`
- `interacoes_familia`
- `user_tasks`
- `users`
- `whatsapp_verified_numbers`

---

### Passo 6: Configurar RLS (Row Level Security) (30min)

O schema já inclui políticas RLS básicas. Verificar:

```sql
-- Ver políticas ativas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

**Política padrão** (já aplicada):
- Usuários autenticados: leitura completa
- Apenas admins: escrita

---

### Passo 7: Testar Conexão (15min)

Criar página de teste:

```typescript
// src/app/test-supabase/page.tsx

'use client'

import { supabase } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'

export default function TestSupabasePage() {
  const [result, setResult] = useState<string>('Testando...')

  useEffect(() => {
    async function test() {
      try {
        // Testar conexão básica
        const { data, error } = await supabase.from('estudantes').select('count')

        if (error) throw error

        setResult(`✅ Conexão OK! Total de estudantes: ${data?.[0]?.count || 0}`)
      } catch (error: any) {
        setResult(`❌ Erro: ${error.message}`)
      }
    }

    test()
  }, [])

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Teste de Conexão Supabase</h1>
      <pre className="bg-gray-100 p-4 rounded">{result}</pre>
    </div>
  )
}
```

Acessar: http://localhost:3000/test-supabase

---

## ✅ CHECKLIST - FASE 0 (PREPARAÇÃO)

- [ ] Dependências instaladas (`@supabase/supabase-js`, `date-fns`)
- [ ] Supabase CLI instalado e logado
- [ ] Projeto Supabase criado
- [ ] Credenciais salvas em `.env.local`
- [ ] Cliente Supabase criado (`src/lib/supabaseClient.ts`)
- [ ] Cliente Admin criado (`src/lib/supabaseAdmin.ts`)
- [ ] Schema SQL aplicado (todas as tabelas criadas)
- [ ] RLS configurado
- [ ] Teste de conexão passou ✅

---

## 🌅 AMANHÃ (04:00 AM+): DISCOVERY + CONSOLIDAÇÃO

### Passo 1: Discovery Completo (5 min, ~5-10k reads)

```bash
# EXECUTAR ASSIM QUE QUOTA RESETAR (04:00 AM)
node scripts/discover-all-collections.mjs
```

**Output**: `firestore-schema-admin-sdk.json`

---

### Passo 2: Comparar Schemas (instantâneo, 0 reads)

```bash
node scripts/compare-schemas.mjs
```

**Output**:
```
✅ BACKUP COMPLETO! (se nada faltar)

OU

⚠️ FALTANDO X COLEÇÕES:
   ❌ nome-da-colecao-1
   ❌ nome-da-colecao-2
```

---

### Passo 3: Backup Complementar (se necessário)

Se `compare-schemas` encontrar coleções faltantes:

```bash
# Gerar backup apenas das coleções faltantes
node scripts/backup-complementar.mjs

# Fazer merge com backup principal
node scripts/merge-backups.mjs
```

---

### Passo 4: Consolidação de Dados (8h)

Executar scripts de consolidação (já criados):

```bash
# 1. Inventário
node scripts/consolidacao/01-inventario.mjs > output/relatorios/inventario.json

# 2. Duplicatas
node scripts/consolidacao/02-identificar-duplicatas.mjs > output/relatorios/duplicatas.json

# 3. Mapear V2→V3
node scripts/consolidacao/03-mapear-v2-v3.mjs > output/relatorios/mapeamento.json

# 4. Consolidar dados
node scripts/consolidacao/04-consolidar-estudantes.mjs
node scripts/consolidacao/05-consolidar-contatos.mjs
node scripts/consolidacao/06-consolidar-absences.mjs
node scripts/consolidacao/07-consolidar-atestados.mjs

# 5. Validar
node scripts/consolidacao/08-relatorio-validacao.mjs > output/relatorios/validacao.json

# 6. Corrigir problemas (se houver)
node scripts/consolidacao/09-correcao-interativa.mjs

# 7. Gerar SQL
node scripts/consolidacao/10-gerar-sql.mjs
```

**Output**: `output/sql/import.sql` (SQL completo de importação)

---

## 📥 DIA 3-4: IMPORTAÇÃO PARA SUPABASE

### Passo 1: Importar Dados (4h)

```bash
# Dividir SQL em batches (evitar timeout)
node scripts/migracao/dividir-sql-batches.mjs

# Importar batch por batch
supabase db execute --file output/sql/import-batch-01.sql
supabase db execute --file output/sql/import-batch-02.sql
supabase db execute --file output/sql/import-batch-03.sql
# ...
```

---

### Passo 2: Validar Integridade (1h)

```bash
# Script de validação
node scripts/migracao/validar-integridade-supabase.mjs
```

Verificações:
- ✅ Quantidade de registros igual ao consolidado
- ✅ IDs únicos
- ✅ Foreign keys válidas
- ✅ Datas corretas

---

### Passo 3: Testes Manuais (1h)

```sql
-- Query de teste 1: Total de estudantes por turma
SELECT turma, COUNT(*) AS total
FROM estudantes
WHERE status = 'ATIVO'
GROUP BY turma
ORDER BY turma;

-- Query de teste 2: Top 10 estudantes com mais faltas
SELECT e.nome, e.turma, COUNT(a.id) AS total_faltas
FROM estudantes e
LEFT JOIN absences a ON a.estudante_id = e.id
WHERE e.status = 'ATIVO'
GROUP BY e.id, e.nome, e.turma
ORDER BY total_faltas DESC
LIMIT 10;

-- Query de teste 3: Estudantes sem contatos (problema!)
SELECT e.id, e.nome, e.turma
FROM estudantes e
LEFT JOIN contatos c ON c.estudante_id = e.id
WHERE c.id IS NULL
  AND e.status = 'ATIVO';
```

**Comparar resultados com Firebase** (devem ser idênticos!)

---

## 🎯 PRÓXIMAS FASES (SEMANA 2-3)

- **Fase 4**: Dual-Write (Firebase + Supabase) (6h)
- **Fase 5**: Migração de Auth (6h)
- **Fase 6**: Cutover Gradual (10h)
- **Fase 7**: Desligamento Firebase (2h)

**Documentação completa**: `docs/ESTRATEGIA-MIGRACAO-SUPABASE.md`

---

## 📞 SUPORTE E REFERÊNCIAS

### Documentos de Referência

1. `ANALISE-SITUACAO-ATUAL.md` - Estado atual do Firebase
2. `SCHEMA-SQL-SUPABASE.md` - Schema completo do Supabase
3. `PLANO-CONSOLIDACAO-DADOS.md` - Consolidação de dados
4. `ESTRATEGIA-MIGRACAO-SUPABASE.md` - Estratégia completa
5. Este documento - Guia passo a passo

### Links Úteis

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Supabase Docs**: https://supabase.com/docs
- **Supabase CLI**: https://supabase.com/docs/guides/cli
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

---

## 🚨 TROUBLESHOOTING

### Erro: "Missing Supabase environment variables"
**Solução**: Verificar se `.env.local` está configurado corretamente

### Erro: "relation estudantes does not exist"
**Solução**: Schema não aplicado. Executar `supabase db push`

### Erro: "timeout" ao importar SQL
**Solução**: Dividir em batches menores (100 registros por batch)

### Erro: "row level security policy violation"
**Solução**: Desabilitar RLS temporariamente durante importação:
```sql
ALTER TABLE estudantes DISABLE ROW LEVEL SECURITY;
-- Importar dados
ALTER TABLE estudantes ENABLE ROW LEVEL SECURITY;
```

---

**Status**: ✅ Guia completo criado
**Próximo passo**: Executar Fase 0 (Preparação)
**Tempo estimado da Fase 0**: 4 horas
**Você pode começar HOJE!** 🚀
