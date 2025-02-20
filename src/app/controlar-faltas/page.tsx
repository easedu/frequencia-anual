"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Componentes de Chart do shadcn/ui (baseados em Recharts)
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
} from "@/components/ui/chart";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";

// Importações para a DataTable
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "@/firebase.config";
import { AlertDataTable } from "@/components/CustomAlertDataTable";
import { FullDataTable } from "@/components/CustomFullDataTable";

// --- Tipos e Interfaces ---
interface StudentRecord {
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

interface AbsenceRecord {
    estudanteId: string;
    turma: string;
    data: string;
}

interface Student {
    estudanteId: string;
    nome: string;
    turma: string;
    status: string;
}

interface AnoLetivoData {
    [key: string]: {
        dates: { isChecked: boolean }[];
    };
}

// --- Helper para identificar bimestre ---
// Removemos o "export" para evitar conflito com os exports da página.
function getBimester(dateStr: string): number {
    const date = new Date(dateStr);
    const month = date.getMonth(); // 0 = Jan, 11 = Dez
    if (month < 3) return 1; // Jan, Feb, Mar
    if (month < 6) return 2; // Abr, Mai, Jun
    if (month < 9) return 3; // Jul, Ago, Set
    return 4;             // Out, Nov, Dez
}

// --- Custom Hooks para buscar dados do Firebase ---
function useAnoLetivo(): number {
    const [totalDiasLetivos, setTotalDiasLetivos] = useState<number>(0);

    useEffect(() => {
        const fetchAnoLetivo = async () => {
            try {
                const docRef = doc(db, "2025", "ano_letivo");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const anoData = docSnap.data() as AnoLetivoData;
                    let total = 0;
                    // Supondo que o documento contenha chaves para cada bimestre com array "dates"
                    for (const key in anoData) {
                        if (anoData[key]?.dates) {
                            total += anoData[key].dates.filter(d => d.isChecked).length;
                        }
                    }
                    setTotalDiasLetivos(total);
                }
            } catch (error) {
                console.error("Erro ao carregar dados do ano letivo:", error);
            }
        };
        fetchAnoLetivo();
    }, []);

    return totalDiasLetivos;
}

function useAbsenceAndStudents(totalDiasLetivos: number): StudentRecord[] {
    const [data, setData] = useState<StudentRecord[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Busca registros de faltas
                const absenceSnapshot = await getDocs(collection(db, "2025", "faltas", "controle"));
                const absenceRecords: AbsenceRecord[] = absenceSnapshot.docs.map(doc =>
                    doc.data() as AbsenceRecord
                );

                // 2. Busca lista de estudantes ATIVOS
                const studentsDocSnap = await getDoc(doc(db, "2025", "lista_de_estudantes"));
                let studentList: Student[] = [];
                if (studentsDocSnap.exists()) {
                    const studentData = studentsDocSnap.data() as { estudantes: Student[] };
                    studentList = (studentData.estudantes || []).filter(
                        (student: Student) => student.status === "ATIVO"
                    );
                }

                // Mapeia estudanteId para { nome, turma }
                const studentMap: Record<string, { nome: string; turma: string }> = {};
                studentList.forEach(student => {
                    studentMap[student.estudanteId] = {
                        nome: student.nome,
                        turma: student.turma,
                    };
                });

                // Agrega as faltas por estudante
                const aggregated: Record<string, StudentRecord> = {};
                absenceRecords.forEach(record => {
                    const studentId = record.estudanteId;
                    if (!aggregated[studentId]) {
                        aggregated[studentId] = {
                            turma: record.turma,
                            nome: studentMap[studentId]?.nome || studentId,
                            faltasB1: 0,
                            faltasB2: 0,
                            faltasB3: 0,
                            faltasB4: 0,
                            totalFaltas: 0,
                            percentualFaltas: 0,
                            percentualFrequencia: 100,
                        };
                    }
                    const bimester = getBimester(record.data);
                    if (bimester === 1) aggregated[studentId].faltasB1++;
                    else if (bimester === 2) aggregated[studentId].faltasB2++;
                    else if (bimester === 3) aggregated[studentId].faltasB3++;
                    else if (bimester === 4) aggregated[studentId].faltasB4++;
                });

                // Garante que todos os estudantes ativos estejam presentes
                studentList.forEach(student => {
                    if (!aggregated[student.estudanteId]) {
                        aggregated[student.estudanteId] = {
                            turma: student.turma,
                            nome: student.nome,
                            faltasB1: 0,
                            faltasB2: 0,
                            faltasB3: 0,
                            faltasB4: 0,
                            totalFaltas: 0,
                            percentualFaltas: 0,
                            percentualFrequencia: 100,
                        };
                    }
                });

                // Calcula totais e percentuais
                const total = totalDiasLetivos || 40;
                Object.values(aggregated).forEach(student => {
                    student.totalFaltas =
                        student.faltasB1 + student.faltasB2 + student.faltasB3 + student.faltasB4;
                    student.percentualFaltas = Number(Math.min((student.totalFaltas / total) * 100, 100).toFixed(1));
                    student.percentualFrequencia = Number((100 - student.percentualFaltas).toFixed(1));
                });

                setData(Object.values(aggregated));
            } catch (error) {
                console.error("Erro ao buscar registros de faltas:", error);
            }
        };

        fetchData();
    }, [totalDiasLetivos]);

    return data;
}

