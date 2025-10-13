# 🧹 Plano de Limpeza de Código Legado

**Data**: 2025-10-12
**Objetivo**: Remover código Firebase/V2 desnecessário após migração Supabase

---

## 📊 Análise Atual

### Scripts Arquivados
- **Localização**: `scripts/archived/`
- **Quantidade**: **70 arquivos**
- **Tamanho total**: ~500KB
- **Status**: ❌ **Obsoletos** - Usados apenas durante migração V2→V3

### Firebase Legacy Services
- **Localização**: `src/services/firebase/`
- **Arquivos**:
  - `attendanceService.ts` (3 erros TS)
  - `UserTasksService.ts` (2 erros TS)
  - `BaseFirestoreService.ts`
  - `studentService.ts`
  - `studentServiceV2.ts`
  - `index.ts`
- **Uso ativo**: ❌ **0 imports** em código principal (app, components, hooks)

### Firebase em Produção (Ainda em Uso)
- **Páginas Admin**: 8 páginas (debug/ferramentas)
- **APIs**: 11 rotas (maioria admin/migração)
- **Componentes**: 4 componentes (análise necessária)

---

## ✅ SEGURO PARA REMOVER

### 1. Scripts Arquivados (70 arquivos) - **REMOÇÃO TOTAL**

**Justificativa**:
- ✅ Migração V2→V3 concluída
- ✅ Dados já migrados e validados
- ✅ Scripts nunca serão executados novamente
- ✅ Causam 6 erros TypeScript

**Ação**:
```bash
rm -rf scripts/archived/
```

**Impacto**: ✅ **ZERO** - Nenhum código importa estes scripts

---

### 2. Firebase Legacy Services (6 arquivos) - **REMOÇÃO TOTAL**

**Justificativa**:
- ✅ Services Supabase já implementados e funcionais
- ✅ 0 imports ativos em código principal
- ✅ Causam 5 erros TypeScript
- ✅ Dual-write V2/V3 já removido

**Arquivos para remover**:
```
src/services/firebase/
├── attendanceService.ts          ❌ REMOVER
├── UserTasksService.ts           ❌ REMOVER
├── BaseFirestoreService.ts       ❌ REMOVER
├── studentService.ts             ❌ REMOVER
├── studentServiceV2.ts           ❌ REMOVER
└── index.ts                      ❌ REMOVER
```

**Ação**:
```bash
rm -rf src/services/firebase/
```

**Impacto**: ✅ **ZERO** - Nenhum código principal importa

---

## ⚠️ ANÁLISE NECESSÁRIA

### 3. APIs Admin/Debug Firebase (11 rotas)

| Rota | Tipo | Manter? | Justificativa |
|------|------|---------|---------------|
| `/api/tasks/create` | **Produção** | ⚠️ **SIM** | API ativa de criação de tasks |
| `/api/students/consecutive-absences` | **Produção** | ⚠️ **SIM** | API ativa de análise |
| `/api/migrate-contacts` | Admin | ❌ **NÃO** | Migração concluída |
| `/api/admin/normalize-contacts` | Admin | ❌ **NÃO** | Migração concluída |
| `/api/admin/migration-whatsapp-*` (3) | Admin | ❌ **NÃO** | Migração concluída |
| `/api/admin/clean-duplicate-atestados` | Admin | ❓ **AVALIAR** | Pode ser útil |
| `/api/admin/update-contacts-pode-receber` | Admin | ❌ **NÃO** | Migração concluída |
| `/api/debug-emilly` | Debug | ❌ **NÃO** | Debug específico |
| `/api/debug-contacts` | Debug | ❌ **NÃO** | Debug |

**Ação Recomendada**:
1. ✅ **Manter**: `/api/tasks/create` e `/api/students/consecutive-absences` (MIGRAR para Supabase)
2. ❌ **Remover**: 8 APIs de admin/debug/migração
3. ❓ **Avaliar**: `/api/admin/clean-duplicate-atestados` (pode ser útil ocasionalmente)

---

### 4. Páginas Admin Firebase (8 páginas)

| Página | Função | Manter? |
|--------|--------|---------|
| `/admin/backup-dados` | Backup Firestore | ❓ **AVALIAR** - Útil em emergência |
| `/admin/clean-atestados` | Limpeza duplicatas | ❓ **AVALIAR** - Útil ocasionalmente |
| `/admin/debug-contacts` | Debug contatos | ❌ **NÃO** - Debug |
| `/admin/descobrir-schema-firestore` | Análise schema | ❌ **NÃO** - Migração concluída |
| `/admin/investigar-todas-interacoes` | Debug interações | ❌ **NÃO** - Debug |
| `/admin/migrate-contacts` | Migração contatos | ❌ **NÃO** - Migração concluída |
| `/admin/update-pode-receber` | Update campo | ❌ **NÃO** - Migração concluída |
| `/admin/verificar-v1-interactions` | Análise V1 | ❌ **NÃO** - Debug |

