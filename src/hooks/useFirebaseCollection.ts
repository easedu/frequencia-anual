/**
 * Generic Firebase collection hook
 * Eliminates duplicate Firebase collection operations
 */

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit, onSnapshot, QueryConstraint } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { logger } from '@/utils/logger';

export interface UseFirebaseCollectionOptions {
  realtime?: boolean;
  cacheTime?: number;
  constraints?: QueryConstraint[];
}

export interface UseFirebaseCollectionReturn<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  count: number;
}

/**
 * Generic hook for Firebase collection operations
 */
export function useFirebaseCollection<T = any>(
  path: string,
  options: UseFirebaseCollectionOptions = {}
): UseFirebaseCollectionReturn<T> {
  const { realtime = false, cacheTime = 5 * 60 * 1000, constraints = [] } = options;
  
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [count, setCount] = useState(0);

  // Cache management
  const cacheKey = `firebase_collection_${path}_${JSON.stringify(constraints)}`;
  const cacheTimeKey = `firebase_collection_time_${path}_${JSON.stringify(constraints)}`;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTimestamp = sessionStorage.getItem(cacheTimeKey);
      
      if (cached && cacheTimestamp) {
        const age = Date.now() - parseInt(cacheTimestamp);
        if (age < cacheTime) {
          const cachedData = JSON.parse(cached);
          setData(cachedData);
          setCount(cachedData.length);
          setLoading(false);
          return;
        }
      }

      const collectionRef = collection(db, ...path.split('/'));
      const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
      
      const snapshot = await getDocs(q);
      const docs: T[] = [];
      
      snapshot.forEach((doc) => {
        docs.push({
          id: doc.id,
          ...doc.data()
        } as T);
      });

      setData(docs);
      setCount(docs.length);
      
      // Update cache
      sessionStorage.setItem(cacheKey, JSON.stringify(docs));
      sessionStorage.setItem(cacheTimeKey, Date.now().toString());
      
    } catch (err) {
      const error = err as Error;
      logger.error(`Erro ao buscar coleção ${path}`, error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (realtime) {
      // Real-time listener
      const collectionRef = collection(db, ...path.split('/'));
      const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs: T[] = [];
          
          snapshot.forEach((doc) => {
            docs.push({
              id: doc.id,
              ...doc.data()
            } as T);
          });

          setData(docs);
          setCount(docs.length);
          
          // Update cache
          sessionStorage.setItem(cacheKey, JSON.stringify(docs));
          sessionStorage.setItem(cacheTimeKey, Date.now().toString());
          
          setLoading(false);
        },
        (err) => {
          logger.error(`Erro no listener real-time para coleção ${path}`, err as Error);
          setError(err as Error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } else {
      // One-time fetch
      fetchData();
    }
  }, [path, JSON.stringify(constraints), realtime]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    count,
  };
}

/**
 * Specialized hook for absence records
 */
export function useAbsenceRecords() {
  return useFirebaseCollection('2025/faltas/controle', {
    cacheTime: 2 * 60 * 1000, // 2 minutes cache
  });
}

/**
 * Specialized hook for users
 */
export function useUsers() {
  return useFirebaseCollection('users', {
    constraints: [orderBy('createdAt', 'desc')],
    cacheTime: 10 * 60 * 1000, // 10 minutes cache
  });
}

/**
 * Hook for filtered absence records by student
 */
export function useStudentAbsences(estudanteId: string) {
  return useFirebaseCollection('2025/faltas/controle', {
    constraints: [where('estudanteId', '==', estudanteId)],
    realtime: true,
  });
}

/**
 * Hook for absence records by date range
 */
export function useAbsencesByDateRange(startDate: string, endDate: string) {
  return useFirebaseCollection('2025/faltas/controle', {
    constraints: [
      where('data', '>=', startDate),
      where('data', '<=', endDate)
    ],
  });
}