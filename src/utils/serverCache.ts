/**
 * Server-side cache (funciona em API Routes e Server Components)
 * Usa Map em memória (não usa sessionStorage/localStorage)
 *
 * ⚠️ IMPORTANTE: Cache é limpo ao reiniciar o servidor
 * Para cache persistente, usar Redis/Vercel KV
 */

import { logger } from './logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

class ServerCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private maxEntries = 100;

  /**
   * Gera chave de cache
   */
  private generateKey(key: string): string {
    return key;
  }

  /**
   * Verifica se entrada ainda é válida
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Remove entradas expiradas
   */
  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
      }
    }

    // Remove entradas menos usadas se cache estiver cheio
    if (this.cache.size > this.maxEntries) {
      const entries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.hits - b.hits);

      const toRemove = entries.slice(0, entries.length - this.maxEntries);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Obtém dados do cache
   */
  get<T>(key: string): T | null {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);

    if (entry && this.isValid(entry)) {
      entry.hits++;
      logger.debug('[ServerCache] Cache hit', { key: cacheKey });
      return entry.data as T;
    }

    if (entry) {
      this.cache.delete(cacheKey);
      logger.debug('[ServerCache] Cache expired', { key: cacheKey });
    }

    return null;
  }

  /**
   * Armazena dados no cache
   */
  set<T>(key: string, data: T, ttl: number): void {
    const cacheKey = this.generateKey(key);

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
    });

    this.cleanup();
    logger.debug('[ServerCache] Cache set', { key: cacheKey, ttl: `${ttl / 1000}s` });
  }

  /**
   * Remove entrada específica
   */
  invalidate(key: string): void {
    const cacheKey = this.generateKey(key);
    this.cache.delete(cacheKey);
    logger.debug('[ServerCache] Cache invalidated', { key: cacheKey });
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
    logger.info('[ServerCache] Cache cleared');
  }

  /**
   * Obtém estatísticas
   */
  getStats() {
    const entries = Array.from(this.cache.entries());
    const totalHits = entries.reduce((sum, [, entry]) => sum + entry.hits, 0);
    const validEntries = entries.filter(([, entry]) => this.isValid(entry));

    return {
      totalEntries: entries.length,
      validEntries: validEntries.length,
      expiredEntries: entries.length - validEntries.length,
      totalHits,
      memoryUsage: this.cache.size,
    };
  }
}

export const serverCache = new ServerCacheManager();
