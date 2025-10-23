"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  User,
  School,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  TrendingDown,
  Eye,
  EyeOff,
  BookOpen,
  Users,
  AlertCircle,
  Trash2,
  RefreshCw,
  Phone
} from 'lucide-react';
import { auth } from '@/firebase.config';
// ✅ SPRINT 4 - FASE 7: 100% migrado para API REST
import {
  useStudents,
  useInteractions,
  useUpdateTask,
  useDeleteTask,
  useCreateInteraction
} from '@/hooks/api';
import { useEnrichedTasks, EnrichedTask } from '@/hooks/useEnrichedTasks';
import type { DashboardTask, TaskSection, TaskPriorityLevel } from '@/types/dashboardTasks';
import type { UserTask } from '@/types/tasks';
import type { Contato } from '@/types';
import RegisterInteractionCard from '@/components/interactions/RegisterInteractionCard';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

type Role = "admin" | "super-user" | "user" | "user-pcd";

interface TaskDashboardProps {
  userRole: Role | null;
}

export default function TaskDashboard({ userRole }: TaskDashboardProps) {
  const [selectedTask, setSelectedTask] = useState<DashboardTask | null>(null);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [interactionType, setInteractionType] = useState<string>("Conselho tutelar");
  const [interactionDate, setInteractionDate] = useState<string>(new Date().toLocaleDateString("pt-BR"));
  const [interactionDescription, setInteractionDescription] = useState<string>("");
  const [interactionSensitive, setInteractionSensitive] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [taskSections, setTaskSections] = useState<TaskSection[]>([]);
  const [clearingData, setClearingData] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [studentContacts, setStudentContacts] = useState<Contato[]>([]);

  // Estados para controlar a visibilidade das seções resolvidas
  const [showResolvedSections, setShowResolvedSections] = useState<Record<TaskPriorityLevel, boolean>>({
    routine: false,
    attention: false,
    critical: false
  });

  // Hooks da API REST
  // ✅ MELHOR PRÁTICA: useEnrichedTasks já traz dados do estudante
  const { tasks: enrichedTasks, loading: tasksLoading, refetch: refetchTasks } = useEnrichedTasks({
    created_by: 'AUTOMAÇÃO'
  });
  const { interactions } = useInteractions();
  const { updateTask } = useUpdateTask();
  const { deleteTask } = useDeleteTask();
  const { createInteraction } = useCreateInteraction();

  // Função para capitalizar primeira letra
  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Função para formatar telefone com máscara
  const formatPhoneNumber = (phone: string) => {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');

    // Aplica máscara baseada no tamanho
    if (cleanPhone.length === 11) {
      // Celular: (11) 91234-5678
      return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleanPhone.length === 10) {
      // Fixo: (11) 1234-5678
      return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else if (cleanPhone.length === 9) {
      // Celular sem DDD: 91234-5678
      return cleanPhone.replace(/(\d{5})(\d{4})/, '$1-$2');
    } else if (cleanPhone.length === 8) {
      // Fixo sem DDD: 1234-5678
      return cleanPhone.replace(/(\d{4})(\d{4})/, '$1-$2');
    }

    // Retorna o número original se não se encaixa em nenhum padrão
    return phone;
  };

  // Função para buscar dados completos do estudante (mantida para compatibilidade)
  // ✅ NOTA: enrichedTasks já tem studentName, studentClass, etc.
  // Esta função é usada apenas para buscar contatos ao resolver tarefa
  const getStudentData = (estudanteId: string) => {
    try {
      // enrichedTasks usa Internal ID, então buscamos por student_id (Internal ID)
      const enrichedTask = enrichedTasks.find(t => t.student_id === estudanteId);

      if (!enrichedTask) {
        logger.warn('[getStudentData] Estudante não encontrado', { estudanteId });
        return null;
      }

      // Retornar dados básicos já enriquecidos
      return {
        id: enrichedTask.student_id,
        student_id: enrichedTask.student_id,
        name: enrichedTask.studentName,
        class: enrichedTask.studentClass,
        shift: enrichedTask.studentShift,
        status: enrichedTask.studentStatus,
        contatos: [] // Será buscado via API quando necessário
      };
    } catch (error) {
      logger.error('Erro ao buscar dados do estudante:', error as Error);
      return null;
    }
  };

  // Função para buscar dados atuais da interação (usando hook API REST)
  const getInteractionData = (estudanteId: string, interactionId: string) => {
    try {
      const interaction = interactions.find(
        i => (i as any).interaction_id === interactionId && (i as any).student_id === estudanteId
      );

      if (interaction) {
        return {
          type: (interaction as any).interaction_type || 'Resolvida via API',
          description: interaction.description || 'Tarefa marcada como resolvida automaticamente pela API',
          createdBy: (interaction as any).created_by || 'Usuário desconhecido',
          exists: true
        };
      }

      // Interação não encontrada
      logger.warn(`[TASK-DASHBOARD] Interação não encontrada: ${interactionId} (estudante: ${estudanteId})`);
      return {
        type: 'Interação removida',
        description: 'A interação associada a esta tarefa foi removida',
        createdBy: 'Desconhecido',
        exists: false
      };
    } catch (error) {
      logger.error('Erro ao buscar dados da interação:', error as Error);
      return null;
    }
  };

  // Função para converter EnrichedTask para DashboardTask
  const convertEnrichedTaskToDashboardTask = (enrichedTask: EnrichedTask): DashboardTask => {
    const monthName = new Date(enrichedTask.created_at).toLocaleDateString('pt-BR', { month: 'long' });

    // ✅ Dados do estudante já vêm enriquecidos!
    // Não precisa buscar, já está em enrichedTask.studentName, etc

    // Parsear metadata para obter dados específicos da tarefa (se houver)
    const metadata = enrichedTask.metadata || {};
    const absencesCount = metadata.absencesCount || 0;
    const frequencyPercentage = metadata.frequencyPercentage || 100;
    const bimester = metadata.bimester || 'N/A';

    // Determinar ação recomendada e prioridade baseado no título/descrição
    let recommendedAction = enrichedTask.action_taken || 'Contato com a família';
    let priority: TaskPriorityLevel = 'routine';

    // Inferir prioridade baseado no título/descrição
    if (enrichedTask.title.includes('CRÍTICO') || enrichedTask.title.includes('SEM CONTATO')) {
      priority = 'critical';
    } else if (enrichedTask.title.includes('⚠️') || absencesCount >= 10) {
      priority = 'attention';
    }

    let resolvedAction = enrichedTask.action_taken || 'Resolvida via API';
    let resolvedDescription = enrichedTask.description || 'Tarefa marcada como resolvida automaticamente';
    let resolvedBy = enrichedTask.resolved_by || enrichedTask.created_by;

    return {
      id: enrichedTask.id,
      title: enrichedTask.title,
      studentName: enrichedTask.studentName,       // ✅ Já enriquecido!
      studentClass: enrichedTask.studentClass,     // ✅ Já enriquecido!
      shift: enrichedTask.studentShift,            // ✅ Já enriquecido!
      bimester,
      month: capitalizeFirstLetter(monthName),
      absencesCount,
      frequencyPercentage,
      isPCD: enrichedTask.studentIsPCD || false,   // ✅ Já enriquecido!
      recommendedAction,
      priority,
      status: enrichedTask.is_resolved ? 'resolved' : 'pending',
      createdAt: new Date(enrichedTask.created_at),
      createdBy: enrichedTask.created_by || 'Não informado',
      resolvedAt: enrichedTask.resolved_at ? new Date(enrichedTask.resolved_at) : undefined,
      resolvedAction: enrichedTask.is_resolved ? resolvedAction : undefined,
      resolvedDescription: enrichedTask.is_resolved ? resolvedDescription : undefined,
      resolvedBy: enrichedTask.is_resolved ? resolvedBy : undefined,
      estudanteId: enrichedTask.student_id // Internal ID do Supabase
    };
  };

  // Função para limpar referências de interações deletadas
  const cleanupDeletedInteractions = async (userTasks: UserTask[]) => {
    const tasksToUpdate: Array<{id: string, updates: Partial<UserTask>}> = [];

    for (const task of userTasks) {
      if (task.status === 'COMPLETED' && task.interactionId) {
        const interactionData = await getInteractionData(task.estudanteId, task.interactionId);
        if (interactionData && !interactionData.exists) {
          tasksToUpdate.push({
            id: task.id,
            updates: {
              interactionId: undefined,
              interactionType: 'Interação removida',
              interactionDescription: 'A interação associada a esta tarefa foi removida',
              resolvedBy: 'Desconhecido'
            }
          });
        }
      }
    }

    // Atualizar tarefas que perderam suas interações
    if (tasksToUpdate.length > 0) {
      try {
        for (const { id, updates } of tasksToUpdate) {
          await updateTask(id, updates as any);
        }
      } catch (error) {
        logger.error('Erro ao atualizar tarefas com interações removidas:', error as Error);
      }
    }
  };

  // Carregar tarefas (usando hook API REST com dados enriquecidos)
  const loadTasks = async () => {
    try {
      setLoading(true);

      // ✅ VALIDAÇÃO: Garantir que enrichedTasks é array
      if (!Array.isArray(enrichedTasks)) {
        logger.warn('[TaskDashboard] enrichedTasks não é array', { enrichedTasks });
        setLoading(false);
        return;
      }

      // Converter para DashboardTask (agora muito mais simples!)
      const dashboardTasks = enrichedTasks.map(convertEnrichedTaskToDashboardTask);

      // Criar seções baseadas nas tarefas reais
      const sections: TaskSection[] = [
        {
          id: 'routine',
          title: 'Tarefas do Dia a Dia',
          description: 'Acompanhamento rotineiro de frequência escolar',
          allowedRoles: ['admin', 'super-user', 'user'],
          pendingTasks: dashboardTasks.filter((task: DashboardTask) => task.priority === 'routine' && task.status === 'pending'),
          resolvedTasks: dashboardTasks.filter((task: DashboardTask) => task.priority === 'routine' && task.status === 'resolved')
        },
        {
          id: 'attention',
          title: 'Tarefas que Exigem Atenção',
          description: 'Situações que necessitam intervenção mais atenta',
          allowedRoles: ['admin', 'super-user'],
          pendingTasks: dashboardTasks.filter((task: DashboardTask) => task.priority === 'attention' && task.status === 'pending'),
          resolvedTasks: dashboardTasks.filter((task: DashboardTask) => task.priority === 'attention' && task.status === 'resolved')
        },
        {
          id: 'critical',
          title: 'Tarefas Críticas',
          description: 'Situações críticas que demandam ação imediata',
          allowedRoles: ['admin'],
          pendingTasks: dashboardTasks.filter((task: DashboardTask) => task.priority === 'critical' && task.status === 'pending'),
          resolvedTasks: dashboardTasks.filter((task: DashboardTask) => task.priority === 'critical' && task.status === 'resolved')
        }
      ];

      setTaskSections(sections);
    } catch (error) {
      logger.error('Erro ao carregar tarefas:', error as Error);
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  // Função para limpar todos os dados criados pela API (usando hook API REST)
  const clearApiData = async () => {
    if (!confirm('Tem certeza que deseja limpar todos os dados criados pela API? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setClearingData(true);

      // ✅ VALIDAÇÃO: Garantir que enrichedTasks é array
      if (!Array.isArray(enrichedTasks)) {
        toast.error('Erro: dados de tarefas inválidos');
        setClearingData(false);
        return;
      }

      // Deletar todas as tarefas
      if (enrichedTasks.length > 0) {
        for (const task of enrichedTasks) {
          await deleteTask(task.id);
        }
        toast.success(`${enrichedTasks.length} tarefa(s) excluída(s) com sucesso!`);

        // Recarregar dados
        await refetchTasks();
      } else {
        toast.info('Nenhuma tarefa encontrada para exclusão');
      }
    } catch (error) {
      logger.error('Erro ao limpar dados da API:', error as Error);
      toast.error('Erro ao limpar dados');
    } finally {
      setClearingData(false);
    }
  };

  // Função para limpar histórico de mensagens WhatsApp (APENAS AUTOMAÇÃO)
  const clearMessageHistory = async () => {
    if (!confirm('Tem certeza que deseja limpar o histórico de mensagens da AUTOMAÇÃO? Isso permitirá que a automação reenvie mensagens. Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setClearingHistory(true);

      const user = auth.currentUser;
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch('/api/messages/history', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API retornou ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const { deletedCount, taskIdsFound, strategy } = result;

        if (strategy === 'SELECTIVE') {
          toast.success(
            `Histórico da automação limpo (seletivo)!\n${deletedCount || 0} mensagens excluídas (vinculadas a ${taskIdsFound || 0} tasks)`,
            { duration: 5000 }
          );
        } else {
          toast.success(
            `Histórico limpo (completo)!\n${deletedCount || 0} mensagens excluídas (sem tasks para vincular)`,
            { duration: 5000 }
          );
        }
      } else {
        toast.error('Erro ao limpar histórico');
      }
    } catch (error) {
      logger.error('Erro ao limpar histórico de mensagens:', error as Error);
      toast.error('Erro ao limpar histórico de mensagens');
    } finally {
      setClearingHistory(false);
    }
  };

  // Função para copiar telefone
  const copyPhoneToClipboard = async (phone: string, contactName: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success(`Telefone de ${contactName} copiado!`);
    } catch (error) {
      toast.error('Erro ao copiar telefone');
    }
  };

  // Carregar dados quando enrichedTasks mudar
  useEffect(() => {
    if (!tasksLoading) {
      loadTasks();
    }
  }, [enrichedTasks, tasksLoading]);

  // Filtrar seções baseado no role do usuário
  const getFilteredSections = (): TaskSection[] => {
    return taskSections.filter(section =>
      section.allowedRoles.includes(userRole || 'user')
    );
  };

  // Abrir modal de resolução
  const handleResolveTask = async (task: DashboardTask) => {
    setSelectedTask(task);
    setShowInteractionModal(true);

    // Buscar contatos do estudante
    try {
      const studentData = await getStudentData(task.estudanteId);
      setStudentContacts(studentData?.contatos || []);
    } catch (error) {
      logger.error('Erro ao buscar contatos do estudante:', error as Error);
      setStudentContacts([]);
    }

    // Lista completa de tipos disponíveis (igual ao perfil-estudante)
    const allTypes = [
      'Contato telefônico',
      'Contato digital',
      'Conversa com a família',
      'Visita domiciliar da ABAE',
      'Compensação de ausência',
      'Carta registrada',
      'Conselho tutelar',
      'Desligamento',
      'Justificativa da família',
      'Necessário acompanhamento da família',
      'Observações'
    ];

    // Verificar se recommended_action existe na lista e usar como padrão
    const defaultType = allTypes.includes(task.recommendedAction)
      ? task.recommendedAction
      : "Conselho tutelar";

    // Reset form
    setInteractionType(defaultType);
    setInteractionDate(new Date().toLocaleDateString("pt-BR"));
    setInteractionDescription("");
    setInteractionSensitive(false);
  };

  // Resolver tarefa com salvamento real
  const handleResolveTaskAction = async () => {
    if (!selectedTask || !interactionDescription.trim()) {
      toast.error('Descrição da interação é obrigatória');
      return;
    }

    try {
      // 1. Preparar dados da interação
      // Converter data para formato Supabase (YYYY-MM-DD)
      const parseDateToSupabase = (dateStr: string): string | null => {
        const [day, month, year] = dateStr.split('/').map(Number);
        if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || month < 1 || month > 12 || day > 31) return null;
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      };

      const formattedDate = parseDateToSupabase(interactionDate);
      if (!formattedDate) {
        toast.error('Data inválida. Use o formato DD/MM/YYYY.');
        return;
      }

      // Obter nome do usuário atual
      const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido";

      // 2. Salvar interação usando hook (API REST - snake_case)
      const createdInteraction = await createInteraction({
        student_id: selectedTask.estudanteId,
        interaction_type: interactionType,
        interaction_date: formattedDate,
        description: interactionDescription,
        is_sensitive: interactionSensitive,
        created_by: currentUser
      });

      // 3. Atualizar tarefa como completada
      await updateTask(selectedTask.id, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        interactionId: createdInteraction.interaction_id,
        interactionType: interactionType,
        interactionDescription: interactionDescription,
        resolvedBy: currentUser
      } as any);

      toast.success('Tarefa resolvida com sucesso!');
      setShowInteractionModal(false);
      setSelectedTask(null);
      setStudentContacts([]); // Limpar contatos após resolução

      // Recarregar tarefas
      await refetchTasks();

    } catch (error) {
      logger.error('Erro ao resolver tarefa:', error as Error);
      toast.error('Erro ao resolver tarefa');
    }
  };

  const handleCancelInteraction = () => {
    setShowInteractionModal(false);
    setSelectedTask(null);
    setStudentContacts([]); // Limpar contatos ao fechar modal
  };

  // Toggle para mostrar/ocultar seções resolvidas
  const toggleResolvedSection = (priority: TaskPriorityLevel) => {
    setShowResolvedSections(prev => ({
      ...prev,
      [priority]: !prev[priority]
    }));
  };

  // Função para determinar ícone da prioridade
  const getPriorityIcon = (priority: TaskPriorityLevel) => {
    switch (priority) {
      case 'routine':
        return <BookOpen className="w-5 h-5 text-green-600" />;
      case 'attention':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
  };

  // Função para determinar cor da prioridade
  const getPriorityColor = (priority: TaskPriorityLevel) => {
    switch (priority) {
      case 'routine':
        return 'border-l-green-500 bg-green-50';
      case 'attention':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'critical':
        return 'border-l-red-500 bg-red-50';
    }
  };

  if (loading || tasksLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-gray-600">Carregando tarefas...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Painel de Tarefas</h1>
        <p className="text-gray-600">
          Acompanhamento centralizado de tarefas de frequência escolar organizadas por prioridade
        </p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            {userRole === 'admin' ? 'Administrador' : userRole === 'super-user' ? 'Super Usuário' : 'Usuário'}
          </Badge>

          {/* Botão para recarregar dados */}
          <Button
            onClick={() => refetchTasks()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Recarregar
          </Button>

          {/* Botões para limpar dados - TEMPORÁRIO (apenas admin) */}
          {userRole === 'admin' && (
            <>
              <Button
                onClick={clearApiData}
                variant="destructive"
                size="sm"
                disabled={clearingData}
                className="flex items-center gap-2"
              >
                {clearingData ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {clearingData ? 'Limpando...' : 'Limpar Dados API'}
              </Button>

              <Button
                onClick={clearMessageHistory}
                variant="destructive"
                size="sm"
                disabled={clearingHistory}
                className="flex items-center gap-2"
              >
                {clearingHistory ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {clearingHistory ? 'Limpando...' : 'Limpar Histórico (Automação)'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Seções de Tarefas */}
      {getFilteredSections().length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="font-medium text-gray-900 mb-2">Nenhuma tarefa encontrada</h4>
            <p className="text-gray-600 text-sm">
              As tarefas criadas pela API aparecerão aqui automaticamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        getFilteredSections().map((section) => (
          <div key={section.id} className="space-y-4">
            {/* Cabeçalho da Seção */}
            <Card className={`border-l-4 ${getPriorityColor(section.id)}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getPriorityIcon(section.id)}
                    <div>
                      <CardTitle className="text-xl">{section.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                      {section.pendingTasks.length} pendente{section.pendingTasks.length !== 1 ? 's' : ''}
                    </Badge>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      {section.resolvedTasks.length} resolvida{section.resolvedTasks.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tarefas Pendentes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-600" />
                    Resolver
                  </h3>
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                    {section.pendingTasks.length} tarefa{section.pendingTasks.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {section.pendingTasks.length === 0 ? (
                  <Card className="border-dashed border-2 border-gray-200">
                    <CardContent className="p-8 text-center">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <h4 className="font-medium text-gray-900 mb-2">Nenhuma tarefa pendente</h4>
                      <p className="text-gray-600 text-sm">
                        Todas as tarefas desta seção foram resolvidas.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  section.pendingTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onResolve={handleResolveTask}
                    />
                  ))
                )}
              </div>

              {/* Tarefas Resolvidas */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Resolvidas
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      {section.resolvedTasks.length} tarefa{section.resolvedTasks.length !== 1 ? 's' : ''}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleResolvedSection(section.id)}
                      className="flex items-center gap-1"
                    >
                      {showResolvedSections[section.id] ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          Ocultar
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Mostrar
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {showResolvedSections[section.id] && (
                  <div className="space-y-4">
                    {section.resolvedTasks.length === 0 ? (
                      <Card className="border-dashed border-2 border-gray-200">
                        <CardContent className="p-8 text-center">
                          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h4 className="font-medium text-gray-900 mb-2">Nenhuma tarefa resolvida</h4>
                          <p className="text-gray-600 text-sm">
                            As tarefas resolvidas aparecerão aqui.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      section.resolvedTasks.map((task) => (
                        <ResolvedTaskCard key={task.id} task={task} />
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {/* Modal de Interação */}
      {showInteractionModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleCancelInteraction}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Resolver Tarefa
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-800">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{selectedTask.studentName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-blue-700 mt-1">
                    <span className="flex items-center gap-1">
                      <School className="w-3 h-3" />
                      {selectedTask.studentClass}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      {selectedTask.frequencyPercentage.toFixed(1)}% frequência
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {selectedTask.bimester}
                    </span>
                  </div>
                </div>

                {/* Seção de Contatos Telefônicos */}
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-4 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-semibold text-gray-700">Contatos</span>
                    {studentContacts && studentContacts.length > 0 && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {studentContacts.length}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {studentContacts && studentContacts.length > 0 ? (
                      studentContacts.map((contato, index) => (
                        <div key={index} className="group flex items-center gap-2 bg-gray-50 hover:bg-blue-50 px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-200 transition-all duration-200 text-sm">
                          {/* Nome e número */}
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-gray-900 truncate">{contato.nome}:</span>
                            <span className="text-gray-600 font-mono text-xs">
                              {formatPhoneNumber(contato.telefone)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 w-full">
                        <div className="flex items-center justify-center gap-2 text-gray-500">
                          <Phone className="w-4 h-4" />
                          <span className="text-sm">Nenhum contato cadastrado</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <RegisterInteractionCard
                interactionType={interactionType}
                interactionDate={interactionDate}
                interactionDescription={interactionDescription}
                interactionSensitive={interactionSensitive}
                editingInteraction={null}
                userRole={userRole}
                setInteractionType={setInteractionType}
                setInteractionDate={setInteractionDate}
                setInteractionDescription={setInteractionDescription}
                setInteractionSensitive={setInteractionSensitive}
                setEditingInteraction={() => {}}
                onAddInteraction={handleResolveTaskAction}
                onEditInteraction={async () => {}}
                readonlyType={false}
              />

              <div className="flex gap-3 mt-4">
                <Button
                  onClick={handleCancelInteraction}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente para tarefa pendente
function TaskCard({ task, onResolve }: { task: DashboardTask; onResolve: (task: DashboardTask) => void }) {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{task.studentName}</h4>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <School className="w-3 h-3" />
                  {task.studentClass}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  {task.frequencyPercentage.toFixed(1)}%
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {task.absencesCount} faltas
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {task.isPCD && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                PCD
              </Badge>
            )}
            <Button
              onClick={() => onResolve(task)}
              className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Resolver
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
          <div className="bg-gray-50 p-3 rounded border">
            <span className="text-gray-600">Bimestre:</span>
            <div className="font-medium">{task.bimester}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded border">
            <span className="text-gray-600">Mês:</span>
            <div className="font-medium">{task.month}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded border">
            <span className="text-gray-600">Criado em:</span>
            <div className="font-medium">{task.createdAt.toLocaleDateString('pt-BR')}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded border">
            <span className="text-gray-600">Criado por:</span>
            <div className="font-medium">{task.createdBy || 'Não informado'}</div>
          </div>
        </div>

        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800">
            <strong>Ação Recomendada:</strong> {task.recommendedAction}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// Componente para tarefa resolvida
function ResolvedTaskCard({ task }: { task: DashboardTask }) {
  const isInteractionDeleted = task.resolvedAction === 'Interação removida';

  return (
    <Card className={`border-0 shadow-lg ${isInteractionDeleted ? 'bg-orange-50 border-orange-200' : 'bg-gray-50'}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isInteractionDeleted ? 'bg-orange-100' : 'bg-green-100'}`}>
              {isInteractionDeleted ? (
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{task.studentName}</h4>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <School className="w-3 h-3" />
                  {task.studentClass}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  {task.frequencyPercentage.toFixed(1)}%
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {task.absencesCount} faltas
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {task.isPCD && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                PCD
              </Badge>
            )}
            {isInteractionDeleted ? (
              <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                Interação Removida
              </Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Resolvida
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
          <div className="bg-white p-3 rounded border">
            <span className="text-gray-600">Criado em:</span>
            <div className="font-medium">{task.createdAt.toLocaleDateString('pt-BR')}</div>
          </div>
          <div className="bg-white p-3 rounded border">
            <span className="text-gray-600">Resolvida em:</span>
            <div className="font-medium">{task.resolvedAt?.toLocaleDateString('pt-BR')}</div>
          </div>
          <div className="bg-white p-3 rounded border">
            <span className="text-gray-600">Resolvido por:</span>
            <div className="font-medium">{task.resolvedBy || 'Não informado'}</div>
          </div>
          <div className="bg-white p-3 rounded border">
            <span className="text-gray-600">Ação Tomada:</span>
            <div className="font-medium">{task.resolvedAction}</div>
          </div>
        </div>

        {task.resolvedDescription && (
          <Alert className={isInteractionDeleted ? "border-orange-200 bg-orange-50" : "border-green-200 bg-green-50"}>
            <AlertDescription className={isInteractionDeleted ? "text-orange-800" : "text-green-800"}>
              <strong>Descrição da Resolução:</strong> {task.resolvedDescription}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}