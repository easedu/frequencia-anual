"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// Componentes de Chart do shadcn/ui (baseados em Recharts)
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
} from "@/components/ui/chart";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";

// Importações para a DataTable e manipulação do Firebase
import { collection, getDocs, getDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase.config";
import { AlertDataTable } from "@/components/CustomAlertDataTable";
import { FullDataTable } from "@/components/CustomFullDataTable";

// --- Tipos e Interfaces ---
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

interface AbsenceRecord {
    estudanteId: string;
    turma: string;
    data: string;
    docId: string;
}

interface Student {
    estudanteId: string;
    nome: string;
    turma: string;
    status: string;
}

interface BimesterData {
    dates: { date: string; isChecked: boolean }[];
    startDate: string;
    endDate: string;
}

interface AnoLetivoData {
    [key: string]: BimesterData;
}

interface BimesterDates {
    [key: number]: { start: string; end: string };
}

// Interface para as faltas separadas por bimestre
interface StudentAbsencesByBimester {
    b1: string[];
    b2: string[];
    b3: string[];
    b4: string[];
}

// --- Helper para identificar bimestre ---
function getBimester(dateStr: string): number {
    const date = parseDate(dateStr);
    if (!date || isNaN(date.getTime())) {
        console.error("Data inválida:", dateStr);
        return 0;
    }
    const month = date.getMonth();
    if (month < 3) return 1;
    if (month < 6) return 2;
    if (month < 9) return 3;
    return 4;
}

// --- Helper para formatar data ---
function formatDateInput(value: string): string {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
}

// --- Helper para validar e formatar data ---
function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    let [day, month, year] = [0, 0, 0];
    if (dateStr.includes('/')) {
        [day, month, year] = dateStr.split('/').map(Number);
    } else if (dateStr.includes('-')) {
        [year, month, day] = dateStr.split('-').map(Number);
    }
    if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || month < 1 || month > 12 || day > 31) return null;
    return new Date(year, month - 1, day);
}

// --- Função auxiliar para converter data do Firebase para o formato DD/MM/YYYY ---
function formatFirebaseDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
}

