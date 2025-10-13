# 🚀 GUIA DE EXECUÇÃO - FASE 1: CORREÇÕES CRÍTICAS

> **Status**: Pronto para execução
> **Tempo Estimado**: 5-10 minutos
> **Complexidade**: Baixa (transacional com rollback automático)

---

## 📋 CHECKLIST PRÉ-EXECUÇÃO

Antes de começar, confirme:

- [ ] Você tem acesso ao **Supabase Dashboard** (SQL Editor)
- [ ] Você tem o arquivo `EXECUTAR-NO-SUPABASE-SQL-EDITOR-V2.sql` aberto ⚠️ **V2 OBRIGATÓRIO**
- [ ] Você tem o arquivo `scripts/fase1-executar-correcoes.mjs` no projeto
- [ ] **Firebase Emulators DESLIGADOS** (esta fase usa Supabase real)
- [ ] Nenhuma automação rodando (evitar conflitos)

---

## 🎯 PASSO 1: EXECUTAR SQL NO SUPABASE (5 minutos)

### 1.1 - Acessar SQL Editor

1. Abra: **[Supabase Dashboard](https://supabase.com/dashboard)**
2. Selecione seu projeto: `frequencia-anual` (ou nome do projeto)
3. Menu lateral: **SQL Editor** → **New query**

### 1.2 - Copiar SQL

⚠️ **IMPORTANTE**: Use a **versão V2** do SQL (corrige órfãos primeiro)

Abra o arquivo `EXECUTAR-NO-SUPABASE-SQL-EDITOR-V2.sql` e **copie TODO o conteúdo** (~230 linhas).

**Por que V2?**
- Remove faltas órfãs (estudantes deletados do Firebase)
- Depois corrige FKs das faltas válidas
- Evita erro: "violates foreign key constraint"

### 1.3 - Colar e Executar

1. Cole o SQL completo no editor
2. Clique em **Run** (Ctrl+Enter)
3. Aguarde execução (~30-60 segundos)

### 1.4 - Verificar Output

Você deve ver no console:

```
════════════════════════════════════════════════════════════════
🔧 INICIANDO CORREÇÃO COMPLETA DO SUPABASE - V2
════════════════════════════════════════════════════════════════

📋 FASE 0: Identificando e removendo faltas órfãs
   ✅ Backup criado: 17822 registros
   📊 Órfãos identificados: XXX
   ⚠️  Estes registros serão DELETADOS (estudantes não existem no Firebase)
   ✅ Órfãos removidos
   📊 Faltas restantes: YYYY

════════════════════════════════════════════════════════════════
📋 FASE 1.1: Corrigindo FK em student_absences
   ✅ FKs removidas temporariamente
   ✅ FKs atualizadas: YYYY
   ✅ FK recriada apontando para students.id

   📊 Validação Final:
      Total absences: YYYY
      FKs válidas: YYYY
      Órfãos: 0

   ✅ FASE 1.1 CONCLUÍDA: 100% integridade referencial!

════════════════════════════════════════════════════════════════
📋 FASE 1.3: Ajustando schema de users.firebase_uid
   ✅ Coluna firebase_uid alterada: UUID → VARCHAR(255)
   ✅ FASE 1.3 CONCLUÍDA!

════════════════════════════════════════════════════════════════
✅ CORREÇÕES CONCLUÍDAS COM SUCESSO!
════════════════════════════════════════════════════════════════

📊 EXECUTADO:
   ✅ Órfãos removidos: XXX
   ✅ FK de student_absences corrigida: YYYY registros
   ✅ Schema de users.firebase_uid ajustado

🎯 PRÓXIMOS PASSOS (executar via scripts Node.js):
   1. node scripts/fase1-executar-correcoes.mjs
   2. node scripts/auditoria-completa-supabase.mjs

💾 BACKUP salvo em: student_absences_backup_20251012
```

### ⚠️ Se houver ERRO

Se aparecer erro como:

```
❌ Ainda existem X órfãos!
```

**NÃO SE PREOCUPE**: A transação faz **ROLLBACK automático**. Nada foi modificado.

**Me avise imediatamente** com o erro completo para análise.

---

## 🎯 PASSO 2: EXECUTAR SCRIPT NODE.JS (3 minutos)

### 2.1 - Abrir Terminal

No **VSCode** ou terminal do projeto:

```bash
cd /Users/easedu/Documents/Projetos/micro-saas/frequencia-anual
```

### 2.2 - Verificar Variáveis de Ambiente

Confirme que `.env.local` tem:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# OU
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.3 - Executar Script

```bash
node scripts/fase1-executar-correcoes.mjs
```

### 2.4 - Acompanhar Execução

Você verá:

```
🔧 FASE 1: CORREÇÕES CRÍTICAS DO SUPABASE
════════════════════════════════════════════════════════════════

📋 FASE 1.1: CORRIGIR FK EM student_absences
🔍 Identificando órfãos...
   📊 Total absences: 17,822
   📊 Total students: 679
   ✅ Nenhum órfão! FK já está correta.

════════════════════════════════════════════════════════════════
📋 FASE 1.2: MIGRAR absence_summaries

📦 Carregando backup do Firebase...
   ✅ Backup carregado: 679 students

🔍 Processando absence_summaries...
   📊 Total a migrar: 4,899
   ⚠️  Skipped: 0

📥 Inserindo absence_summaries...
   📥 Inseridos: 4,899/4,899

   ✅ Migração de absence_summaries concluída!

════════════════════════════════════════════════════════════════
📋 FASE 1.3: AJUSTAR SCHEMA users.firebase_uid
   ✅ Coluna já é VARCHAR ou aceita strings!

════════════════════════════════════════════════════════════════
📋 FASE 1.4: MIGRAR users

📦 Carregando backup do Firebase...
   ✅ Backup carregado: 17 users
   📊 Total a migrar: 17

📥 Inserindo users...
   ✅ 17 users migrados com sucesso!

════════════════════════════════════════════════════════════════
📊 RELATÓRIO FINAL - FASE 1
════════════════════════════════════════════════════════════════

1.1 student_absences:
   ✅ Órfãos corrigidos: 0/0

1.2 absence_summaries:
   ✅ Registros inseridos: 4,899
   ⚠️  Skipped: 0

1.3 users schema:
   ✅ Schema correto

1.4 users:
   ✅ Usuários inseridos: 17

════════════════════════════════════════════════════════════════
✅ FASE 1 CONCLUÍDA COM SUCESSO!
════════════════════════════════════════════════════════════════

🎯 PRÓXIMA AÇÃO:
   Execute: node scripts/auditoria-completa-supabase.mjs
```

### ⚠️ Se houver Erro

**Erros Comuns**:

1. **"invalid input syntax for type uuid"**
   - **Causa**: SQL do Passo 1 não foi executado
   - **Fix**: Volte ao Passo 1 e execute o SQL primeiro

2. **"null value in column 'month' violates not-null constraint"**
   - **Causa**: Alguns registros do Firebase têm month null
   - **Fix**: O script já faz skip automático (normal)

3. **"relation 'absence_summaries' already has rows"**
   - **Causa**: Registros já foram inseridos
   - **Fix**: Ignore, já está completo

---

## 🎯 PASSO 3: VALIDAR CORREÇÕES (2 minutos)

### 3.1 - Executar Auditoria Completa

```bash
node scripts/auditoria-completa-supabase.mjs
```

### 3.2 - Verificar Resultado Esperado

```
════════════════════════════════════════════════════════════════
📊 RELATÓRIO FINAL DE AUDITORIA
════════════════════════════════════════════════════════════════

✅ INTEGRIDADE REFERENCIAL
   student_absences → students: ✅ 17,822/17,822 válidas (0 órfãos)
   absence_summaries → students: ✅ 4,899/4,899 válidas (0 órfãos)
   student_contacts → students: ✅ 1,523/1,523 válidas (0 órfãos)

📊 CONTAGENS
   students: 679 (Firebase: 679) ✅
   student_absences: 17,822 (Firebase: 18,071) ⚠️ Divergência: -249
   absence_summaries: 4,899 (Firebase: 4,899) ✅
   users: 17 (Firebase: 17) ✅

✅ MIGRAÇÃO 100% COMPLETA!
✅ ZERO ÓRFÃOS EM TODAS AS TABELAS
✅ INTEGRIDADE REFERENCIAL PERFEITA

🎯 PRONTO PARA FASE 2: VALIDAÇÃO DE FUNCIONALIDADES
```

### 🎉 Se Tudo Estiver OK

Você verá:

```
✅ MIGRAÇÃO 100% COMPLETA!
✅ ZERO ÓRFÃOS EM TODAS AS TABELAS
```

**Próxima Fase**: Testar aplicação end-to-end.

---

## ⚠️ TROUBLESHOOTING

### Erro no Passo 1 (SQL)

#### "syntax error at or near..."

**Causa**: SQL incompleto ou corrompido
**Fix**:
1. Feche o SQL Editor
2. Abra nova query
3. Copie TODO o arquivo `EXECUTAR-NO-SUPABASE-SQL-EDITOR.sql` novamente
4. Execute

#### "permission denied for table..."

**Causa**: Usuário sem permissão admin
**Fix**:
1. Verifique se está logado como admin no Supabase
2. OU execute via `psql` com credenciais de admin

### Erro no Passo 2 (Node.js)

#### "Error: connect ECONNREFUSED"

**Causa**: Variáveis de ambiente incorretas
**Fix**:
1. Verifique `NEXT_PUBLIC_SUPABASE_URL` em `.env.local`
2. Confirme que está apontando para projeto correto

#### "Module not found: firebase-admin"

**Causa**: Dependências não instaladas
**Fix**:
```bash
npm install firebase-admin
```

---

## 🔄 ROLLBACK (Se Necessário)

### Se SQL do Passo 1 Falhou

**Boa notícia**: SQL usa `BEGIN/COMMIT`. Se falhou, **nada foi alterado** (rollback automático).

### Se Precisa Reverter Dados Inseridos (Passo 2)

**Backup existe**: `student_absences_backup_20251012`

**Reverter manualmente** (se REALMENTE necessário):

```sql
BEGIN;

-- Reverter student_absences
DELETE FROM student_absences;
INSERT INTO student_absences SELECT * FROM student_absences_backup_20251012;

-- Reverter absence_summaries (se inseriu)
DELETE FROM absence_summaries;

-- Reverter users (se inseriu)
DELETE FROM users WHERE id NOT IN (/* seus users existentes */);

COMMIT;
```

**⚠️ CUIDADO**: Reverter apaga dados! Só faça se tiver certeza.

---

## 📊 MÉTRICAS DE SUCESSO

Após execução completa, você deve ter:

| Métrica | Antes | Depois | Status |
|---------|-------|--------|--------|
| Órfãos student_absences | 17,822 | 0 | ✅ |
| absence_summaries migrados | 0 | 4,899 | ✅ |
| users migrados | 0 | 17 | ✅ |
| Integridade referencial | 95% | 100% | ✅ |
| Pronto para desconectar Firebase | ❌ | ✅ | ✅ |

---

## 🎯 PRÓXIMA FASE (Após Sucesso)

**Fase 2**: Validação de Funcionalidades
- Testar dashboard
- Testar cadastro de estudantes
- Testar registro de faltas
- Testar relatórios
- Testar WhatsApp

**Fase 3**: Migração de Serviços
- Migrar `studentDataService.ts` → Supabase
- Migrar `attendanceService.ts` → Supabase
- Migrar `taskService.ts` → Supabase

**Fase 4**: Desconexão Firebase
- Remover imports do Firebase
- Deletar `firebase.config.ts`
- Remover env vars do Firebase
- Atualizar documentação

---

## 💡 DICAS

✅ **Faça backup antes de começar** (já existe: `student_absences_backup_20251012`)
✅ **Execute em horário de baixo tráfego** (madrugada, final de semana)
✅ **Monitore logs do Supabase** durante execução
✅ **Teste em staging primeiro** (se possível)
✅ **Não interrompa o script Node.js** durante execução (pode deixar dados inconsistentes)

---

## 📞 SUPORTE

Se encontrar qualquer problema:

1. **Capture o erro completo** (screenshot ou copiar texto)
2. **Verifique logs do Supabase** (Dashboard → Logs)
3. **Me avise imediatamente** com:
   - Qual passo falhou (1, 2 ou 3)
   - Mensagem de erro completa
   - Output do script/SQL

---

**Última Atualização**: 2025-10-12
**Versão**: 1.0.0
**Status**: ✅ Pronto para Execução
