# 🚀 Estratégia de Migração: Firebase → Supabase

> **Abordagem**: Migração faseada, gradual, com zero downtime
> **Tempo estimado**: 30-40 horas de trabalho distribuídas em 2-3 semanas
> **Risco**: Baixo (com rollback em cada fase)

---

## 🎯 VISÃO GERAL

### Filosofia da Migração

```
NÃO É: Big Bang (tudo de uma vez)
É: Strangler Fig Pattern (substituição gradual)

┌──────────────┐
│   Firebase   │  ← Sistema atual
│  (100% ativo) │
└──────────────┘
       ↓
┌──────────────┐     ┌──────────────┐
│   Firebase   │ ←→  │   Supabase   │
│    (90%)     │     │     (10%)    │
└──────────────┘     └──────────────┘
       ↓
┌──────────────┐     ┌──────────────┐
│   Firebase   │     │   Supabase   │
│    (50%)     │ ←→  │     (50%)    │
└──────────────┘     └──────────────┘
       ↓
┌──────────────┐     ┌──────────────┐
│   Firebase   │     │   Supabase   │
│    (10%)     │  →  │     (90%)    │
└──────────────┘     └──────────────┘
       ↓
                     ┌──────────────┐
                     │   Supabase   │
                     │    (100%)    │
                     └──────────────┘
```

---

## 📅 CRONOGRAMA GERAL

| Fase | Duração | Esforço | Risco | Rollback |
|------|---------|---------|-------|----------|
| **Fase 0: Preparação** | 3 dias | 8h | 🟢 Baixo | Fácil |
| **Fase 1: Consolidação** | 2 dias | 8h | 🟢 Baixo | N/A |
| **Fase 2: Setup Supabase** | 1 dia | 4h | 🟢 Baixo | Fácil |
| **Fase 3: Importação Dados** | 1 dia | 4h | 🟡 Médio | Médio |
| **Fase 4: Dual-Write** | 3 dias | 6h | 🟡 Médio | Fácil |
| **Fase 5: Migração Auth** | 2 dias | 6h | 🟡 Médio | Difícil |
| **Fase 6: Cutover Gradual** | 5 dias | 10h | 🟡 Médio | Médio |
| **Fase 7: Desligamento Firebase** | 1 dia | 2h | 🔴 Alto | Difícil |
| **TOTAL** | **~3 semanas** | **48h** | 🟡 Médio | - |

---

## 🔧 FASE 0: PREPARAÇÃO (8h)

### Objetivos
- ✅ Ambiente local configurado
- ✅ Scripts de consolidação prontos
- ✅ Backup completo do Firebase

### Tarefas

#### 0.1 Backup Completo (2h)

```bash
# 1. Export via Firebase Console
# Firebase Console → Firestore → Import/Export → Export
# Download: firebase-export-YYYYMMDD.zip

# 2. Backup local com Emulators
npm run emulators:export

# 3. Backup de autenticação
# Firebase Console → Authentication → Users → Export
# Download: users-backup.json

# Resultado:
backup/
├── firebase-export-20251010.zip
├── firebase-data/                 # Emulators data
└── auth-users-20251010.json
```

#### 0.2 Setup Ferramentas (2h)

```bash
# 1. Instalar dependências de consolidação
npm install uuid date-fns

# 2. Criar estrutura de scripts
mkdir -p scripts/consolidacao
mkdir -p scripts/migracao
mkdir -p output/{consolidado,sql,relatorios}

# 3. Configurar Supabase CLI
npm install -g supabase
supabase login

# 4. Testar conectividade Supabase
supabase projects list
```

#### 0.3 Criar Scripts de Consolidação (4h)

```bash
# Implementar os 10 scripts do PLANO-CONSOLIDACAO-DADOS.md

scripts/consolidacao/
├── 01-inventario.mjs
├── 02-identificar-duplicatas.mjs
├── 03-mapear-v2-v3.mjs
├── 04-consolidar-estudantes.mjs
├── 05-consolidar-contatos.mjs
├── 06-consolidar-absences.mjs
├── 07-consolidar-atestados.mjs
├── 08-relatorio-validacao.mjs
├── 09-correcao-interativa.mjs
└── 10-gerar-sql.mjs
```

### Critérios de Sucesso
- [ ] Backup completo criado e verificado
- [ ] Scripts de consolidação testados localmente
- [ ] Output de exemplo gerado com sucesso

---

## 🧹 FASE 1: CONSOLIDAÇÃO DE DADOS (8h)

### Objetivos
- ✅ Dados limpos e consolidados
- ✅ Relatório de validação 100%
- ✅ SQL de importação gerado

### Tarefas

