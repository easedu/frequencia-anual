"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase.config";
import { UserProfilesService } from "@/services/supabase/userProfilesService";
import { logger } from "@/utils/logger";

// Páginas que não precisam de autenticação
const PUBLIC_ROUTES = ['/login', '/'];

// Páginas que precisam de autenticação
const PROTECTED_ROUTES = [
  '/home',
  '/marcar-faltas',
  '/controlar-faltas',
  '/cadastrar-estudante',
  '/cadastrar-ano-letivo',
  '/relatorio-bolsa-familia',
  '/perfil-estudante',
  '/perfil-deficiente',
  '/prova-sao-paulo',
  '/gerenciar-usuarios'
];

interface UserProfile {
  nome: string;
  email: string;
  perfil: "admin" | "user" | "super-user" | "user-pcd";
  status: "ativo" | "desabilitado";
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authProgress, setAuthProgress] = useState(0);
  const [profileProgress, setProfileProgress] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = !!user;

  // Função para buscar perfil do usuário com timeout aumentado
  const fetchUserProfile = async (firebaseUser: User) => {
    try {
      // Timeout aumentado para 10 segundos (conexões lentas)
      const profilePromise = UserProfilesService.getByFirebaseUid(firebaseUser.uid);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      );

      const userProfileData = await Promise.race([profilePromise, timeoutPromise]) as any;

      if (userProfileData) {
        const profile: UserProfile = {
          nome: userProfileData.fullName || firebaseUser.displayName || 'Usuário',
          email: userProfileData.email || firebaseUser.email || '',
          perfil: (userProfileData.role?.toLowerCase() as any) || 'user',
          status: userProfileData.isActive ? 'ativo' : 'desabilitado'
        };
        setUserProfile(profile);
        logger.info('✅ Perfil do usuário carregado com sucesso', { userId: firebaseUser.uid });
      } else {
        // Fallback: perfil padrão
        const fallbackProfile = {
          nome: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
          email: firebaseUser.email || '',
          perfil: 'user' as const,
          status: 'ativo' as const
        };
        setUserProfile(fallbackProfile);
        logger.warn('⚠️ Perfil não encontrado no Supabase, usando fallback', { userId: firebaseUser.uid });
      }
    } catch (error) {
      // Error handling robusto
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ Erro ao buscar perfil do usuário (usando fallback):', {
        error: errorMessage,
        userId: firebaseUser.uid
      });

      // Fallback sempre funcional
      setUserProfile({
        nome: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
        email: firebaseUser.email || '',
        perfil: 'user',
        status: 'ativo'
      });
    }
  };

  useEffect(() => {
    let authStep = 0;
    let profileStep = 0;

    // Simular progresso da autenticação com incrementos deterministas
    const authProgressInterval = setInterval(() => {
      setAuthProgress(prev => {
        if (prev >= 100) return 100;
        authStep += 1;
        const newProgress = Math.min(100, authStep * 8); // Incremento de 8% a cada 200ms
        return newProgress;
      });
    }, 200);

    // Timeout de segurança aumentado para conexões lentas (30s)
    const timeoutId = setTimeout(() => {
      logger.error('⏰ Timeout na verificação de autenticação após 30s', {
        pathname,
        timestamp: new Date().toISOString()
      });
      setLoading(false);
      clearInterval(authProgressInterval);
      setAuthError('Erro de conexão. Por favor, recarregue a página.');

      // Não forçar redirecionamento abrupto - pode causar ERR_CONNECTION_RESET
      // Apenas parar o loading e mostrar erro
      setAuthProgress(0);
      setProfileProgress(0);
    }, 30000); // 30 segundos máximo (conexões lentas/cold start)

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timeoutId); // Cancelar timeout se auth resolver
      clearInterval(authProgressInterval);
      setAuthProgress(100);

      setUser(firebaseUser);

      if (firebaseUser) {
        // Simular progresso do carregamento do perfil com incrementos deterministas
        const profileProgressInterval = setInterval(() => {
          setProfileProgress(prev => {
            if (prev >= 100) {
              clearInterval(profileProgressInterval);
              return 100;
            }
            profileStep += 1;
            const newProgress = Math.min(100, profileStep * 12); // Incremento de 12% a cada 150ms
            return newProgress;
          });
        }, 150);

        try {
          await fetchUserProfile(firebaseUser);
          clearInterval(profileProgressInterval);
          setProfileProgress(100);
        } catch (error) {
          logger.error('❌ Erro ao buscar perfil, continuando sem perfil:', { error });
          clearInterval(profileProgressInterval);
          setProfileProgress(100);
          setUserProfile({
            nome: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
            email: firebaseUser.email || '',
            perfil: 'user',
            status: 'ativo'
          });
        }
      } else {
        setUserProfile(null);
        setProfileProgress(0);
      }

      setLoading(false);

      // Lógica de redirecionamento após carregar o estado
      handleAuthRedirect(firebaseUser, pathname);
    });

    return () => {
      clearTimeout(timeoutId);
      clearInterval(authProgressInterval);
      unsubscribe();
    };
  }, [pathname, router]);

  // Função para lidar com redirecionamentos baseados na autenticação
  const handleAuthRedirect = (firebaseUser: User | null, currentPath: string) => {
    const isPublicRoute = PUBLIC_ROUTES.includes(currentPath);
    const isProtectedRoute = PROTECTED_ROUTES.some(route => currentPath.startsWith(route));
    
    if (!firebaseUser && isProtectedRoute) {
      router.replace('/login');
    } else if (firebaseUser && (currentPath === '/login')) {
      router.replace('/home');
    } else if (firebaseUser && currentPath === '/') {
      router.replace('/home');
    } else if (!firebaseUser && currentPath === '/') {
      router.replace('/login');
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
      router.replace('/login');
    } catch (error) {
      logger.error('❌ Erro no logout:', { error });
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    isAuthenticated,
    signOut
  };

  // Mostrar loading melhorado enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 relative overflow-hidden">
        {/* Elementos decorativos de fundo */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25"></div>

        {/* Círculos decorativos flutuantes */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-purple-300/20 rounded-full blur-3xl animate-pulse delay-500"></div>

        {/* Container principal centralizado */}
        <div className="relative flex min-h-screen items-center justify-center p-4">
          <div className="text-center">
            {/* Logo e título */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
              <div className="text-left">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Habib Control
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                  Sistema de Gestão Escolar
                </p>
              </div>
            </div>

            {/* Card de loading */}
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-0 shadow-2xl shadow-blue-500/10 dark:shadow-blue-400/10 rounded-3xl overflow-hidden p-8 max-w-md mx-auto">
              {/* Spinner animado */}
              <div className="relative mb-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100"></div>
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-blue-600 border-r-blue-500 absolute"></div>
              </div>

              {/* Texto principal */}
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Inicializando Sistema
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Verificando suas credenciais...
              </p>

              {/* Primeira barra de progresso - Autenticação */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Autenticação
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {Math.round(authProgress)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{width: `${authProgress}%`}}
                  ></div>
                </div>
              </div>

              {/* Segunda barra de progresso - Perfil do usuário */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Carregando perfil
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {Math.round(profileProgress)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{width: `${profileProgress}%`}}
                  ></div>
                </div>
              </div>

              {/* Status text dinâmico */}
              {authError ? (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">
                    {authError}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Recarregar Página
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {authProgress < 100 ? 'Conectando com servidor...' :
                   profileProgress < 100 ? 'Carregando dados do usuário...' :
                   'Finalizando...'}
                </p>
              )}
            </div>

            {/* Footer minimalista */}
            <div className="mt-8">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                © 2025 Habib Control • Carregando de forma segura
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar o contexto de autenticação
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Componente para proteger rotas
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  
  if (isProtectedRoute && !isAuthenticated) {
    return null; // O redirecionamento já foi feito no AuthProvider
  }

  return <>{children}</>;
}