/**
 * Supabase Service: Automation Executions
 *
 * Gerencia execuções de automação (logs/auditoria).
 * Substitui: Firebase Admin collection 'automationExecutions'
 */

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';

/**
 * Status possíveis de execução
 */
export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

/**
 * Interface da execução (Supabase)
 */
interface SupabaseAutomationExecution {
  id: string;
  status: ExecutionStatus;
  total_students: number;
  processed_students: number;
  current_student_index: number;
  processed_student_ids: string[];
  students_data: any; // JSONB
  results: any; // JSONB
  error_message: string | null;
  dry_run: boolean;
  absence_multiple: number | null;
  notification_phone: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Interface da execução (Aplicação)
 */
export interface AutomationExecution {
  id: string;
  status: ExecutionStatus;
  totalStudents: number;
  processedStudents: number;
  currentStudentIndex: number;
  processedStudentIds: string[];
  studentsData: any;
  results: any;
  errorMessage?: string;
  dryRun: boolean;
  absenceMultiple?: number;
  notificationPhone?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dados para criar nova execução
 */
export interface CreateExecutionData {
  totalStudents: number;
  studentsData: any;
  dryRun: boolean;
  absenceMultiple?: number;
  notificationPhone?: string;
}

/**
 * Dados para atualizar checkpoint
 */
export interface UpdateCheckpointData {
  processedStudents: number;
  currentStudentIndex: number;
  processedStudentIds: string[];
  results: any;
}

export class AutomationExecutionService {
  /**
   * Converter registro do Supabase para AutomationExecution
   */
  private static mapSupabaseToExecution(record: SupabaseAutomationExecution): AutomationExecution {
    return {
      id: record.id,
      status: record.status,
      totalStudents: record.total_students,
      processedStudents: record.processed_students,
      currentStudentIndex: record.current_student_index,
      processedStudentIds: record.processed_student_ids,
      studentsData: record.students_data,
      results: record.results,
      errorMessage: record.error_message || undefined,
      dryRun: record.dry_run,
      absenceMultiple: record.absence_multiple || undefined,
      notificationPhone: record.notification_phone || undefined,
      startedAt: record.started_at || undefined,
      completedAt: record.completed_at || undefined,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  /**
   * Criar nova execução de automação
   */
  static async createExecution(data: CreateExecutionData): Promise<AutomationExecution> {
    try {
      const insertData = {
        status: 'PENDING' as ExecutionStatus,
        total_students: data.totalStudents,
        processed_students: 0,
        current_student_index: 0,
        processed_student_ids: [],
        students_data: data.studentsData,
        results: {},
        dry_run: data.dryRun,
        absence_multiple: data.absenceMultiple || null,
        notification_phone: data.notificationPhone || null,
      };

      const { data: execution, error } = await ((supabase
        .from('automation_executions') as any)
        .insert(insertData)
        .select()
        .single());

      if (error) throw error;

      logger.info('Execução de automação criada no Supabase', {
        executionId: execution.id,
        dryRun: data.dryRun,
        totalStudents: data.totalStudents
      });

      return this.mapSupabaseToExecution(execution);
    } catch (error) {
      logger.error('Erro ao criar execução de automação', {}, error as Error);
      throw error;
    }
  }

  /**
   * Buscar execução por ID
   */
  static async getExecutionById(executionId: string): Promise<AutomationExecution | null> {
    try {
      const { data, error } = await supabase
        .from('automation_executions')
        .select('*')
        .eq('id', executionId)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data ? this.mapSupabaseToExecution(data) : null;
    } catch (error) {
      logger.error('Erro ao buscar execução por ID', { executionId }, error as Error);
      return null;
    }
  }

  /**
   * Atualizar status da execução
   */
  static async updateStatus(executionId: string, status: ExecutionStatus): Promise<boolean> {
    try {
      const updateData: any = { status };

      if (status === 'RUNNING') {
        updateData.started_at = new Date().toISOString();
      } else if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await (supabase
        .from('automation_executions') as any)
        .update(updateData)
        .eq('id', executionId);

      if (error) throw error;

      logger.info('Status da execução atualizado no Supabase', {
        executionId,
        status
      });

      return true;
    } catch (error) {
      logger.error('Erro ao atualizar status da execução', { executionId, status }, error as Error);
      return false;
    }
  }

  /**
   * Atualizar checkpoint (progresso)
   */
  static async updateCheckpoint(
    executionId: string,
    checkpoint: UpdateCheckpointData
  ): Promise<boolean> {
    try {
      const { error } = await (supabase
        .from('automation_executions') as any)
        .update({
          processed_students: checkpoint.processedStudents,
          current_student_index: checkpoint.currentStudentIndex,
          processed_student_ids: checkpoint.processedStudentIds,
          results: checkpoint.results,
        })
        .eq('id', executionId);

      if (error) throw error;

      logger.debug('Checkpoint atualizado no Supabase', {
        executionId,
        processedStudents: checkpoint.processedStudents
      });

      return true;
    } catch (error) {
      logger.error('Erro ao atualizar checkpoint', { executionId }, error as Error);
      return false;
    }
  }

  /**
   * Atualizar mensagem de erro
   */
  static async updateError(executionId: string, errorMessage: string): Promise<boolean> {
    try {
      const { error } = await (supabase
        .from('automation_executions') as any)
        .update({
          status: 'FAILED' as ExecutionStatus,
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', executionId);

      if (error) throw error;

      logger.error('Execução marcada como FAILED no Supabase', {
        executionId,
        errorMessage
      });

      return true;
    } catch (error) {
      logger.error('Erro ao atualizar erro da execução', { executionId }, error as Error);
      return false;
    }
  }

  /**
   * Buscar execuções recentes
   */
  static async getRecentExecutions(limit: number = 10): Promise<AutomationExecution[]> {
    try {
      const { data, error } = await supabase
        .from('automation_executions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(this.mapSupabaseToExecution);
    } catch (error) {
      logger.error('Erro ao buscar execuções recentes', {}, error as Error);
      return [];
    }
  }

  /**
   * Buscar execuções por status
   */
  static async getExecutionsByStatus(status: ExecutionStatus): Promise<AutomationExecution[]> {
    try {
      const { data, error } = await supabase
        .from('automation_executions')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.mapSupabaseToExecution);
    } catch (error) {
      logger.error('Erro ao buscar execuções por status', { status }, error as Error);
      return [];
    }
  }

  /**
   * Buscar última execução RUNNING (para watchdog)
   */
  static async getLastRunningExecution(): Promise<AutomationExecution | null> {
    try {
      const { data, error } = await supabase
        .from('automation_executions')
        .select('*')
        .eq('status', 'RUNNING')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data ? this.mapSupabaseToExecution(data) : null;
    } catch (error) {
      logger.error('Erro ao buscar última execução RUNNING', {}, error as Error);
      return null;
    }
  }

  /**
   * Deletar execuções antigas (limpeza)
   */
  static async deleteOldExecutions(daysOld: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await ((supabase
        .from('automation_executions') as any)
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id'));

      if (error) throw error;

      const deletedCount = data?.length || 0;

      logger.info('Execuções antigas deletadas do Supabase', {
        daysOld,
        deletedCount
      });

      return deletedCount;
    } catch (error) {
      logger.error('Erro ao deletar execuções antigas', { daysOld }, error as Error);
      return 0;
    }
  }
}
