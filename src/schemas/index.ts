/**
 * Barrel export para schemas Zod centralizados
 *
 * Permite imports simplificados:
 * import { studentFormSchema, studentCompleteFormSchema } from '@/schemas';
 *
 * Em vez de:
 * import { studentFormSchema } from '@/schemas/studentSchemas';
 */

// Common schemas (base validation schemas)
export * from './common';

// Student schemas
export * from './studentSchemas';

// Absence schemas
export * from './absenceSchemas';

// Interaction schemas
export * from './interactionSchemas';

// Task schemas
export * from './taskSchemas';