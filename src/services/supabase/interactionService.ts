/**
 * Supabase Service: Family Interactions (Interações Familiares)
 *
 * Este serviço gerencia as interações com as famílias dos estudantes
 * (contatos telefônicos, visitas, reuniões, etc.)
 */

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';
import type { FamilyInteraction, WhatsAppMessageStatus } from '@/types';

interface SupabaseInteraction {
  id: string;
  student_id: string;
  interaction_type: string;
  interaction_date: string;
  description: string;
  created_by: string;
  is_sensitive: boolean;
  whatsapp_message?: string; // Mensagem WhatsApp original
  whatsapp_phones?: string[]; // Telefones WhatsApp (array JSONB)
  // 🆕 Campos de status WhatsApp (webhook)
  whatsapp_message_id?: string;
  whatsapp_status?: string;
  whatsapp_status_history?: any; // JSONB array
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
      // 🆕 Campos de status WhatsApp (webhook)
      whatsappMessageId: record.whatsapp_message_id,
      whatsappStatus: record.whatsapp_status as WhatsAppMessageStatus | undefined,
      whatsappStatusHistory: record.whatsapp_status_history,
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
      // 🆕 Campos de status WhatsApp
      whatsapp_message_id: interaction.whatsappMessageId,
      whatsapp_status: interaction.whatsappStatus,
      whatsapp_status_history: interaction.whatsappStatusHistory,
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
      // 🔧 FIX: Buscar ID interno do Supabase a partir do Firebase UUID
      const { data: student, error: studentError } = await (supabase
        .from('students')
        .select('id')
        .eq('student_id', firebaseStudentId)
        .single() as any);

      if (studentError || !student) {
        logger.error('Estudante não encontrado', { firebaseStudentId }, studentError as Error);
        return null;
      }

      const { data, error } = await (supabase
        .from('family_interactions')
        .select('*')
        .eq('id', interactionId)
        .eq('student_id', (student as any).id)  // ✅ Usar ID interno do Supabase
        .single() as any);

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data ? this.mapSupabaseToInteraction(data) : null;
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

      // 🔧 FIX: Buscar ID interno do Supabase a partir do Firebase UUID
      const { data: student, error: studentError } = await (supabase
        .from('students')
        .select('id')
        .eq('student_id', firebaseStudentId)
        .single() as any);

      if (studentError || !student) {
        logger.error('Estudante não encontrado', { firebaseStudentId }, studentError as Error);
        return [];
      }

      const { data, error } = await supabase
        .from('family_interactions')
        .select('*')
        .eq('student_id', (student as any).id)  // ✅ Usar ID interno do Supabase
        .order('interaction_date', { ascending: false });

      if (error) throw error;

      // ✅ FIX: Mapear e substituir studentId interno pelo Firebase UUID
      return (data || []).map(record => {
        const interaction = this.mapSupabaseToInteraction(record);
        // Substituir ID interno pelo Firebase UUID
        interaction.studentId = firebaseStudentId;
        return interaction;
      });
    } catch (error) {
      logger.error('Erro ao buscar interações do estudante', { firebaseStudentId }, error as Error);
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
      // 🔧 FIX: Buscar ID interno do Supabase a partir do Firebase UUID
      const { data: student, error: studentError } = await (supabase
        .from('students')
        .select('id')
        .eq('student_id', firebaseStudentId)
        .single() as any);

      if (studentError || !student) {
        throw new Error(`Estudante não encontrado: ${firebaseStudentId}`);
      }

      // Substituir o Firebase UUID pelo ID interno do Supabase
      const insertData = {
        ...this.mapInteractionToSupabase(interaction),
        student_id: (student as any).id  // ✅ Usar ID interno do Supabase
      };

      const { data, error } = await ((supabase
        .from('family_interactions') as any)
        .insert(insertData)
        .select()
        .single());

      if (error) throw error;

      logger.info('Interação criada no Supabase', { firebaseStudentId, interactionId: data.id });
      return this.mapSupabaseToInteraction(data);
    } catch (error) {
      logger.error('Erro ao criar interação', { firebaseStudentId }, error as Error);
      throw error;
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
      const updateData: any = {};

      if (updates.type !== undefined) updateData.interaction_type = updates.type;
      if (updates.date !== undefined) updateData.interaction_date = updates.date;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.createdBy !== undefined) updateData.created_by = updates.createdBy;
      if (updates.sensitive !== undefined) updateData.is_sensitive = updates.sensitive;

      const { error } = await ((supabase
        .from('family_interactions') as any)
        .update(updateData)
        .eq('id', interactionId));

      if (error) throw error;

      logger.info('Interação atualizada', { interactionId });
      return true;
    } catch (error) {
      logger.error('Erro ao atualizar interação', { interactionId }, error as Error);
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

      logger.info('Interação deletada', { interactionId });
      return true;
    } catch (error) {
      logger.error('Erro ao deletar interação', { interactionId }, error as Error);
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

      return (data || []).map(this.mapSupabaseToInteraction);
    } catch (error) {
      logger.error('Erro ao buscar interações por tipo', { type }, error as Error);
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

      return (data || []).map(this.mapSupabaseToInteraction);
    } catch (error) {
      logger.error('Erro ao buscar interações por período', { startDate, endDate }, error as Error);
      return [];
    }
  }
}
