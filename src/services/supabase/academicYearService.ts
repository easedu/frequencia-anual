/**
 * Academic Year Service - Supabase
 *
 * @deprecated Use hooks from @/hooks/api/useAcademicYears instead
 *
 * Este service está sendo gradualmente substituído por hooks da API REST.
 * Para componentes React, use:
 * - useAcademicYears() - Listar anos letivos
 * - useCurrentAcademicYear() - Ano atual
 * - useAcademicYearComplete() - Dados completos (ano + bimestres + dias)
 * - useCreateAcademicYear() - Criar ano
 * - useUpdateAcademicYear() - Atualizar ano
 *
 * Service layer para gerenciar dados de ano letivo, bimestres e dias letivos
 * Migrado do Firebase para Supabase (estrutura relacional)
 *
 * Estrutura:
 * - academic_years: Informações gerais do ano
 * - bimesters: Períodos dos 4 bimestres
 * - school_days: Dias letivos individuais (com isChecked)
 */

import { supabase } from '@/lib/supabaseClient'; // ⚠️ Usado apenas em métodos legados (não refatorados)
import { logger } from '@/utils/logger';

// =====================================================
// TYPES
// =====================================================

export interface AcademicYear {
  id: string;
  year: number;
  start_date: string;
  end_date: string;
  total_school_days: number;
  created_at: string;
  updated_at: string;
}

export interface Bimester {
  id: string;
  academic_year_id: string;
  bimester_number: number;
  start_date: string;
  end_date: string;
  school_days_count: number;
  created_at: string;
  updated_at: string;
}

export interface SchoolDay {
  id: string;
  bimester_id: string;
  date: string;
  is_checked: boolean;
  created_at: string;
  updated_at: string;
}

export interface BimesterPeriod {
  start: string;
  end: string;
}

export interface BimesterDates {
  [key: number]: BimesterPeriod;
}

// =====================================================
// ACADEMIC YEAR
// =====================================================

export class AcademicYearService {
  // Cache estático para evitar race conditions
  private static bimesterDatesCache: Map<number, BimesterDates> = new Map();

  /**
   * Buscar ano letivo por ano (ex: 2025)
   */
  static async getAcademicYear(year: number): Promise<AcademicYear | null> {
    try {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('year', year)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Registro não encontrado
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(`Erro ao buscar ano letivo ${year}`, error as Error);
      throw error;
    }
  }

