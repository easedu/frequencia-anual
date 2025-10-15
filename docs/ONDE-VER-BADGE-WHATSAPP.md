# 📍 Onde Ver o Badge de Status WhatsApp - Guia Visual Detalhado

## 🎯 Localização Exata

### 1. **Página**: Perfil do Estudante
**URL**: `/perfil-estudante?id={estudanteId}`

### 2. **Card**: "Histórico de Interações"
- **Cor do Header**: Roxo/Violeta (gradiente `from-purple-400 to-violet-500`)
- **Ícone**: 🔄 (History)
- **Localização na página**: Rola para baixo, depois dos cards de frequência e atestados

### 3. **Tabela**: Dentro do card, na coluna "Tipo"
- **Coluna 1**: Tipo (onde o badge aparece)
- **Coluna 2**: Data
- **Coluna 3**: Descrição
- **Coluna 4**: Criado por
- **Coluna 5**: Ações (apenas admin)

---

## 📸 Mapa Visual da Tela

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Buscar Estudante                                             │
├─────────────────────────────────────────────────────────────────┤
│ [Nome do Estudante]                                             │
│ Turma: 5A                                                       │
│ Frequência: 85%                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📊 Frequência                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📋 Faltas Registradas                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🏥 Cadastrar Atestado                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📝 Cadastrar Interação                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🔄 Histórico de Interações      [📄 Relatório]    ← AQUI!      │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ Tipo             │ Data       │ Descrição     │ Criado por│  │
│ ├───────────────────────────────────────────────────────────┤  │
│ │ Contato digital  │ 15/01/2025 │ Mensagem...   │ Admin     │  │
│ │ [🟢 Lido]        │            │               │           │  │
│ │   ↑              │            │               │           │  │
│ │   BADGE AQUI!    │            │               │           │  │
│ └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ IMPORTANTE: Condições para o Badge Aparecer

### ✅ O badge SÓ aparece se:

1. **Tipo de Interação** = `"Contato digital"`
2. **Campo `whatsappStatus`** existe e não é `null`/`undefined`
3. **Status é válido**: `'SENT'`, `'DELIVERED'`, `'READ'`, `'PENDING'`, `'FAILED'`, ou `'PLAYED'`

### ❌ O badge NÃO aparece se:

- ❌ Tipo de interação é outro (ex: "Contato telefônico", "Visita domiciliar")
- ❌ Campo `whatsappStatus` está vazio/null
- ❌ Interação foi criada **antes** da migration SQL
- ❌ Mensagem foi enviada mas webhook ainda não atualizou

---

## 🔍 Como Verificar se Você Tem Interações WhatsApp

### Método 1: Via Supabase Dashboard

1. **Abrir Supabase**: https://supabase.com/dashboard
2. **Selecionar projeto**
3. **Table Editor** → `family_interactions`
4. **Filtrar**: `interaction_type = 'Contato digital'`
5. **Verificar colunas**:
   - `whatsapp_message` (deve ter valor)
   - `whatsapp_status` (deve ter valor: SENT, DELIVERED, READ, etc.)

**Screenshot esperado**:
```
┌────┬──────────────┬────────────────┬─────────────────────┐
│ id │ interaction_ │ whatsapp_      │ whatsapp_status     │
│    │ type         │ message        │                     │
├────┼──────────────┼────────────────┼─────────────────────┤
│ 1  │ Contato      │ "Olá, tudo bem?"│ READ                │
│    │ digital      │                │                     │
└────┴──────────────┴────────────────┴─────────────────────┘
                                        ↑
                                   SE VAZIO = Badge não aparece!
```

### Método 2: Via DevTools (Console)

1. **Abrir perfil do estudante**
2. **F12** → Console
3. **Executar**:
```javascript
// Ver todas as interações carregadas
console.log('Interações:', window.interactions);

// Filtrar apenas "Contato digital"
const whatsappInteractions = window.interactions?.filter(i => i.type === 'Contato digital');
console.log('WhatsApp:', whatsappInteractions);

// Ver se tem status
whatsappInteractions?.forEach(i => {
  console.log(`ID: ${i.id}, Status: ${i.whatsappStatus || 'SEM STATUS'}`);
});
```

