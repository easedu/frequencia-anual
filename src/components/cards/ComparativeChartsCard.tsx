import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DistributionChart from "@/components/charts/DistributionChart";
import TurmaComparisonChart from "@/components/charts/TurmaComparisonChart";
import { BarChart3, PieChart, TrendingUp, Users } from "lucide-react";

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

interface ComparativeChartsCardProps {
    data: StudentRecord[];
}

export default function ComparativeChartsCard({ data }: ComparativeChartsCardProps) {
    const alunosConformes = useMemo(() => data.filter(s => s.percentualFaltas < 25).length, [data]);
    const alunosRisco = useMemo(() => data.filter(s => s.percentualFaltas >= 25).length, [data]);

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

    const comparativeData = useMemo(
        () => turmaStats.map(item => ({
            turma: item.turma,
            avgFaltas: item.avgFaltas,
            avgFrequencia: item.avgFrequencia,
        })),
        [turmaStats]
    );

    const distributionData = useMemo(
        () => [
            { name: "Conformes", value: alunosConformes },
            { name: "Em Risco", value: alunosRisco },
        ],
        [alunosConformes, alunosRisco]
    );

    if (data.length === 0) {
        return (
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-2 border-slate-200/50 dark:border-slate-700/50 shadow-lg" role="region" aria-label="Gráficos Comparativos">
                <CardHeader className="bg-gradient-to-r from-slate-50 via-purple-50 to-indigo-50 dark:from-slate-800 dark:via-purple-900/30 dark:to-indigo-900/30 rounded-t-lg pb-4">
                    <CardTitle className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                            <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                Gráficos Comparativos
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
                                Análises visuais e comparações
                            </p>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center">
                            <PieChart className="w-8 h-8 text-purple-500 dark:text-purple-400" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                            Dados insuficientes
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Configure os filtros para visualizar os gráficos comparativos
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-2 border-slate-200/50 dark:border-slate-700/50 shadow-lg" role="region" aria-label="Gráficos Comparativos">
            <CardHeader className="bg-gradient-to-r from-slate-50 via-purple-50 to-indigo-50 dark:from-slate-800 dark:via-purple-900/30 dark:to-indigo-900/30 rounded-t-lg pb-4">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                            <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                Gráficos Comparativos
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
                                Análises visuais e comparações
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/40 rounded-full">
                        <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                            {turmaStats.length} turmas
                        </span>
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
                {/* Layout Grid Compacto */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* Distribuição de Estudantes */}
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 border-2 border-slate-200/50 dark:border-slate-700/50">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-sm">
                                <PieChart className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    Distribuição de Estudantes
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Conformes vs. Em Risco
                                </p>
                            </div>
                        </div>

                        {/* Estatísticas Rápidas */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-center border border-green-200 dark:border-green-800">
                                <p className="text-xs text-green-600 dark:text-green-400">Conformes</p>
                                <p className="text-lg font-bold text-green-700 dark:text-green-300">{alunosConformes}</p>
                                <p className="text-xs text-green-600 dark:text-green-400">
                                    {data.length > 0 ? ((alunosConformes / data.length) * 100).toFixed(1) : 0}%
                                </p>
                            </div>
                            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-center border border-red-200 dark:border-red-800">
                                <p className="text-xs text-red-600 dark:text-red-400">Em Risco</p>
                                <p className="text-lg font-bold text-red-700 dark:text-red-300">{alunosRisco}</p>
                                <p className="text-xs text-red-600 dark:text-red-400">
                                    {data.length > 0 ? ((alunosRisco / data.length) * 100).toFixed(1) : 0}%
                                </p>
                            </div>
                        </div>

                        <DistributionChart distributionData={distributionData} />
                    </div>

                    {/* Comparação por Turma */}
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 border-2 border-slate-200/50 dark:border-slate-700/50">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm">
                                <TrendingUp className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    Comparação por Turma
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Faltas vs. Frequência
                                </p>
                            </div>
                        </div>

                        {/* Resumo das Turmas */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                                <p className="text-xs text-blue-600 dark:text-blue-400">Turmas</p>
                                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{turmaStats.length}</p>
                            </div>
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                                <p className="text-xs text-amber-600 dark:text-amber-400">Melhor</p>
                                <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                                    {turmaStats.length > 0 ? turmaStats.reduce((max, t) => t.avgFrequencia > max ? t.avgFrequencia : max, 0).toFixed(1) : 0}%
                                </p>
                            </div>
                            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                                <p className="text-xs text-red-600 dark:text-red-400">Pior</p>
                                <p className="text-sm font-bold text-red-700 dark:text-red-300">
                                    {turmaStats.length > 0 ? turmaStats.reduce((min, t) => t.avgFrequencia < min ? t.avgFrequencia : min, 100).toFixed(1) : 0}%
                                </p>
                            </div>
                        </div>

                        <TurmaComparisonChart comparativeData={comparativeData} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}