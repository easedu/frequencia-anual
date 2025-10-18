/**
 * Serviço para gerenciamento de tarefas de usuário (API VERSION)
 * Refatorado para usar API Routes ao invés de Supabase direto
 */

import { AcademicYearService } from './supabase/academicYearService';
import { AbsenceService } from './supabase/absenceService';
import { StudentDataService } from './studentDataService';
import { logger } from '@/utils/logger';
import type { UserTask, TaskGenerationResult, BimesterTaskControl } from '@/types/tasks';
import type { Student } from '@/types';

export class TaskService {
  /**
   * Identifica o bimestre atual baseado na data
   */
  private static async getCurrentBimester(): Promise<string> {
    try {
      // Usar AcademicYearService do Supabase
      const bimesterDates = await AcademicYearService.getBimesterDates(2025);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const bimestres = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

      for (const bimestre of bimestres) {
        const bimNum = parseInt(bimestre.charAt(0));
        const dates = bimesterDates[bimNum];

        if (dates?.start && dates?.end) {
          const startDate = this.parseDate(dates.start);
          const endDate = this.parseDate(dates.end);

          if (startDate && endDate && hoje >= startDate && hoje <= endDate) {
            return bimestre;
          }
        }
      }

      return '1º Bimestre';
    } catch (error) {
      logger.error('getCurrentBimester falhou', {}, error as Error);
      return '1º Bimestre';
    }
  }

