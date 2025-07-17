import { memo } from "react";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

interface EvolutionData {
    bimestre: string;
    absences: number;
}

interface EvolutionChartProps {
    evolutionData: EvolutionData[];
}

function EvolutionChart({ evolutionData }: EvolutionChartProps) {
    // Calcular cor baseada na intensidade
    const maxValue = Math.max(...evolutionData.map(d => d.absences));

    const getBarColor = (value: number) => {
        const intensity = maxValue > 0 ? value / maxValue : 0;
        if (intensity > 0.8) return "#DC2626"; // Red-600
        if (intensity > 0.6) return "#EA580C"; // Orange-600
        if (intensity > 0.4) return "#D97706"; // Amber-600
        if (intensity > 0.2) return "#2563EB"; // Blue-600
        return "#059669"; // Emerald-600
    };

    return (
        <ChartContainer config={{}} className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={evolutionData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    barCategoryGap="25%"
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#E2E8F0"
                        className="dark:stroke-slate-600"
                    />
                    <XAxis
                        dataKey="bimestre"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        className="text-slate-600 dark:text-slate-400"
                    />
                    <YAxis
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        className="text-slate-600 dark:text-slate-400"
                        width={30}
                    />
                    <ChartTooltip
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                const value = payload[0].value as number;
                                return (
                                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border">
                                        <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">
                                            {label}
                                        </p>
                                        <p className="text-sm text-blue-600 dark:text-blue-400">
                                            {value} faltas totais
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {maxValue > 0 ? ((value / maxValue) * 100).toFixed(1) : 0}% do pico
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
                        maxBarSize={50}
                    >
                        {evolutionData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={getBarColor(entry.absences)}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
}

export default memo(EvolutionChart);