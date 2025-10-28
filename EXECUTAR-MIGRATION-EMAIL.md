# Como Adicionar Campo Email à Tabela Students

## ⚠️ AÇÃO NECESSÁRIA

O campo `email` foi adicionado ao código, mas ainda não existe no banco de dados Supabase.

## 📋 Instruções

### Opção 1: Via Dashboard Supabase (Recomendado)

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione o projeto `frequencia-anual`
3. Vá em **SQL Editor**
4. Execute o SQL abaixo:

```sql
-- Adicionar coluna email
ALTER TABLE students
ADD COLUMN IF NOT EXISTS email TEXT;

-- Comentário da coluna
COMMENT ON COLUMN students.email IS 'Email do estudante (opcional)';

-- Index para busca por email (caso necessário no futuro)
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email) WHERE email IS NOT NULL;
```

5. Clique em **Run** (ou pressione Ctrl+Enter)

### Opção 2: Via CLI Supabase

```bash
# 1. Aplicar a migration
npx supabase db push

# 2. Verificar se foi aplicada
npx supabase db diff --schema public
```

## ✅ Verificação

Após executar a migration, verifique se a coluna foi adicionada:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'email';
```

Deve retornar:
```
column_name | data_type | is_nullable
------------|-----------|-------------
email       | text      | YES
```

## 📝 O que foi alterado no código

1. ✅ **Migration SQL criada**: `supabase/migrations/20250128000000_add_email_to_students.sql`
2. ✅ **SELECT queries atualizadas**: Adicionado `email` em `detailed` e `full`
3. ✅ **Interface Student atualizada**: Adicionado `email?: string | null`

## 🔄 Após executar a migration

1. Faça um commit das alterações
2. Faça deploy no Vercel (já vai ter o código atualizado)
3. Teste adicionando/editando um estudante com email

## ❓ Se der erro

Se a migration falhar, verifique:
- Se você tem permissões de ALTER TABLE
- Se a coluna já existe (nesse caso, está OK - o `IF NOT EXISTS` protege)
- Se há algum constraint que impede a adição

## 📊 Impacto

- ✅ Sem impacto em dados existentes (coluna é opcional/nullable)
- ✅ Sem quebra de compatibilidade (código já estava preparado)
- ✅ Performance: Index criado apenas para emails não-nulos
