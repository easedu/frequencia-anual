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
import { collection, getDocs, query, where, doc, deleteDoc, writeBatch, addDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase.config';
import { FIREBASE_PATHS } from '@/config/constants';
import type { DashboardTask, TaskSection, TaskPriorityLevel } from '@/types/dashboardTasks';
import type { UserTask } from '@/types/tasks';
import type { FamilyInteraction, Student, Contato } from '@/types';
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
  const [studentContacts, setStudentContacts] = useState<Contato[]>([]);

  // Estados para controlar a visibilidade das seções resolvidas
  const [showResolvedSections, setShowResolvedSections] = useState<Record<TaskPriorityLevel, boolean>>({
    routine: false,
    attention: false,
    critical: false
  });

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

  // Função para buscar dados completos do estudante
  const getStudentData = async (estudanteId: string): Promise<Student | null> => {
    try {
      const studentsDocRef = doc(db, FIREBASE_PATHS.students());
      const studentsDocSnap = await getDoc(studentsDocRef);

      if (!studentsDocSnap.exists()) {
        return null;
      }

      const studentsData = studentsDocSnap.data();
      const allStudents = (studentsData.estudantes || []) as Student[];

      return allStudents.find(student => student.estudanteId === estudanteId) || null;
    } catch (error) {
      logger.error('Erro ao buscar dados do estudante:', error as Error);
      return null;
    }
  };

  // Função para buscar dados atuais da interação (com suporte a V1 e V3)
  const getInteractionData = async (estudanteId: string, interactionId: string): Promise<{type: string, description: string, createdBy: string, exists: boolean} | null> => {
    try {
      // ✅ CORREÇÃO: Tentar V1 primeiro (2025/interactions - estrutura atual)
      let interactionDoc = await getDoc(doc(db, '2025', 'interactions', estudanteId, interactionId));

      // Se não encontrar em V1, tentar V3 (students/{id}/interactions - estrutura futura)
      if (!interactionDoc.exists()) {
        interactionDoc = await getDoc(doc(db, 'students', estudanteId, 'interactions', interactionId));
      }

      if (interactionDoc.exists()) {
        const data = interactionDoc.data();
        return {
          type: data.type || 'Resolvida via API',
          description: data.description || 'Tarefa marcada como resolvida automaticamente pela API',
          createdBy: data.createdBy || 'Usuário desconhecido',
          exists: true
        };
      }

      // Interação foi deletada ou não encontrada
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

  // Função para converter UserTask para DashboardTask com dados de interação atualizados
  const convertUserTaskToDashboardTask = async (userTask: UserTask): Promise<DashboardTask> => {
    const monthName = new Date(userTask.createdAt).toLocaleDateString('pt-BR', { month: 'long' });

    let resolvedAction = userTask.interactionType || 'Resolvida via API';
    let resolvedDescription = userTask.interactionDescription || 'Tarefa marcada como resolvida automaticamente pela API';
    let resolvedBy = userTask.resolvedBy || 'BOT';

    // Se a tarefa está completada e tem interactionId, buscar dados atuais da interação
    if (userTask.status === 'COMPLETED' && userTask.interactionId) {
      const interactionData = await getInteractionData(userTask.estudanteId, userTask.interactionId);
      if (interactionData) {
        resolvedAction = interactionData.type;
        resolvedDescription = interactionData.description;
        resolvedBy = interactionData.createdBy;

        // Se a interação foi deletada, manter a tarefa como completada mas indicar que foi removida
        if (!interactionData.exists) {
          logger.info(`Interação ${userTask.interactionId} foi deletada para a tarefa ${userTask.id}`);
        }
      }
    }

    return {
      id: userTask.id,
      title: `${userTask.taskType === 'CONSELHO_TUTELAR' ? 'Conselho Tutelar' : 'Tarefa'} - ${userTask.studentName}`,
      studentName: userTask.studentName,
      studentClass: userTask.studentClass,
      shift: 'N/A', // UserTask não tem shift
      bimester: userTask.bimestre,
      month: capitalizeFirstLetter(monthName), // Primeira letra maiúscula
      absencesCount: userTask.absencesCount,
      frequencyPercentage: userTask.frequencyPercentage,
      isPCD: userTask.isPCD,
      recommendedAction: userTask.recommendedAction, // Usar ação recomendada real
      priority: userTask.priority, // Usar prioridade da API
      status: userTask.status === 'COMPLETED' ? 'resolved' : 'pending',
      createdAt: new Date(userTask.createdAt),
      createdBy: userTask.createdBy || 'Não informado',
      resolvedAt: userTask.completedAt ? new Date(userTask.completedAt) : undefined,
      resolvedAction: userTask.status === 'COMPLETED' ? resolvedAction : undefined,
      resolvedDescription: userTask.status === 'COMPLETED' ? resolvedDescription : undefined,
      resolvedBy: userTask.status === 'COMPLETED' ? resolvedBy : undefined,
      estudanteId: userTask.estudanteId // Incluir ID do estudante
    };
  };

  // Função para limpar referências de interações deletadas
  const cleanupDeletedInteractions = async (userTasks: UserTask[]) => {
    const tasksToUpdate: string[] = [];

    for (const task of userTasks) {
      if (task.status === 'COMPLETED' && task.interactionId) {
        const interactionData = await getInteractionData(task.estudanteId, task.interactionId);
        if (interactionData && !interactionData.exists) {
          tasksToUpdate.push(task.id);
        }
      }
    }

    // Atualizar tarefas que perderam suas interações
    if (tasksToUpdate.length > 0) {
      const batch = writeBatch(db);

      for (const taskId of tasksToUpdate) {
        const taskRef = doc(db, 'userTasks', taskId);
        batch.update(taskRef, {
          interactionId: null,
          interactionType: 'Interação removida',
          interactionDescription: 'A interação associada a esta tarefa foi removida',
          resolvedBy: 'Desconhecido'
        });
      }

      try {
        await batch.commit();
        logger.info(`Atualizadas ${tasksToUpdate.length} tarefa(s) com interações removidas`);
      } catch (error) {
        logger.error('Erro ao atualizar tarefas com interações removidas:', error as Error);
      }
    }
  };

  // Carregar tarefas do Firebase
  const loadTasks = async () => {
    try {
      setLoading(true);

      // Buscar todas as tarefas criadas pela API (userId = "BOT")
      const tasksRef = collection(db, 'userTasks');
      const q = query(tasksRef, where('userId', '==', 'BOT'));
      const querySnapshot = await getDocs(q);

      const userTasks: UserTask[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<UserTask, 'id'>;
        userTasks.push({ id: doc.id, ...data });
      });

      // Limpar referências de interações deletadas
      await cleanupDeletedInteractions(userTasks);

      // Converter para DashboardTask e organizar por prioridade (agora assíncrono)
      const dashboardTasks = await Promise.all(userTasks.map(convertUserTaskToDashboardTask));

      // Criar seções baseadas nas tarefas reais
      const sections: TaskSection[] = [
        {
          id: 'routine',
          title: 'Tarefas do Dia a Dia',
          description: 'Acompanhamento rotineiro de frequência escolar',
          allowedRoles: ['admin', 'super-user', 'user'],
          pendingTasks: dashboardTasks.filter(task => task.priority === 'routine' && task.status === 'pending'),
          resolvedTasks: dashboardTasks.filter(task => task.priority === 'routine' && task.status === 'resolved')
        },
        {
          id: 'attention',
          title: 'Tarefas que Exigem Atenção',
          description: 'Situações que necessitam intervenção mais atenta',
          allowedRoles: ['admin', 'super-user'],
          pendingTasks: dashboardTasks.filter(task => task.priority === 'attention' && task.status === 'pending'),
          resolvedTasks: dashboardTasks.filter(task => task.priority === 'attention' && task.status === 'resolved')
        },
        {
          id: 'critical',
          title: 'Tarefas Críticas',
          description: 'Situações críticas que demandam ação imediata',
          allowedRoles: ['admin'],
          pendingTasks: dashboardTasks.filter(task => task.priority === 'critical' && task.status === 'pending'),
          resolvedTasks: dashboardTasks.filter(task => task.priority === 'critical' && task.status === 'resolved')
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

  // Função para limpar todos os dados criados pela API
  const clearApiData = async () => {
    if (!confirm('Tem certeza que deseja limpar todos os dados criados pela API? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setClearingData(true);

      // Buscar todas as tarefas criadas pela API
      const tasksRef = collection(db, 'userTasks');
      const q = query(tasksRef, where('userId', '==', 'BOT'));
      const querySnapshot = await getDocs(q);

      const batch = writeBatch(db);
      let deletedCount = 0;

      // Adicionar todas as tarefas ao batch para exclusão
      querySnapshot.forEach((docSnapshot) => {
        batch.delete(doc(db, 'userTasks', docSnapshot.id));
        deletedCount++;
      });

      // Executar a exclusão em lote
      if (deletedCount > 0) {
        await batch.commit();
        toast.success(`${deletedCount} tarefa(s) excluída(s) com sucesso!`);

        // Recarregar dados
        await loadTasks();
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

  // Função para copiar telefone
  const copyPhoneToClipboard = async (phone: string, contactName: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success(`Telefone de ${contactName} copiado!`);
    } catch (error) {
      toast.error('Erro ao copiar telefone');
    }
  };

  // Carregar dados na inicialização
  useEffect(() => {
    loadTasks();
  }, []);

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
      // Converter data para formato Firebase (YYYY-MM-DD)
      const parseDateToFirebase = (dateStr: string): string | null => {
        const [day, month, year] = dateStr.split('/').map(Number);
        if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || month < 1 || month > 12 || day > 31) return null;
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      };

      const formattedDate = parseDateToFirebase(interactionDate);
      if (!formattedDate) {
        toast.error('Data inválida. Use o formato DD/MM/YYYY.');
        return;
      }

      // Obter nome do usuário atual
      const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido";

      const interactionData: Omit<FamilyInteraction, 'id'> = {
        type: interactionType,
        date: formattedDate,
        description: interactionDescription,
        sensitive: interactionSensitive,
        createdBy: currentUser,
        studentId: selectedTask.estudanteId // Usar o ID correto do estudante
      };

      // 2. Salvar interação com DUAL-WRITE (V1 + V3)
      // V1 (atual): 2025/interactions/{studentId}
      const interactionRefV1 = await addDoc(
        collection(db, '2025', 'interactions', selectedTask.estudanteId),
        interactionData
      );

      // V3 (futuro): students/{studentId}/interactions
      // Usar o mesmo ID gerado para manter consistência
      await addDoc(
        collection(db, 'students', selectedTask.estudanteId, 'interactions'),
        {
          ...interactionData,
          anoLetivo: '2025'
        }
      );

      logger.info('[TASK-DASHBOARD] Interação salva com dual-write', {
        interactionId: interactionRefV1.id,
        estudanteId: selectedTask.estudanteId,
        v1Path: `2025/interactions/${selectedTask.estudanteId}/${interactionRefV1.id}`,
        v3Path: `students/${selectedTask.estudanteId}/interactions/${interactionRefV1.id}`
      });

      // 3. Atualizar tarefa como completada
      const taskRef = doc(db, 'userTasks', selectedTask.id);
      await updateDoc(taskRef, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        interactionId: interactionRefV1.id, // ✅ CORREÇÃO: usar o ID da V1
        interactionType: interactionType,
        interactionDescription: interactionDescription,
        resolvedBy: currentUser
      });

      toast.success('Tarefa resolvida com sucesso!');
      setShowInteractionModal(false);
      setSelectedTask(null);
      setStudentContacts([]); // Limpar contatos após resolução

      // Recarregar tarefas
      await loadTasks();

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

  if (loading) {
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
            onClick={loadTasks}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Recarregar
          </Button>

          {/* Botão para limpar dados da API - TEMPORÁRIO */}
          {userRole === 'admin' && (
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