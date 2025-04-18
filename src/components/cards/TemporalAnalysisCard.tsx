import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import EvolutionChart from "@/components/charts/EvolutionChart";
import HeatmapFaltas from "@/components/charts/HeatmapFaltas";

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

    return (
        <Card role="region" aria-label="Análise Temporal e por Bimestre">
            <CardHeader>
                <CardTitle>Análise Temporal e por Bimestre</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {data.length > 0 ? (
                    <div>
                        <h3 className="text-xl font-semibold mb-2">Evolução das Faltas por Bimestre</h3>
                        <EvolutionChart evolutionData={evolutionData} />
                    </div>
                ) : null}
                {data.length > 0 ? (
                    <div>
                        <h3 className="text-xl font-semibold mb-2">Heatmap de Faltas (por Turma e Bimestre)</h3>
                        <HeatmapFaltas heatmapData={heatmapData} />
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}