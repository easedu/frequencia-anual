// @ts-nocheck
/**
 * Utilitário para gerenciar Service Worker
 * Registra, atualiza e comunica com o SW
 *
 * Note: @ts-nocheck usado devido a APIs experimentais do browser
 * (Background Sync, MessagePort.onerror) que não têm tipos completos
 */

import { logger } from '@/utils/logger';

interface ServiceWorkerMessage {
  type: string;
  data?: any;
}

interface ServiceWorkerAPI {
  register: () => Promise<ServiceWorkerRegistration | null>;
  unregister: () => Promise<boolean>;
  update: () => Promise<void>;
  isSupported: () => boolean;
  sendMessage: (message: ServiceWorkerMessage) => Promise<any>;
  getCacheStatus: () => Promise<{ cacheSize: number; isOnline: boolean }>;
  clearCache: () => Promise<void>;
  registerSync: (tag: string) => Promise<void>;
}

class ServiceWorkerManager implements ServiceWorkerAPI {
  private registration: ServiceWorkerRegistration | null = null;
  private isRegistered = false;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Verificar se Service Workers são suportados
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  /**
   * Registrar o Service Worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      logger.warn('Service Workers não são suportados neste navegador');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Sempre verificar atualizações
      });

      this.isRegistered = true;

      // Verificar atualizações periodicamente
      this.scheduleUpdateChecks();

      // Escutar mudanças no SW
      this.registration.addEventListener('updatefound', () => {
        this.handleUpdateFound();
      });

      return this.registration;

    } catch (error) {
      logger.error('❌ Falha ao registrar Service Worker:', error);
      return null;
    }
  }

  /**
   * Desregistrar o Service Worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const unregistered = await this.registration.unregister();
      return unregistered;
    } catch (error) {
      logger.error('❌ Erro ao desregistrar Service Worker:', error);
      return false;
    }
  }

  /**
   * Verificar e aplicar atualizações
   */
  async update(): Promise<void> {
    if (!this.registration) {
      throw new Error('Service Worker não está registrado');
    }

    try {
      await this.registration.update();
    } catch (error) {
      logger.error('❌ Erro na verificação de atualização:', error);
      throw error;
    }
  }

  /**
   * Enviar mensagem para o Service Worker
   */
  async sendMessage(message: ServiceWorkerMessage): Promise<any> {
    if (!navigator.serviceWorker.controller) {
      throw new Error('Service Worker não está ativo');
    }

    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        clearTimeout(timeoutId);
        
        if (event.data && event.data.error) {
          reject(new Error(event.data.error));
        } else if (event.data !== undefined) {
          resolve(event.data);
        } else {
          reject(new Error('Resposta vazia do Service Worker'));
        }
      };

      messageChannel.port1.onerror = (error) => {
        clearTimeout(timeoutId);
        reject(new Error('Erro no canal de comunicação: ' + error));
      };

      try {
        navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
      } catch (error) {
        reject(new Error('Erro ao enviar mensagem: ' + (error instanceof Error ? error.message : 'Unknown')));
        return;
      }