#### 1.1 Executar Consolidação (6h)

```bash
# 1. Inventário completo
node scripts/consolidacao/01-inventario.mjs > output/relatorios/inventario.json

# 2. Identificar duplicatas
node scripts/consolidacao/02-identificar-duplicatas.mjs > output/relatorios/duplicatas.json

# 3. Mapear V2→V3
node scripts/consolidacao/03-mapear-v2-v3.mjs > output/relatorios/mapeamento.json

# 4. Consolidar tudo
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

#### 1.2 Revisão Manual (2h)

```bash
# Revisar relatórios
cat output/relatorios/validacao.json

# Verificar SQL gerado
head -n 100 output/sql/import.sql

# Validar integridade
# - Todos os estudantes têm ID?
# - Contatos referenciam estudantes válidos?
# - Faltas referenciam estudantes válidos?
```

### Critérios de Sucesso
- [ ] Relatório de validação sem erros críticos
- [ ] SQL gerado passa em validação de sintaxe
- [ ] Backup do consolidado criado

---

## 🏗️ FASE 2: SETUP SUPABASE (4h)

### Objetivos
- ✅ Projeto Supabase criado
- ✅ Schema SQL aplicado
- ✅ RLS configurado

### Tarefas

#### 2.1 Criar Projeto (30min)

```bash
# 1. Criar projeto no Supabase Dashboard
# https://supabase.com/dashboard

Nome: frequencia-anual
Região: South America (São Paulo)
Plano: Free

# 2. Configurar conexão local
echo "DATABASE_URL=postgresql://..." > .env.supabase
```

#### 2.2 Aplicar Schema (2h)

```bash
# 1. Criar migration inicial
supabase migration new initial_schema

# 2. Copiar SQL do SCHEMA-SQL-SUPABASE.md
cp docs/SCHEMA-SQL-SUPABASE.md supabase/migrations/XXXXXXX_initial_schema.sql

# 3. Aplicar migration
supabase db push

# 4. Verificar tabelas criadas
supabase db dump --schema public
```

#### 2.3 Configurar Auth e RLS (1.5h)

```bash
# 1. Configurar provedores de auth
# Supabase Dashboard → Authentication → Providers
# Ativar: Email/Password

# 2. Aplicar políticas RLS
# (já incluídas no schema SQL)

# 3. Criar usuário admin de teste
# Supabase Dashboard → Authentication → Users → Add User
```

### Critérios de Sucesso
- [ ] Todas as tabelas criadas sem erro
- [ ] RLS habilitado em todas as tabelas
- [ ] Usuário de teste criado

---

## 📥 FASE 3: IMPORTAÇÃO DE DADOS (4h)

### Objetivos
- ✅ Dados consolidados importados no Supabase
- ✅ Integridade validada
- ✅ Dados testados

### Tarefas

#### 3.1 Importar via SQL (2h)

```bash
# 1. Importar em batches (evitar timeout)
supabase db execute --file output/sql/import-batched-01.sql
supabase db execute --file output/sql/import-batched-02.sql
supabase db execute --file output/sql/import-batched-03.sql

# 2. Verificar quantidade de registros
psql $DATABASE_URL -c "
  SELECT 'estudantes' AS tabela, COUNT(*) AS total FROM estudantes
  UNION ALL
  SELECT 'contatos', COUNT(*) FROM contatos
  UNION ALL
  SELECT 'absences', COUNT(*) FROM absences
  UNION ALL
  SELECT 'atestados', COUNT(*) FROM atestados;
"
```

#### 3.2 Validar Integridade (1h)

```bash
# Script de validação
node scripts/migracao/validar-integridade-supabase.mjs

# Verifica:
# - Todos os IDs são únicos?
# - Foreign keys válidas?
# - Dados numéricos corretos?
# - Datas no formato correto?
```

#### 3.3 Testes Manuais (1h)

```bash
# 1. Query de teste
SELECT e.nome, COUNT(a.id) AS total_faltas
FROM estudantes e
LEFT JOIN absences a ON a.estudante_id = e.id
WHERE e.turma = '5A'
GROUP BY e.id, e.nome
ORDER BY total_faltas DESC
LIMIT 10;

# 2. Comparar com Firebase
# Resultado deve ser idêntico!
```

### Critérios de Sucesso
- [ ] Quantidade de registros igual ao consolidado
- [ ] Query de teste retorna resultados esperados
- [ ] Sem erros de foreign key

---

## 🔄 FASE 4: DUAL-WRITE (6h)

### Objetivos
- ✅ Escritas simultâneas Firebase + Supabase
- ✅ Leituras ainda do Firebase (segurança)
- ✅ Sincronização validada

### Tarefas

#### 4.1 Criar Cliente Supabase (1h)

```typescript
// src/lib/supabaseClient.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Helper types
export type Database = {
  public: {
    Tables: {
      estudantes: {...},
      contatos: {...},
      absences: {...},
      // ...
    }
  }
}
```

#### 4.2 Implementar Dual-Write (4h)

```typescript
// src/services/studentServiceDualWrite.ts

