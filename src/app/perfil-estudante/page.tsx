"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from 'next/navigation';
import { useDebounce } from "@/hooks/useDebounce";
import { Toaster, toast } from "sonner";
import { StudentDataService } from "@/services/studentDataService";
import { getAuth } from "firebase/auth";
import { UserProfilesService } from "@/services/supabase/userProfilesService";
import { AbsenceControlService } from "@/services/supabase/absenceControlService";
import { AbsenceService } from "@/services/supabase/absenceService";
import { MedicalCertificatesService } from "@/services/supabase/medicalCertificatesService";
import { StudentSuspensionsService } from "@/services/supabase/studentSuspensionsService";
import { InteractionService } from "@/services/supabase/interactionService";
import { logger } from "@/utils/logger";
import { headerImageBase64 } from "@/assets/headerImage";
import SearchByNameCard from "@/components/students/SearchByNameCard";
import SearchByClassCard from "@/components/students/SearchByClassCard";
import StudentInfoCard from "@/components/students/StudentInfoCard";
import { FrequencyCardSkeleton, InteractionListSkeleton } from "@/components/shared/LoadingSkeletons";
import FrequencyAllAbsencesCard from "@/components/attendance/FrequencyAllAbsencesCard";
import FrequencyNoJustifiedCard from "@/components/attendance/FrequencyNoJustifiedCard";
import RegisteredAbsencesCard from "@/components/attendance/RegisteredAbsencesCard";
import RegisterAtestadoCard from "@/components/attendance/RegisterAtestadoCard";
import AtestadoHistoryCard from "@/components/attendance/AtestadoHistoryCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import RegisterSuspensaoCard from "@/components/attendance/RegisterSuspensaoCard";
import SuspensaoHistoryCard from "@/components/interactions/SuspensaoHistoryCard";
import RegisterInteractionCard from "@/components/interactions/RegisterInteractionCard";
import InteractionHistoryCard from "@/components/interactions/InteractionHistoryCard";
import ProvaSaoPauloCard from "@/components/students/ProvaSaoPauloCard";
import WhatsAppModal from "@/components/whatsapp/WhatsAppModal";
import { Student, StudentRecord, FamilyInteraction, Atestado, Suspensao, AbsenceRecord, BimesterDates, AnoLetivoData, Contato } from "@/types";
import { calculateDiasLetivos, parseDate, parseDateToFirebase, formatFirebaseDate, getBimesterByDate, getDiasLetivosNoPeriodo } from "../utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import WhatsAppTrackingService from "../../services/whatsappTrackingService";
import { FIREBASE_PATHS } from "@/config/constants";

