# 🛡️ Zero-Quota Testing Strategy

## 🎯 Objetivo
Permitir testes e desenvolvimento **SEM CONSUMIR QUOTA DO FIRESTORE**.

---

## 🚨 REGRAS DE OURO

### ❌ NUNCA FAZER (Consome Quota)

1. **Bash/curl direto em APIs pesadas**
```bash
# ❌ PROIBIDO durante testes
curl "http://localhost:3000/api/students/absence-multiples"
curl "http://localhost:3000/api/automation/process-absences"

# Cada chamada = 2.000+ reads
```

2. **Task agents sem dry-run**
```bash
# ❌ PROIBIDO
Task: "Execute a API e me mostre o resultado"

# ✅ PERMITIDO
Task: "Analise o CÓDIGO da API sem executar"
```

3. **Leituras Firebase "para verificar"**
```typescript
// ❌ PROIBIDO
const students = await getDocs(collection(db, 'estudantes'));
console.log('Total:', students.size); // 700 reads desperdiçados!

// ✅ PERMITIDO (via Admin Console)
// Abrir Firebase Console → Firestore → Ver manualmente
```

4. **Múltiplas chamadas de teste**
```bash
# ❌ PROIBIDO
for i in {1..10}; do
  curl "http://localhost:3000/api/test"
done

# 10 chamadas = quota destruída
```

---

## ✅ MÉTODOS PERMITIDOS (Zero Quota)

### 1. **Análise Estática de Código**
```typescript
// Claude lê o arquivo localmente (0 reads)
// Simula mentalmente o fluxo
// Identifica problemas SEM executar
```

### 2. **Firebase Console (Manual)**
```
1. Abrir: https://console.firebase.google.com
2. Firestore Database
3. Ver 1-2 documentos manualmente
4. Consumo: ~5 reads (negligível)
```

### 3. **Logs do Servidor (Passivo)**
```bash
# ✅ Apenas OBSERVAR logs existentes
# Não fazer novas chamadas
tail -f logs/server.log
```

### 4. **Dry-Run APIs**
```bash
# ✅ SEMPRE usar dry-run quando disponível
curl "http://localhost:3000/api/automation/process-absences?dryRun=true"

# Retorna simulação SEM tocar no banco
```

### 5. **Mock/Stub Testing**
```typescript
// ✅ Criar dados mockados localmente
const mockStudents = [
  { id: '1', nome: 'Teste 1' },
  { id: '2', nome: 'Teste 2' }
];

// Testar lógica SEM Firebase
```

---

## 🔧 Implementações de Segurança

### 1. **Flag Global: TESTING_MODE**

Adicionar em `.env.local`:
```bash
TESTING_MODE=true  # Bloqueia queries pesadas
```

Usar em APIs:
```typescript
// src/app/api/students/absence-multiples/route.ts

export async function GET(request: NextRequest) {
  const isTesting = process.env.TESTING_MODE === 'true';

  if (isTesting) {
    // Retornar MOCK imediatamente (0 reads)
    return NextResponse.json({
      success: true,
      data: MOCK_STUDENTS,
      metadata: { mock: true, message: 'TESTING_MODE ativo' }
    });
  }

  // Lógica real apenas em produção
}
```

### 2. **Wrapper com Rate Limiting**

Criar `src/lib/quotaSafeQuery.ts`:
```typescript
import { getFirestore } from 'firebase-admin/firestore';

let queryCount = 0;
const MAX_QUERIES_PER_SESSION = 10; // Limite de segurança

export async function quotaSafeQuery<T>(
  queryFn: () => Promise<T>,
  mockData: T
): Promise<T> {
  const isTesting = process.env.TESTING_MODE === 'true';

  if (isTesting) {
    console.log('🛡️ [QUOTA-SAFE] Retornando mock (0 reads)');
    return mockData;
  }

  if (queryCount >= MAX_QUERIES_PER_SESSION) {
    console.warn('⚠️ [QUOTA-SAFE] Limite de queries atingido. Retornando mock.');
    return mockData;
  }

  queryCount++;
  console.log(`📊 [QUOTA-SAFE] Query ${queryCount}/${MAX_QUERIES_PER_SESSION}`);

  return await queryFn();
}

// USO:
const students = await quotaSafeQuery(
  () => adminDb.collection('estudantes').get(),
  MOCK_STUDENTS  // Fallback
);
```

### 3. **Dry-Run em TODAS as APIs Pesadas**

Padrão obrigatório:
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get('dryRun') === 'true';

  if (dryRun) {
    return NextResponse.json({
      success: true,
      data: MOCK_DATA,
      metadata: { dryRun: true }
    });
  }

  // Lógica real...
}
```

---

## 📋 Checklist: Antes de Qualquer Teste

- [ ] **TESTING_MODE** está ativo?
- [ ] API tem **dryRun** implementado?
- [ ] Posso testar com **análise de código** ao invés de executar?
- [ ] Preciso **mesmo** ler do Firebase ou posso usar mock?
- [ ] Já **documentei** quantas queries essa operação faz?
- [ ] Tem **rate limiting** implementado?

---

## 🎓 Para Claude Code

### Quando o usuário pedir "teste isso":

1. **PERGUNTAR PRIMEIRO**:
   ```
   "Posso testar de 3 formas:
   1. Análise de código (0 reads) ✅
   2. Dry-run (0 reads) ✅
   3. Execução real (2000+ reads) ⚠️

   Qual você prefere?"
   ```

2. **NUNCA executar automaticamente** APIs pesadas

3. **SEMPRE mostrar** consumo estimado antes:
   ```
   "Esta operação vai consumir ~2.124 reads.
   Isso é 4% da quota diária.
   Confirma execução?"
   ```

4. **PRIORIZAR** métodos zero-quota:
   - Leitura de código
   - Simulação mental
   - Análise de logs existentes
   - Firebase Console manual

---

## 📊 Quota Consumption Reference

| Operação | Reads | % Quota | Limite Diário |
|----------|-------|---------|---------------|
| 1 documento | 1 | 0.002% | 50.000x |
| 1 coleção (700 docs) | 700 | 1.4% | 71x |
| absence-multiples API | 2.124 | 4.2% | 23x |
| clean-atestados (all) | 700 | 1.4% | 71x |
| Dashboard load | 100 | 0.2% | 500x |

**Regra**: Nunca fazer mais de **5 operações pesadas** por sessão de teste.

---

## 🚀 Implementação Imediata

1. **Adicionar TESTING_MODE** em `.env.local`
2. **Implementar dryRun** em todas APIs pesadas
3. **Criar quotaSafeQuery** wrapper
4. **Documentar** consumo de cada endpoint

---

**Última Atualização**: 2025-10-10
**Versão**: 1.0.0
**Status**: 🛡️ Proteção Ativa
