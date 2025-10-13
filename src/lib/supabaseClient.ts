/**
 * 🔌 SUPABASE CLIENT (BROWSER)
 *
 * Supabase client for browser use (client components).
 * Uses public key (anon key) which is safe to expose.
 *
 * USAGE:
 * import { supabase } from '@/lib/supabaseClient'
 *
 * const { data, error } = await supabase
 *   .from('students')
 *   .select('*')
 *
 * SCHEMA VERSION: V2 (Standardized - English + snake_case)
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Missing Supabase environment variables!\n' +
    'Make sure to set:\n' +
    '- NEXT_PUBLIC_SUPABASE_URL\n' +
    '- NEXT_PUBLIC_SUPABASE_ANON_KEY\n' +
    'in your .env.local file'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// ═══════════════════════════════════════════════════════════
// DATABASE TYPES (Schema V2 - Standardized)
// ═══════════════════════════════════════════════════════════

export type Database = {
  public: {
    Tables: {
      // ──────────────────────────────────────────────────────
      // students (core entity)
      // ──────────────────────────────────────────────────────
      students: {
        Row: {
          id: string
          student_id: string
          name: string
          class: string
          shift: 'MANHÃ' | 'TARDE'
          status: 'ATIVO' | 'INATIVO' | 'TRANSFERIDO'
          birth_date: string | null
          school_year: string
          registration_number: string | null
          bolsa_familia: 'SIM' | 'NÃO' | null
          address: Record<string, any> // JSONB: {street, number, neighborhood, city, state, zip_code, complement}
          disabilities: Array<Record<string, any>> // JSONB array: [{type, description, cid, aee_type, needs_ave}]
          migrated_from: string | null
          version: string | null
          deleted: boolean
          created_at: string
          updated_at: string
          migrated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['students']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['students']['Insert']>
      }

      // ──────────────────────────────────────────────────────
      // student_contacts (guardian contacts)
      // ──────────────────────────────────────────────────────
      student_contacts: {
        Row: {
          id: string
          student_id: string
          name: string
          relationship: string | null
          phone: string | null
          phone_numeric: string | null
          email: string | null
          can_receive_whatsapp: boolean
          whatsapp_data: Record<string, any> // JSONB: {number, verified, verified_at, exists, verification_status}
          migrated_from: string | null
          synced_from_old_structure: boolean
          version: string | null
          is_placeholder: boolean
          created_at: string
          updated_at: string
          synced_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['student_contacts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['student_contacts']['Insert']>
      }

      // ──────────────────────────────────────────────────────
      // student_absences (daily attendance records)
      // ──────────────────────────────────────────────────────
      student_absences: {
        Row: {
          id: string
          student_id: string
          absence_date: string
          bimester: string | null
          is_justified: boolean
          medical_certificate_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['student_absences']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['student_absences']['Insert']>
      }

      // ──────────────────────────────────────────────────────
      // absence_summaries (monthly aggregated stats)
      // ──────────────────────────────────────────────────────
      absence_summaries: {
        Row: {
          id: string
          student_id: string
          month: string
          total_absences: number
          justified_absences: number
          unjustified_absences: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['absence_summaries']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['absence_summaries']['Insert']>
      }

      // ──────────────────────────────────────────────────────
      // medical_certificates (atestados médicos)
      // ──────────────────────────────────────────────────────
      medical_certificates: {
        Row: {
          id: string
          student_id: string
          start_date: string
          end_date: string | null
          days_covered: number | null
          reason: string | null
          cid_code: string | null
          doctor_name: string | null
          file_url: string | null
          file_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['medical_certificates']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['medical_certificates']['Insert']>
      }

      // ──────────────────────────────────────────────────────
      // family_interactions (comunicação com responsáveis)
      // ──────────────────────────────────────────────────────
      family_interactions: {
        Row: {
          id: string
          student_id: string
          interaction_type: string
          interaction_date: string
          description: string | null
          is_sensitive: boolean
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['family_interactions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['family_interactions']['Insert']>
      }

      // ──────────────────────────────────────────────────────
      // user_tasks (pedagogical follow-up tasks)
      // ──────────────────────────────────────────────────────
      user_tasks: {
        Row: {
          id: string
          student_id: string
          title: string
          description: string | null
          recommended_action: string | null
          is_resolved: boolean
          action_taken: string | null
          created_by: string | null
          assigned_to: string | null
          created_at: string
          resolved_at: string | null
          due_date: string | null
        }
        Insert: Omit<Database['public']['Tables']['user_tasks']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['user_tasks']['Insert']>
      }

      // ──────────────────────────────────────────────────────
      // users (system users)
      // ──────────────────────────────────────────────────────
      users: {
        Row: {
          id: string
          firebase_uid: string | null
          email: string
          name: string | null
          role: 'admin' | 'user' | 'teacher'
          created_at: string
          updated_at: string
          last_login_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }

      // ──────────────────────────────────────────────────────
      // whatsapp_verified_numbers
      // ──────────────────────────────────────────────────────
      whatsapp_verified_numbers: {
        Row: {
          id: string
          phone_number: string
          is_verified: boolean
          verified_at: string | null
          whatsapp_jid: string | null
          contact_name: string | null
          account_exists: boolean
          verification_status: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['whatsapp_verified_numbers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['whatsapp_verified_numbers']['Insert']>
      }

      // ──────────────────────────────────────────────────────
      // automation_executions (automation logs)
      // ──────────────────────────────────────────────────────
      automation_executions: {
        Row: {
          id: string
          automation_type: string
          execution_status: string
          message: string | null
          metadata: Record<string, any> // JSONB
          executed_at: string
        }
        Insert: Omit<Database['public']['Tables']['automation_executions']['Row'], 'id' | 'executed_at'>
        Update: Partial<Database['public']['Tables']['automation_executions']['Insert']>
      }
    }

    Views: {
      // ──────────────────────────────────────────────────────
      // students_with_absences (view)
      // ──────────────────────────────────────────────────────
      students_with_absences: {
        Row: {
          id: string
          student_id: string
          name: string
          class: string
          shift: string
          status: string
          total_absences: number
          unjustified_absences: number
          justified_absences: number
        }
      }

      // ──────────────────────────────────────────────────────
      // students_complete (view)
      // ──────────────────────────────────────────────────────
      students_complete: {
        Row: {
          id: string
          student_id: string
          name: string
          class: string
          shift: string
          status: string
          birth_date: string | null
          school_year: string
          total_contacts: number
          total_absences: number
          total_interactions: number
          total_tasks: number
          open_tasks: number
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════
// TYPE HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Get Row type for a table (SELECT result)
 *
 * @example
 * type Student = Tables<'students'>
 */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/**
 * Get Insert type for a table
 *
 * @example
 * type StudentInsert = TablesInsert<'students'>
 */
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

