import { memo } from "react";
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";

interface ComparativeData {
    turma: string;
    avgFaltas: number;
    avgFrequencia: number;
}

interface TurmaComparisonChartProps {
    comparativeData: ComparativeData[];
}

function TurmaComparisonChart({ comparativeData }: TurmaComparisonChartProps) {
    return (
        <ChartContainer config={{}} className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={comparativeData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    barCategoryGap="20%"
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#E2E8F0"
                        className="dark:stroke-slate-600"
                    />
                    <XAxis
                        dataKey="turma"
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
                    />
                    <ChartTooltip
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border">
                                        <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">
                                            Turma {label}
                                        </p>
                                        {payload.map((entry, index) => (
                                            <p key={index} className="text-sm" style={{ color: entry.color }}>
                                                {entry.name}: {entry.value}
                                                {entry.name === "Média de Frequência" ? "%" : " faltas"}
                                            </p>
                                        ))}
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Bar
                        dataKey="avgFaltas"
                        fill="#EF4444"
                        radius={[2, 2, 0, 0]}
                        name="Média de Faltas"
                        maxBarSize={30}
                    />
                    <Bar
                        dataKey="avgFrequencia"
                        fill="#10B981"
                        radius={[2, 2, 0, 0]}
                        name="Média de Frequência"
                        maxBarSize={30}
                    />
                    <ChartLegend
                        content={({ payload }) => (
                            <div className="flex justify-center gap-4 mt-2">
                                {payload?.map((entry, index) => (
                                    <div key={index} className="flex items-center gap-1">
                                        <div
                                            className="w-3 h-3 rounded"
                                            style={{ backgroundColor: entry.color }}
                                        />
                                        <span className="text-xs text-slate-600 dark:text-slate-400">
                                            {entry.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    />
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
}

export default memo(TurmaComparisonChart);