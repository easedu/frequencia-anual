import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import EvolutionChart from "@/components/charts/EvolutionChart";
import HeatmapFaltas from "@/components/charts/HeatmapFaltas";
import { Clock, Calendar, TrendingUp, Activity } from "lucide-react";

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

interface HeatmapData {
    turma: string;
    b1: number;
    b2: number;
    b3: number;
    b4: number;
}

interface TemporalAnalysisCardProps {
    data: StudentRecord[];
}

export default function TemporalAnalysisCard({ data }: TemporalAnalysisCardProps) {
    const evolutionData = useMemo(
        () => [
            { bimestre: "1º Bim", absences: data.reduce((acc, s) => acc + s.faltasB1, 0) },
            { bimestre: "2º Bim", absences: data.reduce((acc, s) => acc + s.faltasB2, 0) },
            { bimestre: "3º Bim", absences: data.reduce((acc, s) => acc + s.faltasB3, 0) },
            { bimestre: "4º Bim", absences: data.reduce((acc, s) => acc + s.faltasB4, 0) },
        ],
        [data]
    );

    const heatmapData = useMemo(() => {
        const grouped = data.reduce(
            (acc, s) => {
                if (!acc[s.turma]) {
                    acc[s.turma] = { turma: s.turma, b1: 0, b2: 0, b3: 0, b4: 0 };
                }
                acc[s.turma].b1 += s.faltasB1;
                acc[s.turma].b2 += s.faltasB2;
                acc[s.turma].b3 += s.faltasB3;
                acc[s.turma].b4 += s.faltasB4;
                return acc;
            },
            {} as Record<string, HeatmapData>
        );

        return Object.values(grouped).sort((a, b) => {
            const [numA, letterA] = a.turma.match(/(\d+)([A-Z]+)/)!.slice(1);
            const [numB, letterB] = b.turma.match(/(\d+)([A-Z]+)/)!.slice(1);
            const numCompare = Number(numA) - Number(numB);
            if (numCompare !== 0) return numCompare;
            return letterA.localeCompare(letterB);
        });
    }, [data]);

    // Estatísticas rápidas
    const totalFaltas = useMemo(() => evolutionData.reduce((sum, b) => sum + b.absences, 0), [evolutionData]);
    const piorBimestre = useMemo(() => {
        const max = Math.max(...evolutionData.map(b => b.absences));
        return evolutionData.find(b => b.absences === max)?.bimestre || '';
    }, [evolutionData]);
    const melhorBimestre = useMemo(() => {
        const min = Math.min(...evolutionData.map(b => b.absences));
        return evolutionData.find(b => b.absences === min)?.bimestre || '';
    }, [evolutionData]);

    if (data.length === 0) {
        return (
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-2 border-slate-200/50 dark:border-slate-700/50 shadow-lg" role="region" aria-label="Análise Temporal e por Bimestre">
                <CardHeader className="bg-gradient-to-r from-slate-50 via-orange-50 to-amber-50 dark:from-slate-800 dark:via-orange-900/30 dark:to-amber-900/30 rounded-t-lg pb-4">
                    <CardTitle className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg">
                            <Clock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                Análise Temporal
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
                                Evolução por bimestre e padrões temporais
                            </p>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 rounded-full flex items-center justify-center">
                            <Activity className="w-8 h-8 text-orange-500 dark:text-orange-400" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                            Análise não disponível
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Configure os filtros para visualizar a análise temporal
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-2 border-slate-200/50 dark:border-slate-700/50 shadow-lg" role="region" aria-label="Análise Temporal e por Bimestre">
            <CardHeader className="bg-gradient-to-r from-slate-50 via-orange-50 to-amber-50 dark:from-slate-800 dark:via-orange-900/30 dark:to-amber-900/30 rounded-t-lg pb-4">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg">
                            <Clock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                Análise Temporal
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
                                Evolução por bimestre e padrões temporais
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/40 rounded-full">
                        <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                            {totalFaltas} faltas
                        </span>
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
                {/* Layout Grid Compacto */}
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">

                    {/* Evolução por Bimestre */}
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 border-2 border-slate-200/50 dark:border-slate-700/50">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm">
                                <TrendingUp className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    Evolução das Faltas
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Tendências por bimestre
                                </p>
                            </div>
                        </div>

                        {/* Resumo Rápido */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center border border-blue-200 dark:border-blue-800">
                                <p className="text-xs text-blue-600 dark:text-blue-400">Total</p>
                                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{totalFaltas}</p>
                            </div>
                            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-center border border-red-200 dark:border-red-800">
                                <p className="text-xs text-red-600 dark:text-red-400">Pior</p>
                                <p className="text-sm font-bold text-red-700 dark:text-red-300">{piorBimestre}</p>
                            </div>
                            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-center border border-green-200 dark:border-green-800">
                                <p className="text-xs text-green-600 dark:text-green-400">Melhor</p>
                                <p className="text-sm font-bold text-green-700 dark:text-green-300">{melhorBimestre}</p>
                            </div>
                        </div>

                        <EvolutionChart evolutionData={evolutionData} />
                    </div>

                    {/* Heatmap de Faltas */}
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 border-2 border-slate-200/50 dark:border-slate-700/50">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-sm">
                                <Activity className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    Heatmap de Faltas
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Por turma e bimestre
                                </p>
                            </div>
                        </div>

                        {/* Resumo do Heatmap */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center border border-purple-200 dark:border-purple-800">
                                <p className="text-xs text-purple-600 dark:text-purple-400">Turmas</p>
                                <p className="text-sm font-bold text-purple-700 dark:text-purple-300">{heatmapData.length}</p>
                            </div>
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center border border-amber-200 dark:border-amber-800">
                                <p className="text-xs text-amber-600 dark:text-amber-400">Bimestres</p>
                                <p className="text-sm font-bold text-amber-700 dark:text-amber-300">4</p>
                            </div>
                        </div>

                        <HeatmapFaltas heatmapData={heatmapData} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}