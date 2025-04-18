import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DistributionChart from "@/components/charts/DistributionChart";
import TurmaComparisonChart from "@/components/charts/TurmaComparisonChart";

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

interface ComparativeChartsCardProps {
    data: StudentRecord[];
}

export default function ComparativeChartsCard({ data }: ComparativeChartsCardProps) {
    const alunosConformes = useMemo(() => data.filter(s => s.percentualFaltas < 25).length, [data]);
    const alunosRisco = useMemo(() => data.filter(s => s.percentualFaltas >= 25).length, [data]);

    const turmaStats = useMemo(() => {
        const stats = data.reduce(
            (acc, s) => {
                if (!acc[s.turma]) {
                    acc[s.turma] = { turma: s.turma, totalFaltas: 0, totalFrequencia: 0, count: 0 };
                }
                acc[s.turma].totalFaltas += s.totalFaltas;
                acc[s.turma].totalFrequencia += s.percentualFrequencia;
                acc[s.turma].count++;
                return acc;
            },
            {} as Record<string, { turma: string; totalFaltas: number; totalFrequencia: number; count: number }>
        );

        const result = Object.values(stats).map(group => ({
            turma: group.turma,
            avgFaltas: Number((group.totalFaltas / group.count).toFixed(1)),
            avgFrequencia: Number((group.totalFrequencia / group.count).toFixed(1)),
        }));

        return result.sort((a, b) => {
            const [numA, letterA] = a.turma.match(/(\d+)([A-Z]+)/)!.slice(1);
            const [numB, letterB] = b.turma.match(/(\d+)([A-Z]+)/)!.slice(1);
            const numCompare = Number(numA) - Number(numB);
            if (numCompare !== 0) return numCompare;
            return letterA.localeCompare(letterB);
        });
    }, [data]);

    const comparativeData = useMemo(
        () => turmaStats.map(item => ({
            turma: item.turma,
            avgFaltas: item.avgFaltas,
            avgFrequencia: item.avgFrequencia,
        })),
        [turmaStats]
    );

    const distributionData = useMemo(
        () => [
            { name: "Conformes", value: alunosConformes },
            { name: "Em Risco", value: alunosRisco },
        ],
        [alunosConformes, alunosRisco]
    );

    return (
        <Card role="region" aria-label="Gráficos Comparativos">
            <CardHeader>
                <CardTitle>Gráficos Comparativos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {data.length > 0 ? (
                    <div>
                        <h3 className="text-xl font-semibold mb-2">Comparação por Turma</h3>
                        <TurmaComparisonChart comparativeData={comparativeData} />
                    </div>
                ) : null}
                {data.length > 0 ? (
                    <div>
                        <h3 className="text-xl font-semibold mb-2">Distribuição de Alunos (Conformes vs. Risco)</h3>
                        <DistributionChart distributionData={distributionData} />
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}