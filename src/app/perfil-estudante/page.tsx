"use client";

import { useState, useEffect, useCallback } from "react";
import { Toaster, toast } from "sonner";
import { db } from "@/firebase.config";
import { doc, getDoc, collection, addDoc, getDocs, updateDoc, deleteDoc, query, where, deleteField } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { headerImageBase64 } from "@/assets/headerImage";
import SearchByNameCard from "../../components/SearchByNameCard";
import SearchByClassCard from "../../components/SearchByClassCard";
import StudentInfoCard from "../../components/StudentInfoCard";
import FrequencyAllAbsencesCard from "../../components/FrequencyAllAbsencesCard";
import FrequencyNoJustifiedCard from "../../components/FrequencyNoJustifiedCard";
import RegisteredAbsencesCard from "../../components/RegisteredAbsencesCard";
import RegisterAtestadoCard from "../../components/RegisterAtestadoCard";
import AtestadoHistoryCard from "../../components/AtestadoHistoryCard";
import RegisterInteractionCard from "../../components/RegisterInteractionCard";
import InteractionHistoryCard from "../../components/InteractionHistoryCard";
import { Student, StudentRecord, FamilyInteraction, Atestado, AbsenceRecord, BimesterDates, AnoLetivoData } from "../types";
import { calculateDiasLetivos, parseDate, parseDateToFirebase, formatFirebaseDate, getBimesterByDate } from "../utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentProfilePage() {
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [selectedTurma, setSelectedTurma] = useState<string>("");
    const [selectedStudentId, setSelectedStudentId] = useState<string>("");
    const [student, setStudent] = useState<Student | null>(null);
    const [studentRecord, setStudentRecord] = useState<StudentRecord | null>(null);
    const [studentRecordWithoutJustified, setStudentRecordWithoutJustified] = useState<StudentRecord | null>(null);
    const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
    const [atestados, setAtestados] = useState<Atestado[]>([]);
    const [interactions, setInteractions] = useState<FamilyInteraction[]>([]);
    const [interactionType, setInteractionType] = useState<string>("");
    const [interactionDate, setInteractionDate] = useState<string>(new Date().toLocaleDateString("pt-BR"));
    const [interactionDescription, setInteractionDescription] = useState<string>("");
    const [interactionSensitive, setInteractionSensitive] = useState<boolean>(false);
    const [atestadoStartDate, setAtestadoStartDate] = useState<string>(new Date().toLocaleDateString("pt-BR"));
    const [atestadoDays, setAtestadoDays] = useState<string>("");
    const [atestadoDescription, setAtestadoDescription] = useState<string>("");
    const [editingAtestado, setEditingAtestado] = useState<Atestado | null>(null);
    const [, setLoadingStudents] = useState<boolean>(true);
    const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
    const [, setLoadingUserRole] = useState<boolean>(true);
    const [searchName, setSearchName] = useState<string>("");
    const [suggestions, setSuggestions] = useState<Student[]>([]);
    const [bimesterDates, setBimesterDates] = useState<BimesterDates>({});
    const [userRole, setUserRole] = useState<string | null>(null);
    const [editingInteraction, setEditingInteraction] = useState<FamilyInteraction | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
    const [showDeleteAtestadoDialog, setShowDeleteAtestadoDialog] = useState<string | null>(null);

    const auth = getAuth();

    // Sync form fields with editingAtestado
    useEffect(() => {
        if (editingAtestado) {
            setAtestadoStartDate(editingAtestado.startDate);
            setAtestadoDays(editingAtestado.days.toString());
            setAtestadoDescription(editingAtestado.description);
        } else {
            // Reset fields when not editing
            setAtestadoStartDate(new Date().toLocaleDateString("pt-BR"));
            setAtestadoDays("");
            setAtestadoDescription("");
        }
    }, [editingAtestado]);

    // Fetch user role by email
    useEffect(() => {
        const fetchUserRole = async () => {
            setLoadingUserRole(true);
            try {
                const user = auth.currentUser;
                if (!user || !user.email) {
                    setUserRole("user");
                    return;
                }
                const q = query(collection(db, "users"), where("email", "==", user.email));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const userDoc = querySnapshot.docs[0];
                    const userData = userDoc.data();
                    setUserRole(userData.perfil || "user");
                } else {
                    setUserRole("user");
                }
            } catch (error) {
                console.error("Erro ao carregar perfil do usuário:", error);
                setUserRole("user");
            } finally {
                setLoadingUserRole(false);
            }
        };
        fetchUserRole();
    }, [auth]);

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

            // Fetch absences
            const absenceSnapshot = await getDocs(collection(db, "2025", "faltas", "controle"));
            const absenceRecords: AbsenceRecord[] = absenceSnapshot.docs
                .map((doc) => ({
                    estudanteId: doc.data().estudanteId as string,
                    data: formatFirebaseDate(doc.data().data as string),
                    justified: doc.data().justified || false,
                    atestadoId: doc.data().atestadoId || undefined,
                }))
                .filter((record: AbsenceRecord) => record.estudanteId === studentId)
                .sort((a, b) => (parseDateToFirebase(a.data)?.localeCompare(parseDateToFirebase(b.data) || "") || 0));

            setAbsences(absenceRecords);

            // Fetch atestados
            const atestadosSnapshot = await getDocs(collection(db, "2025", "atestados", studentId));
            const atestadoRecords: Atestado[] = atestadosSnapshot.docs.map((doc) => ({
                id: doc.id,
                startDate: formatFirebaseDate(doc.data().startDate as string),
                days: doc.data().days as number,
                description: doc.data().description as string,
                createdBy: doc.data().createdBy as string || "Não informado",
            })).sort((a, b) => (parseDateToFirebase(b.startDate)?.localeCompare(parseDateToFirebase(a.startDate) || "") || 0));
            setAtestados(atestadoRecords);

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate = parseDate(bimesterDates[1]?.start) || new Date(2025, 0, 1);
            const diasLetivos = await calculateDiasLetivos(startDate.toLocaleDateString("pt-BR"), today.toLocaleDateString("pt-BR"));

            // Calculate for all absences
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

            // Calculate excluding justified absences
            const faltasB1NoJustified = absenceRecords.filter((d: AbsenceRecord) => getBimesterByDate(d.data, bimesterDates) === 1 && !d.justified).length;
            const faltasB2NoJustified = absenceRecords.filter((d: AbsenceRecord) => getBimesterByDate(d.data, bimesterDates) === 2 && !d.justified).length;
            const faltasB3NoJustified = absenceRecords.filter((d: AbsenceRecord) => getBimesterByDate(d.data, bimesterDates) === 3 && !d.justified).length;
            const faltasB4NoJustified = absenceRecords.filter((d: AbsenceRecord) => getBimesterByDate(d.data, bimesterDates) === 4 && !d.justified).length;
            const totalFaltasNoJustified = faltasB1NoJustified + faltasB2NoJustified + faltasB3NoJustified + faltasB4NoJustified;

            const totalFaltasAteHojeNoJustified = absenceRecords.filter((record: AbsenceRecord) => {
                const date = parseDate(record.data);
                return date !== null && date >= startDate && date <= today && !record.justified;
            }).length;

            const aggregatedNoJustified: StudentRecord = {
                estudanteId: studentId,
                turma: foundStudent?.turma || "",
                nome: foundStudent?.nome || "",
                faltasB1: faltasB1NoJustified,
                faltasB2: faltasB2NoJustified,
                faltasB3: faltasB3NoJustified,
                faltasB4: faltasB4NoJustified,
                totalFaltas: totalFaltasNoJustified,
                totalFaltasAteHoje: totalFaltasAteHojeNoJustified,
                percentualFaltas: diasLetivos.anual ? Number((totalFaltasNoJustified / diasLetivos.anual * 100).toFixed(1)) : 0,
                percentualFaltasAteHoje: diasLetivos.ateHoje ? Number((totalFaltasAteHojeNoJustified / diasLetivos.ateHoje * 100).toFixed(1)) : 0,
                percentualFrequencia: diasLetivos.anual ? Number((100 - (totalFaltasNoJustified / diasLetivos.anual * 100)).toFixed(1)) : 100,
                percentualFrequenciaAteHoje: diasLetivos.ateHoje ? Number((100 - (totalFaltasAteHojeNoJustified / diasLetivos.ateHoje * 100)).toFixed(1)) : 100,
                diasLetivosAteHoje: diasLetivos.ateHoje,
                diasLetivosB1: diasLetivos.b1,
                diasLetivosB2: diasLetivos.b2,
                diasLetivosB3: diasLetivos.b3,
                diasLetivosB4: diasLetivos.b4,
                diasLetivosAnual: diasLetivos.anual,
            };
            setStudentRecordWithoutJustified(aggregatedNoJustified);

            // Fetch interactions
            const interactionsSnapshot = await getDocs(collection(db, "2025", "interactions", studentId));
            const interactionRecords: FamilyInteraction[] = interactionsSnapshot.docs.map((doc) => ({
                id: doc.id,
                type: doc.data().type as string,
                date: formatFirebaseDate(doc.data().date as string),
                description: doc.data().description as string,
                createdBy: doc.data().createdBy as string || "Não informado",
                sensitive: doc.data().sensitive as boolean || false,
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
                sensitive: interactionSensitive,
            };

            await addDoc(collection(db, "2025", "interactions", selectedStudentId), interactionData);
            setInteractionType("");
            setInteractionDate(new Date().toLocaleDateString("pt-BR"));
            setInteractionDescription("");
            setInteractionSensitive(false);
            await fetchStudentData(selectedStudentId);

            window.scrollTo(0, scrollPosition);
            document.getElementById("interaction-card")?.scrollIntoView({ behavior: "smooth", block: "start" });

            toast.success("Interação salva com sucesso!");
        } catch (error) {
            console.error("Erro ao cadastrar interação:", error);
            toast.error("Erro ao salvar interação. Tente novamente.");
        }
    };

    const handleEditInteraction = async (): Promise<void> => {
        if (!editingInteraction || !selectedStudentId || !interactionType || !interactionDate || !interactionDescription) {
            toast.error("Preencha todos os campos para editar a interação.");
            return;
        }

        const formattedDate = parseDateToFirebase(interactionDate);
        if (!formattedDate) {
            toast.error("Data inválida. Use o formato DD/MM/YYYY.");
            return;
        }

        try {
            const interactionRef = doc(db, "2025", "interactions", selectedStudentId, editingInteraction.id);
            await updateDoc(interactionRef, {
                type: interactionType,
                date: formattedDate,
                description: interactionDescription,
                sensitive: interactionSensitive,
                createdBy: auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido",
            });
            setEditingInteraction(null);
            setInteractionType("");
            setInteractionDate(new Date().toLocaleDateString("pt-BR"));
            setInteractionDescription("");
            setInteractionSensitive(false);
            await fetchStudentData(selectedStudentId);
            toast.success("Interação atualizada com sucesso!");
        } catch (error) {
            console.error("Erro ao atualizar interação:", error);
            toast.error("Erro ao atualizar interação. Tente novamente.");
        }
    };

    const handleDeleteInteraction = async (interactionId: string): Promise<void> => {
        if (!selectedStudentId) return;
        try {
            const interactionRef = doc(db, "2025", "interactions", selectedStudentId, interactionId);
            await deleteDoc(interactionRef);
            await fetchStudentData(selectedStudentId);
            toast.success("Interação excluída com sucesso!");
        } catch (error) {
            console.error("Erro ao excluir interação:", error);
            toast.error("Erro ao excluir interação. Tente novamente.");
        } finally {
            setShowDeleteDialog(null);
        }
    };

    const handleAddAtestado = async (): Promise<void> => {
        if (!selectedStudentId || !atestadoStartDate || !atestadoDays || !atestadoDescription) {
            toast.error("Preencha todos os campos para adicionar um atestado.");
            return;
        }

        const formattedDate = parseDateToFirebase(atestadoStartDate);
        const days = parseInt(atestadoDays);
        if (!formattedDate) {
            toast.error("Data inválida. Use o formato DD/MM/YYYY.");
            return;
        }
        if (isNaN(days) || days < 1) {
            toast.error("Número de dias inválido.");
            return;
        }

        try {
            const startDate = parseDate(atestadoStartDate);
            if (!startDate) throw new Error("Data inválida");
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + days - 1);

            const atestadoData: Omit<Atestado, "id"> = {
                startDate: formattedDate,
                days,
                description: atestadoDescription,
                createdBy: auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido",
            };

            const atestadoRef = await addDoc(collection(db, "2025", "atestados", selectedStudentId), atestadoData);
            const atestadoId = atestadoRef.id;

            // Update absences within the atestado period
            const absenceSnapshot = await getDocs(collection(db, "2025", "faltas", "controle"));
            for (const doc of absenceSnapshot.docs) {
                const absence = doc.data();
                const absenceDate = parseDate(formatFirebaseDate(absence.data));
                if (
                    absence.estudanteId === selectedStudentId &&
                    absenceDate &&
                    absenceDate >= startDate &&
                    absenceDate <= endDate
                ) {
                    await updateDoc(doc.ref, {
                        justified: true,
                        atestadoId,
                    });
                }
            }

            setAtestadoStartDate(new Date().toLocaleDateString("pt-BR"));
            setAtestadoDays("");
            setAtestadoDescription("");
            await fetchStudentData(selectedStudentId);

            document.getElementById("atestado-card")?.scrollIntoView({ behavior: "smooth", block: "start" });

            toast.success("Atestado salvo com sucesso!");
        } catch (error) {
            console.error("Erro ao cadastrar atestado:", error);
            toast.error("Erro ao salvar atestado. Tente novamente.");
        }
    };

    const handleEditAtestado = async (): Promise<void> => {
        if (!editingAtestado || !selectedStudentId || !atestadoStartDate || !atestadoDays || !atestadoDescription) {
            toast.error("Preencha todos os campos para editar o atestado.");
            return;
        }

        const formattedDate = parseDateToFirebase(atestadoStartDate);
        const days = parseInt(atestadoDays);
        if (!formattedDate) {
            toast.error("Data inválida. Use o formato DD/MM/YYYY.");
            return;
        }
        if (isNaN(days) || days < 1) {
            toast.error("Número de dias inválido.");
            return;
        }

        try {
            const atestadoRef = doc(db, "2025", "atestados", selectedStudentId, editingAtestado.id);
            await updateDoc(atestadoRef, {
                startDate: formattedDate,
                days,
                description: atestadoDescription,
                createdBy: auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido",
            });

            // Reset absences previously justified by this atestado
            const absenceSnapshot = await getDocs(collection(db, "2025", "faltas", "controle"));
            for (const doc of absenceSnapshot.docs) {
                if (doc.data().atestadoId === editingAtestado.id) {
                    await updateDoc(doc.ref, {
                        justified: false,
                        atestadoId: deleteField(),
                    });
                }
            }

            // Update absences within the new atestado period
            const startDate = parseDate(atestadoStartDate);
            if (!startDate) throw new Error("Data inválida");
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + days - 1);

            for (const doc of absenceSnapshot.docs) {
                const absence = doc.data();
                const absenceDate = parseDate(formatFirebaseDate(absence.data));
                if (
                    absence.estudanteId === selectedStudentId &&
                    absenceDate &&
                    absenceDate >= startDate &&
                    absenceDate <= endDate
                ) {
                    await updateDoc(doc.ref, {
                        justified: true,
                        atestadoId: editingAtestado.id,
                    });
                }
            }

            setEditingAtestado(null);
            setAtestadoStartDate(new Date().toLocaleDateString("pt-BR"));
            setAtestadoDays("");
            setAtestadoDescription("");
            await fetchStudentData(selectedStudentId);
            toast.success("Atestado atualizado com sucesso!");
        } catch (error) {
            console.error("Erro ao atualizar atestado:", error);
            toast.error("Erro ao atualizar atestado. Tente novamente.");
        }
    };

    const handleDeleteAtestado = async (atestadoId: string): Promise<void> => {
        if (!selectedStudentId) return;
        try {
            const atestadoRef = doc(db, "2025", "atestados", selectedStudentId, atestadoId);
            await deleteDoc(atestadoRef);

            // Reset absences justified by this atestado
            const absenceSnapshot = await getDocs(collection(db, "2025", "faltas", "controle"));
            for (const doc of absenceSnapshot.docs) {
                if (doc.data().atestadoId === atestadoId) {
                    await updateDoc(doc.ref, {
                        justified: false,
                        atestadoId: deleteField(),
                    });
                }
            }

            await fetchStudentData(selectedStudentId);
            toast.success("Atestado excluído com sucesso!");
        } catch (error) {
            console.error("Erro ao excluir atestado:", error);
            toast.error("Erro ao excluir atestado. Tente novamente.");
        } finally {
            setShowDeleteAtestadoDialog(null);
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
            'Compensação de ausência',
            'Carta registrada',
            'Conselho tutelar',
            'Desligamento',
            'Justificativa da família',
            'Observações'
        ] as const;

        const consolidatedInteractions = interactions
            .filter((interaction) => !interaction.sensitive)
            .reduce((acc, curr) => {
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
      `).join('') || '<p>Nenhuma providência registrada.</p>'}
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

        const printFrame = document.createElement('iframe');
        printFrame.style.display = 'none';
        document.body.appendChild(printFrame);

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
                <SearchByNameCard
                    searchName={searchName}
                    suggestions={suggestions}
                    onSearchChange={handleSearchName}
                    onSuggestionSelect={handleSuggestionSelect}
                />
                <SearchByClassCard
                    selectedTurma={selectedTurma}
                    selectedStudentId={selectedStudentId}
                    uniqueTurmas={uniqueTurmas}
                    studentsInTurma={studentsInTurma}
                    searchName={searchName}
                    onTurmaChange={(value) => {
                        setSelectedTurma(value);
                        setSelectedStudentId("");
                        setSearchName("");
                        setSuggestions([]);
                    }}
                    onStudentChange={setSelectedStudentId}
                />
            </div>

            {loadingProfile ? (
                <Card>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            ) : student && (
                <>
                    <StudentInfoCard student={student} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FrequencyAllAbsencesCard studentRecord={studentRecord} />
                        <FrequencyNoJustifiedCard studentRecordWithoutJustified={studentRecordWithoutJustified} />
                    </div>
                    <RegisteredAbsencesCard absences={absences} atestados={atestados} bimesterDates={bimesterDates} />
                    {userRole === "admin" && (
                        <>
                            <RegisterAtestadoCard
                                atestadoStartDate={atestadoStartDate}
                                atestadoDays={atestadoDays}
                                atestadoDescription={atestadoDescription}
                                editingAtestado={editingAtestado}
                                setAtestadoStartDate={setAtestadoStartDate}
                                setAtestadoDays={setAtestadoDays}
                                setAtestadoDescription={setAtestadoDescription}
                                setEditingAtestado={setEditingAtestado}
                                onAddAtestado={handleAddAtestado}
                                onEditAtestado={handleEditAtestado}
                                id="atestado-card"
                            />
                            <AtestadoHistoryCard
                                atestados={atestados}
                                userRole={userRole}
                                showDeleteAtestadoDialog={showDeleteAtestadoDialog}
                                setShowDeleteAtestadoDialog={setShowDeleteAtestadoDialog}
                                setEditingAtestado={setEditingAtestado}
                                onDeleteAtestado={handleDeleteAtestado}
                            />
                        </>
                    )}
                    <RegisterInteractionCard
                        interactionType={interactionType}
                        interactionDate={interactionDate}
                        interactionDescription={interactionDescription}
                        interactionSensitive={interactionSensitive}
                        editingInteraction={editingInteraction}
                        userRole={userRole}
                        setInteractionType={setInteractionType}
                        setInteractionDate={setInteractionDate}
                        setInteractionDescription={setInteractionDescription}
                        setInteractionSensitive={setInteractionSensitive}
                        setEditingInteraction={setEditingInteraction}
                        onAddInteraction={handleAddInteraction}
                        onEditInteraction={handleEditInteraction}
                        id="interaction-card"
                    />
                    <InteractionHistoryCard
                        interactions={interactions}
                        student={student}
                        studentRecord={studentRecord}
                        userRole={userRole}
                        showDeleteDialog={showDeleteDialog}
                        setShowDeleteDialog={setShowDeleteDialog}
                        setEditingInteraction={setEditingInteraction}
                        onDeleteInteraction={handleDeleteInteraction}
                        onPrintReport={handlePrintReport}
                    />
                </>
            )}
        </div>
    );
}