/**
 * Generic Firebase document hook
 * Eliminates duplicate Firebase document operations
 */

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { logger } from '@/utils/logger';

export interface UseFirebaseDocOptions {
  realtime?: boolean;
  cacheTime?: number;
}

export interface UseFirebaseDocReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  update: (newData: Partial<T>) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Generic hook for Firebase document operations
 */
export function useFirebaseDoc<T = DocumentData>(
  path: string,
  options: UseFirebaseDocOptions = {}
): UseFirebaseDocReturn<T> {
  const { realtime = false, cacheTime = 5 * 60 * 1000 } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Cache management
  const cacheKey = `firebase_doc_${path}`;
  const cacheTimeKey = `firebase_doc_time_${path}`;

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
          setData(JSON.parse(cached));
          setLoading(false);
          return;
        }
      }

      const docRef = doc(db, ...path.split('/'));
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const docData = docSnap.data() as T;
        setData(docData);
        
        // Update cache
        sessionStorage.setItem(cacheKey, JSON.stringify(docData));
        sessionStorage.setItem(cacheTimeKey, Date.now().toString());
      } else {
        setData(null);
      }
    } catch (err) {
      const error = err as Error;
      logger.error(`Erro ao buscar documento ${path}`, error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  const updateData = async (newData: Partial<T>) => {
    try {
      const docRef = doc(db, ...path.split('/'));
      await setDoc(docRef, newData, { merge: true });
      
      // Update local state
      setData(prev => prev ? { ...prev, ...newData } : newData as T);
      
      // Update cache
      const updatedData = data ? { ...data, ...newData } : newData as T;
      sessionStorage.setItem(cacheKey, JSON.stringify(updatedData));
      sessionStorage.setItem(cacheTimeKey, Date.now().toString());
      
      logger.info(`Documento ${path} atualizado com sucesso`);
    } catch (err) {
      const error = err as Error;
      logger.error(`Erro ao atualizar documento ${path}`, error);
      setError(error);
      throw error;
    }
  };

  useEffect(() => {
    if (realtime) {
      // Real-time listener
      const docRef = doc(db, ...path.split('/'));
      const unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const docData = docSnap.data() as T;
            setData(docData);
            
            // Update cache
            sessionStorage.setItem(cacheKey, JSON.stringify(docData));
            sessionStorage.setItem(cacheTimeKey, Date.now().toString());
          } else {
            setData(null);
          }
          setLoading(false);
        },
        (err) => {
          logger.error(`Erro no listener real-time para ${path}`, err as Error);
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
 * Specialized hook for academic year data
 */
export function useAcademicYear() {
  return useFirebaseDoc('2025/ano_letivo', { cacheTime: 10 * 60 * 1000 });
}

/**
 * Specialized hook for user profile
 */
export function useUserProfile(userId: string) {
  return useFirebaseDoc(`users/${userId}`, { realtime: true });
}