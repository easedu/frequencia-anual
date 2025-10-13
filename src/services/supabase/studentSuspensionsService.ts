/**
 * Supabase Service: Student Suspensions
 *
 * Gerencia suspensões disciplinares dos estudantes.
 * Substitui: collection(db, 'students', studentId, 'suspensions')
 */

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';

export type SuspensionSeverity = 'LEVE' | 'MODERADA' | 'GRAVE';

/**
 * Interface da suspensão (Supabase)
 */
interface SupabaseSuspension {
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
 * Interface da suspensão (Aplicação)
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
   * Converter registro do Supabase
   */
  private static mapSupabaseToSuspension(record: SupabaseSuspension): StudentSuspension {
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
   * Converter para formato Supabase
   */
  private static mapSuspensionToSupabase(
    data: CreateSuspensionData
  ): Partial<SupabaseSuspension> {
    return {
      student_id: data.studentId,
      start_date: data.startDate,
      end_date: data.endDate,
      reason: data.reason,
      description: data.description || null,
      severity: data.severity || null,
      decision_by: data.decisionBy,
      decision_date: data.decisionDate,
      document_number: data.documentNumber || null,
      family_notified: data.familyNotified || false,
      notification_date: data.notificationDate || null,
      notification_method: data.notificationMethod || null,
      created_by: data.createdBy,
    };
  }

  /**
   * Buscar suspensões de um estudante
   *
   * IMPORTANTE: studentId pode ser:
   * 1. UUID externo (student.student_id do Firebase) - MAIS COMUM
   * 2. UUID interno (student.id do Supabase) - MENOS COMUM
   *
   * O método tenta ambos para garantir compatibilidade.
   */
  static async getByStudentId(studentId: string): Promise<StudentSuspension[]> {
    try {
      // Primeiro, tentar buscar diretamente (caso seja o ID interno)
      let { data, error } = await supabase
        .from('student_suspensions')
        .select('*')
        .eq('student_id', studentId)
        .order('start_date', { ascending: false });

      // Se não encontrou, pode ser que studentId seja o UUID externo (student.student_id)
      // Nesse caso, precisamos buscar o ID interno primeiro
      if (!error && (!data || data.length === 0)) {
        logger.debug('Nenhuma suspensão encontrada com ID direto, tentando buscar ID interno...', { studentId });

        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('id')
          .eq('student_id', studentId)
          .maybeSingle();

        if (studentError) {
          logger.warn('Erro ao buscar ID interno do estudante', { studentId }, studentError);
        } else if (studentData) {
          // Encontrou o ID interno, buscar suspensões novamente
          const internalId = studentData.id;
          logger.debug('ID interno encontrado, buscando suspensões...', { studentId, internalId });

          const result = await supabase
            .from('student_suspensions')
            .select('*')
            .eq('student_id', internalId)
            .order('start_date', { ascending: false });

          data = result.data;
          error = result.error;
        }
      }

      if (error) throw error;

      return (data || []).map(this.mapSupabaseToSuspension);
    } catch (error) {
      logger.error('Erro ao buscar suspensões do estudante', { studentId }, error as Error);
      return [];
    }
  }

  /**
   * Buscar suspensão por ID
   */
  static async getById(suspensionId: string): Promise<StudentSuspension | null> {
    try {
      const { data, error } = await supabase
        .from('student_suspensions')
        .select('*')
        .eq('id', suspensionId)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data ? this.mapSupabaseToSuspension(data) : null;
    } catch (error) {
      logger.error('Erro ao buscar suspensão', { suspensionId }, error as Error);
      return null;
    }
  }

  /**
   * Criar nova suspensão
   */
  static async create(data: CreateSuspensionData): Promise<StudentSuspension | null> {
    try {
      const supabaseData = this.mapSuspensionToSupabase(data);

      const { data: result, error } = await (supabase
        .from('student_suspensions') as any)
        .insert(supabaseData)
        .select()
        .single();

      if (error) throw error;

      logger.info('Suspensão criada no Supabase', {
        studentId: data.studentId,
        startDate: data.startDate,
        endDate: data.endDate,
      });

      return this.mapSupabaseToSuspension(result);
    } catch (error) {
      logger.error('Erro ao criar suspensão', data, error as Error);
      throw error;
    }
  }

  /**
   * Atualizar suspensão
   */
  static async update(
    suspensionId: string,
    updates: Partial<CreateSuspensionData>
  ): Promise<boolean> {
    try {
      const supabaseUpdates: any = {};

      if (updates.startDate) supabaseUpdates.start_date = updates.startDate;
      if (updates.endDate) supabaseUpdates.end_date = updates.endDate;
      if (updates.reason) supabaseUpdates.reason = updates.reason;
      if (updates.description !== undefined)
        supabaseUpdates.description = updates.description || null;
      if (updates.severity) supabaseUpdates.severity = updates.severity;
      if (updates.decisionBy) supabaseUpdates.decision_by = updates.decisionBy;
      if (updates.decisionDate) supabaseUpdates.decision_date = updates.decisionDate;
      if (updates.documentNumber !== undefined)
        supabaseUpdates.document_number = updates.documentNumber || null;
      if (updates.familyNotified !== undefined)
        supabaseUpdates.family_notified = updates.familyNotified;
      if (updates.notificationDate !== undefined)
        supabaseUpdates.notification_date = updates.notificationDate || null;
      if (updates.notificationMethod !== undefined)
        supabaseUpdates.notification_method = updates.notificationMethod || null;

      const { error } = await (supabase.from('student_suspensions') as any)
        .update(supabaseUpdates)
        .eq('id', suspensionId);

      if (error) throw error;

      logger.info('Suspensão atualizada no Supabase', { suspensionId });

      return true;
    } catch (error) {
      logger.error('Erro ao atualizar suspensão', { suspensionId }, error as Error);
      return false;
    }
  }

  /**
   * Registrar reintegração do estudante
   */
  static async recordReintegration(
    suspensionId: string,
    reintegrationDate: string,
    status: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const { error } = await (supabase.from('student_suspensions') as any)
        .update({
          reintegration_date: reintegrationDate,
          reintegration_status: status,
          follow_up_notes: notes || null,
        })
        .eq('id', suspensionId);

      if (error) throw error;

      logger.info('Reintegração registrada no Supabase', { suspensionId });

      return true;
    } catch (error) {
      logger.error('Erro ao registrar reintegração', { suspensionId }, error as Error);
      return false;
    }
  }

  /**
   * Deletar suspensão
   */
  static async delete(suspensionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('student_suspensions')
        .delete()
        .eq('id', suspensionId);

      if (error) throw error;

      logger.info('Suspensão deletada do Supabase', { suspensionId });

      return true;
    } catch (error) {
      logger.error('Erro ao deletar suspensão', { suspensionId }, error as Error);
      return false;
    }
  }

  /**
   * Buscar suspensões ativas
   */
  static async getActiveSuspensions(): Promise<StudentSuspension[]> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('student_suspensions')
        .select('*')
        .lte('start_date', today)
        .gte('end_date', today)
        .order('start_date', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.mapSupabaseToSuspension);
    } catch (error) {
      logger.error('Erro ao buscar suspensões ativas', {}, error as Error);
      return [];
    }
  }
}
