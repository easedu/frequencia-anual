# Correção da API /students/absence-multiples

## Problema Identificado

A API estava retornando o erro: **"Nenhum dia letivo encontrado para o mês 9"**

### Causa Raiz

O código estava usando o **Firebase Client SDK** (`firebase/firestore`) em uma API Route do Next.js que roda no servidor. As regras de segurança do Firestore exigem autenticação (`isAuthenticated()`) para acessar os dados, mas a API não estava autenticada.

```typescript
// ❌ ANTES - Client SDK sem autenticação
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase.config';

const docRef = doc(db, SCHOOL_YEAR, 'ano_letivo');
const docSnap = await getDoc(docRef);
// Resultado: Missing or insufficient permissions
```

## Solução Implementada

Migração para **Firebase Admin SDK**, que tem permissões administrativas completas e é apropriado para uso em APIs server-side.

### Mudanças Realizadas

#### 1. Criação do Firebase Admin Config
**Arquivo:** `src/lib/firebaseAdmin.ts`

```typescript
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      });
    }
  } catch (error) {
    console.log('Firebase admin initialization error', error);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export default admin;
```

#### 2. Atualização da API Route
**Arquivo:** `src/app/api/students/absence-multiples/route.ts`

```typescript
// ✅ DEPOIS - Admin SDK com permissões completas
import { adminDb } from '@/lib/firebaseAdmin';

const docRef = adminDb.doc(`${SCHOOL_YEAR}/ano_letivo`);
const docSnap = await docRef.get();
// Resultado: Acesso garantido ✅
```

#### 3. Migração de todas as operações Firestore

| Operação | Client SDK (Antes) | Admin SDK (Depois) |
|----------|-------------------|-------------------|
| **Documento** | `doc(db, path)` → `getDoc(docRef)` | `adminDb.doc(path)` → `docRef.get()` |
| **Coleção** | `collection(db, path)` → `getDocs(collRef)` | `adminDb.collection(path)` → `collRef.get()` |
| **Query** | `query(collRef, where(...))` → `getDocs(q)` | `collRef.where(...)` → `q.get()` |
| **Existência** | `docSnap.exists()` | `docSnap.exists` |

#### 4. Melhorias Adicionais

- **Correção na função `getSchoolDaysForMonth`**: Melhor parsing de mês (aceita "9" e "09")
- **Remoção de logs de debug**: Código de produção mais limpo
- **Otimização de comparações**: Uso de `parseInt()` para comparação numérica de meses

## Configuração Necessária

### Opção 1: Application Default Credentials (Desenvolvimento)
Para desenvolvimento local, o Admin SDK usa as credenciais padrão do projeto Firebase.

### Opção 2: Service Account (Produção)
Para produção, adicione ao `.env.local` ou variáveis de ambiente:

```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"frequencia-anual",...}'
```

## Como Testar

1. **Reinicie o servidor Next.js:**
   ```bash
   npm run dev
   ```

2. **Execute o teste:**
   ```bash
   ./test-api.sh
   ```

   Ou manualmente:
   ```bash
   curl -X GET "http://localhost:3000/api/students/absence-multiples?absenceMultiple=3&referenceMonth=9" \
     -H "Authorization: Basic aGFiaWItYXBpOnRuTFZFVHdjd0w4Z3k0WkpUdFVETEFBZEw0QlhtOA=="
   ```

## Resultado Esperado

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

## Arquivos Modificados

- ✅ `src/lib/firebaseAdmin.ts` (novo)
- ✅ `src/app/api/students/absence-multiples/route.ts` (atualizado)
- ✅ `test-api.sh` (novo - script de teste)

## Arquivos Removidos

- 🗑️ `scripts/test-db-structure.ts`
- 🗑️ `src/app/api/debug/year-data/route.ts`
- 🗑️ `src/app/api/debug/test-year/route.ts`

## Notas Importantes

1. **Firebase Admin SDK** é a solução recomendada para APIs server-side
2. As regras do Firestore continuam ativas para acesso client-side
3. O Admin SDK bypassa as regras de segurança (por isso deve ser usado apenas no servidor)
4. Certifique-se de reiniciar o servidor Next.js após as mudanças

## Próximos Passos

Se outras APIs routes tiverem o mesmo problema, aplique a mesma solução:
1. Importar `adminDb` de `@/lib/firebaseAdmin`
2. Substituir operações do Client SDK pelas do Admin SDK
3. Testar e validar

---
**Data da correção:** 01/10/2025
**Desenvolvedor:** Claude Code
