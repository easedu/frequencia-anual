import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Calendar, MessageSquare, Users } from "lucide-react";
import { FamilyInteraction, Student } from "@/types";

interface InteractionChartsCardProps {
  interactions: FamilyInteraction[];
  students: Student[];
}

export default function InteractionChartsCard({ interactions, students }: InteractionChartsCardProps) {
  const [chartType, setChartType] = useState<"types" | "monthly" | "turmas">("types");

  const getInteractionsByType = () => {
    const counts: Record<string, number> = {};
    interactions.forEach(interaction => {
      counts[interaction.type] = (counts[interaction.type] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  };

  const getInteractionsByMonth = () => {
    const counts: Record<string, number> = {};
    interactions.forEach(interaction => {
      // interaction.date já está no formato dd/mm/aaaa
      const dateParts = interaction.date.split('/');
      if (dateParts.length === 3) {
        const month = `${dateParts[1]}/${dateParts[2]}`; // MM/YYYY
        counts[month] = (counts[month] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort(([a], [b]) => {
        const [monthA, yearA] = a.split('/');
        const [monthB, yearB] = b.split('/');
        const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1);
        const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(-12); // Últimos 12 meses
  };

  const getInteractionsByTurma = () => {
    const counts: Record<string, number> = {};
    interactions.forEach(interaction => {
      const student = students.find(s => s.id === interaction.studentId);
      if (student?.turma) {
        counts[student.turma] = (counts[student.turma] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  };

  const renderBarChart = (data: [string, number][], title: string, color: string) => {
    const maxValue = Math.max(...data.map(([, value]) => value));

    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">{title}</h3>
        <div className="space-y-3 pr-12">
          {data.map(([label, value]) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-32 text-sm text-gray-600 dark:text-gray-400" title={label}>
                {label}
              </div>
              <div className="flex-1 relative">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} transition-all duration-500 ease-out`}
                    style={{ width: `${(value / maxValue) * 100}%` }}
                  />
                </div>
                <span className="absolute -right-10 top-0 h-6 flex items-center text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-2 rounded shadow-sm">
                  {value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getCurrentData = () => {
    switch (chartType) {
      case "types":
        return {
          data: getInteractionsByType(),
          title: "Interações por Tipo",
          color: "bg-gradient-to-r from-blue-500 to-indigo-600",
          icon: MessageSquare
        };
      case "monthly":
        return {
          data: getInteractionsByMonth(),
          title: "Interações por Mês",
          color: "bg-gradient-to-r from-green-500 to-emerald-600",
          icon: Calendar
        };
      case "turmas":
        return {
          data: getInteractionsByTurma(),
          title: "Interações por Turma",
          color: "bg-gradient-to-r from-purple-500 to-violet-600",
          icon: Users
        };
      default:
        return {
          data: [],
          title: "",
          color: "",
          icon: BarChart3
        };
    }
  };

  const currentData = getCurrentData();

  return (
    <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Análise Gráfica
          </CardTitle>
          <Select value={chartType} onValueChange={(value: "types" | "monthly" | "turmas") => setChartType(value)}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="types">Por Tipo de Interação</SelectItem>
              <SelectItem value="monthly">Por Mês</SelectItem>
              <SelectItem value="turmas">Por Turma</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Métricas Resumidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Total de Interações
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                {interactions.length.toLocaleString()}
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Estudantes Envolvidos
                </span>
              </div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-200">
                {new Set(interactions.map(i => i.studentId)).size.toLocaleString()}
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
                  Tipos Diferentes
                </span>
              </div>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-200">
                {new Set(interactions.map(i => i.type)).size.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Gráfico */}
          <div className="min-h-[300px]">
            {currentData.data.length > 0 ? (
              renderBarChart(currentData.data, currentData.title, currentData.color)
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Nenhum dado disponível para o gráfico selecionado</p>
                </div>
              </div>
            )}
          </div>

          {/* Insights */}
          {currentData.data.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Insights
              </h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {chartType === "types" && (
                  <>
                    <p>• O tipo de interação mais comum é &quot;{currentData.data[0][0]}&quot; com {currentData.data[0][1]} registros</p>
                    <p>• Os top 3 tipos representam {Math.round((currentData.data.slice(0, 3).reduce((sum, [, count]) => sum + count, 0) / interactions.length) * 100)}% de todas as interações</p>
                  </>
                )}
                {chartType === "monthly" && (
                  <>
                    <p>• Mês com mais interações: {currentData.data[currentData.data.length - 1][0]} ({currentData.data[currentData.data.length - 1][1]} registros)</p>
                    <p>• Média mensal: {Math.round(interactions.length / Math.max(currentData.data.length, 1))} interações</p>
                  </>
                )}
                {chartType === "turmas" && (
                  <>
                    <p>• Turma com mais interações: {currentData.data[0][0]} ({currentData.data[0][1]} registros)</p>
                    <p>• {currentData.data.length} turmas têm interações registradas</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}