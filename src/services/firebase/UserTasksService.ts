/**
 * UserTasksService - Exemplo de uso do BaseFirestoreService
 *
 * Demonstra como estender BaseFirestoreService para criar serviços específicos.
 * Este serviço substitui/simplifica o taskService.ts existente.
 */

import { BaseFirestoreService, Auditable } from './BaseFirestoreService';
import { logger } from '@/utils/logger';
import type { UserTask } from '@/types/tasks';

/**
 * Interface estendida com auditoria
 * Remove createdAt de UserTask pois Auditable define como Timestamp
 */
interface UserTaskWithAudit extends Omit<UserTask, 'createdAt'>, Auditable {}

/**
 * Serviço de tarefas de usuário usando BaseFirestoreService
 */
export class UserTasksService extends BaseFirestoreService<UserTaskWithAudit> {
  constructor() {
    super('userTasks'); // Nome da coleção
  }

  /**
   * Busca tarefas de um estudante específico
   */
  async getByStudent(estudanteId: string): Promise<UserTaskWithAudit[]> {
    try {
      return await this.getAll({
        filters: [
          { field: 'estudanteId', operator: '==', value: estudanteId }
        ],
        orderByField: 'createdAt',
        orderDirection: 'desc'
      });
    } catch (error) {
      logger.error('Erro ao buscar tarefas do estudante:', error as Error);
      throw error;
    }
  }

  /**
   * Busca tarefas pendentes
   */
  async getPending(limit?: number): Promise<UserTaskWithAudit[]> {
    try {
      return await this.getAll({
        filters: [
          { field: 'is_resolved', operator: '==', value: false }
        ],
        orderByField: 'due_date',
        orderDirection: 'asc',
        limit
      });
    } catch (error) {
      logger.error('Erro ao buscar tarefas pendentes:', error as Error);
      throw error;
    }
  }

  /**
   * Busca tarefas por prioridade
   */
  async getByPriority(priority: 'ALTA' | 'MÉDIA' | 'BAIXA'): Promise<UserTaskWithAudit[]> {
    try {
      return await this.getAll({
        filters: [
          { field: 'priority', operator: '==', value: priority }
        ],
        orderByField: 'due_date',
        orderDirection: 'asc'
      });
    } catch (error) {
      logger.error('Erro ao buscar tarefas por prioridade:', error as Error);
      throw error;
    }
  }

  /**
   * Busca tarefas atribuídas a um usuário
   */
  async getAssignedTo(userId: string): Promise<UserTaskWithAudit[]> {
    try {
      return await this.getAll({
        filters: [
          { field: 'assigned_to', operator: '==', value: userId },
          { field: 'is_resolved', operator: '==', value: false }
        ],
        orderByField: 'due_date',
        orderDirection: 'asc'
      });
    } catch (error) {
      logger.error('Erro ao buscar tarefas atribuídas:', error as Error);
      throw error;
    }
  }

  /**
   * Marca tarefa como resolvida
   */
  async markAsResolved(taskId: string, resolutionNotes?: string): Promise<void> {
    try {
      await this.update(taskId, {
        is_resolved: true,
        status: 'COMPLETED',
        resolution_notes: resolutionNotes || '',
      } as Partial<UserTaskWithAudit>);

      logger.info('Tarefa marcada como resolvida:', { taskId });
    } catch (error) {
      logger.error('Erro ao marcar tarefa como resolvida:', error as Error);
      throw error;
    }
  }

  /**
   * Busca tarefas com paginação (útil para dashboards)
   */
  async getTasksPaginated(pageSize: number = 20, startAfter?: any) {
    return await this.getPaginated({
      limit: pageSize,
      orderByField: 'createdAt',
      orderDirection: 'desc',
      startAfter
    });
  }
}

// Exportar instância singleton
export const userTasksService = new UserTasksService();
