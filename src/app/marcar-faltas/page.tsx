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
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

// Função para extrair as datas válidas (isChecked === true) do ano letivo
function getValidDates(academicYearData: AcademicYearData | null): string[] {
    if (!academicYearData) return [];

    // Obtém todas as datas válidas (isChecked === true)
    let validDates: string[] = [];
    Object.values(academicYearData).forEach((bimData) => {
        bimData?.dates?.forEach((d) => {
            if (d.isChecked) validDates.push(d.date);
        });
    });

    // Converte a data atual para o formato DD/MM/YYYY
    const today = new Date();
    const todayStr = formatDateToDDMMYYYY(today);

    // Converte as datas para um formato comparável (timestamp) e ordena
    const sortedDates = validDates
        .map((date) => {
            const [day, month, year] = date.split("/").map(Number);
            return { date, timestamp: new Date(year, month - 1, day).getTime() };
        })
        .sort((a, b) => a.timestamp - b.timestamp);

    // Encontra a data mais próxima anterior ou igual à data atual
    const todayTimestamp = today.getTime();
    const filteredDates = sortedDates.filter(
        (d) => d.timestamp <= todayTimestamp
    );

    // Se não houver datas válidas até hoje, retorna vazio
    if (filteredDates.length === 0) return [];

    // Retorna apenas as datas no formato original (DD/MM/YYYY)
    return filteredDates.map((d) => d.date);
}

