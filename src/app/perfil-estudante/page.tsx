"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster, toast } from "sonner";
import { db } from "@/firebase.config";
import { doc, getDoc, collection, addDoc, getDocs, DocumentSnapshot, DocumentData } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Tipos e Interfaces
interface Student { estudanteId: string; nome: string; turma: string; status: string; }
interface StudentRecord { estudanteId: string; turma: string; nome: string; faltasB1: number; faltasB2: number; faltasB3: number; faltasB4: number; totalFaltas: number; totalFaltasAteHoje: number; percentualFaltas: number; percentualFaltasAteHoje: number; percentualFrequencia: number; percentualFrequenciaAteHoje: number; diasLetivosAteHoje: number; diasLetivosB1: number; diasLetivosB2: number; diasLetivosB3: number; diasLetivosB4: number; diasLetivosAnual: number; }
interface FamilyInteraction { id: string; type: string; date: string; description: string; createdBy: string; }
interface AbsenceRecord { estudanteId: string; data: string; }
interface BimesterDate { date: string; isChecked: boolean; }
interface BimesterData { dates: BimesterDate[]; startDate: string; endDate: string; }
interface AnoLetivoData { "1º Bimestre": BimesterData; "2º Bimestre": BimesterData; "3º Bimestre": BimesterData; "4º Bimestre": BimesterData; }

// Funções Auxiliares
function formatFirebaseDate(dateStr: string | undefined): string {
    if (!dateStr || typeof dateStr !== "string") return "01/01/1970";
    const [year, month, day] = dateStr.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return "01/01/1970";
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
}

function formatDateInput(value: string): string {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
}

function parseDateToFirebase(dateStr: string): string | null {
    const [day, month, year] = dateStr.split('/').map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || month < 1 || month > 12 || day > 31) return null;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function parseDate(dateStr: string): Date | null {
    const [day, month, year] = dateStr.split('/').map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month - 1, day);
}

function getBimester(dateStr: string): number {
    const date = parseDate(dateStr);
    if (!date || isNaN(date.getTime())) return 0;
    const month = date.getMonth();
    if (month < 3) return 1;
    if (month < 6) return 2;
    if (month < 9) return 3;
    return 4;
}

function getFrequencyColor(percentual: number): string {
    if (percentual >= 81 && percentual <= 100) return "text-green-600 text-center";
    else if (percentual >= 75 && percentual <= 80) return "text-yellow-600 text-center";
    else return "text-red-600 text-center";
}

