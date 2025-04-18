import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, CartesianGrid, XAxis, Cell } from "recharts";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase.config";
import { parseDate, getBimesterByDate, formatFirebaseDate } from "@/utils/attendanceUtils";

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

interface AbsenceRecord {
    estudanteId: string;
    turma: string;
    data: string;
    docId: string;
    justified: boolean;
}

interface DayOfWeekData {
    day: string;
    absences: number;
}

interface BimesterDates {
    [key: number]: { start: string; end: string };
}

interface DayOfWeekDistributionCardProps {
    data: StudentRecord[];
    startDate: string;
    endDate: string;
    selectedBimesters: Set<number>;
    bimesterDates: BimesterDates;
    excludeJustified: boolean;
}

export default function DayOfWeekDistributionCard({
    data,
    startDate,
    endDate,
    selectedBimesters,
    bimesterDates,
    excludeJustified,
}: DayOfWeekDistributionCardProps) {
    const uniqueTurmas = useMemo(
        () =>
            Array.from(new Set(data.map((item) => item.turma))).sort((a, b) => {
                const [numA, letterA] = a.match(/(\d+)([A-Z]+)/)!.slice(1);
                const [numB, letterB] = b.match(/(\d+)([A-Z]+)/)!.slice(1);
                const numCompare = Number(numA) - Number(numB);
                if (numCompare !== 0) return numCompare;
                return letterA.localeCompare(letterB);
            }),
        [data]
    );

    const [dayStats, setDayStats] = useState<{ overall: DayOfWeekData[]; byTurma: Record<string, DayOfWeekData[]> }>({
        overall: [],
        byTurma: {},
    });
    const [selectedTurmaDay, setSelectedTurmaDay] = useState<string | null>(null);

    const dayOfWeekStats = useMemo(() => {
        const fetchDayOfWeekData = async () => {
            try {
                const absenceSnapshot = await getDocs(collection(db, "2025", "faltas", "controle"));
                const absenceRecords: AbsenceRecord[] = absenceSnapshot.docs.map((doc) => ({
                    estudanteId: doc.data().estudanteId,
                    turma: doc.data().turma,
                    data: formatFirebaseDate(doc.data().data),
                    docId: doc.id,
                    justified: doc.data().justified ?? false,
                }));

                const startDateObj = parseDate(startDate);
                const endDateObj = parseDate(endDate);

                if (!startDateObj || !endDateObj) {
                    return { overall: [], byTurma: {} };
                }

                const filteredRecords = absenceRecords.filter((record) => {
                    const date = parseDate(record.data);
                    const bimester = getBimesterByDate(record.data, bimesterDates);
                    const isValidDate = date && !isNaN(date.getTime()) && date >= startDateObj && date <= endDateObj;
                    const isValidBimester = selectedBimesters.size === 0 || (bimester > 0 && selectedBimesters.has(bimester));
                    const isValidJustification = !excludeJustified || !record.justified;

                    return isValidDate && isValidBimester && isValidJustification;
                });

                const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                const overall: DayOfWeekData[] = daysOfWeek.map((day) => ({ day, absences: 0 }));
                const byTurma: Record<string, DayOfWeekData[]> = {};

                uniqueTurmas.forEach((turma) => {
                    byTurma[turma] = daysOfWeek.map((day) => ({ day, absences: 0 }));
                });

                filteredRecords.forEach((record) => {
                    const date = parseDate(record.data);
                    if (date && !isNaN(date.getTime())) {
                        const dayIndex = date.getDay();
                        overall[dayIndex].absences++;
                        if (byTurma[record.turma]) {
                            byTurma[record.turma][dayIndex].absences++;
                        }
                    }
                });

                return { overall, byTurma };
            } catch (error) {
                console.error("Erro ao calcular faltas por dia da semana:", error);
                return { overall: [], byTurma: {} };
            }
        };
        return fetchDayOfWeekData();
    }, [startDate, endDate, selectedBimesters, uniqueTurmas, bimesterDates, excludeJustified]);

    useEffect(() => {
        dayOfWeekStats.then((stats) => {
            setDayStats(stats);
        });
    }, [dayOfWeekStats]);

    const handleTurmaClick = (turma: string) => {
        setSelectedTurmaDay((prev) => (prev === turma ? null : turma));
    };

    const chartData = useMemo(() => {
        const dataToUse = selectedTurmaDay ? dayStats.byTurma[selectedTurmaDay] || [] : dayStats.overall;
        const uniqueAbsences = Array.from(new Set(dataToUse.map((item) => item.absences))).sort((a, b) => b - a);
        const blueShades = ["#1E3A8A", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#D1E9FF", "#E0F2FE"];
        const absenceToColorMap: Record<number, string> = {};
        uniqueAbsences.forEach((absences, index) => {
            absenceToColorMap[absences] = blueShades[index] || blueShades[blueShades.length - 1];
        });
        const maxAbsences = Math.max(...dataToUse.map((d) => d.absences), 0);
        return dataToUse.map((item) => ({
            day: item.day,
            absences: item.absences,
            fill: absenceToColorMap[item.absences] || "#1E3A8A",
            isMax: item.absences === maxAbsences,
        }));
    }, [dayStats, selectedTurmaDay]);

    const dayChartConfig = {
        absences: { label: "Faltas", color: "#000000" },
        dom: { label: "Dom", color: "#1E3A8A" },
        seg: { label: "Seg", color: "#3B82F6" },
        ter: { label: "Ter", color: "#60A5FA" },
        qua: { label: "Qua", color: "#93C5FD" },
        qui: { label: "Qui", color: "#BFDBFE" },
        sex: { label: "Sex", color: "#3B82F6" },
        sab: { label: "Sáb", color: "#1E3A8A" },
    };

    const DayOfWeekGrid = () => {
        const turmas = Object.entries(dayStats.byTurma);
        return (
            <div className="grid grid-cols-2 md:grid-cols-11 gap-4 p-1" role="grid" aria-label="Dia com Mais Faltas por Turma">
                {turmas.length > 0 ? (
                    turmas.map(([turma, days]) => {
                        const maxAbsences = Math.max(...days.map((d) => d.absences));
                        const maxDay = days.find((d) => d.absences === maxAbsences)?.day || "N/A";
                        return (
                            <Card
                                key={turma}
                                className={`p-2 cursor-pointer ${selectedTurmaDay === turma ? "border-2 border-blue-500 bg-blue-50" : ""}`}
                                onClick={() => handleTurmaClick(turma)}
                                role="gridcell"
                                aria-label={`Turma ${turma}`}
                            >
                                <CardHeader className="p-1">
                                    <CardTitle className="text-sm">{turma}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-1">
                                    <p className="text-lg font-bold">
                                        {maxAbsences} ({maxDay})
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })
                ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma turma disponível.</p>
                )}
            </div>
        );
    };

    return (
        <Card role="region" aria-label="Distribuição de Faltas por Dia da Semana">
            <CardHeader>
                <CardTitle>Distribuição de Faltas por Dia da Semana</CardTitle>
                <CardDescription>{selectedTurmaDay ? `Turma ${selectedTurmaDay}` : "Visão Geral da Escola"} - 2025</CardDescription>
            </CardHeader>
            <CardContent>
                {dayStats.overall.length > 0 && chartData.length > 0 ? (
                    <>
                        <ChartContainer config={dayChartConfig} className="max-h-[250px] w-full">
                            <BarChart accessibilityLayer data={chartData}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="day"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    tickFormatter={(value) => value}
                                />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                <Bar dataKey="absences" strokeWidth={2} radius={8}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.fill}
                                            stroke={entry.isMax ? entry.fill : undefined}
                                            strokeDasharray={entry.isMax ? "4" : undefined}
                                            strokeDashoffset={entry.isMax ? "4" : undefined}
                                            fillOpacity={entry.isMax ? 0.8 : 1}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                        <div className="mt-4">
                            <h3 className="text-xl font-semibold mb-2">Dia com Mais Faltas por Turma</h3>
                            <DayOfWeekGrid />
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Nenhum dado disponível. Verifique os filtros, as datas, os períodos dos bimestres ou a conexão com o banco de dados.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}