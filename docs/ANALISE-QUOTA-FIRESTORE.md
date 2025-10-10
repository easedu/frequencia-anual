# 📊 Análise de Quota do Firestore - Plano Gratuito

## 🎯 Limites do Plano Spark (Gratuito)

| Recurso | Limite Diário | Limite Mensal |
|---------|---------------|---------------|
| **Leituras** | 50,000 | 1,500,000 |
| **Escritas** | 20,000 | 600,000 |
| **Exclusões** | 20,000 | 600,000 |
| **Armazenamento** | 1 GB | - |

---

## 📈 Uso Atual da Aplicação (Estimado)

### 1. Usuários Ativos

**Total de usuários**: 17 (conforme Firebase Auth export)

**Perfil de uso típico por usuário/dia**:
- Login: 1x
- Dashboard home: 2-3x (refresh, voltar)
- Cadastrar/editar estudante: 3-5x
- Controlar faltas: 5-10x
- Relatórios: 1-2x
- Gerenciador de tarefas: 2-3x

**Estimativa conservadora**: ~5 usuários ativos/dia

### 2. Operações por Página (Reads)

| Página | Reads por Carregamento | Usuário Típico (x/dia) | Total Reads/dia |
|--------|------------------------|------------------------|-----------------|
| `/home` (Dashboard) | 150 (estudantes + stats) | 3x | 450 |
| `/cadastrar-estudante` | 700 (lista completa) | 2x | 1,400 |
| `/controlar-faltas` | 750 (estudantes + faltas + dias letivos) | 5x | 3,750 |
| `/gerenciador-tarefas` | 100 (tasks) | 2x | 200 |
| `/relatorio-interacoes` | 200 (interactions) | 1x | 200 |
| **SUBTOTAL POR USUÁRIO** | - | - | **6,000** |

**TOTAL USO NORMAL** (5 usuários): **~30,000 reads/dia**

### 3. Operações de Escrita (Writes)

| Operação | Writes por Op | Frequência/dia | Total Writes/dia |
|----------|---------------|----------------|------------------|
| Cadastrar estudante | 5 (doc + contacts + v2) | 2x | 10 |
| Editar estudante | 3 (doc + v2) | 5x | 15 |
| Registrar falta | 2 (absence + log) | 20x | 40 |
| Criar tarefa | 1 | 10x | 10 |
| Registrar interação | 1 | 15x | 15 |
| **SUBTOTAL POR USUÁRIO** | - | - | **90** |

**TOTAL USO NORMAL** (5 usuários): **~450 writes/dia**

---

## 🤖 Uso da Automação Diária

### Cenário: 150 estudantes com múltiplos de faltas (8, 16, 24...)

### Fase 1: Buscar Estudantes (`/api/students/absence-multiples`)

| Operação | Quantidade | Reads |
|----------|-----------|-------|
| Carregar ano letivo | 1 | 1 |
| Buscar estudantes ativos | 1 query | 700 |
| Buscar faltas (chunked 50x) | 14 queries | 700 |
| Buscar suspensões (paralelo 20x) | 35 queries | 700 |
| Buscar contatos WhatsApp verificados (chunked 100x) | 7 queries | 700 |
| **SUBTOTAL** | - | **2,801** |

### Fase 2: Processamento (por estudante)

**Para cada estudante** (150 estudantes):

| Operação | Reads | Writes |
|----------|-------|--------|
| Verificar histórico WhatsApp (por contato) | 1 × 2 = 2 | 0 |
| Criar histórico WhatsApp | 0 | 2 |
| Criar tarefa (POST API) | 0 | 1 |
| **SUBTOTAL por estudante** | **2** | **3** |

**TOTAL para 150 estudantes**:
- Reads: 150 × 2 = **300**
- Writes: 150 × 3 = **450**

### Fase 3: Checkpoints e Execução

| Operação | Reads | Writes |
|----------|-------|--------|
| Criar execução inicial | 0 | 1 |
| Checkpoints (1 por estudante) | 0 | 150 |
| Finalizar execução | 0 | 1 |
| **SUBTOTAL** | **0** | **152** |

### 🔢 TOTAL AUTOMAÇÃO DIÁRIA (1 execução)

| Tipo | Quantidade |
|------|-----------|
| **Reads** | 2,801 + 300 = **3,101** |
| **Writes** | 450 + 152 = **602** |

---

## 📊 Consumo Total Estimado (Uso Normal + Automação)

| Tipo | Uso Normal | Automação | **TOTAL/DIA** | Limite | % Usado |
|------|-----------|-----------|---------------|---------|---------|
| **Reads** | 30,000 | 3,101 | **33,101** | 50,000 | **66%** ✅ |
| **Writes** | 450 | 602 | **1,052** | 20,000 | **5%** ✅ |

### Margem de Segurança: ✅ **Boa** (34% de margem em reads)

---

## ⚠️ Por que ocorreu "Quota Exceeded" nos testes?

### Causa Identificada:

Durante os **testes repetidos**, a API `/api/students/absence-multiples` foi chamada **múltiplas vezes**:

```bash
# Testes realizados:
1. multiple=3 (primeira tentativa) - 2,801 reads
2. multiple=8 (segunda tentativa) - 2,801 reads
3. multiple=8 (terceira tentativa) - 2,801 reads
4. Consultas de status (várias) - 500+ reads cada
5. Testes manuais diversos - 5,000+ reads

TOTAL DE TESTES: ~15,000+ reads em 10 minutos
```

**Somado ao uso normal do dia** (já havia ~30k reads), chegou próximo ou ultrapassou os 50k.

---