// --- Função auxiliar para buscar dados dos alunos ---
async function fetchStudentData(totalDiasLetivos: number, start: string, end: string, selectedBimesters: Set<number>): Promise<StudentRecord[]> {
    try {
        const absenceSnapshot = await getDocs(collection(db, "2025", "faltas", "controle"));
        const absenceRecords: AbsenceRecord[] = absenceSnapshot.docs.map(doc => ({
            estudanteId: doc.data().estudanteId,
            turma: doc.data().turma,
            data: doc.data().data,
            docId: doc.id,
        }));

        const studentsDocSnap = await getDoc(doc(db, "2025", "lista_de_estudantes"));
        let studentList: Student[] = [];
        if (studentsDocSnap.exists()) {
            const studentData = studentsDocSnap.data() as { estudantes: Student[] };
            studentList = (studentData.estudantes || []).filter(
                (student: Student) => student.status === "ATIVO"
            );
        }

        const studentMap: Record<string, { nome: string; turma: string }> = {};
        studentList.forEach(student => {
            studentMap[student.estudanteId] = {
                nome: student.nome,
                turma: student.turma,
            };
        });

        const startDateObj = parseDate(start);
        const endDateObj = parseDate(end);

        if (!startDateObj || !endDateObj || isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
            return [];
        }

        const aggregated: Record<string, StudentRecord> = {};
        absenceRecords.forEach(record => {
            const formattedDate = formatFirebaseDate(record.data);
            const date = parseDate(formattedDate);
            if (!date || isNaN(date.getTime()) || date < startDateObj || date > endDateObj) {
                return;
            }

            const bimester = getBimester(formattedDate);
            if (selectedBimesters.size > 0 && !selectedBimesters.has(bimester)) {
                return;
            }

            const studentId = record.estudanteId;
            if (!studentMap[studentId]) {
                return; // Ignora registros de estudantes não ativos
            }

            if (!aggregated[studentId]) {
                aggregated[studentId] = {
                    estudanteId: studentId,
                    turma: record.turma,
                    nome: studentMap[studentId].nome,
                    faltasB1: 0,
                    faltasB2: 0,
                    faltasB3: 0,
                    faltasB4: 0,
                    totalFaltas: 0,
                    percentualFaltas: 0,
                    percentualFrequencia: 100,
                };
            }

            if (bimester === 1) aggregated[studentId].faltasB1++;
            else if (bimester === 2) aggregated[studentId].faltasB2++;
            else if (bimester === 3) aggregated[studentId].faltasB3++;
            else if (bimester === 4) aggregated[studentId].faltasB4++;
        });

        studentList.forEach(student => {
            if (!aggregated[student.estudanteId]) {
                aggregated[student.estudanteId] = {
                    estudanteId: student.estudanteId,
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

        const total = totalDiasLetivos || 40;
        Object.values(aggregated).forEach(student => {
            student.totalFaltas =
                student.faltasB1 + student.faltasB2 + student.faltasB3 + student.faltasB4;
            student.percentualFaltas = Number(Math.min((student.totalFaltas / total) * 100, 100).toFixed(1));
            student.percentualFrequencia = Number((100 - student.percentualFaltas).toFixed(1));
        });

        return Object.values(aggregated);
    } catch (error) {
        console.error("Erro ao buscar registros de faltas:", error);
        return [];
    }
}

// --- Página Dashboard ---
export default function DashboardPage() {
    const [selectedBimesters, setSelectedBimesters] = useState<Set<number>>(new Set());
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [useToday, setUseToday] = useState<boolean>(true);
    const [useCustom, setUseCustom] = useState<boolean>(false);
    const [bimesterDates, setBimesterDates] = useState<BimesterDates>({});
    const [data, setData] = useState<StudentRecord[]>([]);
    const [totalDiasLetivos, setTotalDiasLetivos] = useState<number>(0);
    const [selectedTurma, setSelectedTurma] = useState<string>("");
    const [selectedStudent, setSelectedStudent] = useState<string>("");
    const [studentAbsences, setStudentAbsences] = useState<StudentAbsencesByBimester>({ b1: [], b2: [], b3: [], b4: [] });
    const [duplicateAbsences, setDuplicateAbsences] = useState<AbsenceRecord[]>([]);

    // Busca os períodos dos bimestres no Firebase
    useEffect(() => {
        const fetchBimesterDates = async () => {
            try {
                const docRef = doc(db, "2025", "ano_letivo");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const anoData = docSnap.data() as AnoLetivoData;
                    const dates: BimesterDates = {};
                    const bimesters = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];

                    for (let i = 0; i < bimesters.length; i++) {
                        const bimesterKey = bimesters[i];
                        const bimesterNum = i + 1;
                        if (anoData[bimesterKey]) {
                            const start = anoData[bimesterKey].startDate;
                            const end = anoData[bimesterKey].endDate;
                            if (start && end) {
                                dates[bimesterNum] = { start, end };
                            }
                        }
                    }
                    setBimesterDates(dates);
                }
            } catch (error) {
                console.error("Erro ao buscar períodos dos bimestres:", error);
            }
        };
        fetchBimesterDates();
    }, []);

    // Função para lidar com a mudança de seleção de bimestre
    const handleBimesterChange = (bimester: number, checked: boolean) => {
        setSelectedBimesters(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(bimester);
            } else {
                newSet.delete(bimester);
            }
            return newSet;
        });
    };

    // Função para lidar com a mudança de seleção de "Até Hoje"
    const handleTodayChange = (checked: boolean) => {
        setUseToday(checked);
        if (checked) {
            setUseCustom(false);
            setSelectedBimesters(new Set());
        }
    };

    // Função para lidar com a mudança de seleção de "Personalizado"
    const handleCustomChange = (checked: boolean) => {
        setUseCustom(checked);
        if (checked) {
            setUseToday(false);
            setSelectedBimesters(new Set());
        }
    };

    // Função para lidar com a mudança de data
    const handleDateChange = (type: "start" | "end", value: string) => {
        if (type === "start") {
            setStartDate(formatDateInput(value));
        } else {
            setEndDate(formatDateInput(value));
        }
    };

    // Função para calcular dias letivos no período, memoizada com useCallback
    const calculateDiasLetivos = useCallback(async (start: string, end: string): Promise<number> => {
        try {
            const docRef = doc(db, "2025", "ano_letivo");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const anoData = docSnap.data() as AnoLetivoData;
                let total = 0;
                const startDateObj = parseDate(start);
                const endDateObj = parseDate(end);

                if (!startDateObj || !endDateObj || isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
                    return 0;
                }

                if (useToday) {
                    const bimesters = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
                    for (const bimesterKey of bimesters) {
                        if (anoData[bimesterKey]?.dates) {
                            total += anoData[bimesterKey].dates.filter(d => {
                                const date = parseDate(d.date);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return d.isChecked && date && date >= startDateObj && date <= today;
                            }).length;
                        }
                    }
                } else if (useCustom) {
                    for (const key in anoData) {
                        if (anoData[key]?.dates) {
                            total += anoData[key].dates.filter(d => {
                                const date = parseDate(d.date);
                                return d.isChecked && date && date >= startDateObj && date <= endDateObj;
                            }).length;
                        }
                    }
                } else {
                    const bimesters = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
                    for (const bimesterNum of Array.from(selectedBimesters)) {
                        const bimesterKey = bimesters[bimesterNum - 1];
                        if (anoData[bimesterKey]?.dates) {
                            total += anoData[bimesterKey].dates.filter(d => {
                                const date = parseDate(d.date);
                                return d.isChecked && date && date >= startDateObj && date <= endDateObj;
                            }).length;
                        }
                    }
                }
                return total;
            }
            return 0;
        } catch (error) {
            console.error("Erro ao calcular dias letivos:", error);
            return 0;
        }
    }, [useToday, useCustom, selectedBimesters]);

    // Atualiza datas com base nos filtros selecionados
    useEffect(() => {
        if (Object.keys(bimesterDates).length === 0) return;

        if (useToday) {
            if (selectedBimesters.size > 0 || useCustom) {
                setSelectedBimesters(new Set());
                setUseCustom(false);
            }
            const firstBimester = bimesterDates[1];
            if (firstBimester) {
                setStartDate(firstBimester.start);
                setEndDate(new Date().toLocaleDateString("pt-BR"));
            } else {
                setStartDate("01/01/2025");
                setEndDate(new Date().toLocaleDateString("pt-BR"));
            }
        } else if (useCustom) {
            if (selectedBimesters.size > 0) {
                setSelectedBimesters(new Set());
            }
            setStartDate("");
            setEndDate("");
        } else if (selectedBimesters.size > 0) {
            if (useCustom) setUseCustom(false);
            const sortedBimesters = Array.from(selectedBimesters).sort();
            const minBimester = bimesterDates[sortedBimesters[0]];
            const maxBimester = bimesterDates[sortedBimesters[sortedBimesters.length - 1]];
            if (minBimester && maxBimester) {
                setStartDate(minBimester.start);
                setEndDate(maxBimester.end);
            }
        } else if (!useToday && !useCustom && selectedBimesters.size === 0) {
            setStartDate("");
            setEndDate("");
            setData([]);
        }
    }, [selectedBimesters, useToday, useCustom, bimesterDates]);

    // Calcula dias letivos e atualiza dados quando os filtros mudam
    useEffect(() => {
        const updateData = async () => {
            if ((useToday || selectedBimesters.size > 0 || useCustom) && startDate && endDate) {
                const start = parseDate(startDate);
                const end = parseDate(endDate);
                if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    const total = await calculateDiasLetivos(startDate, endDate);
                    setTotalDiasLetivos(total);
                    const newData = await fetchStudentData(total, startDate, endDate, selectedBimesters);
                    setData(newData);
                } else {
                    setTotalDiasLetivos(0);
                    setData([]);
                }
            } else if (!useToday && !useCustom && selectedBimesters.size === 0) {
                setTotalDiasLetivos(0);
                setData([]);
            }
        };
        updateData();
    }, [startDate, endDate, useToday, useCustom, selectedBimesters, calculateDiasLetivos]);

    // Função para buscar dias de falta de um estudante específico, separada por bimestre
    const fetchStudentAbsences = useCallback(async (studentId: string) => {
        try {
            const absenceSnapshot = await getDocs(collection(db, "2025", "faltas", "controle"));
            const absenceRecords: AbsenceRecord[] = absenceSnapshot.docs.map(doc => ({
                estudanteId: doc.data().estudanteId,
                turma: doc.data().turma,
                data: formatFirebaseDate(doc.data().data),
                docId: doc.id,
            }));

            const absencesByBimester: StudentAbsencesByBimester = { b1: [], b2: [], b3: [], b4: [] };
            absenceRecords
                .filter(record => record.estudanteId === studentId)
                .forEach(record => {
                    const bimester = getBimester(record.data);
                    if (bimester === 1) absencesByBimester.b1.push(record.data);
                    else if (bimester === 2) absencesByBimester.b2.push(record.data);
                    else if (bimester === 3) absencesByBimester.b3.push(record.data);
                    else if (bimester === 4) absencesByBimester.b4.push(record.data);
                });

            // Ordena as datas em cada bimestre
            absencesByBimester.b1.sort((a, b) => (parseDate(a)?.getTime() || 0) - (parseDate(b)?.getTime() || 0));
            absencesByBimester.b2.sort((a, b) => (parseDate(a)?.getTime() || 0) - (parseDate(b)?.getTime() || 0));
            absencesByBimester.b3.sort((a, b) => (parseDate(a)?.getTime() || 0) - (parseDate(b)?.getTime() || 0));
            absencesByBimester.b4.sort((a, b) => (parseDate(a)?.getTime() || 0) - (parseDate(b)?.getTime() || 0));

            setStudentAbsences(absencesByBimester);
        } catch (error) {
            console.error("Erro ao buscar faltas do estudante:", error);
            setStudentAbsences({ b1: [], b2: [], b3: [], b4: [] });
        }
    }, []);

    // Função para buscar duplicatas de faltas
    const fetchDuplicateAbsences = useCallback(async () => {
        try {
            const absenceSnapshot = await getDocs(collection(db, "2025", "faltas", "controle"));
            const absenceRecords: AbsenceRecord[] = absenceSnapshot.docs.map(doc => ({
                estudanteId: doc.data().estudanteId,
                turma: doc.data().turma,
                data: formatFirebaseDate(doc.data().data),
                docId: doc.id,
            }));

            const seen: Record<string, AbsenceRecord[]> = {};
            absenceRecords.forEach(record => {
                const key = `${record.estudanteId}-${record.data}`;
                if (!seen[key]) {
                    seen[key] = [];
                }
                seen[key].push(record);
            });

            const duplicates = Object.values(seen)
                .filter(group => group.length > 1)
                .flat();

            setDuplicateAbsences(duplicates);
        } catch (error) {
            console.error("Erro ao buscar duplicatas de faltas:", error);
            setDuplicateAbsences([]);
        }
    }, []);

    // Função para remover duplicatas, mantendo apenas o primeiro registro
    const removeDuplicateAbsences = useCallback(async () => {
        try {
            const absenceSnapshot = await getDocs(collection(db, "2025", "faltas", "controle"));
            const absenceRecords: AbsenceRecord[] = absenceSnapshot.docs.map(doc => ({
                estudanteId: doc.data().estudanteId,
                turma: doc.data().turma,
                data: formatFirebaseDate(doc.data().data),
                docId: doc.id,
            }));

            const seen: Record<string, AbsenceRecord[]> = {};
            absenceRecords.forEach(record => {
                const key = `${record.estudanteId}-${record.data}`;
                if (!seen[key]) {
                    seen[key] = [];
                }
                seen[key].push(record);
            });

            const duplicatesToRemove = Object.values(seen)
                .filter(group => group.length > 1)
                .flatMap(group => group.slice(1)); // Mantém o primeiro, remove os demais

            // Remove os documentos duplicados do Firebase
            const deletePromises = duplicatesToRemove.map(record =>
                deleteDoc(doc(db, "2025", "faltas", "controle", record.docId))
            );
            await Promise.all(deletePromises);

            console.log(`Removidos ${duplicatesToRemove.length} registros duplicados.`);

            // Atualiza a lista de duplicatas após a remoção
            await fetchDuplicateAbsences();

            // Atualiza os dados principais, pois as faltas mudaram
            if (startDate && endDate) {
                const total = await calculateDiasLetivos(startDate, endDate);
                const newData = await fetchStudentData(total, startDate, endDate, selectedBimesters);
                setData(newData);
            }
        } catch (error) {
            console.error("Erro ao remover duplicatas de faltas:", error);
        }
    }, [fetchDuplicateAbsences, startDate, endDate, selectedBimesters, calculateDiasLetivos]);

    // Busca duplicatas ao carregar a página
    useEffect(() => {
        fetchDuplicateAbsences();
    }, [fetchDuplicateAbsences]);

    // Lista de turmas únicas
    const uniqueTurmas = useMemo(() => {
        return Array.from(new Set(data.map(item => item.turma))).sort((a, b) => {
            const [numA, letterA] = a.match(/(\d+)([A-Z]+)/)!.slice(1);
            const [numB, letterB] = b.match(/(\d+)([A-Z]+)/)!.slice(1);
            const numCompare = Number(numA) - Number(numB);
            if (numCompare !== 0) return numCompare;
            return letterA.localeCompare(letterB);
        });
    }, [data]);

    // Lista de estudantes da turma selecionada
    const studentsInTurma = useMemo(() => {
        return data
            .filter(student => student.turma === selectedTurma)
            .sort((a, b) => a.nome.localeCompare(b.nome));
    }, [data, selectedTurma]);

    // Efeito para buscar faltas quando o estudante é selecionado
    useEffect(() => {
        if (selectedStudent) {
            fetchStudentAbsences(selectedStudent);
        } else {
            setStudentAbsences({ b1: [], b2: [], b3: [], b4: [] });
        }
    }, [selectedStudent, fetchStudentAbsences]);

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

        return Object.values(grouped).sort((a, b) => {
            const [numA, letterA] = a.turma.match(/(\d+)([A-Z]+)/)!.slice(1);
            const [numB, letterB] = b.turma.match(/(\d+)([A-Z]+)/)!.slice(1);
            const numCompare = Number(numA) - Number(numB);
            if (numCompare !== 0) return numCompare;
            return letterA.localeCompare(letterB);
        });
    }, [data]);

    const maxHeatmapValue = useMemo(
        () => Math.max(...heatmapData.flatMap(d => [d.b1, d.b2, d.b3, d.b4])),
        [heatmapData]
    );
    const nearLimitCount = useMemo(
        () => data.filter(s => s.percentualFaltas >= 20 && s.percentualFaltas < 25).length,
        [data]
    );

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
                        <th className="border p-2">Turma</th>
                        <th className="border p-2">1º Bim</th>
                        <th className="border p-2">2º Bim</th>
                        <th className="border p-2">3º Bim</th>
                        <th className="border p-2">4º Bim</th>
                    </tr>
                </thead>
                <tbody>
                    {heatmapData.map((row) => (
                        <tr key={row.turma}>
                            <td className="border p-2 text-center">{row.turma}</td>
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
            {/* Card de Filtros */}
            <Card>
                <CardHeader>
                    <CardTitle>Filtros de Período</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-center">
                        {[1, 2, 3, 4].map(bimester => (
                            <div key={bimester} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`bimester-${bimester}`}
                                    checked={selectedBimesters.has(bimester)}
                                    onCheckedChange={(checked) => handleBimesterChange(bimester, checked as boolean)}
                                    disabled={useToday || useCustom}
                                />
                                <Label htmlFor={`bimester-${bimester}`}>{`${bimester}º Bimestre`}</Label>
                            </div>
                        ))}
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="today"
                                checked={useToday}
                                onCheckedChange={handleTodayChange}
                                disabled={useCustom}
                            />
                            <Label htmlFor="today">Até Hoje</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="custom"
                                checked={useCustom}
                                onCheckedChange={handleCustomChange}
                                disabled={useToday}
                            />
                            <Label htmlFor="custom">Personalizado</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Label htmlFor="start-date">Início</Label>
                            <Input
                                id="start-date"
                                placeholder="dd/mm/aaaa"
                                value={startDate}
                                onChange={(e) => handleDateChange("start", e.target.value)}
                                maxLength={10}
                                disabled={!useCustom}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Label htmlFor="end-date">Fim</Label>
                            <Input
                                id="end-date"
                                placeholder="dd/mm/aaaa"
                                value={endDate}
                                onChange={(e) => handleDateChange("end", e.target.value)}
                                maxLength={10}
                                disabled={!useCustom}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

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
                                <h2 className="text-lg font-semibold">Média de Faltas por Estudante</h2>
                                <p className="text-3xl font-bold">{mediaFaltasGlobal.toFixed(1)}</p>
                            </Card>
                        </div>
                    ) : null}
                    {data.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4">
                            <Card className="border p-4">
                                <h2 className="text-lg font-semibold">Média de Frequência por Turma</h2>
                                <TurmaFrequencyGrid />
                            </Card>
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            {/* Seção 2: Gráficos Comparativos */}
            <Card>
                <CardHeader>
                    <CardTitle>Gráficos Comparativos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {data.length > 0 ? (
                        <div>
                            <h3 className="text-xl font-semibold mb-2">Comparação por Turma</h3>
                            <TurmaComparisonChart />
                        </div>
                    ) : null}
                    {data.length > 0 ? (
                        <div>
                            <h3 className="text-xl font-semibold mb-2">Distribuição de Alunos (Conformes vs. Risco)</h3>
                            <DistributionChart />
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            {/* Seção 3: Análise Temporal e por Bimestre */}
            <Card>
                <CardHeader>
                    <CardTitle>Análise Temporal e por Bimestre</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {data.length > 0 ? (
                        <div>
                            <h3 className="text-xl font-semibold mb-2">Evolução das Faltas por Bimestre</h3>
                            <EvolutionChart />
                        </div>
                    ) : null}
                    {data.length > 0 ? (
                        <div>
                            <h3 className="text-xl font-semibold mb-2">Heatmap de Faltas (por Turma e Bimestre)</h3>
                            <HeatmapFaltas />
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            {/* Seção 4: Alertas e Listagens de Risco */}
            <Card>
                <CardHeader>
                    <CardTitle>Alertas e Listagens de Risco</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {data.length > 0 ? (
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
                    ) : null}
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

            {/* Seção 6: Faltas por Estudante */}
            <Card>
                <CardHeader>
                    <CardTitle>Faltas por Estudante</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="select-turma">Selecionar Turma</Label>
                            <Select
                                onValueChange={(value) => {
                                    setSelectedTurma(value);
                                    setSelectedStudent("");
                                }}
                                value={selectedTurma}
                            >
                                <SelectTrigger id="select-turma">
                                    <SelectValue placeholder="Escolha uma turma" />
                                </SelectTrigger>
                                <SelectContent>
                                    {uniqueTurmas.map(turma => (
                                        <SelectItem key={turma} value={turma}>
                                            {turma}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="select-student">Selecionar Estudante</Label>
                            <Select
                                onValueChange={setSelectedStudent}
                                value={selectedStudent}
                                disabled={!selectedTurma}
                            >
                                <SelectTrigger id="select-student">
                                    <SelectValue placeholder="Escolha um estudante" />
                                </SelectTrigger>
                                <SelectContent>
                                    {studentsInTurma.map(student => (
                                        <SelectItem key={student.estudanteId} value={student.estudanteId}>
                                            {student.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {selectedStudent && (studentAbsences.b1.length > 0 || studentAbsences.b2.length > 0 || studentAbsences.b3.length > 0 || studentAbsences.b4.length > 0) ? (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Dias de Falta por Bimestre</h3>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-1/4 text-center">1º Bimestre</TableHead>
                                            <TableHead className="w-1/4 text-center">2º Bimestre</TableHead>
                                            <TableHead className="w-1/4 text-center">3º Bimestre</TableHead>
                                            <TableHead className="w-1/4 text-center">4º Bimestre</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="align-top text-center">
                                                <div className="space-y-1">
                                                    {studentAbsences.b1.length > 0 ? (
                                                        studentAbsences.b1.map((date, index) => (
                                                            <p key={index} className="text-sm">{date}</p>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">Nenhuma falta</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-top text-center">
                                                <div className="space-y-1">
                                                    {studentAbsences.b2.length > 0 ? (
                                                        studentAbsences.b2.map((date, index) => (
                                                            <p key={index} className="text-sm">{date}</p>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">Nenhuma falta</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-top text-center">
                                                <div className="space-y-1">
                                                    {studentAbsences.b3.length > 0 ? (
                                                        studentAbsences.b3.map((date, index) => (
                                                            <p key={index} className="text-sm">{date}</p>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">Nenhuma falta</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-top text-center">
                                                <div className="space-y-1">
                                                    {studentAbsences.b4.length > 0 ? (
                                                        studentAbsences.b4.map((date, index) => (
                                                            <p key={index} className="text-sm">{date}</p>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">Nenhuma falta</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : selectedStudent ? (
                        <p className="text-sm text-muted-foreground">Nenhuma falta registrada para este estudante.</p>
                    ) : null}
                </CardContent>
            </Card>

            {/* Seção 7: Duplicatas de Faltas */}
            <Card>
                <CardHeader>
                    <CardTitle>Registros de Faltas Duplicados</CardTitle>
                </CardHeader>
                <CardContent>
                    {duplicateAbsences.length > 0 ? (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-sm">
                                    <thead>
                                        <tr>
                                            <th className="border p-2">ID do Documento</th>
                                            <th className="border p-2">Estudante ID</th>
                                            <th className="border p-2">Turma</th>
                                            <th className="border p-2">Data</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {duplicateAbsences.map((record, index) => (
                                            <tr key={index}>
                                                <td className="border p-2">{record.docId}</td>
                                                <td className="border p-2">{record.estudanteId}</td>
                                                <td className="border p-2">{record.turma}</td>
                                                <td className="border p-2">{record.data}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Button
                                onClick={removeDuplicateAbsences}
                                className="mt-4 bg-red-500 hover:bg-red-600"
                            >
                                Remover Duplicatas
                            </Button>
                        </>
                    ) : (
                        <p>Nenhum registro de falta duplicado encontrado.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}