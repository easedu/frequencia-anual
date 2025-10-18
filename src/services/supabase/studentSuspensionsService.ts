/**
 * API Service: Student Suspensions
 *
 * @deprecated Use hooks from @/hooks/api/useSuspensions instead
 *
 * Este service está sendo gradualmente substituído por hooks da API REST.
 * Para componentes React, use:
 * - useSuspensions() - Listar suspensões
 * - useCreateSuspension() - Criar suspensão
 * - useUpdateSuspension() - Atualizar suspensão
 * - useDeleteSuspension() - Deletar suspensão
 *
 * Gerencia suspensões disciplinares dos estudantes.
 * Refatorado para usar /api/suspensions (Sprint 2)
 */

import { logger } from '@/utils/logger';
import { getAuthHeaders } from '@/utils/authToken';

export type SuspensionSeverity = 'LEVE' | 'MODERADA' | 'GRAVE';

/**
 * Interface da suspensão (API - snake_case)
 */
interface ApiSuspension {
  id: string;
  student_id: string;
  start_date: string;
  end_date: string;
  days_suspended: number;
  reason: string;
  description: string | null;
  severity: SuspensionSeverity | null;
  decision_by: string;
  decision_date: string;
  document_number: string | null;
  family_notified: boolean;
  notification_date: string | null;
  notification_method: string | null;
  parent_signature: boolean;
  follow_up_notes: string | null;
  reintegration_date: string | null;
  reintegration_status: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Interface da suspensão (Aplicação - camelCase)
 */
export interface StudentSuspension {
  id: string;
  studentId: string;
  startDate: string;
  endDate: string;
  daysSuspended: number;
  reason: string;
  description?: string;
  severity?: SuspensionSeverity;
  decisionBy: string;
  decisionDate: string;
  documentNumber?: string;
  familyNotified: boolean;
  notificationDate?: string;
  notificationMethod?: string;
  parentSignature: boolean;
  followUpNotes?: string;
  reintegrationDate?: string;
  reintegrationStatus?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dados para criar suspensão
 */
export interface CreateSuspensionData {
  studentId: string;
  startDate: string;
  endDate: string;
  reason: string;
  description?: string;
  severity?: SuspensionSeverity;
  decisionBy: string;
  decisionDate: string;
  documentNumber?: string;
  familyNotified?: boolean;
  notificationDate?: string;
  notificationMethod?: string;
  createdBy: string;
}

export class StudentSuspensionsService {
  /**
   * Converter registro da API (snake_case) para aplicação (camelCase)
   */
  private static mapApiToSuspension(record: ApiSuspension): StudentSuspension {
    return {
      id: record.id,
      studentId: record.student_id,
      startDate: record.start_date,
      endDate: record.end_date,
      daysSuspended: record.days_suspended,
      reason: record.reason,
      description: record.description || undefined,
      severity: record.severity || undefined,
      decisionBy: record.decision_by,
      decisionDate: record.decision_date,
      documentNumber: record.document_number || undefined,
      familyNotified: record.family_notified,
      notificationDate: record.notification_date || undefined,
      notificationMethod: record.notification_method || undefined,
      parentSignature: record.parent_signature,
      followUpNotes: record.follow_up_notes || undefined,
      reintegrationDate: record.reintegration_date || undefined,
      reintegrationStatus: record.reintegration_status || undefined,
      createdBy: record.created_by,
      updatedBy: record.updated_by || undefined,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  /**
   * Buscar suspensões de um estudante via API
   *
   * @param studentId - Firebase UUID (student.student_id)
   * @returns Array de suspensões
   */
  static async getByStudentId(studentId: string): Promise<StudentSuspension[]> {
    try {
      // ✅ Usar API REST com autenticação (UUID resolvido no backend)
      const headers = await getAuthHeaders();

      const response = await fetch(`/api/suspensions?estudanteId=${studentId}`, {
        headers,
      });

      if (!response.ok) {
        // Tentar ler o corpo da resposta para mais detalhes
        const errorBody = await response.json().catch(() => ({}));

        // Log do erro mas retorna array vazio (dados auxiliares)
        logger.warn('Falha ao buscar suspensões do estudante', {
          studentId,
          status: response.status,
          statusText: response.statusText,
          error: errorBody.error || errorBody.message || 'Erro desconhecido'
        });
        return [];
      }

      const result = await response.json();

      // ✅ A API pode retornar tanto paginatedResponse quanto successResponse
      // paginatedResponse: { data: [], pagination: {...} }
      // successResponse: { success: true, data: [] }

      // Se tem campo 'success' e é false, logar erro
      if ('success' in result && !result.success) {
        logger.warn('API retornou erro ao buscar suspensões', {
          studentId,
          message: result.message || result.error || 'Erro desconhecido',
          fullResponse: result
        });
        return [];
      }

      // Retornar dados (funciona para ambos os formatos)
      return (result.data || []).map(this.mapApiToSuspension);
    } catch (error) {
      // Log como warn ao invés de error (falha em dados auxiliares não deve bloquear a tela)
      logger.warn('Erro ao buscar suspensões do estudante', { studentId }, error as Error);
      return [];
    }
  }

  /**
   * Buscar suspensão por ID via API
   */
  static async getById(suspensionId: string): Promise<StudentSuspension | null> {
    try {
      const response = await fetch(`/api/suspensions/${suspensionId}`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();
      return this.mapApiToSuspension(result.data);
    } catch (error) {
      logger.error('Erro ao buscar suspensão', { suspensionId }, error as Error);
      return null;
    }
  }

  /**
   * Criar nova suspensão via API
   *
   * @param data - Dados da suspensão (studentId é Firebase UUID)
   * @returns Suspensão criada ou null se houver erro
   */
  static async create(data: CreateSuspensionData): Promise<StudentSuspension | null> {
    try {
      // ✅ Usar API REST com autenticação (UUID resolvido no backend)
      const headers = await getAuthHeaders();

      // ✅ Converter datas de YYYY-MM-DD para DDMMYYYY se necessário
      const convertDateFormat = (date: string): string => {
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = date.split('-');
          return `${day}${month}${year}`;
        }
        return date;
      };

      const response = await fetch('/api/suspensions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          estudanteId: data.studentId, // Firebase UUID (a API resolve internamente)
          dataInicio: convertDateFormat(data.startDate),
          dataFim: convertDateFormat(data.endDate),
          motivo: data.reason,
          observacoes: data.description || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`API returned ${response.status}: ${errorData.error || 'Failed to create'}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Erro ao criar suspensão');
      }

      logger.info('Suspensão criada via API', { studentId: data.studentId });

      // Buscar suspensão criada para retornar completa
      return await this.getById(result.data.id);
    } catch (error) {
      logger.error('Erro ao criar suspensão', data, error as Error);
      throw error;
    }
  }

  /**
   * Atualizar suspensão via API
   */
  static async update(
    suspensionId: string,
    updates: Partial<CreateSuspensionData>
  ): Promise<boolean> {
    try {
      // ✅ Converter datas de YYYY-MM-DD para DDMMYYYY se necessário
      const convertDateFormat = (date: string): string => {
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = date.split('-');
          return `${day}${month}${year}`;
        }
        return date;
      };

      const apiUpdates: any = {};

      if (updates.startDate) apiUpdates.startDate = convertDateFormat(updates.startDate);
      if (updates.endDate) apiUpdates.endDate = convertDateFormat(updates.endDate);
      if (updates.reason) apiUpdates.reason = updates.reason;
      if (updates.description !== undefined)
        apiUpdates.description = updates.description || null;
      if (updates.severity) apiUpdates.severity = updates.severity;
      if (updates.decisionBy) apiUpdates.decisionBy = updates.decisionBy;
      if (updates.decisionDate) apiUpdates.decisionDate = convertDateFormat(updates.decisionDate);
      if (updates.documentNumber !== undefined)
        apiUpdates.documentNumber = updates.documentNumber || null;
      if (updates.familyNotified !== undefined)
        apiUpdates.familyNotified = updates.familyNotified;
      if (updates.notificationDate !== undefined)
        apiUpdates.notificationDate = updates.notificationDate ? convertDateFormat(updates.notificationDate) : null;
      if (updates.notificationMethod !== undefined)
        apiUpdates.notificationMethod = updates.notificationMethod || null;

      const response = await fetch(`/api/suspensions/${suspensionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiUpdates),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      logger.info('Suspensão atualizada via API', { suspensionId });
      return true;
    } catch (error) {
      logger.error('Erro ao atualizar suspensão', { suspensionId }, error as Error);
      return false;
    }
  }

  /**
   * Registrar reintegração do estudante via API
   */
  static async recordReintegration(
    suspensionId: string,
    reintegrationDate: string,
    status: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/suspensions/${suspensionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reintegrationDate,
          reintegrationStatus: status,
          followUpNotes: notes || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      logger.info('Reintegração registrada via API', { suspensionId });
      return true;
    } catch (error) {
      logger.error('Erro ao registrar reintegração', { suspensionId }, error as Error);
      return false;
    }
  }

  /**
   * Deletar suspensão via API
   */
  static async delete(suspensionId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/suspensions/${suspensionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      logger.info('Suspensão deletada via API', { suspensionId });
      return true;
    } catch (error) {
      logger.error('Erro ao deletar suspensão', { suspensionId }, error as Error);
      return false;
    }
  }

  /**
   * Buscar suspensões ativas via API
   */
  static async getActiveSuspensions(): Promise<StudentSuspension[]> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const response = await fetch(`/api/suspensions?active=true&date=${today}`);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();
      return (result.data || []).map(this.mapApiToSuspension);
    } catch (error) {
      logger.error('Erro ao buscar suspensões ativas', {}, error as Error);
      return [];
    }
  }
}
