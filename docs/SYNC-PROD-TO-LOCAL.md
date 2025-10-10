# 🔄 Sincronização: Produção → Local

## 🎯 Objetivo

Manter os **Firebase Emulators** (local) atualizados com dados **reais de produção**.

---

## 📊 Quando Sincronizar?

### Frequência Recomendada

| Cenário | Frequência | Por quê? |
|---------|------------|----------|
| **Desenvolvimento ativo** | 1x por semana (segunda) | Dados não mudam muito |
| **Testando features de relatório** | 1x por semana | Precisa dados reais |
| **Debugging bug específico** | Sob demanda | Quando precisar reproduzir |
| **Novo desenvolvedor** | 1x (setup inicial) | Ter dados para trabalhar |

**Recomendação**: **Toda segunda-feira de manhã** 📅

---

## 🚀 Método 1: Manual (via Firebase Console) ⭐ **RECOMENDADO**

### Vantagens
- ✅ **0 reads de quota** (não consome nada!)
- ✅ Oficial do Firebase
- ✅ Dados completos
- ✅ Mais rápido
- ✅ Mais confiável

### Passo a Passo

#### 1. Exportar de Produção

```bash
# 1. Acessar Firebase Console
https://console.firebase.google.com/project/frequencia-anual

# 2. Navegar: Firestore Database → Import/Export

# 3. Clicar "Export"

# 4. Selecionar:
   - All collections ✅
   - Destination: Cloud Storage

# 5. Aguardar processamento (2-5 min)

# 6. Download do arquivo ZIP
```

#### 2. Preparar Localmente

```bash
# No seu projeto local

# 1. Criar pasta se não existir
mkdir -p firebase-data

# 2. Extrair ZIP baixado para firebase-data/
unzip export-firestore-XXXX.zip -d firebase-data/
```

#### 3. Importar para Emulators

```bash
# Iniciar emulators com dados importados
npm run emulators:import
```

**Pronto!** Emulators agora têm cópia exata da produção. 🎉

---

## 🤖 Método 2: Script Automatizado

### ⚠️ Consumo de Quota

**IMPORTANTE**: Este método **consome quota**!

```
Quota consumida por sincronização:
- estudantes: 700 reads
- absences: 5.000 reads
- users: 12 reads
- tarefas: 53 reads
- atestados: ~100 reads
- Outros: ~5 reads
═══════════════════════════
TOTAL: ~5.870 reads (11,7% da quota diária)
```

### Quando Usar?

- ✅ Automação CI/CD
- ✅ Exportações programáticas
- ❌ **NÃO** para sincronização manual (use Método 1)

### Uso

```bash
npm run sync:prod-to-local
```

Isso vai:
1. ⚠️ Consumir ~5.870 reads de quota
2. ✅ Exportar dados de produção via Firebase Admin SDK
3. ✅ Salvar em `firebase-data/exports/`
4. ✅ Gerar arquivo de metadata

### Limitações
- ⚠️ **Consome 11,7% da quota diária**
- ⚠️ Funciona apenas para coleções públicas
- ⚠️ Requer credenciais Admin (já temos!)
- ⚠️ Pode demorar 2-5 min para 700+ docs

**Recomendação**: Use Método 1 (Firebase Console) para sincronizações manuais.

---

## 📋 Checklist de Sincronização

### Antes de Sincronizar
- [ ] Verificar se tem mudanças locais importantes não commitadas
- [ ] Backup de dados locais (se necessário): `npm run emulators:export`
- [ ] Fechar emulators se estiverem rodando

### Durante Sincronização
- [ ] Executar método escolhido (Manual ou Automatizado)
- [ ] Aguardar conclusão (2-5 min)
- [ ] Verificar mensagem de sucesso

### Depois de Sincronizar
- [ ] Iniciar emulators: `npm run emulators:import`
- [ ] Verificar dados na UI: http://localhost:4000
- [ ] Confirmar quantidade de documentos
- [ ] Testar aplicação: http://localhost:3000

---

## 🔍 Verificar Sincronização

### Via UI (Visual)

```bash
# 1. Iniciar emulators
npm run emulators

# 2. Abrir UI
http://localhost:4000

# 3. Verificar coleções:
   - estudantes: ~700 docs ✅
   - absences: ~5000 docs ✅
   - users: ~10 docs ✅
   - tarefas: ~50 docs ✅
```

