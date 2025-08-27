/**
 * Hook otimizado para operações Firebase
 * Implementa cache, batch operations e retry logic
 */

"use client";

import { useCallback, useEffect, useState } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  writeBatch, 
  query, 
  where, 
  orderBy, 
  limit as fbLimit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '@/firebase.config';
import { cache, useCachedData } from '@/utils/cache';
import { logger } from '@/utils/logger';
import { PERFORMANCE_CONFIG } from '@/config/constants';

interface PaginationState {
  lastDoc?: QueryDocumentSnapshot<DocumentData>;
  hasMore: boolean;
  currentPage: number;
}

interface UseFirebaseCollectionOptions {
  cacheKey?: string;
  cacheTTL?: number;
  enablePagination?: boolean;
  pageSize?: number;
  constraints?: QueryConstraint[];
}

interface UseFirebaseCollectionResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  hasMore: boolean;
  totalCount: number;
}

/**
 * Hook otimizado para consultar coleções Firebase com cache e paginação
 */
export function useFirebaseCollection<T = DocumentData>(
  path: string,
  options: UseFirebaseCollectionOptions = {}
): UseFirebaseCollectionResult<T> {
  const {
    cacheKey,
    cacheTTL,
    enablePagination = false,
    pageSize = PERFORMANCE_CONFIG.PAGINATION_SIZE,
    constraints = []
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
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
        const cached = cache.get<T[]>('firebase', { path, cacheKey });
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
      }

      const collectionRef = collection(db, path);
      let queryConstraints = [...constraints];

      // Adicionar paginação se habilitada
      if (enablePagination) {
        queryConstraints.push(fbLimit(pageSize));
        if (isLoadMore && pagination.lastDoc) {
          queryConstraints.push(startAfter(pagination.lastDoc));
        }
      }

      const q = query(collectionRef, ...queryConstraints);
      const snapshot = await getDocs(q);
      
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as T));

      // Atualizar estado
      if (isLoadMore) {
        setData(prev => [...prev, ...results]);
      } else {
        setData(results);
        // Salvar no cache apenas a primeira página
        if (cacheKey) {
          cache.set('firebase', { path, cacheKey }, results, cacheTTL);
        }
      }

      // Atualizar paginação
      if (enablePagination) {
        setPagination(prev => ({
          lastDoc: snapshot.docs[snapshot.docs.length - 1],
          hasMore: results.length === pageSize,
          currentPage: isLoadMore ? prev.currentPage + 1 : 1
        }));
      }

      const duration = performance.now() - startTime;
      logger.performanceLog('Firebase collection fetch', duration, {
        path,
        resultCount: results.length,
        isLoadMore,
        page: pagination.currentPage
      });

    } catch (err) {
      const error = err as Error;
      setError(error);
      logger.firebaseError('Collection fetch failed', error, { path, isLoadMore });
    } finally {
      setLoading(false);
    }
  }, [path, constraints, enablePagination, pageSize, pagination.lastDoc, cacheKey, cacheTTL]);

  const loadMore = useCallback(() => {
    if (!loading && pagination.hasMore) {
      return fetchData(true);
    }
    return Promise.resolve();
  }, [fetchData, loading, pagination.hasMore]);

  const refresh = useCallback(async () => {
    // Limpar cache
    if (cacheKey) {
      cache.invalidate('firebase', { path, cacheKey });
    }
    
    // Reset paginação
    setPagination({
      hasMore: true,
      currentPage: 0
    });
    
    return fetchData(false);
  }, [fetchData, cacheKey, path]);

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
 * Hook para operações batch otimizadas
 */
export function useFirebaseBatch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeBatch = useCallback(async (
    operations: Array<{
      type: 'set' | 'update' | 'delete';
      ref: any;
      data?: any;
    }>
  ) => {
    if (operations.length === 0) return;

    const startTime = performance.now();
    setLoading(true);
    setError(null);

    try {
      // Dividir em batches menores se necessário
      const maxBatchSize = PERFORMANCE_CONFIG.MAX_BATCH_SIZE;
      const batches = [];
      
      for (let i = 0; i < operations.length; i += maxBatchSize) {
        const batch = writeBatch(db);
        const batchOps = operations.slice(i, i + maxBatchSize);
        
        batchOps.forEach(({ type, ref, data }) => {
          switch (type) {
            case 'set':
              batch.set(ref, data);
              break;
            case 'update':
              batch.update(ref, data);
              break;
            case 'delete':
              batch.delete(ref);
              break;
          }
        });
        
        batches.push(batch.commit());
      }

      await Promise.all(batches);

      const duration = performance.now() - startTime;
      logger.performanceLog('Firebase batch operation', duration, {
        operationCount: operations.length,
        batchCount: batches.length
      });

    } catch (err) {
      const error = err as Error;
      setError(error);
      logger.firebaseError('Batch operation failed', error, {
        operationCount: operations.length
      });
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
 */
export function useFirebaseWithRetry<T>(
  fetcher: () => Promise<T>,
  dependencies: any[] = [],
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
          logger.error(`Firebase operation failed after ${maxRetries} attempts`, {
            attempt,
            maxRetries
          }, error);
          break;
        }

        logger.warn(`Firebase operation failed, retrying...`, {
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
 */
export function useParallelFirebaseQueries<T extends Record<string, any>>(
  queries: Record<keyof T, () => Promise<T[keyof T]>>,
  dependencies: any[] = []
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
            logger.error(`Parallel query failed: ${key}`, {}, err as Error);
            return [key, null];
          }
        })
      );

      const resultData = Object.fromEntries(results) as T;
      setData(resultData);

      const duration = performance.now() - startTime;
      logger.performanceLog('Parallel Firebase queries', duration, {
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
  }, dependencies);

  return { data, loading, error, refetch: executeQueries };
}