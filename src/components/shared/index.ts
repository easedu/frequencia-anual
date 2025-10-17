/**
 * Barrel Export - Componentes Compartilhados
 *
 * Facilita imports:
 * import { StudentSelector, DateRangePicker, EmptyState } from '@/components/shared';
 */

export { CustomCard } from './CustomCard';
export { ErrorBoundary } from './ErrorBoundary';
export { ServiceWorkerProvider } from './ServiceWorkerProvider';

// ════════════════════════════════════════════════════════════════
// NOVOS COMPONENTES REUTILIZÁVEIS (Fase 0 - Preparação)
// ════════════════════════════════════════════════════════════════

// Student Selector
export {
  StudentSelector,
  ClassSelector,
  StudentSelectorVertical,
  type StudentSelectorProps,
  type Estudante,
} from './StudentSelector';

// Date Range Picker
export {
  DateRangePicker,
  DateRangePickerCompact,
  DateRangePickerVertical,
  type DateRange,
  type DateRangePickerProps,
  type DateRangePreset,
} from './DateRangePicker';

// Empty State
export {
  EmptyState,
  EmptySearchState,
  EmptyStudentsState,
  EmptyCalendarState,
  ErrorState,
  InfoState,
  type EmptyStateProps,
} from './EmptyState';

// Confirm Dialog
export {
  ConfirmDialog,
  DeleteConfirmDialog,
  DangerConfirmDialog,
  WarningDialog,
  useConfirmDialog,
  type ConfirmDialogProps,
} from './ConfirmDialog';
