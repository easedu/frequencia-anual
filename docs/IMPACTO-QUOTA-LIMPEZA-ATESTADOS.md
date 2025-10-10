# 📊 Análise de Impacto na Quota: Limpeza de Atestados Duplicados

**Data**: 2025-10-10
**Contexto**: API de limpeza de duplicatas de atestados
**Status**: 🟡 Requer atenção - Uso moderado de quota

---

## 🎯 SUMÁRIO EXECUTIVO

### Quota do Firestore (Plano Gratuito)
```
📖 Reads:  50,000 / dia
✍️  Writes: 20,000 / dia
🔄 Reset:  04:00 AM (horário de Brasília)
```

### Impacto Estimado da Limpeza

| Operação | Cenário Beatriz | Cenário Todos (700 estudantes) |
|----------|----------------|-------------------------------|
| **Reads** | ~1 read | ~700 reads |
| **Writes** | ~1-2 writes | ~350-700 writes (estimado) |
| **% Quota Reads** | 0.002% | 1.4% |
| **% Quota Writes** | 0.005-0.01% | 1.75-3.5% |
| **Segurança** | ✅ Muito seguro | ✅ Seguro |

---

## 📐 CÁLCULO DETALHADO

### Cenário 1: Limpeza para 1 Estudante (BEATRIZ)

#### Operação: `POST /api/admin/clean-duplicate-atestados`

**Parâmetros**:
```json
{
  "estudanteId": "e3d06f0c-35fa-420c-bacd-0e4f4749c37c",
  "dryRun": true
}
```

#### Firestore Operations:

**1. Leitura dos Atestados**
```typescript
const atestadosSnapshot = await getDocs(
  collection(db, FIREBASE_PATHS.medicalCertificates(estudanteId))
);
// Path: "2025/atestados/{estudanteId}"
```

**Custo**:
- ✅ **1 query** = 1 read inicial
- ➕ **N reads** (1 por documento na coleção)
- Se BEATRIZ tem 2 atestados duplicados: **1 + 2 = 3 reads**

**2. Processamento Local (SEM custo Firestore)**
- Agrupamento por duplicatas (JavaScript)
- Identificação de registros a remover (JavaScript)
- ✅ **0 reads/writes adicionais**

**3. Remoção de Duplicatas (apenas se `dryRun=false`)**
```typescript
const batch = writeBatch(db);
toRemove.forEach(atestado => {
  batch.delete(atestado.ref);
});
await batch.commit();
```

**Custo**:
- ✅ **N writes** (1 por documento deletado)
- Se BEATRIZ tem 1 duplicata: **1 write**

#### Total - BEATRIZ:
```
Dry-run:  3 reads + 0 writes
Real:     3 reads + 1 write
```

---

### Cenário 2: Limpeza para TODOS os Estudantes

#### Premissas:
- **700 estudantes** no sistema
- **Média de 2 atestados por estudante** (estimativa conservadora)
- **Taxa de duplicação: 5%** (estimativa pessimista - provavelmente menor)

#### Cálculo:

**Reads**:
```
Por estudante: 1 query + 2 documentos = 3 reads
Total: 700 estudantes × 3 reads = 2,100 reads
```

**Writes** (apenas duplicatas):
```
Total de atestados: 700 × 2 = 1,400 atestados
Duplicatas (5%): 1,400 × 0.05 = 70 duplicatas
Writes necessários: 70 deletes = 70 writes
```

#### Total - TODOS:
```
Dry-run:  2,100 reads + 0 writes (4.2% da quota diária)
Real:     2,100 reads + 70 writes (4.2% reads + 0.35% writes)
```

---

### Cenário 3: Taxa de Duplicação Realista

Na prática, a duplicação é **rara** (provavelmente < 1%):

**Reads**:
```
700 estudantes × 3 reads = 2,100 reads (4.2% quota)
```

**Writes** (1% duplicação):
```
1,400 atestados × 0.01 = 14 duplicatas
Writes: 14 deletes (0.07% quota)
```

#### Total - Realista:
```
Dry-run:  2,100 reads (4.2% quota)
Real:     2,100 reads + 14 writes (4.2% + 0.07%)
```

---

## ⚠️ RISCOS E MITIGAÇÕES

### Risco 1: Quota Já Consumida Hoje
**Problema**: Se a quota já foi excedida (como ocorreu durante investigação), a API falhará.

