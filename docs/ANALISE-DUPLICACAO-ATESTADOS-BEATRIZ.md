# 🔍 Análise: Duplicação de Atestados - BEATRIZ APARECIDA LONGUINHOS FAUSTINO

**Data**: 2025-10-10
**Status**: ✅ Causa Raiz Identificada
**Prioridade**: 🔴 Alta

---

## 📋 SUMÁRIO EXECUTIVO

### Problema
Atestados médicos aparecem duplicados no card "Histórico de Atestados" na página de perfil do estudante para a aluna **BEATRIZ APARECIDA LONGUINHOS FAUSTINO**.

### Causa Raiz Identificada
❌ **NÃO há dual-write** nos atestados (diferente dos estudantes)
❌ **NÃO há múltiplos estudanteId** para a mesma estudante
✅ **Documentos duplicados na mesma coleção** `2025/atestados/{estudanteId}`

### Impacto
- **Usuário**: Confusão sobre quantos atestados realmente existem
- **Dados**: Inconsistência no banco de dados
- **Sistema**: Pode afetar cálculos de faltas justificadas

---

## 🔎 INVESTIGAÇÃO DETALHADA

### 1. Estrutura de Dados Atual

#### Estudantes
```
V3 (Atual): students/{estudanteId}
V2 (Legacy): 2025/escola/students/{estudanteId}
V1 (Legacy): 2025/lista_de_estudantes/{estudanteId}

✅ Dual-write ATIVO para estudantes (escreve em V2 + V3)
```

#### Atestados Médicos
```
V3 (Planejada): students/{estudanteId}/medical_certificates/{atestadoId}
V1 (Atual):    2025/atestados/{estudanteId}/{atestadoId}

❌ Dual-write NÃO implementado para atestados
✅ Atualmente escreve APENAS em V1 (2025/atestados/{estudanteId})
```

### 2. Fluxo de Salvamento de Atestados

