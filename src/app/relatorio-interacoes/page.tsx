"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Toaster, toast } from "sonner";
import { StudentDataService } from "@/services/studentDataService";
import { InteractionService } from "@/services/supabase/interactionService";
import { logger } from "@/utils/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InteractionListSkeleton, ChartCardSkeleton } from "@/components/shared/LoadingSkeletons";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  DateRangePicker,
  StudentSelector,
  EmptyState,
  InfoState,
} from "@/components/shared";
import {
  TrendingUp,
  Calendar,
  Users,
  MessageSquare,
  Search,
  Filter,
  FileText,
  Download,
  AlertTriangle,
  User
} from "lucide-react";
import { FamilyInteraction, Student } from "@/types";
import { formatFirebaseDate } from "../utils";
import { CURRENT_SCHOOL_YEAR } from "@/config/constants";
import InteractionChartsCard from "@/components/interactions/InteractionChartsCard";
import StudentInteractionAnalysisCard from "@/components/students/StudentInteractionAnalysisCard";

interface InteractionStats {
  total: number;
  byType: Record<string, number>;
  byMonth: Record<string, number>;
  sensitive: number;
  recent: number;
}

interface StudentWithInteractions extends Student {
  interactionCount: number;
  lastInteraction?: string;
}

export default function InteractionReportsPage() {
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState("");
  const [interactions, setInteractions] = useState<FamilyInteraction[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredInteractions, setFilteredInteractions] = useState<FamilyInteraction[]>([]);
  const [stats, setStats] = useState<InteractionStats>({
    total: 0,
    byType: {},
    byMonth: {},
    sensitive: 0,
    recent: 0
  });

  // Filtros
  const [selectedTurma, setSelectedTurma] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [showSensitive, setShowSensitive] = useState<boolean>(false);


  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  // Aplicar filtros quando mudarem
  useEffect(() => {
    applyFilters();
  }, [interactions, selectedTurma, selectedStudent, selectedType, startDate, endDate, debouncedSearchTerm, showSensitive]);

  const loadData = async () => {
    setLoading(true);
    setLoadingProgress("Carregando estudantes...");

    try {
      // Carregar estudantes via Supabase
      logger.debug('Buscando estudantes via StudentDataService');
      const allStudents = await StudentDataService.getStudents();
      const studentsData = allStudents
        .filter(s => s.status === "ATIVO")
        .map(student => ({
          ...student,
          contatos: student.contatos || [],
        }));

      setStudents(studentsData);
      setLoadingProgress(`Carregando interações de ${studentsData.length} estudantes...`);

      // Carregar interações de todos os estudantes com processamento em lotes
      const allInteractions: FamilyInteraction[] = [];
      const validStudents = studentsData.filter(s => s.estudanteId);

      // Processar em lotes de 20 estudantes para evitar timeout
      const batchSize = 20;
      const totalBatches = Math.ceil(validStudents.length / batchSize);

      for (let i = 0; i < validStudents.length; i += batchSize) {
        const batch = validStudents.slice(i, i + batchSize);
        const currentBatch = Math.floor(i / batchSize) + 1;
        const progress = Math.round((currentBatch / totalBatches) * 80); // 80% para interações, 20% para finalização
        setLoadingProgress(`Processando lote ${currentBatch}/${totalBatches} (${progress}%)`);

        const batchPromises = batch.map(async (student) => {
          const studentId = student.estudanteId;

          try {
            // Buscar interações via Supabase (single source)
            const studentInteractions = await InteractionService.getStudentInteractions(studentId);
            return studentInteractions;
          } catch (studentError) {
            logger.error('Erro ao buscar interações do estudante', { studentId }, studentError as Error);
            return [];
          }
        });

        // Aguardar o lote atual completar antes de processar o próximo
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(interactions => {
          allInteractions.push(...interactions);
        });

        // Pequena pausa entre lotes para não sobrecarregar
        if (i + batchSize < validStudents.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setLoadingProgress("Organizando dados... (90%)");

      // Ordenar por data (mais recentes primeiro)
      allInteractions.sort((a, b) => {
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        return dateB.getTime() - dateA.getTime();
      });

      setLoadingProgress("Finalizando... (95%)");
      setInteractions(allInteractions);

      // Mostrar mensagem informativa se não há dados
      if (allInteractions.length === 0) {
        toast.info("Nenhuma interação encontrada. Cadastre interações no perfil dos estudantes para visualizar os relatórios.");
      }

    } catch (error) {
      logger.error("Erro ao carregar dados", error as Error);
      toast.error("Erro ao carregar dados dos relatórios");
    } finally {
      setLoading(false);
      setLoadingProgress("");
    }
  };

  const applyFilters = () => {
    let filtered = [...interactions];

    // Filtro por turma
    if (selectedTurma && selectedTurma !== "all") {
      const studentIds = students
        .filter(s => s.turma === selectedTurma)
        .map(s => s.estudanteId);
      filtered = filtered.filter(i => studentIds.includes(i.studentId));
    }

    // Filtro por estudante
    if (selectedStudent && selectedStudent !== "all") {
      filtered = filtered.filter(i => i.studentId === selectedStudent);
    }

    // Filtro por tipo
    if (selectedType && selectedType !== "all") {
      filtered = filtered.filter(i => i.type === selectedType);
    }

    // Filtro por data
    if (startDate) {
      filtered = filtered.filter(i => i.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(i => i.date <= endDate);
    }

    // Filtro por termo de busca
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(i =>
        i.description.toLowerCase().includes(term) ||
        i.type.toLowerCase().includes(term) ||
        i.createdBy.toLowerCase().includes(term)
      );
    }

    // Filtro por sensibilidade
    if (showSensitive) {
      filtered = filtered.filter(i => i.sensitive);
    }

    setFilteredInteractions(filtered);
    calculateStats(filtered);
  };

  const calculateStats = (data: FamilyInteraction[]) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const byType: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    let sensitive = 0;
    let recent = 0;

    data.forEach(interaction => {
      // Por tipo
      byType[interaction.type] = (byType[interaction.type] || 0) + 1;

      // Por mês - converter dd/mm/aaaa para mm/aaaa
      const dateParts = interaction.date.split('/');
      if (dateParts.length === 3) {
        const month = `${dateParts[1]}/${dateParts[2]}`; // MM/YYYY
        byMonth[month] = (byMonth[month] || 0) + 1;
      }

      // Sensíveis
      if (interaction.sensitive) sensitive++;

      // Recentes (últimos 30 dias) - converter dd/mm/aaaa para Date
      const dateParts2 = interaction.date.split('/');
      if (dateParts2.length === 3) {
        const interactionDate = new Date(`${dateParts2[2]}-${dateParts2[1]}-${dateParts2[0]}`); // yyyy-mm-dd
        if (interactionDate >= thirtyDaysAgo) recent++;
      }
    });

    setStats({
      total: data.length,
      byType,
      byMonth,
      sensitive,
      recent
    });
  };

  const getUniqueValues = (key: keyof FamilyInteraction) => {
    return [...new Set(interactions.map(i => i[key] as string))].filter(Boolean);
  };

  const getTurmas = () => {
    return [...new Set(students.map(s => s.turma))].filter(Boolean).sort();
  };


  const exportToCSV = () => {
    const headers = ["Data", "Tipo", "Estudante", "Turma", "Descrição", "Criado por", "Sensível"];
    const csvData = filteredInteractions.map(interaction => {
      const student = students.find(s => s.estudanteId === interaction.studentId);
      return [
        interaction.date,
        interaction.type,
        student?.nome || "N/A",
        student?.turma || "N/A",
        interaction.description.replace(/"/g, '""'),
        interaction.createdBy,
        interaction.sensitive ? "Sim" : "Não"
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-interacoes-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="mb-6">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <InteractionListSkeleton items={5} />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <ChartCardSkeleton />
          </div>
        </div>

        <div className="text-center py-6">
          <p className="text-slate-600 dark:text-slate-400">
            {loadingProgress || "Carregando relatórios..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 min-h-screen">
        <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
              Relatórios de Interações
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Análise completa do histórico de interações com famílias
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={exportToCSV}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={filteredInteractions.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Estado Vazio - Quando não há interações */}
      {!loading && interactions.length === 0 && (
        <EmptyState
          icon={MessageSquare}
          title="Nenhuma Interação Encontrada"
          description="Para visualizar relatórios e estatísticas, é necessário cadastrar interações com as famílias dos estudantes. Vá para Perfil do Estudante para cadastrar interações."
          variant="info"
        />
      )}

      {/* Cards de Estatísticas - Só mostra se há dados */}
      {!loading && interactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total de Interações
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {stats.total.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {filteredInteractions.length !== stats.total &&
                `${filteredInteractions.length.toLocaleString()} filtradas`
              }
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Interações Recentes
            </CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {stats.recent.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Casos Sensíveis
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {stats.sensitive.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.total > 0 ? ((stats.sensitive / stats.total) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Estudantes Ativos
            </CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {new Set(interactions.map(i => i.studentId)).size.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Com interações registradas
            </p>
          </CardContent>
        </Card>
        </div>
      )}

      {/* Componentes de Análise Avançada - Só mostra se há dados */}
      {!loading && interactions.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <InteractionChartsCard
            interactions={filteredInteractions}
            students={students}
          />
          <StudentInteractionAnalysisCard
            interactions={interactions}
            students={students}
          />
        </div>
      )}

      {/* Filtros - Só mostra se há dados */}
      {!loading && interactions.length > 0 && (
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5 text-blue-600" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Turma</Label>
              <Select value={selectedTurma} onValueChange={setSelectedTurma}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as turmas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  {getTurmas().map(turma => (
                    <SelectItem key={turma} value={turma}>{turma}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estudante</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os estudantes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estudantes</SelectItem>
                  {students
                    .filter(s => !selectedTurma || selectedTurma === "all" || s.turma === selectedTurma)
                    .map(student => (
                      <SelectItem key={student.estudanteId} value={student.estudanteId}>
                        {student.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Interação</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {getUniqueValues("type").map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="sensitive"
                checked={showSensitive}
                onChange={(e) => setShowSensitive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="sensitive" className="text-sm">
                Apenas casos sensíveis
              </Label>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTurma("all");
                  setSelectedStudent("all");
                  setSelectedType("all");
                  setStartDate("");
                  setEndDate("");
                  setSearchTerm("");
                  setShowSensitive(false);
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
        </Card>
      )}

      {/* Lista de Interações Filtradas - Só mostra se há dados */}
      {!loading && interactions.length > 0 && (
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-emerald-600" />
            Interações Filtradas ({filteredInteractions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredInteractions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium">Nenhuma interação encontrada</p>
                <p className="text-xs">Ajuste os filtros para ver mais resultados</p>
              </div>
            ) : (
              filteredInteractions.slice(0, 50).map(interaction => {
                const student = students.find(s => s.estudanteId === interaction.studentId);
                return (
                  <div
                    key={interaction.id}
                    className={`p-4 border rounded-lg ${
                      interaction.sensitive
                        ? "border-red-200 bg-red-50 dark:bg-red-900/20"
                        : "border-gray-200 bg-gray-50 dark:bg-gray-900/20"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {interaction.type}
                        </Badge>
                        {interaction.sensitive && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Sensível
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{interaction.date}</span>
                    </div>

                    <div className="mb-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-3 h-3" />
                        <span className="font-medium">{student?.nome || "Estudante não encontrado"}</span>
                        {student?.turma && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span>{student.turma}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      {interaction.description}
                    </p>

                    <div className="text-xs text-gray-500">
                      Criado por: {interaction.createdBy}
                    </div>
                  </div>
                );
              })
            )}

            {filteredInteractions.length > 50 && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">Mostrando primeiras 50 interações de {filteredInteractions.length}</p>
                <p className="text-xs">Use filtros mais específicos para refinar os resultados</p>
              </div>
            )}
          </div>
        </CardContent>
        </Card>
      )}
    </div>
    </ErrorBoundary>
  );
}