/**
 * Generic Supabase document hook with standardized caching
 * Replaces Firebase document operations with Supabase real-time subscriptions
 * Uses centralized cache.ts for consistency across the application
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';
import { cache } from '@/utils/cache';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UseSupabaseDocOptions {
  /** Enable real-time listener with Supabase subscriptions. Default: false */
  realtime?: boolean;
  /** Cache time-to-live in milliseconds. Default: 5 minutes */
  cacheTime?: number;
  /** Primary key column name. Default: 'id' */
  idColumn?: string;
}

export interface UseSupabaseDocReturn<T> {
  /** Document data or null if not found */
  data: T | null;
  /** Loading state */
  loading: boolean;
  /** Error object if any */
  error: Error | null;
  /** Update document with partial data */
  update: (newData: Partial<T>) => Promise<void>;
  /** Manually refresh document from Supabase */
  refresh: () => Promise<void>;
}

/**
 * Parse Supabase table and row identifier from path
 *
 * @param path - Path in format "table/id" or "table/column/value"
 * @returns { table, idColumn, idValue }
 *
 * @example
 * "academic_years/2025" → { table: "academic_years", idColumn: "year", idValue: "2025" }
 * "users/user-uuid" → { table: "users", idColumn: "id", idValue: "user-uuid" }
 */
function parsePath(path: string, defaultIdColumn: string = 'id'): {
  table: string;
  idColumn: string;
  idValue: string;
} {
  const segments = path.split('/');

  if (segments.length < 2) {
    throw new Error(`Path inválido: "${path}". Formato esperado: "table/id" ou "table/column/value"`);
  }

  // Map Firebase paths to Supabase tables
  const tableMap: Record<string, { table: string; idColumn: string }> = {
    '2025': { table: 'academic_years', idColumn: 'year' },
    '2024': { table: 'academic_years', idColumn: 'year' },
    'users': { table: 'users', idColumn: 'user_id' },
    'students': { table: 'students', idColumn: 'student_id' },
    'academic_years': { table: 'academic_years', idColumn: 'year' },
  };

  const firstSegment = segments[0];
  const mapped = tableMap[firstSegment];

  if (mapped) {
    return {
      table: mapped.table,
      idColumn: mapped.idColumn,
      idValue: segments[1],
    };
  }

  // Default: assume first segment is table, second is ID
  return {
    table: firstSegment,
    idColumn: defaultIdColumn,
    idValue: segments[1],
  };
}

/**
 * Generic hook for Supabase document operations with standardized caching
 *
 * @template T - Document data type
 * @param path - Document path (e.g., "2025/ano_letivo" → academic_years where year = '2025')
 * @param options - Hook configuration options
 *
 * @example
 * ```typescript
 * // One-time fetch with cache
 * const { data, loading, error, refresh } = useSupabaseDoc<AnoLetivo>('2025/ano_letivo');
 *
 * // Real-time listener
 * const { data, update } = useSupabaseDoc<UserProfile>(
 *   `users/${userId}`,
 *   { realtime: true }
 * );
 *
 * // Custom cache time (10 minutes)
 * const { data } = useSupabaseDoc('2025/ano_letivo', { cacheTime: 10 * 60 * 1000 });
 * ```
 *
 * @remarks
 * - Uses centralized cache.ts for consistency
 * - Supports real-time updates via Supabase subscriptions
 * - Automatic cache invalidation on updates
 * - Type-safe with TypeScript generics
 */
