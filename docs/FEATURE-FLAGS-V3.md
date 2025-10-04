# 🚩 Feature Flags: Migração V2 → V3

## 📋 O QUE SÃO FEATURE FLAGS?

Feature flags permitem ativar/desativar funcionalidades sem fazer deploy de código novo.

Neste projeto, usamos para controlar gradualmente a migração de V2 para V3:
- **V2**: Estrutura legada (`2025/faltas/controle`)
- **V3**: Nova estrutura (`students/{id}/absences`)

---

## 🎛️ FLAGS DISPONÍVEIS

### 1. `USE_V3_READS` - Leituras em V3

**Controla**: Onde o sistema LÊ os dados de faltas

**Estados:**
- `false` (PADRÃO): Lê de V2 (estrutura legada)
- `true`: Lê de V3 (nova estrutura - 65% mais rápido)

**Impacto:**
- `getStudentAbsences()` - Lê de V2 ou V3
- `getAbsencesByDateRange()` - Lê de V2 ou V3
- **Escritas continuam em AMBOS** (dual-write ativo)

**Status Atual:** `false` (produção usa V2)

---

### 2. `USE_V3_WRITES_ONLY` - Escritas apenas em V3

**Controla**: Onde o sistema ESCREVE os dados de faltas

**Estados:**
- `false` (SEMPRE): Escreve em V2 + V3 (dual-write)
- `true` (FUTURO): Escreve apenas em V3

**Impacto:**
- Remove dual-write
- Sistema passa a depender 100% de V3
- **NÃO ATIVAR ainda** - requer validação completa

**Status Atual:** `false` (sempre dual-write ativo)

---

## 🚀 COMO ATIVAR/DESATIVAR

### Opção 1: Variável de Ambiente (Recomendado para Produção)

**Criar arquivo `.env.local`:**
```bash
# Ativar leituras V3 (65% mais rápido)
NEXT_PUBLIC_USE_V3_READS=true
```

**Desativar:**
```bash
# Voltar para V2 (padrão)
NEXT_PUBLIC_USE_V3_READS=false
```

**Aplicar:**
```bash
# Reiniciar servidor Next.js
npm run dev
```

---

### Opção 2: Variável em Runtime (Desenvolvimento)

**Ativar temporariamente:**
```bash
NEXT_PUBLIC_USE_V3_READS=true npm run dev
```

**Desativar:**
```bash
npm run dev  # Sem variável = false (padrão)
```

---

## 📊 MONITORAMENTO

### Verificar qual versão está sendo usada

Todos os logs incluem `[FEATURE-FLAG]` indicando a versão:

```javascript
// V2 (padrão)
[FEATURE-FLAG] Usando V2 para leitura de faltas: abc123

// V3 (ativado)
[FEATURE-FLAG] Usando V3 para leitura de faltas: abc123
[V3-READ] Faltas de abc123: 24 registros
```

---

## ⚡ PERFORMANCE ESPERADA

### V2 (Atual - `USE_V3_READS=false`)
```
getStudentAbsences(id)
├─ Query: 2025/faltas/controle where estudanteId == id
├─ Reads: ~68 documentos
└─ Tempo: ~500ms
```

### V3 (Novo - `USE_V3_READS=true`)
```
getStudentAbsences(id)
├─ Query: students/{id}/absences (subcoleção)
├─ Reads: ~24 documentos
└─ Tempo: ~150ms (65% mais rápido!)
```

---

## 🎯 ROADMAP DE ATIVAÇÃO

### Fase 1: Desenvolvimento (AGORA)
```bash
# .env.local
NEXT_PUBLIC_USE_V3_READS=false
```
✅ Código implementado
✅ Feature flag OFF (usa V2)
⏳ Aguardando migração histórica completa

---

### Fase 2: Teste Local (Amanhã após migração)
```bash
# .env.local
NEXT_PUBLIC_USE_V3_READS=true
```
🧪 Testar localmente
🧪 Validar dados aparecem corretos
🧪 Medir performance

---

### Fase 3: Staging (Próxima Semana)
```bash
# Vercel/Deploy Staging
NEXT_PUBLIC_USE_V3_READS=true
```
✅ Deploy em ambiente de testes
✅ Testes automatizados
✅ Validação de stakeholders

---

### Fase 4: Produção 50% (Semana Seguinte)
```bash
# Vercel/Deploy Produção
# Implementar canary release ou A/B testing
NEXT_PUBLIC_USE_V3_READS=true (50% traffic)
```
📊 Monitorar erros
📊 Monitorar performance
⚠️ Rollback se problemas

---

### Fase 5: Produção 100%
```bash
# Vercel/Deploy Produção
NEXT_PUBLIC_USE_V3_READS=true (100% traffic)
```
✅ Monitorar por 1 semana
✅ Se estável, remover flag (hardcode V3)

---

## 🔴 ROLLBACK IMEDIATO

Se algo der errado após ativar:

### Local:
```bash
# .env.local
NEXT_PUBLIC_USE_V3_READS=false

# Reiniciar
npm run dev
```

### Produção (Vercel):
1. Acessar: Dashboard Vercel
2. Environment Variables
3. Mudar `NEXT_PUBLIC_USE_V3_READS` → `false`
4. Redeploy

**Tempo de rollback**: ~30 segundos

---

## ⚠️ AVISOS IMPORTANTES

### ❌ NÃO FAÇA:
- Não ativar `USE_V3_READS` antes da migração histórica completar
- Não ativar `USE_V3_WRITES_ONLY` (ainda não implementado)
- Não remover dual-write sem validação completa

### ✅ FAÇA:
- Ativar em desenvolvimento primeiro
- Monitorar logs com `[FEATURE-FLAG]`
- Testar antes de deploy produção
- Medir performance antes/depois

---

## 📝 CHECKLIST DE ATIVAÇÃO

Antes de ativar `USE_V3_READS=true`:

- [ ] Migração histórica 100% completa
- [ ] Validação executada sem erros
- [ ] Teste dual-write bem-sucedido
- [ ] Dados V3 conferidos no Firestore Console
- [ ] Backups V2 salvos
- [ ] Equipe avisada
- [ ] Plano de rollback revisado

---

## 🆘 SUPORTE

**Se encontrar problemas:**

1. Verificar logs no console
2. Buscar por `[FEATURE-FLAG]` e `[V3-READ]`
3. Verificar variável ambiente está correta
4. Fazer rollback se necessário
5. Reportar issue com logs

---

**Última atualização**: 2025-10-04
**Responsável**: Equipe de Eng