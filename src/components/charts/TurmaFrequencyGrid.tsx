import { memo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface TurmaStats {
    turma: string;
    avgFaltas: number;
    avgFrequencia: number;
}

interface TurmaFrequencyGridProps {
    turmaStats: TurmaStats[];
}

function TurmaFrequencyGrid({ turmaStats }: TurmaFrequencyGridProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-11 gap-4 p-1" role="grid" aria-label="Frequência por Turma">
            {turmaStats.map((group, idx) => (
                <Card key={idx} className="p-2" role="gridcell">
                    <CardHeader className="p-1">
                        <CardTitle className="text-sm">{group.turma}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-1">
                        <p className="text-lg font-bold">{group.avgFrequencia.toFixed(1)}%</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default memo(TurmaFrequencyGrid);