/**
 * 🔐 SUPABASE ADMIN CLIENT (SERVER-SIDE)
 *
 * Supabase client with elevated privileges (service_role key).
 * **ONLY USE ON SERVER-SIDE** (API routes, Server Components, scripts).
 *
 * ⚠️ NEVER expose this client in the browser!
 * ⚠️ NEVER import in Client Components!
 *
 * CORRECT USAGE:
 * - ✅ API Routes: src/app/api/...
 * - ✅ Server Components: export default async function Page()
 * - ✅ Migration scripts: scripts/...
 *
 * WRONG USAGE:
 * - ❌ Client Components ('use client')
 * - ❌ Custom hooks (useState, useEffect, etc)
 * - ❌ Code that runs in the browser
 *
 * SCHEMA VERSION: V2 (Standardized - English + snake_case)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabaseClient'

let _supabaseAdminInstance: SupabaseClient<Database> | null = null

/**
 * Get Supabase admin client instance (lazy initialization)
 *
 * Only creates the client when first accessed, not at module import time.
 * This prevents build errors when environment variables are not available.
 */
function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (_supabaseAdminInstance) {
    return _supabaseAdminInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      '❌ Missing Supabase service role key!\n' +
      'Make sure to set:\n' +
      '- NEXT_PUBLIC_SUPABASE_URL\n' +
      '- SUPABASE_SERVICE_ROLE_KEY\n' +
      'in your Vercel environment variables\n\n' +
      '⚠️ IMPORTANT: Never expose SUPABASE_SERVICE_ROLE_KEY in client-side code!'
    )
  }

  _supabaseAdminInstance = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  return _supabaseAdminInstance
}

/**
 * Supabase client with administrator privileges
 *
 * Features:
 * - Bypasses RLS (Row Level Security)
 * - Full access to all tables
 * - No authentication limitations
 *
 * Use with caution!
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop: string | symbol) {
    const client = getSupabaseAdminClient();
    const value = client[prop as keyof SupabaseClient<Database>];
    return typeof value === 'function' ? value.bind(client) : value;
  }
})

// ═══════════════════════════════════════════════════════════
// BATCH OPERATION HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Insert multiple records in batches (avoid timeout)
 *
 * @example
 * ```ts
 * await batchInsert('students', students, 100)
 * ```
 */
export async function batchInsert<T extends keyof Database['public']['Tables']>(
  table: T,
  data: Array<Database['public']['Tables'][T]['Insert']>,
  batchSize = 100
): Promise<Array<Database['public']['Tables'][T]['Row']>> {
  const results: Array<Database['public']['Tables'][T]['Row']> = []

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)

    const { data: inserted, error } = await supabaseAdmin
      .from(table)
      .insert(batch as never)
      .select()

    if (error) {
      console.error(`Erro no batch ${i / batchSize + 1}:`, error)
      throw error
    }

    if (inserted) {
      results.push(...(inserted as unknown as Array<Database['public']['Tables'][T]['Row']>))
    }
    console.log(`✅ Batch ${i / batchSize + 1}: ${batch.length} registros inseridos`)
  }

  return results
}

/**
 * Update multiple records in batches
 *
 * @example
 * ```ts
 * await batchUpdate('students', updates, 100)
 * ```
 */
export async function batchUpdate<T extends keyof Database['public']['Tables']>(
  table: T,
  updates: Array<{ id: string } & Partial<Database['public']['Tables'][T]['Update']>>,
  batchSize = 100
): Promise<Array<Database['public']['Tables'][T]['Row']>> {
  const results: Array<Database['public']['Tables'][T]['Row']> = []

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize)

    for (const update of batch) {
      const { id, ...data } = update

      const { data: updated, error } = await supabaseAdmin
        .from(table)
        .update(data as never)
        .eq('id', id as never)
        .select()

      if (error) {
        console.error(`Erro ao atualizar ${id}:`, error)
        throw error
      }

      if (updated) {
        results.push(...(updated as unknown as Array<Database['public']['Tables'][T]['Row']>))
      }
    }

    console.log(`✅ Batch ${i / batchSize + 1}: ${batch.length} registros atualizados`)
  }

  return results
}

/**
 * Delete multiple records in batches
 *
 * @example
 * ```ts
 * await batchDelete('student_absences', ['id1', 'id2', 'id3'])
 * ```
 */
export async function batchDelete<T extends keyof Database['public']['Tables']>(
  table: T,
  ids: string[],
  batchSize = 100
): Promise<number> {
  let deletedCount = 0

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize)

    const { error, count } = await supabaseAdmin
      .from(table)
      .delete()
      .in('id', batch as never)

    if (error) {
      console.error(`Erro no batch ${i / batchSize + 1}:`, error)
      throw error
    }

    deletedCount += count || 0
    console.log(`✅ Batch ${i / batchSize + 1}: ${count} registros deletados`)
  }

  return deletedCount
}

// ═══════════════════════════════════════════════════════════
// REFERENTIAL INTEGRITY VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Validate referential integrity of a table (find orphan records)
 *
 * @example
 * ```ts
 * const orphans = await findOrphans('student_contacts', 'student_id', 'students')
 * console.log(`${orphans.length} orphan contacts found`)
 * ```
 */
export async function findOrphans(
  childTable: keyof Database['public']['Tables'],
  foreignKey: string,
  parentTable: keyof Database['public']['Tables']
): Promise<Record<string, unknown>[]> {
  // Buscar todos os IDs da tabela pai
  const { data: parents } = await supabaseAdmin
    .from(parentTable)
    .select('id')

  const parentIds = new Set(parents?.map((p) => (p as Record<string, string>).id) || [])

  // Buscar todos os registros da tabela filha
  const { data: children } = await supabaseAdmin
    .from(childTable)
    .select(`id, ${foreignKey}`)

  // Filtrar órfãos (foreign key não existe na tabela pai)
  const orphans = (children || []).filter(
    (child) => {
      const record = child as Record<string, unknown>;
      return !parentIds.has(record[foreignKey] as string);
    }
  )

  return orphans as Record<string, unknown>[]
}

/**
 * Count records in a table
 *
 * @example
 * ```ts
 * const count = await countRecords('students')
 * console.log(`Total students: ${count}`)
 * ```
 */
export async function countRecords(table: keyof Database['public']['Tables']) {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select('*', { count: 'exact', head: true })

  if (error) throw error

  return count || 0
}
