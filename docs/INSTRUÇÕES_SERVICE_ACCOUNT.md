# Como Configurar o Firebase Admin SDK

## Problema Identificado

As APIs do Next.js estão retornando erro **"Missing or insufficient permissions"** porque:

1. As APIs rodam no **servidor** (não no navegador)
2. O Firebase Client SDK não tem autenticação configurada
3. As regras do Firestore exigem autenticação (`isAuthenticated()`)

## Solução: Configurar Firebase Admin SDK com Service Account

### Passo 1: Gerar Service Account Key

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto **frequencia-anual**
3. Vá em **Configurações do projeto** (⚙️ > Project Settings)
4. Vá na aba **Service Accounts**
5. Clique em **Generate new private key**
6. Confirme e faça o download do arquivo JSON

### Passo 2: Adicionar ao Projeto

**Opção A: Variável de ambiente (Recomendado)**

1. Abra o arquivo `.env.local` na raiz do projeto
2. Adicione a seguinte linha com o conteúdo do JSON (em uma única linha):

```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"frequencia-anual",...}'
```

**IMPORTANTE**: Cole todo o conteúdo do JSON como uma string, removendo quebras de linha.

**Opção B: Arquivo separado (Alternativa)**

1. Salve o arquivo JSON como `serviceAccountKey.json` na raiz do projeto
2. Adicione ao `.gitignore`:
   ```
   serviceAccountKey.json
   ```

3. Atualize `src/lib/firebaseAdmin.ts` para carregar o arquivo:
   ```typescript
   import serviceAccount from '../../serviceAccountKey.json';

   admin.initializeApp({
     credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
   });
   ```

### Passo 3: Reiniciar o Servidor

```bash
# Parar o servidor atual (Ctrl+C)

# Limpar cache do Next.js
rm -rf .next

# Iniciar novamente
npm run dev
```

### Passo 4: Testar

```bash
curl -X GET "http://localhost:3000/api/students/absence-multiples?absenceMultiple=3&referenceMonth=9" \
  -H "Authorization: Basic aGFiaWItYXBpOnRuTFZFVHdjd0w4Z3k0WkpUdFVETEFBZEw0QlhtOA=="
```

Deve retornar sucesso ou os dados dos estudantes.

## Verificação

Para verificar se está funcionando, teste a rota de debug:

```bash
curl -X GET "http://localhost:3000/api/debug/test-month?month=9"
```

Deve mostrar os dias letivos encontrados sem erro de permissões.

## Segurança

⚠️ **IMPORTANTE**:
- **NUNCA** commite o arquivo `serviceAccountKey.json` ou a variável `FIREBASE_SERVICE_ACCOUNT_KEY` no Git
- Adicione ao `.gitignore`:
  ```
  serviceAccountKey.json
  .env.local
  ```
- Em produção (Vercel, etc.), adicione a variável de ambiente no painel de configuração

## Alternativa: Ajustar Regras do Firestore (Não Recomendado para Produção)

Se for apenas para desenvolvimento/teste, você pode temporariamente relaxar as regras do Firestore:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // APENAS PARA DESENVOLVIMENTO - REMOVER EM PRODUÇÃO!
    match /{document=**} {
      allow read, write: if true;  // ⚠️ INSEGURO!
    }
  }
}
```

**⚠️ CUIDADO**: Isso torna o banco completamente público. Use apenas em desenvolvimento local.

## Resultado Esperado

Após a configuração correta, a API deverá retornar:

```json
{
  "success": true,
  "data": [
    {
      "estudanteId": "uuid-123",
      "nome": "João Silva",
      "turma": "6A",
      "turno": "MANHÃ",
      "absencesCount": 3,
      "verifiedWhatsAppContacts": [...]
    }
  ],
  "metadata": {
    "totalStudentsAnalyzed": 150,
    "studentsWithTargetMultiples": 5,
    "schoolDaysInMonth": 20,
    "executionTimeMs": 1234
  }
}
```

## Problemas Comuns

### 1. Erro "Could not load the default credentials"
- Certifique-se de que adicionou a variável `FIREBASE_SERVICE_ACCOUNT_KEY` ao `.env.local`
- Reinicie o servidor Next.js

### 2. Erro "Missing or insufficient permissions" persiste
- Verifique se o JSON está correto e completo
- Certifique-se de que o service account tem permissões no projeto Firebase

### 3. JSON malformado
- Use uma ferramenta online para validar o JSON
- Certifique-se de que não há quebras de linha ou caracteres especiais

---

**Nota**: Este guia pressupõe que você tem acesso ao Firebase Console e permissões para gerar service accounts.