  /**
   * Buscar todos os anos letivos
   */
  static async getAllAcademicYears(): Promise<AcademicYear[]> {
    try {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .order('year', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Erro ao buscar anos letivos', error as Error);
      throw error;
    }
  }

  // =====================================================
  // BIMESTERS
  // =====================================================

  /**
   * Buscar bimestres de um ano letivo
   */
  static async getBimesters(year: number): Promise<Bimester[]> {
    try {
      const { data, error } = await supabase
        .from('bimesters')
        .select(`
          *,
          academic_years!inner(year)
        `)
        .eq('academic_years.year', year)
        .order('bimester_number', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error(`Erro ao buscar bimestres do ano ${year}`, error as Error);
      throw error;
    }
  }

  /**
   * Buscar bimestres formatados para os hooks legados
   * Retorna: { 1: { start, end }, 2: { start, end }, ... }
   *
   * ✅ SOLUÇÃO DEFINITIVA:
   * - Cache único (todos recebem a mesma instância)
   * - Objeto imutável (Object.freeze)
   * - Ordem garantida via Object.defineProperties
   */
  static async getBimesterDates(year: number): Promise<BimesterDates> {
    try {
      // Verificar cache primeiro
      if (this.bimesterDatesCache.has(year)) {
        return this.bimesterDatesCache.get(year)!;
      }

      const bimesters = await this.getBimesters(year);

      // ✅ CRÍTICO: Usar Object.create(null) para evitar prototype pollution
      const bimesterDates = Object.create(null) as BimesterDates;

      // Definir propriedades na ordem exata 1, 2, 3, 4
      for (let i = 1; i <= 4; i++) {
        const bimester = bimesters.find(b => b.bimester_number === i);
        if (bimester) {
          Object.defineProperty(bimesterDates, i, {
            value: {
              start: bimester.start_date,
              end: bimester.end_date,
            },
            enumerable: true,
            writable: false,
            configurable: false
          });
        }
      }

      // Congelar objeto para evitar modificações
      Object.freeze(bimesterDates);

      // Salvar no cache
      this.bimesterDatesCache.set(year, bimesterDates);

      return bimesterDates;
    } catch (error) {
      logger.error(`Erro ao buscar datas dos bimestres ${year}`, error as Error);
      throw error;
    }
  }

  /**
   * Limpar cache de bimestres (útil para testes ou refresh manual)
   */
  static clearBimesterDatesCache(): void {
    this.bimesterDatesCache.clear();
  }

  /**
   * Buscar um bimestre específico
   */
  static async getBimester(year: number, bimesterNumber: number): Promise<Bimester | null> {
    try {
      const { data, error } = await supabase
        .from('bimesters')
        .select(`
          *,
          academic_years!inner(year)
        `)
        .eq('academic_years.year', year)
        .eq('bimester_number', bimesterNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(`Erro ao buscar bimestre ${bimesterNumber} do ano ${year}`, error as Error);
      throw error;
    }
  }

  // =====================================================
  // SCHOOL DAYS
  // =====================================================

  /**
   * Buscar dias letivos de um bimestre
   */
  static async getSchoolDays(bimesterId: string, onlyChecked: boolean = false): Promise<SchoolDay[]> {
    try {
      let query = supabase
        .from('school_days')
        .select('*')
        .eq('bimester_id', bimesterId)
        .order('date', { ascending: true });

      if (onlyChecked) {
        query = query.eq('is_checked', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error(`Erro ao buscar dias letivos do bimestre ${bimesterId}`, error as Error);
      throw error;
    }
  }

  /**
   * Converter data brasileira (dd/mm/yyyy) para ISO (yyyy-mm-dd)
   */
  private static convertToISO(dateStr: string): string {
    // Se já está em ISO format (yyyy-mm-dd), retorna
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }

    // Se está em formato brasileiro (dd/mm/yyyy)
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month}-${day}`;
    }

    // Tentar parsear com Date (aceita múltiplos formatos)
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    // Fallback: retornar original
    return dateStr;
  }

  /**
   * Converter data ISO (yyyy-mm-dd) para formato brasileiro (dd/mm/yyyy)
   */
  private static convertFromISO(dateStr: string): string {
    // Se já está em formato brasileiro (dd/mm/yyyy), retorna
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateStr;
    }

    // Se está em ISO format (yyyy-mm-dd)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }

    // Fallback: retornar original
    return dateStr;
  }

  /**
   * Contar dias letivos em um período específico
   * ✅ REFATORADO: Usa API REST ao invés de Supabase direto
   *
   * 🔧 FIX: Converte datas brasileiras (dd/mm/yyyy) para ISO (yyyy-mm-dd)
   */
  static async countSchoolDaysInPeriod(
    startDate: string,
    endDate: string,
    year: number = new Date().getFullYear()
  ): Promise<number> {
    try {
      // Converter datas para formato ISO (API espera ISO)
      const isoStartDate = this.convertToISO(startDate);
      const isoEndDate = this.convertToISO(endDate);

      // ✅ Usar API REST ao invés de Supabase direto
      const response = await fetch(
        `/api/academic-years/count-school-days?start_date=${isoStartDate}&end_date=${isoEndDate}&year=${year}`
      );

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Erro ao contar dias letivos');
      }

      return result.data?.count || 0;
    } catch (error) {
      logger.error(`Erro ao contar dias letivos no período ${startDate} - ${endDate}`, error as Error);
      throw error;
    }
  }

  /**
   * Contar dias letivos até hoje
   * ✅ REFATORADO: Usa API REST ao invés de Supabase direto
   */
  static async countSchoolDaysUpToToday(year: number = new Date().getFullYear()): Promise<number> {
    try {
      // ✅ Usar API REST ao invés de Supabase direto
      const response = await fetch(`/api/academic-years/school-days-up-to-today?year=${year}`);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Erro ao contar dias letivos até hoje');
      }

      return result.data?.count || 0;
    } catch (error) {
      logger.error(`Erro ao contar dias letivos até hoje (ano ${year})`, error as Error);
      throw error;
    }
  }

  /**
   * Buscar resumo de bimestres (usando view otimizada)
   */
  static async getBimesterSummary(year: number) {
    try {
      const { data, error } = await supabase
        .from('v_bimester_summary')
        .select('*')
        .eq('academic_year', year)
        .order('bimester_number', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error(`Erro ao buscar resumo de bimestres (ano ${year})`, error as Error);
      throw error;
    }
  }

  /**
   * Buscar dias letivos com detalhes completos (usando view otimizada)
   */
  static async getSchoolDaysDetail(
    year: number,
    bimesterNumber?: number,
    onlyChecked: boolean = false
  ) {
    try {
      let query = supabase
        .from('v_school_days_detail')
        .select('*')
        .eq('academic_year', year)
        .order('date', { ascending: true });

      if (bimesterNumber) {
        query = query.eq('bimester_number', bimesterNumber);
      }

      if (onlyChecked) {
        query = query.eq('is_checked', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Erro ao buscar detalhes de dias letivos', error as Error);
      throw error;
    }
  }

  // =====================================================
  // HELPER METHODS (Compatibilidade com código legado)
  // =====================================================

  /**
   * Obter total de dias letivos do ano
   */
  static async getTotalSchoolDays(year: number): Promise<number> {
    try {
      const academicYear = await this.getAcademicYear(year);
      return academicYear?.total_school_days || 0;
    } catch (error) {
      logger.error(`Erro ao obter total de dias letivos (ano ${year})`, error as Error);
      return 0;
    }
  }

  /**
   * Obter dias letivos por bimestre
   * Retorna: { 1: 54, 2: 42, 3: 52, 4: 52 }
   */
  static async getSchoolDaysByBimester(year: number): Promise<Record<number, number>> {
    try {
      const bimesters = await this.getBimesters(year);

      const result: Record<number, number> = {};

      bimesters.forEach(b => {
        result[b.bimester_number] = b.school_days_count;
      });

      return result;
    } catch (error) {
      logger.error(`Erro ao obter dias letivos por bimestre (ano ${year})`, error as Error);
      return {};
    }
  }

  /**
   * Verificar se uma data é dia letivo
   */
  static async isSchoolDay(date: string, year: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('v_school_days_detail')
        .select('is_checked')
        .eq('academic_year', year)
        .eq('date', date)
        .eq('is_checked', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false; // Não encontrado = não é dia letivo
        }
        throw error;
      }

      return !!data;
    } catch (error) {
      logger.error(`Erro ao verificar se ${date} é dia letivo`, error as Error);
      return false;
    }
  }

  // =====================================================
  // CRUD - CREATE/UPDATE OPERATIONS
  // =====================================================

  /**
   * Salvar ou atualizar ano letivo completo (bimestres + dias letivos)
   * Formato compatível com a página cadastrar-ano-letivo
   */
  static async saveAcademicYearComplete(
    year: number,
    bimestersData: {
      [key: string]: {
        startDate: string; // DD/MM/YYYY
        endDate: string;   // DD/MM/YYYY
        dates: { date: string; isChecked: boolean }[];
      };
    }
  ): Promise<void> {
    try {
      // 1. Criar ou atualizar academic_year
      const { data: academicYear, error: yearError} = await (supabase
        .from('academic_years')
        .upsert({
          year,
          start_date: this.convertToISO(Object.values(bimestersData)[0]?.startDate || ''),
          end_date: this.convertToISO(Object.values(bimestersData)[3]?.endDate || ''),
          total_school_days: Object.values(bimestersData).reduce(
            (sum, b) => sum + b.dates.filter(d => d.isChecked).length,
            0
          ),
        } as any, {
          onConflict: 'year',
        })
        .select()
        .single() as any);

      if (yearError) throw yearError;

      // 2. Para cada bimestre
      const bimesterKeys = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

      for (let i = 0; i < bimesterKeys.length; i++) {
        const bimesterKey = bimesterKeys[i];
        const bimesterData = bimestersData[bimesterKey];

        if (!bimesterData) continue;

        const bimesterNumber = i + 1;

        // 2.1. Criar ou atualizar bimester
        const { data: bimester, error: bimesterError } = await (supabase
          .from('bimesters')
          .upsert({
            academic_year_id: academicYear.id,
            bimester_number: bimesterNumber,
            start_date: this.convertToISO(bimesterData.startDate),
            end_date: this.convertToISO(bimesterData.endDate),
            school_days_count: bimesterData.dates.filter(d => d.isChecked).length,
          } as any, {
            onConflict: 'academic_year_id,bimester_number',
          })
          .select()
          .single() as any);

        if (bimesterError) throw bimesterError;

        // 2.2. Deletar dias letivos antigos deste bimestre
        await ((supabase
          .from('school_days') as any)
          .delete()
          .eq('bimester_id', bimester.id));

        // 2.3. Inserir novos dias letivos
        if (bimesterData.dates && bimesterData.dates.length > 0) {
          const schoolDaysToInsert = bimesterData.dates.map(d => ({
            bimester_id: bimester.id,
            date: this.convertToISO(d.date),
            is_checked: d.isChecked,
          }));

          const { error: daysError } = await (supabase
            .from('school_days')
            .insert(schoolDaysToInsert as any) as any);

          if (daysError) throw daysError;
        }
      }

      // 3. SINCRONIZAR com tabela absence_control (usada por 4 páginas)
      for (let i = 0; i < bimesterKeys.length; i++) {
        const bimesterKey = bimesterKeys[i];
        const bimesterData = bimestersData[bimesterKey];

        if (!bimesterData) continue;

        const bimesterNumber = i + 1;
        const schoolDaysCount = bimesterData.dates.filter(d => d.isChecked).length;

        // Upsert em absence_control
        const { error: absenceControlError } = await (supabase
          .from('absence_control') as any)
          .upsert({
            academic_year: year,
            bimester: bimesterNumber,
            school_days: schoolDaysCount,
            start_date: this.convertToISO(bimesterData.startDate),
            end_date: this.convertToISO(bimesterData.endDate),
            notes: bimesterKey,
            updated_by: 'academic_year_sync',
          }, {
            onConflict: 'academic_year,bimester',
          });

        if (absenceControlError) {
          logger.warn(`⚠️  Erro ao sincronizar absence_control bimestre ${bimesterNumber}:`, absenceControlError);
          // Não lançar erro - absence_control é secundário
        }
      }
    } catch (error) {
      logger.error(`Erro ao salvar ano letivo ${year}`, error as Error);
      throw error;
    }
  }

  /**
   * Buscar ano letivo completo via API REST (RECOMENDADO ✅)
   *
   * ✅ VANTAGENS sobre getAcademicYearComplete():
   * - Cache de 1 hora (resposta instantânea)
   * - Queries paralelas server-side (mais rápido)
   * - Retry automático em redes lentas
   * - Supabase Admin (sem RLS overhead)
   * - Timeout de 30s (não falha em 2G/3G)
   *
   * Performance:
   * - 1ª chamada: ~5-10s (2G/3G)
   * - Próximas: < 1s (cached) ⚡
   *
   * @param year - Ano letivo (ex: 2025)
   * @returns Dados completos do ano letivo no formato legado
   *
   * @example
   * const yearData = await AcademicYearService.getAcademicYearCompleteViaAPI(2025);
   */
  static async getAcademicYearCompleteViaAPI(year: number): Promise<{
    [key: string]: {
      startDate: string;
      endDate: string;
      dates: { date: string; isChecked: boolean }[];
    };
  }> {
    try {
      logger.info(`Buscando ano letivo ${year} via API REST`, { year });

      const response = await fetch(`/api/academic-years/${year}/complete`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || `API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao buscar ano letivo');
      }

      logger.info(`Ano letivo ${year} carregado com sucesso via API`, {
        year,
        cached: result.cached,
      });

      return result.data || {};
    } catch (error) {
      logger.error(`Erro ao buscar ano letivo ${year} via API`, error as Error);
      throw error; // ✅ Lançar erro ao invés de retornar vazio
    }
  }

  /**
   * Buscar ano letivo completo no formato da página cadastrar-ano-letivo
   * Retorna estrutura compatível com Firebase antigo
   *
   * @deprecated Use getAcademicYearCompleteViaAPI() ao invés deste método.
   * Este método faz queries client-side (mais lento em redes ruins).
   *
   * ⚠️ PROBLEMAS:
   * - Queries sequenciais (5 queries = 20s em 2G)
   * - Sem cache
   * - Sem retry
   * - Timeout de 8s (falha em 2G/3G)
   * - Retorna {} em erro (dificulta debug)
   */
  static async getAcademicYearComplete(year: number): Promise<{
    [key: string]: {
      startDate: string;
      endDate: string;
      dates: { date: string; isChecked: boolean }[];
    };
  }> {
    try {
      const bimesters = await this.getBimesters(year);
      const result: any = {};

      const bimesterKeys = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

      for (const bimester of bimesters) {
        const bimesterKey = bimesterKeys[bimester.bimester_number - 1];

        // Buscar dias letivos deste bimestre
        const { data: schoolDays, error } = await supabase
          .from('school_days')
          .select('*')
          .eq('bimester_id', bimester.id)
          .order('date', { ascending: true });

        if (error) throw error;

        const checkedDays = (schoolDays || []).filter((d: any) => d.is_checked);

        result[bimesterKey] = {
          startDate: this.convertFromISO(bimester.start_date),
          endDate: this.convertFromISO(bimester.end_date),
          dates: (schoolDays || []).map((d: any) => ({
            date: this.convertFromISO(d.date),
            isChecked: d.is_checked,
          })),
        };
      }

      const totalSchoolDays = Object.values(result).reduce((sum: number, bim: any) => {
        return sum + bim.dates.filter((d: any) => d.isChecked).length;
      }, 0);

      return result;
    } catch (error) {
      logger.error(`Erro ao buscar ano letivo completo ${year}`, error as Error);
      return {};
    }
  }
}
