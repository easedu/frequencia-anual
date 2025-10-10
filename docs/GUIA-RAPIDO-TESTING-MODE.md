# 🛡️ Guia Rápido: TESTING_MODE

## 🎯 O QUE É?

Sistema de proteção que **evita consumo de quota do Firestore** durante desenvolvimento e testes.

---

## ⚡ QUICK START

### 1. Ativar Modo de Testes

```bash
# Editar .env.local
TESTING_MODE=true  # ← Mudar para true

# Reiniciar servidor
npm run dev
```

### 2. Testar API

```bash
# API retorna MOCK (0 reads no Firestore)
curl "http://localhost:3000/api/students/absence-multiples?multiple=8"

# Resposta incluirá:
{
  "success": true,
  "data": [...],  // Dados mockados
  "metadata": {
    "testingMode": true,  // ← Flag indicando mock
    "executionTimeMs": 50
  }
}
```

### 3. Desativar para Produção

```bash
# Editar .env.local
TESTING_MODE=false  # ← Mudar para false

# Reiniciar servidor
npm run dev
```

---

## 📊 Comparação

| Modo | Quota Consumida | Velocidade | Dados |
|------|-----------------|------------|-------|
| **TESTING_MODE=true** | **0 reads** ✅ | ~50ms ⚡ | Mock 🎭 |
| **TESTING_MODE=false** | ~2.124 reads ⚠️ | ~8.000ms 🐢 | Reais 📊 |

---

## ✅ Quando Usar Cada Modo

### TESTING_MODE=true (Desenvolvimento)
- ✅ Desenvolvendo nova feature
- ✅ Testando lógica frontend
- ✅ Debugging UI
- ✅ Validando fluxos
- ✅ Trabalhando com Claude Code

### TESTING_MODE=false (Produção/Validação)
- ✅ Validar dados reais
- ✅ Testar queries complexas
- ✅ Deploy em produção
- ✅ Usuários finais acessando
- ✅ Relatórios com dados reais

---

## 🔥 ECONOMIA DE QUOTA

### Sem TESTING_MODE (Antes)
```
5 testes da API = 5 × 2.124 reads = 10.620 reads
Isso é 21% da quota diária! ⚠️
```

### Com TESTING_MODE (Agora)
```
5 testes da API = 5 × 0 reads = 0 reads
100% da quota preservada! ✅
```

---

## 🎭 Dados Mockados

### Exemplo: absence-multiples

```json
{
  "data": [
    {
      "estudanteId": "mock-001",
      "nome": "ESTUDANTE MOCK 1",
      "turma": "5A",
      "turno": "MANHÃ",
      "absencesCount": 8,
      "verifiedWhatsAppContacts": [
        { "nome": "Responsável Mock 1", "telefone": "11999999999" }
      ]
    },
    {
      "estudanteId": "mock-002",
      "nome": "ESTUDANTE MOCK 2",
      "turma": "6B",
      "turno": "TARDE",
      "absencesCount": 16,
      "verifiedWhatsAppContacts": [
        { "nome": "Responsável Mock 2", "telefone": "11988888888" }
      ]
    }
  ]
}
```

**Características**:
- Dados realistas (seguem mesma estrutura)
- Respondem aos parâmetros (`absenceMultiple`)
- Incluem flag `testingMode: true`

---

## 🚨 IMPORTANTE: Claude Code

### Para Claude (AI)

**ANTES de qualquer teste de API, PERGUNTAR**:

```
"Vou testar a API /students/absence-multiples.

Quer que eu:
1. Teste com TESTING_MODE=true (0 reads) ✅
2. Teste com dados REAIS (2.124 reads) ⚠️

Qual prefere?"
```

**NUNCA executar automaticamente** sem confirmar!

### Para o Desenvolvedor (Você)

**SEMPRE verificar** o arquivo `.env.local` antes de:
- Testar APIs
- Trabalhar com Claude
- Fazer debugging
- Executar scripts

---

## 📋 Checklist Diário

**Ao iniciar trabalho**:
- [ ] Verificar `.env.local`
- [ ] Ativar `TESTING_MODE=true`
- [ ] Reiniciar servidor

**Ao finalizar trabalho**:
- [ ] Verificar se fez todos os testes necessários
- [ ] Se precisar validar dados reais, desativar `TESTING_MODE`
- [ ] Commit e push

**Antes de deploy**:
- [ ] `TESTING_MODE=false`
- [ ] Testar em staging
- [ ] Deploy em produção

---

## 🔧 APIs Protegidas

| API | Status | Reads sem TESTING | Reads com TESTING |
|-----|--------|-------------------|-------------------|
| `/api/students/absence-multiples` | ✅ Protegida | 2.124 | **0** |
| `/api/automation/process-absences` | ⏳ Próxima | ~3.000 | **0** |

---

## 💡 Dicas

1. **Deixe SEMPRE ativo** durante desenvolvimento
2. **Desative APENAS** quando precisar validar dados reais
3. **Monitore logs** - verá mensagem: `🛡️ [TESTING_MODE] Retornando dados mockados`
4. **Confirme mock** - resposta incluirá `testingMode: true`

---

## 🆘 Troubleshooting

### API retorna mock mas quero dados reais

```bash
# 1. Editar .env.local
TESTING_MODE=false

# 2. Reiniciar servidor (OBRIGATÓRIO)
Ctrl+C
npm run dev

# 3. Testar novamente
```

### API continua retornando mock

```bash
# Verificar se servidor foi reiniciado
# Next.js NÃO recarrega .env.local automaticamente!

# Matar todos os processos Node
pkill -f next

# Iniciar novamente
npm run dev
```

### Esqueci qual modo está ativo

```bash
# Ver logs do servidor ao chamar API
# Aparecerá:
🛡️ [TESTING_MODE] Retornando dados mockados (0 reads)
# OU nada (modo normal)
```

---

## 📚 Documentação Completa

- **Guia Detalhado**: `docs/ZERO-QUOTA-TESTING.md`
- **CLAUDE.md**: Seção "🛡️ TESTING_MODE"
- **Análise de Quota**: `docs/ANALISE-QUOTA-FIRESTORE.md`

---

**Última Atualização**: 2025-10-10
**Versão**: 1.0.0
**Status**: ✅ Ativo