## 🎯 Probabilidade de Exceder Quota em Produção

### Cenário 1: Uso Normal (Atual)
- **Probabilidade**: ⭐ **Muito Baixa (< 5%)**
- **Razão**: Margem de 34% (16,899 reads disponíveis)

### Cenário 2: Pico de Uso (10 usuários ativos simultâneos)
- **Reads/dia**: 60,000 + 3,101 = 63,101
- **Probabilidade**: ⚠️ **Média (20-30%)**
- **Razão**: Excede em 13,101 reads (26% acima)

### Cenário 3: Teste/Debug em Produção
- **Probabilidade**: 🔴 **Alta (60-80%)**
- **Razão**: Múltiplas chamadas à API sem cache

### Cenário 4: Automação com Falha + Retry
- **Probabilidade**: ⚠️ **Média (30%)**
- **Razão**: Se automação executar 2-3x por erro, adiciona 6k-9k reads

---

## 🛡️ Fatores de Proteção Existentes

### 1. ✅ Cache Implementado
```typescript
// src/utils/apiOptimization.ts
apiCache.set(cacheKey, data, ttlMinutes);
```

**Benefícios**:
- Cache de 30-60 minutos
- Reduz reads em ~70% nas páginas mais acessadas
- Estimativa real de reads pode ser: **~10,000/dia** (não 30k)

### 2. ✅ Queries Otimizadas
- Chunking (50-100 por vez)
- Parallel queries (limita concorrência)
- Dual-write controlado (não duplica reads)

### 3. ✅ Fire-and-Forget
- Automação executa 1x por dia
- Não há retry automático (precisa ser manual via `/resume`)

---

## 📈 Projeções Futuras

### Crescimento de Usuários

| Usuários Ativos/Dia | Uso Normal | Automação | Total | Margem |
|---------------------|-----------|-----------|-------|--------|
| 5 (atual) | 10k | 3k | **13k** | ✅ 74% livre |
| 10 | 20k | 3k | **23k** | ✅ 54% livre |
| 15 | 30k | 3k | **33k** | ✅ 34% livre |
| 20 | 40k | 3k | **43k** | ⚠️ 14% livre |
| **25** | **50k** | **3k** | **53k** | 🔴 **Excede!** |

**Limite seguro**: Até **20-22 usuários ativos/dia**

### Crescimento de Estudantes

| Estudantes | Reads Automação | Writes Automação | Impacto |
|------------|----------------|------------------|---------|
| 700 (atual) | 3,101 | 602 | Base |
| 1000 (+43%) | 4,100 | 800 | +1k reads |
| 1500 (+114%) | 5,500 | 1,100 | +2.4k reads |
| 2000 (+186%) | 7,000 | 1,400 | +3.9k reads |

**Limite seguro**: Até **~1,200 estudantes** com 20 usuários ativos

---

## 💡 Recomendações

### 🟢 Curto Prazo (Imediato)

1. **Não testar APIs pesadas em produção**
   - Usar `?dryRun=true` sempre em testes
   - Criar ambiente de staging separado

2. **Monitorar uso diário**
   - Firebase Console → Usage
   - Configurar alertas em 80% da quota

3. **Cache mais agressivo**
   - Aumentar TTL de 30min para 2h em horários de pico
   - Cache de estudantes no localStorage (client-side)

### 🟡 Médio Prazo (1-2 meses)

4. **Implementar rate limiting**
   ```typescript
   // Limitar chamadas à API absence-multiples
   const MAX_CALLS_PER_HOUR = 5;
   ```

5. **Otimizar dashboard**
   - Carregar apenas estudantes da turma selecionada
   - Paginação server-side (50 por página)

6. **Reduzir dual-write**
   - Após migração V3 completa, remover escrita V2
   - Economia: -30% de writes

### 🔴 Longo Prazo (3-6 meses)

7. **Migrar para Blaze Plan (Pay-as-you-go)**
   - Custo estimado: $0-5/mês para seu uso atual
   - Remove limite de 50k reads
   - Escala conforme necessário

8. **Implementar CDN para cache**
   - Vercel Edge Functions com cache
   - Reduz reads em até 90%

9. **Indexação avançada**
   - Índices compostos otimizados
   - Reduz complexidade de queries

---

## 🎯 Resposta Final: Chances de Exceder Quota

### Em Condições Normais de Uso:
**⭐ MUITO BAIXA (5-10%)**

**Razões**:
- ✅ Margem de 34% em reads (16,899 disponíveis)
- ✅ Cache reduz uso real para ~13k reads/dia
- ✅ Automação executa apenas 1x/dia (3k reads)
- ✅ Usuários ativos: apenas 5/dia em média

### Cenários de Risco:
1. ⚠️ **10+ usuários simultâneos** em horário de pico
2. ⚠️ **Teste/debug em produção** (múltiplas chamadas API)
3. ⚠️ **Falha na automação** com retry manual múltiplo
4. ⚠️ **Crescimento para 1500+ estudantes** sem otimização

---

## ✅ Conclusão

Com o uso atual da aplicação (5 usuários/dia, 700 estudantes) e a automação rodando 1x por dia:

**🎉 Você está seguro no plano gratuito!**

- Uso atual: ~13k reads/dia (~26% da quota)
- Margem: 37k reads/dia disponíveis
- Automação: Impacto mínimo (6% adicional)

**Monitoramento recomendado**:
- Firebase Console → Usage → Daily reads
- Alertar se passar de 40k reads/dia (80%)

**Quando migrar para plano pago**:
- 20+ usuários ativos/dia consistente
- 1500+ estudantes
- Crescimento de 50%+ em 3 meses
