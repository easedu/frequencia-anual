"use client";

import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Toaster, toast } from "sonner";
// ✅ OTIMIZAÇÃO FASE 1: Migrar para React Query
import { useStudents } from "@/hooks/api/query";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllPages } from "@/utils/paginationHelper";
import { logger } from "@/utils/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InteractionListSkeleton, ChartCardSkeleton } from "@/components/shared/LoadingSkeletons";
import {
  EmptyState,
} from "@/components/shared";
import {
  TrendingUp,
  Users,
  MessageSquare,
  Search,
  Filter,
  FileText,
  Download,
  AlertTriangle,
} from "lucide-react";
import { FamilyInteraction, Student } from "@/types";
import dynamic from "next/dynamic";

// ✅ FASE 4.2: Lazy Loading de componentes pesados (Charts)
const InteractionChartsCard = dynamic(() => import("@/components/interactions/InteractionChartsCard"), {
    ssr: false,
    loading: () => <ChartCardSkeleton />,
});

const StudentInteractionAnalysisCard = dynamic(() => import("@/components/students/StudentInteractionAnalysisCard"), {
    ssr: false,
    loading: () => <ChartCardSkeleton />,
});

interface InteractionStats {
  total: number;
  byType: Record<string, number>;
  byMonth: Record<string, number>;
  sensitive: number;
  recent: number;
}

// Helper para parsear datas brasileiras (dd/mm/aaaa)
function parseDateBR(dateStr: string): Date {
  if (!dateStr || !dateStr.includes('/')) {
    return new Date(dateStr); // Fallback para datas ISO
  }
  const [day, month, year] = dateStr.split('/');
  return new Date(`${year}-${month}-${day}`);
}

