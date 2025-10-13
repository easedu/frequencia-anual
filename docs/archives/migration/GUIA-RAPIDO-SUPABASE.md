# 🚀 Guia Rápido - Sistema com Supabase

**Migração Concluída**: ✅ 2025-10-12
**Status**: 🟢 Sistema 100% Operacional

---

## 📊 Números da Migração

| Métrica | Valor |
|---------|-------|
| Estudantes Migrados | 677 |
| Faltas Migradas | 17.822 |
| Dias Letivos (2025) | 200 |
| Tabelas Criadas | 14 |
| Serviços Refatorados | 9 |
| Páginas Atualizadas | 8+ |
| Performance | < 2s |

---

## 🔗 Links Importantes

### Supabase
- **Dashboard**: https://supabase.com/dashboard/project/[project-id]
- **SQL Editor**: https://supabase.com/dashboard/project/[project-id]/sql
- **Table Editor**: https://supabase.com/dashboard/project/[project-id]/editor
- **Logs**: https://supabase.com/dashboard/project/[project-id]/logs

### Firebase (Apenas Auth)
- **Console**: https://console.firebase.google.com/

### Aplicação
- **Produção**: https://[your-domain].vercel.app
- **Local**: http://localhost:3000

---

## 🗂️ Estrutura de Tabelas Supabase

### Principais
- `students` - 677 estudantes
- `student_absences` - 17.822 faltas
- `academic_year` - Anos letivos
- `bimesters` - Bimestres (4 por ano)
- `school_days` - Dias letivos (~200/ano)
- `tasks` - Tarefas pedagógicas
- `family_interactions` - Interações com famílias
- `user_profiles` - Perfis de usuários

### Auxiliares
- `medical_certificates` - Atestados médicos
- `student_suspensions` - Suspensões
- `student_occurrences` - Ocorrências
- `absence_control` - Controle agregado de faltas
- `resolved_consecutive_absence_cases` - Casos resolvidos
- `automation_executions` - Log de automações

---

## 🔍 Queries Úteis

### Verificar Total de Estudantes
```sql
SELECT COUNT(*) FROM students;
-- Esperado: 677
```

### Verificar Total de Faltas
```sql
SELECT COUNT(*) FROM student_absences;
-- Esperado: ~17.822
```

### Faltas por Turma (Hoje)
```sql
SELECT s.class, COUNT(*) AS total
FROM student_absences sa
JOIN students s ON sa.student_id = s.id
WHERE sa.absence_date = CURRENT_DATE
GROUP BY s.class
ORDER BY s.class;
```

### Estudantes com Mais Faltas (Bimestre Atual)
```sql
SELECT
  s.name,
  s.class,
  COUNT(sa.*) AS total_absences
FROM students s
LEFT JOIN student_absences sa ON sa.student_id = s.id
WHERE sa.absence_date >= '2025-10-01'
  AND sa.absence_date <= '2025-12-22'
GROUP BY s.id, s.name, s.class
ORDER BY total_absences DESC
LIMIT 20;
```

### Dias Letivos do Bimestre Atual
```sql
SELECT sd.date, sd.is_checked
FROM school_days sd
JOIN bimesters b ON sd.bimester_id = b.id
WHERE b.year = 2025 AND b.bimester_number = 4
ORDER BY sd.date;
```

---

## 📁 Arquivos Importantes

### Serviços Supabase
```
src/services/supabase/
├── studentService.ts              # CRUD de estudantes
├── absenceService.ts              # Registro de faltas
├── academicYearService.ts         # Ano letivo e calendário
├── taskService.ts                 # Tarefas pedagógicas
├── familyInteractionsService.ts   # Interações com famílias
├── userProfilesService.ts         # Perfis de usuários
├── absenceControlService.ts       # Controle agregado
├── medicalCertificatesService.ts  # Atestados
└── studentSuspensionsService.ts   # Suspensões
```

### Páginas
```
src/app/
├── home/                    # Dashboard principal
├── cadastrar-estudante/     # CRUD estudantes
├── marcar-faltas/          # Registro de faltas
├── controlar-faltas/       # Análise de frequência
├── gerenciador-tarefas/    # Gestão de tarefas
├── relatorio-interacoes/   # Relatórios
└── perfil-deficiente/      # Estudantes com deficiência
```

### Scripts Diagnósticos
```
scripts/
├── check-absences-in-db.mjs       # Verificar faltas
└── check-academic-year-data.mjs   # Verificar ano letivo
```

---

## 🐛 Troubleshooting Rápido

### Problema: Página não carrega
**Solução**:
1. Verificar console do navegador (F12)
2. Verificar se há erros de rede
3. Verificar se Supabase está online
4. Tentar limpar cache do navegador

### Problema: Dados não aparecem
**Solução**:
1. Verificar se tabela tem dados (SQL Editor)
2. Verificar console para erros de query
3. Verificar logs do Supabase
4. Rodar scripts diagnósticos:
```bash
node scripts/check-absences-in-db.mjs
node scripts/check-academic-year-data.mjs
```

