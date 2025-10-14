/**
 * Supabase Service: Absence Control
 *
 * Gerencia controle de dias letivos por bimestre.
 * Substitui: collection(db, '2025', 'faltas', 'controle')
 */

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';

/**
 * Interface do controle de faltas (Supabase)
 */
interface SupabaseAbsenceControl {
  id: string;
  academic_year: number;
  bimester: number;
  school_days: number;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

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
        .maybeSingle();

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
        .order('bimester', { ascending: true });

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

      const { data: result, error } = await (supabase
        .from('absence_control') as any)
        .upsert(
          {
            ...supabaseData,
            // Unique constraint: academic_year + bimester
          },
          {
            onConflict: 'academic_year,bimester',
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();

      if (error) throw error;

      logger.info('Controle de faltas salvo no Supabase', {
        year: data.academicYear,
        bimester: data.bimester,
      });

      return this.mapSupabaseToAbsenceControl(result);
    } catch (error) {
      logger.error('Erro ao salvar controle de faltas', data, error as Error);
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
      const { error } = await (supabase
        .from('absence_control') as any)
        .update({
          school_days: schoolDays,
          updated_by: updatedBy || null,
        })
        .eq('academic_year', year)
        .eq('bimester', bimester);

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
        .eq('bimester', bimester);

      if (error) throw error;

      return true;
    } catch (error) {
      logger.error('Erro ao deletar controle', { year, bimester }, error as Error);
      return false;
    }
  }
}
