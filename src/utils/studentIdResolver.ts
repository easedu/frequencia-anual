/**
 * Student ID Resolver (FRONTEND - DEPRECATED)
 *
 * @deprecated Este arquivo NÃO está mais sendo usado no projeto.
 *
 * MIGRAÇÃO COMPLETA:
 * - Todas as APIs agora usam @/app/api/_utils/studentIdResolver (backend)
 * - Resolução de UUID acontece no servidor (não no cliente)
 * - Este arquivo foi substituído durante refatoração das Fases 1-4
 *
 * ANTES (❌ Padrão antigo):
 * ```typescript
 * // Frontend resolvia UUID antes de chamar API
 * const internalId = await resolveToInternalId(firebaseUUID);
 * const response = await fetch(`/api/students?studentId=${internalId}`);
 * ```
 *
 * AGORA (✅ Padrão novo):
 * ```typescript
 * // Backend resolve UUID internamente
 * const response = await fetch(`/api/students?estudanteId=${firebaseUUID}`, {
 *   headers: await getAuthHeaders()
 * });
 * ```
 *
 * AÇÃO RECOMENDADA:
 * - Este arquivo pode ser REMOVIDO em versões futuras
 * - Usar @/app/api/_utils/studentIdResolver apenas em APIs server-side
 *
 * ÚLTIMA VERIFICAÇÃO: 2025-01-18 (Nenhum uso encontrado no frontend)
 *
 * @see src/app/api/_utils/studentIdResolver.ts (Backend - EM USO)
 */

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';

/**
 * Cache em memória para evitar queries repetidas
 * Map<FirebaseUUID, InternalID>
 */
class StudentIdCache {
  private cache = new Map<string, string>();
  private reverseCache = new Map<string, string>(); // InternalID → FirebaseUUID
  private ttl = 60 * 60 * 1000; // 1 hora em ms
  private timestamps = new Map<string, number>();

  /**
   * Buscar Internal ID do cache
   */
  get(firebaseUUID: string): string | null {
    const timestamp = this.timestamps.get(firebaseUUID);

    // Verificar se expirou (TTL)
    if (timestamp && Date.now() - timestamp > this.ttl) {
      this.cache.delete(firebaseUUID);
      this.timestamps.delete(firebaseUUID);
      return null;
    }

    return this.cache.get(firebaseUUID) || null;
  }

  /**
   * Buscar Firebase UUID do cache (reverse lookup)
   */
  getReverse(internalId: string): string | null {
    return this.reverseCache.get(internalId) || null;
  }

  /**
   * Adicionar ao cache
   */
  set(firebaseUUID: string, internalId: string): void {
    this.cache.set(firebaseUUID, internalId);
    this.reverseCache.set(internalId, firebaseUUID);
    this.timestamps.set(firebaseUUID, Date.now());
  }

  /**
   * Adicionar múltiplos ao cache
   */
  setMany(mappings: Array<{ firebaseUUID: string; internalId: string }>): void {
    const now = Date.now();
    mappings.forEach(({ firebaseUUID, internalId }) => {
      this.cache.set(firebaseUUID, internalId);
      this.reverseCache.set(internalId, firebaseUUID);
      this.timestamps.set(firebaseUUID, now);
    });
  }

  /**
   * Limpar cache completo (útil em testes ou após migrations)
   */
  clear(): void {
    this.cache.clear();
    this.reverseCache.clear();
    this.timestamps.clear();
  }

  /**
   * Estatísticas do cache (debug)
   */
  stats(): { size: number; ttl: number } {
    return {
      size: this.cache.size,
      ttl: this.ttl,
    };
  }
}

// Singleton do cache
const idCache = new StudentIdCache();

/**
 * Resolver Firebase UUID para Internal ID do Supabase
 *
 * @param firebaseUUID - UUID externo do Firebase (student.student_id)
 * @returns Internal ID do Supabase (student.id) ou null se não encontrado
 *
 * @example
 * const internalId = await resolveToInternalId('ce5ac93c-bad9-4f82-af87-ffac12eb395f');
 * // Retorna: 'd2b76d89-660f-4179-961a-1ea294bd14ca'
 */