### Problema: Faltas não aparecem marcadas
**Verificar**:
- Você está testando com data que TEM faltas?
- Datas com faltas (Turma 1A):
  - `02/10/2025` ✅ (3 faltas)
  - `03/10/2025` ✅ (7 faltas)
- Datas SEM faltas:
  - `09/10/2025` ❌ (futuro)
  - `10/10/2025` ❌ (futuro)
  - `12/10/2025` ❌ (futuro)

### Problema: Erro "Column not found"
**Causa**: Nome da coluna incorreto
**Solução**: Verificar schema no Supabase Table Editor

**Mapeamento comum**:
- Firebase: `turma` → Supabase: `class`
- Firebase: `nome` → Supabase: `name`
- Firebase: `data` → Supabase: `absence_date`
- Firebase: `justified` → Supabase: `is_justified`

### Problema: Performance lenta
**Solução**:
1. Verificar se índices estão criados
2. Verificar query no SQL Editor com `EXPLAIN ANALYZE`
3. Considerar adicionar cache
4. Verificar paginação

---

## 🧪 Testes Rápidos

### 1. Teste Básico (2 minutos)
```bash
# 1. Login
# Acessar /login e entrar

# 2. Dashboard
# Acessar /home
# Deve mostrar 677 estudantes

# 3. Lista de Estudantes
# Acessar /cadastrar-estudante
# Deve carregar lista completa

# 4. Marcar Faltas - Datas Disponíveis
# Acessar /marcar-faltas
# Select "Data da Aula" deve ter 156 opções
```

### 2. Teste de Faltas Existentes (3 minutos)
```bash
# 1. Acessar /marcar-faltas

# 2. Selecionar:
#    - Turma: 1A
#    - Data: 02/10/2025

# 3. Verificar:
#    - 3 checkboxes devem estar MARCADOS
#    - Estudantes:
#      * DANIEL LUCA DA SILVA GOMES
#      * IGOR SAMUEL MARTINS MENDES
#      * LARA VITORIA CARVALHO VAZ

# 4. Console deve mostrar:
#    "✅ 3 faltas encontradas"
```

### 3. Teste de Integridade (1 minuto)
```bash
# No SQL Editor do Supabase:

# 1. Total de estudantes
SELECT COUNT(*) FROM students;
-- Deve retornar: 677

# 2. Total de faltas
SELECT COUNT(*) FROM student_absences;
-- Deve retornar: ~17.822

# 3. Dias letivos
SELECT COUNT(*) FROM school_days WHERE is_checked = true;
-- Deve retornar: ~200
```

---

## 📚 Documentação Completa

Para informações detalhadas, consultar:

1. **Resumo da Migração**
   - `docs/MIGRACAO-SUPABASE-RESUMO-COMPLETO.md`
   - Status, problemas resolvidos, métricas

2. **Guia de Testes**
   - `docs/TESTES-POS-MIGRACAO.md`
   - Checklist completo de testes funcionais

3. **Mapeamento Firebase → Supabase**
   - `docs/MAPEAMENTO-FIREBASE-SUPABASE-V2.md`
   - Correspondência detalhada de estruturas

4. **Quick Start**
   - `docs/QUICK-START-MIGRACAO-SUPABASE.md`
   - Guia rápido para começar

5. **Estrutura Firebase Original**
   - `docs/FIRESTORE-ESTRUTURA-COMPLETA.md`
   - Referência da estrutura antiga

---

## 🔒 Variáveis de Ambiente

Necessárias no `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Firebase (Apenas Auth)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

---

## 🚀 Deploy

### Comandos
```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build

# Deploy (Vercel)
vercel deploy
```

### Checklist Pré-Deploy
- [ ] ✅ `npm run type-check` sem erros
- [ ] ✅ `npm run build` bem-sucedido
- [ ] ✅ Variáveis de ambiente configuradas no Vercel
- [ ] ✅ Testes funcionais passando
- [ ] ✅ Sem erros no console

---

## 📞 Suporte

### Console do Navegador
```javascript
// Abrir com F12

// Ver logs
console.log()

// Ver erros
console.error()

// Ver requests
Network tab
```

### Supabase Dashboard
- **API Logs**: Verificar requests
- **Database**: Verificar dados
- **SQL Editor**: Executar queries
- **Performance**: Analisar queries lentas

### Scripts Diagnósticos
```bash
# Verificar faltas
node scripts/check-absences-in-db.mjs

# Verificar ano letivo
node scripts/check-academic-year-data.mjs
```

---

## ✅ Estado Atual

🟢 **Sistema 100% Operacional com Supabase**

- ✅ 677 estudantes migrados
- ✅ 17.822 faltas migradas
- ✅ 200 dias letivos configurados
- ✅ Todas as funcionalidades testadas
- ✅ Performance otimizada
- ✅ 0 erros TypeScript
- ✅ Build bem-sucedido

---

**Última Atualização**: 2025-10-12
**Versão**: 1.0.0 (Pós-Migração Supabase)