**Resultado esperado**:
```
WhatsApp: [
  {
    id: "abc123",
    type: "Contato digital",
    whatsappStatus: "READ",  ← SE APARECER = Badge deve mostrar
    whatsappReadAt: "2025-01-15T14:32:00Z"
  }
]
```

---

## 🧪 Teste Rápido: Criar Interação Fake com Status

Se você quer **ver o badge imediatamente** sem enviar WhatsApp real:

### Opção A: Via SQL (Supabase)

```sql
-- 1. Ver ID do estudante
SELECT id, student_id FROM students WHERE student_id = 'SEU_ESTUDANTE_UUID';

-- 2. Criar interação fake com status
INSERT INTO family_interactions (
  student_id,
  interaction_type,
  interaction_date,
  description,
  created_by,
  is_sensitive,
  whatsapp_message,
  whatsapp_status,
  whatsapp_sent_at,
  whatsapp_read_at
) VALUES (
  123,  -- ← SUBSTITUIR pelo ID do passo 1
  'Contato digital',
  '2025-01-15',
  'Teste de mensagem WhatsApp',
  'Admin',
  false,
  'Olá, tudo bem?',
  'READ',  -- ← Status que aparecerá no badge
  NOW(),
  NOW()
);
```

**Depois**:
1. Recarregar perfil do estudante
2. Badge 🟢 **Lido** deve aparecer!

### Opção B: Via API (se você preferir)

```javascript
// Executar no Console do navegador (F12)
fetch('/api/interactions/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    studentId: 'SEU_ESTUDANTE_UUID',
    type: 'Contato digital',
    date: '2025-01-15',
    description: 'Teste WhatsApp',
    whatsappStatus: 'READ',
    whatsappSentAt: new Date().toISOString(),
    whatsappReadAt: new Date().toISOString()
  })
});
```

---

## 📋 Checklist de Troubleshooting

Se o badge **ainda não aparece**, verifique:

- [ ] **Migration SQL executada?**
  - Supabase → SQL Editor
  - Executar `docs/WEBHOOK-FAMILY-INTERACTIONS-MIGRATION.sql`
  - Confirmar "Success"

- [ ] **Tem interação do tipo "Contato digital"?**
  - Ver na tabela do card "Histórico de Interações"
  - Se não tiver, criar uma (via cadastrar interação)

- [ ] **Campo `whatsappStatus` tem valor?**
  - Supabase → family_interactions
  - Coluna `whatsapp_status` deve ter valor (não NULL)

- [ ] **Hard refresh da página?**
  - Ctrl + Shift + R (Windows/Linux)
  - Cmd + Shift + R (Mac)
  - Limpa cache do browser

- [ ] **Código atualizado?**
  - `git pull` (se em repositório)
  - Reiniciar servidor Next.js (`npm run dev`)

- [ ] **Console sem erros?**
  - F12 → Console
  - Verificar se há erros JavaScript

---

## 🎨 Cores dos Badges (Referência Visual)

```
🟢 Verde   = READ      (Lido)
🔵 Azul    = DELIVERED (Entregue)
⚪ Cinza   = SENT      (Enviado)
🟡 Amarelo = PENDING   (Pendente)
🔴 Vermelho = FAILED   (Falhou)
🟣 Roxo    = PLAYED    (Ouvido - áudio)
```

---

## 📞 Se Ainda Não Aparecer

Me envie:

1. **Screenshot** do card "Histórico de Interações" completo
2. **Console do DevTools** (F12 → Console - se houver erros)
3. **Query Supabase**:
```sql
SELECT
  id,
  interaction_type,
  whatsapp_message,
  whatsapp_status,
  whatsapp_read_at
FROM family_interactions
WHERE interaction_type = 'Contato digital'
LIMIT 5;
```

Com essas informações vou identificar exatamente o que está faltando! 🔍
