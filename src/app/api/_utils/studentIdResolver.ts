/**
 * Student ID Resolver (Backend)
 *
 * Resolve Firebase UUIDs (student.student_id) para Internal IDs (student.id) do Supabase.
 * Versão SERVER-SIDE usando supabaseAdmin.
 *
 * IMPORTANTE: Use este resolver apenas em API Routes (backend).
 * Para frontend, as APIs devem aceitar Firebase UUID e resolver internamente.
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logger } from '@/utils/logger';

/**
 * Cache em memória (server-side)
 * Map<FirebaseUUID, InternalID>
 */
class ServerStudentIdCache {
  private cache = new Map<string, string>();
  private reverseCache = new Map<string, string>();
  private ttl = 60 * 60 * 1000; // 1 hora
  private timestamps = new Map<string, number>();

  get(firebaseUUID: string): string | null {
    const timestamp = this.timestamps.get(firebaseUUID);
    if (timestamp && Date.now() - timestamp > this.ttl) {
      this.cache.delete(firebaseUUID);
      this.timestamps.delete(firebaseUUID);
      return null;
    }
    return this.cache.get(firebaseUUID) || null;
  }

  getReverse(internalId: string): string | null {
    return this.reverseCache.get(internalId) || null;
  }

  set(firebaseUUID: string, internalId: string): void {
    this.cache.set(firebaseUUID, internalId);
    this.reverseCache.set(internalId, firebaseUUID);
    this.timestamps.set(firebaseUUID, Date.now());
  }

  clear(): void {
    this.cache.clear();
    this.reverseCache.clear();
    this.timestamps.clear();
  }
}

const serverCache = new ServerStudentIdCache();

/**
 * Resolver Firebase UUID para Internal ID (server-side)
 *
 * @param firebaseUUID - UUID do Firebase (student.student_id)
 * @returns Internal ID do Supabase (student.id) ou null
 */
export async function resolveFirebaseUUIDToInternal(
  firebaseUUID: string
): Promise<string | null> {
  // 1. Verificar cache
  const cached = serverCache.get(firebaseUUID);
  if (cached) return cached;

  // 2. Buscar no Supabase por student_id (Firebase UUID)
  try {
    const { data, error } = (await supabaseAdmin
      .from('students')
      .select('id, student_id')
      .eq('student_id', firebaseUUID)
      .maybeSingle()) as { data: { id: string; student_id: string } | null; error: any };

    if (error) {
      logger.error('[Backend] Erro ao resolver Firebase UUID', { firebaseUUID }, error);
      return null;
    }

    if (data) {
      const internalId = data.id;
      serverCache.set(firebaseUUID, internalId);
      return internalId;
    }

    // 3. FALLBACK: Verificar se o UUID fornecido já é o Internal ID
    // (Para compatibilidade com código antigo que pode estar enviando Internal ID)
    const { data: dataById, error: errorById } = (await supabaseAdmin
      .from('students')
      .select('id, student_id')
      .eq('id', firebaseUUID)
      .maybeSingle()) as { data: { id: string; student_id: string } | null; error: any };

    if (!errorById && dataById) {
      logger.warn('[Backend] UUID fornecido era Internal ID, não Firebase UUID', {
        providedId: firebaseUUID,
        actualStudentId: dataById.student_id
      });

      // Cache com o student_id correto
      serverCache.set(dataById.student_id, dataById.id);

      return dataById.id;
    }

    logger.warn('[Backend] Estudante não encontrado', { firebaseUUID });
    return null;
  } catch (error) {
    logger.error('[Backend] Erro ao buscar Internal ID', { firebaseUUID }, error as Error);
    return null;
  }
}

/**
 * Resolver Internal ID para Firebase UUID (server-side)
 *
 * @param internalId - UUID interno do Supabase (student.id)
 * @returns Firebase UUID (student.student_id) ou null
 */
export async function resolveInternalToFirebaseUUID(
  internalId: string
): Promise<string | null> {
  // 1. Verificar cache
  const cached = serverCache.getReverse(internalId);
  if (cached) return cached;

  // 2. Buscar no Supabase
  try {
    const { data, error } = (await supabaseAdmin
      .from('students')
      .select('student_id')
      .eq('id', internalId)
      .maybeSingle()) as { data: { student_id: string } | null; error: any };

    if (error) {
      logger.error('[Backend] Erro ao resolver Internal ID', { internalId }, error);
      return null;
    }

    if (!data) {
      logger.warn('[Backend] Estudante não encontrado', { internalId });
      return null;
    }

    const firebaseUUID = data.student_id;
    serverCache.set(firebaseUUID, internalId);

    return firebaseUUID;
  } catch (error) {
    logger.error('[Backend] Erro ao buscar Firebase UUID', { internalId }, error as Error);
    return null;
  }
}

/**
 * Limpar cache (útil em testes)
 */
export function clearServerCache(): void {
  serverCache.clear();
}
