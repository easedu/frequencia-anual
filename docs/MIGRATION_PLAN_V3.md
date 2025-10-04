# Plano de Migração - Estrutura V3 Unificada

## Objetivo
Consolidar as três estruturas paralelas de dados de estudantes em uma única estrutura autoritativa, escalável e normalizada.

## Estruturas Atuais (Antes da Migração)

### 1. `2025/escola/students/{id}` (V2)
```
{
  id: string,
  nome: string,
  turma: string,
  contatos: [
    {
      nome: string,
      parentesco: string,
      telefone: string
    }
  ]
}
```
**Usado por:** cadastrar-estudante page, StudentServiceV2

### 2. `2025/lista_de_estudantes` (V1 Legacy)
```
{
  estudantes: [
    {
      id: string,
      nome: string,
      contatos: [
        {
          nome: "Valeria (mãe)", // misturado
          telefone: string
        }
      ]
    }
  ]
}
```
**Usado por:** Queries legadas, fallbacks

### 3. `students/{id}/contacts/{contactId}` (Novo Normalizado)
```
students/{id}/contacts/{contactId}
{
  nome: string,
  parentesco: string,
  telefone: string,
  telefoneNumerico: string,
  podeReceberWhatsapp: boolean
}
```
**Usado por:** perfil-estudante page (com fallback)

## Estrutura Final V3 (Após Migração)

```
students/{studentId}
  ├── id: string
  ├── nome: string
  ├── turma: string
  ├── anoLetivo: number
  ├── numeroMatricula: string
  ├── dataNascimento: Timestamp
  ├── createdAt: Timestamp
  ├── updatedAt: Timestamp
  └── contacts/{contactId}
      ├── nome: string
      ├── parentesco: string
      ├── telefone: string
      ├── telefoneNumerico: string
      ├── podeReceberWhatsapp: boolean
      ├── createdAt: Timestamp
      ├── updatedAt: Timestamp
      └── whatsapp/{trackingId} (para rastreamento futuro)
```

---

## FASE 1: Escrita Dupla (Dual-Write)

### Objetivo
Implementar escrita em ambas estruturas (antiga + nova) mantendo compatibilidade total.

### Etapas da Fase 1

#### 1.1 Criar Constantes de Caminho
**Arquivo:** `src/config/constants.ts`

**Ação:**
- Adicionar constantes para nova estrutura V3
- Manter constantes antigas para compatibilidade

**Validação:**
- TypeScript compila sem erros
- Constantes exportadas corretamente

---

#### 1.2 Criar Service de Dados Unificado
**Arquivo:** `src/services/studentDataService.ts` (NOVO)

**Responsabilidades:**
- CRUD completo de estudantes
- Escrita dupla (V2 + V3)
- Leitura com fallback (V3 → V2 → V1)
- Validação de dados

**Funções principais:**
```typescript
- createStudent(data): Promise<string> // Escreve em V2 e V3
- updateStudent(id, data): Promise<void> // Atualiza V2 e V3
- getStudent(id): Promise<Student> // Lê de V3, fallback V2
- deleteStudent(id): Promise<void> // Deleta de V2 e V3
- addContact(studentId, contact): Promise<string> // Adiciona em ambos
- updateContact(studentId, contactId, data): Promise<void>
- deleteContact(studentId, contactId): Promise<void>
```

**Validação:**
- Testes unitários passam
- TypeScript sem erros
- Lógica de fallback funciona

---

#### 1.3 Criar Service de WhatsApp Unificado
**Arquivo:** `src/services/whatsappDataService.ts` (NOVO)

**Responsabilidades:**
- Gerenciar dados de WhatsApp na V3
- Compatibilidade com whatsappTrackingService
- Queries otimizadas

**Validação:**
- Integração com studentDataService
- Queries funcionam corretamente

---

#### 1.4 Atualizar Página cadastrar-estudante
**Arquivo:** `src/app/cadastrar-estudante/page.tsx`

**Ação:**
- Substituir StudentServiceV2 por studentDataService
- Manter mesma UX
- Adicionar logs de debug (temporários)

**Validação:**
- Cadastro cria em V2 E V3
- UI não quebra
- Validações funcionam
- Dados salvos corretamente em ambas estruturas

---

#### 1.5 Atualizar Página perfil-estudante
**Arquivo:** `src/app/perfil-estudante/page.tsx`

