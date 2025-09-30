/**
 * Task Validation Schemas with Zod
 *
 * Provides strong type-safe validation for all task operations
 */

import { z } from 'zod';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

/**
 * UUID v4 validation
 */
export const uuidSchema = z.string().uuid('ID deve ser um UUID válido');

/**
 * ISO 8601 date validation (YYYY-MM-DD)
 */
export const isoDateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Data deve estar no formato YYYY-MM-DD'
);

// ============================================================================
// TASK SCHEMA
// ============================================================================

/**
 * Task type enum
 */
export const taskTypeSchema = z.enum([
  'LIGAR_PARA_RESPONSAVEL',
  'CHAMAR_RESPONSAVEL',
  'VERIFICAR_AUSENCIA',
  'ATUALIZAR_DADOS',
  'OUTROS'
], {
  errorMap: () => ({ message: 'Tipo de tarefa inválido' })
});

/**
 * Task status enum
 */
export const taskStatusSchema = z.enum(['PENDING', 'COMPLETED'], {
  errorMap: () => ({ message: 'Status deve ser PENDING ou COMPLETED' })
});

/**
 * Bimestre enum
 */
export const bimestreSchema = z.enum(['1B', '2B', '3B', '4B', 'ANUAL'], {
  errorMap: () => ({ message: 'Bimestre deve ser 1B, 2B, 3B, 4B ou ANUAL' })
});

/**
 * Complete task schema with all validations
 */
export const taskSchema = z.object({
  // Required fields
  taskId: uuidSchema,

  estudanteId: uuidSchema,

  userId: z.string()
    .min(1, 'ID do usuário é obrigatório'),

  taskType: taskTypeSchema,

  status: taskStatusSchema,

  bimestre: bimestreSchema,

  createdDate: isoDateSchema,

  // Optional fields
  description: z.string()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional(),

  completedDate: isoDateSchema.optional(),

  notes: z.string()
    .max(2000, 'Notas devem ter no máximo 2000 caracteres')
    .optional(),

  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),

  dueDate: isoDateSchema.optional(),

  // Audit fields (added by system)
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),

  // Soft delete fields (added by system)
  deleted: z.boolean().optional(),
  deletedAt: z.any().optional(),
  deletedBy: z.string().optional(),
  deleteReason: z.string().optional(),
});

/**
 * Schema for creating a new task (without system fields)
 */
export const createTaskSchema = taskSchema.omit({
  taskId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  deleted: true,
  deletedAt: true,
  deletedBy: true,
  deleteReason: true,
});

/**
 * Schema for updating a task (all fields optional except taskId)
 */
export const updateTaskSchema = taskSchema.partial().required({
  taskId: true,
});

/**
 * Schema for task search filters
 */
export const taskFilterSchema = z.object({
  estudanteId: uuidSchema.optional(),
  userId: z.string().optional(),
  taskType: taskTypeSchema.optional(),
  status: taskStatusSchema.optional(),
  bimestre: bimestreSchema.optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
  includeDeleted: z.boolean().default(false),
});

// ============================================================================
// TASK CONTROL SCHEMA
// ============================================================================

/**
 * Task control schema for tracking task creation status
 */
export const taskControlSchema = z.object({
  estudanteId: uuidSchema,
  bimestre: bimestreSchema,
  taskType: taskTypeSchema,
  lastChecked: isoDateSchema,
  taskCreated: z.boolean(),
  taskId: uuidSchema.optional(),
});

/**
 * Schema for creating task control record
 */
export const createTaskControlSchema = taskControlSchema.omit({
  taskId: true,
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Task = z.infer<typeof taskSchema>;
export type CreateTask = z.infer<typeof createTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type TaskFilter = z.infer<typeof taskFilterSchema>;
export type TaskType = z.infer<typeof taskTypeSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type Bimestre = z.infer<typeof bimestreSchema>;

export type TaskControl = z.infer<typeof taskControlSchema>;
export type CreateTaskControl = z.infer<typeof createTaskControlSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate task data
 */
export function validateTask(data: unknown): Task {
  return taskSchema.parse(data);
}

/**
 * Validate task creation data
 */
export function validateCreateTask(data: unknown): CreateTask {
  return createTaskSchema.parse(data);
}

/**
 * Validate task update data
 */
export function validateUpdateTask(data: unknown): UpdateTask {
  return updateTaskSchema.parse(data);
}

/**
 * Validate task filters
 */
export function validateTaskFilters(data: unknown): TaskFilter {
  return taskFilterSchema.parse(data);
}

/**
 * Validate task control data
 */
export function validateTaskControl(data: unknown): TaskControl {
  return taskControlSchema.parse(data);
}

/**
 * Validate task control creation data
 */
export function validateCreateTaskControl(data: unknown): CreateTaskControl {
  return createTaskControlSchema.parse(data);
}

/**
 * Safe validation (returns result object instead of throwing)
 */
export function safeValidateTask(data: unknown) {
  return taskSchema.safeParse(data);
}

/**
 * Safe validation for creation
 */
export function safeValidateCreateTask(data: unknown) {
  return createTaskSchema.safeParse(data);
}

/**
 * Safe validation for update
 */
export function safeValidateUpdateTask(data: unknown) {
  return updateTaskSchema.safeParse(data);
}

/**
 * Safe validation for task control
 */
export function safeValidateTaskControl(data: unknown) {
  return taskControlSchema.safeParse(data);
}