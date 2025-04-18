import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import TurmaFrequencyGrid from "@/components/charts/TurmaFrequencyGrid";

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

interface KPIsCardProps {
    data: StudentRecord[];
    totalDiasLetivos: number;
}

export default function KPIsCard({ data, totalDiasLetivos }: KPIsCardProps) {
    const totalStudents = useMemo(() => data.length, [data]);
    const alunosConformes = useMemo(() => data.filter(s => s.percentualFaltas < 25).length, [data]);
    const nearLimitCount = useMemo(() => data.filter(s => s.percentualFaltas >= 20 && s.percentualFaltas < 25).length, [data]);
    const alunosRisco = useMemo(() => data.filter(s => s.percentualFaltas >= 25).length, [data]);
    const percentualConforme = useMemo(
        () => (totalStudents ? Number(((alunosConformes / totalStudents) * 100).toFixed(1)) : 0),
        [alunosConformes, totalStudents]
    );
    const mediaFaltasGlobal = useMemo(
        () => (totalDiasLetivos ? Number((data.reduce((sum, s) => sum + s.totalFaltas, 0) / totalDiasLetivos).toFixed(1)) : 0),
        [data, totalDiasLetivos]
    );

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

    return (
        <Card role="region" aria-label="Indicadores-Chave de Frequência">
            <CardHeader>
                <CardTitle>KPIs (Indicadores-Chave)</CardTitle>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="border p-4">
                            <h2 className="text-lg font-semibold">Alunos Conformes</h2>
                            <p className="text-3xl font-bold">
                                {alunosConformes} ({percentualConforme.toFixed(1)}%)
                            </p>
                        </Card>
                        <Card className="border p-4">
                            <h2 className="text-lg font-semibold">Alunos Próximos ao Limite</h2>
                            <p className="text-3xl font-bold">
                                {nearLimitCount} ({totalStudents ? ((nearLimitCount / totalStudents) * 100).toFixed(1) : 0}%)
                            </p>
                        </Card>
                        <Card className="border p-4">
                            <h2 className="text-lg font-semibold">Alunos em Risco</h2>
                            <p className="text-3xl font-bold">
                                {alunosRisco} ({totalStudents ? ((alunosRisco / totalStudents) * 100).toFixed(1) : 0}%)
                            </p>
                        </Card>
                        <Card className="border p-4">
                            <h2 className="text-lg font-semibold">Média de Faltas Diárias</h2>
                            <p className="text-3xl font-bold">{mediaFaltasGlobal}</p>
                        </Card>
                    </div>
                ) : null}
                {data.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4">
                        <Card className="border p-4">
                            <h2 className="text-lg font-semibold">Média de Frequência por Turma</h2>
                            <TurmaFrequencyGrid turmaStats={turmaStats} />
                        </Card>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}