// --- Página Dashboard ---
export default function DashboardPage() {
    const totalDiasLetivos = useAnoLetivo();
    const data = useAbsenceAndStudents(totalDiasLetivos);

    // Cálculos memorizados com useMemo
    const totalStudents = useMemo(() => data.length, [data]);
    const alunosConformes = useMemo(() => data.filter(s => s.percentualFaltas < 25).length, [data]);
    const alunosRisco = useMemo(() => data.filter(s => s.percentualFaltas >= 25).length, [data]);
    const percentualConforme = useMemo(
        () => totalStudents ? Number(((alunosConformes / totalStudents) * 100).toFixed(1)) : 0,
        [alunosConformes, totalStudents]
    );
    const mediaFaltasGlobal = useMemo(
        () => totalStudents ? Number((data.reduce((sum, s) => sum + s.totalFaltas, 0) / totalStudents).toFixed(1)) : 0,
        [data, totalStudents]
    );

    const turmaStats = useMemo(() => {
        const stats = data.reduce((acc, s) => {
            if (!acc[s.turma]) {
                acc[s.turma] = { turma: s.turma, totalFaltas: 0, totalFrequencia: 0, count: 0 };
            }
            acc[s.turma].totalFaltas += s.totalFaltas;
            acc[s.turma].totalFrequencia += s.percentualFrequencia;
            acc[s.turma].count++;
            return acc;
        }, {} as Record<string, { turma: string; totalFaltas: number; totalFrequencia: number; count: number }>);
        return Object.values(stats).map(group => ({
            turma: group.turma,
            avgFaltas: Number((group.totalFaltas / group.count).toFixed(1)),
            avgFrequencia: Number((group.totalFrequencia / group.count).toFixed(1)),
        }));
    }, [data]);

    const comparativeData = useMemo(
        () =>
            turmaStats.map(item => ({
                turma: item.turma,
                avgFaltas: item.avgFaltas,
                avgFrequencia: item.avgFrequencia,
            })),
        [turmaStats]
    );

    const evolutionData = useMemo(
        () => [
            { bimestre: "1º Bim", absences: data.reduce((acc, s) => acc + s.faltasB1, 0) },
            { bimestre: "2º Bim", absences: data.reduce((acc, s) => acc + s.faltasB2, 0) },
            { bimestre: "3º Bim", absences: data.reduce((acc, s) => acc + s.faltasB3, 0) },
            { bimestre: "4º Bim", absences: data.reduce((acc, s) => acc + s.faltasB4, 0) },
        ],
        [data]
    );

    const distributionData = useMemo(
        () => [
            { name: "Conformes", value: alunosConformes },
            { name: "Em Risco", value: alunosRisco },
        ],
        [alunosConformes, alunosRisco]
    );

    const heatmapData = useMemo(() => {
        const grouped = data.reduce((acc, s) => {
            if (!acc[s.turma]) {
                acc[s.turma] = { turma: s.turma, b1: 0, b2: 0, b3: 0, b4: 0 };
            }
            acc[s.turma].b1 += s.faltasB1;
            acc[s.turma].b2 += s.faltasB2;
            acc[s.turma].b3 += s.faltasB3;
            acc[s.turma].b4 += s.faltasB4;
            return acc;
        }, {} as Record<string, HeatmapData>);
        return Object.values(grouped);
    }, [data]);

    const maxHeatmapValue = useMemo(
        () => Math.max(...heatmapData.flatMap(d => [d.b1, d.b2, d.b3, d.b4])),
        [heatmapData]
    );
    const nearLimitCount = useMemo(
        () => data.filter(s => s.percentualFaltas >= 20 && s.percentualFaltas < 25).length,
        [data]
    );

    // Função auxiliar para colorir o heatmap
    const getHeatmapColor = (value: number, max: number): string => {
        const intensity = Math.round((value / max) * 255);
        const computed = 200 - intensity;
        return `rgb(255, ${computed < 0 ? 0 : computed}, ${computed < 0 ? 0 : computed})`;
    };

    // --- Subcomponentes ---
    const TurmaFrequencyGrid = () => (
        <div className="grid grid-cols-2 md:grid-cols-11 gap-4 p-1">
            {turmaStats.map((group, idx) => (
                <Card key={idx} className="p-2">
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

    const DistributionChart = () => {
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
    };

    const TurmaComparisonChart = () => (
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

    const EvolutionChart = () => (
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

    const HeatmapFaltas = () => (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr>
                        <th className="border p-2 text-left">Turma</th>
                        <th className="border p-2">1º Bim</th>
                        <th className="border p-2">2º Bim</th>
                        <th className="border p-2">3º Bim</th>
                        <th className="border p-2">4º Bim</th>
                    </tr>
                </thead>
                <tbody>
                    {heatmapData.map((row) => (
                        <tr key={row.turma}>
                            <td className="border p-2">{row.turma}</td>
                            {["b1", "b2", "b3", "b4"].map((key) => {
                                const value = row[key as keyof HeatmapData] as number;
                                return (
                                    <td
                                        key={key}
                                        className="border p-2 text-center"
                                        style={{ backgroundColor: getHeatmapColor(value, maxHeatmapValue) }}
                                    >
                                        {value}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="p-4 space-y-8">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Dashboard de Frequência</h1>
                <div className="text-lg font-bold">Dias Letivos: {totalDiasLetivos}</div>
            </div>

            {/* Seção 1: KPIs */}
            <Card>
                <CardHeader>
                    <CardTitle>KPIs (Indicadores-Chave)</CardTitle>
                </CardHeader>
                <CardContent>
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
                            <h2 className="text-lg font-semibold">Média de Faltas por Estudante</h2>
                            <p className="text-3xl font-bold">{mediaFaltasGlobal.toFixed(1)}</p>
                        </Card>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4">
                        <Card className="border p-4">
                            <h2 className="text-lg font-semibold">Média de Frequência por Turma</h2>
                            <TurmaFrequencyGrid />
                        </Card>
                    </div>
                </CardContent>
            </Card>

            {/* Seção 2: Gráficos Comparativos */}
            <Card>
                <CardHeader>
                    <CardTitle>Gráficos Comparativos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="text-xl font-semibold mb-2">Comparação por Turma</h3>
                        <TurmaComparisonChart />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold mb-2">Distribuição de Alunos (Conformes vs. Risco)</h3>
                        <DistributionChart />
                    </div>
                </CardContent>
            </Card>

            {/* Seção 3: Análise Temporal e por Bimestre */}
            <Card>
                <CardHeader>
                    <CardTitle>Análise Temporal e por Bimestre</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="text-xl font-semibold mb-2">Evolução das Faltas por Bimestre</h3>
                        <EvolutionChart />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold mb-2">Heatmap de Faltas (por Turma e Bimestre)</h3>
                        <HeatmapFaltas />
                    </div>
                </CardContent>
            </Card>

            {/* Seção 4: Alertas e Listagens de Risco */}
            <Card>
                <CardHeader>
                    <CardTitle>Alertas e Listagens de Risco</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Alunos Próximos ao Limite (20% a 25% de Faltas)</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <AlertDataTable
                                    data={data
                                        .filter(s => s.percentualFaltas >= 20 && s.percentualFaltas < 25)
                                        .sort((a, b) => b.percentualFaltas - a.percentualFaltas)}
                                />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Alunos Críticos (≥ 25% de Faltas)</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <AlertDataTable
                                    data={data
                                        .filter(s => s.percentualFaltas >= 25)
                                        .sort((a, b) => b.percentualFaltas - a.percentualFaltas)}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            {/* Seção 5: Tabela Completa de Dados */}
            <Card>
                <CardHeader>
                    <CardTitle>Tabela de Frequência dos Estudantes</CardTitle>
                </CardHeader>
                <CardContent>
                    {data.length === 0 ? (
                        <Skeleton className="h-10 w-full" />
                    ) : (
                        <FullDataTable data={data} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}