**Mitigação**:
```bash
# Verificar uso atual da quota
# Firebase Console → Firestore → Usage

# Ou aguardar reset (04:00 AM)
```

**Solução**: Executar após reset da quota (04:00 AM).

---

### Risco 2: Muitos Atestados por Estudante
**Problema**: Se um estudante tiver 50+ atestados, o custo de reads aumenta.

**Mitigação**: API já está otimizada (1 query + N docs).

**Exemplo**:
- Estudante com 50 atestados: 1 + 50 = 51 reads
- Mas isso é **excepcional** (média esperada: 2-5 atestados)

---

### Risco 3: Executar Múltiplas Vezes
**Problema**: Executar a API 10x consome 10x a quota.

**Mitigação**:
- ✅ Usar `dryRun=true` para teste (apenas reads)
- ✅ Executar `dryRun=false` **apenas 1 vez**
- ✅ Logar resultados para verificar antes de executar de novo

---

## 🎯 ESTRATÉGIAS DE OTIMIZAÇÃO

### Estratégia 1: Limpeza Seletiva (RECOMENDADO)

**Limpar apenas estudantes com duplicatas conhecidas**:

```bash
# 1. Dry-run para BEATRIZ
curl -X POST http://localhost:3000/api/admin/clean-duplicate-atestados \
  -H "Content-Type: application/json" \
  -d '{"estudanteId":"e3d06f0c-35fa-420c-bacd-0e4f4749c37c","dryRun":true}'

# 2. Se encontrar duplicatas, executar real
curl -X POST http://localhost:3000/api/admin/clean-duplicate-atestados \
  -H "Content-Type: application/json" \
  -d '{"estudanteId":"e3d06f0c-35fa-420c-bacd-0e4f4749c37c","dryRun":false}'
```

**Custo**:
```
Dry-run: 3 reads (0.006% quota)
Real:    3 reads + 1 write (0.006% + 0.005%)
```

✅ **Impacto mínimo** na quota

---

### Estratégia 2: Limpeza em Lotes (Segura para Todos)

**Dividir em múltiplos dias** se necessário:

```bash
# Dia 1: Primeiros 200 estudantes
# Dia 2: Próximos 200 estudantes
# Dia 3: Próximos 200 estudantes
# Dia 4: Últimos 100 estudantes
```

**Custo por dia**:
```
200 estudantes × 3 reads = 600 reads (1.2% quota)
Writes: ~10-20 (0.05-0.1% quota)
```

✅ **Distribuído** - sem risco de exceder quota

---

### Estratégia 3: Limpeza Completa de Uma Vez

**Executar para todos os 700 estudantes em 1 dia**:

```bash
# Script para iterar todos os estudantes
# (Criar script separado se necessário)
```

**Custo**:
```
2,100 reads (4.2% quota)
70 writes (0.35% quota)
```

✅ **Seguro** - ainda sobra 95.8% da quota do dia

⚠️ **Atenção**: Não executar se já houver tráfego alto no dia

---

## 📊 COMPARAÇÃO COM OUTRAS OPERAÇÕES

### Contexto: O que já usa quota diariamente?

| Operação | Reads/dia | Writes/dia |
|----------|-----------|------------|
| Dashboard (home) | ~100-200 | 0 |
| Cadastrar estudante | 2 | 2-3 (dual-write) |
| Marcar faltas (20 estudantes) | 40 | 20 |
| Consulta perfil estudante | 5-10 | 0 |
| Atualizar atestado | 5 | 2 |
| **Limpeza atestados (BEATRIZ)** | **3** | **1** |
| **Limpeza atestados (TODOS)** | **2,100** | **70** |

**Uso típico diário estimado**: 500-1,000 reads + 100-200 writes

**Após limpeza completa**:
```
Reads:  500-1,000 (normal) + 2,100 (limpeza) = 2,600-3,100 (6.2% quota)
Writes: 100-200 (normal) + 70 (limpeza) = 170-270 (0.85-1.35% quota)
```

✅ **Ainda muito seguro** - sobra 93.8% da quota

---

## 🎯 RECOMENDAÇÃO FINAL

### Cenário Atual: Apenas BEATRIZ

**Executar IMEDIATAMENTE após reset da quota (04:00 AM)**:

