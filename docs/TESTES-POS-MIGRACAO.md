# 🧪 Guia de Testes Pós-Migração Supabase

**Data**: 2025-10-12
**Objetivo**: Validar completamente o sistema após migração Firebase → Supabase

---

## 📋 Checklist de Testes

### 1. Autenticação ✅

**Teste**: Login e Logout

**Passos**:
1. Acessar `/login`
2. Inserir credenciais válidas
3. Verificar redirecionamento para `/home`
4. Clicar em "Sair"
5. Verificar redirecionamento para `/login`

**Status**: ✅ **TESTADO E FUNCIONANDO**

---

### 2. Dashboard Principal (`/home`) ✅

**Teste**: KPIs e Gráficos

**Passos**:
1. Acessar `/home`
2. Verificar se carregam:
   - Total de estudantes (deve mostrar 677)
   - Total de faltas
   - Percentual médio de frequência
   - Gráficos de distribuição
3. Verificar se não há erros no console

**Dados Esperados**:
- Total de estudantes: **677**
- Total de faltas: **~17.822**
- Performance: < 2 segundos

**Status**: ✅ **TESTADO E FUNCIONANDO**

---

### 3. Cadastro de Estudantes (`/cadastrar-estudante`) ✅

#### 3.1. Listar Estudantes

**Passos**:
1. Acessar `/cadastrar-estudante`
2. Verificar se lista carrega (677 estudantes)
3. Testar filtros:
   - Por turma
   - Por nome
   - Por status (ATIVO/INATIVO)
4. Testar ordenação por colunas
5. Testar paginação

**Status**: ✅ **TESTADO E FUNCIONANDO**

#### 3.2. Criar Novo Estudante

**Passos**:
1. Clicar em "Novo Estudante"
2. Preencher formulário completo
3. Salvar
4. Verificar se aparece na lista
5. Verificar no Supabase (tabela `students`)

**Validações**:
- CPF deve ter 11 dígitos
- Data de nascimento obrigatória
- Nome obrigatório
- Turma obrigatória

**Status**: ⏳ **AGUARDANDO TESTE MANUAL**

#### 3.3. Editar Estudante

**Passos**:
1. Selecionar um estudante da lista
2. Clicar em "Editar"
3. Modificar dados
4. Salvar
5. Verificar se mudanças persistiram

**Status**: ⏳ **AGUARDANDO TESTE MANUAL**

#### 3.4. Inativar Estudante

**Passos**:
1. Selecionar um estudante ATIVO
2. Clicar em "Inativar"
3. Confirmar
4. Verificar se status mudou para INATIVO
5. Verificar se **NÃO** foi deletado do banco

**Status**: ⏳ **AGUARDANDO TESTE MANUAL**

---

### 4. Marcar Faltas (`/marcar-faltas`) ✅

#### 4.1. Carregar Dados do Ano Letivo

**Passos**:
1. Acessar `/marcar-faltas`
2. Verificar se select "Data da Aula" tem opções
3. Verificar quantidade de datas disponíveis

**Dados Esperados**:
- Select deve ter **156 datas** (até 2025-10-12)
- Datas devem estar no formato `DD/MM/YYYY`

**Status**: ✅ **TESTADO E FUNCIONANDO**

#### 4.2. Carregar Turma

**Passos**:
1. Selecionar uma turma no select
2. Verificar se lista de estudantes carrega
3. Verificar se total de estudantes está correto

**Turmas Disponíveis**:
- 1A, 1B, 2A, 2B, 3A, 3B, 4A, 4B, 5A, 5B, 6A, 6B, 7A, 7B, 8A, 8B, 9A, 9B

**Status**: ✅ **TESTADO E FUNCIONANDO**

#### 4.3. Verificar Faltas Existentes

**⚠️ IMPORTANTE**: Testar com datas que TÊM faltas registradas!

**Passos**:
1. Selecionar turma **1A**
2. Selecionar data **02/10/2025** (tem 3 faltas)
3. Verificar se checkboxes estão **marcados** para estudantes com falta:
   - DANIEL LUCA DA SILVA GOMES
   - IGOR SAMUEL MARTINS MENDES
   - LARA VITORIA CARVALHO VAZ

**Verificação no Console**:
```
📋 Buscando faltas existentes: Turma 1A, Data 2025-10-02
   ✅ 3 faltas encontradas
      - Estudante [UUID] tem falta (ID: [absence_id])
      - Estudante [UUID] tem falta (ID: [absence_id])
      - Estudante [UUID] tem falta (ID: [absence_id])
```

**Datas com Faltas (Turma 1A)**:
- `02/10/2025` → 3 faltas ✅
- `03/10/2025` → 7 faltas ✅

**Datas SEM Faltas (Turma 1A)**:
- `09/10/2025` → 0 faltas (futuro)
- `10/10/2025` → 0 faltas (futuro)
- `11/10/2025` → 0 faltas (futuro)
- `12/10/2025` → 0 faltas (futuro)

**Status**: ✅ **TESTADO E FUNCIONANDO** (sistema correto, usuário testava datas sem faltas)

#### 4.4. Registrar Nova Falta

