/**
 * Hook otimizado para operações Supabase
 * Implementa cache, paginação manual e retry logic
 * Substitui useFirebase.ts com funcionalidade equivalente
 *
 * @deprecated Este hook NÃO está sendo usado no projeto.
 * Foi criado durante a migração Firestore → Supabase mas nunca utilizado.
 *
 * RECOMENDAÇÃO:
 * - Para operações client-side com RLS: Use hooks específicos (useStudents, useInteractions, etc)
 * - Para operações complexas: Use APIs REST (/api/students, /api/absences, etc)
 * - Este hook pode ser removido em versões futuras
 *
 * ÚLTIMA VERIFICAÇÃO: 2025-01-18 (Nenhum uso encontrado no projeto)
 */

"use client";

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { cache } from '@/utils/cache';
import { logger } from '@/utils/logger';
import { PERFORMANCE_CONFIG } from '@/config/constants';

interface PaginationState {
  offset: number;
  hasMore: boolean;
  currentPage: number;
}

interface UseSupabaseCollectionOptions {
  cacheKey?: string;
  cacheTTL?: number;
  enablePagination?: boolean;
  pageSize?: number;
  filters?: Array<{ column: string; operator: string; value: unknown }>;
  orderBy?: { column: string; ascending?: boolean };
}

interface UseSupabaseCollectionResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  hasMore: boolean;
  totalCount: number;
}

/**
 * Hook otimizado para consultar tabelas Supabase com cache e paginação manual
 *
 * @template T - Tipo dos dados da tabela
 * @param table - Nome da tabela Supabase
 * @param options - Opções de configuração
 *
 * @example
 * ```typescript
 * // Fetch simples com cache
 * const { data, loading } = useSupabaseCollection<Student>('students', {
 *   cacheKey: 'all-students',
 *   cacheTTL: 5 * 60 * 1000
 * });
 *
 * // Com filtros e ordenação
 * const { data } = useSupabaseCollection<Student>('students', {
 *   filters: [
 *     { column: 'status', operator: 'eq', value: 'ATIVO' },
 *     { column: 'class', operator: 'eq', value: '5A' }
 *   ],
 *   orderBy: { column: 'name', ascending: true }
 * });
 *
 * // Com paginação manual
 * const { data, loadMore, hasMore } = useSupabaseCollection<Student>('students', {
 *   enablePagination: true,
 *   pageSize: 50
 * });
 * ```
 */
