/**
 * Supabase Service: User Profiles
 *
 * Gerencia perfis de usuários do sistema.
 * ATUALIZADO: Agora usa API Routes para evitar CORS
 * Todas as requisições passam pelo servidor Next.js
 */

import { logger } from '@/utils/logger';

export type UserRole = 'ADMIN' | 'SUPER-USER' | 'USER' | 'USER-PCD';

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
 * Metadados do usuário (favoritos, preferências, etc)
 */
export interface UserMetadata {
  favorites?: string[];
  theme?: 'light' | 'dark' | 'system';
  [key: string]: any; // Permite outros campos customizados
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
  metadata?: UserMetadata; // NOVO: metadados flexíveis
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
   *
   * NOTA: Agora usa API Route para evitar problemas de CORS
   */
  static async getByFirebaseUid(firebaseUid: string): Promise<UserProfile | null> {
    try {
      const response = await fetch(`/api/users/by-firebase-uid?firebase_uid=${firebaseUid}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { data, error } = await response.json();

      if (error) return null;
      if (!data) return null;

      // Cast para o tipo correto da tabela users
      const user = data as {
        id: string;
        firebase_uid: string | null;
        email: string;
        name: string | null;
        role: 'admin' | 'user' | 'teacher';
        metadata: Record<string, any> | null;
        created_at: string;
        updated_at: string;
        last_login_at: string | null;
      };

      // Mapear tabela 'users' (schema simplificado) para UserProfile
      return {
        id: user.id,
        firebaseUid: user.firebase_uid || '',
        fullName: user.name || 'Usuário',
        email: user.email,
        phone: undefined, // Campo não existe na tabela 'users'
        role: this.mapSimpleRoleToUserRole(user.role),
        department: undefined, // Campo não existe
        turmasAssigned: undefined, // Campo não existe
        isActive: true, // Assume ativo (campo não existe)
        lastLogin: user.last_login_at || undefined,
        notificationPreferences: {
          email: true,
          whatsapp: false,
        },
        themePreference: user.metadata?.theme || 'light',
        metadata: user.metadata as UserMetadata | undefined,
        createdBy: undefined,
        updatedBy: undefined,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
    } catch (error) {
      logger.error('Erro ao buscar perfil por Firebase UID', { firebaseUid }, error as Error);
      return null;
    }
  }

  /**
   * Mapear roles do Supabase ('admin', 'user', 'teacher') para UserRole do sistema
   */
  private static mapSimpleRoleToUserRole(simpleRole: 'admin' | 'user' | 'teacher'): UserRole {
    switch (simpleRole) {
      case 'admin':
        return 'ADMIN';
      case 'teacher':
        return 'USER'; // Professores são usuários comuns
      case 'user':
        return 'USER';
      default:
        return 'USER'; // Fallback
    }
  }

  /**
   * Buscar perfil por email
   *
   * NOTA: Agora usa API Route para evitar problemas de CORS
   */
  static async getByEmail(email: string): Promise<UserProfile | null> {
    try {
      const response = await fetch(`/api/users/by-email?email=${encodeURIComponent(email)}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { data, error } = await response.json();

      if (error) return null;
      if (!data) return null;

      // Cast para o tipo correto da tabela users
      const user = data as {
        id: string;
        firebase_uid: string | null;
        email: string;
        name: string | null;
        role: 'admin' | 'user' | 'teacher';
        metadata: Record<string, any> | null;
        created_at: string;
        updated_at: string;
        last_login_at: string | null;
      };

      // Usar mesmo mapeamento simplificado
      return {
        id: user.id,
        firebaseUid: user.firebase_uid || '',
        fullName: user.name || 'Usuário',
        email: user.email,
        phone: undefined,
        role: this.mapSimpleRoleToUserRole(user.role),
        department: undefined,
        turmasAssigned: undefined,
        isActive: true,
        lastLogin: user.last_login_at || undefined,
        notificationPreferences: {
          email: true,
          whatsapp: false,
        },
        themePreference: user.metadata?.theme || 'light',
        metadata: user.metadata as UserMetadata | undefined,
        createdBy: undefined,
        updatedBy: undefined,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
    } catch (error) {
      logger.error('Erro ao buscar perfil por email', { email }, error as Error);
      return null;
    }
  }

  /**
   * Criar novo perfil de usuário
   *
   * NOTA: Agora usa API Route para evitar problemas de CORS
   */
  static async create(data: CreateUserProfileData): Promise<UserProfile | null> {
    try {
      // Mapear para schema simplificado da tabela 'users'
      const simpleUserData = {
        firebase_uid: data.firebaseUid,
        email: data.email,
        name: data.fullName,
        role: this.mapUserRoleToSimpleRole(data.role),
      };

      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(simpleUserData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { data: result, error } = await response.json();

      if (error) throw error;

      logger.info('Perfil de usuário criado no Supabase', {
        firebaseUid: data.firebaseUid,
        email: data.email,
      });

      // Retornar usando mapeamento simplificado
      return {
        id: result.id,
        firebaseUid: result.firebase_uid,
        fullName: result.name || 'Usuário',
        email: result.email,
        phone: undefined,
        role: this.mapSimpleRoleToUserRole(result.role),
        department: undefined,
        turmasAssigned: undefined,
        isActive: true,
        lastLogin: result.last_login_at || undefined,
        notificationPreferences: {
          email: true,
          whatsapp: false,
        },
        themePreference: result.metadata?.theme || 'light',
        metadata: result.metadata as UserMetadata | undefined,
        createdBy: undefined,
        updatedBy: undefined,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      };
    } catch (error) {
      logger.error('Erro ao criar perfil de usuário', data, error as Error);
      throw error;
    }
  }

  /**
   * Mapear UserRole do sistema para roles do Supabase ('admin', 'user', 'teacher')
   */
  private static mapUserRoleToSimpleRole(userRole: UserRole): 'admin' | 'user' | 'teacher' {
    switch (userRole) {
      case 'ADMIN':
        return 'admin';
      case 'SUPER-USER':
        return 'admin'; // Super-user tem privilégios de admin
      case 'USER':
        return 'teacher'; // Usuários comuns mapeiam para teacher
      case 'USER-PCD':
        return 'teacher'; // Usuários PCD também são usuários comuns
      default:
        return 'user'; // Fallback
    }
  }

  /**
   * Atualizar perfil de usuário
   *
   * NOTA: Agora usa API Route para evitar problemas de CORS
   */
  static async update(
    firebaseUid: string,
    updates: Partial<CreateUserProfileData>
  ): Promise<boolean> {
    try {
      const supabaseUpdates: any = {};

      // Mapear apenas campos que existem na tabela 'users'
      if (updates.fullName) supabaseUpdates.name = updates.fullName;
      if (updates.email) supabaseUpdates.email = updates.email;
      if (updates.role) supabaseUpdates.role = this.mapUserRoleToSimpleRole(updates.role);

      // Ignorar campos não suportados: phone, department, turmas_assigned, is_active, updated_by

      const response = await fetch('/api/users/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebase_uid: firebaseUid,
          updates: supabaseUpdates,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { success } = await response.json();

      if (!success) throw new Error('Falha ao atualizar usuário');

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
      const { error } = await (supabase.from('users') as any)
        .update({
          last_login_at: new Date().toISOString(),
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
   * Atualizar metadados do usuário (favoritos, tema, etc)
   *
   * NOVO: Usa campo metadata (JSONB) para armazenar preferências
   */
  static async updateMetadata(
    firebaseUid: string,
    metadata: Partial<UserMetadata>
  ): Promise<boolean> {
    try {
      // Buscar metadados atuais
      const currentUser = await this.getByFirebaseUid(firebaseUid);
      const currentMetadata = currentUser?.metadata || {};

      // Mesclar com novos metadados
      const updatedMetadata = {
        ...currentMetadata,
        ...metadata,
      };

      const { error } = await (supabase.from('users') as any)
        .update({
          metadata: updatedMetadata,
        })
        .eq('firebase_uid', firebaseUid);

      if (error) throw error;

      return true;
    } catch (error) {
      logger.error('Erro ao atualizar metadados', { firebaseUid }, error as Error);
      return false;
    }
  }

  /**
   * Atualizar favoritos do usuário
   *
   * Atalho para atualizar apenas o campo favorites nos metadados
   */
  static async updateFavorites(firebaseUid: string, favorites: string[]): Promise<boolean> {
    return this.updateMetadata(firebaseUid, { favorites });
  }

  /**
   * Atualizar preferências de notificação
   *
   * ⚠️ DEPRECATED: Use updateMetadata() para salvar preferências personalizadas
   * Mantido para compatibilidade, mas redireciona para updateMetadata
   */
  static async updateNotificationPreferences(
    firebaseUid: string,
    preferences: any
  ): Promise<boolean> {
    // Se preferences contém 'favorites', salvar em metadata
    if (preferences.favorites) {
      return this.updateFavorites(firebaseUid, preferences.favorites);
    }

    logger.warn('updateNotificationPreferences: use updateMetadata() para salvar preferências', {
      firebaseUid,
    });
    return this.updateMetadata(firebaseUid, preferences);
  }

  /**
   * Ativar/Desativar usuário
   *
   * ⚠️ NÃO SUPORTADO: Tabela 'users' não possui campo is_active
   * Retorna false silenciosamente para não quebrar código existente
   */
  static async setActive(firebaseUid: string, isActive: boolean): Promise<boolean> {
    logger.warn('setActive não suportado pela tabela users simplificada', {
      firebaseUid,
      isActive,
    });
    return false;
  }

  /**
   * Listar todos os usuários ativos
   *
   * NOTA: Agora usa API Route para evitar problemas de CORS
   */
  static async getAllActive(): Promise<UserProfile[]> {
    try {
      const response = await fetch('/api/users/all-active');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { data, error } = await response.json();

      if (error) throw error;

      type UserRow = {
        id: string;
        firebase_uid: string | null;
        email: string;
        name: string | null;
        role: 'admin' | 'user' | 'teacher';
        metadata: Record<string, any> | null;
        created_at: string;
        updated_at: string;
        last_login_at: string | null;
      };

      return (data as UserRow[] || []).map((user) => ({
        id: user.id,
        firebaseUid: user.firebase_uid || '',
        fullName: user.name || 'Usuário',
        email: user.email,
        phone: undefined,
        role: this.mapSimpleRoleToUserRole(user.role),
        department: undefined,
        turmasAssigned: undefined,
        isActive: true,
        lastLogin: user.last_login_at || undefined,
        notificationPreferences: {
          email: true,
          whatsapp: false,
        },
        themePreference: user.metadata?.theme || 'light',
        metadata: user.metadata as UserMetadata | undefined,
        createdBy: undefined,
        updatedBy: undefined,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      }));
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
      const simpleRole = this.mapUserRoleToSimpleRole(role);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', simpleRole)
        .order('name', { ascending: true });

      if (error) throw error;

      type UserRow = {
        id: string;
        firebase_uid: string | null;
        email: string;
        name: string | null;
        role: 'admin' | 'user' | 'teacher';
        metadata: Record<string, any> | null;
        created_at: string;
        updated_at: string;
        last_login_at: string | null;
      };

      return (data as UserRow[] || []).map((user) => ({
        id: user.id,
        firebaseUid: user.firebase_uid || '',
        fullName: user.name || 'Usuário',
        email: user.email,
        phone: undefined,
        role: this.mapSimpleRoleToUserRole(user.role),
        department: undefined,
        turmasAssigned: undefined,
        isActive: true,
        lastLogin: user.last_login_at || undefined,
        notificationPreferences: {
          email: true,
          whatsapp: false,
        },
        themePreference: user.metadata?.theme || 'light',
        metadata: user.metadata as UserMetadata | undefined,
        createdBy: undefined,
        updatedBy: undefined,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      }));
    } catch (error) {
      logger.error('Erro ao buscar usuários por função', { role }, error as Error);
      return [];
    }
  }
}