export async function addStudent(data: StudentData) {
  // 1. Escrever no Firebase (comportamento atual)
  const firebaseResult = await firebaseService.addStudent(data);

  try {
    // 2. Escrever no Supabase (novo)
    const { error } = await supabase
      .from('estudantes')
      .insert({
        id: data.estudanteId,
        estudante_id: data.estudanteId,
        nome: data.nome,
        // ... outros campos
      });

    if (error) {
      console.error('[DUAL-WRITE] Erro ao escrever no Supabase:', error);
      // NÃO falhar - Firebase é fonte da verdade ainda
    } else {
      console.log('[DUAL-WRITE] ✅ Sincronizado com Supabase');
    }
  } catch (err) {
    console.error('[DUAL-WRITE] Exceção:', err);
  }

  return firebaseResult; // Retornar resultado do Firebase
}
```

#### 4.3 Testar Dual-Write (1h)

```bash
# 1. Criar estudante de teste
# Interface web → Cadastrar Estudante

# 2. Verificar que aparece em ambos
# Firebase Console → Firestore → estudantes
# Supabase Dashboard → Table Editor → estudantes

# 3. Atualizar estudante
# Interface web → Editar Estudante

# 4. Verificar sincronização novamente
```

### Critérios de Sucesso
- [ ] Novos estudantes aparecem em Firebase E Supabase
- [ ] Atualizações sincronizadas
- [ ] Sem erros críticos no console

---

## 🔐 FASE 5: MIGRAÇÃO DE AUTH (6h)

### Objetivos
- ✅ Usuários migrados para Supabase Auth
- ✅ Login funcionando no Supabase
- ✅ Rollback possível se necessário

### Tarefas

#### 5.1 Exportar Usuários Firebase (1h)

```bash
# 1. Exportar via Firebase CLI
firebase auth:export auth-users.json --project frequencia-anual

# 2. Converter para formato Supabase
node scripts/migracao/converter-usuarios.mjs
```

#### 5.2 Importar no Supabase (2h)

```bash
# Script de importação
node scripts/migracao/importar-usuarios-supabase.mjs

# Para cada usuário:
# 1. Criar em Supabase Auth
# 2. Criar registro em tabela users
# 3. Mapear UID Firebase → UID Supabase
```

#### 5.3 Implementar Login Supabase (3h)

```typescript
// src/components/AuthProvider.tsx

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Obter sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Escutar mudanças de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
}
```

### Critérios de Sucesso
- [ ] Todos os usuários importados
- [ ] Login funciona via Supabase
- [ ] Sessões persistem após reload

---

## 🔀 FASE 6: CUTOVER GRADUAL (10h)

### Objetivos
- ✅ Leituras migradas gradualmente para Supabase
- ✅ Sistema 100% funcional durante transição
- ✅ Rollback testado

### Tarefas

#### 6.1 Feature Flag System (2h)

```typescript
// src/config/featureFlags.ts

export const FEATURE_FLAGS = {
  USE_SUPABASE_READS: process.env.NEXT_PUBLIC_USE_SUPABASE_READS === 'true',
  USE_SUPABASE_WRITES: process.env.NEXT_PUBLIC_USE_SUPABASE_WRITES === 'true',
} as const;
```

#### 6.2 Migrar Queries (por módulo) (6h)

**Ordem recomendada**:

1. **Leitura de usuários** (1h) - Baixo risco
2. **Leitura de estudantes** (2h) - Médio risco
3. **Leitura de faltas** (2h) - Alto risco
4. **Escrita exclusiva Supabase** (1h) - Crítico

```typescript
// Exemplo: src/hooks/useStudents.ts

export function useStudents() {
  if (FEATURE_FLAGS.USE_SUPABASE_READS) {
    return useStudentsSupabase(); // NOVO
  } else {
    return useStudentsFirebase(); // ANTIGO
  }
}

function useStudentsSupabase() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    supabase
      .from('estudantes')
      .select('*')
      .eq('status', 'ATIVO')
      .order('nome')
      .then(({ data }) => setStudents(data || []));
  }, []);

  return { students };
}
```

#### 6.3 Testar Cada Módulo (2h)

```bash
# 1. Ativar feature flag para módulo específico
NEXT_PUBLIC_USE_SUPABASE_READS=true npm run dev