export function useSupabaseCollection<T = Record<string, unknown>>(
  table: string,
  options: UseSupabaseCollectionOptions = {}
): UseSupabaseCollectionResult<T> {
  const {
    cacheKey,
    cacheTTL,
    enablePagination = false,
    pageSize = PERFORMANCE_CONFIG.PAGINATION_SIZE,
    filters = [],
    orderBy
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    offset: 0,
    hasMore: true,
    currentPage: 0
  });

  const fetchData = useCallback(async (isLoadMore = false) => {
    const startTime = performance.now();

    try {
      setLoading(true);
      setError(null);

      // Verificar cache primeiro (apenas para primeira página)
      if (!isLoadMore && cacheKey) {
        const cached = cache.get<T[]>('supabase-collection', { table, cacheKey });
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
      }

      // 🔥 PAGINAÇÃO MANUAL: Supabase tem limite de 1000 registros por padrão
      // Usar .range() para buscar TODOS os dados em chunks
      let allData: T[] = [];
      let currentOffset = isLoadMore ? pagination.offset : 0;
      let hasMoreData = true;

      while (hasMoreData && (!enablePagination || allData.length < pageSize)) {
        // Build query
        let query = supabase.from(table).select('*');

        // Apply filters
        filters.forEach(filter => {
          type QueryWithFilters = typeof query & Record<string, (column: string, value: unknown) => typeof query>;
          query = (query as QueryWithFilters)[filter.operator](filter.column, filter.value);
        });

        // Apply ordering
        if (orderBy) {
          query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
        }

        // Apply pagination
        const rangeEnd = currentOffset + (enablePagination ? pageSize : 1000) - 1;
        query = query.range(currentOffset, rangeEnd);

        const { data: chunk, error: queryError } = await query;

        if (queryError) throw queryError;

        if (chunk && chunk.length > 0) {
          allData.push(...(chunk as T[]));
          currentOffset += chunk.length;

          // Check if we got less than requested (means no more data)
          hasMoreData = chunk.length === (enablePagination ? pageSize : 1000);

          // If pagination enabled and we got enough data, stop
          if (enablePagination && allData.length >= pageSize) {
            hasMoreData = chunk.length === pageSize;
            break;
          }
        } else {
          hasMoreData = false;
        }
      }

      // Atualizar estado
      if (isLoadMore) {
        setData(prev => [...prev, ...allData]);
      } else {
        setData(allData);
        // Salvar no cache apenas a primeira página
        if (cacheKey) {
          cache.set('supabase-collection', { table, cacheKey }, allData, cacheTTL);
        }
      }

      // Atualizar paginação
      if (enablePagination) {
        setPagination({
          offset: currentOffset,
          hasMore: hasMoreData,
          currentPage: isLoadMore ? pagination.currentPage + 1 : 1
        });
      }

      const duration = performance.now() - startTime;
      logger.performanceLog('Supabase collection fetch', duration, {
        table,
        resultCount: allData.length,
        isLoadMore,
        page: pagination.currentPage,
        offset: currentOffset
      });

    } catch (err) {
      const error = err as Error;
      setError(error);
      logger.error('Supabase collection fetch failed', { table, isLoadMore, offset: pagination.offset }, error);
    } finally {
      setLoading(false);
    }
  }, [table, filters, orderBy, enablePagination, pageSize, pagination.offset, pagination.currentPage, cacheKey, cacheTTL]);

  const loadMore = useCallback(() => {
    if (!loading && pagination.hasMore) {
      return fetchData(true);
    }
    return Promise.resolve();
  }, [fetchData, loading, pagination.hasMore]);

  const refresh = useCallback(async () => {
    // Limpar cache
    if (cacheKey) {
      cache.invalidate('supabase-collection', { table, cacheKey });
    }

    // Reset paginação
    setPagination({
      offset: 0,
      hasMore: true,
      currentPage: 0
    });

    return fetchData(false);
  }, [fetchData, cacheKey, table]);

  // Carregar dados inicialmente
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    loadMore,
    refresh,
    hasMore: pagination.hasMore,
    totalCount: data.length
  };
}

/**
 * Hook para operações batch otimizadas no Supabase
 *
 * @example
 * ```typescript
 * const { executeBatch, loading } = useSupabaseBatch();
 *
 * await executeBatch([
 *   { type: 'insert', table: 'students', data: { name: 'João' } },
 *   { type: 'update', table: 'students', id: '123', data: { status: 'ATIVO' } },
 *   { type: 'delete', table: 'students', id: '456' }
 * ]);
 * ```
 */