/**
 * Get Update type for a table
 *
 * @example
 * type StudentUpdate = TablesUpdate<'students'>
 */
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

/**
 * Get View type
 *
 * @example
 * type StudentWithAbsences = Views<'students_with_absences'>
 */
export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row']

// ═══════════════════════════════════════════════════════════
// CONVENIENCE TYPE EXPORTS
// ═══════════════════════════════════════════════════════════

export type Student = Tables<'students'>
export type StudentInsert = TablesInsert<'students'>
export type StudentUpdate = TablesUpdate<'students'>

export type StudentContact = Tables<'student_contacts'>
export type StudentContactInsert = TablesInsert<'student_contacts'>
export type StudentContactUpdate = TablesUpdate<'student_contacts'>

export type StudentAbsence = Tables<'student_absences'>
export type StudentAbsenceInsert = TablesInsert<'student_absences'>
export type StudentAbsenceUpdate = TablesUpdate<'student_absences'>

export type AbsenceSummary = Tables<'absence_summaries'>
export type AbsenceSummaryInsert = TablesInsert<'absence_summaries'>
export type AbsenceSummaryUpdate = TablesUpdate<'absence_summaries'>

export type MedicalCertificate = Tables<'medical_certificates'>
export type MedicalCertificateInsert = TablesInsert<'medical_certificates'>
export type MedicalCertificateUpdate = TablesUpdate<'medical_certificates'>

export type FamilyInteraction = Tables<'family_interactions'>
export type FamilyInteractionInsert = TablesInsert<'family_interactions'>
export type FamilyInteractionUpdate = TablesUpdate<'family_interactions'>

export type UserTask = Tables<'user_tasks'>
export type UserTaskInsert = TablesInsert<'user_tasks'>
export type UserTaskUpdate = TablesUpdate<'user_tasks'>

export type User = Tables<'users'>
export type UserInsert = TablesInsert<'users'>
export type UserUpdate = TablesUpdate<'users'>

export type WhatsAppVerifiedNumber = Tables<'whatsapp_verified_numbers'>
export type WhatsAppVerifiedNumberInsert = TablesInsert<'whatsapp_verified_numbers'>
export type WhatsAppVerifiedNumberUpdate = TablesUpdate<'whatsapp_verified_numbers'>

export type AutomationExecution = Tables<'automation_executions'>
export type AutomationExecutionInsert = TablesInsert<'automation_executions'>
export type AutomationExecutionUpdate = TablesUpdate<'automation_executions'>

// View types
export type StudentWithAbsences = Views<'students_with_absences'>
export type StudentComplete = Views<'students_complete'>
