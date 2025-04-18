import { memo } from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";

interface EvolutionData {
    bimestre: string;
    absences: number;
}

interface EvolutionChartProps {
    evolutionData: EvolutionData[];
}

function EvolutionChart({ evolutionData }: EvolutionChartProps) {
    return (
        <ChartContainer config={{}} className="max-h-[250px] w-full">
            <BarChart data={evolutionData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="bimestre" tickLine={false} axisLine={false} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="absences" fill="#2196F3" radius={4} />
            </BarChart>
        </ChartContainer>
    );
}

export default memo(EvolutionChart);