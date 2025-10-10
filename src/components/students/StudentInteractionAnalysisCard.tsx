import { useState, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  User,
  Search,
  AlertTriangle,
  Calendar,
  MessageSquare,
  Users,
  Clock,
  GraduationCap,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { FamilyInteraction, Student } from "@/types";

interface StudentWithStats extends Student {
  id: string; // Adicionar propriedade id que pode vir de estudanteId
  interactionCount: number;
  lastInteraction?: string;
  lastInteractionDate?: Date;
  sensitiveCount: number;
  averageFrequency: number;
  topInteractionType: string;
  riskLevel: "baixo" | "médio" | "alto";
}

interface StudentInteractionAnalysisCardProps {
  interactions: FamilyInteraction[];
  students: Student[];
}

const StudentInteractionAnalysisCard = memo(function StudentInteractionAnalysisCard({
  interactions,
  students
}: StudentInteractionAnalysisCardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTurma, setSelectedTurma] = useState("all");
  const [sortBy, setSortBy] = useState<"interactions" | "recent" | "risk">("interactions");
  const [showOnlyRisk, setShowOnlyRisk] = useState(false);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const studentsWithStats = useMemo((): StudentWithStats[] => {
    return students.map(student => {
      const studentInteractions = interactions.filter(i => i.studentId === student.estudanteId);
      const sensitiveCount = studentInteractions.filter(i => i.sensitive).length;

      // Calcular frequência média (interações por mês)
      const firstInteraction = studentInteractions.length > 0
        ? new Date(Math.min(...studentInteractions.map(i => {
            const dateParts = i.date.split('/');
            if (dateParts.length === 3) {
              return new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`).getTime(); // yyyy-mm-dd
            }
            return Date.now();
          })))
        : null;
      const monthsDiff = firstInteraction
        ? Math.max(1, Math.ceil((Date.now() - firstInteraction.getTime()) / (1000 * 60 * 60 * 24 * 30)))
        : 1;
      const averageFrequency = studentInteractions.length / monthsDiff;

      // Tipo de interação mais comum
      const typeCounts: Record<string, number> = {};
      studentInteractions.forEach(i => {
        typeCounts[i.type] = (typeCounts[i.type] || 0) + 1;
      });
      const topInteractionType = Object.entries(typeCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || "Nenhuma";

      // Última interação
      const sortedInteractions = studentInteractions.sort((a, b) => {
        const datePartsA = a.date.split('/');
        const datePartsB = b.date.split('/');
        if (datePartsA.length === 3 && datePartsB.length === 3) {
          const dateA = new Date(`${datePartsA[2]}-${datePartsA[1]}-${datePartsA[0]}`);
          const dateB = new Date(`${datePartsB[2]}-${datePartsB[1]}-${datePartsB[0]}`);
          return dateB.getTime() - dateA.getTime();
        }
        return 0;
      });
      const lastInteraction = sortedInteractions[0];

      // Calcular nível de risco baseado em critérios pedagógicos
      let riskLevel: "baixo" | "médio" | "alto" = "baixo";

      // ALTO RISCO: Situações que requerem atenção imediata
      if (sensitiveCount > 0 || studentInteractions.length > 15) {
        riskLevel = "alto";
      }
      // MÉDIO RISCO: Situações que merecem acompanhamento
      else if (studentInteractions.length > 8 || averageFrequency > 1.5) {
        riskLevel = "médio";
      }
      // BAIXO RISCO: Situações normais (padrão)

      return {
        ...student,
        id: student.estudanteId, // Usar estudanteId como id
        interactionCount: studentInteractions.length,
        lastInteraction: lastInteraction?.date,
        lastInteractionDate: lastInteraction ? (() => {
          const dateParts = lastInteraction.date.split('/');
          if (dateParts.length === 3) {
            return new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
          }
          return undefined;
        })() : undefined,
        sensitiveCount,
        averageFrequency,
        topInteractionType,
        riskLevel
      };
    });
  }, [students, interactions]);

  const filteredAndSortedStudents = useMemo(() => {
    let filtered = studentsWithStats;

    // Reset página quando filtros mudarem
    setCurrentPage(1);

    // Filtro por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(student =>
        student.nome.toLowerCase().includes(term) ||
        student.turma?.toLowerCase().includes(term)
      );
    }

    // Filtro por turma
    if (selectedTurma && selectedTurma !== "all") {
      filtered = filtered.filter(student => student.turma === selectedTurma);
    }

    // Filtro por risco
    if (showOnlyRisk) {
      filtered = filtered.filter(student => student.riskLevel === "alto");
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "interactions":
          return b.interactionCount - a.interactionCount;
        case "recent":
          if (!a.lastInteractionDate && !b.lastInteractionDate) return 0;
          if (!a.lastInteractionDate) return 1;
          if (!b.lastInteractionDate) return -1;
          return b.lastInteractionDate.getTime() - a.lastInteractionDate.getTime();
        case "risk":
          const riskOrder = { alto: 3, médio: 2, baixo: 1 };
          return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
        default:
          return 0;
      }
    });

    return filtered;
  }, [studentsWithStats, searchTerm, selectedTurma, sortBy, showOnlyRisk]);

  const getTurmas = () => {
    return [...new Set(students.map(s => s.turma))].filter(Boolean).sort();
  };

  const getRiskLevelColor = (level: "baixo" | "médio" | "alto") => {
    switch (level) {
      case "alto":
        return "bg-red-100 text-red-800 border-red-200";
      case "médio":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "baixo":
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getRiskStats = () => {
    const stats = { alto: 0, médio: 0, baixo: 0 };
    studentsWithStats.forEach(student => {
      stats[student.riskLevel]++;
    });
    return stats;
  };

  const riskStats = getRiskStats();

  // Cálculos de paginação
  const totalStudents = filteredAndSortedStudents.length;
  const totalPages = Math.ceil(totalStudents / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStudents = filteredAndSortedStudents.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-blue-600" />
          Análise por Estudante
        </CardTitle>

        {/* Estatísticas de Risco */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="text-sm text-red-600 dark:text-red-400 mb-1">Alto Risco</div>
            <div className="text-xl font-bold text-red-800 dark:text-red-200">{riskStats.alto}</div>
            <div className="text-xs text-red-500 dark:text-red-400 mt-1">Casos sensíveis ou +15 interações</div>
          </div>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">Médio Risco</div>
            <div className="text-xl font-bold text-yellow-800 dark:text-yellow-200">{riskStats.médio}</div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">8-15 interações ou freq. alta</div>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-sm text-green-600 dark:text-green-400 mb-1">Baixo Risco</div>
            <div className="text-xl font-bold text-green-800 dark:text-green-200">{riskStats.baixo}</div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">Até 8 interações normais</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <Label>Buscar estudante</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Nome ou turma..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Turma</Label>
            <Select value={selectedTurma} onValueChange={setSelectedTurma}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
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
            <Label>Ordenar por</Label>
            <Select value={sortBy} onValueChange={(value: "interactions" | "recent" | "risk") => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interactions">Nº de Interações</SelectItem>
                <SelectItem value="recent">Mais Recente</SelectItem>
                <SelectItem value="risk">Nível de Risco</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pt-6">
            <input
              type="checkbox"
              id="onlyRisk"
              checked={showOnlyRisk}
              onChange={(e) => setShowOnlyRisk(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="onlyRisk" className="text-sm">
              Apenas alto risco
            </Label>
          </div>
        </div>

        {/* Lista de Estudantes */}
        <div className="space-y-4">
          {totalStudents === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium">Nenhum estudante encontrado</p>
              <p className="text-xs">Ajuste os filtros para ver mais resultados</p>
            </div>
          ) : (
            currentStudents.map(student => (
              <div
                key={student.id}
                className={`p-4 border rounded-lg ${
                  student.riskLevel === "alto"
                    ? "border-red-200 bg-red-50 dark:bg-red-900/20"
                    : student.riskLevel === "médio"
                    ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20"
                    : "border-gray-200 bg-gray-50 dark:bg-gray-900/20"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {student.nome}
                      </span>
                    </div>
                    {student.turma && (
                      <Badge variant="outline" className="text-xs">
                        <GraduationCap className="w-3 h-3 mr-1" />
                        {student.turma}
                      </Badge>
                    )}
                  </div>
                  <Badge className={`text-xs ${getRiskLevelColor(student.riskLevel)}`}>
                    {student.riskLevel.toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3 h-3 text-blue-600" />
                    <span className="text-gray-600 dark:text-gray-400">Interações:</span>
                    <span className="font-medium">{student.interactionCount}</span>
                  </div>

                  {student.sensitiveCount > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3 text-red-600" />
                      <span className="text-gray-600 dark:text-gray-400">Sensíveis:</span>
                      <span className="font-medium text-red-600">{student.sensitiveCount}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-green-600" />
                    <span className="text-gray-600 dark:text-gray-400">Frequência:</span>
                    <span className="font-medium">
                      {student.averageFrequency.toFixed(1)}/mês
                    </span>
                  </div>

                  {student.lastInteraction && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-purple-600" />
                      <span className="text-gray-600 dark:text-gray-400">Última:</span>
                      <span className="font-medium">
                        {student.lastInteraction}
                      </span>
                    </div>
                  )}
                </div>

                {student.interactionCount > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Tipo mais comum:</span>
                      <Badge variant="secondary" className="text-xs">
                        {student.topInteractionType}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500">
                Mostrando {startIndex + 1}-{Math.min(endIndex, totalStudents)} de {totalStudents} estudantes
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {/* Páginas */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default StudentInteractionAnalysisCard;