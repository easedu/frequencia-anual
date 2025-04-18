import { memo } from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";

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
        <ChartContainer config={{}} className="max-h-[250px] w-full">
            <BarChart data={comparativeData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="turma" tickLine={false} axisLine={false} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="avgFaltas" fill="#F44336" radius={4} name="Média de Faltas" />
                <Bar dataKey="avgFrequencia" fill="#4CAF50" radius={4} name="Média de Frequência" />
                <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
        </ChartContainer>
    );
}

export default memo(TurmaComparisonChart);