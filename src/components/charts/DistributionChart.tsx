import { memo } from "react";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface DistributionData {
    name: string;
    value: number;
}

interface DistributionChartProps {
    distributionData: DistributionData[];
}

function DistributionChart({ distributionData }: DistributionChartProps) {
    const distributionColors = [
        "#10B981", // Verde moderno para frequência adequada
        "#EF4444"  // Vermelho moderno para frequência baixa
    ];

    const total = distributionData.reduce((sum, item) => sum + (item.value || 0), 0);

    return (
        <div className="relative w-full h-40">
            <ChartContainer config={{}} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={distributionData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={65}
                            strokeWidth={3}
                            stroke="white"
                        >
                            {distributionData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={distributionColors[index % distributionColors.length]}
                                    className="hover:opacity-80 transition-opacity duration-200"
                                />
                            ))}
                        </Pie>
                        <ChartTooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0];
                                    const value = typeof data.value === 'number' ? data.value : 0;
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                                    return (
                                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
                                            <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">
                                                {data.name || 'N/A'}
                                            </p>
                                            <div className="space-y-1">
                                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                                    <span className="font-semibold">{value}</span> estudantes
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-500">
                                                    {percentage}% do total
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </ChartContainer>

            {/* Centro do donut com informação total */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                        {total}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Total
                    </p>
                </div>
            </div>

            {/* Legenda compacta */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-4 text-xs">
                {distributionData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: distributionColors[index] }}
                        />
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                            {entry.name}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default memo(DistributionChart);