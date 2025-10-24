/**
 * useAttendanceMarking Hook
 *
 * Centraliza toda a lógica de estado e handlers para marcação de faltas.
 * Extrai ~150-200 linhas do componente marcar-faltas/page.tsx
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { auth } from "@/firebase.config";
import { logger } from "@/utils/logger";
import { convertToISO, formatDateToDDMMYYYY } from "@/utils/dateUtils";
import { UserProfilesService } from "@/services/supabase/userProfilesService";
import { MedicalCertificatesService } from "@/services/supabase/medicalCertificatesService";
import { StudentSuspensionsService } from "@/services/supabase/studentSuspensionsService";
import { AbsenceService } from "@/services/supabase/absenceService";
import { toast } from "sonner";
import { scheduleSync } from "@/lib/serviceWorker";
import type { Estudante } from "@/hooks/useStudents";

// ════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════

type Role = "admin" | "super-user" | "user";

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

interface UseAttendanceMarkingProps {
    students: Estudante[];
    isOnline: boolean;
}

// ════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ════════════════════════════════════════════════════════════════

export function useAttendanceMarking({ students, isOnline }: UseAttendanceMarkingProps) {
    // ──────────────────────────────────────────────────────────────
    // Estados
    // ──────────────────────────────────────────────────────────────

    const [academicYearData, setAcademicYearData] = useState<AcademicYearData | null>(null);
    const [loadingAcademicYear, setLoadingAcademicYear] = useState(true); // ✅ NOVO: Estado de loading
    const [academicYearLoaded, setAcademicYearLoaded] = useState(false); // ✅ Flag de primeira carga completa
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [isValidDay, setIsValidDay] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [existingAbsences, setExistingAbsences] = useState<{ [key: string]: boolean }>({});
    const [markedAbsences, setMarkedAbsences] = useState<{ [key: string]: boolean }>({});
    const [existingAbsenceDocs, setExistingAbsenceDocs] = useState<{ [key: string]: string }>({});
    const [openDialog, setOpenDialog] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [role, setRole] = useState<Role | null>(null);
    const [atestados, setAtestados] = useState<Map<string, Atestado[]>>(new Map());
    const [suspensoes, setSuspensoes] = useState<Map<string, Suspensao[]>>(new Map());

    // ──────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────

    const convertDateToDDMMYYYY = (dateStr: string): string => {
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        }
        return dateStr;
    };

    const getValidDates = useCallback((academicYearData: AcademicYearData | null, role: Role | null): string[] => {
        if (!academicYearData) return [];

        const validDates: string[] = [];
        Object.entries(academicYearData).forEach(([key, bimData]) => {
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
        const filteredDates = sortedDates.filter((d) => d.timestamp <= todayTimestamp);

        // Para user e super-user: mostrar todos os dias letivos do mês corrente
        if (role === "user" || role === "super-user") {
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            return filteredDates
                .filter((d) => {
                    const date = new Date(d.timestamp);
                    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
                })
                .map((d) => d.date);
        }

        // Admin: mostrar todos os dias letivos até hoje
        return filteredDates.map((d) => d.date);
    }, []);

    const checkCoverageForStudent = useCallback((studentId: string, dateStr: string) => {
        const studentAtestados = atestados.get(studentId) || [];
        const studentSuspensoes = suspensoes.get(studentId) || [];

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
    }, [atestados, suspensoes]);

    // ──────────────────────────────────────────────────────────────
    // Effects - Carregamento de Dados
    // ──────────────────────────────────────────────────────────────

    // Carrega ano letivo
    useEffect(() => {
        const fetchAcademicYearData = async () => {
            try {
                console.log("[useAttendanceMarking] Iniciando fetch do ano letivo");
                setLoadingAcademicYear(true); // ✅ Inicia loading
                setErrorMessage(""); // ✅ Limpa erro ao iniciar loading
                const { AcademicYearService } = await import('@/services/supabase/academicYearService');
                const yearData = await AcademicYearService.getAcademicYearComplete(2025);

                console.log("[useAttendanceMarking] Fetch completado", {
                    hasData: !!yearData,
                    keysLength: yearData ? Object.keys(yearData).length : 0,
                    yearDataKeys: yearData ? Object.keys(yearData) : []
                });

                if (yearData && Object.keys(yearData).length > 0) {
                    console.log("[useAttendanceMarking] ✅ Dados carregados com sucesso");
                    // ✅ CRÍTICO: Usar setAcademicYearLoaded APÓS setAcademicYearData
                    // para garantir que o useEffect de validação veja os dados atualizados
                    setAcademicYearData(yearData);
                    setErrorMessage(""); // Limpa qualquer erro
                    // Aguardar próximo tick para garantir que academicYearData foi atualizado
                    setTimeout(() => setAcademicYearLoaded(true), 0);
                } else {
                    console.warn("[useAttendanceMarking] ⚠️ Dados vazios ou não encontrados. O ano letivo 2025 pode não estar cadastrado no sistema.");
                    // ✅ NÃO seta erro aqui - deixa o useEffect de validação lidar com isso
                    setAcademicYearData(null);
                    setTimeout(() => setAcademicYearLoaded(true), 0);
                }
            } catch (error) {
                console.error("[useAttendanceMarking] Erro no fetch", error);
                logger.error("Erro ao carregar ano letivo", error as Error);
                setErrorMessage("Erro ao carregar dados do ano letivo.");
                setTimeout(() => setAcademicYearLoaded(true), 0); // ✅ Marca como carregado (mesmo com erro)
            } finally {
                console.log("[useAttendanceMarking] Finalizando loading");
                setLoadingAcademicYear(false); // ✅ Finaliza loading
            }
        };
        fetchAcademicYearData();
    }, []);

    // Define data atual
    useEffect(() => {
        const today = new Date();
        setSelectedDate(formatDateToDDMMYYYY(today));
    }, []);

    // Valida data selecionada
    useEffect(() => {
        console.log("[useAttendanceMarking] Validação disparada", {
            academicYearLoaded,
            hasData: !!academicYearData,
            selectedDate,
            loadingAcademicYear
        });

        // ✅ CORREÇÃO: Não validar antes da primeira carga completar
        if (!academicYearLoaded) {
            console.log("[useAttendanceMarking] Aguardando primeira carga completar");
            return; // Aguarda primeira carga completar (sucesso ou erro)
        }

        if (academicYearData && selectedDate) {
            let valid = false;
            Object.values(academicYearData).forEach((bimData) => {
                if (bimData?.dates) {
                    const found = bimData.dates.find((d) => {
                        const dateFormatted = convertDateToDDMMYYYY(d.date);
                        return dateFormatted === selectedDate && d.isChecked;
                    });
                    if (found) valid = true;
                }
            });
            setIsValidDay(valid);
            setErrorMessage(valid ? "" : "O dia selecionado não está disponível para marcação de faltas.");
            console.log("[useAttendanceMarking] Validação executada", { valid });
        } else if (!academicYearData && selectedDate) {
            // ✅ Só mostra erro se primeira carga completou, não há dados E usuário já tem data selecionada
            console.log("[useAttendanceMarking] Setando erro: dados não encontrados (selectedDate presente)");
            setErrorMessage("Dados do ano letivo não encontrados.");
        } else if (!academicYearData && !selectedDate) {
            // ✅ Ainda carregando ambos - não fazer nada
            console.log("[useAttendanceMarking] Aguardando dados e selectedDate");
        }
    }, [academicYearData, selectedDate, academicYearLoaded, loadingAcademicYear]);

    // Carrega perfil do usuário
    useEffect(() => {
        const fetchUserRole = async () => {
            try {
                const uid = auth.currentUser?.uid;
                if (!uid) {
                    logger.warn("Usuário não autenticado");
                    return;
                }

                const userProfile = await UserProfilesService.getByFirebaseUid(uid);

                if (userProfile) {
                    const userRole = (userProfile.role?.toLowerCase() as Role) || "user";
                    setRole(userRole);
                } else {
                    setRole("user");
                }
            } catch (error) {
                logger.error("Erro ao buscar usuário", error as Error);
                setRole("user");
            }
        };

        fetchUserRole();
    }, []);

    // Carrega atestados e suspensões
    useEffect(() => {
        const loadAtestadosESuspensoes = async () => {
            if (!selectedClass) return;

            try {
                const newAtestados = new Map<string, Atestado[]>();
                const newSuspensoes = new Map<string, Suspensao[]>();

                const studentsInClass = students.filter(
                    (est: Estudante) => est.status === "ATIVO" && est.turma === selectedClass
                );

                if (studentsInClass.length === 0) return;

                for (const student of studentsInClass) {
                    const supabaseAtestados = await MedicalCertificatesService.getByStudentId(student.estudanteId);
                    const studentAtestados: Atestado[] = supabaseAtestados.map((cert) => {
                        const dateISO = cert.startDate;
                        let formattedDate = dateISO;
                        if (dateISO.includes('-')) {
                            const [year, month, day] = dateISO.split('-');
                            formattedDate = `${day}/${month}/${year}`;
                        }
                        return {
                            id: cert.id,
                            startDate: formattedDate,
                            days: cert.daysCovered,
                            description: cert.diagnosis || "Sem descrição",
                            createdBy: cert.createdBy || "Não informado",
                        };
                    });

                    const supabaseSuspensoes = await StudentSuspensionsService.getByStudentId(student.estudanteId);
                    const studentSuspensoes: Suspensao[] = supabaseSuspensoes.map((susp) => {
                        const dateISO = susp.startDate;
                        let formattedDate = dateISO;
                        if (dateISO.includes('-')) {
                            const [year, month, day] = dateISO.split('-');
                            formattedDate = `${day}/${month}/${year}`;
                        }
                        return {
                            id: susp.id,
                            startDate: formattedDate,
                            days: susp.daysSuspended,
                            description: susp.reason,
                            createdBy: susp.createdBy || "Não informado",
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

    // Carrega faltas existentes
    useEffect(() => {
        const loadAbsences = async () => {
            if (!selectedClass || !selectedDate) return;
            const formattedDate = convertToISO(selectedDate);
            try {
                const absences = await AbsenceService.getByTurmaAndDate(selectedClass, formattedDate);
                const newExistingAbsences: { [key: string]: boolean } = {};
                const newExistingAbsenceDocs: { [key: string]: string } = {};

                absences.forEach((absence: any) => {
                    const estudanteId = absence.estudanteId;
                    newExistingAbsences[estudanteId] = true;
                    newExistingAbsenceDocs[estudanteId] = absence.id;
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

    // ──────────────────────────────────────────────────────────────
    // Computed Values
    // ──────────────────────────────────────────────────────────────

    const filteredStudents = useMemo(() => {
        return students.filter(
            (est: Estudante) => est.status === "ATIVO" && est.turma === selectedClass
        );
    }, [students, selectedClass]);

    const hasChanges = useMemo(() => {
        return filteredStudents.some((est: Estudante) => {
            const current = !!markedAbsences[est.estudanteId];
            const initial = !!existingAbsences[est.estudanteId];
            return current !== initial;
        });
    }, [filteredStudents, markedAbsences, existingAbsences]);

    const hasSelection = useMemo(() => {
        return filteredStudents.some((est: Estudante) => markedAbsences[est.estudanteId]);
    }, [filteredStudents, markedAbsences]);

    const canSave = role === "user" ? hasSelection : hasChanges;

    const totalStudents = filteredStudents.length;
    const presentStudents = filteredStudents.filter(est => !markedAbsences[est.estudanteId]).length;
    const absentStudents = filteredStudents.filter(est => markedAbsences[est.estudanteId]).length;

    // ──────────────────────────────────────────────────────────────
    // Handlers
    // ──────────────────────────────────────────────────────────────

    const handleCheckboxChange = useCallback((studentId: string) => {
        if (role === "user" && existingAbsences[studentId]) return;
        setMarkedAbsences((prev) => ({
            ...prev,
            [studentId]: !prev[studentId],
        }));
    }, [role, existingAbsences]);

    const saveAbsencesOffline = useCallback(async () => {
        const formattedDate = convertToISO(selectedDate);

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

        await scheduleSync('attendance', attendanceData);

        toast.success("Faltas salvas offline! Serão sincronizadas quando voltar a conexão.", {
            description: `${attendanceData.absences.length} ausência(s) registrada(s)`
        });

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
    }, [selectedDate, selectedClass, filteredStudents, markedAbsences, role]);

    const handleSaveAbsences = useCallback(async () => {
        setIsSaving(true);

        try {
            if (!isOnline) {
                await saveAbsencesOffline();
                setOpenDialog(false);
                return;
            }

            const formattedDate = convertToISO(selectedDate);

            const currentAbsencesList = await AbsenceService.getByTurmaAndDate(selectedClass, formattedDate);
            const currentAbsences: { [key: string]: string } = {};
            currentAbsencesList.forEach((absence: any) => {
                currentAbsences[absence.estudanteId] = absence.id;
            });

            if (role === "user") {
                for (const est of filteredStudents) {
                    if (markedAbsences[est.estudanteId] && !currentAbsences[est.estudanteId]) {
                        await AbsenceService.create({
                            estudanteId: est.estudanteId,
                            data: formattedDate,
                            justified: false,
                        });
                    }
                }
            } else {
                for (const est of filteredStudents) {
                    const currentlyMarked = markedAbsences[est.estudanteId] || false;
                    const previouslyMarked = !!currentAbsences[est.estudanteId];

                    if (currentlyMarked && !previouslyMarked) {
                        await AbsenceService.create({
                            estudanteId: est.estudanteId,
                            data: formattedDate,
                            justified: false,
                        });
                    } else if (!currentlyMarked && previouslyMarked) {
                        const absenceId = currentAbsences[est.estudanteId];
                        if (absenceId) {
                            await AbsenceService.delete(absenceId);
                        }
                    }
                }
            }

            toast.success("Faltas salvas com sucesso!");
            setOpenDialog(false);

            const updatedAbsences = await AbsenceService.getByTurmaAndDate(selectedClass, formattedDate);
            const newExistingAbsences: { [key: string]: boolean } = {};
            const newExistingAbsenceDocs: { [key: string]: string } = {};
            updatedAbsences.forEach((absence: any) => {
                newExistingAbsences[absence.estudanteId] = true;
                newExistingAbsenceDocs[absence.estudanteId] = absence.id;
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
    }, [isOnline, selectedDate, selectedClass, filteredStudents, markedAbsences, role, saveAbsencesOffline]);

    // ──────────────────────────────────────────────────────────────
    // Retorno do Hook
    // ──────────────────────────────────────────────────────────────

    return {
        // Estados
        academicYearData,
        loadingAcademicYear, // ✅ NOVO: Exporta estado de loading
        selectedDate,
        setSelectedDate,
        isValidDay,
        errorMessage,
        selectedClass,
        setSelectedClass,
        existingAbsences,
        markedAbsences,
        openDialog,
        setOpenDialog,
        isSaving,
        role,

        // Computed
        filteredStudents,
        canSave,
        totalStudents,
        presentStudents,
        absentStudents,

        // Helpers
        getValidDates,
        checkCoverageForStudent,

        // Handlers
        handleCheckboxChange,
        handleSaveAbsences,
    };
}
