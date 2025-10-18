/**
 * Schemas Zod para Tasks (Tarefas)
 *
 * Define validações para CRUD de tarefas pedagógicas
 */

import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Schema para criação de Task
 */
export const createTaskSchema = z.object({
  student_id: z.string().uuid('ID do estudante deve ser UUID válido'),
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título muito longo'),
  description: z.string().max(1000, 'Descrição muito longa').nullable().optional(),
  recommended_action: z.string().max(500, 'Ação recomendada muito longa').nullable().optional(),
  is_resolved: z.boolean().optional().default(false),
  action_taken: z.string().max(1000, 'Ação tomada muito longa').nullable().optional(),
  created_by: z.string().max(100).nullable().optional(),
  assigned_to: z.string().max(100).nullable().optional(),
  due_date: z.string().nullable().optional(), // ISO date string
});

/**
 * Schema para atualização de Task
 */
export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  recommended_action: z.string().max(500).nullable().optional(),
  is_resolved: z.boolean().optional(),
  action_taken: z.string().max(1000).nullable().optional(),
  assigned_to: z.string().max(100).nullable().optional(),
  due_date: z.string().nullable().optional(),
  resolved_at: z.string().nullable().optional(),
});

/**
 * Schema para filtros de Tasks
 */
export const taskFiltersSchema = z.object({
  student_id: z.string().uuid().optional(),
  is_resolved: z.enum(['true', 'false']).optional(),
  created_by: z.string().optional(),
  assigned_to: z.string().optional(),
  limit: z.string().regex(/^\d+$/).optional().default('100'),
  offset: z.string().regex(/^\d+$/).optional().default('0'),
});

// ============================================================================
// TYPES
// ============================================================================

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskFilters = z.infer<typeof taskFiltersSchema>;
