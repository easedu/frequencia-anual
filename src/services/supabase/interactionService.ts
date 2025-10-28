/**
 * Supabase Service: Family Interactions (Interações Familiares)
 *
 * @deprecated Use hooks from @/hooks/api/useInteractions instead
 *
 * Este service está sendo gradualmente substituído por hooks da API REST.
 * Para componentes React, use:
 * - useInteractions() - Listar interações
 * - useCreateInteraction() - Criar interação
 * - useUpdateInteraction() - Atualizar interação
 * - useDeleteInteraction() - Deletar interação
 *
 * Este serviço gerencia as interações com as famílias dos estudantes
 * (contatos telefônicos, visitas, reuniões, etc.)
 */

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';
import type { FamilyInteraction, WhatsAppMessageStatus, StatusHistoryEntry } from '@/types';
import { getAuthHeaders } from '@/utils/authToken';
import type { PostgrestError } from '@supabase/supabase-js';

interface SupabaseInteraction {
  id: string;
  student_id: string;
  interaction_type: string;
  interaction_date: string;
  description: string;
  created_by: string;
  is_sensitive: boolean;
  whatsapp_message?: string;
  whatsapp_phones?: string[];
  whatsapp_message_id?: string;
  whatsapp_status?: WhatsAppMessageStatus;
  // Database stores as JSONB with Unix timestamps (ms)
  whatsapp_status_history?: Array<{
    status: WhatsAppMessageStatus;
    timestamp: number;
    source?: 'webhook' | 'api' | 'migration';
    [key: string]: unknown;
  }>;
  whatsapp_sent_at?: string;
  whatsapp_delivered_at?: string;
  whatsapp_read_at?: string;
  whatsapp_played_at?: string;
  whatsapp_updated_at?: string;
  created_at?: string;
}

export class InteractionService {
  /**
   * Converter registro do Supabase para FamilyInteraction
   */
  private static mapSupabaseToInteraction(record: SupabaseInteraction): FamilyInteraction {
    return {
      id: record.id,
      studentId: record.student_id,
      type: record.interaction_type,
      date: record.interaction_date,
      description: record.description,
      createdBy: record.created_by,
      sensitive: record.is_sensitive,
      whatsappMessage: record.whatsapp_message,
      whatsappPhones: record.whatsapp_phones,
      whatsappMessageId: record.whatsapp_message_id,
      whatsappStatus: record.whatsapp_status,
      // Database stores timestamps as number (Unix ms), type system expects StatusHistoryEntry[]
      whatsappStatusHistory: record.whatsapp_status_history as StatusHistoryEntry[] | undefined,
      whatsappSentAt: record.whatsapp_sent_at,
      whatsappDeliveredAt: record.whatsapp_delivered_at,
      whatsappReadAt: record.whatsapp_read_at,
      whatsappPlayedAt: record.whatsapp_played_at,
      whatsappUpdatedAt: record.whatsapp_updated_at,
    };
  }

  /**
   * Converter FamilyInteraction para formato Supabase
   */
  private static mapInteractionToSupabase(interaction: Omit<FamilyInteraction, 'id'>): Omit<SupabaseInteraction, 'id' | 'created_at'> {
    return {
      student_id: interaction.studentId,
      interaction_type: interaction.type,
      interaction_date: interaction.date,
      description: interaction.description,
      created_by: interaction.createdBy,
      is_sensitive: interaction.sensitive,
      whatsapp_message: interaction.whatsappMessage,
      whatsapp_phones: interaction.whatsappPhones,
      whatsapp_message_id: interaction.whatsappMessageId,
      whatsapp_status: interaction.whatsappStatus,
      // StatusHistoryEntry[] has number timestamps, database accepts this JSONB format
      whatsapp_status_history: interaction.whatsappStatusHistory as Array<{
        status: WhatsAppMessageStatus;
        timestamp: number;
        source?: 'webhook' | 'api' | 'migration';
        [key: string]: unknown;
      }> | undefined,
      whatsapp_sent_at: interaction.whatsappSentAt,
      whatsapp_delivered_at: interaction.whatsappDeliveredAt,
      whatsapp_read_at: interaction.whatsappReadAt,
      whatsapp_played_at: interaction.whatsappPlayedAt,
      whatsapp_updated_at: interaction.whatsappUpdatedAt,
    };
  }