export function useSupabaseDoc<T = any>(
  path: string,
  options: UseSupabaseDocOptions = {}
): UseSupabaseDocReturn<T> {
  const { realtime = false, cacheTime = 5 * 60 * 1000, idColumn: customIdColumn } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cached = cache.get<T>('supabase-doc', { path });

      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }

      // Parse path to Supabase query
      const { table, idColumn, idValue } = parsePath(path, customIdColumn);

      const { data: result, error: queryError } = await supabase
        .from(table)
        .select('*')
        .eq(idColumn, idValue)
        .single();

      if (queryError) {
        if (queryError.code === 'PGRST116') {
          // Not found
          setData(null);
          logger.warn(`Documento não encontrado: ${path}`, { path, table, idColumn, idValue });
        } else {
          throw queryError;
        }
      } else {
        setData(result as T);

        // Update cache
        cache.set('supabase-doc', { path }, result as T, cacheTime);
      }
    } catch (err) {
      const error = err as Error;
      logger.error(`Erro ao buscar documento ${path}`, { path }, error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [path, cacheTime, customIdColumn]);

  const updateData = useCallback(async (newData: Partial<T>) => {
    try {
      const { table, idColumn, idValue } = parsePath(path, customIdColumn);

      // Type assertion needed because Supabase doesn't know table types at runtime
      // Cast supabase client to any to bypass TypeScript's strict table typing
      const supabaseAny = supabase as any;
      const { data: result, error: updateError } = await supabaseAny
        .from(table)
        .update(newData)
        .eq(idColumn, idValue)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update local state
      setData(result as T);

      // Update cache
      cache.set('supabase-doc', { path }, result as T, cacheTime);

      logger.info(`Documento ${path} atualizado com sucesso`, { path });
    } catch (err) {
      const error = err as Error;
      logger.error(`Erro ao atualizar documento ${path}`, { path }, error);
      setError(error);
      throw error;
    }
  }, [path, cacheTime, customIdColumn]);

  useEffect(() => {
    if (realtime) {
      // Real-time subscription
      const { table, idColumn, idValue } = parsePath(path, customIdColumn);
      let channel: RealtimeChannel;

      const setupRealtime = async () => {
        // Fetch initial data
        const { data: initialData, error: initialError } = await supabase
          .from(table)
          .select('*')
          .eq(idColumn, idValue)
          .single();

        if (initialError) {
          if (initialError.code === 'PGRST116') {
            setData(null);
          } else {
            logger.error(`Erro ao buscar dados iniciais: ${path}`, { path }, initialError as Error);
            setError(initialError as Error);
          }
        } else {
          setData(initialData as T);
          cache.set('supabase-doc', { path }, initialData as T, cacheTime);
        }

        setLoading(false);

        // Setup real-time subscription
        channel = supabase
          .channel(`doc:${table}:${idValue}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: table,
              filter: `${idColumn}=eq.${idValue}`,
            },
            (payload) => {
              logger.info(`Real-time update em ${path}`, { payload });

              if (payload.eventType === 'DELETE') {
                setData(null);
                cache.invalidate('supabase-doc', { path });
              } else {
                const newData = payload.new as T;
                setData(newData);
                cache.set('supabase-doc', { path }, newData, cacheTime);
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              logger.info(`Inscrito em real-time: ${path}`);
            } else if (status === 'CHANNEL_ERROR') {
              logger.error(`Erro no canal real-time: ${path}`, { path }, new Error('Channel error'));
            }
          });
      };

      setupRealtime();

      return () => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      };
    } else {
      // One-time fetch
      fetchData();
    }
  }, [path, realtime, cacheTime, customIdColumn, fetchData]);

  return {
    data,
    loading,
    error,
    update: updateData,
    refresh: fetchData,
  };
}

/**
 * Specialized hook for academic year data (ano letivo)
 *
 * @param year - Year (e.g., "2025")
 * @returns Academic year data with 10-minute cache
 *
 * @example
 * ```typescript
 * const { data: anoLetivo, loading } = useAcademicYear("2025");
 * ```
 */
export function useAcademicYear(year: string = '2025') {
  return useSupabaseDoc(`${year}/ano_letivo`, { cacheTime: 10 * 60 * 1000 });
}

/**
 * Specialized hook for user profile with real-time updates
 *
 * @param userId - User ID for profile document
 * @returns User profile data with real-time listener
 *
 * @example
 * ```typescript
 * const { data: profile, update } = useUserProfile(currentUserId);
 * await update({ display_name: 'New Name' });
 * ```
 */
export function useUserProfile(userId: string) {
  return useSupabaseDoc(`users/${userId}`, { realtime: true });
}
