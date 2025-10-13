# 🚀 PLANO DE MIGRAÇÃO COMPLETA: Firebase → Supabase

> **Data**: 2025-10-12
> **Objetivo**: Remover **100%** das referências ao Firebase Firestore
> **Estratégia**: Migração incremental e segura com validação em cada etapa
> **Princípio**: TUDO deve usar Supabase com paginação

---

## 📊 VISÃO GERAL

### Estado Atual
- ✅ Dashboard de faltas: **Supabase** (recém migrado)
- ❌ 44 arquivos ainda usando **Firebase**
- ❌ 348 linhas com chamadas Firestore
- ❌ Dados duplicados (Firebase + Supabase)

### Estado Final Desejado
- ✅ 100% Supabase
- ✅ Paginação em todas as queries grandes
- ✅ Zero dependências Firebase (exceto Auth se necessário)
- ✅ Código limpo e mantível

---

## 🎯 FASES DA MIGRAÇÃO

### FASE 1: Hooks Críticos (4-6 horas)
**Prioridade**: 🔴 **MÁXIMA**
**Impacto**: Base para todo o resto

#### 1.1 Migrar `useStudentAbsences.ts` ⚡ URGENTE
**Arquivo**: `src/hooks/attendance/useStudentAbsences.ts`
**Status**: 🚨 Usado no dashboard `/controlar-faltas`
**Ação**:
- Criar versão Supabase usando `AbsenceService`
- Aplicar paginação
- Testar no dashboard

#### 1.2 Migrar `useFirebaseDoc.ts`
**Arquivo**: `src/hooks/useFirebaseDoc.ts`
**Ação**:
- Criar `useSupabaseDoc.ts` equivalente
- Usar Supabase realtime subscriptions
- Manter mesma interface

#### 1.3 Migrar `useFirebase.ts`
**Arquivo**: `src/hooks/useFirebase.ts`
**Ação**:
- Criar `useSupabase.ts` para collections
- Implementar paginação automática
- Cache com mesma estratégia

#### 1.4 Deprecar `useFirebaseCollection.ts`
**Arquivo**: `src/hooks/useFirebaseCollection.ts`
**Ação**:
- Substituir por `useSupabase.ts`
- Atualizar todos os imports

---

### FASE 2: Services (6-8 horas)
**Prioridade**: 🔴 **ALTA**

#### 2.1 Migrar `taskService.ts`
**Arquivo**: `src/services/taskService.ts`
**Supabase Table**: `tasks`
**Ação**:
- Criar `src/services/supabase/taskService.ts`
- Implementar CRUD completo
- Paginação para listagem

#### 2.2 Migrar `whatsappDataService.ts`
**Arquivo**: `src/services/whatsappDataService.ts`
**Supabase Tables**: `whatsapp_messages`, `whatsapp_message_history`
**Ação**:
- Verificar se já existe no Supabase
- Criar service Supabase
- Migrar lógica de mensagens

#### 2.3 Verificar `messageHistoryService.ts`
**Arquivo**: `src/services/messageHistoryService.ts`
**Status**: ⚠️ Pode já estar usando Supabase
**Ação**:
- Verificar implementação atual
- Se Firebase → migrar
- Se Supabase → validar

---

### FASE 3: Páginas Principais (4-6 horas)
**Prioridade**: 🟡 **MÉDIA**

#### 3.1 Migrar `/monitorar-faltas-consecutivas`
**Arquivo**: `src/app/monitorar-faltas-consecutivas/page.tsx`
**Ação**:
- Usar `AbsenceService` do Supabase
- Implementar queries otimizadas
- Testar detecção de faltas consecutivas

#### 3.2 Migrar `/telefones`
**Arquivo**: `src/app/telefones/page.tsx`
**Ação**:
- Usar `StudentDataService` (já Supabase)
- Query de contatos via Supabase
- Paginação se > 1000 registros

#### 3.3 Migrar `/cadastrar-ano-letivo`
**Arquivo**: `src/app/cadastrar-ano-letivo/page.tsx`
**Supabase Table**: `academic_years`, `bimesters`
**Ação**:
- Usar `AcademicYearService` (já existe!)
- Remover chamadas Firebase
- Validar CRUD

---

### FASE 4: Componentes (3-4 horas)
**Prioridade**: 🟡 **MÉDIA**

#### 4.1 Migrar `TaskDashboard.tsx`
**Arquivo**: `src/components/tasks/TaskDashboard.tsx`
**Ação**:
- Usar `taskService` Supabase (após Fase 2.1)
- Implementar paginação de tasks
- Testar CRUD completo

