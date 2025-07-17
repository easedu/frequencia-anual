import { memo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TurmaStats {
    turma: string;
    avgFaltas: number;
    avgFrequencia: number;
}

interface TurmaFrequencyGridProps {
    turmaStats: TurmaStats[];
}

function TurmaFrequencyGrid({ turmaStats }: TurmaFrequencyGridProps) {
    // Calcular a média geral para comparação
    const mediaGeral = turmaStats.length > 0
        ? turmaStats.reduce((sum, stat) => sum + stat.avgFrequencia, 0) / turmaStats.length
        : 0;

    const getFrequencyColor = (frequency: number) => {
        if (frequency >= 90) {
            return {
                bg: "bg-emerald-50 dark:bg-emerald-900/20",
                border: "border-emerald-200 dark:border-emerald-700",
                text: "text-emerald-700 dark:text-emerald-300",
                dot: "bg-emerald-500"
            };
        } else if (frequency >= 80) {
            return {
                bg: "bg-blue-50 dark:bg-blue-900/20",
                border: "border-blue-200 dark:border-blue-700",
                text: "text-blue-700 dark:text-blue-300",
                dot: "bg-blue-500"
            };
        } else if (frequency >= 75) {
            return {
                bg: "bg-amber-50 dark:bg-amber-900/20",
                border: "border-amber-200 dark:border-amber-700",
                text: "text-amber-700 dark:text-amber-300",
                dot: "bg-amber-500"
            };
        } else {
            return {
                bg: "bg-red-50 dark:bg-red-900/20",
                border: "border-red-200 dark:border-red-700",
                text: "text-red-700 dark:text-red-300",
                dot: "bg-red-500"
            };
        }
    };

    const getTrendIcon = (frequency: number) => {
        if (frequency > mediaGeral + 2) {
            return { icon: TrendingUp, color: "text-green-500" };
        } else if (frequency < mediaGeral - 2) {
            return { icon: TrendingDown, color: "text-red-500" };
        } else {
            return { icon: Minus, color: "text-gray-500" };
        }
    };

    if (turmaStats.length === 0) {
        return (
            <div className="flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Nenhuma turma encontrada
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Legenda Compacta */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-slate-600 dark:text-slate-400">≥90%</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-slate-600 dark:text-slate-400">80-89%</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className="text-slate-600 dark:text-slate-400">75-79%</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-slate-600 dark:text-slate-400">&lt;75%</span>
                </div>
                <div className="ml-auto flex items-center gap-1">
                    <span className="text-slate-500 dark:text-slate-400">Média:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {mediaGeral.toFixed(1)}%
                    </span>
                </div>
            </div>

            {/* Grid de Turmas Compacto */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-11 gap-2" role="grid" aria-label="Frequência por Turma">
                {turmaStats.map((group, idx) => {
                    const colors = getFrequencyColor(group.avgFrequencia);
                    const trend = getTrendIcon(group.avgFrequencia);

                    return (
                        <div
                            key={idx}
                            className={`relative p-3 ${colors.bg} rounded-xl border-2 ${colors.border} hover:shadow-md transition-all duration-200 group cursor-default`}
                            role="gridcell"
                        >
                            {/* Indicador de tendência */}
                            <div className="absolute top-1 right-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <trend.icon className={`w-3 h-3 ${trend.color}`} />
                            </div>

                            {/* Dot indicator */}
                            <div className={`w-2 h-2 rounded-full ${colors.dot} mb-2`}></div>

                            {/* Conteúdo */}
                            <div className="space-y-1">
                                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-none">
                                    {group.turma}
                                </h3>
                                <div className={`${colors.text}`}>
                                    <p className="text-lg font-bold leading-none">
                                        {group.avgFrequencia.toFixed(1)}%
                                    </p>
                                    <p className="text-xs opacity-75">
                                        {group.avgFaltas.toFixed(1)} faltas
                                    </p>
                                </div>
                            </div>

                            {/* Barra de progresso visual */}
                            <div className="mt-2 h-1 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${colors.dot} transition-all duration-500`}
                                    style={{ width: `${Math.min(group.avgFrequencia, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Estatísticas Resumidas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Turmas</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{turmaStats.length}</p>
                </div>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Excelentes</p>
                    <p className="font-bold text-emerald-700 dark:text-emerald-300">
                        {turmaStats.filter(t => t.avgFrequencia >= 90).length}
                    </p>
                </div>
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                    <p className="text-xs text-amber-600 dark:text-amber-400">Atenção</p>
                    <p className="font-bold text-amber-700 dark:text-amber-300">
                        {turmaStats.filter(t => t.avgFrequencia >= 75 && t.avgFrequencia < 80).length}
                    </p>
                </div>
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                    <p className="text-xs text-red-600 dark:text-red-400">Críticas</p>
                    <p className="font-bold text-red-700 dark:text-red-300">
                        {turmaStats.filter(t => t.avgFrequencia < 75).length}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default memo(TurmaFrequencyGrid);