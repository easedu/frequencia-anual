'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Activity, Clock, TrendingUp } from 'lucide-react';

interface WebhookStats {
  status: string;
  endpoint?: string;
  statistics: {
    totalWebhooksReceived: number;
    lastWebhookAt: string | null;
    timeSinceLastWebhookMs: number | null;
    timeSinceLastWebhookSeconds: string | null;
    averageIntervalSeconds: string | null;
    webhooksPerMinute: string;
  };
  history?: Array<{
    number: number;
    timestamp: string;
    messageId: string;
    event: string;
    status: string;
    timeSinceLastMs: number;
    processingTimeMs?: number;
  }>;
  timestamp: string;
}

export default function WebhookMonitorPage() {
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/evolution/webhooks/message-status?history=true&limit=20');
      const data = await response.json();
      setStats(data);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    if (autoRefresh) {
      const interval = setInterval(fetchStats, 3000); // Atualiza a cada 3 segundos
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Monitor de Webhooks WhatsApp
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Monitoramento em tempo real de atualizações de status
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="gap-2"
            >
              <Activity className={`w-4 h-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </Button>

            <Button onClick={fetchStats} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Total de Webhooks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {stats?.statistics.totalWebhooksReceived || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Último Webhook
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {stats?.statistics.timeSinceLastWebhookSeconds
                  ? `${stats.statistics.timeSinceLastWebhookSeconds}s atrás`
                  : 'Nenhum'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Intervalo Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {stats?.statistics.averageIntervalSeconds
                  ? `${stats.statistics.averageIntervalSeconds}s`
                  : 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Webhooks/min
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {stats?.statistics.webhooksPerMinute || '0'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Badge */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Status do Webhook
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge
                variant={stats?.status === 'online' ? 'default' : 'destructive'}
                className="text-sm"
              >
                {stats?.status === 'online' ? '🟢 Online' : '🔴 Offline'}
              </Badge>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Endpoint: {stats?.endpoint}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Webhook History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Histórico de Webhooks (Últimos 20)
            </CardTitle>
            <CardDescription>
              Atualizações de status recebidas da Evolution API
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!stats?.history || stats.history.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Nenhum webhook processado ainda. Envie uma mensagem WhatsApp para testar.
              </div>
            ) : (
              <div className="space-y-2">
                {stats.history.map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        #{entry.number}
                      </Badge>
                      <div>
                        <div className="font-medium text-sm text-slate-900 dark:text-white">
                          {entry.status}
                        </div>
                        <div className="text-xs text-slate-500">
                          MessageId: {entry.messageId.substring(0, 12)}...
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {new Date(entry.timestamp).toLocaleTimeString('pt-BR')}
                      </div>
                      <div className="text-xs text-slate-500">
                        {entry.processingTimeMs}ms
                        {entry.timeSinceLastMs < 1000 && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            Rápido demais!
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Info */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <strong>ℹ️ Como usar:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Este painel atualiza automaticamente a cada 3 segundos</li>
                <li>Envie uma mensagem WhatsApp para gerar webhooks</li>
                <li>Webhooks com intervalo &lt; 1s são destacados (possíveis duplicatas)</li>
                <li>Mantenha esta página aberta para monitoramento em tempo real</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
