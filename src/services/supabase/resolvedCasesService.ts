/**
 * Supabase Service: Resolved Consecutive Absence Cases
 *
 * @deprecated Use hooks from @/hooks/api/useResolvedCases instead
 *
 * Este service está sendo gradualmente substituído por hooks da API REST.
 * Para componentes React, use:
 * - useResolvedCases() - Listar casos resolvidos
 * - useCreateResolvedCase() - Criar caso resolvido
 * - useDeleteResolvedCase() - Deletar caso resolvido
 *
 * Gerencia casos resolvidos de faltas consecutivas.
 * Substitui: Firebase collection '2025/casos_resolvidos/{studentId}'
 */

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';

/**
 * Interface do caso resolvido (Supabase)
 */
interface SupabaseResolvedCase {
  id: string;
  student_id: string;
  interaction_id: string | null;
  resolved_at: string;
  resolved_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Interface do caso resolvido (Aplicação)
 */
export interface ResolvedCase {
  id: string;
  studentId: string;
  interactionId?: string;
  resolvedAt: string;
  resolvedBy: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export class ResolvedCasesService {
  /**
   * Converter registro do Supabase para ResolvedCase
   */
  private static mapSupabaseToResolvedCase(record: SupabaseResolvedCase): ResolvedCase {
    return {
      id: record.id,
      studentId: record.student_id,
      interactionId: record.interaction_id || undefined,
      resolvedAt: record.resolved_at,
      resolvedBy: record.resolved_by,
      notes: record.notes || undefined,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  /**
   * Converter ResolvedCase para formato Supabase
   */
  private static mapResolvedCaseToSupabase(resolvedCase: Omit<ResolvedCase, 'id' | 'createdAt' | 'updatedAt'>): Partial<SupabaseResolvedCase> {
    return {
      student_id: resolvedCase.studentId,
      interaction_id: resolvedCase.interactionId || null,
      resolved_at: resolvedCase.resolvedAt,
      resolved_by: resolvedCase.resolvedBy,
      notes: resolvedCase.notes || null,
    };
  }

  /**
   * Verificar se estudante tem caso resolvido
   */
  static async hasResolvedCase(studentId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('resolved_consecutive_absence_cases')
        .select('id')
        .eq('student_id', studentId)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return !!data;
    } catch (error) {
      logger.error('Erro ao verificar caso resolvido', { studentId }, error as Error);
      return false;
    }
  }

  /**
   * Buscar caso resolvido por ID do estudante
   */
  static async getResolvedCaseByStudentId(studentId: string): Promise<ResolvedCase | null> {
    try {
      const { data, error } = await supabase
        .from('resolved_consecutive_absence_cases')
        .select('*')
        .eq('student_id', studentId)
        .order('resolved_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data ? this.mapSupabaseToResolvedCase(data) : null;
    } catch (error) {
      logger.error('Erro ao buscar caso resolvido por studentId', { studentId }, error as Error);
      return null;
    }
  }

  /**
   * Buscar todos os casos resolvidos
   */
  static async getAllResolvedCases(): Promise<ResolvedCase[]> {
    try {
      const { data, error } = await supabase
        .from('resolved_consecutive_absence_cases')
        .select('*')
        .order('resolved_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.mapSupabaseToResolvedCase);
    } catch (error) {
      logger.error('Erro ao buscar todos os casos resolvidos', {}, error as Error);
      return [];
    }
  }

  /**
   * Criar caso resolvido
   */
  static async createResolvedCase(
    resolvedCase: Omit<ResolvedCase, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ResolvedCase> {
    try {
      const insertData = this.mapResolvedCaseToSupabase(resolvedCase);

      const { data, error } = await ((supabase
        .from('resolved_consecutive_absence_cases') as any)
        .insert(insertData)
        .select()
        .single());

      if (error) throw error;

      logger.info('Caso resolvido criado no Supabase', {
        caseId: data.id,
        studentId: resolvedCase.studentId
      });

      return this.mapSupabaseToResolvedCase(data);
    } catch (error) {
      logger.error('Erro ao criar caso resolvido', { studentId: resolvedCase.studentId }, error as Error);
      throw error;
    }
  }

  /**
   * Deletar caso resolvido por ID do estudante
   */
  static async deleteResolvedCaseByStudentId(studentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('resolved_consecutive_absence_cases')
        .delete()
        .eq('student_id', studentId);

      if (error) throw error;

      logger.info('Caso resolvido deletado do Supabase', { studentId });
      return true;
    } catch (error) {
      logger.error('Erro ao deletar caso resolvido', { studentId }, error as Error);
      return false;
    }
  }

  /**
   * Buscar IDs de estudantes com casos resolvidos
   */
  static async getResolvedStudentIds(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('resolved_consecutive_absence_cases')
        .select('student_id');

      if (error) throw error;

      return (data || []).map((record: any) => record.student_id);
    } catch (error) {
      logger.error('Erro ao buscar IDs de estudantes resolvidos', {}, error as Error);
      return [];
    }
  }
}
