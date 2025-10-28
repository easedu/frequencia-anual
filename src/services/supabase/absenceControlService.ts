/**
 * Supabase Service: Absence Control
 *
 * @deprecated Use hooks from @/hooks/api/useAbsenceControls instead
 *
 * Este service está sendo gradualmente substituído por hooks da API REST.
 * Para componentes React, use:
 * - useAbsenceControls() - Listar controles
 * - useCreateAbsenceControl() - Criar controle
 * - useUpdateAbsenceControl() - Atualizar controle
 * - useDeleteAbsenceControl() - Deletar controle
 *
 * Gerencia controle de dias letivos por bimestre.
 * Substitui: collection(db, '2025', 'faltas', 'controle')
 */

import { supabase, Database } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Type alias for absence_control table row
 */
type SupabaseAbsenceControl = Database['public']['Tables']['absence_control']['Row'];

/**
 * Type alias for absence_control table insert
 */
type _SupabaseAbsenceControlInsert = Database['public']['Tables']['absence_control']['Insert'];

/**
 * Type alias for absence_control table update
 */
type _SupabaseAbsenceControlUpdate = Database['public']['Tables']['absence_control']['Update'];

/**
 * Interface do controle de faltas (Aplicação)
 */
export interface AbsenceControl {
  id: string;
  academicYear: number;
  bimester: number;
  schoolDays: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dados para criar controle
 */
export interface CreateAbsenceControlData {
  academicYear: number;
  bimester: number;
  schoolDays: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdBy?: string;
}

export class AbsenceControlService {
  /**
   * Converter registro do Supabase para AbsenceControl
   */
  private static mapSupabaseToAbsenceControl(record: SupabaseAbsenceControl): AbsenceControl {
    return {
      id: record.id,
      academicYear: record.academic_year,
      bimester: record.bimester,
      schoolDays: record.school_days,
      startDate: record.start_date || undefined,
      endDate: record.end_date || undefined,
      notes: record.notes || undefined,
      createdBy: record.created_by || undefined,
      updatedBy: record.updated_by || undefined,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  /**
   * Converter AbsenceControl para formato Supabase
   */
  private static mapAbsenceControlToSupabase(
    data: CreateAbsenceControlData
  ): Partial<SupabaseAbsenceControl> {
    return {
      academic_year: data.academicYear,
      bimester: data.bimester,
      school_days: data.schoolDays,
      start_date: data.startDate || null,
      end_date: data.endDate || null,
      notes: data.notes || null,
      created_by: data.createdBy || null,
    };
  }

  /**
   * Buscar controle por ano e bimestre
   */
  static async getByYearAndBimester(
    year: number,
    bimester: number
  ): Promise<AbsenceControl | null> {
    try {
      const { data, error } = await supabase
        .from('absence_control')
        .select('*')
        .eq('academic_year', year)
        .eq('bimester', bimester)
        .maybeSingle() as { data: SupabaseAbsenceControl | null; error: PostgrestError | null };

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data ? this.mapSupabaseToAbsenceControl(data) : null;
    } catch (error) {
      logger.error('Erro ao buscar controle de faltas', { year, bimester }, error as Error);
      return null;
    }
  }

  /**
   * Buscar todos os controles de um ano
   */
  static async getByYear(year: number): Promise<AbsenceControl[]> {
    try {
      const { data, error } = await supabase
        .from('absence_control')
        .select('*')
        .eq('academic_year', year)
        .order('bimester', { ascending: true }) as { data: SupabaseAbsenceControl[] | null; error: PostgrestError | null };

      if (error) throw error;

      return (data || []).map(this.mapSupabaseToAbsenceControl);
    } catch (error) {
      logger.error('Erro ao buscar controles por ano', { year }, error as Error);
      return [];
    }
  }

  /**
   * Criar ou atualizar controle (upsert)
   */
  static async upsert(data: CreateAbsenceControlData): Promise<AbsenceControl | null> {
    try {
      const supabaseData = this.mapAbsenceControlToSupabase(data);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (supabase as any)
        .from('absence_control')
        .upsert(
          supabaseData,
          {
            onConflict: 'academic_year,bimester',
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();

      const { data: result, error } = response as { data: SupabaseAbsenceControl | null; error: PostgrestError | null };

      if (error) throw error;
      if (!result) throw new Error('Upsert returned null data');

      return this.mapSupabaseToAbsenceControl(result);
    } catch (error) {
      const errorRecord: Record<string, unknown> = {
        academicYear: data.academicYear,
        bimester: data.bimester,
        schoolDays: data.schoolDays,
      };
      logger.error('Erro ao salvar controle de faltas', errorRecord, error as Error);
      throw error;
    }
  }

  /**
   * Atualizar dias letivos de um bimestre
   */
  static async updateSchoolDays(
    year: number,
    bimester: number,
    schoolDays: number,
    updatedBy?: string
  ): Promise<boolean> {
    try {
      const updateData = {
        school_days: schoolDays,
        updated_by: updatedBy || null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (supabase as any)
        .from('absence_control')
        .update(updateData)
        .eq('academic_year', year)
        .eq('bimester', bimester);

      const { error } = response as { error: PostgrestError | null };

      if (error) throw error;

      return true;
    } catch (error) {
      logger.error(
        'Erro ao atualizar dias letivos',
        { year, bimester, schoolDays },
        error as Error
      );
      return false;
    }
  }

  /**
   * Deletar controle
   */
  static async delete(year: number, bimester: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('absence_control')
        .delete()
        .eq('academic_year', year)
        .eq('bimester', bimester) as { error: PostgrestError | null };

      if (error) throw error;

      return true;
    } catch (error) {
      logger.error('Erro ao deletar controle', { year, bimester }, error as Error);
      return false;
    }
  }
}
