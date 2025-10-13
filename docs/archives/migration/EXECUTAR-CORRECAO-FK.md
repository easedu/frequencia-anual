# 🚨 EXECUTAR CORREÇÃO DE FK - GUIA RÁPIDO

**Problema**: Dashboard mostra apenas 42 estudantes com faltas (deveria ser 718).

**Causa**: FK de `student_absences` aponta para campo errado.

**Solução**: 2 passos simples.

---

## 📋 PRÉ-REQUISITOS

- [ ] Backup do Firebase (`firestore-backup-2025-10-11.json` na raiz do projeto)
- [ ] Arquivo `.env.local` com credenciais do Supabase
- [ ] Acesso ao Supabase (Dashboard ou psql)

---

## 🚀 PASSO 1: CORRIGIR SCHEMA (SQL)

### Opção A: Via Supabase Dashboard (RECOMENDADO)

1. Acesse: https://supabase.com/dashboard/project/xccjifrggpgevqftwdkx/sql/new
2. Cole o conteúdo de `supabase-migrations/fix-absences-fk.sql`
3. Clique em **Run**
4. Aguarde confirmação: "✅ FK recriada apontando para students.student_id"

### Opção B: Via psql (Terminal)

```bash
# Copiar SQL para clipboard ou executar:
psql "postgresql://postgres:[SENHA]@db.xccjifrggpgevqftwdkx.supabase.co:5432/postgres" \
  -f supabase-migrations/fix-absences-fk.sql
```

**O que esse SQL faz**:
- ✅ Cria backup da tabela atual (`student_absences_backup_20251011`)
- ✅ Dropa FK antiga (aponta para `students.id`)
- ✅ Limpa tabela `student_absences`
- ✅ Recria FK correta (aponta para `students.student_id`)

---

## 🚀 PASSO 2: RE-IMPORTAR FALTAS

### Executar via Script Auxiliar (FÁCIL)

```bash
# Na raiz do projeto:
./scripts/migration/run-reimport.sh
```

O script irá:
1. Carregar variáveis do `.env.local`
2. Verificar backup do Firebase
3. Pedir confirmação
4. Executar re-importação

**Tempo estimado**: 3-5 minutos (18.071 registros em lotes de 500)

### OU Executar Manualmente

```bash
# Carregar variáveis manualmente
export $(grep -E "^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)" .env.local | xargs)

# Executar script
node scripts/migration/16-reimport-absences-simple.mjs
```

---

## ✅ VALIDAÇÃO

### 1. Verificar API de Debug

```bash
curl http://localhost:3000/api/debug-absences | jq
```

**Esperado**:
```json
{
  "supabase": {
    "totalAbsences": 18071,        // ✅ Bate com Firebase
    "uniqueStudents": 718           // ✅ Bate com Firebase
  },
  "differences": {
    "absences": 0,                  // ✅ Zero diferença!
    "students": 0                   // ✅ Zero diferença!
  }
}
```

### 2. Verificar Dashboard

Acesse: http://localhost:3000/controlar-faltas

**Verificar**:
- ✅ Total de faltas = 18.071
- ✅ KPIs corretos (Conformes, Em Risco, etc)
- ✅ Filtros funcionando
- ✅ Estudantes aparecem corretamente

### 3. Verificar JOIN (SQL)

No Supabase Dashboard → SQL Editor:

```sql
SELECT
  sa.student_id as absence_student_id,
  s.student_id as student_uuid,
  s.name,
  sa.absence_date,
  -- Deve ser TRUE!
  (sa.student_id = s.student_id) as ids_match
FROM student_absences sa
JOIN students s ON sa.student_id = s.student_id
LIMIT 10;
```

**Esperado**: Coluna `ids_match` deve ser **TRUE** em todos os registros!

---

## 🔧 TROUBLESHOOTING

### Erro: "Cannot find package 'dotenv'"

**Solução**: Use o script auxiliar `run-reimport.sh` em vez do script direto.

### Erro: "violates foreign key constraint"

**Causa**: SQL do Passo 1 não foi executado ou FK ainda aponta para campo errado.

**Solução**: Execute o SQL `fix-absences-fk.sql` novamente.

### Erro: "duplicate key value violates unique constraint"

**Causa**: Tabela não foi limpa antes da re-importação.

**Solução**:
1. Execute `TRUNCATE TABLE student_absences;` no Supabase
2. Execute a re-importação novamente

### Dashboard ainda mostra valores errados

**Causas possíveis**:
1. Cache do navegador → Recarregue com Ctrl+Shift+R
2. Cache do Next.js → Reinicie o servidor (`npm run dev`)
3. Hook ainda usa FK errado → Verifique `useStudentRecords.ts`

---

## 📊 RESULTADO ESPERADO

### Antes da Correção
- Total de faltas: 16.071 ❌
- Estudantes com faltas: 42 ❌
- Dashboard: Valores incorretos ❌

### Depois da Correção
- Total de faltas: 18.071 ✅
- Estudantes com faltas: 718 ✅
- Dashboard: Valores corretos ✅

---

## 📚 DOCUMENTAÇÃO COMPLETA

Para mais detalhes, veja:
- [docs/CORRECAO-FK-STUDENT-ABSENCES.md](docs/CORRECAO-FK-STUDENT-ABSENCES.md)

---

## 🆘 AJUDA

Se encontrar problemas:
1. Verifique logs do script de re-importação
2. Verifique logs do Supabase (Dashboard → Logs)
3. Consulte documentação completa
4. Reverta usando backup: `student_absences_backup_20251011`
