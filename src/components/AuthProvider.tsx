"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase.config";
import { collection, query, where, getDocs } from "firebase/firestore";
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
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = !!user;

  // Função para buscar perfil do usuário com timeout
  const fetchUserProfile = async (firebaseUser: User) => {
    try {
      const q = query(collection(db, "users"), where("uid", "==", firebaseUser.uid));
      
      // Timeout para busca do perfil (3 segundos máximo)
      const profilePromise = getDocs(q);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
      );
      
      const querySnapshot = await Promise.race([profilePromise, timeoutPromise]) as any;
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        const profile: UserProfile = {
          nome: data.nome || firebaseUser.displayName || 'Usuário',
          email: data.email || firebaseUser.email || '',
          perfil: data.perfil || 'user',
          status: data.status || 'ativo'
        };
        setUserProfile(profile);
        logger.info('👤 Perfil do usuário carregado:', { nome: profile.nome, perfil: profile.perfil });
      } else {
        logger.warn('⚠️ Perfil do usuário não encontrado no Firestore');
        setUserProfile({
          nome: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
          email: firebaseUser.email || '',
          perfil: 'user',
          status: 'ativo'
        });
      }
    } catch (error) {
      logger.error('❌ Erro ao buscar perfil do usuário (usando fallback):', { error });
      setUserProfile({
        nome: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
        email: firebaseUser.email || '',
        perfil: 'user',
        status: 'ativo'
      });
    }
  };

  useEffect(() => {
    logger.info('🔐 Inicializando AuthProvider...');

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

    // Timeout de segurança para evitar loading infinito
    const timeoutId = setTimeout(() => {
      logger.warn('⏰ Timeout na verificação de autenticação, forçando redirecionamento');
      setLoading(false);
      clearInterval(authProgressInterval);
      router.replace('/login');
    }, 10000); // 10 segundos máximo

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timeoutId); // Cancelar timeout se auth resolver
      clearInterval(authProgressInterval);
      setAuthProgress(100);

      logger.info('👤 Estado de autenticação mudou:', {
        hasUser: !!firebaseUser,
        uid: firebaseUser?.uid,
        email: firebaseUser?.email
      });

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
      logger.info('🔐 Limpando listener de autenticação');
      unsubscribe();
    };
  }, [pathname, router]);

  // Função para lidar com redirecionamentos baseados na autenticação
  const handleAuthRedirect = (firebaseUser: User | null, currentPath: string) => {
    const isPublicRoute = PUBLIC_ROUTES.includes(currentPath);
    const isProtectedRoute = PROTECTED_ROUTES.some(route => currentPath.startsWith(route));
    
    if (!firebaseUser && isProtectedRoute) {
      // Usuário não autenticado tentando acessar rota protegida
      logger.info('🚫 Redirecionando usuário não autenticado para login');
      router.replace('/login');
    } else if (firebaseUser && (currentPath === '/login')) {
      // Usuário autenticado tentando acessar login
      logger.info('✅ Redirecionando usuário autenticado para home');
      router.replace('/home');
    } else if (firebaseUser && currentPath === '/') {
      // Usuário autenticado na URL base - redirecionar para home
      logger.info('🏠 Redirecionando usuário autenticado da URL base para home');
      router.replace('/home');
    } else if (!firebaseUser && currentPath === '/') {
      // Usuário não autenticado na URL base - redirecionar para login
      logger.info('🔑 Redirecionando usuário não autenticado da URL base para login');
      router.replace('/login');
    }
  };

  const signOut = async () => {
    try {
      logger.info('🚪 Fazendo logout...');
      await auth.signOut();
      logger.info('✅ Logout realizado com sucesso');
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
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {authProgress < 100 ? 'Conectando com servidor...' :
                 profileProgress < 100 ? 'Carregando dados do usuário...' :
                 'Finalizando...'}
              </p>
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