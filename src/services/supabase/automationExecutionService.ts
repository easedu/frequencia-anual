/**
 * Supabase Service: Automation Executions
 *
 * Gerencia execuções de automação (logs/auditoria).
 * Substitui: Firebase Admin collection 'automationExecutions'
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logger } from '@/utils/logger';

/**
 * Row type for automation_executions table
 */
interface AutomationExecutionRow {
  id: string;
  automation_type: string;
  execution_status: string;
  message: string | null;
  metadata: Record<string, unknown>;
  executed_at: string;
}

/**
 * Insert type for automation_executions table
 */
interface AutomationExecutionInsert {
  automation_type: string;
  execution_status: string;
  message: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Update type for automation_executions table
 */
interface AutomationExecutionUpdate {
  automation_type?: string;
  execution_status?: string;
  message?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Status possíveis de execução
 */
export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

/**
 * Metadata structure for automation executions
 */
interface AutomationMetadata extends Record<string, unknown> {
  startedAt?: number;
  finishedAt?: number;
  lastCheckpointAt?: number;
  dryRun?: boolean;
  absenceMultiple?: number;
  notificationPhone?: string;
  referenceMonth?: number;
  referenceYear?: number;
  totalStudents?: number;
  processedStudents?: number;
  currentStudentIndex?: number;
  processedStudentIds?: string[];
  messagesSucceeded?: number;
  messagesFailed?: number;
  tasksCreated?: number;
  errors?: Array<{
    estudanteId: string;
    estudanteNome: string;
    error: string;
  }>;
}

/**
 * Interface da execução (Aplicação)
 *
 * Mapeada da tabela automation_executions do Supabase
 */
export interface AutomationExecution {
  id: string;
  automationType: string;
  executionStatus: string;
  message: string | null;
  metadata: AutomationMetadata;
  executedAt: string;

  // Computed properties for convenience (accessed from metadata)
  status?: string;
  updatedAt?: string;
  createdAt?: string;
  startedAt?: number;
  dryRun?: boolean;
  absenceMultiple?: number;
  notificationPhone?: string;
  totalStudents?: number;
  processedStudents?: number;
  processedStudentIds?: string[];
}

/**
 * Dados para criar nova execução
 */
export interface CreateExecutionData {
  automationType: string;
  executionStatus?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export class AutomationExecutionService {
  /**
   * Converter registro do Supabase para AutomationExecution
   */
  private static mapRowToExecution(row: AutomationExecutionRow): AutomationExecution {
    const metadata = row.metadata as AutomationMetadata;

    return {
      id: row.id,
      automationType: row.automation_type,
      executionStatus: row.execution_status,
      message: row.message,
      metadata,
      executedAt: row.executed_at,

      // Map convenience properties from metadata and table fields
      status: row.execution_status,
      updatedAt: row.executed_at, // Supabase uses executed_at as the timestamp
      createdAt: row.executed_at,
      startedAt: metadata.startedAt,
      dryRun: metadata.dryRun,
      absenceMultiple: metadata.absenceMultiple,
      notificationPhone: metadata.notificationPhone,
      totalStudents: metadata.totalStudents,
      processedStudents: metadata.processedStudents,
      processedStudentIds: metadata.processedStudentIds,
    };
  }

  /**
   * Criar nova execução de automação
   */
  static async createExecution(data: CreateExecutionData): Promise<AutomationExecution> {
    try {
      const insertData: AutomationExecutionInsert = {
        automation_type: data.automationType,
        execution_status: data.executionStatus || 'PENDING',
        message: data.message || null,
        metadata: data.metadata || {},
      };

      const result = await supabaseAdmin
        .from('automation_executions')
        .insert(insertData as never)
        .select()
        .single();

      const { data: execution, error } = result as { data: AutomationExecutionRow | null; error: unknown };

      if (error) throw error;
      if (!execution) throw new Error('Failed to create execution');

      return this.mapRowToExecution(execution);
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
      const result = await supabaseAdmin
        .from('automation_executions')
        .select('*')
        .eq('id', executionId)
        .maybeSingle();

      const { data, error } = result as { data: AutomationExecutionRow | null; error: { code?: string } | null };

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data ? this.mapRowToExecution(data) : null;
    } catch (error) {
      logger.error('Erro ao buscar execução por ID', { executionId }, error as Error);
      return null;
    }
  }

  /**
   * Atualizar status da execução
   */
  static async updateStatus(executionId: string, status: string): Promise<boolean> {
    try {
      const updateData: AutomationExecutionUpdate = {
        execution_status: status,
      };

      const result = await supabaseAdmin
        .from('automation_executions')
        .update(updateData as never)
        .eq('id', executionId);

      const { error } = result as { error: unknown };

      if (error) throw error;

      return true;
    } catch (error) {
      logger.error('Erro ao atualizar status da execução', { executionId, status }, error as Error);
      return false;
    }
  }

  /**
   * Atualizar metadata da execução
   */
  static async updateMetadata(
    executionId: string,
    metadata: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const updateData: AutomationExecutionUpdate = {
        metadata,
      };

      const result = await supabaseAdmin
        .from('automation_executions')
        .update(updateData as never)
        .eq('id', executionId);

      const { error } = result as { error: unknown };

      if (error) throw error;

      logger.debug('Metadata atualizado no Supabase', {
        executionId,
      });

      return true;
    } catch (error) {
      logger.error('Erro ao atualizar metadata', { executionId }, error as Error);
      return false;
    }
  }