  /**
   * Parse date in format dd/mm/yyyy or yyyy-mm-dd
   */
  private static parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    // dd/mm/yyyy
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/').map(Number);
      return new Date(year, month - 1, day);
    }

    // yyyy-mm-dd
    if (dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    return null;
  }

  /**
   * Calcula dados completos de frequência de um estudante no bimestre atual
   */
  private static async calculateCurrentBimesterData(
    estudanteId: string,
    currentBimester: string
  ): Promise<{ frequency: number; absences: number; totalDays: number }> {
    try {
      return await Promise.race([
        this.doCalculateFrequencyData(estudanteId, currentBimester),
        new Promise<{ frequency: number; absences: number; totalDays: number }>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout na calculação de frequência')), 10000)
        )
      ]);
    } catch (error) {
      logger.error('Erro ao calcular frequência do bimestre:', error as Error);
      return { frequency: 100, absences: 0, totalDays: 0 };
    }
  }

  /**
   * Implementação da calculação de dados de frequência
   */
  private static async doCalculateFrequencyData(
    estudanteId: string,
    currentBimester: string
  ): Promise<{ frequency: number; absences: number; totalDays: number }> {
    // Buscar dias letivos do bimestre
    const bimNum = parseInt(currentBimester.charAt(0));
    const schoolDaysByBimester = await AcademicYearService.getSchoolDaysByBimester(2025);
    const diasLetivos = schoolDaysByBimester[bimNum] || 0;

    if (diasLetivos === 0) {
      return { frequency: 100, absences: 0, totalDays: 0 };
    }

    // Buscar faltas do estudante (apenas não justificadas)
    const allAbsences = await AbsenceService.getStudentAbsences(estudanteId);
    const bimesterDates = await AcademicYearService.getBimesterDates(2025);
    const dates = bimesterDates[bimNum];

    if (!dates?.start || !dates?.end) {
      return { frequency: 100, absences: 0, totalDays: diasLetivos };
    }

    const startDate = this.parseDate(dates.start);
    const endDate = this.parseDate(dates.end);

    if (!startDate || !endDate) {
      return { frequency: 100, absences: 0, totalDays: diasLetivos };
    }

    // Contar faltas não justificadas no período
    let faltasNaoJustificadas = 0;
    allAbsences.forEach(absence => {
      // Usar campo Supabase
      if (!absence.is_justified) {
        const absenceDate = this.parseDate(absence.absence_date || '');
        if (absenceDate && absenceDate >= startDate && absenceDate <= endDate) {
          faltasNaoJustificadas++;
        }
      }
    });

    const diasPresentes = diasLetivos - faltasNaoJustificadas;
    const percentual = (diasPresentes / diasLetivos) * 100;

    return {
      frequency: Math.max(0, Math.min(100, percentual)),
      absences: faltasNaoJustificadas,
      totalDays: diasLetivos
    };
  }

  /**
   * Gera tarefas para estudantes com frequência baixa no bimestre atual
   */
  static async generateTasksForUser(userId: string): Promise<TaskGenerationResult> {
    try {
      return await Promise.race([
        this.doGenerateTasksForUser(userId),
        new Promise<TaskGenerationResult>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout na geração de tarefas')), 30000)
        )
      ]);
    } catch (error) {
      logger.error('Erro ao gerar tarefas:', error as Error);
      return {
        newTasks: [],
        message: error instanceof Error && error.message.includes('Timeout')
          ? 'Timeout na geração de tarefas. Tente novamente.'
          : 'Erro ao gerar tarefas'
      };
    }
  }

  /**
   * Implementação otimizada da geração de tarefas
   */
  private static async doGenerateTasksForUser(userId: string): Promise<TaskGenerationResult> {
    const currentBimester = await this.getCurrentBimester();

    // Buscar estudantes ativos
    const students = await StudentDataService.getStudents(true); // onlyActive = true
    const estudantesAtivos = students.filter(s => s.status === 'ATIVO');

    if (estudantesAtivos.length === 0) {
      return { newTasks: [], message: 'Nenhum estudante ativo encontrado' };
    }

    // Buscar dias letivos
    const bimNum = parseInt(currentBimester.charAt(0));
    const schoolDaysByBimester = await AcademicYearService.getSchoolDaysByBimester(2025);
    const diasLetivos = schoolDaysByBimester[bimNum] || 0;

    if (diasLetivos === 0) {
      return { newTasks: [], message: 'Nenhum dia letivo configurado para este bimestre' };
    }

    // Processar estudantes
    const newTasks: UserTask[] = [];
    let studentsWithLowFrequency = 0;

    for (const estudante of estudantesAtivos) {
      // NOTA: Verificação de tasks existentes removida (métodos legacy getAllTaskControls e getExistingPendingTasks)
      // Se necessário, implementar verificação usando schema correto do Supabase

      // Calcular frequência
      const frequencyData = await this.calculateCurrentBimesterData(estudante.estudanteId, currentBimester);

      // Verificar se frequência é < 76%
      if (frequencyData.frequency < 76) {
        studentsWithLowFrequency++;

        // Criar task se dados estão completos
        if (estudante.turma && estudante.turma.trim() && estudante.nome && estudante.nome.trim()) {
          const taskData: Omit<UserTask, 'id' | 'createdAt' | 'updatedAt'> = {
            userId,
            estudanteId: estudante.estudanteId,
            studentName: estudante.nome,
            studentClass: estudante.turma,
            taskType: 'CONSELHO_TUTELAR',
            bimestre: currentBimester,
            status: 'PENDING',
            frequencyPercentage: frequencyData.frequency,
            absencesCount: frequencyData.absences,
            isPCD: estudante.deficiencia?.estudanteComDeficiencia || false,
            priority: 'critical',
            recommendedAction: 'Encaminhar ao Conselho Tutelar',
            createdBy: 'Sistema',
            deleted: false
          };

          // Insert via API
          try {
            const response = await fetch('/api/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                student_id: taskData.estudanteId,
                title: `Frequência baixa: ${taskData.frequencyPercentage.toFixed(1)}%`,
                description: `Estudante com ${taskData.absencesCount} faltas no ${currentBimester}`,
                recommended_action: taskData.recommendedAction,
                is_resolved: false,
                created_by: taskData.createdBy,
              }),
            });

            if (response.ok) {
              const result = await response.json();
              newTasks.push({
                id: result.data.id,
                ...taskData,
                createdAt: result.data.created_at,
                updatedAt: result.data.updated_at
              });
            } else {
              logger.error('Erro ao inserir task via API', {
                estudanteId: estudante.estudanteId,
                status: response.status
              });
            }
          } catch (error) {
            logger.error('Erro ao inserir task via API', { estudanteId: estudante.estudanteId }, error as Error);
          }
        }
      }
    }

    if (newTasks.length > 0) {
      logger.info('Tarefas geradas com sucesso', {
        count: newTasks.length,
        bimestre: currentBimester
      });
    }

    return {
      newTasks,
      message: newTasks.length > 0
        ? `${newTasks.length} estudante(s) com frequência ≤ 75% necessitam encaminhamento ao Conselho Tutelar`
        : studentsWithLowFrequency > 0
          ? `${studentsWithLowFrequency} estudante(s) com frequência baixa já foram processados anteriormente`
          : 'Nenhum estudante necessita encaminhamento no momento'
    };
  }

  /**
   * Busca tarefas pendentes de um usuário
   */
  static async getPendingTasks(userId: string): Promise<UserTask[]> {
    try {
      const response = await fetch(`/api/tasks?created_by=${encodeURIComponent(userId)}&is_resolved=false`);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();
      return (result.data || []).map((task: any) => this.mapApiToUserTask(task));
    } catch (error) {
      logger.error('getPendingTasks falhou', {}, error as Error);
      return [];
    }
  }

  /**
   * Marca uma tarefa como completada e registra o controle
   */
  static async completeTask(
    taskId: string,
    interactionId: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          action_taken: `Interação registrada: ${interactionId}`
        }),
      });

      if (!response.ok) {
        logger.error('Erro ao atualizar tarefa via API', { taskId, status: response.status });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('completeTask falhou', { taskId }, error as Error);
      return false;
    }
  }

  /**
   * Busca uma tarefa específica por ID
   */
  static async getTaskById(taskId: string): Promise<UserTask | null> {
    try {
      const response = await fetch(`/api/tasks/${taskId}`);

      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const result = await response.json();
      return this.mapApiToUserTask(result.data);
    } catch (error) {
      logger.error('getTaskById falhou', { taskId }, error as Error);
      return null;
    }
  }

  /**
   * Busca tarefas completadas de um usuário
   */
  static async getCompletedTasks(userId: string, bimestres?: string[]): Promise<UserTask[]> {
    try {
      const response = await fetch(`/api/tasks?created_by=${encodeURIComponent(userId)}&is_resolved=true`);

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const result = await response.json();
      return (result.data || []).map((task: any) => this.mapApiToUserTask(task));
    } catch (error) {
      logger.error('getCompletedTasks falhou', {}, error as Error);
      return [];
    }
  }

  /**
   * Cria uma nova tarefa via API
   */
  static async createTask(taskData: Omit<UserTask, 'id'>): Promise<string> {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: taskData.estudanteId,
          title: taskData.recommendedAction || 'Tarefa criada',
          description: `${taskData.studentName} - ${taskData.studentClass}`,
          recommended_action: taskData.recommendedAction,
          is_resolved: taskData.status === 'COMPLETED',
          action_taken: taskData.interactionDescription,
          created_by: taskData.createdBy,
          due_date: taskData.completedAt || null,
        }),
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const result = await response.json();
      logger.info('Tarefa criada via API', { taskId: result.data.id });
      return result.data.id;
    } catch (error) {
      logger.error('createTask falhou', {}, error as Error);
      throw error;
    }
  }

  /**
   * Busca todas as tarefas de um usuário (por userId, incluindo BOT)
   */
  static async getUserTasksForUserId(userId: string): Promise<UserTask[]> {
    try {
      const response = await fetch(`/api/tasks?created_by=${encodeURIComponent(userId)}`);

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const result = await response.json();
      return (result.data || []).map((task: any) => this.mapApiToUserTask(task));
    } catch (error) {
      logger.error('getUserTasksForUserId falhou', { userId }, error as Error);
      return [];
    }
  }

  /**
   * Atualiza uma tarefa via API
   */
  static async updateTask(taskId: string, updates: Partial<UserTask>): Promise<boolean> {
    try {
      const updateData: any = {};

      if (updates.status !== undefined) {
        updateData.is_resolved = updates.status === 'COMPLETED';
      }
      if (updates.completedAt !== undefined) updateData.resolved_at = updates.completedAt;
      if (updates.interactionDescription !== undefined) updateData.action_taken = updates.interactionDescription;

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      logger.info('Tarefa atualizada via API', { taskId });
      return true;
    } catch (error) {
      logger.error('updateTask falhou', { taskId }, error as Error);
      return false;
    }
  }

  /**
   * Deleta uma tarefa via API
   */
  static async deleteTask(taskId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      logger.info('Tarefa deletada via API', { taskId });
      return true;
    } catch (error) {
      logger.error('deleteTask falhou', { taskId }, error as Error);
      return false;
    }
  }

  /**
   * Remove todas as tarefas do sistema (para limpeza durante desenvolvimento)
   * NOTA: Requer implementação bulk delete na API ou múltiplas chamadas
   */
  static async clearAllTasks(): Promise<void> {
    try {
      // Buscar todas as tasks
      const response = await fetch('/api/tasks?limit=1000');
      if (!response.ok) throw new Error('Erro ao buscar tasks');

      const result = await response.json();
      const tasks = result.data || [];

      // Deletar todas em paralelo (máximo 10 simultâneas para não sobrecarregar)
      const deletePromises = tasks.map((task: any) =>
        fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

      logger.info('Todas as tarefas foram removidas via API');
    } catch (error) {
      logger.error('clearAllTasks falhou', {}, error as Error);
      throw error;
    }
  }

  /**
   * Map API response to UserTask type
   */
  private static mapApiToUserTask(record: any): UserTask {
    return {
      id: record.id,
      userId: record.user_id || 'sistema',
      estudanteId: record.student_id,
      studentName: record.student_name || record.title || 'Estudante',
      studentClass: record.student_class || 'N/A',
      taskType: record.task_type || 'CONSELHO_TUTELAR',
      bimestre: record.bimestre || '1º Bimestre',
      status: record.is_resolved ? 'COMPLETED' : 'PENDING',
      frequencyPercentage: parseFloat(record.frequency_percentage || 0),
      absencesCount: record.absences_count || 0,
      isPCD: record.is_pcd || false,
      priority: record.priority || 'routine',
      recommendedAction: record.recommended_action || record.title,
      createdBy: record.created_by,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      completedAt: record.resolved_at,
      interactionId: record.interaction_id,
      deleted: record.deleted || false,
      deletedAt: record.deleted_at,
      deletedBy: record.deleted_by
    };
  }
}