      // Timeout para evitar travamento
      timeoutId = setTimeout(() => {
        reject(new Error('Timeout na comunicação com Service Worker'));
      }, 3000); // Reduzido para 3s
    });
  }

  /**
   * Obter status do cache
   */
  async getCacheStatus(): Promise<{ cacheSize: number; isOnline: boolean }> {
    try {
      // Verificar se Service Worker está ativo
      if (!navigator.serviceWorker.controller) {
        return await this.getCacheStatusDirect();
      }

      // Tentar comunicação com Service Worker com timeout
      const result = await Promise.race([
        this.sendMessage({ type: 'GET_CACHE_STATUS' }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SW communication timeout')), 2000)
        )
      ]);
      
      return result as { cacheSize: number; isOnline: boolean };
    } catch (error) {
      logger.warn('Falha na comunicação com Service Worker, usando fallback:', { error: error instanceof Error ? error.message : 'Unknown error' });
      // Fallback: verificar cache diretamente
      return await this.getCacheStatusDirect();
    }
  }

  /**
   * Obter status do cache diretamente (fallback)
   */
  private async getCacheStatusDirect(): Promise<{ cacheSize: number; isOnline: boolean }> {
    try {
      if ('caches' in window) {
        const cache = await caches.open('frequencia-escolar-v1.0.0');
        const keys = await cache.keys();
        return {
          cacheSize: keys.length,
          isOnline: navigator.onLine
        };
      }
    } catch (error) {
      logger.warn('Erro ao verificar cache diretamente:', error);
    }

    return { cacheSize: 0, isOnline: navigator.onLine };
  }

  /**
   * Limpar todo o cache
   */
  async clearCache(): Promise<void> {
    try {
      await this.sendMessage({ type: 'CLEAR_CACHE' });
    } catch (error) {
      logger.error('Erro ao limpar cache:', error);
      throw error;
    }
  }

  /**
   * Registrar sincronização em background
   */
  async registerSync(tag: string): Promise<void> {
    if (!this.registration || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      throw new Error('Background Sync não é suportado');
    }

    try {
      await this.registration.sync.register(tag);
    } catch (error) {
      logger.error(`❌ Erro ao registrar sync: ${tag}`, error);
      throw error;
    }
  }

  /**
   * Configurar listeners para eventos do SW
   */
  private setupEventListeners(): void {
    if (!this.isSupported()) return;

    // Escutar mensagens do Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'SYNC_SUCCESS':
          this.notifyApp('syncSuccess', data);
          break;

        case 'CACHE_UPDATED':
          this.notifyApp('cacheUpdated', data);
          break;

        case 'OFFLINE_READY':
          this.notifyApp('offlineReady');
          break;
      }
    });

    // Detectar mudanças de conectividade
    window.addEventListener('online', () => {
      this.handleOnline();
    });

    window.addEventListener('offline', () => {
      this.handleOffline();
    });
  }

  /**
   * Lidar com nova versão do SW encontrada
   */
  private handleUpdateFound(): void {
    if (!this.registration) return;

    const newWorker = this.registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          this.notifyApp('updateAvailable');
        } else {
          this.notifyApp('appInstalled');
        }
      }
    });
  }

  /**
   * Agendar verificações de atualização
   */
  private scheduleUpdateChecks(): void {
    // Verificar atualizações a cada 1 hora
    setInterval(() => {
      if (this.registration) {
        this.registration.update();
      }
    }, 60 * 60 * 1000);
  }

  /**
   * Lidar com volta da conectividade
   */
  private async handleOnline(): void {
    try {
      // Tentar sincronizar dados pendentes
      await this.registerSync('attendance-sync');
      await this.registerSync('reports-sync');
    } catch (error) {
      logger.error('Erro na sincronização automática:', error);
    }
  }

  /**
   * Lidar com perda de conectividade
   */
  private handleOffline(): void {
    // Notificar app sobre modo offline
    this.notifyApp('offline');
  }

  /**
   * Notificar a aplicação sobre eventos do SW
   */
  private notifyApp(eventType: string, data?: any): void {
    // Disparar evento customizado para a aplicação
    window.dispatchEvent(new CustomEvent('sw-event', {
      detail: { type: eventType, data }
    }));
  }
}

// ============================================================================
// API PÚBLICA
// ============================================================================

const swManager = new ServiceWorkerManager();

/**
 * Registrar Service Worker automaticamente
 */
export async function registerServiceWorker(): Promise<void> {
  // Permitir em desenvolvimento para testes
  if (typeof window === 'undefined') {
    return; // SSR protection
  }

  if (!swManager.isSupported()) {
    logger.warn('Service Workers não são suportados neste navegador');
    return;
  }

  try {
    const registration = await swManager.register();

    if (registration) {
      // Aguardar o SW ficar ativo antes de tentar comunicação
      if (registration.installing) {
        await waitForServiceWorkerActivation(registration);
      }
    }
  } catch (error) {
    logger.error('❌ Falha na inicialização do Service Worker:', error);
  }
}

/**
 * Aguardar ativação do Service Worker
 */
function waitForServiceWorkerActivation(registration: ServiceWorkerRegistration): Promise<void> {
  return new Promise((resolve) => {
    const checkState = () => {
      if (registration.active) {
        resolve();
      } else {
        setTimeout(checkState, 100);
      }
    };
    checkState();
  });
}

