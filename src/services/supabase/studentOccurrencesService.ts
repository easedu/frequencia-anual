/**
 * Supabase Service: Student Occurrences
 *
 * Gerencia ocorrências disciplinares dos estudantes.
 * Substitui: collection(db, '2025', 'occurrences', studentId)
 */

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';

export type OccurrenceSeverity = 'LEVE' | 'MODERADA' | 'GRAVE';

/**
 * Interface da ocorrência (Supabase)
 */
interface SupabaseOccurrence {
  id: string;
  student_id: string;
  occurrence_date: string;
  occurrence_type: string;
  description: string;
  severity: OccurrenceSeverity | null;
  action_taken: string | null;
  responsible_staff: string | null;
  family_notified: boolean;
  notification_date: string | null;
  notification_method: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

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

export class StudentOccurrencesService {
  /**
   * Converter registro do Supabase
   */
  private static mapSupabaseToOccurrence(record: SupabaseOccurrence): StudentOccurrence {
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
      createdBy: record.created_by,
      updatedBy: record.updated_by || undefined,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  /**
   * Converter para formato Supabase
   */
  private static mapOccurrenceToSupabase(
    data: CreateOccurrenceData
  ): Partial<SupabaseOccurrence> {
    return {
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
  }

  /**
   * Buscar ocorrências de um estudante
   */
  static async getByStudentId(studentId: string): Promise<StudentOccurrence[]> {
    try {
      const { data, error } = await supabase
        .from('student_occurrences')
        .select('*')
        .eq('student_id', studentId)
        .order('occurrence_date', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.mapSupabaseToOccurrence);
    } catch (error) {
      logger.error('Erro ao buscar ocorrências do estudante', { studentId }, error as Error);
      return [];
    }
  }

  /**
   * Criar nova ocorrência
   */
  static async create(data: CreateOccurrenceData): Promise<StudentOccurrence | null> {
    try {
      const supabaseData = this.mapOccurrenceToSupabase(data);

      const { data: result, error } = await (supabase
        .from('student_occurrences') as any)
        .insert(supabaseData)
        .select()
        .single();

      if (error) throw error;

      logger.info('Ocorrência criada no Supabase', {
        studentId: data.studentId,
        type: data.occurrenceType,
      });

      return this.mapSupabaseToOccurrence(result);
    } catch (error) {
      logger.error('Erro ao criar ocorrência', data, error as Error);
      throw error;
    }
  }

  /**
   * Atualizar ocorrência
   */
  static async update(
    occurrenceId: string,
    updates: Partial<CreateOccurrenceData>
  ): Promise<boolean> {
    try {
      const supabaseUpdates: any = {};

      if (updates.occurrenceDate) supabaseUpdates.occurrence_date = updates.occurrenceDate;
      if (updates.occurrenceType) supabaseUpdates.occurrence_type = updates.occurrenceType;
      if (updates.description) supabaseUpdates.description = updates.description;
      if (updates.severity) supabaseUpdates.severity = updates.severity;
      if (updates.actionTaken !== undefined)
        supabaseUpdates.action_taken = updates.actionTaken || null;
      if (updates.responsibleStaff !== undefined)
        supabaseUpdates.responsible_staff = updates.responsibleStaff || null;
      if (updates.familyNotified !== undefined)
        supabaseUpdates.family_notified = updates.familyNotified;
      if (updates.notificationDate !== undefined)
        supabaseUpdates.notification_date = updates.notificationDate || null;
      if (updates.notificationMethod !== undefined)
        supabaseUpdates.notification_method = updates.notificationMethod || null;

      const { error } = await (supabase.from('student_occurrences') as any)
        .update(supabaseUpdates)
        .eq('id', occurrenceId);

      if (error) throw error;

      logger.info('Ocorrência atualizada no Supabase', { occurrenceId });

      return true;
    } catch (error) {
      logger.error('Erro ao atualizar ocorrência', { occurrenceId }, error as Error);
      return false;
    }
  }

  /**
   * Deletar ocorrência
   */
  static async delete(occurrenceId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('student_occurrences')
        .delete()
        .eq('id', occurrenceId);

      if (error) throw error;

      logger.info('Ocorrência deletada do Supabase', { occurrenceId });

      return true;
    } catch (error) {
      logger.error('Erro ao deletar ocorrência', { occurrenceId }, error as Error);
      return false;
    }
  }

  /**
   * Buscar ocorrências por gravidade
   */
  static async getBySeverity(severity: OccurrenceSeverity): Promise<StudentOccurrence[]> {
    try {
      const { data, error } = await supabase
        .from('student_occurrences')
        .select('*')
        .eq('severity', severity)
        .order('occurrence_date', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.mapSupabaseToOccurrence);
    } catch (error) {
      logger.error('Erro ao buscar ocorrências por gravidade', { severity }, error as Error);
      return [];
    }
  }
}