  /**
   * Atualizar mensagem e status para erro
   */
  static async updateError(executionId: string, errorMessage: string): Promise<boolean> {
    try {
      const updateData: AutomationExecutionUpdate = {
        execution_status: 'FAILED',
        message: errorMessage,
      };

      const result = await supabaseAdmin
        .from('automation_executions')
        .update(updateData as never)
        .eq('id', executionId);

      const { error } = result as { error: unknown };

      if (error) throw error;

      logger.error('Execução marcada como FAILED no Supabase', {
        executionId,
        errorMessage,
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
      const result = await supabaseAdmin
        .from('automation_executions')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(limit);

      const { data, error } = result as { data: AutomationExecutionRow[] | null; error: unknown };

      if (error) throw error;

      return (data || []).map((item) => this.mapRowToExecution(item));
    } catch (error) {
      logger.error('Erro ao buscar execuções recentes', {}, error as Error);
      return [];
    }
  }

  /**
   * Buscar execuções por status
   */
  static async getExecutionsByStatus(status: string): Promise<AutomationExecution[]> {
    try {
      const result = await supabaseAdmin
        .from('automation_executions')
        .select('*')
        .eq('execution_status', status)
        .order('executed_at', { ascending: false });

      const { data, error } = result as { data: AutomationExecutionRow[] | null; error: unknown };

      if (error) throw error;

      return (data || []).map((item) => this.mapRowToExecution(item));
    } catch (error) {
      logger.error('Erro ao buscar execuções por status', { status }, error as Error);
      return [];
    }
  }

  /**
   * Buscar execuções por tipo de automação
   */
  static async getExecutionsByType(automationType: string): Promise<AutomationExecution[]> {
    try {
      const result = await supabaseAdmin
        .from('automation_executions')
        .select('*')
        .eq('automation_type', automationType)
        .order('executed_at', { ascending: false });

      const { data, error } = result as { data: AutomationExecutionRow[] | null; error: unknown };

      if (error) throw error;

      return (data || []).map((item) => this.mapRowToExecution(item));
    } catch (error) {
      logger.error('Erro ao buscar execuções por tipo', { automationType }, error as Error);
      return [];
    }
  }

  /**
   * Deletar execuções antigas (limpeza)
   */
  static async deleteOldExecutions(daysOld: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await supabaseAdmin
        .from('automation_executions')
        .delete()
        .lt('executed_at', cutoffDate.toISOString())
        .select('id');

      const { data, error } = result as { data: Array<{ id: string }> | null; error: unknown };

      if (error) throw error;

      const deletedCount = data?.length || 0;

      logger.info('Execuções antigas deletadas do Supabase', {
        daysOld,
        deletedCount,
      });

      return deletedCount;
    } catch (error) {
      logger.error('Erro ao deletar execuções antigas', { daysOld }, error as Error);
      return 0;
    }
  }

  /**
   * Buscar última execução com status RUNNING
   */
  static async getLastRunningExecution(): Promise<AutomationExecution | null> {
    try {
      const result = await supabaseAdmin
        .from('automation_executions')
        .select('*')
        .eq('execution_status', 'RUNNING')
        .order('executed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data, error } = result as { data: AutomationExecutionRow | null; error: { code?: string } | null };

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data ? this.mapRowToExecution(data) : null;
    } catch (error) {
      logger.error('Erro ao buscar última execução RUNNING', {}, error as Error);
      return null;
    }
  }

  /**
   * Atualizar checkpoint da execução (progresso incremental)
   * Usado para permitir retomada após falhas
   */
  static async updateCheckpoint(
    executionId: string,
    checkpoint: {
      processedStudents: number;
      currentStudentIndex: number;
      processedStudentIds: string[];
      results?: Record<string, unknown>;
    }
  ): Promise<boolean> {
    try {
      // Buscar metadata atual
      const execution = await this.getExecutionById(executionId);

      if (!execution) {
        logger.error('Execução não encontrada para atualizar checkpoint', { executionId });
        return false;
      }

      // Mesclar checkpoint com metadata existente
      const updatedMetadata = {
        ...execution.metadata,
        checkpoint: {
          processedStudents: checkpoint.processedStudents,
          currentStudentIndex: checkpoint.currentStudentIndex,
          processedStudentIds: checkpoint.processedStudentIds,
          lastUpdated: new Date().toISOString(),
        },
        ...(checkpoint.results && { results: checkpoint.results }),
      };

      const updateData: AutomationExecutionUpdate = {
        metadata: updatedMetadata,
      };

      const result = await supabaseAdmin
        .from('automation_executions')
        .update(updateData as never)
        .eq('id', executionId);

      const { error } = result as { error: unknown };

      if (error) throw error;

      logger.debug('Checkpoint atualizado no Supabase', {
        executionId,
        processedStudents: checkpoint.processedStudents,
      });

      return true;
    } catch (error) {
      logger.error('Erro ao atualizar checkpoint', { executionId }, error as Error);
      return false;
    }
  }
}
