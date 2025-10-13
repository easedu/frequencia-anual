/**
 * Supabase Service: User Profiles
 *
 * Gerencia perfis de usuários do sistema.
 * Substitui: collection(db, 'users')
 */

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';

export type UserRole = 'PROFESSOR' | 'COORDENADOR' | 'DIRETOR' | 'ADMIN';

/**
 * Preferências de notificação
 */
export interface NotificationPreferences {
  email: boolean;
  whatsapp: boolean;
}

/**
 * Interface do perfil de usuário (Supabase)
 */
interface SupabaseUserProfile {
  id: string;
  firebase_uid: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  department: string | null;
  turmas_assigned: string[] | null;
  is_active: boolean;
  last_login: string | null;
  notification_preferences: any;
  theme_preference: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Interface do perfil de usuário (Aplicação)
 */
export interface UserProfile {
  id: string;
  firebaseUid: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  department?: string;
  turmasAssigned?: string[];
  isActive: boolean;
  lastLogin?: string;
  notificationPreferences: NotificationPreferences;
  themePreference: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dados para criar usuário
 */
export interface CreateUserProfileData {
  firebaseUid: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  department?: string;
  turmasAssigned?: string[];
  createdBy?: string;
  updatedBy?: string;
  isActive?: boolean;
}

export class UserProfilesService {
  /**
   * Converter registro do Supabase
   */
  private static mapSupabaseToUserProfile(record: SupabaseUserProfile): UserProfile {
    return {
      id: record.id,
      firebaseUid: record.firebase_uid,
      fullName: record.full_name,
      email: record.email,
      phone: record.phone || undefined,
      role: record.role,
      department: record.department || undefined,
      turmasAssigned: record.turmas_assigned || undefined,
      isActive: record.is_active,
      lastLogin: record.last_login || undefined,
      notificationPreferences: record.notification_preferences || {
        email: true,
        whatsapp: false,
      },
      themePreference: record.theme_preference || 'light',
      createdBy: record.created_by || undefined,
      updatedBy: record.updated_by || undefined,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  /**
   * Converter para formato Supabase
   */
  private static mapUserProfileToSupabase(
    data: CreateUserProfileData
  ): Partial<SupabaseUserProfile> {
    return {
      firebase_uid: data.firebaseUid,
      full_name: data.fullName,
      email: data.email,
      phone: data.phone || null,
      role: data.role,
      department: data.department || null,
      turmas_assigned: data.turmasAssigned || null,
      created_by: data.createdBy || null,
      is_active: data.isActive !== undefined ? data.isActive : true,
    };
  }

  /**
   * Buscar perfil por Firebase UID
   */
  static async getByFirebaseUid(firebaseUid: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('firebase_uid', firebaseUid)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data ? this.mapSupabaseToUserProfile(data) : null;
    } catch (error) {
      logger.error('Erro ao buscar perfil por Firebase UID', { firebaseUid }, error as Error);
      return null;
    }
  }

  /**
   * Buscar perfil por email
   */
  static async getByEmail(email: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data ? this.mapSupabaseToUserProfile(data) : null;
    } catch (error) {
      logger.error('Erro ao buscar perfil por email', { email }, error as Error);
      return null;
    }
  }

  /**
   * Criar novo perfil de usuário
   */
  static async create(data: CreateUserProfileData): Promise<UserProfile | null> {
    try {
      const supabaseData = this.mapUserProfileToSupabase(data);

      const { data: result, error } = await (supabase
        .from('user_profiles') as any)
        .insert(supabaseData)
        .select()
        .single();

      if (error) throw error;

      logger.info('Perfil de usuário criado no Supabase', {
        firebaseUid: data.firebaseUid,
        email: data.email,
      });

      return this.mapSupabaseToUserProfile(result);
    } catch (error) {
      logger.error('Erro ao criar perfil de usuário', data, error as Error);
      throw error;
    }
  }

  /**
   * Atualizar perfil de usuário
   */
  static async update(
    firebaseUid: string,
    updates: Partial<CreateUserProfileData>
  ): Promise<boolean> {
    try {
      const supabaseUpdates: any = {};

      if (updates.fullName) supabaseUpdates.full_name = updates.fullName;
      if (updates.email) supabaseUpdates.email = updates.email;
      if (updates.phone !== undefined) supabaseUpdates.phone = updates.phone || null;
      if (updates.role) supabaseUpdates.role = updates.role;
      if (updates.department !== undefined)
        supabaseUpdates.department = updates.department || null;
      if (updates.turmasAssigned !== undefined)
        supabaseUpdates.turmas_assigned = updates.turmasAssigned || null;
      if (updates.isActive !== undefined) supabaseUpdates.is_active = updates.isActive;
      if (updates.updatedBy) supabaseUpdates.updated_by = updates.updatedBy;

      const { error } = await (supabase.from('user_profiles') as any)
        .update(supabaseUpdates)
        .eq('firebase_uid', firebaseUid);

      if (error) throw error;

      logger.info('Perfil de usuário atualizado no Supabase', { firebaseUid });

      return true;
    } catch (error) {
      logger.error('Erro ao atualizar perfil', { firebaseUid }, error as Error);
      return false;
    }
  }

  /**
   * Atualizar último login
   */
  static async updateLastLogin(firebaseUid: string): Promise<boolean> {
    try {
      const { error } = await (supabase.from('user_profiles') as any)
        .update({
          last_login: new Date().toISOString(),
        })
        .eq('firebase_uid', firebaseUid);

      if (error) throw error;

      return true;
    } catch (error) {
      logger.error('Erro ao atualizar último login', { firebaseUid }, error as Error);
      return false;
    }
  }

  /**
   * Atualizar preferências de notificação
   */
  static async updateNotificationPreferences(
    firebaseUid: string,
    preferences: NotificationPreferences
  ): Promise<boolean> {
    try {
      const { error } = await (supabase.from('user_profiles') as any)
        .update({
          notification_preferences: preferences,
        })
        .eq('firebase_uid', firebaseUid);

      if (error) throw error;

      logger.info('Preferências de notificação atualizadas', { firebaseUid });

      return true;
    } catch (error) {
      logger.error('Erro ao atualizar preferências', { firebaseUid }, error as Error);
      return false;
    }
  }

  /**
   * Ativar/Desativar usuário
   */
  static async setActive(firebaseUid: string, isActive: boolean): Promise<boolean> {
    try {
      const { error } = await (supabase.from('user_profiles') as any)
        .update({
          is_active: isActive,
        })
        .eq('firebase_uid', firebaseUid);

      if (error) throw error;

      logger.info('Status do usuário atualizado', { firebaseUid, isActive });

      return true;
    } catch (error) {
      logger.error('Erro ao atualizar status', { firebaseUid }, error as Error);
      return false;
    }
  }

  /**
   * Listar todos os usuários ativos
   */
  static async getAllActive(): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;

      return (data || []).map(this.mapSupabaseToUserProfile);
    } catch (error) {
      logger.error('Erro ao listar usuários ativos', {}, error as Error);
      return [];
    }
  }

  /**
   * Listar usuários por função
   */
  static async getByRole(role: UserRole): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', role)
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;

      return (data || []).map(this.mapSupabaseToUserProfile);
    } catch (error) {
      logger.error('Erro ao buscar usuários por função', { role }, error as Error);
      return [];
    }
  }
}