export async function resolveToInternalId(firebaseUUID: string): Promise<string | null> {
  // 1. Verificar cache
  const cached = idCache.get(firebaseUUID);
  if (cached) {
    return cached;
  }

  // 2. Buscar no Supabase
  try {
    const { data, error } = await supabase
      .from('students')
      .select('id')
      .eq('student_id', firebaseUUID)
      .maybeSingle();

    if (error) {
      logger.error('Erro ao resolver Firebase UUID para Internal ID', { firebaseUUID }, error);
      return null;
    }

    if (!data) {
      logger.warn('Estudante não encontrado no Supabase', { firebaseUUID });
      return null;
    }

    const internalId = (data as any).id;

    // 3. Adicionar ao cache
    idCache.set(firebaseUUID, internalId);

    return internalId;
  } catch (error) {
    logger.error('Erro ao buscar Internal ID', { firebaseUUID }, error as Error);
    return null;
  }
}

/**
 * Resolver Internal ID do Supabase para Firebase UUID (reverse lookup)
 *
 * @param internalId - UUID interno do Supabase (student.id)
 * @returns Firebase UUID (student.student_id) ou null se não encontrado
 *
 * @example
 * const firebaseUUID = await resolveToFirebaseUUID('d2b76d89-660f-4179-961a-1ea294bd14ca');
 * // Retorna: 'ce5ac93c-bad9-4f82-af87-ffac12eb395f'
 */
export async function resolveToFirebaseUUID(internalId: string): Promise<string | null> {
  // 1. Verificar cache
  const cached = idCache.getReverse(internalId);
  if (cached) {
    return cached;
  }

  // 2. Buscar no Supabase
  try {
    const { data, error } = await supabase
      .from('students')
      .select('student_id')
      .eq('id', internalId)
      .maybeSingle();

    if (error) {
      logger.error('Erro ao resolver Internal ID para Firebase UUID', { internalId }, error);
      return null;
    }

    if (!data) {
      logger.warn('Estudante não encontrado no Supabase', { internalId });
      return null;
    }

    const firebaseUUID = (data as any).student_id;

    // 3. Adicionar ao cache
    idCache.set(firebaseUUID, internalId);

    return firebaseUUID;
  } catch (error) {
    logger.error('Erro ao buscar Firebase UUID', { internalId }, error as Error);
    return null;
  }
}

/**
 * Resolver múltiplos Firebase UUIDs de uma vez (batch)
 *
 * PERFORMANCE: 1 query em vez de N queries individuais
 *
 * @param firebaseUUIDs - Array de Firebase UUIDs
 * @returns Map<FirebaseUUID, InternalID>
 *
 * @example
 * const mapping = await resolveBatch(['uuid1', 'uuid2', 'uuid3']);
 * const internalId1 = mapping.get('uuid1');
 */
export async function resolveBatch(firebaseUUIDs: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const missingUUIDs: string[] = [];

  // 1. Buscar no cache primeiro
  firebaseUUIDs.forEach((uuid) => {
    const cached = idCache.get(uuid);
    if (cached) {
      result.set(uuid, cached);
    } else {
      missingUUIDs.push(uuid);
    }
  });

  // 2. Se todos estão no cache, retornar
  if (missingUUIDs.length === 0) {
    return result;
  }

  // 3. Buscar os faltantes no Supabase (1 query)
  try {
    const { data, error } = await supabase
      .from('students')
      .select('id, student_id')
      .in('student_id', missingUUIDs);

    if (error) {
      logger.error('Erro ao resolver batch de UUIDs', { count: missingUUIDs.length }, error);
      return result;
    }

    // 4. Mapear resultados
    const mappings = (data || []).map((row: any) => ({
      firebaseUUID: row.student_id,
      internalId: row.id,
    }));

    // 5. Adicionar ao cache e ao resultado
    idCache.setMany(mappings);
    mappings.forEach(({ firebaseUUID, internalId }) => {
      result.set(firebaseUUID, internalId);
    });

    // 6. Log de UUIDs não encontrados
    const foundUUIDs = new Set(mappings.map(m => m.firebaseUUID));
    const notFound = missingUUIDs.filter(uuid => !foundUUIDs.has(uuid));
    if (notFound.length > 0) {
      logger.warn('Alguns UUIDs não foram encontrados no batch', { notFound });
    }

    return result;
  } catch (error) {
    logger.error('Erro ao buscar batch de Internal IDs', { count: missingUUIDs.length }, error as Error);
    return result;
  }
}

/**
 * Limpar cache (útil em testes ou após migrations)
 */
export function clearCache(): void {
  idCache.clear();
}

/**
 * Estatísticas do cache (debug)
 */
export function getCacheStats(): { size: number; ttl: number } {
  return idCache.stats();
}
