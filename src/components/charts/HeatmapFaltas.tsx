import { useMemo, memo } from "react";

interface HeatmapData {
    turma: string;
    b1: number;
    b2: number;
    b3: number;
    b4: number;
}

interface HeatmapFaltasProps {
    heatmapData: HeatmapData[];
}

const HeatmapFaltas = memo(function HeatmapFaltas({ heatmapData }: HeatmapFaltasProps) {
    const maxHeatmapValue = useMemo(
        () => Math.max(...heatmapData.flatMap(d => [d.b1, d.b2, d.b3, d.b4]), 1),
        [heatmapData]
    );

    const totals = useMemo(
        () =>
            heatmapData.reduce(
                (acc, row) => ({
                    b1: acc.b1 + row.b1,
                    b2: acc.b2 + row.b2,
                    b3: acc.b3 + row.b3,
                    b4: acc.b4 + row.b4,
                }),
                { b1: 0, b2: 0, b3: 0, b4: 0 }
            ),
        [heatmapData]
    );

    // Função para calcular cor do heatmap moderna
    const getHeatmapColor = (value: number, maxValue: number) => {
        const intensity = maxValue > 0 ? value / maxValue : 0;

        if (intensity === 0) return 'rgb(248, 250, 252)'; // slate-50
        if (intensity <= 0.2) return 'rgb(220, 252, 231)'; // green-100
        if (intensity <= 0.4) return 'rgb(254, 240, 138)'; // yellow-200
        if (intensity <= 0.6) return 'rgb(253, 186, 116)'; // orange-300
        if (intensity <= 0.8) return 'rgb(252, 165, 165)'; // red-300
        return 'rgb(239, 68, 68)'; // red-500
    };

    // Função para determinar cor do texto baseada no fundo
    const getTextColor = (value: number, maxValue: number) => {
        const intensity = maxValue > 0 ? value / maxValue : 0;
        return intensity > 0.6 ? 'text-white font-bold' : 'text-slate-800 dark:text-slate-200 font-semibold';
    };

    if (heatmapData.length === 0) {
        return (
            <div className="flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Nenhuma turma encontrada
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Legenda Compacta */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Intensidade:</span>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(220, 252, 231)' }}></div>
                    <span className="text-slate-600 dark:text-slate-400">Baixa</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(254, 240, 138)' }}></div>
                    <span className="text-slate-600 dark:text-slate-400">Média</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(252, 165, 165)' }}></div>
                    <span className="text-slate-600 dark:text-slate-400">Alta</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(239, 68, 68)' }}></div>
                    <span className="text-slate-600 dark:text-slate-400">Crítica</span>
                </div>
                <div className="ml-auto text-slate-500 dark:text-slate-400">
                    Máx: {maxHeatmapValue}
                </div>
            </div>

            {/* Tabela Compacta */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm rounded-lg overflow-hidden shadow-sm" aria-label="Heatmap de Faltas por Turma e Bimestre">
                    <thead>
                        <tr className="bg-slate-100 dark:bg-slate-700">
                            <th className="p-2 text-left font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                Turma
                            </th>
                            <th className="p-2 text-center font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 min-w-[60px]">
                                1º Bim
                            </th>
                            <th className="p-2 text-center font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 min-w-[60px]">
                                2º Bim
                            </th>
                            <th className="p-2 text-center font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 min-w-[60px]">
                                3º Bim
                            </th>
                            <th className="p-2 text-center font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 min-w-[60px]">
                                4º Bim
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {heatmapData.map((row, index) => (
                            <tr key={row.turma} className={index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/50'}>
                                <td className="p-2 font-medium text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                                    {row.turma}
                                </td>
                                {(["b1", "b2", "b3", "b4"] as const).map(key => {
                                    const value = row[key];
                                    return (
                                        <td
                                            key={key}
                                            className={`p-2 text-center border border-slate-200 dark:border-slate-600 transition-all duration-200 hover:shadow-md ${getTextColor(value, maxHeatmapValue)}`}
                                            style={{
                                                backgroundColor: getHeatmapColor(value, maxHeatmapValue),
                                                minWidth: '60px'
                                            }}
                                        >
                                            {value}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-200 dark:bg-slate-700">
                            <td className="p-2 font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                                Total
                            </td>
                            {(["b1", "b2", "b3", "b4"] as const).map(key => {
                                const value = totals[key];
                                return (
                                    <td
                                        key={key}
                                        className={`p-2 text-center border border-slate-200 dark:border-slate-600 font-bold ${getTextColor(value, maxHeatmapValue)}`}
                                        style={{ backgroundColor: getHeatmapColor(value, maxHeatmapValue) }}
                                    >
                                        {value}
                                    </td>
                                );
                            })}
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Resumo Estatístico */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
                    <p className="text-slate-500 dark:text-slate-400">Total Geral</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                        {totals.b1 + totals.b2 + totals.b3 + totals.b4}
                    </p>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                    <p className="text-blue-600 dark:text-blue-400">Média/Turma</p>
                    <p className="font-bold text-blue-700 dark:text-blue-300">
                        {heatmapData.length > 0
                            ? ((totals.b1 + totals.b2 + totals.b3 + totals.b4) / heatmapData.length).toFixed(1)
                            : 0
                        }
                    </p>
                </div>
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                    <p className="text-amber-600 dark:text-amber-400">Pior Bim.</p>
                    <p className="font-bold text-amber-700 dark:text-amber-300">
                        {Math.max(totals.b1, totals.b2, totals.b3, totals.b4) === totals.b1 ? '1º' :
                            Math.max(totals.b1, totals.b2, totals.b3, totals.b4) === totals.b2 ? '2º' :
                                Math.max(totals.b1, totals.b2, totals.b3, totals.b4) === totals.b3 ? '3º' : '4º'}
                    </p>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <p className="text-green-600 dark:text-green-400">Melhor Bim.</p>
                    <p className="font-bold text-green-700 dark:text-green-300">
                        {Math.min(totals.b1, totals.b2, totals.b3, totals.b4) === totals.b1 ? '1º' :
                            Math.min(totals.b1, totals.b2, totals.b3, totals.b4) === totals.b2 ? '2º' :
                                Math.min(totals.b1, totals.b2, totals.b3, totals.b4) === totals.b3 ? '3º' : '4º'}
                    </p>
                </div>
            </div>
        </div>
    );
});

export default HeatmapFaltas;