  /**
   * Buscar interação por ID
   */
  static async getInteractionById(firebaseStudentId: string, interactionId: string): Promise<FamilyInteraction | null> {
    try {
      // Buscar ID interno do Supabase a partir do Firebase UUID
      type StudentIdRow = { id: string };
      type StudentResult = { data: StudentIdRow | null; error: PostgrestError | null };

      const studentResult = await supabase
        .from('students')
        .select('id')
        .eq('student_id', firebaseStudentId)
        .single() as unknown as StudentResult;

      if (studentResult.error || !studentResult.data) {
        if (studentResult.error) {
          logger.error('Estudante não encontrado', { firebaseStudentId }, studentResult.error as Error);
        }
        return null;
      }

      const student = studentResult.data;

      type InteractionResult = { data: SupabaseInteraction | null; error: PostgrestError | null };

      const interactionResult = await supabase
        .from('family_interactions')
        .select('*')
        .eq('id', interactionId)
        .eq('student_id', student.id)
        .single() as unknown as InteractionResult;

      if (interactionResult.error) {
        const pgError = interactionResult.error;
        if (pgError.code === 'PGRST116') return null; // Not found
        logger.error('Erro ao buscar interação', { interactionId }, interactionResult.error as Error);
        throw interactionResult.error;
      }

      if (!interactionResult.data) return null;

      return this.mapSupabaseToInteraction(interactionResult.data);
    } catch (error) {
      logger.error('Erro ao buscar interação por ID', { firebaseStudentId, interactionId }, error as Error);
      return null;
    }
  }

