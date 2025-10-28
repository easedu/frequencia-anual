/**
 * Types: Academic Years
 *
 * Tipos TypeScript para Academic Years, Bimesters e School Days
 */

/**
 * Academic Year (tabela: academic_years)
 */
export interface AcademicYear {
  id: string // UUID
  year: number
  start_date: string // ISO format (YYYY-MM-DD)
  end_date: string // ISO format (YYYY-MM-DD)
  total_school_days: number
  created_at?: string
  updated_at?: string
}

/**
 * Bimester (tabela: bimesters)
 */
export interface Bimester {
  id: string // UUID
  academic_year_id: string // FK → academic_years.id
  bimester_number: number // 1, 2, 3, 4
  start_date: string // ISO format (YYYY-MM-DD)
  end_date: string // ISO format (YYYY-MM-DD)
  school_days_count: number
  created_at?: string
  updated_at?: string
}

/**
 * School Day (tabela: school_days)
 */
export interface SchoolDay {
  id: string // UUID
  bimester_id: string // FK → bimesters.id
  date: string // ISO format (YYYY-MM-DD)
  is_checked: boolean
  created_at?: string
}

/**
 * Bimester Data (formato compatível com Firebase/Frontend)
 *
 * Usado em /cadastrar-ano-letivo
 */
export interface BimesterData {
  startDate: string // dd/mm/yyyy
  endDate: string // dd/mm/yyyy
  dates: Array<{
    date: string // dd/mm/yyyy
    isChecked: boolean
  }>
}

/**
 * Complete Academic Year (formato compatível com Firebase/Frontend)
 *
 * Response de GET /api/academic-years/complete
 */
export interface CompleteAcademicYearData {
  '1º Bimestre': BimesterData
  '2º Bimestre': BimesterData
  '3º Bimestre': BimesterData
  '4º Bimestre': BimesterData
}

/**
 * Payload para POST /api/academic-years/complete
 */
export interface SaveCompleteAcademicYearPayload {
  year: number
  bimesters: CompleteAcademicYearData
}

/**
 * Partial update data for academic year
 */
export interface AcademicYearUpdateData {
  start_date?: string
  end_date?: string
  total_school_days?: number
}

/**
 * Bimester update/insert data (upsert)
 */
export interface BimesterUpsertData {
  academic_year_id: string
  bimester_number: number
  start_date: string
  end_date: string
  school_days_count: number
}

/**
 * School day insert data
 */
export interface SchoolDayInsertData {
  bimester_id: string
  date: string
  is_checked: boolean
}

/**
 * Generic Supabase result type helper
 */
export type SupabaseResult<T> = {
  data: T | null
  error: Error | null
}

/**
 * Supabase RPC caller type (typed methods)
 */
export interface SupabaseRpcCaller {
  rpc<T = unknown>(
    fn: string,
    params?: Record<string, unknown>
  ): Promise<SupabaseResult<T>>
}