/**
 * Forçar atualização do Service Worker
 */
export async function updateServiceWorker(): Promise<void> {
  try {
    await swManager.update();
    
    // Forçar ativação da nova versão
    if (navigator.serviceWorker.controller) {
      await swManager.sendMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  } catch (error) {
    logger.error('Erro ao atualizar Service Worker:', error);
    throw error;
  }
}

/**
 * Cache dados críticos para uso offline
 */
export async function cacheAttendanceData(data: any): Promise<void> {
  try {
    await swManager.sendMessage({
      type: 'CACHE_ATTENDANCE_DATA',
      data
    });
  } catch (error) {
    logger.error('Erro ao cachear dados de frequência:', error);
  }
}

/**
 * Registrar dados para sincronização
 */
export async function scheduleSync(type: 'attendance' | 'reports', data: any): Promise<void> {
  try {
    // Salvar no localStorage para sincronização posterior
    const key = `pending_${type}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push({
      id: Date.now(),
      data,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(key, JSON.stringify(existing));

    // Registrar sync se online
    if (navigator.onLine) {
      await swManager.registerSync(`${type}-sync`);
    }
  } catch (error) {
    logger.error('Erro ao agendar sincronização:', error);
  }
}

/**
 * Obter status do sistema offline
 */
export async function getOfflineStatus(): Promise<{
  isOnline: boolean;
  cacheSize: number;
  pendingSync: number;
  lastSync?: string;
}> {
  try {
    // Verificar cache status com fallback robusto
    let cacheSize = 0;
    let isOnline = navigator.onLine;

    try {
      const cacheStatus = await Promise.race([
        swManager.getCacheStatus(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cache status timeout')), 1000)
        )
      ]) as { cacheSize: number; isOnline: boolean };
      
      cacheSize = cacheStatus?.cacheSize || 0;
      isOnline = cacheStatus?.isOnline ?? navigator.onLine;
    } catch (cacheError) {
      // Fallback: tentar verificar cache diretamente
      try {
        if ('caches' in window) {
          const cache = await caches.open('frequencia-escolar-v1.0.0');
          const keys = await cache.keys();
          cacheSize = keys.length;
        }
      } catch (directCacheError) {
        cacheSize = 0;
      }
    }
    
    // Contar dados pendentes com tratamento de erro robusto
    let pendingSync = 0;
    try {
      const pendingAttendance = JSON.parse(localStorage.getItem('pending_attendance') || '[]');
      const pendingReports = JSON.parse(localStorage.getItem('pending_reports') || '[]');
      pendingSync = (Array.isArray(pendingAttendance) ? pendingAttendance.length : 0) +
                   (Array.isArray(pendingReports) ? pendingReports.length : 0);
    } catch (storageError) {
      pendingSync = 0;
    }

    let lastSync: string | undefined;
    try {
      lastSync = localStorage.getItem('lastSync') || undefined;
    } catch (syncError) {
      lastSync = undefined;
    }

    return {
      isOnline,
      cacheSize,
      pendingSync,
      lastSync
    };
  } catch (error) {
    logger.error('Erro crítico ao obter status offline:', { error: error instanceof Error ? error.message : 'Unknown error' });
    return {
      isOnline: navigator.onLine,
      cacheSize: 0,
      pendingSync: 0
    };
  }
}

/**
 * Limpar dados offline
 */
export async function clearOfflineData(): Promise<void> {
  try {
    await swManager.clearCache();
    
    // Limpar dados locais
    localStorage.removeItem('pending_attendance');
    localStorage.removeItem('pending_reports');
    localStorage.removeItem('lastSync');
  } catch (error) {
    logger.error('Erro ao limpar dados offline:', error);
    throw error;
  }
}

/**
 * Hook para escutar eventos do Service Worker
 */
export function useServiceWorker(callback: (event: { type: string; data?: any }) => void): (() => void) {
  if (typeof window === 'undefined') return () => {};

  const handleSWEvent = (event: Event) => {
    const customEvent = event as CustomEvent;
    callback(customEvent.detail);
  };

  window.addEventListener('sw-event', handleSWEvent);
  
  // Cleanup function
  return () => {
    window.removeEventListener('sw-event', handleSWEvent);
  };
}

export default swManager;