```bash
# 1. Dry-run
curl -X POST http://localhost:3000/api/admin/clean-duplicate-atestados \
  -H "Content-Type: application/json" \
  -d '{"estudanteId":"e3d06f0c-35fa-420c-bacd-0e4f4749c37c","dryRun":true}' \
  | jq .

# 2. Verificar resultado (quantas duplicatas?)

# 3. Executar real
curl -X POST http://localhost:3000/api/admin/clean-duplicate-atestados \
  -H "Content-Type: application/json" \
  -d '{"estudanteId":"e3d06f0c-35fa-420c-bacd-0e4f4749c37c","dryRun":false}' \
  | jq .
```

**Impacto**: ✅ **Desprezível** (0.006% quota)

---

### Cenário Futuro: Todos os Estudantes

**SE** houver suspeita de duplicatas em outros estudantes:

**Opção 1: Limpeza Completa (Recomendado)**
- Executar em 1 dia após reset da quota
- Evitar executar em dias de pico de uso
- **Impacto**: 4.2% quota (muito seguro)

**Opção 2: Limpeza Seletiva**
- Criar relatório de estudantes com duplicatas primeiro
- Limpar apenas os afetados
- **Impacto**: Mínimo (< 1% quota)

---

## 📋 CHECKLIST DE EXECUÇÃO

### Antes de Executar
- [ ] Verificar horário: **Após 04:00 AM** (quota resetada)
- [ ] Verificar uso atual da quota no Firebase Console
- [ ] Confirmar que não há outras operações pesadas agendadas
- [ ] Testar API em localhost (sem Firebase real) se possível

### Durante Execução
- [ ] **SEMPRE** executar `dryRun=true` primeiro
- [ ] Analisar resultado do dry-run
- [ ] Se > 10 duplicatas, considerar investigar causa antes de deletar
- [ ] Executar `dryRun=false` apenas 1 vez

### Após Execução
- [ ] Verificar resultado (quantas duplicatas removidas?)
- [ ] Conferir no Firebase Console se duplicatas sumiram
- [ ] Testar perfil do estudante para confirmar
- [ ] Logar resultado para documentação

---

## 🔢 FÓRMULAS DE CÁLCULO

### Para Qualquer Estudante:
```
Reads = 1 (query) + N (documentos)
Writes = D (duplicatas removidas)

Onde:
- N = número total de atestados do estudante
- D = número de duplicatas (D < N)
```

### Para Múltiplos Estudantes:
```
Total Reads = E × (1 + avg_atestados_por_estudante)
Total Writes = E × avg_atestados_por_estudante × taxa_duplicacao

Onde:
- E = número de estudantes
- avg_atestados_por_estudante ≈ 2-5 (estimativa)
- taxa_duplicacao ≈ 0.01-0.05 (1%-5%)
```

---

## 📚 REFERÊNCIAS

- **Firebase Quotas**: https://firebase.google.com/docs/firestore/quotas
- **CLAUDE.md**: Seção "Não Fazer - Testes em Produção"
- **Análise Completa**: `docs/ANALISE-DUPLICACAO-ATESTADOS-BEATRIZ.md`
- **Plano de Limpeza**: Solução 1B no documento acima

---

## ✅ CONCLUSÃO

### Impacto na Quota: 🟢 BAIXO

| Cenário | Reads | Writes | Segurança |
|---------|-------|--------|-----------|
| **BEATRIZ (dry-run)** | 3 (0.006%) | 0 | 🟢 Muito seguro |
| **BEATRIZ (real)** | 3 (0.006%) | 1 (0.005%) | 🟢 Muito seguro |
| **TODOS (dry-run)** | 2,100 (4.2%) | 0 | 🟢 Seguro |
| **TODOS (real)** | 2,100 (4.2%) | 70 (0.35%) | 🟢 Seguro |

### Recomendações:

1. ✅ **Executar após 04:00 AM** (quota resetada)
2. ✅ **Sempre usar dry-run primeiro**
3. ✅ **Começar com BEATRIZ** (impacto mínimo)
4. ✅ **Expandir para todos** apenas se necessário
5. ⚠️ **Evitar executar múltiplas vezes** no mesmo dia

**Risco**: 🟢 **BAIXO** - Operação segura com impacto mínimo na quota diária.

---

**Última Atualização**: 2025-10-10
**Status**: 📝 Pronto para implementação