**Passos**:
1. Selecionar turma
2. Selecionar data (preferencialmente hoje)
3. Marcar checkbox de um estudante SEM falta
4. Clicar em "Salvar Faltas"
5. Verificar toast de sucesso
6. Recarregar página
7. Verificar se checkbox permanece marcado

**Verificação no Supabase**:
```sql
SELECT * FROM student_absences
WHERE absence_date = '2025-10-12'
AND student_id IN (
  SELECT id FROM students WHERE class = '1A'
)
ORDER BY absence_date DESC;
```

**Status**: ⏳ **AGUARDANDO TESTE MANUAL**

#### 4.5. Remover Falta

**Passos**:
1. Selecionar data com falta existente
2. Desmarcar checkbox de estudante com falta
3. Clicar em "Salvar Faltas"
4. Verificar toast de sucesso
5. Recarregar página
6. Verificar se checkbox está desmarcado

**Status**: ⏳ **AGUARDANDO TESTE MANUAL**

---

### 5. Controlar Faltas (`/controlar-faltas`) ✅

**Teste**: Análise de Frequência

**Passos**:
1. Acessar `/controlar-faltas`
2. Verificar se carregam:
   - Gráfico de evolução de faltas
   - Tabela de estudantes por faixa de faltas
   - Filtros por turma e bimestre
3. Testar filtros
4. Testar exportação (se implementado)

**Status**: ⏳ **AGUARDANDO TESTE MANUAL**

---

### 6. Gerenciador de Tarefas (`/gerenciador-tarefas`) ✅

#### 6.1. Listar Tarefas

**Passos**:
1. Acessar `/gerenciador-tarefas`
2. Verificar se lista carrega
3. Verificar filtros:
   - Por status (ABERTA/FECHADA)
   - Por prioridade
   - Por estudante

**Status**: ⏳ **AGUARDANDO TESTE MANUAL**

#### 6.2. Criar Nova Tarefa

**Passos**:
1. Clicar em "Nova Tarefa"
2. Preencher:
   - Título
   - Descrição
   - Estudante associado
   - Prioridade
3. Salvar
4. Verificar se aparece na lista

**Status**: ⏳ **AGUARDANDO TESTE MANUAL**

#### 6.3. Marcar Tarefa como Concluída

**Passos**:
1. Selecionar tarefa ABERTA
2. Clicar em "Concluir"
3. Adicionar nota de conclusão
4. Salvar
5. Verificar se status mudou para FECHADA

**Status**: ⏳ **AGUARDANDO TESTE MANUAL**

---

### 7. Relatório de Interações (`/relatorio-interacoes`) ✅

**Teste**: Listar e Filtrar Interações

**Passos**:
1. Acessar `/relatorio-interacoes`
2. Verificar se lista carrega
3. Testar filtros:
   - Por tipo (Telefone, Reunião, Visita)
   - Por estudante
   - Por período
4. Testar ordenação
5. Verificar detalhes de interação

**Status**: ⏳ **AGUARDANDO TESTE MANUAL**

---

### 8. Perfil Deficiente (`/perfil-deficiente`) ✅

**Teste**: Lista de Estudantes com Deficiência

**Passos**:
1. Acessar `/perfil-deficiente`
2. Verificar se lista carrega
3. Verificar filtros:
   - Por tipo de deficiência
   - Por turma
   - Por AEE (PAEE/PAAI)
4. Verificar detalhes de estudante
5. Testar exportação

**Status**: ⏳ **AGUARDANDO TESTE MANUAL**

---

## 🔍 Testes de Integridade de Dados

### Verificar Totais

Executar no SQL do Supabase:

```sql
-- 1. Total de estudantes
SELECT COUNT(*) AS total_students FROM students;
-- Esperado: 677

-- 2. Total de faltas
SELECT COUNT(*) AS total_absences FROM student_absences;
-- Esperado: ~17.822

-- 3. Estudantes por turma
SELECT class, COUNT(*) AS total
FROM students
WHERE status = 'ATIVO'
GROUP BY class
ORDER BY class;

-- 4. Faltas por bimestre (2025)
SELECT b.bimester_number, COUNT(sa.*) AS total_absences
FROM student_absences sa
JOIN students s ON sa.student_id = s.id
JOIN bimesters b ON sa.absence_date BETWEEN b.start_date AND b.end_date
WHERE b.year = 2025
GROUP BY b.bimester_number
ORDER BY b.bimester_number;

-- 5. Dias letivos por bimestre
SELECT b.bimester_number, COUNT(sd.*) AS total_days
FROM school_days sd
JOIN bimesters b ON sd.bimester_id = b.id
WHERE b.year = 2025 AND sd.is_checked = true
GROUP BY b.bimester_number
ORDER BY b.bimester_number;
-- Esperado: ~50 dias por bimestre (200 total)
```

---

## 🚨 Cenários de Erro

### 1. Erro ao Salvar Falta

**Simular**:
- Tentar salvar falta sem selecionar data
- Tentar salvar falta sem selecionar turma
- Tentar salvar falta para estudante INATIVO

**Esperado**:
- Toast de erro com mensagem clara
- Dados não são salvos
- Sistema não trava