export function useSupabaseBatch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeBatch = useCallback(async (
    operations: Array<{
      type: 'insert' | 'update' | 'delete';
      table: string;
      data?: Record<string, unknown>;
      id?: string;
      idColumn?: string;
    }>
  ) => {
    if (operations.length === 0) return;

    const startTime = performance.now();
    setLoading(true);
    setError(null);

    try {
      // Agrupar operações por tipo e tabela
      const groupedOps = operations.reduce((acc, op) => {
        const key = `${op.type}-${op.table}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(op);
        return acc;
      }, {} as Record<string, typeof operations>);

      // Executar operações em paralelo
      const promises = Object.values(groupedOps).map(async (ops) => {
        const { type, table } = ops[0];

        switch (type) {
          case 'insert': {
            const insertData = ops.map(op => op.data);
            const { error: insertError } = await supabase
              .from(table)
              .insert(insertData as never);
            if (insertError) throw insertError;
            break;
          }

          case 'update': {
            // Updates precisam ser individuais (não há batch update no Supabase)
            await Promise.all(ops.map(async (op) => {
              const idColumn = op.idColumn || 'id';
              const { error: updateError } = await supabase
                .from(table)
                .update(op.data as never)
                .eq(idColumn as never, op.id as never);
              if (updateError) throw updateError;
            }));
            break;
          }

          case 'delete': {
            const ids = ops.map(op => op.id);
            const idColumn = ops[0].idColumn || 'id';
            type SupabaseWithDelete = typeof supabase & { from: (table: string) => { delete: () => { in: (column: string, values: unknown[]) => Promise<{ error: Error | null }> } } };
            const { error: deleteError } = await (supabase as SupabaseWithDelete)
              .from(table)
              .delete()
              .in(idColumn, ids);
            if (deleteError) throw deleteError;
            break;
          }
        }
      });

      await Promise.all(promises);

      const duration = performance.now() - startTime;
      logger.performanceLog('Supabase batch operation', duration, {
        operationCount: operations.length,
        batchCount: Object.keys(groupedOps).length
      });

    } catch (err) {
      const error = err as Error;
      setError(error);
      logger.error('Supabase batch operation failed', {
        operationCount: operations.length
      }, error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    executeBatch,
    loading,
    error
  };
}

/**
 * Hook para consultas com retry automático
 *
 * @example
 * ```typescript
 * const { data, loading, retry } = useSupabaseWithRetry(
 *   async () => {
 *     const { data } = await supabase.from('students').select('*');
 *     return data;
 *   },
 *   [dependency1, dependency2],
 *   3, // maxRetries
 *   1000 // retryDelay
 * );
 * ```
 */
export function useSupabaseWithRetry<T>(
  fetcher: () => Promise<T>,
  dependencies: unknown[] = [],
  maxRetries = 3,
  retryDelay = 1000
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeWithRetry = useCallback(async () => {
    let attempt = 0;
    setLoading(true);
    setError(null);

    while (attempt < maxRetries) {
      try {
        const result = await fetcher();
        setData(result);
        setLoading(false);
        return;
      } catch (err) {
        attempt++;
        const error = err as Error;

        if (attempt === maxRetries) {
          setError(error);
          logger.error(`Supabase operation failed after ${maxRetries} attempts`, {
            attempt,
            maxRetries
          }, error);
          break;
        }

        logger.warn(`Supabase operation failed, retrying...`, {
          attempt,
          maxRetries,
          nextRetryIn: retryDelay * attempt
        });

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }

    setLoading(false);
  }, [fetcher, maxRetries, retryDelay]);

  useEffect(() => {
    executeWithRetry();
  }, dependencies);

  return { data, loading, error, retry: executeWithRetry };
}

/**
 * Hook para consultas paralelas otimizadas
 *
 * @example
 * ```typescript
 * const { data, loading } = useParallelSupabaseQueries({
 *   students: async () => {
 *     const { data } = await supabase.from('students').select('*');
 *     return data || [];
 *   },
 *   absences: async () => {
 *     const { data } = await supabase.from('student_absences').select('*');
 *     return data || [];
 *   }
 * });
 *
 * // data.students e data.absences estarão disponíveis
 * ```
 */
export function useParallelSupabaseQueries<T extends Record<string, unknown>>(
  queries: Record<keyof T, () => Promise<T[keyof T]>>,
  dependencies: unknown[] = []
) {
  const [data, setData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeQueries = useCallback(async () => {
    const startTime = performance.now();
    setLoading(true);
    setError(null);

    try {
      const queryEntries = Object.entries(queries);
      const results = await Promise.all(
        queryEntries.map(async ([key, query]) => {
          try {
            const result = await query();
            return [key, result];
          } catch (err) {
            logger.error(`Parallel Supabase query failed: ${key}`, {}, err as Error);
            return [key, null];
          }
        })
      );

      const resultData = Object.fromEntries(results) as T;
      setData(resultData);

      const duration = performance.now() - startTime;
      logger.performanceLog('Parallel Supabase queries', duration, {
        queryCount: queryEntries.length
      });

    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [queries]);

  useEffect(() => {
    if (Object.keys(queries).length > 0) {
      executeQueries();
    }
  }, [queries, ...dependencies]);

  return { data, loading, error, refetch: executeQueries };
}
