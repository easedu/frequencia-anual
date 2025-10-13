/**
 * Serviço para gerenciamento de tarefas de usuário (SUPABASE VERSION)
 * Migrado de Firebase para Supabase
 */

import { supabase } from '@/lib/supabaseClient';
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

    // Buscar controles e tasks existentes em paralelo
    const estudanteIds = estudantesAtivos.map(e => e.estudanteId);
    const [controlSet, existingTasksSet] = await Promise.all([
      this.getAllTaskControls(userId, estudanteIds, currentBimester),
      this.getExistingPendingTasks(userId, estudanteIds, currentBimester)
    ]);

    // Processar estudantes
    const newTasks: UserTask[] = [];
    let studentsWithLowFrequency = 0;

    for (const estudante of estudantesAtivos) {
      // Verificar se já completou OU já tem task pendente
      if (controlSet.has(estudante.estudanteId) || existingTasksSet.has(estudante.estudanteId)) {
        continue;
      }

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

          // Insert no Supabase
          const { data: inserted, error } = await (supabase as any)
            .from('user_tasks')
            .insert({
              user_id: taskData.userId,
              student_id: taskData.estudanteId,
              student_name: taskData.studentName,
              student_class: taskData.studentClass,
              task_type: taskData.taskType,
              bimestre: taskData.bimestre,
              status: taskData.status,
              frequency_percentage: taskData.frequencyPercentage,
              absences_count: taskData.absencesCount,
              is_pcd: taskData.isPCD,
              priority: taskData.priority,
              recommended_action: taskData.recommendedAction,
              created_by: taskData.createdBy,
              deleted: taskData.deleted
            })
            .select()
            .single();

          if (error) {
            logger.error('Erro ao inserir task', { estudanteId: estudante.estudanteId }, error);
          } else {
            newTasks.push({
              id: inserted.id,
              ...taskData,
              createdAt: inserted.created_at,
              updatedAt: inserted.updated_at
            });
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
   * Busca todos os controles de tarefa
   */
  private static async getAllTaskControls(
    userId: string,
    estudanteIds: string[],
    bimestre: string
  ): Promise<Set<string>> {
    const completedSet = new Set<string>();

    if (estudanteIds.length === 0) return completedSet;

    try {
      const { data, error } = await (supabase
        .from('task_control')
        .select('student_id')
        .eq('user_id', userId)
        .in('student_id', estudanteIds)
        .eq('bimestre', bimestre)
        .eq('task_type', 'CONSELHO_TUTELAR')
        .eq('has_completed_task', true) as any);

      if (error) throw error;

      (data || []).forEach((record: any) => {
        completedSet.add(record.student_id);
      });
    } catch (error) {
      logger.error('getAllTaskControls falhou', {}, error as Error);
    }

    return completedSet;
  }

  /**
   * Busca todas as tasks pendentes existentes
   */
  private static async getExistingPendingTasks(
    userId: string,
    estudanteIds: string[],
    bimestre: string
  ): Promise<Set<string>> {
    const tasksSet = new Set<string>();

    if (estudanteIds.length === 0) return tasksSet;

    try {
      const { data, error } = await (supabase
        .from('user_tasks')
        .select('student_id')
        .eq('user_id', userId)
        .in('student_id', estudanteIds)
        .eq('bimestre', bimestre)
        .eq('status', 'PENDING')
        .eq('deleted', false) as any);

      if (error) throw error;

      (data || []).forEach((record: any) => {
        tasksSet.add(record.student_id);
      });
    } catch (error) {
      logger.error('getExistingPendingTasks falhou', {}, error as Error);
    }

    return tasksSet;
  }

  /**
   * Busca tarefas pendentes de um usuário
   */
  static async getPendingTasks(userId: string): Promise<UserTask[]> {
    try {
      const { data, error } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'PENDING')
        .eq('deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(task => this.mapSupabaseToUserTask(task));
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
      // Buscar task
      const { data: task, error: fetchError } = await (supabase
        .from('user_tasks')
        .select('*')
        .eq('id', taskId)
        .single() as any);

      if (fetchError || !task) {
        logger.error('Tarefa não encontrada', { taskId });
        return false;
      }

      const completedAt = new Date().toISOString();

      // Atualizar task e criar control em paralelo
      const [updateResult, controlResult] = await Promise.allSettled([
        // 1. Atualizar task
        ((supabase
          .from('user_tasks') as any)
          .update({
            status: 'COMPLETED',
            completed_at: completedAt,
            interaction_id: interactionId
          })
          .eq('id', taskId)),

        // 2. Criar control
        (supabase
          .from('task_control')
          .insert({
            user_id: task.user_id,
            student_id: task.student_id,
            bimestre: task.bimestre,
            task_type: task.task_type,
            has_completed_task: true,
            completed_at: completedAt
          } as any) as any)
      ]);

      if (updateResult.status === 'rejected') {
        logger.error('Erro ao atualizar task', { taskId }, updateResult.reason);
        return false;
      }

      if (controlResult.status === 'rejected') {
        logger.error('Erro ao criar control', { taskId }, controlResult.reason);
        // Task foi atualizada, então considerar sucesso parcial
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
      const { data, error } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return this.mapSupabaseToUserTask(data);
    } catch (error) {
      logger.error('getTaskById falhou', { taskId }, error as Error);
      return null;
    }
  }

  /**
   * Busca tarefas completadas de um usuário para bimestres específicos
   */
  static async getCompletedTasks(userId: string, bimestres: string[]): Promise<UserTask[]> {
    try {
      if (bimestres.length === 0) {
        bimestres = ['1º Bimestre']; // Fallback
      }

      const { data, error } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'COMPLETED')
        .in('bimestre', bimestres)
        .eq('deleted', false)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(task => this.mapSupabaseToUserTask(task));
    } catch (error) {
      logger.error('getCompletedTasks falhou', {}, error as Error);
      return [];
    }
  }

  /**
   * Cria uma nova tarefa no Supabase
   */
  static async createTask(taskData: Omit<UserTask, 'id'>): Promise<string> {
    try {
      const insertData: any = {
        user_id: taskData.userId,
        student_id: taskData.estudanteId,
        student_name: taskData.studentName,
        student_class: taskData.studentClass,
        task_type: taskData.taskType,
        bimestre: taskData.bimestre,
        status: taskData.status,
        frequency_percentage: taskData.frequencyPercentage,
        absences_count: taskData.absencesCount,
        is_pcd: taskData.isPCD,
        created_at: taskData.createdAt,
        created_by: taskData.createdBy,
        priority: taskData.priority,
        recommended_action: taskData.recommendedAction,
        deleted: false,
      };

      // Campos opcionais
      if (taskData.completedAt !== undefined) insertData.completed_at = taskData.completedAt;
      if (taskData.resolvedBy !== undefined) insertData.resolved_by = taskData.resolvedBy;
      if (taskData.interactionId !== undefined) insertData.interaction_id = taskData.interactionId;
      if (taskData.interactionType !== undefined) insertData.interaction_type = taskData.interactionType;
      if (taskData.interactionDescription !== undefined) insertData.interaction_description = taskData.interactionDescription;

      const { data, error } = await ((supabase
        .from('user_tasks') as any)
        .insert(insertData)
        .select()
        .single());

      if (error) throw error;

      logger.info('Tarefa criada no Supabase', { taskId: data.id });
      return data.id;
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
      const { data, error } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(task => this.mapSupabaseToUserTask(task));
    } catch (error) {
      logger.error('getUserTasksForUserId falhou', { userId }, error as Error);
      return [];
    }
  }

  /**
   * Atualiza uma tarefa
   */
  static async updateTask(taskId: string, updates: Partial<UserTask>): Promise<boolean> {
    try {
      const updateData: any = {};

      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt;
      if (updates.interactionId !== undefined) updateData.interaction_id = updates.interactionId;
      if (updates.interactionType !== undefined) updateData.interaction_type = updates.interactionType;
      if (updates.interactionDescription !== undefined) updateData.interaction_description = updates.interactionDescription;
      if (updates.resolvedBy !== undefined) updateData.resolved_by = updates.resolvedBy;

      const { error } = await ((supabase
        .from('user_tasks') as any)
        .update(updateData)
        .eq('id', taskId));

      if (error) throw error;

      logger.info('Tarefa atualizada', { taskId });
      return true;
    } catch (error) {
      logger.error('updateTask falhou', { taskId }, error as Error);
      return false;
    }
  }

  /**
   * Deleta uma tarefa
   */
  static async deleteTask(taskId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      logger.info('Tarefa deletada', { taskId });
      return true;
    } catch (error) {
      logger.error('deleteTask falhou', { taskId }, error as Error);
      return false;
    }
  }

  /**
   * Remove todas as tarefas do sistema (para limpeza durante desenvolvimento)
   */
  static async clearAllTasks(): Promise<void> {
    try {
      // Delete em paralelo
      await Promise.all([
        supabase.from('user_tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('task_control').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ]);

      logger.info('Todas as tarefas foram removidas');
    } catch (error) {
      logger.error('clearAllTasks falhou', {}, error as Error);
      throw error;
    }
  }

  /**
   * Map Supabase record to UserTask type
   */
  private static mapSupabaseToUserTask(record: any): UserTask {
    return {
      id: record.id,
      userId: record.user_id,
      estudanteId: record.student_id,
      studentName: record.student_name,
      studentClass: record.student_class,
      taskType: record.task_type,
      bimestre: record.bimestre,
      status: record.status,
      frequencyPercentage: parseFloat(record.frequency_percentage),
      absencesCount: record.absences_count,
      isPCD: record.is_pcd,
      priority: record.priority,
      recommendedAction: record.recommended_action,
      createdBy: record.created_by,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      completedAt: record.completed_at,
      interactionId: record.interaction_id,
      deleted: record.deleted,
      deletedAt: record.deleted_at,
      deletedBy: record.deleted_by
    };
  }
}