### Via Script (Programático)

```bash
# Contar documentos em cada coleção
npm run verify:emulators-data
```

Output esperado:
```
📊 Verificação de Dados Locais:
✅ estudantes: 702 documentos
✅ absences: 5.248 documentos
✅ users: 12 documentos
✅ tarefas: 53 documentos
✅ atestados: 89 documentos

Total: 6.104 documentos
Status: Sincronizado ✅
```

---

## ⏰ Agenda de Sincronização Sugerida

### Segunda-feira (9h)
```bash
# 1. Exportar produção (Firebase Console)
# 2. Download ZIP
# 3. Extrair em firebase-data/
# 4. Importar: npm run emulators:import
```

### Resto da Semana
```bash
# Trabalhar normalmente com dados locais
npm run emulators  # Dados da segunda-feira
npm run dev
```

### Sexta-feira (fim do dia)
```bash
# Opcional: Exportar dados locais como backup
npm run emulators:export
```

---

## 📊 Tamanho dos Dados

### Produção Atual (Estimativa)
- **Estudantes**: 700 docs × ~2KB = 1.4MB
- **Absences**: 5.000 docs × ~1KB = 5MB
- **Outros**: ~1MB
- **Total**: ~7-10MB

**Download**: ~30 segundos (internet média)
**Import**: ~60 segundos

---

## 🔐 Segurança

### Dados Sensíveis

⚠️ **ATENÇÃO**: Dados de produção podem conter informações sensíveis!

```bash
# firebase-data/ está no .gitignore ✅
# NÃO commitar para GitHub!

# Verificar:
cat .gitignore | grep firebase-data
# Output esperado: firebase-data/
```

### Boas Práticas
- ✅ Nunca compartilhar `firebase-data/` publicamente
- ✅ Deletar dados locais se não usar mais o projeto
- ✅ Não fazer backup de `firebase-data/` em cloud público
- ✅ Criptografar se precisar fazer backup externo

---

## 🛠️ Troubleshooting

### Erro: "Export failed"

```bash
# Causa: Permissões insuficientes

# Solução:
1. Verificar se você é "Owner" no projeto Firebase
2. IAM & Admin → Adicionar papel "Firestore Import Export Admin"
```

### Emulators não importam dados

```bash
# Causa: Estrutura de pastas incorreta

# Verificar estrutura:
firebase-data/
└── firestore_export/
    └── all_namespaces/
        └── all_kinds/
            └── all_namespaces_all_kinds.export_metadata

# Se diferente, reorganizar manualmente
```

### Dados desatualizados

```bash
# Solução: Sincronizar novamente
rm -rf firebase-data/*
# Repetir processo de export → download → import
```

### Import muito lento

```bash
# Normal para 5000+ documentos

# Progresso esperado:
i  firestore: Importing 100 docs...
i  firestore: Importing 200 docs...
...
i  firestore: Imported 6104 docs successfully
```

---

## 🎯 Resumo

### Para Começar (Primeira Vez)
```bash
# 1. Exportar de produção (Firebase Console)
# 2. Extrair ZIP em firebase-data/
# 3. npm run emulators:import
# 4. Confirmar em http://localhost:4000
```

### Sincronização Semanal (Segunda-feira)
```bash
# Repetir passos acima
# Substitui dados antigos pelos novos
```

### Desenvolvimento Normal (Terça-Sexta)
```bash
# Apenas usar dados já sincronizados
npm run emulators  # Já tem dados da segunda
npm run dev
```

---

## 📈 Benefícios

| Item | Antes (sem sync) | Depois (com sync) |
|------|------------------|-------------------|
| Dados | Mock/inventados | Reais de produção ✅ |
| Testes | Artificiais | Realistas ✅ |
| Bugs | Difícil reproduzir | Reprodução exata ✅ |
| Desenvolvimento | Cego | Informado ✅ |
| Quota | Consumia produção | 0 consumo ✅ |

---

## ✅ Próximos Passos

1. [ ] Fazer primeira sincronização (hoje)
2. [ ] Agendar sincronizações semanais (segundas 9h)
3. [ ] Criar alerta no calendário
4. [ ] Ensinar processo ao time

---

**Status**: 📘 Documentado
**Última Atualização**: 2025-10-10
**Versão**: 1.0.0
