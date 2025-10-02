"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    doc,
    getDoc,
    getDocs,
    query,
    where,
    writeBatch,
    collection,
} from "firebase/firestore";
import { db, auth } from "@/firebase.config";
import { logger } from "@/utils/logger";
import { FIREBASE_PATHS } from "@/config/constants";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast, Toaster } from "sonner";
import { useStudents, Estudante } from "@/hooks/useStudents";
import { scheduleSync } from "@/lib/serviceWorker";
import { useServiceWorkerContext } from "@/components/ServiceWorkerProvider";
import {
    Calendar,
    Users,
    UserCheck,
    UserX,
    Save,
    AlertCircle,
    School,
    CheckCircle2,
    Clock,
    User,
    WifiOff,
    FileText
} from "lucide-react";

// Constantes para coleções e documentos
const ACADEMIC_YEAR = "2025";
const DOC_ACADEMIC_YEAR = "ano_letivo";
const COLLECTION_FALTAS = "faltas";
const SUBCOLLECTION_CONTROLE = "controle";

// Define os tipos possíveis para o perfil do usuário
type Role = "admin" | "super-user" | "user";

// Interfaces
interface AcademicYearData {
    [bimester: string]: {
        startDate?: string;
        endDate?: string;
        dates?: { date: string; isChecked: boolean }[];
    };
}

interface Atestado {
    id: string;
    startDate: string;
    days: number;
    description: string;
    createdBy: string;
}

interface Suspensao {
    id: string;
    startDate: string;
    days: number;
    description: string;
    createdBy: string;
}

// Funções auxiliares para datas
function padTo2Digits(num: number): string {
    return num.toString().padStart(2, "0");
}

function formatDateToDDMMYYYY(date: Date): string {
    return [
        padTo2Digits(date.getDate()),
        padTo2Digits(date.getMonth() + 1),
        date.getFullYear(),
    ].join("/");
}

function convertToISO(dateStr: string): string {
    const [day, month, year] = dateStr.split("/");
    return `${year}-${month}-${day}`;
}

// Função auxiliar para converter data para DD/MM/YYYY
function convertDateToDDMMYYYY(dateStr: string): string {
    // Se já está em DD/MM/YYYY, retorna
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        return dateStr;
    }

    // Se está em YYYY-MM-DD (ISO), converte para DD/MM/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }

    // Formato desconhecido, retorna como está
    return dateStr;
}

// Função para extrair as datas válidas (isChecked === true) do ano letivo
function getValidDates(academicYearData: AcademicYearData | null, role: Role | null): string[] {
    if (!academicYearData) return [];

    const validDates: string[] = [];
    Object.values(academicYearData).forEach((bimData) => {
        bimData?.dates?.forEach((d) => {
            if (d.isChecked) {
                const formattedDate = convertDateToDDMMYYYY(d.date);
                validDates.push(formattedDate);
            }
        });
    });

    const today = new Date();
    const sortedDates = validDates
        .map((date) => {
            const parts = date.split("/");
            if (parts.length !== 3) return null;

            const [day, month, year] = parts.map(Number);
            if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

            return { date, timestamp: new Date(year, month - 1, day).getTime() };
        })
        .filter((d): d is { date: string; timestamp: number } => d !== null)
        .sort((a, b) => a.timestamp - b.timestamp);

    const todayTimestamp = today.getTime();
    const filteredDates = sortedDates.filter(
        (d) => d.timestamp <= todayTimestamp
    );

    // Para perfil "user", retorna apenas os últimos 5 dias letivos
    if (role === "user") {
        return filteredDates.slice(-5).map((d) => d.date);
    }

    // Para outros perfis, retorna todas as datas válidas
    return filteredDates.map((d) => d.date);
}

