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
  priority: 'critical' | 'attention' | 'routine'; // Prioridade da tarefa
  recommendedAction: string; // Ação recomendada original
  createdAt: string; // Data de criação da tarefa
  createdBy: string; // Nome de quem criou a tarefa
  completedAt?: string; // Data de conclusão da tarefa
  interactionId?: string; // ID da interação registrada quando a tarefa foi concluída
  interactionType?: string; // Tipo de interação quando resolvida
  interactionDescription?: string; // Descrição da interação quando resolvida
  resolvedBy?: string; // Nome de quem resolveu a tarefa
  updatedAt?: string; // Data de última atualização
  deleted?: boolean; // Soft delete flag
  deletedAt?: string; // Data de deleção
  deletedBy?: string; // Quem deletou
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