# 2. Testar extensivamente
# - Listar estudantes
# - Filtrar por turma
# - Buscar por nome
# - Ver detalhes
# - Editar
# - etc

# 3. Se tudo OK, mover para próximo módulo
# Se problema, desativar flag e investigar
```

### Critérios de Sucesso
- [ ] Cada módulo testado isoladamente
- [ ] Rollback testado e funcionando
- [ ] Performance igual ou melhor que Firebase

---

## 🎯 FASE 7: DESLIGAMENTO FIREBASE (2h)

### Objetivos
- ✅ Sistema 100% no Supabase
- ✅ Firebase desativado
- ✅ Custos reduzidos a zero

### Tarefas

#### 7.1 Remover Código Firebase (1h)

```bash
# 1. Remover dependências
npm uninstall firebase firebase-admin

# 2. Deletar arquivos
rm src/firebase.config.ts
rm src/lib/firebaseAdmin.ts
rm -rf src/services/*Firebase*.ts

# 3. Remover imports
# Buscar e substituir em todo o projeto
```

#### 7.2 Backup Final e Desativação (1h)

```bash
# 1. Backup final do Firebase
# Firebase Console → Export completo

# 2. Desativar Firestore
# Firebase Console → Firestore → Settings → Disable

# 3. Downgrade para Spark (free)
# Firebase Console → Usage → Change Plan → Spark

# 4. Manter Auth ativo (por 30 dias, caso precise rollback)
```

### Critérios de Sucesso
- [ ] Sistema funcionando 100% sem Firebase
- [ ] Backup final criado e armazenado
- [ ] Custos Firebase = R$ 0,00/mês

---

## 📊 MÉTRICAS DE SUCESSO

### Performance

| Métrica | Firebase | Supabase | Meta |
|---------|----------|----------|------|
| Lista estudantes | 2-3s | <1s | ✅ Melhor |
| Query complexa | 5-8s | 1-2s | ✅ 75% mais rápido |
| Escrita | 500ms | 200ms | ✅ 60% mais rápido |

### Disponibilidade

- ✅ Zero downtime durante migração
- ✅ Rollback em <5 minutos se necessário
- ✅ Dados sempre consistentes

### Funcionalidade

- ✅ Todas as features funcionando
- ✅ Sem bugs introduzidos
- ✅ UX idêntico ou melhor

---

## 🚨 PLANO DE ROLLBACK

### Rollback por Fase

| Fase | Rollback | Tempo | Perda de Dados |
|------|----------|-------|----------------|
| **0-2** | Fácil - só deletar | 5min | Nenhuma |
| **3** | Fácil - ignorar Supabase | 5min | Nenhuma |
| **4** | Fácil - desativar dual-write | 10min | Nenhuma |
| **5** | Médio - reverter auth | 30min | Últimas 24h |
| **6** | Médio - desativar flags | 15min | Nenhuma |
| **7** | Difícil - reativar Firebase | 2h | Depende do tempo |

### Rollback de Emergência

```bash
# 1. Desativar feature flags
echo "NEXT_PUBLIC_USE_SUPABASE_READS=false" >> .env.local
echo "NEXT_PUBLIC_USE_SUPABASE_WRITES=false" >> .env.local

# 2. Deploy imediato
git revert HEAD
git push

# 3. Vercel faz deploy em ~2min
```

---

## ✅ CHECKLIST FINAL

### Antes de Começar
- [ ] Backup completo do Firebase
- [ ] Scripts de consolidação prontos
- [ ] Projeto Supabase criado
- [ ] Tempo alocado (30-40h em 2-3 semanas)

### Durante Migração
- [ ] Cada fase testada antes de prosseguir
- [ ] Rollback testado em cada fase crítica
- [ ] Logs monitorados constantemente
- [ ] Backups incrementais criados

### Após Conclusão
- [ ] Sistema funcionando 100% no Supabase
- [ ] Firebase desativado
- [ ] Documentação atualizada
- [ ] Time treinado no novo stack

---

## 📚 DOCUMENTOS DE REFERÊNCIA

1. `ANALISE-SITUACAO-ATUAL.md` - Entender o estado atual
2. `SCHEMA-SQL-SUPABASE.md` - Schema do destino
3. `PLANO-CONSOLIDACAO-DADOS.md` - Limpeza de dados
4. Este documento - Estratégia de execução

---

**Status**: ✅ Estratégia completa e pronta para execução
**Próximo**: Executar Fase 0 (Preparação) amanhã após reset da quota
**Data**: 2025-10-10
**Tempo estimado**: 30-40 horas em 2-3 semanas
**Risco**: 🟡 Médio (mitigado com fases graduais)
