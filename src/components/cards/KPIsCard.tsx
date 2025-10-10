import { useMemo, memo, lazy, Suspense } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Lazy load do componente de gráfico (Recharts)
const TurmaFrequencyGrid = lazy(() => import("@/components/charts/TurmaFrequencyGrid"));
import { TrendingUp, TrendingDown, Users, AlertTriangle, CheckCircle, BarChart3, Award } from "lucide-react";

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

interface KPIsCardProps {
    data: StudentRecord[];
    totalDiasLetivos: number;
}

const KPIsCard = memo(function KPIsCard({ data, totalDiasLetivos }: KPIsCardProps) {
    const totalStudents = useMemo(() => data.length, [data]);
    const alunosConformes = useMemo(() => data.filter(s => s.percentualFaltas < 25).length, [data]);
    const nearLimitCount = useMemo(() => data.filter(s => s.percentualFaltas >= 20 && s.percentualFaltas < 25).length, [data]);
    const alunosRisco = useMemo(() => data.filter(s => s.percentualFaltas >= 25).length, [data]);
    const percentualConforme = useMemo(
        () => (totalStudents ? Number(((alunosConformes / totalStudents) * 100).toFixed(1)) : 0),
        [alunosConformes, totalStudents]
    );
    const mediaFaltasGlobal = useMemo(
        () => (totalDiasLetivos ? Number((data.reduce((sum, s) => sum + s.totalFaltas, 0) / totalDiasLetivos).toFixed(1)) : 0),
        [data, totalDiasLetivos]
    );

    const turmaStats = useMemo(() => {
        const stats = data.reduce(
            (acc, s) => {
                if (!acc[s.turma]) {
                    acc[s.turma] = { turma: s.turma, totalFaltas: 0, totalFrequencia: 0, count: 0 };
                }
                acc[s.turma].totalFaltas += s.totalFaltas;
                acc[s.turma].totalFrequencia += s.percentualFrequencia;
                acc[s.turma].count++;
                return acc;
            },
            {} as Record<string, { turma: string; totalFaltas: number; totalFrequencia: number; count: number }>
        );

        const result = Object.values(stats).map(group => ({
            turma: group.turma,
            avgFaltas: Number((group.totalFaltas / group.count).toFixed(1)),
            avgFrequencia: Number((group.totalFrequencia / group.count).toFixed(1)),
        }));

        return result.sort((a, b) => {
            const [numA, letterA] = a.turma.match(/(\d+)([A-Z]+)/)!.slice(1);
            const [numB, letterB] = b.turma.match(/(\d+)([A-Z]+)/)!.slice(1);
            const numCompare = Number(numA) - Number(numB);
            if (numCompare !== 0) return numCompare;
            return letterA.localeCompare(letterB);
        });
    }, [data]);

    const kpiData = [
        {
            title: "Conformes",
            subtitle: "Frequência ≥ 75%",
            value: alunosConformes,
            percentage: percentualConforme,
            icon: CheckCircle,
            color: "green",
            bgGradient: "from-emerald-500 to-green-600",
            bgLight: "bg-emerald-50 dark:bg-emerald-900/20",
            textColor: "text-emerald-600 dark:text-emerald-400",
            borderColor: "border-emerald-200 dark:border-emerald-800"
        },
        {
            title: "Próximo ao Limite",
            subtitle: "Frequência 75-80%",
            value: nearLimitCount,
            percentage: totalStudents ? Number(((nearLimitCount / totalStudents) * 100).toFixed(1)) : 0,
            icon: AlertTriangle,
            color: "yellow",
            bgGradient: "from-amber-500 to-orange-600",
            bgLight: "bg-amber-50 dark:bg-amber-900/20",
            textColor: "text-amber-600 dark:text-amber-400",
            borderColor: "border-amber-200 dark:border-amber-800"
        },
        {
            title: "Em Risco",
            subtitle: "Frequência < 75%",
            value: alunosRisco,
            percentage: totalStudents ? Number(((alunosRisco / totalStudents) * 100).toFixed(1)) : 0,
            icon: TrendingDown,
            color: "red",
            bgGradient: "from-red-500 to-pink-600",
            bgLight: "bg-red-50 dark:bg-red-900/20",
            textColor: "text-red-600 dark:text-red-400",
            borderColor: "border-red-200 dark:border-red-800"
        },
        {
            title: "Faltas Diárias",
            subtitle: "Média global",
            value: mediaFaltasGlobal,
            percentage: null,
            icon: BarChart3,
            color: "blue",
            bgGradient: "from-blue-500 to-indigo-600",
            bgLight: "bg-blue-50 dark:bg-blue-900/20",
            textColor: "text-blue-600 dark:text-blue-400",
            borderColor: "border-blue-200 dark:border-blue-800"
        }
    ];

    if (data.length === 0) {
        return (
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-2 border-slate-200/50 dark:border-slate-700/50 shadow-lg" role="region" aria-label="Indicadores-Chave de Frequência">
                <CardHeader className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-600 rounded-t-lg pb-4">
                    <CardTitle className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg">
                            <Award className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                Indicadores-Chave (KPIs)
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
                                Métricas de frequência e desempenho
                            </p>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center">
                            <BarChart3 className="w-8 h-8 text-slate-500 dark:text-slate-400" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                            Nenhum dado disponível
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Aplique filtros para visualizar os indicadores de frequência
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-2 border-slate-200/50 dark:border-slate-700/50 shadow-lg" role="region" aria-label="Indicadores-Chave de Frequência">
            <CardHeader className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-600 rounded-t-lg pb-4">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg">
                            <Award className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                Indicadores-Chave (KPIs)
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
                                Métricas de frequência e desempenho
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 rounded-full">
                        <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                            {totalStudents} estudantes
                        </span>
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
                {/* Grid de KPIs - Mais Compacto */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {kpiData.map((kpi, index) => (
                        <div
                            key={index}
                            className={`relative p-3 ${kpi.bgLight} rounded-xl border-2 ${kpi.borderColor} shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden`}
                        >
                            {/* Efeito de gradiente no hover */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${kpi.bgGradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

                            <div className="relative z-10">
                                {/* Header do KPI - Compacto */}
                                <div className="flex items-center justify-between mb-2">
                                    <div className={`p-1.5 bg-gradient-to-br ${kpi.bgGradient} rounded-lg shadow-sm`}>
                                        <kpi.icon className="w-4 h-4 text-white" />
                                    </div>
                                    {kpi.percentage !== null && (
                                        <div className={`px-1.5 py-0.5 ${kpi.bgLight} rounded-md border ${kpi.borderColor}`}>
                                            <span className={`text-xs font-bold ${kpi.textColor}`}>
                                                {kpi.percentage}%
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Valor principal - Compacto */}
                                <div>
                                    <p className={`text-2xl font-bold ${kpi.textColor} mb-1 leading-none`}>
                                        {kpi.value}
                                    </p>
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-xs leading-tight mb-0.5">
                                        {kpi.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
                                        {kpi.subtitle}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Seção de Frequência por Turma - Compacta */}
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 border-2 border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-sm">
                            <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                Frequência por Turma
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                Média de frequência e faltas por turma
                            </p>
                        </div>
                    </div>
                    <Suspense fallback={
                        <div className="flex items-center justify-center h-40 text-gray-500">
                            <div className="animate-pulse">Carregando gráfico...</div>
                        </div>
                    }>
                        <TurmaFrequencyGrid turmaStats={turmaStats} />
                    </Suspense>
                </div>
            </CardContent>
        </Card>
    );
});

export default KPIsCard;