#### 4.2 Migrar `TaskManager.tsx` (ambos)
**Arquivos**:
- `src/components/tasks/TaskManager.tsx`
- `src/components/TaskManager.tsx`
**Ação**:
- Usar `taskService` Supabase
- Consolidar em um único componente (se duplicado)

#### 4.3 Migrar `StudentForm.tsx`
**Arquivo**: `src/components/students/StudentForm.tsx`
**Ação**:
- Usar `StudentDataService` (já Supabase)
- Remover imports Firebase

---

### FASE 5: APIs e Automation (6-8 horas)
**Prioridade**: 🟡 **MÉDIA-ALTA**

#### 5.1 Migrar `/api/tasks/create`
**Arquivo**: `src/app/api/tasks/create/route.ts`
**Ação**:
- Usar Supabase Admin Client
- Criar tasks via Supabase
- Validação de dados

#### 5.2 Migrar `/api/students/consecutive-absences`
**Arquivo**: `src/app/api/students/consecutive-absences/route.ts`
**Ação**:
- Usar `AbsenceService` Supabase
- Query otimizada para consecutivas

#### 5.3 Migrar Automation APIs
**Arquivos**:
- `src/app/api/automation/process-absences/route.ts`
- `src/app/api/automation/resume/route.ts`
- `src/app/api/automation/watchdog/route.ts`
**Ação**:
- Substituir Firebase Admin por Supabase Admin
- Usar `FieldValue` equivalente do Supabase
- Testar GitHub Actions

#### 5.4 Migrar `automationOrchestrator.ts`
**Arquivo**: `src/services/automationOrchestrator.ts`
**Ação**:
- Remover Firebase Admin
- Usar Supabase service role

---

### FASE 6: Limpeza (2-3 horas)
**Prioridade**: 🟢 **BAIXA** (mas importante)

#### 6.1 Deletar Services Legados
**Ação**:
```bash
rm -rf src/services/firebase/
```
**Arquivos deletados**:
- `attendanceService.ts`
- `studentService.ts`
- `studentServiceV2.ts`
- `BaseFirestoreService.ts`

#### 6.2 Deletar Páginas Admin Antigas
**Verificar primeiro se são usadas**:
- `src/app/admin/clean-atestados/`
- `src/app/admin/verificar-v1-interactions/`
- `src/app/admin/migrate-contacts/`
- `src/app/admin/backup-dados/`
- etc.

**Ação**:
```bash
# Após confirmar que não são usadas
rm -rf src/app/admin/[nome-da-pagina]
```

#### 6.3 Deletar APIs de Migração
**Arquivos**:
- `src/app/api/migrate-contacts/`
- `src/app/api/admin/normalize-contacts/`
- `src/app/api/admin/migration-whatsapp-*/`
- `src/app/api/debug-*/`

#### 6.4 Atualizar Utilitários
**Arquivos**:
- `src/utils/auditHelpers.ts` - Remover `Timestamp`
- `src/utils/softDeleteHelpers.ts` - Remover `Timestamp`

**Substituir**:
```typescript
// ❌ ANTES
import { Timestamp } from 'firebase/firestore';
const now = Timestamp.now();

// ✅ DEPOIS
const now = new Date().toISOString();
```

---

### FASE 7: Remover Dependências (30min)
**Prioridade**: 🟢 **FINAL**

#### 7.1 Atualizar `package.json`
**Ação**:
```bash
npm uninstall firebase firebase-admin
```

**Verificar**:
- Manter apenas se Auth ainda usa
- Documentar motivo se manter

#### 7.2 Atualizar `firebase.config.ts`
**Opções**:
1. Deletar se não usar Auth
2. Manter apenas Auth se necessário
3. Renomear para `auth.config.ts`

---

### FASE 8: Testes e Validação (2-3 horas)
**Prioridade**: 🔴 **CRÍTICA**

#### 8.1 Testes Funcionais
- [ ] Login/Logout funciona
- [ ] Dashboard de faltas carrega dados
- [ ] Cadastro de estudante funciona
- [ ] Tarefas podem ser criadas/editadas
- [ ] WhatsApp envia mensagens
- [ ] Automation funciona (GitHub Actions)

#### 8.2 Testes de Performance
- [ ] Dashboard carrega em < 5s
- [ ] Paginação funciona em todas as listas
- [ ] Queries grandes não travam

#### 8.3 Auditoria Final
```bash
# Verificar que NÃO há mais Firebase
grep -r "from 'firebase" src/ --include="*.ts" --include="*.tsx"
# Resultado esperado: 0 matches (ou apenas Auth)

grep -r "firebase/firestore" src/
# Resultado esperado: 0 matches

grep -r "firebase-admin" src/
# Resultado esperado: 0 matches
```

---

## 📋 CHECKLIST DE EXECUÇÃO