export default function InteractionReportsPage() {
  const [localStudents, setLocalStudents] = useState<Student[]>([]);
  const [localInteractions, setLocalInteractions] = useState<FamilyInteraction[]>([]);
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

  // ✅ OTIMIZAÇÃO FASE 1: React Query com cache + SELECT estratificado
  const { user } = useAuth();
  const { data: studentsResponse, isLoading: loadingStudents } = useStudents({
    status: "ATIVO",
    detail: 'minimal', // ✅ Apenas 5KB/estudante para listagem
  });
  const students = studentsResponse?.data || [];
  const [loadingInteractions, setLoadingInteractions] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });

  // 🔒 Proteção contra chamadas duplicadas
  const hasLoadedRef = useRef(false);

  const loading = loadingStudents || loadingInteractions;

  // Processar dados dos hooks quando carregarem
  useEffect(() => {
    if (!loadingStudents && students) {
      // Students are already in the correct format from useStudents hook
      setLocalStudents(students);
    }
  }, [students, loadingStudents]);

  // 🚀 Carregar TODAS as interações com paginação progressiva (apenas UMA vez)
  useEffect(() => {
    async function loadAllInteractions() {
      // ✅ Verificar se user está presente E se não carregou ainda
      if (!user) {
        setLoadingInteractions(false); // Não está carregando se não há user
        return;
      }

      if (hasLoadedRef.current) return; // Já carregou, não executar novamente

      hasLoadedRef.current = true; // ✅ Marcar como carregado ANTES da requisição

      try {
        setLoadingInteractions(true);
        setLoadingProgress({ loaded: 0, total: 0 });

        const token = await user.getIdToken();

        // 🚀 Carregar todas as páginas com rendering progressivo
        const allInteractions = await fetchAllPages<FamilyInteraction>({
          baseUrl: '/api/interactions',
          token,
          filters: {}, // Sem filtros = todas as interações
          pageLimit: 1000, // 1000 interações por página
          resourceName: 'interações',
          onProgress: (data, progress) => {
            // 📊 Atualizar UI progressivamente conforme carrega
            setLoadingProgress(progress);

            // Type guard para garantir que data é FamilyInteraction[]
            if (!Array.isArray(data)) return;

            const interactions = data as FamilyInteraction[];

            // Ordenar por data (mais recentes primeiro)
            const sorted = [...interactions].sort((a, b) => {
              const dateA = parseDateBR(a.date);
              const dateB = parseDateBR(b.date);
              return dateB.getTime() - dateA.getTime();
            });

            setLocalInteractions(sorted);
          }
        });

        // Ordenar resultado final
        const sorted = [...allInteractions].sort((a, b) => {
          const dateA = parseDateBR(a.date);
          const dateB = parseDateBR(b.date);
          return dateB.getTime() - dateA.getTime();
        });

        setLocalInteractions(sorted);

        // Mostrar mensagem informativa se não há dados
        if (sorted.length === 0) {
          toast.info("Nenhuma interação encontrada. Cadastre interações no perfil dos estudantes para visualizar os relatórios.");
        } else {
          toast.success(`${sorted.length.toLocaleString()} interações carregadas com sucesso!`);
        }
      } catch (error) {
        logger.error('Erro ao carregar interações', {}, error as Error);
        toast.error('Erro ao carregar interações. Tente novamente.');
        hasLoadedRef.current = false; // ✅ Permitir retry em caso de erro
      } finally {
        setLoadingInteractions(false);
      }
    }

    loadAllInteractions();
  }, [user]);

  // Aplicar filtros quando mudarem
  useEffect(() => {
    applyFilters();
  }, [localInteractions, selectedTurma, selectedStudent, selectedType, startDate, endDate, debouncedSearchTerm, showSensitive]);

  const applyFilters = () => {
    let filtered = [...localInteractions];

    // Filtro por turma
    if (selectedTurma && selectedTurma !== "all") {
      const studentIds = localStudents
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

    // Filtro por data (formato dd/mm/aaaa)
    if (startDate) {
      filtered = filtered.filter(i => {
        const interactionDate = i.date; // formato: dd/mm/aaaa
        if (!interactionDate) return false;

        // Converter dd/mm/aaaa para aaaammdd para comparação
        const parts = interactionDate.split('/');
        if (parts.length !== 3) return false;
        const interactionDateNum = `${parts[2]}${parts[1]}${parts[0]}`; // aaaammdd

        const startParts = startDate.split('/');
        const startDateNum = `${startParts[2]}${startParts[1]}${startParts[0]}`; // aaaammdd

        return interactionDateNum >= startDateNum;
      });
    }
    if (endDate) {
      filtered = filtered.filter(i => {
        const interactionDate = i.date; // formato: dd/mm/aaaa
        if (!interactionDate) return false;

        // Converter dd/mm/aaaa para aaaammdd para comparação
        const parts = interactionDate.split('/');
        if (parts.length !== 3) return false;
        const interactionDateNum = `${parts[2]}${parts[1]}${parts[0]}`; // aaaammdd

        const endParts = endDate.split('/');
        const endDateNum = `${endParts[2]}${endParts[1]}${endParts[0]}`; // aaaammdd

        return interactionDateNum <= endDateNum;
      });
    }

    // Filtro por termo de busca
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(i =>
        (i.description || '').toLowerCase().includes(term) ||
        (i.type || '').toLowerCase().includes(term) ||
        (i.createdBy || '').toLowerCase().includes(term)
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
    return [...new Set(localInteractions.map(i => i[key] as string))].filter(Boolean);
  };

  const getTurmas = () => {
    return [...new Set(localStudents.map(s => s.turma))].filter(Boolean).sort();
  };


  const exportToCSV = () => {
    const headers = ["Data", "Tipo", "Estudante", "Turma", "Descrição", "Criado por", "Sensível"];
    const csvData = filteredInteractions.map(interaction => {
      const student = localStudents.find(s => s.estudanteId === interaction.studentId);
      return [
        interaction.date,
        interaction.type,
        student?.nome || "N/A",
        student?.turma || "N/A",
        (interaction.description || '').replace(/"/g, '""'),
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
          <div className="text-slate-600 dark:text-slate-400">
            {loadingProgress.total > 0 ? (
              <>
                <p className="mb-2">
                  Carregando interações... {loadingProgress.loaded.toLocaleString()} de {loadingProgress.total.toLocaleString()}
                </p>
                <div className="mt-2 w-64 mx-auto bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(loadingProgress.loaded / loadingProgress.total) * 100}%` }}
                  />
                </div>
              </>
            ) : (
              <p>Carregando relatórios...</p>
            )}
          </div>
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
      {!loading && localInteractions.length === 0 && (
        <EmptyState
          icon={MessageSquare}
          title="Nenhuma Interação Encontrada"
          description="Para visualizar relatórios e estatísticas, é necessário cadastrar interações com as famílias dos estudantes. Vá para Perfil do Estudante para cadastrar interações."
          variant="info"
        />
      )}

      {/* Cards de Estatísticas - Só mostra se há dados */}
      {!loading && localInteractions.length > 0 && (
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
              {new Set(localInteractions.map(i => i.studentId)).size.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Com interações registradas
            </p>
          </CardContent>
        </Card>
        </div>
      )}

      {/* Componentes de Análise Avançada - Só mostra se há dados */}
      {!loading && localInteractions.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <InteractionChartsCard
            interactions={filteredInteractions}
            students={localStudents}
          />
          <StudentInteractionAnalysisCard
            interactions={localInteractions}
            students={localStudents}
          />
        </div>
      )}

      {/* Filtros - Só mostra se há dados */}
      {!loading && localInteractions.length > 0 && (
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
                  {localStudents
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
                type="text"
                placeholder="dd/mm/aaaa"
                value={startDate}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, ''); // Remove não-dígitos
                  if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
                  if (value.length >= 5) value = value.slice(0, 5) + '/' + value.slice(5, 9);
                  setStartDate(value);
                }}
                maxLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="text"
                placeholder="dd/mm/aaaa"
                value={endDate}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, ''); // Remove não-dígitos
                  if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
                  if (value.length >= 5) value = value.slice(0, 5) + '/' + value.slice(5, 9);
                  setEndDate(value);
                }}
                maxLength={10}
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
      {!loading && localInteractions.length > 0 && (
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
                const student = localStudents.find(s => s.estudanteId === interaction.studentId);
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