**Ação:**
- Usar studentDataService.getStudent()
- Remover lógica manual de fallback (service cuida)
- Simplificar código

**Validação:**
- Perfil carrega corretamente
- Contatos exibidos com parentesco separado
- Fallback funciona se V3 vazio

---

#### 1.6 Atualizar APIs Críticas

**Arquivos:**
- `src/app/api/students/consecutive-absences/route.ts`
- `src/app/api/students/absence-multiples/route.ts`
- `src/app/api/tasks/create/route.ts`
- `src/app/api/whatsapp/send/route.ts`

**Ação:**
- Substituir queries diretas por studentDataService
- Manter mesma lógica de negócio
- Otimizar batch sizes (10 → 30)

**Validação:**
- APIs retornam mesmos resultados
- Performance igual ou melhor
- Logs confirmam leitura de V3

---

#### 1.7 Atualizar whatsappTrackingService
**Arquivo:** `src/services/whatsappTrackingService.ts`

**Ação:**
- Usar whatsappDataService para queries
- Manter compatibilidade com código existente

**Validação:**
- Tracking funciona
- Queries otimizadas

---

#### 1.8 Testes de Integração Fase 1

**Cenários de Teste:**

1. **Criar Estudante:**
   - Criar novo estudante via cadastrar-estudante
   - Verificar existência em `2025/escola/students/{id}` (V2)
   - Verificar existência em `students/{id}` (V3)
   - Validar campos idênticos

2. **Adicionar Contato:**
   - Adicionar contato via cadastrar-estudante
   - Verificar em V2: contato no array
   - Verificar em V3: documento em `students/{id}/contacts/{contactId}`
   - Validar nome/parentesco separados

3. **Ler Estudante (V3 existe):**
   - Chamar getStudent()
   - Verificar que leu de V3 (log)
   - Validar dados completos

4. **Ler Estudante (V3 vazio, fallback V2):**
   - Deletar estudante de V3 (apenas teste)
   - Chamar getStudent()
   - Verificar que leu de V2 (log)
   - Validar dados completos

5. **Atualizar Estudante:**
   - Atualizar campo (ex: turma)
   - Verificar atualização em V2
   - Verificar atualização em V3

6. **APIs:**
   - Chamar `/api/students/consecutive-absences`
   - Verificar logs mostram leitura de V3
   - Validar resultado correto

**Critérios de Sucesso Fase 1:**
- [ ] Todas as escritas vão para V2 E V3
- [ ] Todas as leituras preferem V3, fallback V2
- [ ] Zero erros em produção
- [ ] Performance mantida ou melhorada
- [ ] Testes de integração passam 100%

---

## FASE 2: Backfill de Dados Históricos

### Objetivo
Migrar todos os 736 estudantes existentes de V2 para V3.

### Etapas da Fase 2

#### 2.1 Criar Script de Migração
**Arquivo:** `scripts/migrate-to-v3.ts`

**Funcionalidades:**
- Ler todos estudantes de `2025/escola/students`
- Para cada estudante:
  - Criar documento em `students/{id}`
  - Migrar contatos para `students/{id}/contacts/{contactId}`
  - Adicionar timestamps (createdAt, updatedAt)
- Modo DRY_RUN
- Modo TEST (10 estudantes)
- Batch processing (30 por vez)
- Retry em caso de erro
- Log detalhado

**Validação:**
- DRY_RUN mostra plano correto
- TEST migra 10 estudantes corretamente

---

#### 2.2 Executar Migração Completa

**Passos:**
1. Backup completo do Firestore
2. Executar em TEST_MODE (10 estudantes)
3. Validar 10 estudantes manualmente
4. Executar migração completa (736 estudantes)
5. Monitorar logs

**Validação:**
- 736 estudantes migrados
- ~1500 contatos migrados
- Zero erros críticos
- Dados validados

---

#### 2.3 Criar Script de Validação
**Arquivo:** `scripts/validate-v3-migration.ts`

**Validações:**
- Todos estudantes V2 existem em V3
- Contatos migrados corretamente
- Campos obrigatórios preenchidos
- Tipos de dados corretos
- Timestamps presentes

**Critérios de Sucesso:**
- 100% dos estudantes validados
- 100% dos contatos validados
- Relatório de inconsistências vazio

---

#### 2.4 Tornar V2 Somente Leitura