  /**
   * Buscar todas as interações de um estudante
   */
  static async getStudentInteractions(firebaseStudentId: string): Promise<FamilyInteraction[]> {
    try {
      // ⚠️ Validação: não executar se ID for undefined/null/vazio
      if (!firebaseStudentId || firebaseStudentId === 'undefined' || firebaseStudentId === 'null') {
        logger.warn('getStudentInteractions: studentId inválido', { firebaseStudentId });
        return [];
      }

      // ✅ Usar API REST ao invés de Supabase direto
      const headers = await getAuthHeaders();

      const response = await fetch(`/api/interactions?estudanteId=${firebaseStudentId}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Erro ao buscar interações');
      }

      // Converter do formato API para formato FamilyInteraction
      return (result.data || []).map((interaction: {
        id: string;
        studentId: string;
        type: string;
        date: string;
        description: string;
        createdBy: string;
        sensitive: boolean;
        whatsappMessage?: string;
        whatsappPhones?: string[];
        whatsappMessageId?: string;
        whatsappStatus?: string;
        whatsappStatusHistory?: unknown[];
        whatsappSentAt?: string;
        whatsappDeliveredAt?: string;
        whatsappReadAt?: string;
        whatsappPlayedAt?: string;
        whatsappUpdatedAt?: string;
      }) => ({
        id: interaction.id,
        studentId: interaction.studentId,
        type: interaction.type,
        date: interaction.date,
        description: interaction.description,
        createdBy: interaction.createdBy,
        sensitive: interaction.sensitive,
        whatsappMessage: interaction.whatsappMessage,
        whatsappPhones: interaction.whatsappPhones,
        whatsappMessageId: interaction.whatsappMessageId,
        whatsappStatus: interaction.whatsappStatus as WhatsAppMessageStatus | undefined,
        whatsappStatusHistory: interaction.whatsappStatusHistory,
        whatsappSentAt: interaction.whatsappSentAt,
        whatsappDeliveredAt: interaction.whatsappDeliveredAt,
        whatsappReadAt: interaction.whatsappReadAt,
        whatsappPlayedAt: interaction.whatsappPlayedAt,
        whatsappUpdatedAt: interaction.whatsappUpdatedAt,
      }));
    } catch (err) {
      logger.error('Erro ao buscar interações do estudante', { firebaseStudentId }, err as Error);
      return [];
    }
  }

  /**
   * Criar nova interação
   */
  static async createInteraction(
    firebaseStudentId: string,
    interaction: Omit<FamilyInteraction, 'id'>
  ): Promise<FamilyInteraction> {
    try {
      // ✅ Usar API REST ao invés de Supabase direto
      const headers = await getAuthHeaders();

      const response = await fetch('/api/interactions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          estudanteId: firebaseStudentId, // Firebase UUID (a API resolve internamente)
          data: interaction.date,
          tipo: interaction.type,
          descricao: interaction.description,
          criadoPor: interaction.createdBy,
          whatsapp_message: interaction.whatsappMessage,
          whatsapp_phones: interaction.whatsappPhones,
          whatsapp_message_id: interaction.whatsappMessageId,
          whatsapp_status: interaction.whatsappStatus,
          whatsapp_sent_at: interaction.whatsappSentAt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API returned ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Erro ao criar interação');
      }

      // Retornar interação completa (buscar novamente)
      return {
        id: result.data.id,
        studentId: firebaseStudentId,
        type: interaction.type,
        date: interaction.date,
        description: interaction.description,
        createdBy: interaction.createdBy,
        sensitive: interaction.sensitive,
        whatsappMessage: interaction.whatsappMessage,
        whatsappPhones: interaction.whatsappPhones,
        whatsappMessageId: interaction.whatsappMessageId,
        whatsappStatus: interaction.whatsappStatus,
        whatsappSentAt: interaction.whatsappSentAt,
      };
    } catch (err) {
      logger.error('Erro ao criar interação', { firebaseStudentId }, err as Error);
      throw err;
    }
  }

  /**
   * Atualizar interação existente
   */
  static async updateInteraction(
    interactionId: string,
    updates: Partial<Omit<FamilyInteraction, 'id' | 'studentId'>>
  ): Promise<boolean> {
    try {
      // Build update object matching Supabase schema
      const updateData: Record<string, string | boolean | null> = {};

      if (updates.type !== undefined) updateData.interaction_type = updates.type;
      if (updates.date !== undefined) updateData.interaction_date = updates.date;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.createdBy !== undefined) updateData.created_by = updates.createdBy || null;
      if (updates.sensitive !== undefined) updateData.is_sensitive = updates.sensitive;

      type UpdateResult = { error: PostgrestError | null };

      // Use type assertion to work around Supabase proxy type inference issue
      const query = supabase
        .from('family_interactions') as unknown as {
          update: (data: Record<string, unknown>) => {
            eq: (column: string, value: unknown) => Promise<UpdateResult>
          }
        };

      const result = await query
        .update(updateData)
        .eq('id', interactionId);

      if (result.error) throw result.error;

      return true;
    } catch (err) {
      logger.error('Erro ao atualizar interação', { interactionId }, err as Error);
      return false;
    }
  }

  /**
   * Deletar interação
   */
  static async deleteInteraction(interactionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('family_interactions')
        .delete()
        .eq('id', interactionId);

      if (error) throw error;

      return true;
    } catch (err) {
      logger.error('Erro ao deletar interação', { interactionId }, err as Error);
      return false;
    }
  }

  /**
   * Buscar interações por tipo
   */
  static async getInteractionsByType(type: string): Promise<FamilyInteraction[]> {
    try {
      const { data, error } = await supabase
        .from('family_interactions')
        .select('*')
        .eq('interaction_type', type)
        .order('interaction_date', { ascending: false });

      if (error) throw error;

      return (data || []).map((record) => this.mapSupabaseToInteraction(record as SupabaseInteraction));
    } catch (err) {
      logger.error('Erro ao buscar interações por tipo', { type }, err as Error);
      return [];
    }
  }

  /**
   * Buscar interações por período
   */
  static async getInteractionsByDateRange(
    startDate: string,
    endDate: string
  ): Promise<FamilyInteraction[]> {
    try {
      const { data, error } = await supabase
        .from('family_interactions')
        .select('*')
        .gte('interaction_date', startDate)
        .lte('interaction_date', endDate)
        .order('interaction_date', { ascending: false });

      if (error) throw error;

      return (data || []).map((record) => this.mapSupabaseToInteraction(record as SupabaseInteraction));
    } catch (err) {
      logger.error('Erro ao buscar interações por período', { startDate, endDate }, err as Error);
      return [];
    }
  }
}