### Antes de Começar
- [ ] Fazer backup completo do código
- [ ] Criar branch: `git checkout -b migration/remove-all-firebase`
- [ ] Documentar estado atual
- [ ] Configurar Supabase Admin Client

### Durante Migração
- [ ] Migrar um arquivo/módulo por vez
- [ ] Testar após cada mudança
- [ ] Commitar incrementalmente
- [ ] Documentar problemas encontrados

### Após Cada Fase
- [ ] Executar `npm run type-check`
- [ ] Executar `npm run lint`
- [ ] Testar funcionalidade afetada
- [ ] Atualizar TODO list

### Antes do Commit Final
- [ ] Auditoria completa (grep Firebase)
- [ ] Todos os testes passam
- [ ] Build funciona: `npm run build`
- [ ] Testar em produção (staging)

---

## 🛠️ FERRAMENTAS E COMANDOS

### Buscar Referências Firebase
```bash
# Buscar imports
grep -r "from 'firebase" src/ --include="*.ts" --include="*.tsx"

# Buscar chamadas específicas
grep -r "getDocs\|getDoc\|setDoc\|addDoc" src/ | grep -v "supabase"

# Contar ocorrências
grep -r "firebase/firestore" src/ | wc -l
```

### Substituições em Massa
```bash
# Exemplo: Substituir Timestamp por Date
find src/ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/Timestamp.now()/new Date().toISOString()/g'
```

### Deletar Arquivos Legados
```bash
# Após confirmar que não são usados
rm -rf src/services/firebase/
rm -rf src/app/admin/migrate-contacts/
```

---

## 📊 ESTIMATIVAS

### Tempo Total: 24-30 horas

| Fase | Horas | Prioridade |
|------|-------|------------|
| Fase 1: Hooks | 4-6h | 🔴 Máxima |
| Fase 2: Services | 6-8h | 🔴 Alta |
| Fase 3: Páginas | 4-6h | 🟡 Média |
| Fase 4: Componentes | 3-4h | 🟡 Média |
| Fase 5: APIs | 6-8h | 🟡 Média-Alta |
| Fase 6: Limpeza | 2-3h | 🟢 Baixa |
| Fase 7: Dependências | 0.5h | 🟢 Final |
| Fase 8: Testes | 2-3h | 🔴 Crítica |

### Cronograma Recomendado (4 dias)

**Dia 1** (8h):
- Manhã: Fase 1 (Hooks críticos)
- Tarde: Fase 2 (Services)

**Dia 2** (8h):
- Manhã: Fase 3 (Páginas)
- Tarde: Fase 4 (Componentes)

**Dia 3** (8h):
- Manhã: Fase 5 (APIs parte 1)
- Tarde: Fase 5 (APIs parte 2)

**Dia 4** (6h):
- Manhã: Fase 6 e 7 (Limpeza)
- Tarde: Fase 8 (Testes e validação)

---

## 🚨 RISCOS E MITIGAÇÕES

### Risco 1: Quebrar Funcionalidade
**Mitigação**:
- Migrar incrementalmente
- Testar após cada mudança
- Manter backups

### Risco 2: Dados Inconsistentes
**Mitigação**:
- Validar dados Supabase antes
- Migração de dados se necessário
- Dual-read temporário durante testes

### Risco 3: Performance Pior
**Mitigação**:
- Implementar paginação em tudo
- Otimizar queries com índices
- Monitorar tempos de resposta

### Risco 4: Auth Quebrar
**Mitigação**:
- Verificar se Auth usa Firebase
- Migrar Auth por último
- Ou manter Firebase apenas para Auth

---

## ✅ CRITÉRIOS DE SUCESSO

### Técnicos
- [ ] Zero imports `firebase/firestore`
- [ ] Zero imports `firebase-admin/firestore`
- [ ] Todas queries com paginação
- [ ] Build sem erros
- [ ] Type-check 100%

### Funcionais
- [ ] Todos os dashboards funcionam
- [ ] CRUD de estudantes funciona
- [ ] Tasks funcionam
- [ ] WhatsApp funciona
- [ ] Automation funciona

### Performance
- [ ] Dashboard < 5s
- [ ] Queries grandes < 3s
- [ ] Sem travamentos

---

## 🎯 PRÓXIMO PASSO

**COMEÇAR AGORA pela Fase 1.1**: Migrar `useStudentAbsences.ts`

Este é o hook mais crítico pois:
- ✅ Usado no dashboard principal
- ✅ Busca dados no Firebase
- ✅ Impacta experiência do usuário

**Posso começar agora?** 🚀

---

**Criado por**: Claude (Engenheiro Sênior)
**Data**: 2025-10-12
**Status**: 📋 **PLANO COMPLETO - PRONTO PARA EXECUÇÃO**
