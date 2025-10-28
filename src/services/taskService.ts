/**
 * Serviço para gerenciamento de tarefas de usuário (API VERSION)
 * Refatorado para usar API Routes ao invés de Supabase direto
 */

import { AcademicYearService } from './supabase/academicYearService';
import { AbsenceService } from './supabase/absenceService';
import { StudentDataService } from './studentDataService';
import { logger } from '@/utils/logger';
import type { UserTask, TaskGenerationResult, _BimesterTaskControl, TaskType } from '@/types/tasks';

/**
 * API Task Record type (from database)
 */
interface ApiTaskRecord {
  id: string;
  user_id?: string;
  student_id: string;
  student_name?: string;
  title?: string;
  student_class?: string;
  task_type?: string;
  bimestre?: string;
  is_resolved: boolean;
  frequency_percentage?: number;
  absences_count?: number;
  is_pcd?: boolean;
  priority?: string;
  recommended_action?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  interaction_id?: string;
  deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

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

      const _bimestres = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

      for (const bimestre of _bimestres) {
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
      logger.error('Erro ao calcular frequência do bimestre:', {}, error as Error);
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
  static async generateTasksForUser(_userId: string): Promise<TaskGenerationResult> {
    try {
      return await Promise.race([
        this.doGenerateTasksForUser(_userId),
        new Promise<TaskGenerationResult>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout na geração de tarefas')), 30000)
        )
      ]);
    } catch (error) {
      logger.error('Erro ao gerar tarefas:', {}, error as Error);
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
  private static async doGenerateTasksForUser(_userId: string): Promise<TaskGenerationResult> {
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
            userId: _userId,
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
  static async getPendingTasks(_userId: string): Promise<UserTask[]> {
    try {
      const response = await fetch(`/api/tasks?created_by=${encodeURIComponent(_userId)}&is_resolved=false`);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();
      return (result.data || []).map((task: ApiTaskRecord) => this.mapApiToUserTask(task));
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
  static async getCompletedTasks(_userId: string, _bimestres?: string[]): Promise<UserTask[]> {
    try {
      const response = await fetch(`/api/tasks?created_by=${encodeURIComponent(_userId)}&is_resolved=true`);

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const result = await response.json();
      return (result.data || []).map((task: ApiTaskRecord) => this.mapApiToUserTask(task));
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
      return result.data.id;
    } catch (error) {
      logger.error('createTask falhou', {}, error as Error);
      throw error;
    }
  }

  /**
   * Busca todas as tarefas de um usuário (por userId, incluindo BOT)
   */
  static async getUserTasksForUserId(_userId: string): Promise<UserTask[]> {
    try {
      const response = await fetch(`/api/tasks?created_by=${encodeURIComponent(_userId)}`);

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const result = await response.json();
      return (result.data || []).map((task: ApiTaskRecord) => this.mapApiToUserTask(task));
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
      interface ApiUpdateData {
        is_resolved?: boolean;
        resolved_at?: string;
        action_taken?: string;
      }

      const updateData: ApiUpdateData = {};

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

      interface TaskIdData {
        id: string;
      }

      // Deletar todas em paralelo (máximo 10 simultâneas para não sobrecarregar)
      const deletePromises = (tasks as TaskIdData[]).map((task: TaskIdData) =>
        fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

    } catch (error) {
      logger.error('clearAllTasks falhou', {}, error as Error);
      throw error;
    }
  }

  /**
   * Map API response to UserTask type
   */
  private static mapApiToUserTask(record: ApiTaskRecord): UserTask {
    // Type-safe mapping with validation
    const taskType: TaskType = record.task_type === 'CONSELHO_TUTELAR'
      ? 'CONSELHO_TUTELAR'
      : 'CONSELHO_TUTELAR'; // Default

    const priority: 'critical' | 'attention' | 'routine' =
      record.priority === 'critical' || record.priority === 'attention' || record.priority === 'routine'
        ? record.priority
        : 'routine'; // Default

    return {
      id: record.id,
      userId: record.user_id || 'sistema',
      estudanteId: record.student_id,
      studentName: record.student_name || record.title || 'Estudante',
      studentClass: record.student_class || 'N/A',
      taskType,
      bimestre: record.bimestre || '1º Bimestre',
      status: record.is_resolved ? 'COMPLETED' : 'PENDING',
      frequencyPercentage: record.frequency_percentage !== undefined
        ? parseFloat(String(record.frequency_percentage))
        : 0,
      absencesCount: record.absences_count || 0,
      isPCD: record.is_pcd || false,
      priority,
      recommendedAction: record.recommended_action || record.title || 'Tarefa pendente',
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
