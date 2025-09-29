/**
 * Tipos relacionados ao Painel de Tarefas
 */

export type TaskPriorityLevel = 'routine' | 'attention' | 'critical';
export type TaskStatus = 'pending' | 'resolved';

export interface DashboardTask {
  id: string;
  title: string;
  studentName: string;
  studentClass: string;
  shift: string; // Turno
  bimester: string;
  month: string;
  absencesCount: number;
  frequencyPercentage: number;
  isPCD: boolean;
  recommendedAction: string;
  priority: TaskPriorityLevel;
  status: TaskStatus;
  createdAt: Date;
  createdBy: string; // Nome de quem criou a tarefa
  resolvedAt?: Date;
  resolvedAction?: string;
  resolvedDescription?: string;
  resolvedBy?: string; // Nome de quem resolveu a tarefa
  estudanteId: string; // ID do estudante
}

export interface TaskSection {
  id: TaskPriorityLevel;
  title: string;
  description: string;
  allowedRoles: string[];
  pendingTasks: DashboardTask[];
  resolvedTasks: DashboardTask[];
}