export default function StudentProfilePage() {
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [selectedTurma, setSelectedTurma] = useState<string>("");
    const [selectedStudentId, setSelectedStudentId] = useState<string>("");
    const [student, setStudent] = useState<Student | null>(null);
    const [studentRecord, setStudentRecord] = useState<StudentRecord | null>(null);
    const [absences, setAbsences] = useState<string[]>([]);
    const [interactions, setInteractions] = useState<FamilyInteraction[]>([]);
    const [interactionType, setInteractionType] = useState<string>("");
    const [interactionDate, setInteractionDate] = useState<string>(new Date().toLocaleDateString("pt-BR"));
    const [interactionDescription, setInteractionDescription] = useState<string>("");
    const [loadingStudents, setLoadingStudents] = useState<boolean>(true);
    const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
    const [notification,] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
    const interactionCardRef = useRef<HTMLDivElement>(null);

    const auth = getAuth();

    const fetchAllStudents = useCallback(async (): Promise<void> => {
        try {
            setLoadingStudents(true);
            const studentDoc = await getDoc(doc(db, "2025", "lista_de_estudantes"));
            if (studentDoc.exists()) {
                const studentData = studentDoc.data() as { estudantes: Student[] };
                const activeStudents = studentData.estudantes.filter(s => s.status === "ATIVO");
                setAllStudents(activeStudents.sort((a, b) => a.nome.localeCompare(b.nome)));
            }
        } catch (error) {
            console.error("Erro ao buscar lista de estudantes:", error);
        } finally {
            setLoadingStudents(false);
        }
    }, []);

    const calculateDiasLetivos = useCallback(async (): Promise<{ ateHoje: number; b1: number; b2: number; b3: number; b4: number; anual: number }> => {
        try {
            const docRef = doc(db, "2025", "ano_letivo");
            const docSnap: DocumentSnapshot<DocumentData> = await getDoc(docRef);
            if (!docSnap.exists()) {
                console.warn("Documento 'ano_letivo' não encontrado.");
                return { ateHoje: 0, b1: 0, b2: 0, b3: 0, b4: 0, anual: 0 };
            }

            const anoData = docSnap.data() as AnoLetivoData;
            const today: Date = new Date();
            today.setHours(0, 0, 0, 0);

            const startDateStr = anoData["1º Bimestre"]?.startDate || "05/02/2025";
            const startDateObj: Date | null = parseDate(startDateStr);
            if (!startDateObj) {
                console.warn("Data de início do 1º bimestre inválida.");
                return { ateHoje: 0, b1: 0, b2: 0, b3: 0, b4: 0, anual: 0 };
            }

            let totalAteHoje: number = 0;
            const totalsByBimester: { b1: number; b2: number; b3: number; b4: number } = { b1: 0, b2: 0, b3: 0, b4: 0 };
            const diasLetivosAteHoje: string[] = [];

            for (const key in anoData) {
                const bimesterKey = key as keyof AnoLetivoData;
                if (anoData[bimesterKey]?.dates) {
                    const filteredDates = anoData[bimesterKey].dates.filter((d: BimesterDate): boolean => {
                        const dateStr = d.date;
                        if (!dateStr || typeof dateStr !== "string") return false;
                        const date: Date | null = parseDate(dateStr);
                        const isValid = d.isChecked && date !== null && date >= startDateObj && date <= today;
                        if (isValid) diasLetivosAteHoje.push(dateStr);
                        return isValid;
                    });
                    totalAteHoje += filteredDates.length;
                }
            }

            diasLetivosAteHoje.sort((a, b) => (parseDate(a)?.getTime() || 0) - (parseDate(b)?.getTime() || 0));

            const bimesters: (keyof AnoLetivoData)[] = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
            for (let i: number = 0; i < bimesters.length; i++) {
                const bimesterKey: keyof AnoLetivoData = bimesters[i];
                const bimesterData: BimesterData | undefined = anoData[bimesterKey];
                if (!bimesterData?.dates) continue;
                const bimesterCount: number = bimesterData.dates.filter((d: BimesterDate): boolean =>
                    d.isChecked && !!d.date && typeof d.date === "string" && parseDate(d.date) !== null
                ).length;
                if (i === 0) totalsByBimester.b1 = bimesterCount;
                if (i === 1) totalsByBimester.b2 = bimesterCount;
                if (i === 2) totalsByBimester.b3 = bimesterCount;
                if (i === 3) totalsByBimester.b4 = bimesterCount;
            }

            const totalAnual: number = totalsByBimester.b1 + totalsByBimester.b2 + totalsByBimester.b3 + totalsByBimester.b4;

            return {
                ateHoje: totalAteHoje,
                b1: totalsByBimester.b1,
                b2: totalsByBimester.b2,
                b3: totalsByBimester.b3,
                b4: totalsByBimester.b4,
                anual: totalAnual,
            };
        } catch (error) {
            console.error("Erro ao calcular dias letivos:", error);
            return { ateHoje: 0, b1: 0, b2: 0, b3: 0, b4: 0, anual: 0 };
        }
    }, []);

    const fetchStudentData = useCallback(async (studentId: string): Promise<void> => {
        if (!studentId) return;
        try {
            setLoadingProfile(true);
            const foundStudent = allStudents.find((s: Student) => s.estudanteId === studentId);
            if (foundStudent) setStudent(foundStudent);

            const absenceSnapshot = await getDocs(collection(db, "2025", "faltas", "controle"));
            const absenceRecords: AbsenceRecord[] = absenceSnapshot.docs
                .map((doc) => ({
                    estudanteId: doc.data().estudanteId as string,
                    data: formatFirebaseDate(doc.data().data as string),
                }))
                .filter((record: AbsenceRecord) => record.estudanteId === studentId)
                .sort((a, b) => (parseDateToFirebase(a.data)?.localeCompare(parseDateToFirebase(b.data) || "") || 0));

            setAbsences(absenceRecords.map((record: AbsenceRecord) => record.data));

            const diasLetivos = await calculateDiasLetivos();
            const today = new Date(2025, 2, 14);
            today.setHours(0, 0, 0, 0);
            const firstDayB1 = parseDate(formatFirebaseDate((await getDoc(doc(db, "2025", "ano_letivo"))).data()?.["1º Bimestre"]?.startDate || "01/01/2025"));

            const faltasB1 = absenceRecords.filter((d: AbsenceRecord) => getBimester(d.data) === 1).length;
            const faltasB2 = absenceRecords.filter((d: AbsenceRecord) => getBimester(d.data) === 2).length;
            const faltasB3 = absenceRecords.filter((d: AbsenceRecord) => getBimester(d.data) === 3).length;
            const faltasB4 = absenceRecords.filter((d: AbsenceRecord) => getBimester(d.data) === 4).length;
            const totalFaltas = faltasB1 + faltasB2 + faltasB3 + faltasB4;
            const totalFaltasAteHoje = absenceRecords.filter((record: AbsenceRecord) => {
                const date = parseDate(record.data);
                return date !== null && date >= (firstDayB1 || new Date()) && date <= today;
            }).length;

            const aggregated: StudentRecord = {
                estudanteId: studentId,
                turma: foundStudent?.turma || "",
                nome: foundStudent?.nome || "",
                faltasB1,
                faltasB2,
                faltasB3,
                faltasB4,
                totalFaltas,
                totalFaltasAteHoje,
                percentualFaltas: diasLetivos.anual ? Number((totalFaltas / diasLetivos.anual * 100).toFixed(1)) : 0,
                percentualFaltasAteHoje: diasLetivos.ateHoje ? Number((totalFaltasAteHoje / diasLetivos.ateHoje * 100).toFixed(1)) : 0,
                percentualFrequencia: diasLetivos.anual ? Number((100 - (totalFaltas / diasLetivos.anual * 100)).toFixed(1)) : 100,
                percentualFrequenciaAteHoje: diasLetivos.ateHoje ? Number((100 - (totalFaltasAteHoje / diasLetivos.ateHoje * 100)).toFixed(1)) : 100,
                diasLetivosAteHoje: diasLetivos.ateHoje,
                diasLetivosB1: diasLetivos.b1,
                diasLetivosB2: diasLetivos.b2,
                diasLetivosB3: diasLetivos.b3,
                diasLetivosB4: diasLetivos.b4,
                diasLetivosAnual: diasLetivos.anual,
            };
            setStudentRecord(aggregated);

            const interactionsSnapshot = await getDocs(collection(db, "2025", "interactions", studentId));
            const interactionRecords: FamilyInteraction[] = interactionsSnapshot.docs.map((doc) => ({
                id: doc.id,
                type: doc.data().type as string,
                date: formatFirebaseDate(doc.data().date as string),
                description: doc.data().description as string,
                createdBy: doc.data().createdBy as string || "Não informado",
            })).sort((a, b) => (parseDateToFirebase(b.date)?.localeCompare(parseDateToFirebase(a.date) || "") || 0));
            setInteractions(interactionRecords);
        } catch (error) {
            console.error("Erro ao buscar dados do aluno:", error);
        } finally {
            setLoadingProfile(false);
        }
    }, [allStudents, calculateDiasLetivos]);

    useEffect(() => {
        fetchAllStudents();
    }, [fetchAllStudents]);

    useEffect(() => {
        if (selectedStudentId) {
            fetchStudentData(selectedStudentId);
        }
    }, [selectedStudentId, fetchStudentData]);

    const handleAddInteraction = async (): Promise<void> => {
        if (!selectedStudentId || !interactionType || !interactionDate || !interactionDescription) {
            toast.error("Preencha todos os campos para adicionar uma interação.");
            return;
        }

        const formattedDate = parseDateToFirebase(interactionDate);
        if (!formattedDate) {
            toast.error("Data inválida. Use o formato DD/MM/YYYY.");
            return;
        }

        try {
            const scrollPosition = window.scrollY;

            const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido";

            const interactionData: Omit<FamilyInteraction, "id"> = {
                type: interactionType,
                date: formattedDate,
                description: interactionDescription,
                createdBy: currentUser,
            };

            await addDoc(collection(db, "2025", "interactions", selectedStudentId), interactionData);
            setInteractionType("");
            setInteractionDate(new Date().toLocaleDateString("pt-BR"));
            setInteractionDescription("");
            await fetchStudentData(selectedStudentId);

            window.scrollTo(0, scrollPosition);
            if (interactionCardRef.current) {
                interactionCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
            }

            toast.success("Interação salva com sucesso!");
        } catch (error) {
            console.error("Erro ao cadastrar interação:", error);
            toast.error("Erro ao salvar interação. Tente novamente.");
        }
    };

    const uniqueTurmas: string[] = Array.from(new Set(allStudents.map((s: Student) => s.turma))).sort((a, b) => {
        const [numA, letterA] = a.match(/(\d+)([A-Z]+)/)!.slice(1);
        const [numB, letterB] = b.match(/(\d+)([A-Z]+)/)!.slice(1);
        const numCompare = Number(numA) - Number(numB);
        if (numCompare !== 0) return numCompare;
        return letterA.localeCompare(letterB);
    });

    const studentsInTurma: Student[] = allStudents
        .filter((s: Student) => s.turma === selectedTurma)
        .sort((a, b) => a.nome.localeCompare(b.nome));

    return (
        <div className="p-4 space-y-8">
            <Toaster richColors position="top-right" />
            <h1 className="text-3xl font-bold">Ficha do Aluno</h1>
            {notification.message && (
                <div className={`p-4 rounded-lg text-white ${notification.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
                    {notification.message}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Escolha a Turma e o Estudante</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingStudents ? (
                        <Skeleton className="h-10 w-full" />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="select-turma">Turma</Label>
                                <Select onValueChange={(value: string) => {
                                    setSelectedTurma(value);
                                    setSelectedStudentId("");
                                    setStudent(null);
                                    setStudentRecord(null);
                                    setAbsences([]);
                                    setInteractions([]);
                                }} value={selectedTurma}>
                                    <SelectTrigger id="select-turma">
                                        <SelectValue placeholder="Selecione uma turma" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uniqueTurmas.map((turma: string) => (
                                            <SelectItem key={turma} value={turma}>
                                                {turma}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="select-student">Estudante</Label>
                                <Select
                                    onValueChange={setSelectedStudentId}
                                    value={selectedStudentId}
                                    disabled={!selectedTurma}
                                >
                                    <SelectTrigger id="select-student">
                                        <SelectValue placeholder="Selecione um estudante" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {studentsInTurma.map((student: Student) => (
                                            <SelectItem key={student.estudanteId} value={student.estudanteId}>
                                                {student.nome}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {loadingProfile ? (
                <Card>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            ) : student && (
                <>
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle>Informações do Aluno</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div>
                                    <Label>Nome</Label>
                                    <p className="text-lg font-semibold">{student.nome}</p>
                                </div>
                                <div>
                                    <Label>Turma</Label>
                                    <p className="text-lg font-semibold">{student.turma}</p>
                                </div>
                                <div>
                                    <Label>Status</Label>
                                    <p className="text-lg font-semibold">{student.status}</p>
                                </div>
                            </div>

                            {studentRecord && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">Frequência</h3>
                                        <div className="bg-gray-100 p-5 rounded-lg shadow-sm">
                                            <h4 className="text-md font-medium mb-3 text-center">Até Hoje</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Faltas</p>
                                                    <p className="text-lg font-semibold">{studentRecord.totalFaltasAteHoje}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">% Faltas</p>
                                                    <p className="text-lg font-semibold">{studentRecord.percentualFaltasAteHoje}%</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">% Frequência</p>
                                                    <p className={`text-lg font-semibold ${getFrequencyColor(studentRecord.percentualFrequenciaAteHoje)}`}>
                                                        {studentRecord.percentualFrequenciaAteHoje}%
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Dias Letivos</p>
                                                    <p className="text-lg font-semibold">{studentRecord.diasLetivosAteHoje}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-1/4 text-left">Bimestre</TableHead>
                                                    <TableHead className="w-1/6 text-center">Faltas</TableHead>
                                                    <TableHead className="w-1/6 text-center">% Faltas</TableHead>
                                                    <TableHead className="w-1/6 text-center">% Frequência</TableHead>
                                                    <TableHead className="w-1/6 text-center">Dias Letivos</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell className="text-left">1º Bimestre</TableCell>
                                                    <TableCell className="text-center">{studentRecord.faltasB1}</TableCell>
                                                    <TableCell className="text-center">{studentRecord.diasLetivosB1 ? Number((studentRecord.faltasB1 / studentRecord.diasLetivosB1 * 100).toFixed(1)) : 0}%</TableCell>
                                                    <TableCell className={getFrequencyColor(studentRecord.diasLetivosB1 ? Number((100 - (studentRecord.faltasB1 / studentRecord.diasLetivosB1 * 100)).toFixed(1)) : 100)}>
                                                        {studentRecord.diasLetivosB1 ? Number((100 - (studentRecord.faltasB1 / studentRecord.diasLetivosB1 * 100)).toFixed(1)) : 100}%
                                                    </TableCell>
                                                    <TableCell className="text-center">{studentRecord.diasLetivosB1}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="text-left">2º Bimestre</TableCell>
                                                    <TableCell className="text-center">{studentRecord.faltasB2}</TableCell>
                                                    <TableCell className="text-center">{studentRecord.diasLetivosB2 ? Number((studentRecord.faltasB2 / studentRecord.diasLetivosB2 * 100).toFixed(1)) : 0}%</TableCell>
                                                    <TableCell className={getFrequencyColor(studentRecord.diasLetivosB2 ? Number((100 - (studentRecord.faltasB2 / studentRecord.diasLetivosB2 * 100)).toFixed(1)) : 100)}>
                                                        {studentRecord.diasLetivosB2 ? Number((100 - (studentRecord.faltasB2 / studentRecord.diasLetivosB2 * 100)).toFixed(1)) : 100}%
                                                    </TableCell>
                                                    <TableCell className="text-center">{studentRecord.diasLetivosB2}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="text-left">3º Bimestre</TableCell>
                                                    <TableCell className="text-center">{studentRecord.faltasB3}</TableCell>
                                                    <TableCell className="text-center">{studentRecord.diasLetivosB3 ? Number((studentRecord.faltasB3 / studentRecord.diasLetivosB3 * 100).toFixed(1)) : 0}%</TableCell>
                                                    <TableCell className={getFrequencyColor(studentRecord.diasLetivosB3 ? Number((100 - (studentRecord.faltasB3 / studentRecord.diasLetivosB3 * 100)).toFixed(1)) : 100)}>
                                                        {studentRecord.diasLetivosB3 ? Number((100 - (studentRecord.faltasB3 / studentRecord.diasLetivosB3 * 100)).toFixed(1)) : 100}%
                                                    </TableCell>
                                                    <TableCell className="text-center">{studentRecord.diasLetivosB3}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="text-left">4º Bimestre</TableCell>
                                                    <TableCell className="text-center">{studentRecord.faltasB4}</TableCell>
                                                    <TableCell className="text-center">{studentRecord.diasLetivosB4 ? Number((studentRecord.faltasB4 / studentRecord.diasLetivosB4 * 100).toFixed(1)) : 0}%</TableCell>
                                                    <TableCell className={getFrequencyColor(studentRecord.diasLetivosB4 ? Number((100 - (studentRecord.faltasB4 / studentRecord.diasLetivosB4 * 100)).toFixed(1)) : 100)}>
                                                        {studentRecord.diasLetivosB4 ? Number((100 - (studentRecord.faltasB4 / studentRecord.diasLetivosB4 * 100)).toFixed(1)) : 100}%
                                                    </TableCell>
                                                    <TableCell className="text-center">{studentRecord.diasLetivosB4}</TableCell>
                                                </TableRow>
                                                <TableRow className="bg-gray-50 font-semibold">
                                                    <TableCell className="text-left">Anual</TableCell>
                                                    <TableCell className="text-center">{studentRecord.totalFaltas}</TableCell>
                                                    <TableCell className="text-center">{studentRecord.percentualFaltas}%</TableCell>
                                                    <TableCell className={getFrequencyColor(studentRecord.percentualFrequencia)}>
                                                        {studentRecord.percentualFrequencia}%
                                                    </TableCell>
                                                    <TableCell className="text-center">{studentRecord.diasLetivosAnual}</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Faltas Registradas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {absences.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2 text-center">1º Bimestre</h3>
                                        {absences.filter((date: string) => getBimester(date) === 1).map((date: string, index: number) => (
                                            <p key={index} className="text-sm text-center">{date}</p>
                                        ))}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2 text-center">2º Bimestre</h3>
                                        {absences.filter((date: string) => getBimester(date) === 2).map((date: string, index: number) => (
                                            <p key={index} className="text-sm text-center">{date}</p>
                                        ))}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2 text-center">3º Bimestre</h3>
                                        {absences.filter((date: string) => getBimester(date) === 3).map((date: string, index: number) => (
                                            <p key={index} className="text-sm text-center">{date}</p>
                                        ))}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2 text-center">4º Bimestre</h3>
                                        {absences.filter((date: string) => getBimester(date) === 4).map((date: string, index: number) => (
                                            <p key={index} className="text-sm text-center">{date}</p>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center">Nenhuma falta registrada.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card ref={interactionCardRef}>
                        <CardHeader>
                            <CardTitle>Cadastrar Interação com a Família</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="interaction-type">Tipo de Interação</Label>
                                    <Select onValueChange={setInteractionType} value={interactionType}>
                                        <SelectTrigger id="interaction-type">
                                            <SelectValue placeholder="Selecione o tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Contato telefônico">Contato telefônico</SelectItem>
                                            <SelectItem value="Contato digital">Contato digital</SelectItem>
                                            <SelectItem value="Conversa com a família">Conversa com a família</SelectItem>
                                            <SelectItem value="Visita domiciliar da ABAE">Visita domiciliar da ABAE</SelectItem>
                                            <SelectItem value="Carta registrada">Carta registrada</SelectItem>
                                            <SelectItem value="Conselho tutelar">Conselho tutelar</SelectItem>
                                            <SelectItem value="Desligamento">Desligamento</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="interaction-date">Data</Label>
                                    <Input
                                        id="interaction-date"
                                        placeholder="dd/mm/aaaa"
                                        value={interactionDate}
                                        onChange={(e) => setInteractionDate(formatDateInput(e.target.value))}
                                        maxLength={10}
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <Label htmlFor="interaction-description">Descrição</Label>
                                <Textarea
                                    id="interaction-description"
                                    value={interactionDescription}
                                    onChange={(e) => setInteractionDescription(e.target.value)}
                                    placeholder="Descreva a interação"
                                    rows={4}
                                />
                            </div>
                            <Button onClick={handleAddInteraction} className="mt-4">
                                Adicionar Interação
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Interações com a Família</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {interactions.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Tipo</TableHead>
                                                <TableHead>Data</TableHead>
                                                <TableHead>Descrição</TableHead>
                                                <TableHead>Criado por</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {interactions.map((interaction: FamilyInteraction) => (
                                                <TableRow key={interaction.id}>
                                                    <TableCell>{interaction.type}</TableCell>
                                                    <TableCell>{interaction.date}</TableCell>
                                                    <TableCell>{interaction.description}</TableCell>
                                                    <TableCell>{interaction.createdBy}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Nenhuma interação registrada.</p>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}