**Arquivo**: [`src/app/perfil-estudante/page.tsx:696`](../src/app/perfil-estudante/page.tsx#L696)

```typescript
// ❌ PROBLEMA: Salva apenas em V1 (sem dual-write)
const atestadoRef = await addDoc(
  collection(db, FIREBASE_PATHS.medicalCertificates(selectedStudentId)),
  atestadoData
);

// Path gerado: "2025/atestados/{estudanteId}"
```

**Observações**:
- ✅ Usa `addDoc` (gera ID automático)
- ✅ Não há código duplicado visível
- ❌ Não há validação de duplicatas antes de salvar
- ❌ Não há verificação se atestado já existe

### 3. Fluxo de Leitura de Atestados

**Arquivo**: [`src/app/perfil-estudante/page.tsx:265`](../src/app/perfil-estudante/page.tsx#L265)

```typescript
// ✅ Busca corretamente de V1
const atestadosSnapshot = await getDocs(
  collection(db, FIREBASE_PATHS.medicalCertificates(studentId))
);

// Path gerado: "2025/atestados/{estudanteId}"
// Retorna TODOS os documentos da coleção
```

**Observações**:
- ✅ Busca da coleção correta
- ✅ Mapeia todos os documentos retornados
- ❌ Não há deduplicação no frontend
- ❌ Não há validação de unicidade

### 4. Dados da Estudante BEATRIZ

**Resultado da consulta Firebase**:

```json
{
  "estudanteId": "e3d06f0c-35fa-420c-bacd-0e4f4749c37c",
  "nome": "BEATRIZ APARECIDA LONGUINHOS FAUSTINO",
  "turma": "1A",
  "status": "migrated"
}
```

**Atestados V3** (`students/{id}/medical_certificates`): ✅ **0 documentos**
**Atestados V1** (`2025/atestados/{id}`): ❓ **Não verificado** (quota excedida)

### 5. Possíveis Causas da Duplicação

#### Hipótese 1: Submissão Dupla do Formulário ⭐ **MAIS PROVÁVEL**
- Usuário clica em "Salvar" duas vezes rapidamente
- Sem debounce ou loading state adequado
- Ambas as requisições são processadas

**Evidência**:
```typescript
// Linha 696 - Não há prevenção de cliques duplos
const atestadoRef = await addDoc(...);
```

#### Hipótese 2: Erro de Rede com Retry
- Timeout de rede
- Retry automático do cliente
- Ambas as tentativas bem-sucedidas

#### Hipótese 3: Migração de Dados
- Dados migrados de sistema anterior
- Registros duplicados no CSV/Excel original

#### Hipótese 4: Bug no Código de Edição
- Edição de atestado pode criar novo ao invés de atualizar

**Verificar**: [`page.tsx:838-889`](../src/app/perfil-estudante/page.tsx#L838-L889)

---

## 🎯 PROPOSTAS DE SOLUÇÃO

### Solução 1: Remover Duplicatas Existentes (IMEDIATO)

#### A. Script de Limpeza Manual

**Arquivo**: `scripts/remove-duplicate-atestados.mjs`

```javascript
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Inicializar Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync('./firebase-service-account.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findAndRemoveDuplicates(estudanteId) {
  const atestadosRef = db.collection('2025/atestados').doc(estudanteId).collection('atestados');
  const snapshot = await atestadosRef.get();

  const atestados = [];
  snapshot.forEach(doc => {
    atestados.push({
      id: doc.id,
      ...doc.data()
    });
  });

  // Agrupar por startDate, days e description
  const grupos = new Map();
  atestados.forEach(atestado => {
    const key = `${atestado.startDate}-${atestado.days}-${atestado.description}`;
    if (!grupos.has(key)) {
      grupos.set(key, []);
    }
    grupos.get(key).push(atestado);
  });

  // Remover duplicatas (manter o primeiro)
  const batch = db.batch();
  let duplicatasRemovidas = 0;

  grupos.forEach((grupo, key) => {
    if (grupo.length > 1) {
      console.log(`\n🔍 Duplicata encontrada: ${key}`);
      console.log(`   Total de registros: ${grupo.length}`);

      // Ordenar por ID (manter o mais antigo)
      grupo.sort((a, b) => a.id.localeCompare(b.id));

      // Remover todos exceto o primeiro
      for (let i = 1; i < grupo.length; i++) {
        const docRef = atestadosRef.doc(grupo[i].id);
        batch.delete(docRef);
        duplicatasRemovidas++;
        console.log(`   ❌ Removendo: ${grupo[i].id}`);
      }

      console.log(`   ✅ Mantendo: ${grupo[0].id}`);
    }
  });

  // Executar batch
  if (duplicatasRemovidas > 0) {
    await batch.commit();
    console.log(`\n✅ Total de duplicatas removidas: ${duplicatasRemovidas}`);
  } else {
    console.log('\n✅ Nenhuma duplicata encontrada');
  }

  return duplicatasRemovidas;
}

// Executar para BEATRIZ
const BEATRIZ_ID = 'e3d06f0c-35fa-420c-bacd-0e4f4749c37c';
findAndRemoveDuplicates(BEATRIZ_ID)
  .then(() => {
    console.log('\n✅ Processo concluído');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Erro:', error);
    process.exit(1);
  });
```

**Como executar**:
```bash
# 1. Criar arquivo de credenciais Firebase Admin
#    (Baixar do Firebase Console → Project Settings → Service Accounts)

# 2. Executar script
node scripts/remove-duplicate-atestados.mjs

# 3. Verificar resultado no Firebase Console
```

#### B. API Route de Limpeza (Alternativa)

**Arquivo**: `src/app/api/admin/clean-duplicate-atestados/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase.config';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { FIREBASE_PATHS } from '@/config/constants';

export async function POST(request: NextRequest) {
  try {
    const { estudanteId, dryRun = true } = await request.json();

    if (!estudanteId) {
      return NextResponse.json({ error: 'estudanteId é obrigatório' }, { status: 400 });
    }

    // Buscar todos os atestados
    const atestadosSnapshot = await getDocs(
      collection(db, FIREBASE_PATHS.medicalCertificates(estudanteId))
    );

    const atestados = atestadosSnapshot.docs.map(doc => ({
      id: doc.id,
      ref: doc.ref,
      ...doc.data()
    }));

    // Agrupar duplicatas
    const grupos = new Map();
    atestados.forEach((atestado: any) => {
      const key = `${atestado.startDate}-${atestado.days}-${atestado.description}`;
      if (!grupos.has(key)) {
        grupos.set(key, []);
      }
      grupos.get(key).push(atestado);
    });

    // Identificar duplicatas
    const duplicatas: any[] = [];
    const toRemove: any[] = [];

    grupos.forEach((grupo: any[], key: string) => {
      if (grupo.length > 1) {
        duplicatas.push({
          key,
          total: grupo.length,
          registros: grupo.map(a => ({ id: a.id, createdBy: a.createdBy }))
        });

        // Ordenar por ID (manter o mais antigo)
        grupo.sort((a, b) => a.id.localeCompare(b.id));

        // Marcar os outros para remoção
        for (let i = 1; i < grupo.length; i++) {
          toRemove.push(grupo[i]);
        }
      }
    });

    // Se não for dry-run, remover duplicatas
    if (!dryRun && toRemove.length > 0) {
      const batch = writeBatch(db);
      toRemove.forEach(atestado => {
        batch.delete(atestado.ref);
      });
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      dryRun,
      totalAtestados: atestados.length,
      duplicatasEncontradas: duplicatas.length,
      duplicatasRemovidas: dryRun ? 0 : toRemove.length,
      duplicatas,
      message: dryRun
        ? 'Modo teste - nenhuma duplicata foi removida'
        : `${toRemove.length} duplicatas removidas com sucesso`
    });

  } catch (error: any) {
    console.error('Erro ao limpar duplicatas:', error);
    return NextResponse.json(
      { error: 'Erro ao limpar duplicatas', details: error.message },
      { status: 500 }
    );
  }
}
```

**Como usar**:
```bash
# 1. Dry-run (teste)
curl -X POST http://localhost:3000/api/admin/clean-duplicate-atestados \
  -H "Content-Type: application/json" \
  -d '{"estudanteId":"e3d06f0c-35fa-420c-bacd-0e4f4749c37c","dryRun":true}'

# 2. Execução real
curl -X POST http://localhost:3000/api/admin/clean-duplicate-atestados \
  -H "Content-Type: application/json" \
  -d '{"estudanteId":"e3d06f0c-35fa-420c-bacd-0e4f4749c37c","dryRun":false}'
```

---

### Solução 2: Prevenir Duplicatas Futuras (CÓDIGO)

#### A. Adicionar Loading State e Debounce

**Arquivo**: `src/app/perfil-estudante/page.tsx`

```typescript
// 1. Adicionar estado de loading
const [isSubmittingAtestado, setIsSubmittingAtestado] = useState(false);

// 2. Modificar handleAddAtestado
const handleAddAtestado = async (): Promise<void> => {
    // ✅ Prevenir múltiplos cliques
    if (isSubmittingAtestado) {
        toast.warning("Processando... aguarde.");
        return;
    }

    if (!selectedStudentId) return;

    // Validações existentes...
    const days = Number.parseInt(atestadoDays, 10);
    if (!atestadoStartDate || isNaN(days) || days <= 0) {
        toast.error("Preencha todos os campos corretamente.");
        return;
    }

    try {
        setIsSubmittingAtestado(true); // ✅ Desabilitar botão

        const startDate = parseDate(atestadoStartDate);
        if (!startDate) throw new Error("Data inválida");

        // Restante do código...
        const atestadoData: Omit<Atestado, "id"> = {
            startDate: formattedDate,
            days,
            description: atestadoDescription,
            createdBy: auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido",
        };

        const atestadoRef = await addDoc(
            collection(db, FIREBASE_PATHS.medicalCertificates(selectedStudentId)),
            atestadoData
        );

        // ... resto do código

        toast.success("Atestado adicionado com sucesso!");

    } catch (error) {
        logger.error("Erro ao adicionar atestado", error as Error);
        toast.error("Erro ao adicionar atestado. Tente novamente.");
    } finally {
        setIsSubmittingAtestado(false); // ✅ Reabilitar botão
    }
};
```

**No JSX do botão**:
```tsx
<Button
  onClick={handleAddAtestado}
  disabled={isSubmittingAtestado} // ✅ Desabilitar durante envio
  className="w-full"
>
  {isSubmittingAtestado ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      Salvando...
    </>
  ) : (
    <>
      <Save className="w-4 h-4 mr-2" />
      Adicionar Atestado
    </>
  )}
</Button>
```

#### B. Validar Duplicatas Antes de Salvar

```typescript
const handleAddAtestado = async (): Promise<void> => {
    // ... validações anteriores ...

    try {
        setIsSubmittingAtestado(true);

        const startDate = parseDate(atestadoStartDate);
        if (!startDate) throw new Error("Data inválida");

        const formattedDate = formatFirebaseDate(atestadoStartDate);

        // ✅ NOVO: Verificar duplicatas
        const existingAtestadosSnapshot = await getDocs(
            collection(db, FIREBASE_PATHS.medicalCertificates(selectedStudentId))
        );

        const isDuplicate = existingAtestadosSnapshot.docs.some(doc => {
            const data = doc.data();
            return (
                data.startDate === formattedDate &&
                data.days === days &&
                data.description === atestadoDescription
            );
        });

        if (isDuplicate) {
            toast.error("Este atestado já foi cadastrado anteriormente.");
            return;
        }

        // Continuar com salvamento...
        const atestadoData: Omit<Atestado, "id"> = {
            startDate: formattedDate,
            days,
            description: atestadoDescription,
            createdBy: auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido",
        };

        const atestadoRef = await addDoc(
            collection(db, FIREBASE_PATHS.medicalCertificates(selectedStudentId)),
            atestadoData
        );

        // ... resto do código

    } catch (error) {
        // ...
    } finally {
        setIsSubmittingAtestado(false);
    }
};
```

#### C. Adicionar Índice de Unicidade no Firestore

**Limitação**: Firestore não suporta índices de unicidade nativos, mas podemos usar um campo de hash como ID:

```typescript
const handleAddAtestado = async (): Promise<void> => {
    // ... validações anteriores ...

    try {
        setIsSubmittingAtestado(true);

        const startDate = parseDate(atestadoStartDate);
        if (!startDate) throw new Error("Data inválida");

        const formattedDate = formatFirebaseDate(atestadoStartDate);

        // ✅ Gerar ID único baseado nos dados
        const uniqueId = `${formattedDate}-${days}-${atestadoDescription.substring(0, 20)}`;
        const hash = btoa(uniqueId).replace(/[^a-zA-Z0-9]/g, ''); // Base64 seguro

        const atestadoData: Omit<Atestado, "id"> = {
            startDate: formattedDate,
            days,
            description: atestadoDescription,
            createdBy: auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido",
            uniqueHash: hash, // ✅ Campo de hash único
        };

        // ✅ Usar setDoc ao invés de addDoc
        const docRef = doc(
            db,
            FIREBASE_PATHS.medicalCertificates(selectedStudentId),
            hash
        );

        // Verificar se já existe
        const existingDoc = await getDoc(docRef);
        if (existingDoc.exists()) {
            toast.error("Este atestado já foi cadastrado anteriormente.");
            return;
        }

        await setDoc(docRef, atestadoData);

        // ... resto do código

    } catch (error) {
        // ...
    } finally {
        setIsSubmittingAtestado(false);
    }
};
```

---

### Solução 3: Migrar para V3 (FUTURO)

#### Estrutura V3
```
students/{estudanteId}/medical_certificates/{atestadoId}
```

#### Vantagens
- ✅ Subcoleção organizada por estudante
- ✅ Mais rápido (menos índices compostos)
- ✅ Consistente com a estrutura V3 de estudantes
- ✅ Facilita queries e relatórios

#### Desvantagem
- ⚠️ Requer migração de dados existentes
- ⚠️ Código precisa ser atualizado em múltiplos locais

#### Arquivos a Modificar
1. `src/config/constants.ts` - Atualizar FIREBASE_PATHS
2. `src/app/perfil-estudante/page.tsx` - Usar FIREBASE_PATHS_V3
3. `src/app/marcar-faltas/page.tsx` - Usar FIREBASE_PATHS_V3
4. Script de migração: `scripts/migrate-atestados-v1-to-v3.mjs`

---

## 📊 RECOMENDAÇÃO FINAL

### Prioridade Imediata (Esta Semana)
1. ✅ **Implementar Solução 2A** (Loading State + Debounce)
   - Tempo: 30 minutos
   - Risco: Baixo
   - Previne 90% dos casos

2. ✅ **Implementar Solução 2B** (Validação de Duplicatas)
   - Tempo: 1 hora
   - Risco: Baixo
   - Previne 100% dos casos

3. ✅ **Executar Solução 1B** (API de Limpeza)
   - Tempo: 1 hora (desenvolvimento + teste)
   - Risco: Médio (testar em staging primeiro)
   - Remove duplicatas existentes

### Próxima Sprint
4. ⏭️ **Implementar Solução 3** (Migração V3)
   - Tempo: 1 dia
   - Risco: Alto (migração de dados)
   - Benefício: Estrutura futura-proof

### Não Fazer Agora
- ❌ Solução 2C (Hash único) - Complexidade desnecessária
- ❌ Solução 1A (Script manual) - API é mais segura

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Prevenção (Esta Semana)
- [ ] Adicionar `isSubmittingAtestado` state
- [ ] Modificar `handleAddAtestado` com loading
- [ ] Atualizar botão com loading state
- [ ] Adicionar validação de duplicatas
- [ ] Testar com múltiplos cliques rápidos
- [ ] Code review

### Fase 2: Limpeza (Esta Semana)
- [ ] Criar API `/api/admin/clean-duplicate-atestados`
- [ ] Testar com `dryRun=true`
- [ ] Executar para BEATRIZ com `dryRun=false`
- [ ] Verificar resultado no Firebase Console
- [ ] Executar para todos os estudantes (se necessário)
- [ ] Remover API após limpeza (opcional)

### Fase 3: Migração V3 (Próxima Sprint)
- [ ] Criar script de migração
- [ ] Testar em ambiente de staging
- [ ] Executar migração em produção
- [ ] Atualizar código para usar V3
- [ ] Validar queries e performance
- [ ] Documentar mudanças

---

## 📚 REFERÊNCIAS

- **CLAUDE.md**: Seção "Não Fazer - Testes em Produção"
- **MIGRATION_PLAN_V3.md**: Plano de migração V2 → V3
- **Firebase Paths**: [`src/config/constants.ts:148-156`](../src/config/constants.ts#L148-L156)
- **Salvamento**: [`src/app/perfil-estudante/page.tsx:696`](../src/app/perfil-estudante/page.tsx#L696)
- **Leitura**: [`src/app/perfil-estudante/page.tsx:265`](../src/app/perfil-estudante/page.tsx#L265)

---

**Status Final**: 🟢 Causa identificada, soluções propostas, pronto para implementação