**Ação Recomendada**:
- ✅ **Manter (temporariamente)**: `backup-dados`, `clean-atestados` (úteis em emergências)
- ❌ **Remover**: 6 páginas de debug/migração

---

### 5. Componentes com Firebase (4 componentes)

**Necessário identificar quais são**:
```bash
grep -r "from 'firebase/" src/components --include="*.tsx" -l
```

**Ação**: Analisar cada um e migrar para Supabase ou remover.

---

## 🎯 Plano de Execução

### Fase 1: Remoção Segura (IMEDIATO) ✅

```bash
# 1. Remover scripts arquivados (70 arquivos)
rm -rf scripts/archived/

# 2. Remover Firebase legacy services (6 arquivos)
rm -rf src/services/firebase/

# 3. Verificar erros TypeScript
npm run type-check
```

**Erros resolvidos**: 6 (scripts) + 5 (services) = **11 erros** ✅

---

### Fase 2: APIs Admin/Debug (RECOMENDADO) ⚠️

**Remover (8 APIs)**:
```bash
rm src/app/api/migrate-contacts/
rm src/app/api/admin/normalize-contacts/
rm src/app/api/admin/migration-whatsapp-analysis/
rm src/app/api/admin/migration-whatsapp-create-structure/
rm src/app/api/admin/migration-whatsapp-migrate-data/
rm src/app/api/admin/update-contacts-pode-receber/
rm src/app/api/debug-emilly/
rm src/app/api/debug-contacts/
```

**Manter e MIGRAR para Supabase**:
- `/api/tasks/create` → Usar `TaskService` (Supabase)
- `/api/students/consecutive-absences` → Usar `AbsenceService` (Supabase)

**Avaliar**:
- `/api/admin/clean-duplicate-atestados` - Decidir se mantém

---

### Fase 3: Páginas Admin (OPCIONAL) 🤔

**Remover (6 páginas)**:
```bash
rm -rf src/app/admin/debug-contacts/
rm -rf src/app/admin/descobrir-schema-firestore/
rm -rf src/app/admin/investigar-todas-interacoes/
rm -rf src/app/admin/migrate-contacts/
rm -rf src/app/admin/update-pode-receber/
rm -rf src/app/admin/verificar-v1-interactions/
```

**Manter temporariamente**:
- `/admin/backup-dados` (emergências)
- `/admin/clean-atestados` (limpeza ocasional)

---

### Fase 4: Componentes (ANÁLISE DETALHADA) 🔍

1. Identificar os 4 componentes
2. Migrar lógica para Supabase
3. Remover ou atualizar

---

## 📊 Impacto Estimado

| Ação | Arquivos Removidos | Erros TS Resolvidos | Risco |
|------|-------------------|---------------------|-------|
| **Fase 1 (Scripts + Services)** | 76 | 11 | ✅ **ZERO** |
| **Fase 2 (APIs)** | 8-10 | 5-10 | ⚠️ **BAIXO** (migrar 2 críticas) |
| **Fase 3 (Páginas Admin)** | 6 | 3 | ✅ **ZERO** (não usadas) |
| **Fase 4 (Componentes)** | 4 | 4-8 | ⚠️ **MÉDIO** (análise necessária) |
| **TOTAL** | 94-100 | **23-32** | - |

---

## ✅ Recomendação Final

### Executar AGORA (Fase 1):
```bash
# Remoção segura - ZERO risco
rm -rf scripts/archived/
rm -rf src/services/firebase/
npm run type-check
```

**Benefícios imediatos**:
- ✅ 76 arquivos removidos
- ✅ 11 erros TypeScript resolvidos
- ✅ Codebase mais limpo
- ✅ Build mais rápido

### Executar EM SEGUIDA (Fase 2):
1. Migrar 2 APIs críticas para Supabase
2. Remover 8 APIs obsoletas
3. Avaliar clean-duplicate-atestados

### Avaliar DEPOIS (Fase 3 e 4):
- Páginas admin backup (manter por segurança)
- Componentes (análise detalhada necessária)

---

**Próximo passo**: Você autoriza a **Fase 1** (remoção segura de 76 arquivos)?