export default function MarcarFaltasPage() {
    const router = useRouter();
    const { students, loading } = useStudents();
    const { isOnline } = useServiceWorkerContext();

    // Estados para dados e UI
    const [academicYearData, setAcademicYearData] = useState<AcademicYearData | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [isValidDay, setIsValidDay] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [existingAbsences, setExistingAbsences] = useState<{ [key: string]: boolean }>({});
    const [markedAbsences, setMarkedAbsences] = useState<{ [key: string]: boolean }>({});
    const [, setExistingAbsenceDocs] = useState<{ [key: string]: string }>({});
    const [openDialog, setOpenDialog] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Estado para o perfil do usuário
    const [role, setRole] = useState<Role | null>(null);

    // Estados para atestados e suspensões
    const [atestados, setAtestados] = useState<Map<string, Atestado[]>>(new Map());
    const [suspensoes, setSuspensoes] = useState<Map<string, Suspensao[]>>(new Map());

    // Função helper para verificar se uma data está coberta por atestado ou suspensão
    const checkCoverageForStudent = (studentId: string, dateStr: string): { hasAtestado: boolean; hasSuspensao: boolean; atestado?: Atestado; suspensao?: Suspensao } => {
        const studentAtestados = atestados.get(studentId) || [];
        const studentSuspensoes = suspensoes.get(studentId) || [];

        // Converter data DD/MM/YYYY para Date
        const [day, month, year] = dateStr.split('/').map(Number);
        const checkDate = new Date(year, month - 1, day);
        checkDate.setHours(0, 0, 0, 0);

        // Verificar atestados
        for (const atestado of studentAtestados) {
            const [aDay, aMonth, aYear] = atestado.startDate.split('/').map(Number);
            const startDate = new Date(aYear, aMonth - 1, aDay);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + atestado.days - 1);

            if (checkDate >= startDate && checkDate <= endDate) {
                return { hasAtestado: true, hasSuspensao: false, atestado };
            }
        }

        // Verificar suspensões
        for (const suspensao of studentSuspensoes) {
            const [sDay, sMonth, sYear] = suspensao.startDate.split('/').map(Number);
            const startDate = new Date(sYear, sMonth - 1, sDay);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + suspensao.days - 1);

            if (checkDate >= startDate && checkDate <= endDate) {
                return { hasAtestado: false, hasSuspensao: true, suspensao };
            }
        }

        return { hasAtestado: false, hasSuspensao: false };
    };

    // Carrega dados do ano letivo
    useEffect(() => {
        const fetchAcademicYearData = async () => {
            try {
                const docRef = doc(db, ACADEMIC_YEAR, DOC_ACADEMIC_YEAR);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as AcademicYearData;
                    setAcademicYearData(data);
                } else {
                    setErrorMessage("Dados do ano letivo não encontrados.");
                }
            } catch (error) {
                logger.error("Erro ao carregar ano letivo", error as Error);
                setErrorMessage("Erro ao carregar dados do ano letivo.");
            }
        };
        fetchAcademicYearData();
    }, []);

    // Define a data atual
    useEffect(() => {
        const today = new Date();
        setSelectedDate(formatDateToDDMMYYYY(today));
    }, []);

    // Verifica se a data atual é válida para marcação
    useEffect(() => {
        if (academicYearData && selectedDate) {
            let valid = false;
            Object.values(academicYearData).forEach((bimData) => {
                if (bimData?.dates) {
                    const found = bimData.dates.find((d) => {
                        // Converte a data do Firebase (ISO) para DD/MM/YYYY antes de comparar
                        const dateFormatted = convertDateToDDMMYYYY(d.date);
                        return dateFormatted === selectedDate && d.isChecked;
                    });
                    if (found) valid = true;
                }
            });
            setIsValidDay(valid);
            setErrorMessage(valid ? "" : "O dia selecionado não está disponível para marcação de faltas.");
        }
    }, [academicYearData, selectedDate]);

    // Obtém o perfil do usuário do Firestore
    useEffect(() => {
        const fetchUserRole = async () => {
            try {
                const uid = auth.currentUser?.uid;
                if (!uid) {
                    logger.warn("Usuário não autenticado");
                    return;
                }
                const q = query(collection(db, "users"), where("uid", "==", uid));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const data = querySnapshot.docs[0].data();
                    const userRole = (data.perfil as Role) || "user";
                    setRole(userRole);
                    logger.info("Perfil do usuário carregado:", { role: userRole });
                } else {
                    setRole("user");
                    logger.info("Usuário não encontrado, definindo perfil padrão como 'user'");
                }
            } catch (error) {
                logger.error("Erro ao buscar usuário", error as Error);
                setRole("user");
            }
        };

        fetchUserRole();
    }, []);

    // Carrega atestados e suspensões quando a turma for selecionada
    useEffect(() => {
        const loadAtestadosESuspensoes = async () => {
            if (!selectedClass) return;

            try {
                const newAtestados = new Map<string, Atestado[]>();
                const newSuspensoes = new Map<string, Suspensao[]>();

                // Filtrar alunos da turma
                const studentsInClass = students.filter(
                    (est: Estudante) => est.status === "ATIVO" && est.turma === selectedClass
                );

                if (studentsInClass.length === 0) return;

                // Buscar atestados e suspensões para cada aluno da turma
                for (const student of studentsInClass) {
                    // Buscar atestados
                    const atestadosSnapshot = await getDocs(collection(db, FIREBASE_PATHS.medicalCertificates(student.estudanteId)));
                    const studentAtestados: Atestado[] = atestadosSnapshot.docs.map((doc) => {
                        const data = doc.data();
                        // Converter de YYYY-MM-DD para DD/MM/YYYY
                        const dateISO = data.startDate as string;
                        let formattedDate = dateISO;
                        if (dateISO.includes('-')) {
                            const [year, month, day] = dateISO.split('-');
                            formattedDate = `${day}/${month}/${year}`;
                        }
                        return {
                            id: doc.id,
                            startDate: formattedDate,
                            days: data.days as number,
                            description: data.description as string,
                            createdBy: data.createdBy as string || "Não informado",
                        };
                    });

                    // Buscar suspensões
                    const suspensoesSnapshot = await getDocs(collection(db, FIREBASE_PATHS.suspensions(student.estudanteId)));
                    const studentSuspensoes: Suspensao[] = suspensoesSnapshot.docs.map((doc) => {
                        const data = doc.data();
                        // Converter de YYYY-MM-DD para DD/MM/YYYY
                        const dateISO = data.startDate as string;
                        let formattedDate = dateISO;
                        if (dateISO.includes('-')) {
                            const [year, month, day] = dateISO.split('-');
                            formattedDate = `${day}/${month}/${year}`;
                        }
                        return {
                            id: doc.id,
                            startDate: formattedDate,
                            days: data.days as number,
                            description: data.description as string,
                            createdBy: data.createdBy as string || "Não informado",
                        };
                    });

                    if (studentAtestados.length > 0) {
                        newAtestados.set(student.estudanteId, studentAtestados);
                    }
                    if (studentSuspensoes.length > 0) {
                        newSuspensoes.set(student.estudanteId, studentSuspensoes);
                    }
                }

                setAtestados(newAtestados);
                setSuspensoes(newSuspensoes);
            } catch (error) {
                logger.error("Erro ao carregar atestados e suspensões", error as Error);
            }
        };

        loadAtestadosESuspensoes();
    }, [selectedClass, students]);

    // Carrega faltas existentes sempre que turma ou data mudam
    useEffect(() => {
        const loadAbsences = async () => {
            if (!selectedClass || !selectedDate) return;
            const formattedDate = convertToISO(selectedDate);
            try {
                const controleColRef = collection(db, ACADEMIC_YEAR, COLLECTION_FALTAS, SUBCOLLECTION_CONTROLE);
                const q = query(
                    controleColRef,
                    where("turma", "==", selectedClass),
                    where("data", "==", formattedDate)
                );
                const querySnapshot = await getDocs(q);
                const newExistingAbsences: { [key: string]: boolean } = {};
                const newExistingAbsenceDocs: { [key: string]: string } = {};
                querySnapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    const studentId = data.estudanteId;
                    newExistingAbsences[studentId] = true;
                    newExistingAbsenceDocs[studentId] = docSnap.id;
                });
                setExistingAbsences(newExistingAbsences);
                setExistingAbsenceDocs(newExistingAbsenceDocs);
                setMarkedAbsences(newExistingAbsences);
            } catch (error) {
                logger.error("Erro ao carregar faltas existentes", error as Error);
            }
        };

        loadAbsences();
    }, [selectedClass, selectedDate]);

    // Memoriza a lista de turmas para evitar cálculos desnecessários
    const turmas = useMemo(() => {
        return Array.from(
            new Set(
                students
                    .filter((est: Estudante) => est.status === "ATIVO")
                    .map((est: Estudante) => est.turma)
                    .filter(turma => turma && turma.trim() !== '') // Remove turmas vazias
            )
        );
    }, [students]);

    const filteredStudents = useMemo(() => {
        return students.filter(
            (est: Estudante) => est.status === "ATIVO" && est.turma === selectedClass
        );
    }, [students, selectedClass]);

    // Calcula se houve mudanças em relação ao estado inicial
    const hasChanges = useMemo(() => {
        return filteredStudents.some((est: Estudante) => {
            const current = !!markedAbsences[est.estudanteId];
            const initial = !!existingAbsences[est.estudanteId];
            return current !== initial;
        });
    }, [filteredStudents, markedAbsences, existingAbsences]);

    // Para perfis "user" continuamos usando hasSelection para adição
    const hasSelection = useMemo(() => {
        return filteredStudents.some((est: Estudante) => markedAbsences[est.estudanteId]);
    }, [filteredStudents, markedAbsences]);

    // Determina se o botão de salvar deve ficar habilitado
    const canSave = role === "user" ? hasSelection : hasChanges;

    // Conta estatísticas
    const totalStudents = filteredStudents.length;
    const presentStudents = filteredStudents.filter(est => !markedAbsences[est.estudanteId]).length;
    const absentStudents = filteredStudents.filter(est => markedAbsences[est.estudanteId]).length;

    // Alterna ausência do aluno (respeitando restrições de perfil)
    const handleCheckboxChange = (studentId: string) => {
        if (role === "user" && existingAbsences[studentId]) return;
        setMarkedAbsences((prev) => ({
            ...prev,
            [studentId]: !prev[studentId],
        }));
    };

    // Função auxiliar para salvar offline
    const saveAbsencesOffline = async () => {
        const formattedDate = convertToISO(selectedDate);
        
        // Preparar dados para sincronização
        const attendanceData = {
            date: formattedDate,
            class: selectedClass,
            absences: filteredStudents
                .filter(est => markedAbsences[est.estudanteId])
                .map(est => ({
                    estudanteId: est.estudanteId,
                    nome: est.nome,
                    turma: selectedClass,
                    data: formattedDate
                })),
            role,
            timestamp: new Date().toISOString()
        };

        // Agendar para sincronização
        await scheduleSync('attendance', attendanceData);
        
        toast.success("Faltas salvas offline! Serão sincronizadas quando voltar a conexão.", {
            description: `${attendanceData.absences.length} ausência(s) registrada(s)`
        });

        // Atualizar estado local para refletir as mudanças
        setExistingAbsences(prev => ({
            ...prev,
            ...Object.fromEntries(
                attendanceData.absences.map(absence => [absence.estudanteId, true])
            )
        }));
        
        setMarkedAbsences(prev => ({
            ...prev,
            ...Object.fromEntries(
                attendanceData.absences.map(absence => [absence.estudanteId, true])
            )
        }));
    };

    // Salva faltas evitando duplicatas
    const handleSaveAbsences = async () => {
        setIsSaving(true);
        
        try {
            if (!isOnline) {
                await saveAbsencesOffline();
                setOpenDialog(false);
                return;
            }

            const formattedDate = convertToISO(selectedDate);
            const batch = writeBatch(db);
            const controleColRef = collection(db, ACADEMIC_YEAR, COLLECTION_FALTAS, SUBCOLLECTION_CONTROLE);

            // Carrega novamente as faltas existentes para evitar duplicatas concorrentes
            const q = query(
                controleColRef,
                where("turma", "==", selectedClass),
                where("data", "==", formattedDate)
            );
            const querySnapshot = await getDocs(q);
            const currentAbsences: { [key: string]: string } = {};
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                currentAbsences[data.estudanteId] = docSnap.id;
            });

            if (role === "user") {
                // Para "user", apenas adiciona novas faltas, ignorando existentes
                filteredStudents.forEach((est: Estudante) => {
                    if (markedAbsences[est.estudanteId] && !currentAbsences[est.estudanteId]) {
                        const absenceData = {
                            estudanteId: est.estudanteId,
                            data: formattedDate,
                            turma: selectedClass,
                        };
                        const newDocRef = doc(controleColRef);
                        batch.set(newDocRef, absenceData);
                    }
                });
            } else {
                // Para "admin" ou "super-user", adiciona ou remove faltas
                filteredStudents.forEach((est: Estudante) => {
                    const currentlyMarked = markedAbsences[est.estudanteId] || false;
                    const previouslyMarked = !!currentAbsences[est.estudanteId];

                    if (currentlyMarked && !previouslyMarked) {
                        // Adiciona nova falta apenas se não existir
                        const absenceData = {
                            estudanteId: est.estudanteId,
                            data: formattedDate,
                            turma: selectedClass,
                        };
                        const newDocRef = doc(controleColRef);
                        batch.set(newDocRef, absenceData);
                    } else if (!currentlyMarked && previouslyMarked) {
                        // Remove falta existente
                        const docId = currentAbsences[est.estudanteId];
                        if (docId) {
                            const docRef = doc(db, ACADEMIC_YEAR, COLLECTION_FALTAS, SUBCOLLECTION_CONTROLE, docId);
                            batch.delete(docRef);
                        }
                    }
                });
            }

            await batch.commit();
            toast.success("Faltas salvas com sucesso!");
            setOpenDialog(false);

            // Atualiza o estado após salvar
            const newExistingAbsences: { [key: string]: boolean } = {};
            const newExistingAbsenceDocs: { [key: string]: string } = {};
            const updatedSnapshot = await getDocs(q);
            updatedSnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                newExistingAbsences[data.estudanteId] = true;
                newExistingAbsenceDocs[data.estudanteId] = docSnap.id;
            });
            setExistingAbsences(newExistingAbsences);
            setExistingAbsenceDocs(newExistingAbsenceDocs);
            setMarkedAbsences(newExistingAbsences);
        } catch (error) {
            logger.error("Erro ao salvar faltas", error as Error);
            toast.error("Erro ao salvar faltas.");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Carregando dados...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Toaster />

            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Marcação de Faltas</h1>
                    <p className="text-gray-600">Gerencie a presença dos estudantes</p>
                    
                    {/* Indicador de modo offline */}
                    {!isOnline && (
                        <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-orange-100 border border-orange-200 rounded-full text-orange-700">
                            <WifiOff className="w-4 h-4" />
                            <span className="text-sm font-medium">Modo Offline - Os dados serão sincronizados automaticamente</span>
                        </div>
                    )}
                </div>

                {/* Controles */}
                <Card className="shadow-lg border-0">
                    <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-lg">
                        <CardTitle className="text-lg flex items-center space-x-2">
                            <School className="w-5 h-5" />
                            <span>Controles de Marcação</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Seletor de Data */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                    <Calendar className="w-4 h-4 text-blue-600" />
                                    <span>Data da Aula</span>
                                </Label>
                                <Select onValueChange={setSelectedDate} value={selectedDate}>
                                    <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors">
                                        <SelectValue placeholder="Selecione a data" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {getValidDates(academicYearData, role).map((date) => (
                                            <SelectItem key={date} value={date} className="py-2 text-sm">
                                                <div className="flex items-center space-x-2">
                                                    <Calendar className="w-3 h-3 text-gray-500" />
                                                    <span>{date}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Seletor de Turma */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                    <Users className="w-4 h-4 text-blue-600" />
                                    <span>Turma</span>
                                </Label>
                                <Select onValueChange={setSelectedClass} value={selectedClass}>
                                    <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors">
                                        <SelectValue placeholder="Selecione a turma" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {turmas
                                            .sort((a, b) => a.localeCompare(b))
                                            .map((turma) => (
                                                <SelectItem key={turma} value={turma} className="py-2 text-sm">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                        <span>{turma}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>


                    </CardContent>
                </Card>

                {/* Mensagem de Erro */}
                {errorMessage && (
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2 text-red-700">
                                <AlertCircle className="w-5 h-5" />
                                <p className="font-medium">{errorMessage}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Estatísticas Compactas */}
                {isValidDay && selectedClass && filteredStudents.length > 0 && (
                    <Card className="shadow-lg border-0">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-center space-x-8">
                                <div className="text-center">
                                    <div className="flex items-center justify-center space-x-2 mb-1">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                            <Users className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <span className="text-xl font-bold text-gray-800">{totalStudents}</span>
                                    </div>
                                    <p className="text-xs text-gray-600">Total</p>
                                </div>

                                <div className="text-center">
                                    <div className="flex items-center justify-center space-x-2 mb-1">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                            <UserCheck className="w-4 h-4 text-green-600" />
                                        </div>
                                        <span className="text-xl font-bold text-gray-800">{presentStudents}</span>
                                    </div>
                                    <p className="text-xs text-gray-600">Presentes</p>
                                </div>

                                <div className="text-center">
                                    <div className="flex items-center justify-center space-x-2 mb-1">
                                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                            <UserX className="w-4 h-4 text-red-600" />
                                        </div>
                                        <span className="text-xl font-bold text-gray-800">{absentStudents}</span>
                                    </div>
                                    <p className="text-xs text-gray-600">Ausentes</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Estatísticas */}
                {isValidDay && selectedClass && filteredStudents.length > 0 && (
                    <div className="grid grid-cols-3 gap-4">
                        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                            <CardContent className="p-4 text-center">
                                <div className="flex items-center justify-center space-x-2 mb-2">
                                    <Users className="w-5 h-5" />
                                    <span className="text-2xl font-bold">{totalStudents}</span>
                                </div>
                                <p className="text-sm text-blue-100">Total de Alunos</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                            <CardContent className="p-4 text-center">
                                <div className="flex items-center justify-center space-x-2 mb-2">
                                    <UserCheck className="w-5 h-5" />
                                    <span className="text-2xl font-bold">{presentStudents}</span>
                                </div>
                                <p className="text-sm text-green-100">Presentes</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                            <CardContent className="p-4 text-center">
                                <div className="flex items-center justify-center space-x-2 mb-2">
                                    <UserX className="w-5 h-5" />
                                    <span className="text-2xl font-bold">{absentStudents}</span>
                                </div>
                                <p className="text-sm text-red-100">Ausentes</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Lista de Alunos */}
                {isValidDay && selectedClass && (
                    <Card className="shadow-lg border-0">
                        <CardHeader className="bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-t-lg">
                            <CardTitle className="text-lg flex items-center space-x-2">
                                <User className="w-5 h-5" />
                                <span>Lista de Presença - {selectedClass}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {filteredStudents.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p className="text-sm font-medium text-gray-600 mb-1">Nenhum aluno encontrado</p>
                                    <p className="text-xs text-gray-500">Não há alunos cadastrados para esta turma com status &quot;ATIVO&quot;</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredStudents
                                        .sort((a, b) => a.nome.localeCompare(b.nome))
                                        .map((est: Estudante) => {
                                            const isLocked = role === "user" && existingAbsences[est.estudanteId];
                                            const isAbsent = markedAbsences[est.estudanteId];
                                            const coverage = checkCoverageForStudent(est.estudanteId, selectedDate);

                                            return (
                                                <div
                                                    key={est.estudanteId}
                                                    className={`
                                                        flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200
                                                        ${isAbsent
                                                            ? 'bg-red-50 border-red-200 hover:bg-red-100'
                                                            : 'bg-green-50 border-green-200 hover:bg-green-100'
                                                        }
                                                        ${!isLocked ? 'cursor-pointer' : 'cursor-default opacity-75'}
                                                    `}
                                                    onClick={!isLocked ? () => handleCheckboxChange(est.estudanteId) : undefined}
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <Checkbox
                                                            checked={isAbsent}
                                                            disabled={isLocked}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (!isLocked) handleCheckboxChange(est.estudanteId);
                                                            }}
                                                            className="h-5 w-5"
                                                        />
                                                        <div>
                                                            <p className="font-medium text-gray-900">{est.nome}</p>
                                                            <div className="flex items-center space-x-2 mt-1">
                                                                {isLocked && (
                                                                    <p className="text-xs text-gray-500 flex items-center space-x-1">
                                                                        <Clock className="w-3 h-3" />
                                                                        <span>Já registrado</span>
                                                                    </p>
                                                                )}
                                                                {coverage.hasAtestado && (
                                                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200">
                                                                        <FileText className="w-3 h-3 mr-1" />
                                                                        Atestado
                                                                    </Badge>
                                                                )}
                                                                {coverage.hasSuspensao && (
                                                                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 border-orange-200">
                                                                        <AlertCircle className="w-3 h-3 mr-1" />
                                                                        Suspensão
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        {isAbsent ? (
                                                            <Badge variant="destructive" className="text-xs">
                                                                <UserX className="w-3 h-3 mr-1" />
                                                                Ausente
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                Presente
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Botão de Salvar */}
                {isValidDay && selectedClass && filteredStudents.length > 0 && (
                    <div className="flex justify-end">
                        <Button
                            onClick={() => setOpenDialog(true)}
                            disabled={!canSave || isSaving}
                            className={`
                                px-6 py-3 text-white font-medium rounded-lg transition-all duration-200
                                ${canSave && !isSaving
                                    ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                                    : 'bg-gray-400 cursor-not-allowed'
                                }
                            `}
                        >
                            {isSaving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Salvar Faltas
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>

            {/* Dialog de Confirmação */}
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2 text-blue-600">
                            <Save className="w-5 h-5" />
                            <span>Confirmar Marcação de Faltas</span>
                        </DialogTitle>
                        <DialogDescription className="text-gray-600">
                            Revise os dados antes de confirmar a marcação.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                            <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                <span className="font-medium">Data:</span>
                                <span>{selectedDate}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4 text-blue-600" />
                                <span className="font-medium">Turma:</span>
                                <span>{selectedClass}</span>
                            </div>
                        </div>

                        <div>
                            <p className="font-medium text-gray-700 mb-2 flex items-center space-x-2">
                                <UserX className="w-4 h-4 text-red-600" />
                                <span>Alunos Ausentes ({absentStudents}):</span>
                            </p>
                            {absentStudents > 0 ? (
                                <ul className="space-y-1 max-h-32 overflow-y-auto">
                                    {filteredStudents
                                        .filter((est: Estudante) => markedAbsences[est.estudanteId])
                                        .map((est: Estudante) => (
                                            <li key={est.estudanteId} className="text-sm text-gray-600 flex items-center space-x-2">
                                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                <span>{est.nome}</span>
                                            </li>
                                        ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500 italic">Nenhum aluno ausente</p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setOpenDialog(false)}
                            className="border-gray-300 hover:bg-gray-50"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSaveAbsences}
                            disabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isSaving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Confirmar
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}