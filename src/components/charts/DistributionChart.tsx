import { memo } from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";

interface DistributionData {
    name: string;
    value: number;
}

interface DistributionChartProps {
    distributionData: DistributionData[];
}

function DistributionChart({ distributionData }: DistributionChartProps) {
    const distributionColors = ["#4CAF50", "#F44336"];

    return (
        <ChartContainer config={{}} className="max-h-[200px] w-full">
            <PieChart width={250} height={250}>
                <Pie
                    data={distributionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    label
                >
                    {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={distributionColors[index % distributionColors.length]} />
                    ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
        </ChartContainer>
    );
}

export default memo(DistributionChart);