**Ação:**
- Atualizar `firestore.rules`
- Permitir apenas leituras em `2025/escola/students`
- Manter escritas apenas em `students`

**Validação:**
- Tentativa de escrita em V2 falha
- Escritas em V3 funcionam
- Leituras em ambas funcionam

---

## FASE 3: Cutover (Transição)

### Objetivo
Alternar 100% das operações para V3, remover fallbacks.

### Etapas da Fase 3

#### 3.1 Remover Lógica de Fallback

**Arquivos afetados:**
- `src/services/studentDataService.ts`

**Ação:**
- Remover leitura de V2
- Ler apenas de V3
- Simplificar código

**Validação:**
- Todas páginas funcionam
- APIs funcionam
- Zero erros

---

#### 3.2 Remover Escrita Dupla

**Ação:**
- Remover escritas em V2
- Escrever apenas em V3

**Validação:**
- Cadastro funciona
- Atualização funciona
- Dados salvos apenas em V3

---

#### 3.3 Monitoramento Intensivo

**Período:** 7 dias

**Métricas:**
- Taxa de erro
- Latência de queries
- Uso de dados
- Feedback de usuários

**Critérios de Sucesso:**
- Taxa de erro < 0.1%
- Latência igual ou menor
- Zero reclamações críticas

---

## FASE 4: Limpeza

### Objetivo
Remover código e dados legados.

### Etapas da Fase 4

#### 4.1 Backup Final

**Ação:**
- Exportar coleções V1 e V2
- Armazenar backup seguro
- Documentar localização

---

#### 4.2 Deletar Coleções Antigas

**Ação:**
- Deletar `2025/lista_de_estudantes`
- Deletar `2025/escola/students`
- Manter apenas `students`

**Validação:**
- Backup confirmado
- Sistema funcionando 100%

---

#### 4.3 Remover Código Deprecado

**Arquivos a remover:**
- `src/services/studentServiceV2.ts`
- Código de fallback em studentDataService
- Logs de debug temporários

**Validação:**
- Build sem erros
- Testes passam
- Bundle size reduzido

---

#### 4.4 Atualizar Documentação

**Ação:**
- Atualizar README com nova estrutura
- Documentar APIs
- Atualizar diagramas

---

## Rollback Plan

### Se Fase 1 Falhar:
- Reverter commits de código
- Sistema continua usando V2
- Zero impacto

### Se Fase 2 Falhar:
- Parar migração
- Deletar dados V3 parciais
- Sistema continua com V2 + fallback
- Análise de causa raiz

### Se Fase 3 Falhar:
- Reativar fallback V2
- Investigar inconsistências
- Corrigir dados V3
- Tentar novamente

---

## Timeline Estimado

| Fase | Duração | Validação |
|------|---------|-----------|
| Fase 1: Dual-Write | 2-3 dias | Testes integração |
| Fase 2: Backfill | 1 dia | Script validação |
| Fase 3: Cutover | 1 dia | Monitoramento 7 dias |
| Fase 4: Limpeza | 1 dia | Sistema estável |
| **TOTAL** | **5-6 dias + 7 dias monitoramento** | |

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Perda de dados na migração | Baixa | Alto | Backups + DRY_RUN + Validação |
| Performance degradada | Média | Médio | Testes de carga + Otimização |
| Bugs em produção | Média | Alto | Dual-write + Fallback + Rollback |
| Inconsistência de dados | Baixa | Alto | Validação rigorosa + Logs |
| Downtime | Muito Baixa | Alto | Zero-downtime strategy |

---

## Critérios de Sucesso Geral

- [ ] Zero downtime durante toda migração
- [ ] 100% dos dados migrados corretamente
- [ ] Performance igual ou melhor que antes
- [ ] Código mais limpo e manutenível
- [ ] Documentação completa e atualizada
- [ ] Equipe treinada na nova estrutura
- [ ] Monitoramento mostra sistema estável

---

## Próximos Passos

1. ✅ Documentação aprovada
2. ⏳ Executar Fase 1.1: Criar constantes
3. ⏳ Executar Fase 1.2: Criar studentDataService
4. ⏳ Executar Fase 1.3: Criar whatsappDataService
5. ⏳ Continuar com demais etapas da Fase 1

---

**Autor:** Engenheiro de Dados Sênior
**Data:** 2025-10-03
**Versão:** 1.0
