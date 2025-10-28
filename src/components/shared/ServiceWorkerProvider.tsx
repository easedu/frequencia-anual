"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { registerServiceWorker, useServiceWorker, getOfflineStatus } from "@/lib/serviceWorker";
import { logger } from "@/utils/logger";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Wifi, WifiOff } from "lucide-react";

// Função de debounce simples
function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface OfflineStatus {
  isOnline: boolean;
  cacheSize: number;
  pendingSync: number;
  lastSync?: string;
}

interface ServiceWorkerContextType {
  isOnline: boolean;
  offlineStatus: OfflineStatus;
  refreshStatus: () => Promise<void>;
  updateAvailable: boolean;
  applyUpdate: () => void;
}

const ServiceWorkerContext = createContext<ServiceWorkerContextType | undefined>(undefined);

interface ServiceWorkerProviderProps {
  children: ReactNode;
}

export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>({
    isOnline: true,
    cacheSize: 0,
    pendingSync: 0
  });
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [showOfflineToast, setShowOfflineToast] = useState(false);
  const [showOnlineToast, setShowOnlineToast] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await getOfflineStatus();
      setOfflineStatus(status);
      setIsOnline(status.isOnline);
      //   isOnline: status.isOnline,
      //   cacheSize: status.cacheSize,
      //   pendingSync: status.pendingSync
      // });
    } catch (error) {
      logger.warn('Erro ao atualizar status, usando fallback:', { error: error instanceof Error ? error.message : 'Unknown error' });
      // Fallback básico mais robusto
      const fallbackStatus = {
        isOnline: navigator.onLine,
        cacheSize: 0,
        pendingSync: 0
      };
      setIsOnline(fallbackStatus.isOnline);
      setOfflineStatus(fallbackStatus);
    }
  }, []);

  // Debounce para refreshStatus
  const debouncedRefreshStatus = useCallback(
    debounce(refreshStatus, 1000),
    [refreshStatus]
  );

  // Inicializar Service Worker
  useEffect(() => {
    const initServiceWorker = async () => {
      try {
        await registerServiceWorker();
        await refreshStatus();
      } catch (error) {
        logger.error('Erro na inicialização do Service Worker:', { error });
      }
    };

    initServiceWorker();
  }, [refreshStatus]);

  // Monitorar status de conectividade
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineToast(true);
      debouncedRefreshStatus();
      
      // Esconder toast após 3 segundos
      setTimeout(() => setShowOnlineToast(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineToast(true);
      debouncedRefreshStatus();
    };

    // Estado inicial
    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshStatus]);

  // Escutar eventos do Service Worker
  useEffect(() => {
    const cleanup = useServiceWorker((event) => {
      const { type, data } = event;

      switch (type) {
        case 'updateAvailable':
          setUpdateAvailable(true);
          setShowUpdateToast(true);
          logger.info('🆕 Nova versão disponível');
          break;

        case 'syncSuccess':
          logger.info(`✅ Sincronização bem-sucedida: ${data}`);
          debouncedRefreshStatus();
          break;

        case 'offlineReady':
          logger.info('🔌 App pronto para uso offline');
          break;

        case 'appInstalled':
          logger.info('✅ App instalado com sucesso');
          break;

        case 'PROCESS_ATTENDANCE_SYNC':
          logger.info('🔄 Processando sincronização de faltas...');
          processPendingAttendanceSync();
          break;

        default:
          logger.info('Evento do SW:', { type, data });
      }
    });

    return cleanup;
  }, [refreshStatus]);

  const applyUpdate = () => {
    window.location.reload();
  };

  // Função para processar sincronização de faltas pendentes
  const processPendingAttendanceSync = async () => {
    try {
      const pendingAttendance = localStorage.getItem('pending_attendance');
      if (!pendingAttendance) {
        logger.info('Nenhuma falta pendente para sincronizar');
        return;
      }

      const attendanceItems = JSON.parse(pendingAttendance);
      if (attendanceItems.length === 0) {
        logger.info('Lista de faltas pendentes está vazia');
        return;
      }

      logger.info(`Sincronizando ${attendanceItems.length} registros de falta`);

      // Importar Supabase services dinamicamente para evitar SSR issues
      const { AbsenceService } = await import('@/services/supabase/absenceService');

      // Processar cada item de falta pendente
      for (const item of attendanceItems) {
        try {
          const { data: attendanceData } = item;

          if (attendanceData && attendanceData.absences) {
            // Adicionar cada ausência via Supabase
            for (const absence of attendanceData.absences) {
              await AbsenceService.create({
                estudanteId: absence.estudanteId,
                data: absence.data,
                justified: absence.justificationType !== 'NAO_JUSTIFICADA',
              });
            }

            logger.info(`✅ Sincronizado: ${attendanceData.absences.length} faltas da turma ${attendanceData.class}`);
          }
        } catch (syncError) {
          logger.error('Erro ao sincronizar item:', { error: syncError, item });
        }
      }

      // Limpar dados sincronizados
      localStorage.removeItem('pending_attendance');
      localStorage.setItem('lastSync', new Date().toISOString());

      // Atualizar status
      await debouncedRefreshStatus();

      logger.info('🎉 Sincronização de faltas concluída com sucesso!');

    } catch (error) {
      logger.error('Erro na sincronização de faltas:', { error });
    }
  };

  const value: ServiceWorkerContextType = {
    isOnline,
    offlineStatus,
    refreshStatus,
    updateAvailable,
    applyUpdate
  };

  return (
    <ServiceWorkerContext.Provider value={value}>
      {children}

      {/* Toast de atualização disponível */}
      {showUpdateToast && updateAvailable && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                <div>
                  <p className="font-medium">Nova versão disponível!</p>
                  <p className="text-sm text-blue-100">Clique para atualizar</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUpdateToast(false)}
                  className="text-white hover:bg-blue-700"
                >
                  ✕
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={applyUpdate}
                  className="bg-white text-blue-600 hover:bg-blue-50"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Atualizar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast de modo offline */}
      {showOfflineToast && !isOnline && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className="bg-orange-600 text-white p-4 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WifiOff className="w-5 h-5" />
                <div>
                  <p className="font-medium">Modo Offline</p>
                  <p className="text-sm text-orange-100">
                    Funcionalidades limitadas disponíveis
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOfflineToast(false)}
                className="text-white hover:bg-orange-700"
              >
                ✕
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de volta online */}
      {showOnlineToast && isOnline && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className="bg-green-600 text-white p-4 rounded-lg shadow-lg animate-slide-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                <div>
                  <p className="font-medium">Conectado!</p>
                  <p className="text-sm text-green-100">
                    Sincronizando dados...
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOnlineToast(false)}
                className="text-white hover:bg-green-700"
              >
                ✕
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de status na parte inferior (sutil) */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-40">
          <div className="bg-slate-800 text-white text-xs px-3 py-2 rounded-full flex items-center gap-2 shadow-lg">
            <WifiOff className="w-3 h-3" />
            <span>Offline</span>
            {offlineStatus.pendingSync > 0 && (
              <>
                <span>•</span>
                <span>{offlineStatus.pendingSync} pendente(s)</span>
              </>
            )}
          </div>
        </div>
      )}
    </ServiceWorkerContext.Provider>
  );
}

// Hook para usar o contexto do Service Worker
export function useServiceWorkerContext(): ServiceWorkerContextType {
  const context = useContext(ServiceWorkerContext);
  if (context === undefined) {
    throw new Error('useServiceWorkerContext must be used within a ServiceWorkerProvider');
  }
  return context;
}

// Hook para verificar se está offline
export function useOfflineStatus(): {
  isOffline: boolean;
  pendingSync: number;
  cacheSize: number;
} {
  const { isOnline, offlineStatus } = useServiceWorkerContext();
  
  return {
    isOffline: !isOnline,
    pendingSync: offlineStatus.pendingSync,
    cacheSize: offlineStatus.cacheSize
  };
}