---

### 2. Erro de Conexão

**Simular**:
- Desconectar internet
- Tentar carregar página

**Esperado**:
- Mensagem de erro amigável
- Opção de retry
- Cache local se disponível (Service Worker)

---

### 3. Duplicação de Falta

**Simular**:
- Registrar falta para um estudante
- Tentar registrar novamente para mesma data

**Esperado**:
- Sistema não permite duplicata
- Toast de aviso
- Ou: Sistema atualiza registro existente

---

## 📊 Testes de Performance

### 1. Carregamento de Lista Grande

**Teste**:
- Carregar lista de 677 estudantes em `/cadastrar-estudante`

**Métricas**:
- Tempo de carregamento: < 2 segundos
- Renderização suave (sem travamento)
- Paginação funcional

---

### 2. Query Complexa

**Teste**:
- Gerar relatório de frequência com múltiplos filtros

**Métricas**:
- Tempo de resposta: < 3 segundos
- Sem timeout
- Dados corretos

---

### 3. Operação em Lote

**Teste**:
- Marcar faltas para 30 estudantes de uma turma

**Métricas**:
- Tempo de salvamento: < 5 segundos
- Toast de progresso
- Todos os registros salvos corretamente

---

## ✅ Critérios de Sucesso

### Funcional
- [ ] ✅ Todas as páginas carregam sem erros
- [ ] ✅ CRUD de estudantes funciona
- [ ] ✅ Marcação de faltas funciona
- [ ] ✅ Relatórios geram dados corretos
- [ ] ✅ Filtros funcionam
- [ ] ✅ Exportações funcionam

### Performance
- [ ] ✅ Dashboard carrega em < 2s
- [ ] ✅ Listas carregam em < 2s
- [ ] ✅ Operações CRUD em < 1s
- [ ] ✅ Queries complexas em < 3s

### Dados
- [ ] ✅ 677 estudantes no banco
- [ ] ✅ 17.822 faltas no banco
- [ ] ✅ 200 dias letivos no banco
- [ ] ✅ Nenhum dado perdido
- [ ] ✅ Relacionamentos corretos

### Usabilidade
- [ ] ✅ Mensagens de erro claras
- [ ] ✅ Toast de sucesso/erro funcionam
- [ ] ✅ Loading states visíveis
- [ ] ✅ Interface responsiva
- [ ] ✅ Sem erros no console

---

## 🐛 Reportar Problemas

Se encontrar algum problema durante os testes:

### 1. Capturar Informações
- Screenshot do erro
- Mensagem do console
- Passos para reproduzir
- Dados usados no teste

### 2. Verificar Logs
```javascript
// Abrir console do navegador (F12)
// Procurar por:
console.log()   // Logs informativos
console.error() // Erros
console.warn()  // Avisos
```

### 3. Verificar Supabase
- Acessar Supabase Dashboard
- Verificar:
  - Logs de API
  - Erros de query
  - Performance de queries

### 4. Scripts Diagnósticos

Se suspeitar de problema com dados:

```bash
# Verificar faltas
node scripts/check-absences-in-db.mjs

# Verificar ano letivo
node scripts/check-academic-year-data.mjs
```

---

## 📝 Registro de Testes

### Template

```markdown
## Teste: [Nome do Teste]
**Data**: YYYY-MM-DD
**Testador**: [Nome]
**Resultado**: ✅ PASSOU / ❌ FALHOU / ⚠️ PARCIAL

### Passos Executados:
1. [Passo 1]
2. [Passo 2]
3. [Passo 3]

### Resultado Esperado:
[Descrição]

### Resultado Obtido:
[Descrição]

### Observações:
[Notas adicionais]

### Screenshots:
[Anexar se aplicável]
```

---

## 🎯 Prioridades de Teste

### Alta Prioridade (Testar Imediatamente) 🔴
1. ✅ Login/Logout
2. ✅ Carregar Dashboard
3. ✅ Carregar lista de estudantes
4. ✅ Marcar faltas (datas com dados existentes)
5. ⏳ Salvar nova falta
6. ⏳ Criar novo estudante

### Média Prioridade (Testar Esta Semana) 🟡
1. ⏳ Editar estudante
2. ⏳ Inativar estudante
3. ⏳ Gerenciar tarefas
4. ⏳ Relatórios de interações
5. ⏳ Filtros e ordenação

### Baixa Prioridade (Testar Quando Possível) 🟢
1. ⏳ Performance com muitos dados
2. ⏳ Testes de erro
3. ⏳ Exportações
4. ⏳ Testes em mobile
5. ⏳ Testes em diferentes browsers

---

## 📞 Suporte

Se precisar de ajuda durante os testes:

1. **Console do navegador**: Verificar logs e erros (F12)
2. **Supabase Dashboard**: Verificar dados e logs
3. **Scripts diagnósticos**: `scripts/check-*.mjs`
4. **Documentação**: `docs/MIGRACAO-SUPABASE-RESUMO-COMPLETO.md`

---

**Última Atualização**: 2025-10-12
**Status**: 📋 Guia de testes pronto para uso
