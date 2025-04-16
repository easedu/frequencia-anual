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
import { doc, getDoc, collection, addDoc, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { headerImageBase64 } from "@/assets/headerImage";

// Tipos e Interfaces
interface Contato {
    nome: string;
    telefone: string;
}

interface Student {
    estudanteId: string;
    nome: string;
    turma: string;
    status: string;
    bolsaFamilia: string;
    contatos?: Contato[];
}

interface StudentRecord {
    estudanteId: string;
    turma: string;
    nome: string;
    faltasB1: number;
    faltasB2: number;
    faltasB3: number;
    faltasB4: number;
    totalFaltas: number;
    totalFaltasAteHoje: number;
    percentualFaltas: number;
    percentualFaltasAteHoje: number;
    percentualFrequencia: number;
    percentualFrequenciaAteHoje: number;
    diasLetivosAteHoje: number;
    diasLetivosB1: number;
    diasLetivosB2: number;
    diasLetivosB3: number;
    diasLetivosB4: number;
    diasLetivosAnual: number;
}

interface FamilyInteraction {
    id: string;
    type: string;
    date: string;
    description: string;
    createdBy: string;
}

interface AbsenceRecord {
    estudanteId: string;
    data: string;
}

interface BimesterDate {
    date: string;
    isChecked: boolean;
}

interface BimesterData {
    dates: BimesterDate[];
    startDate: string;
    endDate: string;
}

interface AnoLetivoData {
    "1º Bimestre": BimesterData;
    "2º Bimestre": BimesterData;
    "3º Bimestre": BimesterData;
    "4º Bimestre": BimesterData;
}

interface BimesterDates {
    [key: number]: { start: string; end: string };
}

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

function formatPhoneNumber(value: string | undefined): string {
    if (!value) return '';
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
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

function getBimesterByDate(dateStr: string, bimesterDates: BimesterDates): number {
    const date = parseDate(dateStr);
    if (!date || isNaN(date.getTime())) return 0;

    for (const [bimester, { start, end }] of Object.entries(bimesterDates)) {
        const startDate = parseDate(start);
        const endDate = parseDate(end);
        if (startDate && endDate && date >= startDate && date <= endDate) {
            return Number(bimester);
        }
    }
    return 0;
}

function getFrequencyColor(percentual: number): string {
    if (percentual >= 81 && percentual <= 100) return "text-green-600 text-center";
    else if (percentual >= 75 && percentual <= 80) return "text-yellow-600 text-center";
    else return "text-red-600 text-center";
}

const calculateDiasLetivos = async (start: string, end: string): Promise<{ ateHoje: number; b1: number; b2: number; b3: number; b4: number; anual: number }> => {
    try {
        const docRef = doc(db, "2025", "ano_letivo");
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            return { ateHoje: 0, b1: 0, b2: 0, b3: 0, b4: 0, anual: 0 };
        }

        const anoData = docSnap.data() as AnoLetivoData;
        const startDateObj = parseDate(start);
        const endDateObj = parseDate(end) || new Date();
        if (!startDateObj || !endDateObj) {
            return { ateHoje: 0, b1: 0, b2: 0, b3: 0, b4: 0, anual: 0 };
        }

        let totalAteHoje = 0;
        const totalsByBimester: { b1: number; b2: number; b3: number; b4: number } = { b1: 0, b2: 0, b3: 0, b4: 0 };

        const bimesters: (keyof AnoLetivoData)[] = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
        for (let i = 0; i < bimesters.length; i++) {
            const bimesterKey: keyof AnoLetivoData = bimesters[i];
            if (anoData[bimesterKey]?.dates) {
                const bimesterCount = anoData[bimesterKey].dates.filter((d: BimesterDate) => {
                    const date = parseDate(d.date);
                    return d.isChecked && date && date >= startDateObj && date <= endDateObj;
                }).length;
                if (i === 0) totalsByBimester.b1 = bimesterCount;
                if (i === 1) totalsByBimester.b2 = bimesterCount;
                if (i === 2) totalsByBimester.b3 = bimesterCount;
                if (i === 3) totalsByBimester.b4 = bimesterCount;
                totalAteHoje += bimesterCount;
            }
        }

        const totalAnual = totalsByBimester.b1 + totalsByBimester.b2 + totalsByBimester.b3 + totalsByBimester.b4;

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
};

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
    const [, setLoadingStudents] = useState<boolean>(true);
    const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
    const [searchName, setSearchName] = useState<string>("");
    const [suggestions, setSuggestions] = useState<Student[]>([]);
    const [bimesterDates, setBimesterDates] = useState<BimesterDates>({});
    const interactionCardRef = useRef<HTMLDivElement>(null);

    const auth = getAuth();

    const fetchAllStudents = useCallback(async (): Promise<void> => {
        try {
            setLoadingStudents(true);
            const studentDoc = await getDoc(doc(db, "2025", "lista_de_estudantes"));
            if (studentDoc.exists()) {
                const studentData = studentDoc.data() as { estudantes: Student[] };
                const activeStudents = studentData.estudantes
                    .filter(s => s.status === "ATIVO")
                    .map(student => ({
                        ...student,
                        contatos: student.contatos || [],
                    }));
                setAllStudents(activeStudents.sort((a, b) => a.nome.localeCompare(b.nome)));
            }
        } catch (error) {
            console.error("Erro ao buscar lista de estudantes:", error);
        } finally {
            setLoadingStudents(false);
        }
    }, []);

    const fetchBimesterDates = useCallback(async () => {
        try {
            const docRef = doc(db, "2025", "ano_letivo");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const anoData = docSnap.data() as AnoLetivoData;
                const dates: BimesterDates = {
                    1: { start: anoData["1º Bimestre"]?.startDate || "01/01/2025", end: anoData["1º Bimestre"]?.endDate || "31/12/2025" },
                    2: { start: anoData["2º Bimestre"]?.startDate || "01/01/2025", end: anoData["2º Bimestre"]?.endDate || "31/12/2025" },
                    3: { start: anoData["3º Bimestre"]?.startDate || "01/01/2025", end: anoData["3º Bimestre"]?.endDate || "31/12/2025" },
                    4: { start: anoData["4º Bimestre"]?.startDate || "01/01/2025", end: anoData["4º Bimestre"]?.endDate || "31/12/2025" },
                };
                setBimesterDates(dates);
            }
        } catch (error) {
            console.error("Erro ao buscar períodos dos bimestres:", error);
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

            // Calcular dias letivos até hoje
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate = parseDate(bimesterDates[1]?.start) || new Date(2025, 0, 1);
            const diasLetivos = await calculateDiasLetivos(startDate.toLocaleDateString("pt-BR"), today.toLocaleDateString("pt-BR"));

            const faltasB1 = absenceRecords.filter((d: AbsenceRecord) => getBimesterByDate(d.data, bimesterDates) === 1).length;
            const faltasB2 = absenceRecords.filter((d: AbsenceRecord) => getBimesterByDate(d.data, bimesterDates) === 2).length;
            const faltasB3 = absenceRecords.filter((d: AbsenceRecord) => getBimesterByDate(d.data, bimesterDates) === 3).length;
            const faltasB4 = absenceRecords.filter((d: AbsenceRecord) => getBimesterByDate(d.data, bimesterDates) === 4).length;
            const totalFaltas = faltasB1 + faltasB2 + faltasB3 + faltasB4;

            const totalFaltasAteHoje = absenceRecords.filter((record: AbsenceRecord) => {
                const date = parseDate(record.data);
                return date !== null && date >= startDate && date <= today;
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
    }, [allStudents, bimesterDates]);

    useEffect(() => {
        fetchAllStudents();
        fetchBimesterDates();
    }, [fetchAllStudents, fetchBimesterDates]);

    useEffect(() => {
        if (selectedStudentId && Object.keys(bimesterDates).length > 0) {
            fetchStudentData(selectedStudentId);
        }
    }, [selectedStudentId, fetchStudentData, bimesterDates]);

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

    const handleSearchName = (value: string) => {
        setSearchName(value);
        setSelectedTurma("");
        setSelectedStudentId("");
        if (value.length > 0) {
            const filtered = allStudents
                .filter((student) => student.nome.toLowerCase().includes(value.toLowerCase()))
                .slice(0, 5);
            setSuggestions(filtered);
        } else {
            setSuggestions([]);
        }
    };

    const handleSuggestionSelect = (studentId: string) => {
        setSelectedStudentId(studentId);
        setSearchName(allStudents.find((s) => s.estudanteId === studentId)?.nome || "");
        setSuggestions([]);
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

    const handlePrintReport = () => {
        if (!student || !studentRecord) return;

        const order = [
            'Contato telefônico',
            'Contato digital',
            'Conversa com a família',
            'Visita domiciliar da ABAE',
            'Carta registrada',
            'Conselho tutelar',
            'Desligamento',
            'Justificativa da família',
            'Observações'
        ] as const;

        const consolidatedInteractions = interactions.reduce((acc, curr) => {
            if (!acc[curr.type]) acc[curr.type] = [];
            acc[curr.type].push(`${curr.date}: ${curr.description}`);
            return acc;
        }, {} as Record<string, string[]>);

        const sortedInteractions: Record<string, string[]> = Object.fromEntries(
            order
                .map(type => [type, consolidatedInteractions[type] || []])
                .filter(([, value]) => value.length > 0)
        );

        const reportContent = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="data:image/png;base64,${headerImageBase64}" alt="Cabeçalho" style="max-width: 100%; height: auto;" />
                </div>
                <h1 style="text-align: center; font-weight: bold; text-decoration: underline; font-size: 12px;">Comunicado de frequência abaixo de 75%</h1>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <p><strong>Nome:</strong> ${student.nome}</p>
                    <p><strong>Ano:</strong> ${student.turma}</p>
                </div>
                <p><strong>Frequência atual:</strong> ${studentRecord.percentualFrequenciaAteHoje}%</p>
                <p><strong>Faltas:</strong> ${studentRecord.totalFaltasAteHoje}</p>
                <h2 style="text-align: center; font-weight: bold; text-decoration: underline;">Providências da escola</h2>
                ${Object.entries(sortedInteractions).map(([type, entries]) => `
                        <h3 style="text-align: justify; font-size: 12px;">${type}: </h3>
                        <ul style="text-align: justify; font-size: 12px;">${entries.map(entry => `<li>${entry}</li>`).join('')}</ul>
                    `).join('') || '<p>Nenhuma providência registrada.</p>'
            }
                <div style="margin-top: 40px;">
                    <p>Eu, responsável pela criança/adolescente identificado(a) acima, estou ciente que:</p>
                    <ul style="list-style-type: disc; margin-left: 20px;">
                        <li style="text-align: justify; font-size: 12px;">A <strong>frequência mínima</strong> para garantir a aprovação dos alunos é definida em <strong>75%</strong> de presença nas atividades escolares, conforme estipulado pela LDB e regulamentado pelas instituições de ensino.</li>
                        <li style="text-align: justify; font-size: 12px;">O <strong>Artigo 55 do Estatuto da Criança e do Adolescente (ECA)</strong> aborda o direito à educação, prevendo que a falta de frequência escolar injustificada pode levar à aplicação de medidas de proteção, inclusive com o envolvimento do Conselho Tutelar para garantir a frequência e o direito à educação.</li>
                        <li style="text-align: justify; font-size: 12px;">A <strong>obrigação de garantir a frequência escolar</strong> recai sobre os pais ou responsáveis. Caso a criança ou adolescente tenha faltas <strong>frequentes ou injustificadas</strong>, as escolas devem comunicar o fato às autoridades competentes, como o <strong>Conselho Tutelar</strong>, para que sejam tomadas providências.</li>
                        <li style="text-align: justify; font-size: 12px;">Segundo o Artigo 31 da IN SME Nº 26/2023, a <strong>matrícula será cancelada</strong>, após 15 (quinze) dias de faltas consecutivas, sem justificativas e esgotadas todas as possibilidades de contato com a família, responsáveis ou o próprio estudante.</li>
                        <li style="text-align: justify; font-size: 12px;">O <strong>aprendizado</strong> é um direito da criança e do adolescente e é função da família garantir este direito.</li>
                    </ul>
                    <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                        <p>Ciente: _______________________________</p>
                        <p>Data: _____ /______ /__________</p>
                    </div>
                </div>
            `;

        // Cria um iframe oculto
        const printFrame = document.createElement('iframe');
        printFrame.style.display = 'none';
        document.body.appendChild(printFrame);

        // Escreve o conteúdo no iframe
        const printDoc = printFrame.contentWindow?.document;
        printDoc?.open();
        printDoc?.write(`
                <html>
                    <head>
                        <title>Relatório do Aluno - ${student.nome}</title>
                        <meta name="title" content="Relatório do Aluno - ${student.nome}">
                        <style>
                            body { font-family: Arial, sans-serif; padding: 14px; }
                            h1 { font-size: 12px; }
                            h2 { font-size: 12px; }
                            h3 { font-size: 12px; margin-bottom: 5px; }
                            ul { margin: 0 0 10px 20px; }
                            p { margin: 5px 0; font-size: 12px; }
                            div, p, h3 { width: 100%; }
                        </style>
                    </head>
                    <body>${reportContent}</body>
                </html>
            `);
        printDoc?.close();

        // Aguarda o carregamento e dispara a impressão
        printFrame.contentWindow?.focus();
        setTimeout(() => {
            printFrame.contentWindow?.print();
            document.body.removeChild(printFrame);
        }, 100);
    };

    return (
        <div className="p-4 space-y-6">
            <Toaster />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Buscar por Nome</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                                <Label htmlFor="select-turma">Estudante</Label>
                                <Input
                                    value={searchName}
                                    onChange={(e) => handleSearchName(e.target.value)}
                                    placeholder="Digite o nome do estudante"
                                    autoComplete="off"
                                />
                                {suggestions.length > 0 && (
                                    <div className="absolute z-10 bg-white border rounded-md mt-1 w-full max-h-40 overflow-y-auto">
                                        {suggestions.map((student) => (
                                            <div
                                                key={student.estudanteId}
                                                className="p-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={() => handleSuggestionSelect(student.estudanteId)}
                                            >
                                                {student.nome} ({student.turma})
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Buscar por Turma/Estudante</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                                <Label htmlFor="select-turma">Turma</Label>
                                <Select
                                    onValueChange={(value: string) => {
                                        setSelectedTurma(value);
                                        setSelectedStudentId("");
                                        setSearchName("");
                                        setSuggestions([]);
                                    }}
                                    value={selectedTurma}
                                    disabled={searchName.length > 0}
                                >
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
                                    disabled={!selectedTurma || searchName.length > 0}
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
                    </CardContent>
                </Card>
            </div>

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
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <div>
                                    <Label>Nome</Label>
                                    <p className="text-lg font-semibold">{student.nome}</p>
                                </div>
                                <div>
                                    <Label>Turma</Label>
                                    <p className="text-lg font-semibold">{student.turma}</p>
                                </div>
                                <div>
                                    <Label>Bolsa Família</Label>
                                    <p className="text-lg font-semibold">{student.bolsaFamilia}</p>
                                </div>
                                <div>
                                    <Label>Status</Label>
                                    <p className="text-lg font-semibold">{student.status}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
                                <div>
                                    <Label>Contatos</Label>
                                    <p className="text-lg font-semibold">
                                        {student.contatos && student.contatos.length > 0
                                            ? student.contatos
                                                .map((contato) => `${contato.nome}: ${formatPhoneNumber(contato.telefone)}`)
                                                .join(" / ")
                                            : "Nenhum"}
                                    </p>
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
                            {absences.length > 0 && Object.keys(bimesterDates).length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2 text-center">1º Bimestre</h3>
                                        {absences.filter((date: string) => getBimesterByDate(date, bimesterDates) === 1).map((date: string, index: number) => (
                                            <p key={index} className="text-sm text-center">{date}</p>
                                        ))}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2 text-center">2º Bimestre</h3>
                                        {absences.filter((date: string) => getBimesterByDate(date, bimesterDates) === 2).map((date: string, index: number) => (
                                            <p key={index} className="text-sm text-center">{date}</p>
                                        ))}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2 text-center">3º Bimestre</h3>
                                        {absences.filter((date: string) => getBimesterByDate(date, bimesterDates) === 3).map((date: string, index: number) => (
                                            <p key={index} className="text-sm text-center">{date}</p>
                                        ))}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2 text-center">4º Bimestre</h3>
                                        {absences.filter((date: string) => getBimesterByDate(date, bimesterDates) === 4).map((date: string, index: number) => (
                                            <p key={index} className="text-sm text-center">{date}</p>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center">Nenhuma falta registrada ou períodos de bimestre não carregados.</p>
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
                                            <SelectItem value="Justificativa da família">Justificativa da família</SelectItem>
                                            <SelectItem value="Observações">Observações</SelectItem>
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
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle>Histórico de Interações com a Família</CardTitle>
                            <Button onClick={handlePrintReport} disabled={!student || !studentRecord}>
                                Imprimir Relatório
                            </Button>
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