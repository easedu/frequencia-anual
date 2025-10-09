/**
 * Generic Firebase document hook with standardized caching
 * Eliminates duplicate Firebase document operations
 * Uses centralized cache.ts for consistency across the application
 */

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { logger } from '@/utils/logger';
import { cache } from '@/utils/cache';

export interface UseFirebaseDocOptions {
  /** Enable real-time listener with onSnapshot. Default: false */
  realtime?: boolean;
  /** Cache time-to-live in milliseconds. Default: 5 minutes */
  cacheTime?: number;
}

export interface UseFirebaseDocReturn<T> {
  /** Document data or null if not found */
  data: T | null;
  /** Loading state */
  loading: boolean;
  /** Error object if any */
  error: Error | null;
  /** Update document with partial data (merge) */
  update: (newData: Partial<T>) => Promise<void>;
  /** Manually refresh document from Firestore */
  refresh: () => Promise<void>;
}

/**
 * Generic hook for Firebase document operations with standardized caching
 *
 * @template T - Document data type
 * @param path - Firestore document path (e.g., "2025/ano_letivo")
 * @param options - Hook configuration options
 *
 * @example
 * ```typescript
 * // One-time fetch with cache
 * const { data, loading, error, refresh } = useFirebaseDoc<AnoLetivo>('2025/ano_letivo');
 *
 * // Real-time listener
 * const { data, update } = useFirebaseDoc<UserProfile>(
 *   `users/${userId}`,
 *   { realtime: true }
 * );
 *
 * // Custom cache time (10 minutes)
 * const { data } = useFirebaseDoc('2025/ano_letivo', { cacheTime: 10 * 60 * 1000 });
 * ```
 *
 * @remarks
 * - Uses centralized cache.ts for consistency
 * - Supports real-time updates via onSnapshot
 * - Automatic cache invalidation on updates
 * - Type-safe with TypeScript generics
 */
export function useFirebaseDoc<T = DocumentData>(
  path: string,
  options: UseFirebaseDocOptions = {}
): UseFirebaseDocReturn<T> {
  const { realtime = false, cacheTime = 5 * 60 * 1000 } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cached = cache.get<T>('firebase-doc', { path });

      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }

      const pathSegments = path.split('/');
      const docRef = doc(db, pathSegments[0], ...pathSegments.slice(1));
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const docData = docSnap.data() as T;
        setData(docData);

        // Update cache
        cache.set('firebase-doc', { path }, docData, cacheTime);
      } else {
        setData(null);
      }
    } catch (err) {
      const error = err as Error;
      logger.error(`Erro ao buscar documento ${path}`, { path }, error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  const updateData = async (newData: Partial<T>) => {
    try {
      const pathSegments = path.split('/');
      const docRef = doc(db, pathSegments[0], ...pathSegments.slice(1));
      await setDoc(docRef, newData, { merge: true });

      // Update local state
      setData(prev => prev ? { ...prev, ...newData } : newData as T);

      // Update cache
      const updatedData = data ? { ...data, ...newData } : newData as T;
      cache.set('firebase-doc', { path }, updatedData, cacheTime);

      logger.info(`Documento ${path} atualizado com sucesso`, { path });
    } catch (err) {
      const error = err as Error;
      logger.error(`Erro ao atualizar documento ${path}`, { path }, error);
      setError(error);
      throw error;
    }
  };

  useEffect(() => {
    if (realtime) {
      // Real-time listener
      const pathSegments = path.split('/');
      const docRef = doc(db, pathSegments[0], ...pathSegments.slice(1));
      const unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const docData = docSnap.data() as T;
            setData(docData);

            // Update cache
            cache.set('firebase-doc', { path }, docData, cacheTime);
          } else {
            setData(null);
          }
          setLoading(false);
        },
        (err) => {
          logger.error(`Erro no listener real-time para ${path}`, { path }, err as Error);
          setError(err as Error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } else {
      // One-time fetch
      fetchData();
    }
  }, [path, realtime]);

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
 * @returns Academic year data with 10-minute cache
 *
 * @example
 * ```typescript
 * const { data: anoLetivo, loading } = useAcademicYear();
 * ```
 */
export function useAcademicYear() {
  return useFirebaseDoc('2025/ano_letivo', { cacheTime: 10 * 60 * 1000 });
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
 * await update({ displayName: 'New Name' });
 * ```
 */
export function useUserProfile(userId: string) {
  return useFirebaseDoc(`users/${userId}`, { realtime: true });
}