export default function MarcarFaltasPage() {
    const router = useRouter();
    const { students, loading } = useStudents();

    // Estados para dados e UI
    const [academicYearData, setAcademicYearData] = useState<AcademicYearData | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [isValidDay, setIsValidDay] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [existingAbsences, setExistingAbsences] = useState<{ [key: string]: boolean }>({});
    const [markedAbsences, setMarkedAbsences] = useState<{ [key: string]: boolean }>({});
    const [existingAbsenceDocs, setExistingAbsenceDocs] = useState<{ [key: string]: string }>({});
    const [openDialog, setOpenDialog] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Estado para o perfil do usuário
    const [role, setRole] = useState<Role | null>(null);

    // Carrega dados do ano letivo
    useEffect(() => {
        const fetchAcademicYearData = async () => {
            try {
                const docRef = doc(db, ACADEMIC_YEAR, DOC_ACADEMIC_YEAR);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setAcademicYearData(docSnap.data() as AcademicYearData);
                } else {
                    setErrorMessage("Dados do ano letivo não encontrados.");
                }
            } catch (error) {
                console.error("Erro ao carregar ano letivo:", error);
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
                    const found = bimData.dates.find(
                        (d) => d.date === selectedDate && d.isChecked
                    );
                    if (found) valid = true;
                }
            });
            setIsValidDay(valid);
            setErrorMessage(valid ? "" : "O dia atual não está disponível para marcação de faltas.");
        }
    }, [academicYearData, selectedDate]);

    // Obtém o perfil do usuário do Firestore
    useEffect(() => {
        if (!auth.currentUser) {
            router.push("/login");
            return;
        }
        const fetchUserRole = async () => {
            try {
                const uid = auth.currentUser?.uid;
                if (!uid) {
                    router.push("/login");
                    return;
                }
                const q = query(collection(db, "users"), where("uid", "==", uid));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const data = querySnapshot.docs[0].data();
                    const userRole = (data.perfil as Role) || "user";
                    setRole(userRole);
                } else {
                    setRole("user");
                }
            } catch (error) {
                console.error("Erro ao buscar usuário:", error);
                setRole("user");
            }
        };

        fetchUserRole();
    }, [router]);

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
                // Inicializa o estado dos checkboxes com o estado atual do BD
                setMarkedAbsences(newExistingAbsences);
            } catch (error) {
                console.error("Erro ao carregar faltas existentes:", error);
            }
        };

        loadAbsences();
    }, [selectedClass, selectedDate]);

    // Memoriza a lista de turmas para evitar cálculos desnecessários
    const turmas = useMemo(() => {
        return Array.from(new Set(students.map((est: Estudante) => est.turma)));
    }, [students]);

    const filteredStudents = useMemo(() => {
        return students.filter((est: Estudante) => est.turma === selectedClass);
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

    // Alterna ausência do aluno (respeitando restrições de perfil)
    const handleCheckboxChange = (studentId: string) => {
        if (role === "user" && existingAbsences[studentId]) return;
        setMarkedAbsences((prev) => ({
            ...prev,
            [studentId]: !prev[studentId],
        }));
    };

    // Salva faltas com feedback de loading
    const handleSaveAbsences = async () => {
        setIsSaving(true);
        const formattedDate = convertToISO(selectedDate);
        try {
            const batch = writeBatch(db);
            const controleColRef = collection(db, ACADEMIC_YEAR, COLLECTION_FALTAS, SUBCOLLECTION_CONTROLE);
            if (role === "user") {
                filteredStudents.forEach((est: Estudante) => {
                    if (markedAbsences[est.estudanteId] && !existingAbsences[est.estudanteId]) {
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
                filteredStudents.forEach((est: Estudante) => {
                    const currentlyMarked = markedAbsences[est.estudanteId] || false;
                    const previouslyMarked = existingAbsences[est.estudanteId] || false;
                    if (currentlyMarked && !previouslyMarked) {
                        const absenceData = {
                            estudanteId: est.estudanteId,
                            data: formattedDate,
                            turma: selectedClass,
                        };
                        const newDocRef = doc(controleColRef);
                        batch.set(newDocRef, absenceData);
                    } else if (!currentlyMarked && previouslyMarked) {
                        const docId = existingAbsenceDocs[est.estudanteId];
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
        } catch (error) {
            console.error("Erro ao salvar faltas:", error);
            toast.error("Erro ao salvar faltas.");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Carregando dados...</p>
            </div>
        );
    }

    return (
        <div>
            <Toaster />

            <Card className="mx-auto max-w-3xl relative">
                <CardHeader>
                    <CardTitle>Marcação de Faltas</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Renderiza a Data Atual de acordo com o perfil do usuário */}
                    <div className="mb-4 flex items-center gap-2">
                        <span className="font-bold">Data Atual: </span>
                        {role === "user" ? (
                            <span>{selectedDate}</span>
                        ) : (
                            <Select onValueChange={setSelectedDate} value={selectedDate}>
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Selecione a data" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getValidDates(academicYearData).map((date) => (
                                        <SelectItem key={date} value={date}>
                                            {date}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* Seleção da Turma */}
                    <div className="mb-4 flex items-center gap-2">
                        <span className="font-bold">Selecione a Turma:</span>
                        <Select onValueChange={setSelectedClass} value={selectedClass}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Selecione a turma" />
                            </SelectTrigger>
                            <SelectContent>
                                {turmas.map((turma) => (
                                    <SelectItem key={turma} value={turma}>
                                        {turma}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {errorMessage && (
                        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded">
                            {errorMessage}
                        </div>
                    )}

                    {isValidDay && selectedClass ? (
                        <div className="space-y-2">
                            {filteredStudents.length === 0 ? (
                                <p>Não há alunos cadastrados para esta turma.</p>
                            ) : (
                                filteredStudents.map((est: Estudante) => {
                                    const isLocked = role === "user" && existingAbsences[est.estudanteId];
                                    return (
                                        <div
                                            key={est.estudanteId}
                                            className={`flex items-center gap-2 p-2 rounded hover:bg-gray-50 ${!isLocked ? "cursor-pointer" : "cursor-default"
                                                }`}
                                            onClick={!isLocked ? () => handleCheckboxChange(est.estudanteId) : undefined}
                                        >
                                            <Checkbox
                                                checked={!!markedAbsences[est.estudanteId]}
                                                disabled={isLocked}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!isLocked) handleCheckboxChange(est.estudanteId);
                                                }}
                                                className="text-black"
                                            />
                                            <span>{est.nome}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        !errorMessage && <p>Selecione uma turma para marcar faltas.</p>
                    )}
                </CardContent>

                {/* Botão de salvar com feedback de loading */}
                <div className="sticky bottom-4 flex justify-end pr-4">
                    <Button
                        variant="secondary"
                        onClick={() => setOpenDialog(true)}
                        disabled={!canSave || isSaving}
                        className={`px-4 py-2 rounded ${canSave && !isSaving ? "bg-black text-white" : "opacity-50"}`}
                    >
                        {isSaving ? "Salvando..." : "Salvar"}
                    </Button>
                </div>
            </Card>

            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Marcação de Faltas</DialogTitle>
                        <DialogDescription>
                            Revise os alunos selecionados antes de confirmar.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mb-4">
                        <p>
                            <span className="font-bold">Turma:</span> {selectedClass}
                        </p>
                        <p className="mt-2 font-bold">Alunos faltantes:</p>
                        <ul className="list-disc ml-6">
                            {filteredStudents
                                .filter((est: Estudante) => markedAbsences[est.estudanteId])
                                .map((est: Estudante) => (
                                    <li key={est.estudanteId}>{est.nome}</li>
                                ))}
                        </ul>
                    </div>
                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setOpenDialog(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveAbsences} disabled={isSaving}>
                            Confirmar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}