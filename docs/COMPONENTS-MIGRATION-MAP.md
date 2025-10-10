# 🗺️ Mapa de Migração de Componentes

> **Data**: 2025-10-10
> **Status**: ✅ Reorganização concluída

## 📋 Nova Estrutura de Componentes

### Layout
| Componente Antigo | Novo Caminho |
|-------------------|--------------|
| `@/components/Header` | `@/components/layout/Header` |
| `@/components/Footer` | `@/components/layout/Footer` |
| `@/components/AuthProvider` | `@/components/layout/AuthProvider` |

### Students
| Componente Antigo | Novo Caminho |
|-------------------|--------------|
| `@/components/StudentTable` | `@/components/students/StudentTable` |
| `@/components/VirtualizedStudentTable` | `@/components/students/VirtualizedStudentTable` |
| `@/components/StudentDialog` | `@/components/students/StudentDialog` |
| `@/components/StudentForm` | `@/components/students/StudentForm` |
| `@/components/StudentInfoCard` | `@/components/students/StudentInfoCard` |
| `@/components/StudentFilters` | `@/components/students/StudentFilters` |
| `@/components/StudentPagination` | `@/components/students/StudentPagination` |
| `@/components/SearchByNameCard` | `@/components/students/SearchByNameCard` |
| `@/components/SearchByClassCard` | `@/components/students/SearchByClassCard` |
| `@/components/CustomAlertDataTable` | `@/components/students/CustomAlertDataTable` |
| `@/components/CustomFullDataTable` | `@/components/students/CustomFullDataTable` |
| `@/components/ProvaSaoPauloCard` | `@/components/students/ProvaSaoPauloCard` |
| `@/components/StudentInteractionAnalysisCard` | `@/components/students/StudentInteractionAnalysisCard` |

### Attendance
| Componente Antigo | Novo Caminho |
|-------------------|--------------|
| `@/components/attendance/BimesterAbsences` | `@/components/attendance/BimesterAbsences` ✅ (já estava correto) |
| `@/components/RegisteredAbsencesCard` | `@/components/attendance/RegisteredAbsencesCard` |
| `@/components/FrequencyAllAbsencesCard` | `@/components/attendance/FrequencyAllAbsencesCard` |
| `@/components/FrequencyNoJustifiedCard` | `@/components/attendance/FrequencyNoJustifiedCard` |
| `@/components/RegisterAtestadoCard` | `@/components/attendance/RegisterAtestadoCard` |
| `@/components/AtestadoHistoryCard` | `@/components/attendance/AtestadoHistoryCard` |
| `@/components/RegisterSuspensaoCard` | `@/components/attendance/RegisterSuspensaoCard` |

### Interactions
| Componente Antigo | Novo Caminho |
|-------------------|--------------|
| `@/components/RegisterInteractionCard` | `@/components/interactions/RegisterInteractionCard` |
| `@/components/InteractionHistoryCard` | `@/components/interactions/InteractionHistoryCard` |
| `@/components/InteractionChartsCard` | `@/components/interactions/InteractionChartsCard` |
| `@/components/RegisterOccurrenceCard` | `@/components/interactions/RegisterOccurrenceCard` |
| `@/components/OccurrenceHistoryCard` | `@/components/interactions/OccurrenceHistoryCard` |
| `@/components/SuspensaoHistoryCard` | `@/components/interactions/SuspensaoHistoryCard` |

### Tasks
| Componente Antigo | Novo Caminho |
|-------------------|--------------|
| `@/components/TaskManager` | `@/components/tasks/TaskManager` |
| `@/components/TaskDashboard` | `@/components/tasks/TaskDashboard` |

### WhatsApp
| Componente Antigo | Novo Caminho |
|-------------------|--------------|
| `@/components/WhatsAppModal` | `@/components/whatsapp/WhatsAppModal` |
| `@/components/WhatsAppContactSelector` | `@/components/whatsapp/WhatsAppContactSelector` |

### Shared
| Componente Antigo | Novo Caminho |
|-------------------|--------------|
| `@/components/CustomCard` | `@/components/shared/CustomCard` |
| `@/components/ErrorBoundary` | `@/components/shared/ErrorBoundary` |
| `@/components/ServiceWorkerProvider` | `@/components/shared/ServiceWorkerProvider` |

### Dashboard (já estava organizado)
| Componente | Caminho |
|------------|---------|
| Cards | `@/components/cards/*` ✅ |
| Charts | `@/components/charts/*` ✅ |

## 🔄 Barrel Exports Criados

Todos os domínios têm `index.ts` para facilitar imports:

```typescript
// Antes
import { StudentTable } from '@/components/students/StudentTable';
import { StudentDialog } from '@/components/students/StudentDialog';

// Depois (usando barrel export)
import { StudentTable, StudentDialog } from '@/components/students';
```

## ✅ Arquivos Já Atualizados

- [x] `src/app/layout.tsx` - Layout, ErrorBoundary, AuthProvider
- [x] `src/app/cadastrar-estudante/page.tsx` - Student components

## 📝 Arquivos Pendentes de Atualização

- [ ] `src/app/admin/normalize-contacts/page.tsx`
- [ ] `src/app/admin/clean-atestados/page.tsx`
- [ ] `src/app/admin/update-pode-receber/page.tsx`
- [ ] `src/app/admin/migration-whatsapp/page.tsx`
- [ ] `src/app/monitorar-faltas-consecutivas/page.tsx`
- [ ] `src/app/telefones/page.tsx`
- [ ] `src/app/cadastrar-ano-letivo/page.tsx`
- [ ] `src/app/page.tsx`
- [ ] Outros arquivos em `src/app/*`

## 🎯 Benefícios

1. ✅ **Organização por domínio** - Mais fácil encontrar componentes
2. ✅ **Barrel exports** - Imports mais limpos
3. ✅ **Escalabilidade** - Fácil adicionar novos componentes no domínio correto
4. ✅ **Manutenibilidade** - Separação clara de responsabilidades

## 🔧 Como Atualizar Imports

Use este comando para encontrar imports antigos:

```bash
# Buscar imports antigos
grep -r "from '@/components/Student" src --include="*.tsx" --include="*.ts"

# Substituir manualmente ou usar script
```

## 📚 Próximos Passos

1. Atualizar todos os imports nos arquivos pendentes
2. Verificar que não há imports quebrados
3. Testar build: `npm run build`
4. Testar type-check: `npm run type-check`
