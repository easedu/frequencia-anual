import { useState, useEffect, useMemo, memo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { BarChart, Bar, CartesianGrid, XAxis, Cell } from "recharts";
import { AbsenceService } from "@/services/supabase/absenceService";
import { parseDate, getBimesterByDate, formatFirebaseDate } from "@/utils/attendanceUtils";
import { logger } from "@/utils/logger";
import {
    Calendar,
    TrendingUp,
    Users,
    AlertTriangle,
    ArrowUp,
    ArrowDown,
    BarChart3,
    Grid3X3,
    RefreshCw,
    LucideIcon
} from "lucide-react";

interface StudentRecord {
    estudanteId: string;
    turma: string;
    nome: string;
    faltasB1: number;
    faltasB2: number;
    faltasB3: number;
    faltasB4: number;
    totalFaltas: number;
    percentualFaltas: number;
    percentualFrequencia: number;
}

interface AbsenceRecord {
    estudanteId: string;
    turma: string;
    data: string;
    docId: string;
    justified: boolean;
}

interface DayOfWeekData {
    day: string;
    absences: number;
}

interface BimesterDates {
    [key: number]: { start: string; end: string };
}

interface DayOfWeekDistributionCardProps {
    data: StudentRecord[];
    startDate: string;
    endDate: string;
    selectedBimesters: Set<number>;
    bimesterDates: BimesterDates;
    excludeJustified: boolean;
}

// Componente para métricas do dashboard
const MetricCard = ({
    icon: Icon,
    title,
    value,
    subtitle,
    color = "blue",
    trend
}: {
    icon: LucideIcon;
    title: string;
    value: string | number;
    subtitle?: string;
    color?: "blue" | "red" | "green" | "purple";
    trend?: "up" | "down";
}) => {
    const colorClasses = {
        blue: "from-blue-500 to-blue-600 text-blue-600 bg-blue-50",
        red: "from-red-500 to-red-600 text-red-600 bg-red-50",
        green: "from-green-500 to-green-600 text-green-600 bg-green-50",
        purple: "from-purple-500 to-purple-600 text-purple-600 bg-purple-50"
    };

    return (
        <Card className="relative overflow-hidden border-0 shadow-sm">
            <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]} opacity-5`} />
            <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${colorClasses[color].split(' ')[2]} ${colorClasses[color].split(' ')[3]}`}>
                            <Icon className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-600">{title}</p>
                            <div className="flex items-center gap-2">
                                <p className="text-xl font-bold text-gray-900">{value}</p>
                                {trend && (
                                    <div className={`flex items-center ${trend === 'up' ? 'text-red-500' : 'text-green-500'}`}>
                                        {trend === 'up' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                    </div>
                                )}
                            </div>
                            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// Componente para mini grid de turmas
const TurmaGrid = ({
    turmaData,
    selectedTurma,
    onTurmaSelect
}: {
    turmaData: [string, DayOfWeekData[]][];
    selectedTurma: string | null;
    onTurmaSelect: (turma: string) => void;
}) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-11 gap-2">
            {turmaData.map(([turma, days]) => {
                const maxAbsences = Math.max(...days.map(d => d.absences));
                const maxDay = days.find(d => d.absences === maxAbsences)?.day || "N/A";
                const isSelected = selectedTurma === turma;

                return (
                    <Button
                        key={turma}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => onTurmaSelect(turma)}
                        className={`h-auto p-3 flex flex-col items-center gap-1 transition-all duration-200 ${isSelected
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                            : 'hover:bg-blue-50 hover:border-blue-200'
                            }`}
                    >
                        <Badge
                            variant={isSelected ? "secondary" : "outline"}
                            className={`text-xs font-mono ${isSelected ? 'bg-white/20 text-white border-white/30' : ''}`}
                        >
                            {turma}
                        </Badge>
                        <div className="text-center">
                            <div className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                {maxAbsences}
                            </div>
                            <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                                {maxDay}
                            </div>
                        </div>
                    </Button>
                );
            })}
        </div>
    );
};

