/**
 * Tipos relacionados ao sistema de gerenciamento de tarefas
 */

export interface UserTask {
  id: string;
  userId: string;
  estudanteId: string;
  studentName: string;
  studentClass: string; // Turma do estudante
  taskType: TaskType;
  bimestre: string; // "1º Bimestre", "2º Bimestre", etc.
  status: TaskStatus;
  frequencyPercentage: number; // Percentual de frequência que gerou a tarefa
  absencesCount: number; // Número de faltas que geraram a tarefa
  isPCD: boolean; // Se o estudante é PCD (Pessoa com Deficiência)
  createdAt: string; // Data de criação da tarefa
  completedAt?: string; // Data de conclusão da tarefa
  interactionId?: string; // ID da interação registrada quando a tarefa foi concluída
}

export type TaskType = 'CONSELHO_TUTELAR';

export type TaskStatus = 'PENDING' | 'COMPLETED';

export interface TaskGenerationResult {
  newTasks: UserTask[];
  message: string;
}

export interface BimesterTaskControl {
  userId: string;
  estudanteId: string;
  bimestre: string;
  taskType: TaskType;
  hasCompletedTask: boolean;
  completedAt?: string;
}