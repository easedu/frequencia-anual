"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CheckCircle,
  AlertTriangle,
  Calendar,
  User,
  RefreshCw,
  FileText,
  Target,
  TrendingDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  School,
  Clock,
  Printer,
  Download
} from 'lucide-react';
import { TaskService } from '@/services/taskService';
import { InteractionService } from '@/services/supabase/interactionService';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import type { UserTask } from '@/types/tasks';
import RegisterInteractionCard from '@/components/interactions/RegisterInteractionCard';
import { auth } from '@/firebase.config';
import type { FamilyInteraction } from '@/types';

interface TaskManagerProps {
  userId: string;
  userRole: string | null;
}

export default function TaskManager({ userId, userRole }: TaskManagerProps) {
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<UserTask | null>(null);
  const [showInteractionCard, setShowInteractionCard] = useState(false);

  // Estados para filtros e paginação
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

  // Estados para o formulário de interação
  const [interactionType, setInteractionType] = useState<string>("Conselho tutelar");
  const [interactionDate, setInteractionDate] = useState<string>(new Date().toLocaleDateString("pt-BR"));
  const [interactionDescription, setInteractionDescription] = useState<string>("");
  const [interactionSensitive, setInteractionSensitive] = useState<boolean>(false);

  // Estados para o modal de confirmação PCD
  const [showPCDConfirmation, setShowPCDConfirmation] = useState(false);
  const [selectedPCDTask, setSelectedPCDTask] = useState<UserTask | null>(null);

  // Estados para o modal de relatório
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedBimestersForReport, setSelectedBimestersForReport] = useState<string[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Carregar tarefas pendentes
  const loadPendingTasks = async () => {
    setLoading(true);
    try {
      const pendingTasks = await TaskService.getPendingTasks(userId);
      setTasks(pendingTasks);
    } catch (error) {
      logger.error('Erro ao carregar tarefas:', error as Error);
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  // Gerar novas tarefas
  const generateTasks = async () => {
    setLoadingGenerate(true);
    try {
      const result = await TaskService.generateTasksForUser(userId);

      if (result.newTasks.length > 0) {
        toast.success(result.message);
        await loadPendingTasks(); // Recarregar lista
      } else {
        toast.info(result.message);
      }
    } catch (error) {
      logger.error('Erro ao gerar tarefas:', error as Error);
      toast.error('Erro ao gerar tarefas');
    } finally {
      setLoadingGenerate(false);
    }
  };


  // Resolver tarefa (verificar se é PCD primeiro)
  const handleResolveTask = (task: UserTask) => {
    if (task.isPCD) {
      // Se é PCD, mostrar modal de confirmação primeiro
      setSelectedPCDTask(task);
      setShowPCDConfirmation(true);
    } else {
      // Se não é PCD, abrir formulário de interação diretamente
      openInteractionModal(task);
    }
  };

  // Abrir modal de interação
  const openInteractionModal = (task: UserTask) => {
    setSelectedTask(task);
    setShowInteractionCard(true);
    // Reset form
    setInteractionType("Conselho tutelar"); // Valor padrão
    setInteractionDate(new Date().toLocaleDateString("pt-BR"));
    setInteractionDescription("");
    setInteractionSensitive(false);
  };

  // Confirmar encaminhamento de estudante PCD
  const handlePCDConfirmation = (wasReferred: boolean) => {
    if (selectedPCDTask) {
      if (wasReferred) {
        // Se foi encaminhado, abrir modal de interação
        openInteractionModal(selectedPCDTask);
      } else {
        // Se não foi encaminhado, apenas marcar como resolvida sem interação
        handleCompleteTaskWithoutInteraction(selectedPCDTask);
      }
    }
    setShowPCDConfirmation(false);
    setSelectedPCDTask(null);
  };

  // Completar tarefa sem registrar interação
  const handleCompleteTaskWithoutInteraction = async (task: UserTask) => {
    try {
      const success = await TaskService.completeTask(task.id, ''); // Sem interactionId

      if (success) {
        toast.success('Tarefa marcada como resolvida!');
        await loadPendingTasks(); // Recarregar lista
      } else {
        toast.error('Erro ao completar tarefa');
      }
    } catch (error) {
      logger.error('Erro ao completar tarefa sem interação:', error as Error);
      toast.error('Erro ao completar tarefa');
    }
  };

  // Registrar interação e completar tarefa
  const handleAddInteraction = async () => {
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

      const interactionData: Omit<FamilyInteraction, 'id'> = {
        type: interactionType, // Usar o tipo selecionado dinamicamente
        date: formattedDate, // Data no formato Supabase (YYYY-MM-DD)
        description: interactionDescription,
        sensitive: interactionSensitive,
        createdBy: currentUser, // Nome do usuário ao invés do role
        studentId: selectedTask.estudanteId // ID do estudante
      };

      // Salvar interação no Supabase
      const createdInteraction = await InteractionService.createInteraction(
        selectedTask.estudanteId,
        interactionData
      );

      logger.info('[TASK-MANAGER] Interação salva no Supabase', {
        interactionId: createdInteraction.id,
        estudanteId: selectedTask.estudanteId
      });

      // 2. Marcar tarefa como completada
      const success = await TaskService.completeTask(selectedTask.id, createdInteraction.id);

      if (success) {
        toast.success('Tarefa concluída e interação registrada com sucesso!');
        setShowInteractionCard(false);
        setSelectedTask(null);
        await loadPendingTasks(); // Recarregar lista
      } else {
        toast.error('Erro ao completar tarefa');
      }
    } catch (error) {
      logger.error('Erro ao registrar interação:', error as Error);
      toast.error('Erro ao registrar interação');
    }
  };

  const handleCancelInteraction = () => {
    setShowInteractionCard(false);
    setSelectedTask(null);
    setInteractionType("Conselho tutelar");
    setInteractionDescription("");
    setInteractionSensitive(false);
  };

  // Função para determinar o bimestre atual
  const getCurrentBimester = (): string => {
    const now = new Date();
    const month = now.getMonth() + 1; // Janeiro = 1

    if (month >= 2 && month <= 4) return "1º Bimestre";
    if (month >= 5 && month <= 7) return "2º Bimestre";
    if (month >= 8 && month <= 10) return "3º Bimestre";
    return "4º Bimestre";
  };

  // Função para abrir modal de relatório
  const handleOpenReportModal = () => {
    const currentBimester = getCurrentBimester();
    setSelectedBimestersForReport([currentBimester]);
    setShowReportModal(true);
  };

  // Função para gerar e imprimir relatório
  const handleGenerateReport = async () => {
    if (selectedBimestersForReport.length === 0) {
      toast.error('Selecione pelo menos um bimestre para o relatório');
      return;
    }

    setGeneratingReport(true);
    try {
      // Buscar todas as interações dos bimestres selecionados
      const reportData = await generateReportData(selectedBimestersForReport);
      printReport(reportData);
      setShowReportModal(false);
      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      logger.error('Erro ao gerar relatório:', error as Error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Interface para dados do relatório
  interface ReportData {
    data: string;
    nome: string;
    turma: string;
    tipoInteracao: string;
  }

  // Função para gerar dados do relatório
  const generateReportData = async (bimestres: string[]): Promise<ReportData[]> => {
    const reportData: ReportData[] = [];

    // Buscar todas as tarefas concluídas do usuário para os bimestres selecionados
    const completedTasks = await TaskService.getCompletedTasks(userId, bimestres);

    // Para cada tarefa concluída, buscar a interação associada
    for (const task of completedTasks) {
      if (task.interactionId) {
        try {
          // Buscar interação específica no Supabase
          const interaction = await InteractionService.getInteractionById(
            task.estudanteId,
            task.interactionId
          );

          if (interaction) {
            // Converter data do formato YYYY-MM-DD para DD/MM/YYYY
            let dataFormatada = interaction.date;
            if (interaction.date.includes('-')) {
              const [year, month, day] = interaction.date.split('-');
              dataFormatada = `${day}/${month}/${year}`;
            }

            reportData.push({
              data: dataFormatada,
              nome: task.studentName,
              turma: task.studentClass || 'N/A',
              tipoInteracao: interaction.type
            });
          } else {
            // Se não encontrar a interação, adicionar com dados básicos
            reportData.push({
              data: task.completedAt ? new Date(task.completedAt).toLocaleDateString('pt-BR') : 'N/A',
              nome: task.studentName,
              turma: task.studentClass || 'N/A',
              tipoInteracao: 'Dados não encontrados'
            });
          }
        } catch (error) {
          logger.error(`Erro ao buscar interação para tarefa ${task.id}:`, error as Error);
          // Adicionar entrada com erro
          reportData.push({
            data: task.completedAt ? new Date(task.completedAt).toLocaleDateString('pt-BR') : 'N/A',
            nome: task.studentName,
            turma: task.studentClass || 'N/A',
            tipoInteracao: 'Erro ao carregar dados'
          });
        }
      }
    }

    // Função para converter data DD/MM/YYYY para Date
    const parseDataBrasil = (data: string): Date => {
      if (data === 'N/A') return new Date(0);
      const [dia, mes, ano] = data.split('/').map(Number);
      return new Date(ano, mes - 1, dia);
    };

    // Ordenar por data (mais recente primeiro)
    return reportData.sort((a, b) => parseDataBrasil(b.data).getTime() - parseDataBrasil(a.data).getTime());
  };

  // Função para imprimir relatório
  const printReport = (data: ReportData[]) => {
    const reportContent = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
          Relatório de Intervenções Pedagógicas
        </h1>
        <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
          Período: ${selectedBimestersForReport.join(', ')} |
          Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;">Data</th>
            <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;">Nome</th>
            <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;">Turma</th>
            <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;">Tipo de Interação</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.data}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.nome}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.turma}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.tipoInteracao}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 30px; font-size: 12px; color: #666;">
        <p><strong>Total de registros:</strong> ${data.length}</p>
        <p><strong>Resumo por tipo:</strong></p>
        <ul>
          ${Object.entries(
            data.reduce((acc, item) => {
              acc[item.tipoInteracao] = (acc[item.tipoInteracao] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          ).map(([type, count]) => `<li>${type}: ${count}</li>`).join('')}
        </ul>
      </div>
    `;

    const printFrame = document.createElement('iframe');
    printFrame.style.display = 'none';
    document.body.appendChild(printFrame);

    const printDoc = printFrame.contentWindow?.document;
    printDoc?.open();
    printDoc?.write(`
      <html>
        <head>
          <title>Relatório de Intervenções Pedagógicas</title>
          <meta name="title" content="Relatório de Intervenções Pedagógicas">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              line-height: 1.4;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            h1 {
              color: #333;
              text-align: center;
            }
            @media print {
              body { margin: 0; padding: 15px; }
              table { font-size: 12px; }
            }
          </style>
        </head>
        <body>${reportContent}</body>
      </html>
    `);
    printDoc?.close();

    printFrame.contentWindow?.focus();
    setTimeout(() => {
      printFrame.contentWindow?.print();
      document.body.removeChild(printFrame);
    }, 100);
  };

  // Obter lista de turmas únicas com ordenação customizada
  const availableClasses = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    const classes = Array.from(new Set(tasks.map(task => task.studentClass).filter(Boolean)));

    // Ordenação customizada para turmas (1A, 1B, 2A, 2B, ..., 7A, 7B, etc.)
    return classes.sort((a, b) => {
      // Extrair ano e série
      const extractYearAndSeries = (turma: string) => {
        const match = turma.match(/^(\d+)([A-Z]?)$/);
        if (match) {
          return { year: parseInt(match[1]), series: match[2] || '' };
        }
        // Se não seguir o padrão, ordenar alfabeticamente no final
        return { year: 999, series: turma };
      };

      const aData = extractYearAndSeries(a);
      const bData = extractYearAndSeries(b);

      // Primeiro por ano
      if (aData.year !== bData.year) {
        return aData.year - bData.year;
      }

      // Depois por série
      return aData.series.localeCompare(bData.series);
    });
  }, [tasks]);

  // Inicializar turmas selecionadas quando as turmas disponíveis mudarem
  useEffect(() => {
    if (availableClasses.length > 0 && selectedClasses.length === 0) {
      setSelectedClasses(availableClasses);
    }
  }, [availableClasses]);

  // Filtrar e ordenar tarefas
  const filteredAndSortedTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];

    // Remover duplicatas baseado no ID da tarefa
    const uniqueTasks = tasks.filter((task, index, self) =>
      task && task.id && self.findIndex(t => t.id === task.id) === index
    );

    let filtered = uniqueTasks;

    // Filtrar por turmas selecionadas (apenas se não está selecionando todas)
    if (selectedClasses.length > 0) {
      // Se não selecionou todas as turmas disponíveis, aplicar filtro
      if (selectedClasses.length < availableClasses.length) {
        filtered = filtered.filter(task =>
          task.studentClass && selectedClasses.includes(task.studentClass)
        );
      }
    } else {
      // Se não selecionou nenhuma turma, não mostrar nada
      filtered = [];
    }

    // Ordenar por frequência (pior para melhor)
    filtered = filtered.sort((a, b) => {
      const freqA = a.frequencyPercentage || 0;
      const freqB = b.frequencyPercentage || 0;
      return freqA - freqB;
    });

    return filtered;
  }, [tasks, selectedClasses, availableClasses]);

  // Funções para manipular filtros de turma
  const handleClassToggle = (className: string) => {
    setSelectedClasses(prev =>
      prev.includes(className)
        ? prev.filter(c => c !== className)
        : [...prev, className]
    );
  };

  const handleSelectAllClasses = () => {
    setSelectedClasses(availableClasses);
  };

  const handleDeselectAllClasses = () => {
    setSelectedClasses([]);
  };

  // Paginação
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedTasks.slice(startIndex, endIndex);
  }, [filteredAndSortedTasks, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedTasks.length / itemsPerPage);

  // Reset da página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClasses]);

  // Carregar tarefas na inicialização
  useEffect(() => {
    if (userId) {
      loadPendingTasks();
    }
  }, [userId]);

  return (
    <div className="space-y-6">
      {/* Card de Controles */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Gerenciar Tarefas
            </CardTitle>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              {tasks.length} tarefas
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={generateTasks}
              disabled={loadingGenerate}
              className="flex items-center gap-2"
            >
              {loadingGenerate ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Target className="w-4 h-4" />
              )}
              Verificar Tarefas
            </Button>
            <Button
              onClick={loadPendingTasks}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Atualizar
            </Button>
            <Button
              onClick={handleOpenReportModal}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Gerar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Confirmação PCD */}
      {showPCDConfirmation && selectedPCDTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <School className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Estudante PCD
                </h3>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-center gap-2 text-purple-800">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{selectedPCDTask.studentName}</span>
                  </div>
                  <div className="text-sm text-purple-700 mt-1">
                    {selectedPCDTask.studentClass} • {selectedPCDTask.frequencyPercentage.toFixed(1)}% de frequência
                  </div>
                </div>
                <p className="text-gray-600 text-sm">
                  Este estudante é PCD (Pessoa com Deficiência).
                  O estudante foi efetivamente encaminhado ao Conselho Tutelar?
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => handlePCDConfirmation(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Não
                </Button>
                <Button
                  onClick={() => handlePCDConfirmation(true)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  Sim, foi encaminhado
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Relatório */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Printer className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Gerar Relatório de Intervenções
                </h3>
                <p className="text-gray-600 text-sm">
                  Selecione os bimestres para incluir no relatório
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bimestres
                  </label>
                  <div className="space-y-2">
                    {['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'].map((bimester) => (
                      <div key={bimester} className="flex items-center">
                        <Checkbox
                          id={bimester}
                          checked={selectedBimestersForReport.includes(bimester)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedBimestersForReport(prev => [...prev, bimester]);
                            } else {
                              setSelectedBimestersForReport(prev => prev.filter(b => b !== bimester));
                            }
                          }}
                        />
                        <label htmlFor={bimester} className="ml-2 text-sm text-gray-700 cursor-pointer">
                          {bimester}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-medium text-blue-900 mb-1">Dados incluídos:</h4>
                  <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                    <li>Data da intervenção</li>
                    <li>Nome do estudante</li>
                    <li>Turma</li>
                    <li>Tipo da interação</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setShowReportModal(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={generatingReport}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleGenerateReport}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={generatingReport || selectedBimestersForReport.length === 0}
                >
                  {generatingReport ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Gerar e Imprimir
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Interação */}
      {showInteractionCard && selectedTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleCancelInteraction}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Registrar Intervenção
                </h3>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-orange-800">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{selectedTask.studentName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-orange-700 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {selectedTask.bimestre}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      {selectedTask.frequencyPercentage.toFixed(1)}% de frequência
                    </span>
                    <span className="flex items-center gap-1">
                      <School className="w-3 h-3" />
                      {selectedTask.studentClass}
                    </span>
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
                setInteractionType={setInteractionType} // Agora permite alteração
                setInteractionDate={setInteractionDate}
                setInteractionDescription={setInteractionDescription}
                setInteractionSensitive={setInteractionSensitive}
                setEditingInteraction={() => {}}
                onAddInteraction={handleAddInteraction}
                onEditInteraction={async () => {}}
                readonlyType={false} // Permitir seleção do tipo
                allowedTypes={['Conselho tutelar', 'Carta registrada', 'Conversa com a família']} // Tipos permitidos
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

      {/* Lista de tarefas */}
      {loading ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Carregando tarefas...</p>
          </CardContent>
        </Card>
      ) : tasks.length > 0 ? (
        <div className="space-y-6">
          {/* Filtros com UX melhorada */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-blue-600" />
                  Filtros
                </CardTitle>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  {filteredAndSortedTasks.length} de {tasks.length} tarefas
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filtro por Turmas */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-blue-900 mb-0 flex items-center gap-2">
                    <School className="w-4 h-4 text-blue-600" />
                    Selecionar Turmas
                  </h4>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllClasses}
                      disabled={selectedClasses.length === availableClasses.length}
                      className="text-xs px-2 py-1 h-7 bg-white/60 border-blue-300 text-blue-800 hover:bg-blue-50"
                    >
                      Todas
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAllClasses}
                      disabled={selectedClasses.length === 0}
                      className="text-xs px-2 py-1 h-7 bg-white/60 border-blue-300 text-blue-800 hover:bg-blue-50"
                    >
                      Nenhuma
                    </Button>
                  </div>
                </div>

                {/* Checkboxes das turmas em grid */}
                {availableClasses.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-10 gap-3">
                    {availableClasses.map((className) => (
                      <div
                        key={`checkbox-${className}`}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                          selectedClasses.includes(className)
                            ? 'bg-blue-100 border-blue-300 shadow-md'
                            : 'bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-200'
                        }`}
                        onClick={() => handleClassToggle(className)}
                      >
                        <Checkbox
                          checked={selectedClasses.includes(className)}
                          className="border-blue-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label
                          className={`cursor-pointer font-medium text-sm ${
                            selectedClasses.includes(className) ? 'text-blue-900' : 'text-gray-700'
                          }`}
                        >
                          {className}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Tarefas Pendentes
              </h3>
              <Badge className="bg-red-100 text-red-800 border-red-200">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Requer Ação
              </Badge>
            </div>

            {totalPages > 1 && (
              <div className="text-sm text-gray-500">
                Página {currentPage} de {totalPages}
              </div>
            )}
          </div>

          {paginatedTasks.map((task) => (
            <Card key={`task-${task.id}`} className="border-0 shadow-lg border-l-4 border-l-red-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <User className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{task.studentName}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <School className="w-3 h-3" />
                          {task.studentClass || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          {(task.frequencyPercentage || 0).toFixed(1)}% frequência
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {task.absencesCount || 0} faltas
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-800 border-red-200">
                        Intervenção Necessária
                      </Badge>
                      {task.isPCD && (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                          PCD
                        </Badge>
                      )}
                    </div>
                    <Button
                      onClick={() => handleResolveTask(task)}
                      className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Resolver
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded border">
                    <span className="text-gray-600">Turma:</span>
                    <div className="font-medium">{task.studentClass || 'N/A'}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <span className="text-gray-600">Bimestre:</span>
                    <div className="font-medium">{task.bimestre || 'N/A'}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <span className="text-gray-600">Faltas:</span>
                    <div className="font-medium text-red-600">
                      {task.absencesCount || 0} dias
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <span className="text-gray-600">Frequência:</span>
                    <div className="font-medium text-red-600">
                      {(task.frequencyPercentage || 0).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <Alert className="mt-4 border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Ação Necessária:</strong> {task.studentName} da turma {task.studentClass || 'N/A'} apresenta
                    frequência de {(task.frequencyPercentage || 0).toFixed(1)}% com {task.absencesCount || 0} faltas no {task.bimestre || 'N/A'}
                    (abaixo de 76%), necessitando intervenção pedagógica urgente.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ))}

          {/* Paginação */}
          {totalPages > 1 && (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a{' '}
                    {Math.min(currentPage * itemsPerPage, filteredAndSortedTasks.length)} de{' '}
                    {filteredAndSortedTasks.length} tarefas
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </Button>

                    <div className="flex items-center gap-1">
                      {totalPages > 0 && Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={`page-${page}`}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1"
                    >
                      Próximo
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma tarefa pendente
            </h3>
            <p className="text-gray-600 mb-4">
              Não há estudantes necessitando encaminhamento ao Conselho Tutelar no momento.
            </p>
            <Button
              onClick={generateTasks}
              disabled={loadingGenerate}
              className="flex items-center gap-2"
            >
              {loadingGenerate ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Target className="w-4 h-4" />
              )}
              Verificar Novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Informações sobre o funcionamento */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-blue-900">Como Funciona</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-white/60 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">📊 Monitoramento Automático</h4>
              <p className="text-blue-800">
                O sistema verifica automaticamente a frequência de cada estudante no bimestre atual,
                considerando apenas faltas não justificadas.
              </p>
            </div>
            <div className="p-3 bg-white/60 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">🎯 Critério de Alerta</h4>
              <p className="text-blue-800">
                Estudantes com frequência abaixo de 76% no bimestre atual geram automaticamente uma tarefa
                de intervenção pedagógica (Conselho Tutelar, Carta Registrada ou Conversa com a Família).
              </p>
            </div>
            <div className="p-3 bg-white/60 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">📋 Uma Tarefa por Bimestre</h4>
              <p className="text-blue-800">
                Cada estudante pode gerar apenas uma tarefa por bimestre. Após resolver,
                não aparecerá novamente no mesmo período.
              </p>
            </div>
            <div className="p-3 bg-white/60 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">✅ Resolução Flexível</h4>
              <p className="text-blue-800">
                Clique em "Resolver", escolha o tipo de intervenção mais adequada
                (Conselho Tutelar, Carta Registrada ou Conversa com a Família),
                preencha a descrição e a tarefa será marcada como concluída.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}