export default function StudentProfilePage() {
    const searchParams = useSearchParams();
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [selectedTurma, setSelectedTurma] = useState<string>("");
    const [selectedStudentId, setSelectedStudentId] = useState<string>("");
    const [student, setStudent] = useState<Student | null>(null);
    const [studentRecord, setStudentRecord] = useState<StudentRecord | null>(null);
    const [studentRecordWithoutJustified, setStudentRecordWithoutJustified] = useState<StudentRecord | null>(null);
    const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
    const [atestados, setAtestados] = useState<Atestado[]>([]);
    const [suspensoes, setSuspensoes] = useState<Suspensao[]>([]);
    const [interactions, setInteractions] = useState<FamilyInteraction[]>([]);
    const [interactionType, setInteractionType] = useState<string>("");
    const [interactionDate, setInteractionDate] = useState<string>(new Date().toLocaleDateString("pt-BR"));
    const [interactionDescription, setInteractionDescription] = useState<string>("");
    const [interactionSensitive, setInteractionSensitive] = useState<boolean>(false);
    const [atestadoStartDate, setAtestadoStartDate] = useState<string>("");
    const [atestadoDays, setAtestadoDays] = useState<string>("");
    const [atestadoDescription, setAtestadoDescription] = useState<string>("");
    const [editingAtestado, setEditingAtestado] = useState<Atestado | null>(null);
    const [suspensaoStartDate, setSuspensaoStartDate] = useState<string>("");
    const [suspensaoDays, setSuspensaoDays] = useState<string>("");
    const [suspensaoDescription, setSuspensaoDescription] = useState<string>("");
    const [editingSuspensao, setEditingSuspensao] = useState<Suspensao | null>(null);
    const [isSubmittingAtestado, setIsSubmittingAtestado] = useState<boolean>(false);
    const [, setLoadingStudents] = useState<boolean>(true);
    const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
    const [, setLoadingUserRole] = useState<boolean>(true);
    const [searchName, setSearchName] = useState<string>("");
    const debouncedSearchName = useDebounce(searchName, 300); // 300ms para autocomplete
    const [suggestions, setSuggestions] = useState<Student[]>([]);
    const isSelectingStudent = useRef(false);
    const [bimesterDates, setBimesterDates] = useState<BimesterDates>({});
    const [userRole, setUserRole] = useState<string | null>(null);
    const [editingInteraction, setEditingInteraction] = useState<FamilyInteraction | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
    const [showDeleteAtestadoDialog, setShowDeleteAtestadoDialog] = useState<string | null>(null);
    const [showDeleteSuspensaoDialog, setShowDeleteSuspensaoDialog] = useState<string | null>(null);
    
    // WhatsApp states
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contato | null>(null);
    const [verifiedWhatsAppNumbers, setVerifiedWhatsAppNumbers] = useState<Set<string>>(new Set());
    const [contactVerificationData, setContactVerificationData] = useState<Map<string, any>>(new Map());

    // WhatsApp interaction states (para o card de interação)
    const [selectedWhatsAppPhones, setSelectedWhatsAppPhones] = useState<Set<string>>(new Set());
    const [whatsAppMessage, setWhatsAppMessage] = useState<string>("");

    const auth = getAuth();

    // Sync form fields with editingAtestado
    useEffect(() => {
        if (editingAtestado) {
            setAtestadoStartDate(editingAtestado.startDate);
            setAtestadoDays(editingAtestado.days.toString());
            setAtestadoDescription(editingAtestado.description);
        } else {
            setAtestadoStartDate("");
            setAtestadoDays("");
            setAtestadoDescription("");
        }
    }, [editingAtestado]);

    // Sync form fields with editingSuspensao
    useEffect(() => {
        if (editingSuspensao) {
            setSuspensaoStartDate(editingSuspensao.startDate);
            setSuspensaoDays(editingSuspensao.days.toString());
            setSuspensaoDescription(editingSuspensao.description);
        } else {
            setSuspensaoStartDate("");
            setSuspensaoDays("");
            setSuspensaoDescription("");
        }
    }, [editingSuspensao]);

    // Fetch user role by email
    useEffect(() => {
        const fetchUserRole = async () => {
            setLoadingUserRole(true);
            try {
                const user = auth.currentUser;
                if (!user || !user.uid) {
                    setUserRole("user");
                    return;
                }

                // Buscar perfil do usuário via Supabase
                const userProfile = await UserProfilesService.getByFirebaseUid(user.uid);

                if (userProfile) {
                    setUserRole(userProfile.role?.toLowerCase() || "user");
                } else {
                    setUserRole("user");
                }
            } catch (error) {
                logger.error("Erro ao carregar perfil do usuário", error as Error);
                setUserRole("user");
            } finally {
                setLoadingUserRole(false);
            }
        };
        fetchUserRole();
    }, [auth]);

    // Load verified WhatsApp numbers and contact verification data
    useEffect(() => {
        const loadVerifiedNumbers = async () => {
            try {
                const verifiedNumbers = await WhatsAppTrackingService.getAllVerifiedNumbers();
                setVerifiedWhatsAppNumbers(verifiedNumbers);
            } catch (error) {
                logger.error("Erro ao carregar números verificados do WhatsApp", {}, error as Error);
            }
        };
        loadVerifiedNumbers();
    }, []);

    // Load contact verification data when student changes
    useEffect(() => {
        const loadContactVerificationData = () => {
            if (!student?.contatos || student.contatos.length === 0) {
                setContactVerificationData(new Map());
                setVerifiedWhatsAppNumbers(new Set());
                return;
            }

            try {
                const verificationMap = new Map();
                const verifiedNumbers = new Set<string>();

                // ✅ Usar dados DIRETO da estrutura V3 (igual telefones/page.tsx linhas 100-104)
                for (const contato of student.contatos) {
                    const cleanPhone = contato.telefone.replace(/\D/g, '');

                    // Dados já vêm do StudentDataService com campo 'whatsapp'
                    if (contato.whatsapp) {
                        const { verified, exists, verifiedAt } = contato.whatsapp;

                        verificationMap.set(cleanPhone, {
                            hasWhatsApp: exists || false,
                            verificationStatus: verified ? 'verified' : 'error',
                            isVerified: verified || false,
                            verifiedAt: verifiedAt
                        });

                        // Adicionar ao Set se tem WhatsApp verificado
                        if (exists) {
                            verifiedNumbers.add(cleanPhone);
                        }
                    }
                }

                setContactVerificationData(verificationMap);
                setVerifiedWhatsAppNumbers(verifiedNumbers);
            } catch (error) {
                logger.error("Erro ao carregar dados de verificação dos contatos", {}, error as Error);
            }
        };

        if (student) {
            loadContactVerificationData();
        }
    }, [student]);

    const fetchAllStudents = useCallback(async (): Promise<void> => {
        try {
            setLoadingStudents(true);

            // PERFORMANCE: Não carregar contatos na listagem inicial (false = 1 query vs 736 queries)
            const allStudentsData = await StudentDataService.getStudents(false, false);

            const activeStudents = allStudentsData
                .filter(s => s.status === "ATIVO")
                .map(student => ({
                    ...student,
                    contatos: student.contatos || [],
                    provaSaoPaulo: student.provaSaoPaulo || [],
                }));

            setAllStudents(activeStudents.sort((a, b) => a.nome.localeCompare(b.nome)));
        } catch (error) {
            logger.error("Erro ao buscar lista de estudantes", error as Error);
        } finally {
            setLoadingStudents(false);
        }
    }, []);

    const fetchBimesterDates = useCallback(async () => {
        try {
            const year = parseInt(process.env.NEXT_PUBLIC_SCHOOL_YEAR || "2025");

            // Buscar dados de controle de ausências do Supabase (contém períodos dos bimestres)
            const absenceControlData = await AbsenceControlService.getByYear(year);

            const dates: BimesterDates = {};
            absenceControlData.forEach((bimester) => {
                if (bimester.startDate && bimester.endDate) {
                    dates[bimester.bimester] = {
                        start: bimester.startDate,
                        end: bimester.endDate,
                    };
                }
            });

            // Fallback para datas padrão se não houver dados
            if (Object.keys(dates).length === 0) {
                dates[1] = { start: "01/01/2025", end: "31/12/2025" };
                dates[2] = { start: "01/01/2025", end: "31/12/2025" };
                dates[3] = { start: "01/01/2025", end: "31/12/2025" };
                dates[4] = { start: "01/01/2025", end: "31/12/2025" };
            }

            setBimesterDates(dates);
        } catch (error) {
            logger.error("Erro ao buscar períodos dos bimestres", error as Error);
        }
    }, []);

    const fetchStudentData = useCallback(async (studentId: string): Promise<void> => {
        if (!studentId) return;

        try {
            setLoadingProfile(true);

            // SEMPRE buscar estudante completo COM contatos via StudentDataService
            // (O cache inicial não tem contatos para performance)
            const studentData = await StudentDataService.getStudentById(studentId);

            if (studentData) {
                setStudent(studentData);
            } else {
                logger.warn('Estudante não encontrado');
                return;
            }

            // Fetch absences via Supabase
            const supabaseAbsences = await AbsenceService.getStudentAbsences(studentId);
            const absenceRecords: AbsenceRecord[] = supabaseAbsences
                .map((absence: any) => ({
                    estudanteId: absence.estudanteId,
                    data: absence.absence_date || absence.data,
                    justified: absence.is_justified || absence.justified,
                    atestadoId: absence.atestadoId || undefined,
                    suspensaoId: absence.suspensaoId || undefined,
                }))
                .sort((a: any, b: any) => (parseDateToFirebase(a.data)?.localeCompare(parseDateToFirebase(b.data) || "") || 0));

            setAbsences(absenceRecords);

            // Fetch atestados via Supabase
            const supabaseAtestados = await MedicalCertificatesService.getByStudentId(studentId);
            const atestadoRecords: Atestado[] = supabaseAtestados.map((cert) => ({
                id: cert.id,
                startDate: formatFirebaseDate(cert.startDate),
                days: cert.daysCovered || 0,
                description: cert.diagnosis || cert.doctorName || '',
                createdBy: cert.createdBy || "Não informado",
            })).sort((a, b) => (parseDateToFirebase(b.startDate)?.localeCompare(parseDateToFirebase(a.startDate) || "") || 0));
            setAtestados(atestadoRecords);

            // Fetch suspensoes via Supabase
            const supabaseSuspensoes = await StudentSuspensionsService.getByStudentId(studentId);
            const suspensaoRecords: Suspensao[] = supabaseSuspensoes.map((suspension) => ({
                id: suspension.id,
                startDate: formatFirebaseDate(suspension.startDate),
                days: suspension.daysSuspended || 0,
                description: suspension.reason || suspension.description || '',
                createdBy: suspension.createdBy || "Não informado",
            })).sort((a, b) => (parseDateToFirebase(b.startDate)?.localeCompare(parseDateToFirebase(a.startDate) || "") || 0));
            setSuspensoes(suspensaoRecords);

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate = parseDate(bimesterDates[1]?.start) || new Date(2025, 0, 1);
            const diasLetivos = await calculateDiasLetivos(startDate.toLocaleDateString("pt-BR"), today.toLocaleDateString("pt-BR"));

            // Calculate for all absences
            const faltasB1 = absenceRecords.filter((d: AbsenceRecord) => d.data && getBimesterByDate(d.data, bimesterDates) === 1).length;
            const faltasB2 = absenceRecords.filter((d: AbsenceRecord) => d.data && getBimesterByDate(d.data, bimesterDates) === 2).length;
            const faltasB3 = absenceRecords.filter((d: AbsenceRecord) => d.data && getBimesterByDate(d.data, bimesterDates) === 3).length;
            const faltasB4 = absenceRecords.filter((d: AbsenceRecord) => d.data && getBimesterByDate(d.data, bimesterDates) === 4).length;
            const totalFaltas = faltasB1 + faltasB2 + faltasB3 + faltasB4;

            const totalFaltasAteHoje = absenceRecords.filter((record: AbsenceRecord) => {
                if (!record.data) return false;
                const date = parseDate(record.data);
                return date !== null && date >= startDate && date <= today;
            }).length;

            const aggregated: StudentRecord = {
                estudanteId: studentId,
                turma: studentData.turma || "",
                nome: studentData.nome || "",
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
            const faltasB1NoJustified = absenceRecords.filter((d: AbsenceRecord) => d.data && getBimesterByDate(d.data, bimesterDates) === 1 && !d.justified).length;
            const faltasB2NoJustified = absenceRecords.filter((d: AbsenceRecord) => d.data && getBimesterByDate(d.data, bimesterDates) === 2 && !d.justified).length;
            const faltasB3NoJustified = absenceRecords.filter((d: AbsenceRecord) => d.data && getBimesterByDate(d.data, bimesterDates) === 3 && !d.justified).length;
            const faltasB4NoJustified = absenceRecords.filter((d: AbsenceRecord) => d.data && getBimesterByDate(d.data, bimesterDates) === 4 && !d.justified).length;
            const totalFaltasNoJustified = faltasB1NoJustified + faltasB2NoJustified + faltasB3NoJustified + faltasB4NoJustified;

            const totalFaltasAteHojeNoJustified = absenceRecords.filter((record: AbsenceRecord) => {
                if (!record.data) return false;
                const date = parseDate(record.data);
                return date !== null && date >= startDate && date <= today && !record.justified;
            }).length;

            const aggregatedNoJustified: StudentRecord = {
                estudanteId: studentId,
                turma: studentData.turma || "",
                nome: studentData.nome || "",
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

            // Buscar interações via Supabase
            const supabaseInteractions = await InteractionService.getStudentInteractions(studentId);
            const interactionRecords: FamilyInteraction[] = supabaseInteractions.map((interaction: any) => ({
                id: interaction.id,
                type: interaction.type,
                date: formatFirebaseDate(interaction.date), // Converter YYYY-MM-DD → DD/MM/YYYY
                description: interaction.description || '',
                createdBy: interaction.createdBy || "Não informado",
                sensitive: interaction.sensitive || false,
                studentId: studentId,
                whatsappMessage: interaction.whatsappMessage,
                whatsappPhones: interaction.whatsappPhones,
                // 🆕 Campos de status WhatsApp (webhook)
                whatsappMessageId: interaction.whatsappMessageId,
                whatsappStatus: interaction.whatsappStatus,
                whatsappStatusHistory: interaction.whatsappStatusHistory,
                whatsappSentAt: interaction.whatsappSentAt,
                whatsappDeliveredAt: interaction.whatsappDeliveredAt,
                whatsappReadAt: interaction.whatsappReadAt,
                whatsappPlayedAt: interaction.whatsappPlayedAt,
                whatsappUpdatedAt: interaction.whatsappUpdatedAt,
            }));

            // Ordenar por data
            interactionRecords.sort((a, b) => (parseDateToFirebase(b.date)?.localeCompare(parseDateToFirebase(a.date) || "") || 0));

            setInteractions(interactionRecords);
        } catch (error) {
            logger.error("Erro ao buscar dados do aluno", error as Error);
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

    // Detectar query parameter 'id' e selecionar estudante automaticamente
    useEffect(() => {
        const studentIdFromQuery = searchParams.get('id');
        if (studentIdFromQuery && allStudents.length > 0 && !selectedStudentId) {
            // Verificar se o ID existe nos estudantes carregados
            const foundStudent = allStudents.find(s => s.estudanteId === studentIdFromQuery);
            if (foundStudent) {
                setSelectedStudentId(studentIdFromQuery);
                setSearchName(foundStudent.nome);
                // Limpar sugestões e resetar turma
                setSuggestions([]);
                setSelectedTurma("");
                // Feedback para o usuário
                toast.success(`Perfil do estudante ${foundStudent.nome} carregado automaticamente`);
            } else {
                toast.error('Estudante não encontrado');
            }
        }
    }, [searchParams, allStudents, selectedStudentId]);

    // Função para recarregar dados quando uma falta é removida
    const handleAbsenceDeleted = useCallback(async () => {
        if (selectedStudentId) {
            await fetchStudentData(selectedStudentId);
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

        // Validação específica para "Contato digital"
        if (interactionType === "Contato digital") {
            if (selectedWhatsAppPhones.size !== 1) {
                toast.error("Selecione exatamente 1 contato para enviar WhatsApp.");
                return;
            }

            if (!whatsAppMessage.trim()) {
                toast.error("Digite a mensagem que será enviada via WhatsApp.");
                return;
            }
        }

        try {
            const scrollPosition = window.scrollY;
            const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido";

            // FASE 1: Se for "Contato digital", enviar WhatsApp PRIMEIRO
            let whatsappMessageId: string | undefined;
            if (interactionType === "Contato digital" && selectedWhatsAppPhones.size > 0) {
                const toastId = toast.loading(`Enviando mensagens para ${selectedWhatsAppPhones.size} contato(s)...`);

                const sendPromises = Array.from(selectedWhatsAppPhones).map(async (phone) => {
                    try {
                        const response = await fetch('/api/evolution/send', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                phone,
                                message: whatsAppMessage.trim()
                            })
                        });

                        const result = await response.json();

                        if (!result.success) {
                            throw new Error(result.error || result.message || "Falha ao enviar mensagem");
                        }

                        // Atualizar contador de mensagens
                        await WhatsAppTrackingService.updateMessageCount(phone);

                        // 🆕 Retornar messageId para salvar na interação
                        return {
                            phone,
                            success: true,
                            messageId: result.data?.messageId
                        };
                    } catch (error) {
                        logger.error("Erro ao enviar WhatsApp", { phone }, error as Error);
                        return { phone, success: false, error: error instanceof Error ? error.message : "Erro desconhecido" };
                    }
                });

                const results = await Promise.allSettled(sendPromises);
                const successCount = results.filter(r => r.status === "fulfilled" && r.value.success).length;
                const failCount = results.length - successCount;

                // 🆕 Capturar messageId da primeira mensagem bem-sucedida
                const firstSuccess = results.find(r => r.status === "fulfilled" && r.value.success);
                if (firstSuccess && firstSuccess.status === "fulfilled") {
                    whatsappMessageId = firstSuccess.value.messageId;
                }

                toast.dismiss(toastId);

                // Se NENHUMA mensagem foi enviada com sucesso, ABORTAR
                if (successCount === 0) {
                    toast.error(`Falha ao enviar todas as mensagens (${failCount}). A interação NÃO foi salva.`);
                    return; // IMPORTANTE: Não salvar interação se todas falharam
                }

                // Se algumas falharam, avisar mas continuar
                if (failCount > 0) {
                    toast.warning(`${successCount} mensagem(ns) enviada(s), ${failCount} falhou(ram). Salvando interação...`);
                } else {
                    toast.success(`${successCount} mensagem(ns) enviada(s) com sucesso!`);
                }
            }

            // FASE 2: Salvar interação via Supabase
            // Para "Contato digital", incluir telefone na descrição
            let finalDescription = interactionDescription;
            let whatsappData: {
                whatsappMessage?: string;
                whatsappPhones?: string[];
                whatsappMessageId?: string;
                whatsappStatus?: string;
                whatsappSentAt?: string;
            } = {};

            if (interactionType === "Contato digital" && selectedWhatsAppPhones.size === 1 && student?.contatos) {
                const phoneNumber = Array.from(selectedWhatsAppPhones)[0];
                const contact = student.contatos.find(c => c.telefone.replace(/\D/g, '') === phoneNumber);
                const contactName = contact ? `${contact.nome}${contact.parentesco ? ` (${contact.parentesco})` : ''}` : phoneNumber;
                finalDescription = `Mensagem enviada via WhatsApp para: ${contactName} - ${phoneNumber}\n\n${interactionDescription}`;

                // Salvar mensagem WhatsApp original, telefones, messageId e status inicial
                whatsappData = {
                    whatsappMessage: whatsAppMessage, // Mensagem original enviada
                    whatsappPhones: [phoneNumber],
                    whatsappMessageId: whatsappMessageId, // 🆕 ID da mensagem (para webhook encontrar)
                    whatsappStatus: 'SENT', // 🆕 Status inicial (será atualizado pelo webhook)
                    whatsappSentAt: new Date().toISOString(), // 🆕 Timestamp de envio
                };
            }

            await InteractionService.createInteraction(selectedStudentId, {
                studentId: selectedStudentId,
                type: interactionType,
                date: formattedDate,
                description: finalDescription,
                createdBy: currentUser,
                sensitive: interactionSensitive,
                ...whatsappData, // Incluir whatsappMessage e whatsappPhones se for Contato digital
            });

            logger.interactionOperation('create', selectedStudentId, interactionType, { supabase: true });

            // Limpar todos os campos (incluindo WhatsApp)
            setInteractionType("");
            setInteractionDate(new Date().toLocaleDateString("pt-BR"));
            setInteractionDescription("");
            setInteractionSensitive(false);
            setSelectedWhatsAppPhones(new Set());
            setWhatsAppMessage("");

            await fetchStudentData(selectedStudentId);

            window.scrollTo(0, scrollPosition);
            document.getElementById("interaction-card")?.scrollIntoView({ behavior: "smooth", block: "start" });

            toast.success("Interação salva com sucesso!");
        } catch (error) {
            logger.error("Erro ao cadastrar interação", error as Error);
            toast.error("Erro ao salvar interação. Os campos foram mantidos para você tentar novamente.");
            // NÃO limpar campos em caso de erro (conforme solicitado)
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
            // Atualizar interação via Supabase
            await InteractionService.updateInteraction(editingInteraction.id, {
                type: interactionType,
                date: formattedDate,
                description: interactionDescription,
                sensitive: interactionSensitive,
            });

            logger.interactionOperation('update', selectedStudentId, editingInteraction.type, { supabase: true });

            setEditingInteraction(null);
            setInteractionType("");
            setInteractionDate(new Date().toLocaleDateString("pt-BR"));
            setInteractionDescription("");
            setInteractionSensitive(false);
            await fetchStudentData(selectedStudentId);
            toast.success("Interação atualizada com sucesso!");
        } catch (error) {
            logger.error("Erro ao atualizar interação", error as Error);
            toast.error("Erro ao atualizar interação. Tente novamente.");
        }
    };

    const handleDeleteInteraction = async (interactionId: string): Promise<void> => {
        if (!selectedStudentId) return;
        try {
            // Deletar via Supabase
            await InteractionService.deleteInteraction(interactionId);

            logger.interactionOperation('delete', selectedStudentId, 'unknown', { supabase: true });

            await fetchStudentData(selectedStudentId);
            toast.success("Interação excluída com sucesso!");
        } catch (error) {
            logger.error("Erro ao excluir interação", error as Error);
            toast.error("Erro ao excluir interação. Tente novamente.");
        } finally {
            setShowDeleteDialog(null);
        }
    };

    const handleAddAtestado = async (): Promise<void> => {
        // ✅ Prevenir múltiplos cliques
        if (isSubmittingAtestado) {
            toast.warning("Processando... aguarde.");
            return;
        }

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
            setIsSubmittingAtestado(true); // ✅ Desabilitar botão

            const startDate = parseDate(atestadoStartDate);
            if (!startDate) throw new Error("Data inválida");
            // ✅ Calcular endDate usando UTC para evitar problemas de timezone
            const endDate = new Date(Date.UTC(
                startDate.getUTCFullYear(),
                startDate.getUTCMonth(),
                startDate.getUTCDate() + days - 1
            ));

            // ✅ VALIDAÇÃO: Verificar duplicatas antes de salvar via Supabase
            const existingAtestados = await MedicalCertificatesService.getByStudentId(selectedStudentId);

            const isDuplicate = existingAtestados.some(cert => {
                return (
                    cert.startDate === formattedDate &&
                    cert.daysCovered === days &&
                    (cert.diagnosis || cert.doctorName) === atestadoDescription
                );
            });

            if (isDuplicate) {
                toast.error("Este atestado já foi cadastrado anteriormente.");
                setIsSubmittingAtestado(false);
                return;
            }

            // Criar atestado via Supabase
            const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido";
            const newCertificate = await MedicalCertificatesService.create({
                studentId: selectedStudentId,
                startDate: formattedDate,
                endDate: endDate.toISOString().split('T')[0], // YYYY-MM-DD
                diagnosis: atestadoDescription,
                createdBy: currentUser,
            });

            if (!newCertificate) {
                throw new Error("Falha ao criar atestado");
            }

            const atestadoId = newCertificate.id;

            // Obter os dias letivos no período do atestado
            const diasLetivos = await getDiasLetivosNoPeriodo(startDate, endDate);

            // Obter as faltas já existentes para o aluno via Supabase
            const supabaseAbsences = await AbsenceService.getStudentAbsences(selectedStudentId);
            const faltasExistentes = new Map();

            supabaseAbsences.forEach((absence: any) => {
                const dataFormatada = formatFirebaseDate(absence.absenceDate);
                faltasExistentes.set(dataFormatada, {
                    id: absence.id,
                    justified: absence.justificationType !== 'NAO_JUSTIFICADA',
                    atestadoId: absence.certificateId
                });
            });

            // Criar ou atualizar registros de faltas para os dias letivos
            for (const dataLetiva of diasLetivos) {
                // dataLetiva vem em formato ISO (YYYY-MM-DD) de getDiasLetivosNoPeriodo
                let dataFirebase: string;

                // Se já está em formato YYYY-MM-DD, usar direto
                if (dataLetiva.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    dataFirebase = dataLetiva;
                } else {
                    // Se está em formato DD/MM/YYYY, converter
                    const converted = parseDateToFirebase(dataLetiva);
                    if (!converted) continue;
                    dataFirebase = converted;
                }

                // Converter para formato brasileiro para buscar no Map
                const dataBrasileira = formatFirebaseDate(dataFirebase);
                const faltaExistente = faltasExistentes.get(dataBrasileira);

                try {
                    if (faltaExistente) {
                        // Atualizar falta existente via Supabase (delete + add)
                        await AbsenceService.deleteAbsence(selectedStudentId, dataFirebase);
                        await AbsenceService.addAbsence({
                            estudanteId: selectedStudentId,
                            data: dataFirebase,
                            justified: true, // ATESTADO = justified
                            atestadoId: atestadoId,
                        });
                    } else {
                        // Criar nova falta justificada via Supabase
                        await AbsenceService.addAbsence({
                            estudanteId: selectedStudentId,
                            data: dataFirebase,
                            justified: true, // ATESTADO = justified
                            atestadoId: atestadoId,
                        });
                    }
                } catch (error: any) {
                    // ⚠️ Se for erro de duplicata (23505), apenas ignorar e continuar
                    if (error?.code === '23505') {
                        // Falta já existe, pular silenciosamente
                    } else {
                        // Outros erros devem propagar
                        throw error;
                    }
                }
            }

            setAtestadoStartDate("");
            setAtestadoDays("");
            setAtestadoDescription("");
            await fetchStudentData(selectedStudentId);

            document.getElementById("atestado-card")?.scrollIntoView({ behavior: "smooth", block: "start" });

            toast.success("Atestado salvo com sucesso!");
        } catch (error) {
            logger.error("Erro ao cadastrar atestado", error as Error);
            toast.error("Erro ao salvar atestado. Tente novamente.");
        } finally {
            setIsSubmittingAtestado(false); // ✅ Reabilitar botão
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
            // Atualizar atestado via Supabase
            const startDate = parseDate(atestadoStartDate);
            if (!startDate) throw new Error("Data inválida");
            // ✅ Calcular endDate usando UTC para evitar problemas de timezone
            const endDate = new Date(Date.UTC(
                startDate.getUTCFullYear(),
                startDate.getUTCMonth(),
                startDate.getUTCDate() + days - 1
            ));

            const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido";

            await MedicalCertificatesService.update(editingAtestado.id, {
                startDate: formattedDate,
                endDate: endDate.toISOString().split('T')[0],
                diagnosis: atestadoDescription,
            });

            // Reset absences previously justified by this atestado via Supabase
            const allAbsences = await AbsenceService.getStudentAbsences(selectedStudentId);

            // Primeiro, remover as justificativas das faltas anteriores
            for (const absence of allAbsences) {
                if (absence.atestadoId === editingAtestado.id) {
                    const absenceDate = absence.absence_date || absence.data;
                    if (!absenceDate) continue;

                    // Update via delete + add (sem certificado)
                    await AbsenceService.deleteAbsence(selectedStudentId, absenceDate);
                    await AbsenceService.addAbsence({
                        estudanteId: selectedStudentId,
                        data: absenceDate,
                        justified: false, // Remove justificativa
                        atestadoId: undefined,
                    });
                }
            }

            // Obter os dias letivos no período do atestado atualizado
            const diasLetivos = await getDiasLetivosNoPeriodo(startDate, endDate);

            // Mapear as faltas existentes (reutilizar allAbsences já carregado)
            const faltasExistentes = new Map();
            allAbsences.forEach((absence: any) => {
                const absenceDate = absence.absence_date || absence.data;
                if (!absenceDate) return;
                const dataFormatada = formatFirebaseDate(absenceDate);
                faltasExistentes.set(dataFormatada, absence); // Guarda o objeto completo
            });

            // Criar ou atualizar registros de faltas para os dias letivos no novo período
            for (const dataLetiva of diasLetivos) {
                // dataLetiva vem em formato ISO (YYYY-MM-DD) de getDiasLetivosNoPeriodo
                let dataFirebase: string;

                if (dataLetiva.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    dataFirebase = dataLetiva;
                } else {
                    const converted = parseDateToFirebase(dataLetiva);
                    if (!converted) continue;
                    dataFirebase = converted;
                }

                // Converter para formato brasileiro para buscar no Map
                const dataBrasileira = formatFirebaseDate(dataFirebase);
                const faltaExistente = faltasExistentes.get(dataBrasileira);

                if (faltaExistente) {
                    // Atualizar falta existente via Supabase (delete + add)
                    await AbsenceService.deleteAbsence(selectedStudentId, dataFirebase);
                    await AbsenceService.addAbsence({
                        estudanteId: selectedStudentId,
                        data: dataFirebase,
                        justified: true, // ATESTADO = justified
                        atestadoId: editingAtestado.id,
                    });
                } else {
                    // Criar nova falta justificada via Supabase
                    await AbsenceService.addAbsence({
                        estudanteId: selectedStudentId,
                        data: dataFirebase,
                        justified: true, // ATESTADO = justified
                        atestadoId: editingAtestado.id,
                    });
                }
            }

            setEditingAtestado(null);
            setAtestadoStartDate("");
            setAtestadoDays("");
            setAtestadoDescription("");
            await fetchStudentData(selectedStudentId);
            toast.success("Atestado atualizado com sucesso!");
        } catch (error) {
            logger.error("Erro ao atualizar atestado", error as Error);
            toast.error("Erro ao atualizar atestado. Tente novamente.");
        }
    };

    const handleDeleteAtestado = async (atestadoId: string): Promise<void> => {
        if (!selectedStudentId) return;
        try {
            // Deletar atestado via Supabase
            await MedicalCertificatesService.delete(atestadoId);

            // Reset absences justified by this atestado via Supabase
            const allAbsences = await AbsenceService.getStudentAbsences(selectedStudentId);

            for (const absence of allAbsences) {
                if (absence.atestadoId === atestadoId) {
                    const absenceDate = absence.absence_date || absence.data;
                    if (!absenceDate) continue;

                    // Update via delete + add (remove certificate)
                    await AbsenceService.deleteAbsence(selectedStudentId, absenceDate);
                    await AbsenceService.addAbsence({
                        estudanteId: selectedStudentId,
                        data: absenceDate,
                        justified: false, // Remove justificativa
                        atestadoId: undefined,
                    });
                }
            }

            await fetchStudentData(selectedStudentId);
            toast.success("Atestado excluído com sucesso!");
        } catch (error) {
            logger.error("Erro ao excluir atestado", error as Error);
            toast.error("Erro ao excluir atestado. Tente novamente.");
        } finally {
            setShowDeleteAtestadoDialog(null);
        }
    };

    const handleAddSuspensao = async (): Promise<void> => {
        if (!selectedStudentId || !suspensaoStartDate || !suspensaoDays || !suspensaoDescription) {
            toast.error("Preencha todos os campos para adicionar uma suspensão.");
            return;
        }

        const formattedDate = parseDateToFirebase(suspensaoStartDate);
        const days = parseInt(suspensaoDays);
        if (!formattedDate) {
            toast.error("Data inválida. Use o formato DD/MM/YYYY.");
            return;
        }
        if (isNaN(days) || days < 1) {
            toast.error("Número de dias inválido.");
            return;
        }

        try {
            const startDate = parseDate(suspensaoStartDate);
            if (!startDate) throw new Error("Data inválida");
            // ✅ Calcular endDate usando UTC para evitar problemas de timezone
            const endDate = new Date(Date.UTC(
                startDate.getUTCFullYear(),
                startDate.getUTCMonth(),
                startDate.getUTCDate() + days - 1
            ));

            // Criar suspensão via Supabase
            const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido";
            const newSuspension = await StudentSuspensionsService.create({
                studentId: selectedStudentId,
                startDate: formattedDate,
                endDate: endDate.toISOString().split('T')[0],
                reason: suspensaoDescription,
                description: suspensaoDescription,
                severity: 'MODERADA', // Severity padrão
                decisionBy: currentUser,
                decisionDate: formattedDate, // Data da decisão
                createdBy: currentUser,
            });

            if (!newSuspension) {
                throw new Error("Falha ao criar suspensão");
            }

            const suspensaoId = newSuspension.id;

            // Obter os dias letivos no período da suspensão
            const diasLetivos = await getDiasLetivosNoPeriodo(startDate, endDate);

            // Obter as faltas já existentes para o aluno via Supabase
            const supabaseAbsences = await AbsenceService.getStudentAbsences(selectedStudentId);
            const faltasExistentes = new Map();

            supabaseAbsences.forEach((absence: any) => {
                const dataFormatada = formatFirebaseDate(absence.absenceDate);
                faltasExistentes.set(dataFormatada, {
                    id: absence.id,
                    justified: absence.justificationType !== 'NAO_JUSTIFICADA',
                    suspensaoId: absence.suspensionId
                });
            });

            // Criar ou atualizar registros de faltas para os dias letivos (NÃO justificadas)
            for (const dataLetiva of diasLetivos) {
                let dataFirebase: string;

                if (dataLetiva.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    dataFirebase = dataLetiva;
                } else {
                    const converted = parseDateToFirebase(dataLetiva);
                    if (!converted) continue;
                    dataFirebase = converted;
                }

                const dataBrasileira = formatFirebaseDate(dataFirebase);
                const faltaExistente = faltasExistentes.get(dataBrasileira);

                if (faltaExistente) {
                    // Atualizar falta existente (justificada) via Supabase (delete + add)
                    await AbsenceService.deleteAbsence(selectedStudentId, dataFirebase);
                    await AbsenceService.addAbsence({
                        estudanteId: selectedStudentId,
                        data: dataFirebase,
                        justified: false, // ❌ Suspensão = NÃO justificada (diferente de atestado)
                        suspensaoId: suspensaoId,
                    });
                } else {
                    // Criar nova falta NÃO justificada via Supabase
                    await AbsenceService.addAbsence({
                        estudanteId: selectedStudentId,
                        data: dataFirebase,
                        justified: false, // ❌ Suspensão = NÃO justificada (diferente de atestado)
                        suspensaoId: suspensaoId,
                    });
                }
            }

            setSuspensaoStartDate("");
            setSuspensaoDays("");
            setSuspensaoDescription("");
            await fetchStudentData(selectedStudentId);

            document.getElementById("suspensao-card")?.scrollIntoView({ behavior: "smooth", block: "start" });

            toast.success("Suspensão salva com sucesso!");
        } catch (error) {
            logger.error("Erro ao cadastrar suspensão", error as Error);
            toast.error("Erro ao salvar suspensão. Tente novamente.");
        }
    };

    const handleEditSuspensao = async (): Promise<void> => {
        if (!editingSuspensao || !selectedStudentId || !suspensaoStartDate || !suspensaoDays || !suspensaoDescription) {
            toast.error("Preencha todos os campos para editar a suspensão.");
            return;
        }

        const formattedDate = parseDateToFirebase(suspensaoStartDate);
        const days = parseInt(suspensaoDays);
        if (!formattedDate) {
            toast.error("Data inválida. Use o formato DD/MM/YYYY.");
            return;
        }
        if (isNaN(days) || days < 1) {
            toast.error("Número de dias inválido.");
            return;
        }

        try {
            // Atualizar suspensão via Supabase
            const startDate = parseDate(suspensaoStartDate);
            if (!startDate) throw new Error("Data inválida");
            // ✅ Calcular endDate usando UTC para evitar problemas de timezone
            const endDate = new Date(Date.UTC(
                startDate.getUTCFullYear(),
                startDate.getUTCMonth(),
                startDate.getUTCDate() + days - 1
            ));

            const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido";

            await StudentSuspensionsService.update(editingSuspensao.id, {
                startDate: formattedDate,
                endDate: endDate.toISOString().split('T')[0],
                reason: suspensaoDescription,
                description: suspensaoDescription,
            });

            // Reset absences previously marked by this suspensao via Supabase
            const allAbsences = await AbsenceService.getStudentAbsences(selectedStudentId);

            // Primeiro, remover as marcações das faltas anteriores
            for (const absence of allAbsences) {
                if (absence.suspensaoId === editingSuspensao.id) {
                    const absenceDate = absence.absence_date || absence.data;
                    if (!absenceDate) continue;

                    // Update via delete + add (remove suspension mark)
                    await AbsenceService.deleteAbsence(selectedStudentId, absenceDate);
                    await AbsenceService.addAbsence({
                        estudanteId: selectedStudentId,
                        data: absenceDate,
                        justified: false, // Mantém não justificada
                        suspensaoId: undefined, // Remove suspensão
                    });
                }
            }

            // Obter os dias letivos no período da suspensão atualizada
            const diasLetivos = await getDiasLetivosNoPeriodo(startDate, endDate);

            // Mapear as faltas existentes (reutilizar allAbsences já carregado)
            const faltasExistentes = new Map();
            allAbsences.forEach((absence: any) => {
                const absenceDate = absence.absence_date || absence.data;
                if (!absenceDate) return;
                const dataFormatada = formatFirebaseDate(absenceDate);
                faltasExistentes.set(dataFormatada, absence); // Guarda o objeto completo
            });

            // Criar ou atualizar registros de faltas para os dias letivos no novo período
            for (const dataLetiva of diasLetivos) {
                let dataFirebase: string;

                if (dataLetiva.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    dataFirebase = dataLetiva;
                } else {
                    const converted = parseDateToFirebase(dataLetiva);
                    if (!converted) continue;
                    dataFirebase = converted;
                }

                const dataBrasileira = formatFirebaseDate(dataFirebase);
                const faltaExistente = faltasExistentes.get(dataBrasileira);

                if (faltaExistente) {
                    // Atualizar falta existente (NÃO justificada) via Supabase (delete + add)
                    await AbsenceService.deleteAbsence(selectedStudentId, dataFirebase);
                    await AbsenceService.addAbsence({
                        estudanteId: selectedStudentId,
                        data: dataFirebase,
                        justified: false, // ❌ Suspensão = NÃO justificada (diferente de atestado)
                        suspensaoId: editingSuspensao.id,
                    });
                } else{
                    // Criar nova falta NÃO justificada via Supabase
                    await AbsenceService.addAbsence({
                        estudanteId: selectedStudentId,
                        data: dataFirebase,
                        justified: false, // ❌ Suspensão = NÃO justificada (diferente de atestado)
                        suspensaoId: editingSuspensao.id,
                    });
                }
            }

            setEditingSuspensao(null);
            setSuspensaoStartDate("");
            setSuspensaoDays("");
            setSuspensaoDescription("");
            await fetchStudentData(selectedStudentId);
            toast.success("Suspensão atualizada com sucesso!");
        } catch (error) {
            logger.error("Erro ao atualizar suspensão", error as Error);
            toast.error("Erro ao atualizar suspensão. Tente novamente.");
        }
    };

    const handleDeleteSuspensao = async (suspensaoId: string): Promise<void> => {
        if (!selectedStudentId) return;
        try {
            // Deletar suspensão via Supabase
            await StudentSuspensionsService.delete(suspensaoId);

            // Remove absences marked by this suspensao via Supabase
            const allAbsences = await AbsenceService.getStudentAbsences(selectedStudentId);

            for (const absence of allAbsences) {
                if (absence.suspensaoId === suspensaoId) {
                    const absenceDate = absence.absence_date || absence.data;
                    if (!absenceDate) continue;

                    // Update via delete + add (remove suspension mark)
                    await AbsenceService.deleteAbsence(selectedStudentId, absenceDate);
                    await AbsenceService.addAbsence({
                        estudanteId: selectedStudentId,
                        data: absenceDate,
                        justified: false, // Mantém não justificada
                        suspensaoId: undefined, // Remove suspensão
                    });
                }
            }

            await fetchStudentData(selectedStudentId);
            toast.success("Suspensão excluída com sucesso!");
        } catch (error) {
            logger.error("Erro ao excluir suspensão", error as Error);
            toast.error("Erro ao excluir suspensão. Tente novamente.");
        } finally {
            setShowDeleteSuspensaoDialog(null);
        }
    };

    // WhatsApp functions
    const handleWhatsAppClick = (contact: Contato) => {
        setSelectedContact(contact);
        setIsWhatsAppModalOpen(true);
    };

    const handleRetryVerification = async (contact: Contato) => {
        try {
            toast.info("Verificando WhatsApp...");

            // Obter token JWT do usuário autenticado
            const user = auth.currentUser;
            if (!user) {
                toast.error("Usuário não autenticado. Faça login novamente.");
                return;
            }

            const token = await user.getIdToken();

            const response = await fetch('/api/evolution/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    phone: contact.telefone
                })
            });

            const result = await response.json();

            if (result.success && result.data) {
                toast.success(result.data.hasWhatsApp ? "WhatsApp verificado com sucesso!" : "Número sem WhatsApp");

                // ✅ Recarregar dados do estudante completo (inclui verificação V3)
                if (selectedStudentId) {
                    await fetchStudentData(selectedStudentId);
                }
            } else {
                const errorMessage = result.error || "Erro na verificação";
                if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
                    toast.error("API indisponível. Tente novamente mais tarde.");
                } else {
                    toast.error(errorMessage);
                }
            }
        } catch (error) {
            logger.error("Erro ao reverificar WhatsApp", { phone: contact.telefone }, error as Error);
            toast.error("Erro interno. Tente novamente.");
        }
    };

    const handleSendWhatsAppMessage = async (
        phone: string,
        message: string
    ): Promise<{
        success: boolean;
        message: string;
        data?: unknown;
        error?: string;
    }> => {
        try {
            // Obter token JWT do usuário autenticado
            const user = auth.currentUser;
            if (!user) {
                toast.error("Usuário não autenticado. Faça login novamente.");
                return {
                    success: false,
                    message: "Usuário não autenticado",
                    error: "AUTH_ERROR"
                };
            }

            const token = await user.getIdToken();

            const response = await fetch('/api/evolution/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    phone,
                    message
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Mensagem enviada com sucesso!");

                // Atualizar contador de mensagens se necessário
                if (selectedContact) {
                    await WhatsAppTrackingService.updateMessageCount(phone);
                }

                return {
                    success: true,
                    message: "Mensagem enviada com sucesso!",
                    data: result.data
                };
            } else {
                toast.error(result.error || "Falha ao enviar mensagem");
                return {
                    success: false,
                    message: result.error || "Falha ao enviar mensagem"
                };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
            logger.error("Erro ao enviar mensagem WhatsApp", {
                phone: `${phone.substring(0, 4)}****${phone.substring(phone.length - 4)}`,
                studentId: selectedStudentId
            }, error as Error);

            toast.error("Erro interno ao enviar mensagem");
            return {
                success: false,
                message: "Erro interno ao enviar mensagem",
                error: errorMessage
            };
        }
    };

    const handleSearchName = (value: string) => {
        setSearchName(value);

        // Se estamos limpando após seleção, não fazer nada mais
        if (isSelectingStudent.current) {
            isSelectingStudent.current = false;
            return;
        }

        setSelectedTurma("");

        // Limpar o estudante selecionado quando o usuário digita
        if (selectedStudentId) {
            setSelectedStudentId("");
        }

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
        isSelectingStudent.current = true;
        setSelectedStudentId(studentId);
        setSearchName(""); // Limpa o campo após seleção
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
        if (!student || !studentRecordWithoutJustified) return;

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
            'Necessário acompanhamento da família',
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
      <p><strong>Frequência atual:</strong> ${studentRecordWithoutJustified.percentualFrequenciaAteHoje}%</p>
      <p><strong>Faltas:</strong> ${studentRecordWithoutJustified.totalFaltasAteHoje}</p>
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
        <ErrorBoundary>
            <div className="p-4 space-y-6">
                <Toaster />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SearchByNameCard
                    searchName={searchName}
                    suggestions={suggestions}
                    onSearchChange={handleSearchName}
                    onSuggestionSelect={handleSuggestionSelect}
                    selectedStudentId={selectedStudentId}
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
                <div className="space-y-6">
                    <FrequencyCardSkeleton />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FrequencyCardSkeleton />
                        <FrequencyCardSkeleton />
                    </div>
                    <FrequencyCardSkeleton />
                    <InteractionListSkeleton items={3} />
                </div>
            ) : student && (
                <>
                    <StudentInfoCard
                        student={student}
                        studentRecord={studentRecord}
                        studentRecordWithoutJustified={studentRecordWithoutJustified}
                        onWhatsAppClick={handleWhatsAppClick}
                        verifiedWhatsAppNumbers={verifiedWhatsAppNumbers}
                        contactVerificationData={contactVerificationData}
                        onRetryVerification={handleRetryVerification}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FrequencyAllAbsencesCard studentRecord={studentRecord} />
                        <FrequencyNoJustifiedCard studentRecordWithoutJustified={studentRecordWithoutJustified} />
                    </div>
                    <RegisteredAbsencesCard
                        absences={absences}
                        atestados={atestados}
                        suspensoes={suspensoes}
                        bimesterDates={bimesterDates}
                        userRole={userRole}
                        onAbsenceDeleted={handleAbsenceDeleted}
                        selectedStudentId={selectedStudentId}
                    />
                    <RegisterAtestadoCard
                        atestadoStartDate={atestadoStartDate}
                        atestadoDays={atestadoDays}
                        atestadoDescription={atestadoDescription}
                        editingAtestado={editingAtestado}
                        isSubmitting={isSubmittingAtestado}
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
                        contacts={student?.contatos || []}
                        selectedWhatsAppPhones={selectedWhatsAppPhones}
                        onWhatsAppPhonesChange={setSelectedWhatsAppPhones}
                        whatsAppMessage={whatsAppMessage}
                        onWhatsAppMessageChange={setWhatsAppMessage}
                        verifiedWhatsAppNumbers={verifiedWhatsAppNumbers}
                        contactVerificationData={contactVerificationData}
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
                    <RegisterSuspensaoCard
                        suspensaoStartDate={suspensaoStartDate}
                        suspensaoDays={suspensaoDays}
                        suspensaoDescription={suspensaoDescription}
                        editingSuspensao={editingSuspensao}
                        setSuspensaoStartDate={setSuspensaoStartDate}
                        setSuspensaoDays={setSuspensaoDays}
                        setSuspensaoDescription={setSuspensaoDescription}
                        setEditingSuspensao={setEditingSuspensao}
                        onAddSuspensao={handleAddSuspensao}
                        onEditSuspensao={handleEditSuspensao}
                        id="suspensao-card"
                    />
                    <SuspensaoHistoryCard
                        suspensoes={suspensoes}
                        userRole={userRole}
                        showDeleteSuspensaoDialog={showDeleteSuspensaoDialog}
                        setShowDeleteSuspensaoDialog={setShowDeleteSuspensaoDialog}
                        setEditingSuspensao={setEditingSuspensao}
                        onDeleteSuspensao={handleDeleteSuspensao}
                    />
                    {userRole === "admin" && <ProvaSaoPauloCard student={student} />}
                </>
            )}

            {/* WhatsApp Modal */}
            <WhatsAppModal
                isOpen={isWhatsAppModalOpen}
                onClose={() => {
                    setIsWhatsAppModalOpen(false);
                    setSelectedContact(null);
                }}
                student={student}
                selectedContact={selectedContact}
                onSendMessage={handleSendWhatsAppMessage}
                verifiedNumbers={verifiedWhatsAppNumbers}
            />
        </div>
        </ErrorBoundary>
    );
}