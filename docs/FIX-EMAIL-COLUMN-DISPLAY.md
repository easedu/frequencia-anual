# Fix: Coluna de E-mail Não Aparecia na Tabela

**Data**: 2025-10-28
**Status**: ✅ CORRIGIDO

## 🐛 Problema

Apesar de:
- ✅ Coluna `email` criada no Supabase
- ✅ 402 e-mails importados com sucesso
- ✅ SELECT queries incluindo `email`
- ✅ Tipos TypeScript corretos

A coluna de **E-mail** continuava **vazia** na tabela de estudantes.

## 🔍 Causa Raiz

No arquivo `src/app/api/students/route.ts`, a função `convertSupabaseToEstudante()` estava **sobrescrevendo** o campo `email` com `undefined` no nível de detalhamento `full`:

```typescript
// ❌ CÓDIGO COM BUG (linha 446)
return {
  ...detailed,
  email: undefined,  // ← SOBRESCREVE o email que vinha de 'detailed'!
  contatos: contacts.map(...),
}
```

### Por que isso aconteceu?

1. O campo `email` estava corretamente no objeto `summary` (linha 410):
   ```typescript
   const summary = {
     ...base,
     email: student.email || '',  // ✅ Correto
   }
   ```

2. E também no objeto `detailed` (que herda de `summary`):
   ```typescript
   const detailed = {
     ...summary,  // ✅ Inclui email
     // ... outros campos
   }
   ```

3. **MAS** no objeto `full`, o email era sobrescrito:
   ```typescript
   return {
     ...detailed,  // ✅ Traz o email
     email: undefined,  // ❌ SOBRESCREVE com undefined!
   }
   ```

4. Como a página `cadastrar-estudante` usa `detail: 'full'`, o email sempre vinha `undefined`.

## ✅ Solução

**Arquivo**: `src/app/api/students/route.ts`

**Mudança**: Remover a linha que sobrescreve `email` com `undefined`

```diff
  return {
    ...detailed,
-   email: undefined,
    contatos: contacts.map((contact) => ({
      nome: contact.name,
      // ...
    })),
  };
```

## 🧪 Como Testar

1. **Limpar cache do React Query**:
   ```typescript
   // No navegador (DevTools Console):
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

2. **Acessar página**:
   ```
   http://localhost:3000/cadastrar-estudante
   ```

3. **Verificar coluna E-mail**:
   - ✅ Deve mostrar e-mails dos 402 estudantes
   - ✅ Deve mostrar "Não informado" para estudantes sem e-mail

4. **Verificar API diretamente** (com token válido):
   ```bash
   curl http://localhost:3000/api/students?detail=full&limit=1 \
     -H 'Authorization: Bearer TOKEN'
   ```

   Deve retornar:
   ```json
   {
     "data": [{
       "email": "manusilva172303@gmail.com",
       "nome": "ANA GABRIELLY MARTINS..."
     }]
   }
   ```

## 📊 Verificação Final

Após a correção:

```bash
# 1. Reiniciar servidor dev
npm run dev

# 2. Verificar que API retorna email
# (fazer login primeiro no navegador e copiar o token)

# 3. Acessar /cadastrar-estudante
# 4. Coluna E-mail deve aparecer!
```

## 🔐 Type Safety

✅ Nenhum uso de `any` introduzido
✅ Tipos TypeScript mantidos corretos
✅ 0 erros de lint

## 📝 Resumo

| Antes | Depois |
|-------|--------|
| ❌ E-mail sempre `undefined` no nível `full` | ✅ E-mail retornado corretamente |
| ❌ Coluna vazia na tabela | ✅ 402 e-mails visíveis |
| ❌ Bug silencioso (sem erro no console) | ✅ Funcionando como esperado |

## 🎯 Lições Aprendidas

1. **Cuidado com spread operator**: `{ ...obj, field: undefined }` sobrescreve!
2. **Testar todos os níveis de detail**: `minimal`, `summary`, `detailed`, `full`
3. **Cache pode mascarar problemas**: Sempre limpar cache ao testar mudanças de API

---

**Commit**: `fix: remover sobrescrita de email com undefined em API full detail level`
