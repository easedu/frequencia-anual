/**
 * API Service: Student Occurrences
 *
 * @deprecated Use hooks from @/hooks/api/useOccurrences instead
 *
 * Este service está sendo gradualmente substituído por hooks da API REST.
 * Para componentes React, use:
 * - useOccurrences() - Listar ocorrências
 * - useCreateOccurrence() - Criar ocorrência
 * - useUpdateOccurrence() - Atualizar ocorrência
 * - useDeleteOccurrence() - Deletar ocorrência
 *
 * Gerencia ocorrências disciplinares dos estudantes.
 * Refatorado para usar /api/occurrences (Sprint 2)
 */

import { logger } from '@/utils/logger';

export type OccurrenceSeverity = 'LEVE' | 'MODERADA' | 'GRAVE';

/**
 * Interface da ocorrência (Aplicação)
 */
export interface StudentOccurrence {
  id: string;
  studentId: string;
  occurrenceDate: string;
  occurrenceType: string;
  description: string;
  severity?: OccurrenceSeverity;
  actionTaken?: string;
  responsibleStaff?: string;
  familyNotified: boolean;
  notificationDate?: string;
  notificationMethod?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dados para criar ocorrência
 */
export interface CreateOccurrenceData {
  studentId: string;
  occurrenceDate: string;
  occurrenceType: string;
  description: string;
  severity?: OccurrenceSeverity;
  actionTaken?: string;
  responsibleStaff?: string;
  familyNotified?: boolean;
  notificationDate?: string;
  notificationMethod?: string;
  createdBy: string;
}

interface ApiOccurrence {
  id: string;
  student_id: string;
  occurrence_date: string;
  occurrence_type: string;
  description: string;
  severity?: OccurrenceSeverity;
  action_taken?: string;
  responsible_staff?: string;
  family_notified: boolean;
  notification_date?: string;
  notification_method?: string;
  reported_by_name?: string;
  reported_by?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export class StudentOccurrencesService {
  /**
   * Converter registro da API (snake_case) para aplicação (camelCase)
   */
  private static mapApiToOccurrence(record: ApiOccurrence): StudentOccurrence {
    return this.mapApiToOccurrenceInternal(record);
  }

  private static mapApiToOccurrenceInternal(record: ApiOccurrence): StudentOccurrence {
    return {
      id: record.id,
      studentId: record.student_id,
      occurrenceDate: record.occurrence_date,
      occurrenceType: record.occurrence_type,
      description: record.description,
      severity: record.severity || undefined,
      actionTaken: record.action_taken || undefined,
      responsibleStaff: record.responsible_staff || undefined,
      familyNotified: record.family_notified,
      notificationDate: record.notification_date || undefined,
      notificationMethod: record.notification_method || undefined,
      // Buscar nome do usuário via JOIN (reported_by_name)
      createdBy: record.reported_by_name || record.reported_by || record.created_by || 'Desconhecido',
      updatedBy: record.updated_by || undefined,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  /**
   * Buscar ocorrências de um estudante via API
   */
  static async getByStudentId(studentId: string): Promise<StudentOccurrence[]> {
    try {
      const response = await fetch(`/api/occurrences?student_id=${studentId}`);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();
      return (result.data?.data || []).map(this.mapApiToOccurrence);
    } catch (err) {
      logger.error('Erro ao buscar ocorrências do estudante', { studentId }, err as Error);
      return [];
    }
  }

  /**
   * Criar nova ocorrência via API
   */
  static async create(data: CreateOccurrenceData): Promise<StudentOccurrence | null> {
    try {
      const apiPayload: Record<string, string | boolean | OccurrenceSeverity | null> = {
        student_id: data.studentId,
        occurrence_date: data.occurrenceDate,
        occurrence_type: data.occurrenceType,
        description: data.description,
        severity: data.severity || null,
        action_taken: data.actionTaken || null,
        responsible_staff: data.responsibleStaff || null,
        family_notified: data.familyNotified || false,
        notification_date: data.notificationDate || null,
        notification_method: data.notificationMethod || null,
        created_by: data.createdBy,
      };

      const response = await fetch('/api/occurrences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`API returned ${response.status}: ${errorData.error || 'Failed to create'}`);
      }

      const result = await response.json();

      return this.mapApiToOccurrenceInternal(result.data);
    } catch (err) {
      logger.error('Erro ao criar ocorrência', { studentId: data.studentId }, err as Error);
      throw err;
    }
  }

  /**
   * Atualizar ocorrência via API
   */
  static async update(
    occurrenceId: string,
    updates: Partial<CreateOccurrenceData>
  ): Promise<boolean> {
    try {
      interface ApiUpdateData {
        occurrence_date?: string;
        occurrence_type?: string;
        description?: string;
        severity?: OccurrenceSeverity;
        action_taken?: string | null;
        responsible_staff?: string | null;
        family_notified?: boolean;
        notification_date?: string | null;
        notification_method?: string | null;
      }

      const apiUpdates: ApiUpdateData = {};

      if (updates.occurrenceDate) apiUpdates.occurrence_date = updates.occurrenceDate;
      if (updates.occurrenceType) apiUpdates.occurrence_type = updates.occurrenceType;
      if (updates.description) apiUpdates.description = updates.description;
      if (updates.severity) apiUpdates.severity = updates.severity;
      if (updates.actionTaken !== undefined)
        apiUpdates.action_taken = updates.actionTaken || null;
      if (updates.responsibleStaff !== undefined)
        apiUpdates.responsible_staff = updates.responsibleStaff || null;
      if (updates.familyNotified !== undefined)
        apiUpdates.family_notified = updates.familyNotified;
      if (updates.notificationDate !== undefined)
        apiUpdates.notification_date = updates.notificationDate || null;
      if (updates.notificationMethod !== undefined)
        apiUpdates.notification_method = updates.notificationMethod || null;

      const response = await fetch(`/api/occurrences/${occurrenceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiUpdates),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      return true;
    } catch (err) {
      logger.error('Erro ao atualizar ocorrência', { occurrenceId }, err as Error);
      return false;
    }
  }

  /**
   * Deletar ocorrência via API
   */
  static async delete(occurrenceId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/occurrences/${occurrenceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      return true;
    } catch (err) {
      logger.error('Erro ao deletar ocorrência', { occurrenceId }, err as Error);
      return false;
    }
  }

  /**
   * Buscar ocorrências por gravidade via API
   */
  static async getBySeverity(severity: OccurrenceSeverity): Promise<StudentOccurrence[]> {
    try {
      const response = await fetch(`/api/occurrences?severity=${severity}`);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();
      return (result.data?.data || []).map(this.mapApiToOccurrence);
    } catch (err) {
      logger.error('Erro ao buscar ocorrências por gravidade', { severity }, err as Error);
      return [];
    }
  }
}
