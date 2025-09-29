# Exemplo de Uso da API /tasks/create

## Endpoint
```
POST /api/tasks/create
```

## Autenticação
```
Authorization: Basic <base64(username:password)>
```

## Parâmetros de Entrada

### Tarefa Pendente
```json
{
  "estudante_id": "12345",
  "absences_count": 15,
  "reference_month": 3,
  "reference_year": 2025,
  "priority": 0,
  "created_at": "2025-03-15T10:30:00Z",
  "created_by": "João Silva - Coordenador",
  "recommended_action": "Conselho tutelar",
  "is_resolved": false
}
```

### Tarefa Já Resolvida (com criador e resolvedor diferentes)
```json
{
  "estudante_id": "12345",
  "absences_count": 15,
  "reference_month": 3,
  "reference_year": 2025,
  "priority": 1,
  "created_at": "2025-03-15T10:30:00Z",
  "created_by": "Maria Santos - Diretora",
  "processed_at": "2025-03-16T14:20:00Z",
  "solved_by": "João Carlos - Assistente Social",
  "action_taken": "Contato telefônico",
  "action_description": "Entrei em contato com a família e eles justificaram as faltas por motivo de saúde.",
  "is_resolved": true
}
```

### Tarefa Já Resolvida (mesma pessoa criou e resolveu)
```json
{
  "estudante_id": "67890",
  "absences_count": 8,
  "reference_month": 3,
  "reference_year": 2025,
  "priority": 2,
  "created_at": "2025-03-15T08:00:00Z",
  "created_by": "Ana Silva - Coordenadora",
  "processed_at": "2025-03-15T16:30:00Z",
  "solved_by": "Ana Silva - Coordenadora",
  "action_taken": "Conversa com a família",
  "action_description": "Conversei pessoalmente com os pais durante a reunião escolar.",
  "is_resolved": true
}
```

## Campos Obrigatórios

### Sempre Obrigatórios
- `estudante_id`: ID do estudante
- `absences_count`: Número de faltas
- `reference_month`: Mês de referência (1-12)
- `reference_year`: Ano de referência
- `priority`: Prioridade (0=Crítica, 1=Atenção, 2=Rotina)
- `created_at`: Data de criação
- `created_by`: **NOVO** - Nome de quem criou a tarefa
- `is_resolved`: Se a tarefa está resolvida

### Se `is_resolved = false`
- `recommended_action`: Ação recomendada

### Se `is_resolved = true`
- `processed_at`: Data de resolução
- `solved_by`: **NOVO** - Nome de quem resolveu a tarefa
- `action_taken`: Tipo de ação tomada
- `action_description`: Descrição da ação

## Resposta de Sucesso
```json
{
  "success": true,
  "data": {
    "taskId": "abc123def456",
    "interactionId": "xyz789uvw012",
    "message": "Tarefa criada e marcada como resolvida com interação registrada"
  }
}
```

## Como os Dados Aparecem no Painel

### Tarefas Pendentes
- Mostram quem criou a tarefa
- Podem ser resolvidas manualmente no painel

### Tarefas Resolvidas
- **Criado por**: Nome da pessoa em `created_by`
- **Resolvido por**: Nome da pessoa em `solved_by` (se fornecido) ou `created_by` (fallback)
- **Criado em**: Data de `created_at`
- **Resolvida em**: Data de `processed_at`
- **Ação Tomada**: Valor de `action_taken`
- **Descrição**: Valor de `action_description`

### Histórico de Interações
- Quando uma tarefa é criada já resolvida, uma interação é automaticamente registrada
- O campo "Criado por" da interação recebe o valor de `solved_by` (se fornecido) ou `created_by` (fallback)
- A interação aparece no perfil do estudante

## Exemplos Práticos e Resultados

### Cenário 1: Tarefa Pendente (criada via API, resolvida no painel)
```json
{
  "estudante_id": "12345",
  "created_by": "João Silva - Coordenador",
  "absences_count": 15,
  "priority": 0,
  "created_at": "2025-03-15T10:30:00Z",
  "recommended_action": "Conselho tutelar",
  "is_resolved": false
}
```
**Resultado no painel:**
- **Criado por**: João Silva - Coordenador
- **Resolvido por**: Maria Santos (quem resolveu no painel)
- **Histórico**: Interação criada por "Maria Santos"

### Cenário 2: Tarefa já resolvida (criador ≠ resolvedor)
```json
{
  "estudante_id": "12345",
  "created_by": "Maria Santos - Diretora",
  "solved_by": "João Carlos - Assistente Social",
  "absences_count": 15,
  "priority": 1,
  "created_at": "2025-03-15T10:30:00Z",
  "processed_at": "2025-03-16T14:20:00Z",
  "action_taken": "Contato telefônico",
  "action_description": "Contato realizado com sucesso",
  "is_resolved": true
}
```
**Resultado no painel:**
- **Criado por**: Maria Santos - Diretora
- **Resolvido por**: João Carlos - Assistente Social
- **Histórico**: Interação criada por "João Carlos - Assistente Social"

### Cenário 3: Tarefa já resolvida (mesma pessoa)
```json
{
  "estudante_id": "12345",
  "created_by": "Ana Silva - Coordenadora",
  "solved_by": "Ana Silva - Coordenadora",
  "absences_count": 8,
  "priority": 2,
  "created_at": "2025-03-15T08:00:00Z",
  "processed_at": "2025-03-15T16:30:00Z",
  "action_taken": "Conversa com a família",
  "action_description": "Conversa realizada pessoalmente",
  "is_resolved": true
}
```
**Resultado no painel:**
- **Criado por**: Ana Silva - Coordenadora
- **Resolvido por**: Ana Silva - Coordenadora
- **Histórico**: Interação criada por "Ana Silva - Coordenadora"