const DayOfWeekDistributionCard = memo(function DayOfWeekDistributionCard({
    data,
    startDate,
    endDate,
    selectedBimesters,
    bimesterDates,
    excludeJustified,
}: DayOfWeekDistributionCardProps) {
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'chart' | 'grid'>('chart');

    const uniqueTurmas = useMemo(
        () =>
            Array.from(new Set(data.map((item) => item.turma))).sort((a, b) => {
                const [numA, letterA] = a.match(/(\d+)([A-Z]+)/)!.slice(1);
                const [numB, letterB] = b.match(/(\d+)([A-Z]+)/)!.slice(1);
                const numCompare = Number(numA) - Number(numB);
                if (numCompare !== 0) return numCompare;
                return letterA.localeCompare(letterB);
            }),
        [data]
    );

    const [dayStats, setDayStats] = useState<{
        overall: DayOfWeekData[];
        byTurma: Record<string, DayOfWeekData[]>
    }>({
        overall: [],
        byTurma: {},
    });
    const [selectedTurmaDay, setSelectedTurmaDay] = useState<string | null>(null);

    // Move a lógica assíncrona para useEffect
    useEffect(() => {
        const fetchDayOfWeekData = async () => {
            setLoading(true);
            try {
                // Buscar faltas do Supabase
                const supabaseAbsences = await AbsenceService.getAllAbsences();
                // getAllAbsences já retorna AbsenceRecord[] no formato correto
                const absenceRecords: AbsenceRecord[] = supabaseAbsences as any;

                const startDateObj = parseDate(startDate);
                const endDateObj = parseDate(endDate);

                if (!startDateObj || !endDateObj) {
                    setDayStats({ overall: [], byTurma: {} });
                    return;
                }

                const filteredRecords = absenceRecords.filter((record) => {
                    const date = parseDate(record.data);
                    const bimester = getBimesterByDate(record.data, bimesterDates);
                    const isValidDate = date && !isNaN(date.getTime()) && date >= startDateObj && date <= endDateObj;
                    const isValidBimester = selectedBimesters.size === 0 || (bimester > 0 && selectedBimesters.has(bimester));
                    const isValidJustification = !excludeJustified || !record.justified;

                    return isValidDate && isValidBimester && isValidJustification;
                });

                const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                const overall: DayOfWeekData[] = daysOfWeek.map((day) => ({ day, absences: 0 }));
                const byTurma: Record<string, DayOfWeekData[]> = {};

                uniqueTurmas.forEach((turma) => {
                    byTurma[turma] = daysOfWeek.map((day) => ({ day, absences: 0 }));
                });

                filteredRecords.forEach((record) => {
                    const date = parseDate(record.data);
                    if (date && !isNaN(date.getTime())) {
                        const dayIndex = date.getDay();
                        overall[dayIndex].absences++;
                        if (byTurma[record.turma]) {
                            byTurma[record.turma][dayIndex].absences++;
                        }
                    }
                });

                setDayStats({ overall, byTurma });
            } catch (error) {
                logger.error("Erro ao calcular faltas por dia da semana", { startDate, endDate }, error as Error);
                setDayStats({ overall: [], byTurma: {} });
            } finally {
                setLoading(false);
            }
        };

        // Só executar se temos dados válidos
        if (startDate && endDate && Object.keys(bimesterDates).length > 0) {
            fetchDayOfWeekData();
        }
    }, [startDate, endDate, selectedBimesters, uniqueTurmas, bimesterDates, excludeJustified]);

    const handleTurmaClick = (turma: string) => {
        setSelectedTurmaDay((prev) => (prev === turma ? null : turma));
    };

    // Métricas calculadas
    const metrics = useMemo(() => {
        const dataToUse = selectedTurmaDay ? dayStats.byTurma[selectedTurmaDay] || [] : dayStats.overall;
        const totalAbsences = dataToUse.reduce((sum, day) => sum + day.absences, 0);
        const maxAbsences = Math.max(...dataToUse.map(d => d.absences), 0);
        const maxDay = dataToUse.find(d => d.absences === maxAbsences)?.day || "N/A";
        const avgAbsences = dataToUse.length > 0 ? (totalAbsences / dataToUse.length).toFixed(1) : "0";

        // Determinar se segunda-feira tem mais faltas (tendência comum)
        const mondayAbsences = dataToUse.find(d => d.day === "Seg")?.absences || 0;
        const isMonday = maxDay === "Seg";

        return {
            total: totalAbsences,
            max: maxAbsences,
            maxDay,
            average: avgAbsences,
            isMonday,
            mondayAbsences
        };
    }, [dayStats, selectedTurmaDay]);

    const chartData = useMemo(() => {
        const dataToUse = selectedTurmaDay ? dayStats.byTurma[selectedTurmaDay] || [] : dayStats.overall;

        // Gradiente moderno para as barras
        const colors = [
            "#ef4444", // Dom - vermelho
            "#3b82f6", // Seg - azul
            "#10b981", // Ter - verde
            "#f59e0b", // Qua - amarelo
            "#8b5cf6", // Qui - roxo
            "#06b6d4", // Sex - ciano
            "#f97316"  // Sáb - laranja
        ];

        const maxAbsences = Math.max(...dataToUse.map(d => d.absences), 0);

        return dataToUse.map((item, index) => ({
            day: item.day,
            absences: item.absences,
            fill: colors[index],
            isMax: item.absences === maxAbsences,
            percentage: maxAbsences > 0 ? ((item.absences / maxAbsences) * 100).toFixed(1) : "0"
        }));
    }, [dayStats, selectedTurmaDay]);

    const dayChartConfig = {
        absences: { label: "Faltas", color: "#3b82f6" }
    };

    if (loading) {
        return (
            <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span>Carregando dados...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header com título e controles */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Calendar className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-semibold text-gray-900">
                                    Distribuição por Dia da Semana
                                </CardTitle>
                                <CardDescription className="text-sm text-gray-600">
                                    {selectedTurmaDay ? `Turma ${selectedTurmaDay}` : "Visão Geral da Escola"} • 2025
                                </CardDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant={viewMode === 'chart' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('chart')}
                            >
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Gráfico
                            </Button>
                            <Button
                                variant={viewMode === 'grid' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid3X3 className="h-4 w-4 mr-2" />
                                Grid
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Métricas Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    icon={TrendingUp}
                    title="Total de Faltas"
                    value={metrics.total}
                    color="blue"
                />
                <MetricCard
                    icon={AlertTriangle}
                    title="Pior Dia"
                    value={metrics.maxDay}
                    subtitle={`${metrics.max} faltas`}
                    color="red"
                    trend={metrics.isMonday ? "up" : undefined}
                />
                <MetricCard
                    icon={BarChart3}
                    title="Média Diária"
                    value={metrics.average}
                    subtitle="faltas/dia"
                    color="purple"
                />
                <MetricCard
                    icon={Users}
                    title="Segunda-feira"
                    value={metrics.mondayAbsences}
                    subtitle={metrics.isMonday ? "Dia crítico" : "Normal"}
                    color={metrics.isMonday ? "red" : "green"}
                />
            </div>

            {dayStats.overall.length > 0 && chartData.length > 0 ? (
                <>
                    {viewMode === 'chart' ? (
                        /* Gráfico Principal */
                        <Card className="border-0 shadow-lg overflow-hidden">
                            <CardContent className="p-6">
                                <ChartContainer config={dayChartConfig} className="h-64 w-full">
                                    <BarChart data={chartData} width={800} height={256} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="day"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: '#64748b' }}
                                            tickMargin={10}
                                        />
                                        <ChartTooltip
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                                            <p className="font-medium text-gray-900">{label}</p>
                                                            <p className="text-sm text-gray-600">
                                                                <span className="font-medium">{data.absences}</span> faltas
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {data.percentage}% do pico
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar
                                            dataKey="absences"
                                            radius={[4, 4, 0, 0]}
                                            className="drop-shadow-sm"
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.fill}
                                                    stroke={entry.isMax ? "#1f2937" : "transparent"}
                                                    strokeWidth={entry.isMax ? 2 : 0}
                                                    className={entry.isMax ? "drop-shadow-lg" : ""}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    ) : (
                        /* Visualização em Grid */
                        <Card className="border-0 shadow-lg">
                            <CardContent className="p-6">
                                <div className="grid grid-cols-7 gap-4">
                                    {chartData.map((day) => (
                                        <div
                                            key={day.day}
                                            className={`relative p-4 rounded-xl text-center transition-all duration-300 hover:scale-105 ${day.isMax
                                                ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg'
                                                : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 hover:from-blue-100 hover:to-blue-200'
                                                }`}
                                        >
                                            <div className="text-xs font-medium opacity-80 mb-1">
                                                {day.day}
                                            </div>
                                            <div className="text-2xl font-bold mb-1">
                                                {day.absences}
                                            </div>
                                            <div className="text-xs opacity-70">
                                                {day.percentage}%
                                            </div>
                                            {day.isMax && (
                                                <div className="absolute -top-1 -right-1">
                                                    <AlertTriangle className="h-4 w-4 text-yellow-300" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Seleção de Turmas */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-gray-600" />
                                    <CardTitle className="text-lg">Análise por Turma</CardTitle>
                                </div>
                                {selectedTurmaDay && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedTurmaDay(null)}
                                    >
                                        Ver Geral
                                    </Button>
                                )}
                            </div>
                            <CardDescription>
                                Clique em uma turma para ver detalhes específicos
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TurmaGrid
                                turmaData={Object.entries(dayStats.byTurma)}
                                selectedTurma={selectedTurmaDay}
                                onTurmaSelect={handleTurmaClick}
                            />
                        </CardContent>
                    </Card>
                </>
            ) : (
                <Card className="border-0 shadow-lg">
                    <CardContent className="p-8">
                        <div className="text-center text-gray-500">
                            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <h3 className="text-lg font-medium mb-2">Nenhum dado disponível</h3>
                            <p className="text-sm">
                                Verifique os filtros, datas, períodos dos bimestres ou a conexão com o banco de dados.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
});

export default DayOfWeekDistributionCard;