/**
 * Sistema de cache avançado para otimização de performance
 * Implementa cache em memória, localStorage e estratégias de invalidação
 */

"use client";

import { PERFORMANCE_CONFIG } from '@/config/constants';
import { logger } from './logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

class CacheManager {
  private memoryCache = new Map<string, CacheEntry<unknown>>();
  private maxMemoryEntries = 100;

  /**
   * Gera chave de cache a partir de parâmetros
   */
  private generateKey(namespace: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, unknown>);

    return `${namespace}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Verifica se entrada do cache ainda é válida
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Remove entradas expiradas do cache em memória
   */
  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.memoryCache.delete(key);
      }
    }

    // Remove entradas menos usadas se cache estiver cheio
    if (this.memoryCache.size > this.maxMemoryEntries) {
      const entries = Array.from(this.memoryCache.entries())
        .sort(([, a], [, b]) => a.hits - b.hits);
      
      const toRemove = entries.slice(0, entries.length - this.maxMemoryEntries);
      toRemove.forEach(([key]) => this.memoryCache.delete(key));
    }
  }

  /**
   * Obtém dados do cache em memória
   */
  get<T>(namespace: string, params: Record<string, unknown>): T | null {
    const key = this.generateKey(namespace, params);
    const entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;

    if (entry && this.isValid(entry)) {
      entry.hits++;
      logger.debug('Cache hit', { namespace, key });
      return entry.data;
    }

    if (entry) {
      this.memoryCache.delete(key);
      logger.debug('Cache expired', { namespace, key });
    }

    return null;
  }

  /**
   * Armazena dados no cache em memória
   */
  set<T>(
    namespace: string,
    params: Record<string, unknown>,
    data: T,
    ttl: number = PERFORMANCE_CONFIG.CACHE_TTL_MS
  ): void {
    const key = this.generateKey(namespace, params);
    
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
    });

    this.cleanup();
    logger.debug('Cache set', { namespace, key, ttl });
  }

  /**
   * Remove entrada específica do cache
   */
  invalidate(namespace: string, params: Record<string, unknown>): void {
    const key = this.generateKey(namespace, params);
    this.memoryCache.delete(key);
    logger.debug('Cache invalidated', { namespace, key });
  }

  /**
   * Remove todas as entradas de um namespace
   */
  invalidateNamespace(namespace: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(`${namespace}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.memoryCache.delete(key));
    logger.debug('Namespace invalidated', { namespace, count: keysToDelete.length });
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.memoryCache.clear();
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats() {
    const entries = Array.from(this.memoryCache.entries());
    const totalHits = entries.reduce((sum, [, entry]) => sum + entry.hits, 0);
    const validEntries = entries.filter(([, entry]) => this.isValid(entry));

    return {
      totalEntries: entries.length,
      validEntries: validEntries.length,
      expiredEntries: entries.length - validEntries.length,
      totalHits,
      memoryUsage: this.memoryCache.size,
    };
  }
}

export const cache = new CacheManager();

/**
 * Hook para cache com React
 */
export const useCachedData = <T>(
  namespace: string,
  params: Record<string, unknown>,
  fetcher: () => Promise<T>,
  ttl?: number
) => {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      // Primeiro, tenta obter do cache
      const cached = cache.get<T>(namespace, params);
      if (cached) {
        setData(cached);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetcher();
        if (!isCancelled) {
          cache.set(namespace, params, result, ttl);
          setData(result);
        }
      } catch (error) {
        if (!isCancelled) {
          setError(error as Error);
          logger.error('Cached data fetch failed', { namespace, params }, error as Error);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [namespace, JSON.stringify(params)]);

  const invalidate = () => {
    cache.invalidate(namespace, params);
  };

  return { data, loading, error, invalidate };
};

/**
 * Cache específico para localStorage (persistente)
 */
class PersistentCache {
  private prefix = 'app-cache-';

  private generateKey(namespace: string, params: Record<string, unknown>): string {
    return `${this.prefix}${namespace}-${btoa(JSON.stringify(params))}`;
  }

  get<T>(namespace: string, params: Record<string, unknown>, ttl: number = PERFORMANCE_CONFIG.CACHE_TTL_MS): T | null {
    try {
      const key = this.generateKey(namespace, params);
      const item = localStorage.getItem(key);
      
      if (!item) return null;

      const parsed = JSON.parse(item);
      const { data, timestamp } = parsed;

      if (Date.now() - timestamp > ttl) {
        localStorage.removeItem(key);
        return null;
      }

      return data;
    } catch (error) {
      logger.warn('Persistent cache get failed', { namespace }, error as Error);
      return null;
    }
  }

  set<T>(namespace: string, params: Record<string, unknown>, data: T): void {
    try {
      const key = this.generateKey(namespace, params);
      const item = {
        data,
        timestamp: Date.now(),
      };
      
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      logger.warn('Persistent cache set failed', { namespace }, error as Error);
    }
  }

  clear(namespace?: string): void {
    try {
      if (namespace) {
        const prefix = `${this.prefix}${namespace}`;
        const keysToRemove: string[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(prefix)) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } else {
        const keysToRemove: string[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(this.prefix)) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      logger.warn('Persistent cache clear failed', { namespace }, error as Error);
    }
  }
}

export const persistentCache = new PersistentCache();

// Adicione o import do React no topo do arquivo
import React from 'react';