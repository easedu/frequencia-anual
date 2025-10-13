# 🚀 Executar Migration: Ano Letivo (Firebase → Supabase)

## 📋 Passos de Execução

### **PASSO 1**: Executar SQL no Supabase Dashboard

1. **Acesse**: https://supabase.com/dashboard
2. **Selecione seu projeto**
3. **Vá em**: SQL Editor
4. **Cole o conteúdo de**: `supabase-migrations/003_academic_year.sql`
5. **Execute** (RUN)

**Resultado esperado**:
```
✅ Tables criadas: academic_years, bimesters, school_days
✅ Triggers criados (atualização automática de contagens)
✅ Views criadas (v_school_days_detail, v_bimester_summary)
✅ Functions criadas (get_school_days_in_period, get_school_days_up_to_today)
✅ RLS policies criadas (permissivas para desenvolvimento)
```

---

### **PASSO 2**: Executar Script de Migração de Dados

**IMPORTANTE**: Certifique-se que o `.env.local` tem:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
```

**Execute**:
```bash
node scripts/migrate-academic-year-to-supabase.mjs
```

**Resultado esperado**:
```
🚀 Iniciando migração de ano letivo Firebase → Supabase

📖 1. Buscando dados do Firebase...
✅ Dados do Firebase carregados

📊 2. Extraindo bimestres...
   1º Bimestre:
     - Período: 2025-02-03 a 2025-04-25
     - Total de dias: X
     - Dias marcados: 54

   2º Bimestre:
     - Período: 2025-04-28 a 2025-06-27
     - Total de dias: Y
     - Dias marcados: 42

   3º Bimestre:
     - Período: 2025-07-21 a 2025-09-30
     - Total de dias: Z
     - Dias marcados: 52

   4º Bimestre:
     - Período: 2025-10-06 a 2025-12-19
     - Total de dias: W
     - Dias marcados: 52

   📊 Total de dias letivos: 200

📝 3. Inserindo ano letivo no Supabase...
✅ Ano letivo 2025 inserido (ID: uuid)

📝 4. Inserindo bimestres...
   Inserindo 1º Bimestre...
   ✅ 1º Bimestre inserido (ID: uuid)
   Inserindo 2º Bimestre...
   ✅ 2º Bimestre inserido (ID: uuid)
   Inserindo 3º Bimestre...
   ✅ 3º Bimestre inserido (ID: uuid)
   Inserindo 4º Bimestre...
   ✅ 4º Bimestre inserido (ID: uuid)

✅ Todos os bimestres inseridos

📝 5. Inserindo dias letivos...
   Inserindo dias do 1º Bimestre...
   ✅ 1º Bimestre: X dias inseridos
   Inserindo dias do 2º Bimestre...
   ✅ 2º Bimestre: Y dias inseridos
   Inserindo dias do 3º Bimestre...
   ✅ 3º Bimestre: Z dias inseridos
   Inserindo dias do 4º Bimestre...
   ✅ 4º Bimestre: W dias inseridos

✅ Total de N dias letivos inseridos

🔍 6. Verificando contagens finais...
   Ano 2025: 200 dias letivos
   1º Bimestre: 54 dias
   2º Bimestre: 42 dias
   3º Bimestre: 52 dias
   4º Bimestre: 52 dias
   Total de dias na tabela school_days: N

✅ Migração concluída com sucesso! 🎉

📊 RESUMO DA MIGRAÇÃO:
──────────────────────────────────────────────────
Ano letivo: 2025
Bimestres migrados: 4
Dias letivos inseridos: N
Dias letivos marcados (isChecked): 200
──────────────────────────────────────────────────

✅ Script finalizado com sucesso!
```

---

### **PASSO 3**: Verificar Dados no Supabase

**Supabase Dashboard** → Table Editor:

1. **academic_years**:
   ```
   year | start_date  | end_date    | total_school_days
   2025 | 2025-02-03  | 2025-12-19  | 200
   ```

2. **bimesters**:
   ```
   bimester_number | start_date  | end_date    | school_days_count
   1               | 2025-02-03  | 2025-04-25  | 54
   2               | 2025-04-28  | 2025-06-27  | 42
   3               | 2025-07-21  | 2025-09-30  | 52
   4               | 2025-10-06  | 2025-12-19  | 52
   ```

3. **school_days** (sample):
   ```
   bimester_id | date       | is_checked
   uuid-1      | 2025-02-03 | true
   uuid-1      | 2025-02-04 | true
   uuid-1      | 2025-02-05 | false
   ...
   ```

---

### **PASSO 4**: Testar Queries

**SQL Editor** → Execute queries de teste:

```sql
-- Teste 1: Total de dias letivos do ano
SELECT total_school_days FROM academic_years WHERE year = 2025;
-- Esperado: 200

-- Teste 2: Dias por bimestre
SELECT bimester_number, school_days_count
FROM bimesters
WHERE academic_year_id = (SELECT id FROM academic_years WHERE year = 2025)
ORDER BY bimester_number;
-- Esperado: 54, 42, 52, 52

-- Teste 3: Usar function para período específico
SELECT get_school_days_in_period('2025-02-03', '2025-04-25', 2025);
-- Esperado: 54 (1º bimestre)

-- Teste 4: Dias letivos até hoje
SELECT get_school_days_up_to_today(2025);
-- Esperado: Depende da data atual

-- Teste 5: View de resumo
SELECT * FROM v_bimester_summary WHERE academic_year = 2025;
-- Mostra resumo completo dos 4 bimestres
```

---

## 🎯 Próximos Passos (Após Migração)

1. ✅ **Criar Service Layer**: `src/services/supabase/academicYearService.ts`
2. ✅ **Atualizar Hooks**:
   - `src/hooks/attendance/useBimesterPeriods.ts` → Ler do Supabase
   - `src/hooks/attendance/useSchoolDays.ts` → Ler do Supabase
3. ✅ **Testar**: `src/app/controlar-faltas/page.tsx`
4. ✅ **Remover**: Dependências do Firebase para ano letivo (opcional)

---

## ❓ Troubleshooting

### Erro: "relation does not exist"
**Causa**: Migration SQL não foi executada
**Solução**: Execute o PASSO 1 novamente

### Erro: "permission denied"
**Causa**: RLS policies não criadas
**Solução**: Verifique se o SQL criou as policies (PASSO 1)

### Erro: "Firebase permission denied"
**Causa**: Não está autenticado no Firebase
**Solução**: Faça login no Firebase Console e tente novamente

### Counts errados (total_school_days != 200)
**Causa**: Triggers não atualizaram as contagens
**Solução**: Execute manualmente:
```sql
-- Atualizar contagens de bimestres
UPDATE bimesters
SET school_days_count = (
  SELECT COUNT(*) FROM school_days
  WHERE bimester_id = bimesters.id AND is_checked = TRUE
);

-- Atualizar total do ano
UPDATE academic_years
SET total_school_days = (
  SELECT SUM(school_days_count) FROM bimesters
  WHERE academic_year_id = academic_years.id
)
WHERE year = 2025;
```

---

## 📚 Referências

- **Migration SQL**: `supabase-migrations/003_academic_year.sql`
- **Script de Dados**: `scripts/migrate-academic-year-to-supabase.mjs`
- **Estrutura Firebase**: `2025/ano_letivo`
- **Estrutura Supabase**: `academic_years` + `bimesters` + `school_days`

---

**Última atualização**: 2025-01-10
