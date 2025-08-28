"use client";

import { useState, useEffect } from "react";
import { WifiOff, RefreshCw, CheckCircle, AlertCircle, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState(0);
  const [cacheSize, setCacheSize] = useState(0);

  useEffect(() => {
    // Verificar status da conexão
    setIsOnline(navigator.onLine);

    // Listeners para mudanças de conectividade
    const handleOnline = () => {
      setIsOnline(true);
      // Tentar sincronizar dados pendentes
      syncPendingData();
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar dados em cache
    checkCacheStatus();
    loadPendingActions();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkCacheStatus = async () => {
    if ('serviceWorker' in navigator && 'caches' in window) {
      try {
        const cache = await caches.open('frequencia-escolar-v1.0.0');
        const keys = await cache.keys();
        setCacheSize(keys.length);
      } catch (error) {
        console.error('Erro ao verificar cache:', error);
      }
    }
  };

  const loadPendingActions = () => {
    // Carregar ações pendentes do localStorage
    const pending = localStorage.getItem('pendingAttendance');
    if (pending) {
      const data = JSON.parse(pending);
      setPendingActions(data.length || 0);
    }

    const lastSyncTime = localStorage.getItem('lastSync');
    if (lastSyncTime) {
      setLastSync(new Date(lastSyncTime).toLocaleString('pt-BR'));
    }
  };

  const syncPendingData = async () => {
    if (!isOnline) return;

    try {
      // Registrar sync em background
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('attendance-sync');
        
        setLastSync(new Date().toLocaleString('pt-BR'));
        localStorage.setItem('lastSync', new Date().toISOString());
        setPendingActions(0);
      }
    } catch (error) {
      console.error('Erro na sincronização:', error);
    }
  };

  const retryConnection = () => {
    // Forçar verificação de conectividade
    setIsOnline(navigator.onLine);
    if (navigator.onLine) {
      // Tentar recarregar a página
      window.location.reload();
    }
  };

  const clearOfflineData = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    localStorage.removeItem('pendingAttendance');
    localStorage.removeItem('lastSync');
    setCacheSize(0);
    setPendingActions(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* Header com status de conexão */}
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-center mb-4">
              <div className={`p-4 rounded-full ${isOnline ? 'bg-green-100' : 'bg-red-100'}`}>
                {isOnline ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <WifiOff className="w-8 h-8 text-red-600" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              {isOnline ? 'Conectado!' : 'Você está offline'}
            </CardTitle>
            <p className="text-slate-600 mt-2">
              {isOnline 
                ? 'Conexão restaurada. Sincronizando dados...'
                : 'Não há conexão com a internet no momento.'
              }
            </p>
          </CardHeader>
        </Card>

        {/* Informações do Sistema Offline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Status do Cache */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="w-5 h-5 text-blue-600" />
                Dados em Cache
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Recursos salvos:</span>
                  <Badge variant="outline">{cacheSize} arquivos</Badge>
                </div>
                
                <div className="text-sm text-slate-500">
                  • Lista de estudantes
                  • Calendário letivo
                  • Páginas principais
                  • Relatórios recentes
                </div>
                
                {cacheSize > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Sistema funcional offline
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dados Pendentes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-orange-600" />
                Sincronização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Ações pendentes:</span>
                  <Badge variant={pendingActions > 0 ? "destructive" : "default"}>
                    {pendingActions}
                  </Badge>
                </div>
                
                {lastSync && (
                  <div className="text-xs text-slate-500">
                    Última sincronização: {lastSync}
                  </div>
                )}
                
                {pendingActions > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-orange-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Dados serão enviados quando voltar online
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Funcionalidades Disponíveis Offline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🔌 Funcionalidades Disponíveis Offline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">✅ Disponível:</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Visualizar lista de estudantes</li>
                  <li>• Marcar faltas (salva localmente)</li>
                  <li>• Consultar calendário letivo</li>
                  <li>• Ver relatórios em cache</li>
                  <li>• Navegação entre páginas</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-orange-600">⏳ Requer Internet:</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Sincronizar faltas marcadas</li>
                  <li>• Cadastrar novos estudantes</li>
                  <li>• Gerar novos relatórios</li>
                  <li>• Backup de dados</li>
                  <li>• Atualizações do sistema</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={retryConnection}
            className="flex-1 flex items-center gap-2"
            variant={isOnline ? "default" : "outline"}
          >
            <RefreshCw className="w-4 h-4" />
            {isOnline ? 'Recarregar Sistema' : 'Tentar Reconectar'}
          </Button>
          
          {isOnline && (
            <Button 
              onClick={syncPendingData}
              className="flex-1 flex items-center gap-2"
              disabled={pendingActions === 0}
            >
              <Upload className="w-4 h-4" />
              Sincronizar Dados ({pendingActions})
            </Button>
          )}
          
          <Button 
            onClick={clearOfflineData}
            variant="ghost"
            className="flex items-center gap-2"
          >
            Limpar Cache
          </Button>
        </div>

        {/* Dica para desenvolvimento */}
        <div className="text-center text-xs text-slate-400">
          💡 <strong>Para desenvolvedores:</strong> Teste o modo offline nas DevTools → Network → Offline
        </div>
      </div>
    </div>
  );
}