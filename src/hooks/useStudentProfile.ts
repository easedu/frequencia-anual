/**
 * useStudentProfile Hook
 *
 * Hook centralizado para gerenciar TODA a lógica do perfil de estudante.
 * Consolida 51 states do arquivo original (1848 linhas) em 1 hook organizado.
 *
 * Seções:
 * 1. Student Selection (busca, turma, estudante selecionado)
 * 2. Student Data (student, absences, atestados, suspensões, interactions)
 * 3. Forms State (interaction, atestado, suspensão)
 * 4. WhatsApp (contact verification, message sending)
 * 5. Computed Values (suggestions, filtered data)
 * 6. Handlers (CRUD operations)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { getAuth } from "firebase/auth";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { useWhatsAppStatusPolling } from "@/hooks/useWhatsAppStatusPolling";
import { StudentDataService } from "@/services/studentDataService";
import { UserProfilesService } from "@/services/supabase/userProfilesService";
import { AbsenceControlService } from "@/services/supabase/absenceControlService";
import { AbsenceService } from "@/services/supabase/absenceService";
import { MedicalCertificatesService } from "@/services/supabase/medicalCertificatesService";
import { StudentSuspensionsService } from "@/services/supabase/studentSuspensionsService";
import { InteractionService } from "@/services/supabase/interactionService";
import WhatsAppTrackingService from "@/services/whatsappTrackingService";
import { logger } from "@/utils/logger";
import type {
  Student,
  StudentRecord,
  FamilyInteraction,
  Atestado,
  Suspensao,
  AbsenceRecord,
  BimesterDates,
  Contato,
} from "@/types";
import {
  calculateDiasLetivos,
  parseDate,
  parseDateToFirebase,
  formatFirebaseDate,
  getBimesterByDate,
  getDiasLetivosNoPeriodo,
} from "@/app/utils";
import { formatDate } from "@/utils/dateUtils";

export function useStudentProfile() {
  const searchParams = useSearchParams();
  const auth = getAuth();

  // ═══════════════════════════════════════════════════════════
  // 1. STUDENT SELECTION (busca, turma, estudante selecionado)
  // ═══════════════════════════════════════════════════════════

  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [searchName, setSearchName] = useState<string>("");
  const debouncedSearchName = useDebounce(searchName, 300);
  const [suggestions, setSuggestions] = useState<Student[]>([]);
  const isSelectingStudent = useRef(false);

  // ═══════════════════════════════════════════════════════════
  // 2. STUDENT DATA (student, absences, atestados, suspensões, interactions)
  // ═══════════════════════════════════════════════════════════

  const [student, setStudent] = useState<Student | null>(null);
  const [studentRecord, setStudentRecord] = useState<StudentRecord | null>(null);
  const [studentRecordWithoutJustified, setStudentRecordWithoutJustified] = useState<StudentRecord | null>(null);
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [atestados, setAtestados] = useState<Atestado[]>([]);
  const [suspensoes, setSuspensoes] = useState<Suspensao[]>([]);
  const [interactions, setInteractions] = useState<FamilyInteraction[]>([]);
  const [bimesterDates, setBimesterDates] = useState<BimesterDates>({});

  // 🔄 Auto-refresh de status WhatsApp (polling adaptativo)
  const interactionsWithLiveStatus = useWhatsAppStatusPolling(interactions, {
    enabled: !!selectedStudentId,
    fastInterval: 5000, // 5s para SENT
    slowInterval: 60000, // 60s para DELIVERED
    studentId: selectedStudentId,
  });

  // ═══════════════════════════════════════════════════════════
  // 3. FORMS STATE (interaction, atestado, suspensão)
  // ═══════════════════════════════════════════════════════════

  // Interaction Form
  const [interactionType, setInteractionType] = useState<string>("");
  const [interactionDate, setInteractionDate] = useState<string>(new Date().toLocaleDateString("pt-BR"));
  const [interactionDescription, setInteractionDescription] = useState<string>("");
  const [interactionSensitive, setInteractionSensitive] = useState<boolean>(false);
  const [editingInteraction, setEditingInteraction] = useState<FamilyInteraction | null>(null);

  // Atestado Form
  const [atestadoStartDate, setAtestadoStartDate] = useState<string>("");
  const [atestadoDays, setAtestadoDays] = useState<string>("");
  const [atestadoDescription, setAtestadoDescription] = useState<string>("");
  const [editingAtestado, setEditingAtestado] = useState<Atestado | null>(null);
  const [isSubmittingAtestado, setIsSubmittingAtestado] = useState<boolean>(false);

  // Suspensão Form
  const [suspensaoStartDate, setSuspensaoStartDate] = useState<string>("");
  const [suspensaoDays, setSuspensaoDays] = useState<string>("");
  const [suspensaoDescription, setSuspensaoDescription] = useState<string>("");
  const [editingSuspensao, setEditingSuspensao] = useState<Suspensao | null>(null);

  // Dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [showDeleteAtestadoDialog, setShowDeleteAtestadoDialog] = useState<string | null>(null);
  const [showDeleteSuspensaoDialog, setShowDeleteSuspensaoDialog] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════
  // 4. WHATSAPP (contact verification, message sending)
  // ═══════════════════════════════════════════════════════════

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contato | null>(null);
  const [verifiedWhatsAppNumbers, setVerifiedWhatsAppNumbers] = useState<Set<string>>(new Set());
  const [contactVerificationData, setContactVerificationData] = useState<Map<string, any>>(new Map());
  const [selectedWhatsAppPhones, setSelectedWhatsAppPhones] = useState<Set<string>>(new Set());
  const [whatsAppMessage, setWhatsAppMessage] = useState<string>("");
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<boolean>(false);
  const [whatsAppSendSuccess, setWhatsAppSendSuccess] = useState<boolean>(false);

  // ═══════════════════════════════════════════════════════════
  // 5. LOADING/ERROR/USER
  // ═══════════════════════════════════════════════════════════

  const [loadingStudents, setLoadingStudents] = useState<boolean>(true);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════
  // EFFECTS: Initialization & URL Params
  // ═══════════════════════════════════════════════════════════

  // Inicializar dados
  useEffect(() => {
    fetchAllStudents();
    fetchBimesterDates();
  }, []);

  // URL param: studentId
  useEffect(() => {
    const studentId = searchParams.get("studentId");
    if (studentId && studentId !== selectedStudentId) {
      handleSelectStudent(studentId);
    }
  }, [searchParams]);

  // Buscar user role
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const user = auth.currentUser;
        if (!user || !user.uid) {
          console.log('🔍 UserRole: Usuário não autenticado, setando como "user"');
          setUserRole("user");
          return;
        }

        const userProfile = await UserProfilesService.getByFirebaseUid(user.uid);
        const role = userProfile?.role?.toLowerCase() || "user";
        console.log('🔍 UserRole carregado:', {
          firebaseUid: user.uid,
          userProfile,
          roleOriginal: userProfile?.role,
          roleLowerCase: role
        });
        setUserRole(role);
      } catch (error) {
        logger.error("Erro ao carregar perfil do usuário", error as Error);
        console.log('🔍 UserRole: Erro ao carregar, setando como "user"');
        setUserRole("user");
      }
    };
    fetchUserRole();
  }, [auth]);

  // Load verified WhatsApp numbers
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
    if (!student?.contatos || student.contatos.length === 0) {
      setContactVerificationData(new Map());
      return;
    }

    try {
      const verificationMap = new Map();
      const verifiedNumbers = new Set<string>();

      for (const contato of student.contatos) {
        const cleanPhone = contato.telefone.replace(/\D/g, "");

        if (contato.whatsapp) {
          const { verified, exists, verifiedAt } = contato.whatsapp;

          verificationMap.set(cleanPhone, {
            hasWhatsApp: exists || false,
            verificationStatus: verified ? "verified" : "error",
            isVerified: verified || false,
            verifiedAt: verifiedAt,
            whatsapp: { verified, exists },
          });

          if (exists) {
            verifiedNumbers.add(cleanPhone);
          }
        } else {
          // Default: assumir que tem WhatsApp
          verificationMap.set(cleanPhone, {
            hasWhatsApp: true,
            verificationStatus: "verified",
            isVerified: true,
            whatsapp: { verified: true, exists: true },
          });
          verifiedNumbers.add(cleanPhone);
        }
      }

      setContactVerificationData(verificationMap);
      setVerifiedWhatsAppNumbers(verifiedNumbers);
    } catch (error) {
      logger.error("Erro ao carregar dados de verificação dos contatos", {}, error as Error);
    }
  }, [student]);

  // Sync form fields with editingAtestado
  useEffect(() => {
    if (editingAtestado) {
      // Converter data ISO (yyyy-mm-dd) para formato brasileiro (dd/mm/yyyy)
      setAtestadoStartDate(formatDate(editingAtestado.startDate));
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
      // Converter data ISO (yyyy-mm-dd) para formato brasileiro (dd/mm/yyyy)
      setSuspensaoStartDate(formatDate(editingSuspensao.startDate));
      setSuspensaoDays(editingSuspensao.days.toString());
      setSuspensaoDescription(editingSuspensao.description);
    } else {
      setSuspensaoStartDate("");
      setSuspensaoDays("");
      setSuspensaoDescription("");
    }
  }, [editingSuspensao]);

  // Autocomplete suggestions
  useEffect(() => {
    if (!debouncedSearchName || isSelectingStudent.current) {
      setSuggestions([]);
      return;
    }

    const filtered = allStudents.filter((s) =>
      s.nome.toLowerCase().includes(debouncedSearchName.toLowerCase())
    );

    setSuggestions(filtered.slice(0, 10)); // Max 10 suggestions
  }, [debouncedSearchName, allStudents]);

  // Load student data when selectedStudentId changes
  useEffect(() => {
    if (selectedStudentId && !loadingProfile) {
      fetchStudentData(selectedStudentId);
    }
  }, [selectedStudentId]);

  // ═══════════════════════════════════════════════════════════
  // FETCH FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const fetchAllStudents = useCallback(async (): Promise<void> => {
    try {
      setLoadingStudents(true);

      // PERFORMANCE: Não carregar contatos na listagem inicial
      const allStudentsData = await StudentDataService.getStudents(false, false);

      const activeStudents = allStudentsData
        .filter((s) => s.status === "ATIVO")
        .map((student) => ({
          ...student,
          contatos: student.contatos || [],
          provaSaoPaulo: student.provaSaoPaulo || [],
        }));

      setAllStudents(activeStudents.sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch (error) {
      logger.error("Erro ao buscar lista de estudantes", error as Error);
      toast.error("Erro ao carregar lista de estudantes");
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  const fetchBimesterDates = useCallback(async () => {
    try {
      const year = parseInt(process.env.NEXT_PUBLIC_SCHOOL_YEAR || "2025");
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

      // Fallback
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

  const fetchStudentData = useCallback(
    async (studentId: string): Promise<void> => {
      if (!studentId) return;

      try {
        setLoadingProfile(true);

        // Buscar estudante completo COM contatos
        const studentData = await StudentDataService.getStudentById(studentId);

        if (studentData) {
          setStudent(studentData);

          // Buscar faltas
          const absencesData = await AbsenceService.getStudentAbsences(studentId);
          setAbsences(absencesData);

          // Buscar atestados e mapear para interface Atestado
          const atestadosData = await MedicalCertificatesService.getByStudentId(studentId);
          const mappedAtestados = atestadosData.map(cert => ({
            id: cert.id,
            startDate: cert.startDate,
            days: cert.daysCovered,              // ✅ MAP: daysCovered → days
            description: cert.diagnosis || cert.doctorName || 'Sem descrição',  // ✅ MAP: diagnosis → description
            createdBy: cert.submittedBy          // ✅ MAP: submittedBy → createdBy
          }));
          setAtestados(mappedAtestados);

          // Buscar suspensões e mapear para interface Suspensao
          const suspensoesData = await StudentSuspensionsService.getByStudentId(studentId);
          const mappedSuspensoes = suspensoesData.map(susp => ({
            id: susp.id,
            startDate: susp.startDate,
            days: susp.daysSuspended,            // ✅ MAP: daysSuspended → days
            description: susp.reason || susp.description || 'Sem descrição',  // ✅ MAP: reason → description
            createdBy: susp.decisionBy           // ✅ MAP: decisionBy → createdBy
          }));
          setSuspensoes(mappedSuspensoes);

          // Buscar interações
          const interactionsData = await InteractionService.getStudentInteractions(studentId);
          setInteractions(interactionsData);

          // TODO: Calcular studentRecord e studentRecordWithoutJustified
          // (Lógica complexa que vem do arquivo original)
        } else {
          toast.error("Estudante não encontrado");
        }
      } catch (error) {
        logger.error("Erro ao buscar dados do estudante", error as Error);
        toast.error("Erro ao carregar dados do estudante");
      } finally {
        setLoadingProfile(false);
      }
    },
    []
  );

  // ═══════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════

  const handleSelectStudent = useCallback(
    (studentId: string) => {
      isSelectingStudent.current = true;
      setSelectedStudentId(studentId);
      setSearchName("");
      setSuggestions([]);
      fetchStudentData(studentId);

      // Reset selecting flag after a short delay
      setTimeout(() => {
        isSelectingStudent.current = false;
      }, 100);
    },
    [fetchStudentData]
  );

  // ═══════════════════════════════════════════════════════════
  // HANDLERS - INTERACTIONS
  // ═══════════════════════════════════════════════════════════

  const handleAddInteraction = useCallback(async (): Promise<void> => {
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

      // Se tipo "Contato digital" e há WhatsApp, enviar mensagem primeiro
      let whatsappMessageId: string | undefined;
      if (interactionType === "Contato digital" && selectedWhatsAppPhones.size === 1) {
        const toastId = toast.loading("Enviando mensagem WhatsApp...");
        setIsSendingWhatsApp(true);

        try {
          const user = auth.currentUser;
          if (!user) throw new Error("Usuário não autenticado");

          const token = await user.getIdToken();
          const phoneNumber = Array.from(selectedWhatsAppPhones)[0];

          const response = await fetch('/api/evolution/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              phone: phoneNumber,
              message: whatsAppMessage.trim()
            })
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || "Falha ao enviar mensagem");
          }

          whatsappMessageId = result.data?.messageId;
          await WhatsAppTrackingService.updateMessageCount(phoneNumber);

          toast.dismiss(toastId);
          toast.success("Mensagem enviada com sucesso!");
        } catch (error) {
          toast.dismiss(toastId);
          toast.error("Falha ao enviar mensagem. A interação NÃO foi salva.");
          setIsSendingWhatsApp(false);
          setWhatsAppSendSuccess(false);
          return;
        }
      }

      // Preparar descrição final e dados WhatsApp
      let finalDescription = interactionDescription;
      let whatsappData: Partial<FamilyInteraction> = {};

      if (interactionType === "Contato digital" && selectedWhatsAppPhones.size === 1 && student?.contatos) {
        const phoneNumber = Array.from(selectedWhatsAppPhones)[0];
        const contact = student.contatos.find(c => c.telefone.replace(/\D/g, '') === phoneNumber);
        const contactName = contact ? `${contact.nome}${contact.parentesco ? ` (${contact.parentesco})` : ''}` : phoneNumber;
        finalDescription = `Mensagem enviada via WhatsApp para: ${contactName} - ${phoneNumber}\n\n${interactionDescription}`;

        whatsappData = {
          whatsappMessage: whatsAppMessage,
          whatsappPhones: [phoneNumber],
          whatsappMessageId: whatsappMessageId,
          whatsappStatus: 'SENT' as const,
          whatsappSentAt: new Date().toISOString(),
        };
      }

      const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido";

      await InteractionService.createInteraction(selectedStudentId, {
        studentId: selectedStudentId,
        type: interactionType,
        date: formattedDate,
        description: finalDescription,
        createdBy: currentUser,
        sensitive: interactionSensitive,
        ...whatsappData,
      } as Omit<FamilyInteraction, 'id'>);

      logger.interactionOperation('create', selectedStudentId, interactionType, { supabase: true });

      // Limpar campos
      setInteractionType("");
      setInteractionDate(new Date().toLocaleDateString("pt-BR"));
      setInteractionDescription("");
      setInteractionSensitive(false);
      setSelectedWhatsAppPhones(new Set());
      setWhatsAppMessage("");

      await fetchStudentData(selectedStudentId);

      setWhatsAppSendSuccess(true);
      setIsSendingWhatsApp(false);

      setTimeout(() => {
        setWhatsAppSendSuccess(false);
      }, 2000);

      window.scrollTo(0, scrollPosition);
      document.getElementById("interaction-card")?.scrollIntoView({ behavior: "smooth", block: "start" });

      toast.success("Interação salva com sucesso!");
    } catch (error) {
      logger.error("Erro ao cadastrar interação", error as Error);
      toast.error("Erro ao salvar interação. Os campos foram mantidos para você tentar novamente.");
      setIsSendingWhatsApp(false);
      setWhatsAppSendSuccess(false);
    }
  }, [selectedStudentId, student, interactionType, interactionDate, interactionDescription, interactionSensitive, selectedWhatsAppPhones, whatsAppMessage, auth, fetchStudentData]);

  const handleEditInteraction = useCallback(async (): Promise<void> => {
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
  }, [editingInteraction, selectedStudentId, interactionType, interactionDate, interactionDescription, interactionSensitive, fetchStudentData]);

  const handleDeleteInteraction = useCallback(async (interactionId: string): Promise<void> => {
    if (!selectedStudentId) return;
    try {
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
  }, [selectedStudentId, fetchStudentData]);

  // ═══════════════════════════════════════════════════════════
  // HANDLERS - ATESTADOS
  // ═══════════════════════════════════════════════════════════

  const handleAddAtestado = useCallback(async (): Promise<void> => {
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
      setIsSubmittingAtestado(true);

      const startDate = parseDate(atestadoStartDate);
      if (!startDate) throw new Error("Data inválida");

      const endDate = new Date(Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate() + days - 1
      ));

      // Validação de duplicatas
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

      const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido";
      const newCertificate = await MedicalCertificatesService.create({
        studentId: selectedStudentId,
        startDate: formattedDate,
        endDate: endDate.toISOString().split('T')[0],
        diagnosis: atestadoDescription,
        createdBy: currentUser,
      });

      if (!newCertificate) {
        throw new Error("Falha ao criar atestado");
      }

      const atestadoId = newCertificate.id;

      // Obter dias letivos e faltas existentes
      const diasLetivos = await getDiasLetivosNoPeriodo(startDate, endDate);
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

      // Criar/atualizar faltas justificadas
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

        try {
          if (faltaExistente) {
            await AbsenceService.deleteAbsence(selectedStudentId, dataFirebase);
            await AbsenceService.addAbsence({
              estudanteId: selectedStudentId,
              data: dataFirebase,
              justified: true,
              atestadoId: atestadoId,
            });
          } else {
            await AbsenceService.addAbsence({
              estudanteId: selectedStudentId,
              data: dataFirebase,
              justified: true,
              atestadoId: atestadoId,
            });
          }
        } catch (error: any) {
          if (error?.code !== '23505') {
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
      setIsSubmittingAtestado(false);
    }
  }, [selectedStudentId, atestadoStartDate, atestadoDays, atestadoDescription, isSubmittingAtestado, auth, fetchStudentData]);

  const handleEditAtestado = useCallback(async (): Promise<void> => {
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
      const startDate = parseDate(atestadoStartDate);
      if (!startDate) throw new Error("Data inválida");

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

      // Reset absences previously justified by this atestado
      const allAbsences = await AbsenceService.getStudentAbsences(selectedStudentId);

      for (const absence of allAbsences) {
        if (absence.atestadoId === editingAtestado.id) {
          const absenceDate = absence.absence_date || absence.data;
          if (!absenceDate) continue;

          await AbsenceService.deleteAbsence(selectedStudentId, absenceDate);
          await AbsenceService.addAbsence({
            estudanteId: selectedStudentId,
            data: absenceDate,
            justified: false,
            atestadoId: undefined,
          });
        }
      }

      // Recreate absences for new period
      const diasLetivos = await getDiasLetivosNoPeriodo(startDate, endDate);

      // Buscar faltas atualizadas (após remoção das antigas)
      const absencesAtualizadas = await AbsenceService.getStudentAbsences(selectedStudentId);
      const faltasExistentes = new Map();
      absencesAtualizadas.forEach((absence: any) => {
        const absenceDate = absence.absence_date || absence.data;
        if (!absenceDate) return;
        const dataFormatada = formatFirebaseDate(absenceDate);
        faltasExistentes.set(dataFormatada, absence);
      });

      console.log('🔍 Criando faltas para', diasLetivos.length, 'dias letivos');

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
          // Se já existe uma falta nessa data, atualizar para justificada
          await AbsenceService.deleteAbsence(selectedStudentId, dataFirebase);
          await AbsenceService.addAbsence({
            estudanteId: selectedStudentId,
            data: dataFirebase,
            justified: true,
            atestadoId: editingAtestado.id,
          });
          console.log('✅ Falta atualizada:', dataBrasileira);
        } else {
          // Criar nova falta justificada
          await AbsenceService.addAbsence({
            estudanteId: selectedStudentId,
            data: dataFirebase,
            justified: true,
            atestadoId: editingAtestado.id,
          });
          console.log('✅ Nova falta criada:', dataBrasileira);
        }
      }

      setEditingAtestado(null);
      setAtestadoStartDate("");
      setAtestadoDays("");
      setAtestadoDescription("");

      console.log('🔍 Recarregando dados após editar atestado...');
      await fetchStudentData(selectedStudentId);
      console.log('✅ Dados recarregados!');
      toast.success("Atestado atualizado com sucesso!");
    } catch (error) {
      logger.error("Erro ao atualizar atestado", error as Error);
      toast.error("Erro ao atualizar atestado. Tente novamente.");
    }
  }, [editingAtestado, selectedStudentId, atestadoStartDate, atestadoDays, atestadoDescription, auth, fetchStudentData]);

  const handleDeleteAtestado = useCallback(async (atestadoId: string): Promise<void> => {
    if (!selectedStudentId) return;
    try {
      await MedicalCertificatesService.delete(atestadoId);

      const allAbsences = await AbsenceService.getStudentAbsences(selectedStudentId);

      for (const absence of allAbsences) {
        if (absence.atestadoId === atestadoId) {
          const absenceDate = absence.absence_date || absence.data;
          if (!absenceDate) continue;

          await AbsenceService.deleteAbsence(selectedStudentId, absenceDate);
          await AbsenceService.addAbsence({
            estudanteId: selectedStudentId,
            data: absenceDate,
            justified: false,
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
  }, [selectedStudentId, fetchStudentData]);

  // ═══════════════════════════════════════════════════════════
  // HANDLERS - SUSPENSÕES
  // ═══════════════════════════════════════════════════════════

  const handleAddSuspensao = useCallback(async (): Promise<void> => {
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

      const endDate = new Date(Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate() + days - 1
      ));

      const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido";
      const newSuspension = await StudentSuspensionsService.create({
        studentId: selectedStudentId,
        startDate: formattedDate,
        endDate: endDate.toISOString().split('T')[0],
        reason: suspensaoDescription,
        description: suspensaoDescription,
        severity: 'MODERADA',
        decisionBy: currentUser,
        decisionDate: formattedDate,
        createdBy: currentUser,
      });

      if (!newSuspension) {
        throw new Error("Falha ao criar suspensão");
      }

      const suspensaoId = newSuspension.id;

      const diasLetivos = await getDiasLetivosNoPeriodo(startDate, endDate);
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
          await AbsenceService.deleteAbsence(selectedStudentId, dataFirebase);
          await AbsenceService.addAbsence({
            estudanteId: selectedStudentId,
            data: dataFirebase,
            justified: false,
            suspensaoId: suspensaoId,
          });
        } else {
          await AbsenceService.addAbsence({
            estudanteId: selectedStudentId,
            data: dataFirebase,
            justified: false,
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
  }, [selectedStudentId, suspensaoStartDate, suspensaoDays, suspensaoDescription, auth, fetchStudentData]);

  const handleEditSuspensao = useCallback(async (): Promise<void> => {
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
      const startDate = parseDate(suspensaoStartDate);
      if (!startDate) throw new Error("Data inválida");

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

      const allAbsences = await AbsenceService.getStudentAbsences(selectedStudentId);

      for (const absence of allAbsences) {
        if (absence.suspensaoId === editingSuspensao.id) {
          const absenceDate = absence.absence_date || absence.data;
          if (!absenceDate) continue;

          await AbsenceService.deleteAbsence(selectedStudentId, absenceDate);
          await AbsenceService.addAbsence({
            estudanteId: selectedStudentId,
            data: absenceDate,
            justified: false,
            suspensaoId: undefined,
          });
        }
      }

      const diasLetivos = await getDiasLetivosNoPeriodo(startDate, endDate);
      const faltasExistentes = new Map();
      allAbsences.forEach((absence: any) => {
        const absenceDate = absence.absence_date || absence.data;
        if (!absenceDate) return;
        const dataFormatada = formatFirebaseDate(absenceDate);
        faltasExistentes.set(dataFormatada, absence);
      });

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
          await AbsenceService.deleteAbsence(selectedStudentId, dataFirebase);
          await AbsenceService.addAbsence({
            estudanteId: selectedStudentId,
            data: dataFirebase,
            justified: false,
            suspensaoId: editingSuspensao.id,
          });
        } else {
          await AbsenceService.addAbsence({
            estudanteId: selectedStudentId,
            data: dataFirebase,
            justified: false,
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
  }, [editingSuspensao, selectedStudentId, suspensaoStartDate, suspensaoDays, suspensaoDescription, auth, fetchStudentData]);

  const handleDeleteSuspensao = useCallback(async (suspensaoId: string): Promise<void> => {
    if (!selectedStudentId) return;
    try {
      await StudentSuspensionsService.delete(suspensaoId);

      const allAbsences = await AbsenceService.getStudentAbsences(selectedStudentId);

      for (const absence of allAbsences) {
        if (absence.suspensaoId === suspensaoId) {
          const absenceDate = absence.absence_date || absence.data;
          if (!absenceDate) continue;

          await AbsenceService.deleteAbsence(selectedStudentId, absenceDate);
          await AbsenceService.addAbsence({
            estudanteId: selectedStudentId,
            data: absenceDate,
            justified: false,
            suspensaoId: undefined,
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
  }, [selectedStudentId, fetchStudentData]);

  // ═══════════════════════════════════════════════════════════
  // HANDLERS - WHATSAPP
  // ═══════════════════════════════════════════════════════════

  const handleWhatsAppClick = useCallback((contact: Contato) => {
    setSelectedContact(contact);
    setSelectedWhatsAppPhones(new Set([contact.telefone.replace(/\D/g, '')]));
    setIsWhatsAppModalOpen(true);
  }, []);

  const handleRetryVerification = useCallback(async (contact: Contato) => {
    try {
      toast.info("Verificando WhatsApp...");

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
  }, [auth, selectedStudentId, fetchStudentData]);

  const handleSendWhatsAppMessage = useCallback(async (
    phone: string,
    message: string
  ): Promise<{
    success: boolean;
    message: string;
    data?: unknown;
    error?: string;
  }> => {
    try {
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
  }, [auth, selectedContact, selectedStudentId]);

  const handleSaveWhatsAppInteraction = useCallback(async () => {
    if (!selectedStudentId || !student || selectedWhatsAppPhones.size === 0) return;

    try {
      setIsSendingWhatsApp(true);
      setWhatsAppSendSuccess(false);

      const whatsappPhones = Array.from(selectedWhatsAppPhones);
      const whatsappMessageText = whatsAppMessage;

      // Enviar WhatsApp
      let whatsappMessageId: string | undefined;
      if (whatsappPhones.length > 0) {
        const toastId = toast.loading(`Enviando mensagem...`);

        try {
          const response = await fetch('/api/evolution/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phone: whatsappPhones[0],
              message: whatsappMessageText.trim()
            })
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || result.message || "Falha ao enviar mensagem");
          }

          whatsappMessageId = result.data?.messageId;
          await WhatsAppTrackingService.updateMessageCount(whatsappPhones[0]);

          toast.dismiss(toastId);
          toast.success("Mensagem enviada com sucesso!");
        } catch (error) {
          toast.dismiss(toastId);
          toast.error("Falha ao enviar mensagem. A interação NÃO foi salva.");
          setIsSendingWhatsApp(false);
          setWhatsAppSendSuccess(false);
          return;
        }
      }

      // Salvar interação
      const phoneNumber = whatsappPhones[0];
      const contact = student.contatos?.find(c => c.telefone.replace(/\D/g, '') === phoneNumber);
      const contactName = contact ? `${contact.nome}${contact.parentesco ? ` (${contact.parentesco})` : ''}` : phoneNumber;
      const finalDescription = `Mensagem enviada via WhatsApp para: ${contactName} - ${phoneNumber}\n\n${interactionDescription}`;

      const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido";

      await InteractionService.createInteraction(selectedStudentId, {
        studentId: selectedStudentId,
        type: 'Contato digital',
        date: new Date().toISOString().split('T')[0],
        description: finalDescription,
        createdBy: currentUser,
        sensitive: interactionSensitive,
        whatsappMessage: whatsappMessageText,
        whatsappPhones: whatsappPhones,
        whatsappMessageId: whatsappMessageId,
        whatsappStatus: 'SENT' as const,
        whatsappSentAt: new Date().toISOString(),
      } as Omit<FamilyInteraction, 'id'>);

      logger.interactionOperation('create', selectedStudentId, 'Contato digital', { supabase: true });

      await fetchStudentData(selectedStudentId);

      setWhatsAppSendSuccess(true);
      setIsSendingWhatsApp(false);

      setTimeout(() => {
        setWhatsAppSendSuccess(false);
        setIsWhatsAppModalOpen(false);
        setSelectedContact(null);
        setWhatsAppMessage('');
        setSelectedWhatsAppPhones(new Set());
        setInteractionDescription('');
        setInteractionSensitive(false);
      }, 2000);

      toast.success("Interação salva com sucesso!");
    } catch (error) {
      logger.error("Erro ao cadastrar interação", error as Error);
      toast.error("Erro ao salvar interação. Tente novamente.");
      setIsSendingWhatsApp(false);
      setWhatsAppSendSuccess(false);
    }
  }, [selectedStudentId, student, auth.currentUser, selectedWhatsAppPhones, whatsAppMessage, interactionDescription, interactionSensitive, fetchStudentData]);

  // ═══════════════════════════════════════════════════════════
  // HANDLERS - SEARCH
  // ═══════════════════════════════════════════════════════════

  const handleSearchName = useCallback((value: string) => {
    setSearchName(value);

    if (isSelectingStudent.current) {
      isSelectingStudent.current = false;
      return;
    }

    setSelectedTurma("");

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
  }, [allStudents, selectedStudentId]);

  const handleSuggestionSelect = useCallback((studentId: string) => {
    isSelectingStudent.current = true;
    setSelectedStudentId(studentId);
    setSearchName("");
    setSuggestions([]);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════

  const uniqueTurmas: string[] = useMemo(() =>
    Array.from(new Set(allStudents.map((s: Student) => s.turma))).sort((a, b) => {
      const [numA, letterA] = a.match(/(\d+)([A-Z]+)/)!.slice(1);
      const [numB, letterB] = b.match(/(\d+)([A-Z]+)/)!.slice(1);
      const numCompare = Number(numA) - Number(numB);
      if (numCompare !== 0) return numCompare;
      return letterA.localeCompare(letterB);
    }),
  [allStudents]);

  const studentsInTurma: Student[] = useMemo(() =>
    allStudents
      .filter((s: Student) => s.turma === selectedTurma)
      .sort((a, b) => a.nome.localeCompare(b.nome)),
  [allStudents, selectedTurma]);

  // ═══════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════

  return {
    // ========================================
    // STUDENT SELECTION
    // ========================================
    allStudents,
    selectedTurma,
    setSelectedTurma,
    selectedStudentId,
    searchName,
    setSearchName,
    suggestions,
    uniqueTurmas,
    studentsInTurma,

    // ========================================
    // STUDENT DATA
    // ========================================
    student,
    studentRecord,
    studentRecordWithoutJustified,
    absences,
    atestados,
    suspensoes,
    interactions: interactionsWithLiveStatus,
    bimesterDates,

    // ========================================
    // FORMS STATE - INTERACTIONS
    // ========================================
    interactionType,
    setInteractionType,
    interactionDate,
    setInteractionDate,
    interactionDescription,
    setInteractionDescription,
    interactionSensitive,
    setInteractionSensitive,
    editingInteraction,
    setEditingInteraction,

    // ========================================
    // FORMS STATE - ATESTADOS
    // ========================================
    atestadoStartDate,
    setAtestadoStartDate,
    atestadoDays,
    setAtestadoDays,
    atestadoDescription,
    setAtestadoDescription,
    editingAtestado,
    setEditingAtestado,
    isSubmittingAtestado,

    // ========================================
    // FORMS STATE - SUSPENSÕES
    // ========================================
    suspensaoStartDate,
    setSuspensaoStartDate,
    suspensaoDays,
    setSuspensaoDays,
    suspensaoDescription,
    setSuspensaoDescription,
    editingSuspensao,
    setEditingSuspensao,

    // ========================================
    // DIALOGS
    // ========================================
    showDeleteDialog,
    setShowDeleteDialog,
    showDeleteAtestadoDialog,
    setShowDeleteAtestadoDialog,
    showDeleteSuspensaoDialog,
    setShowDeleteSuspensaoDialog,

    // ========================================
    // WHATSAPP
    // ========================================
    isWhatsAppModalOpen,
    setIsWhatsAppModalOpen,
    selectedContact,
    setSelectedContact,
    verifiedWhatsAppNumbers,
    contactVerificationData,
    selectedWhatsAppPhones,
    setSelectedWhatsAppPhones,
    whatsAppMessage,
    setWhatsAppMessage,
    isSendingWhatsApp,
    whatsAppSendSuccess,

    // ========================================
    // LOADING/ERROR/USER
    // ========================================
    loadingStudents,
    loadingProfile,
    userRole,

    // ========================================
    // HANDLERS - STUDENT SELECTION
    // ========================================
    handleSelectStudent,
    handleSearchName,
    handleSuggestionSelect,
    fetchStudentData,

    // ========================================
    // HANDLERS - INTERACTIONS (CRUD)
    // ========================================
    handleAddInteraction,
    handleEditInteraction,
    handleDeleteInteraction,

    // ========================================
    // HANDLERS - ATESTADOS (CRUD)
    // ========================================
    handleAddAtestado,
    handleEditAtestado,
    handleDeleteAtestado,

    // ========================================
    // HANDLERS - SUSPENSÕES (CRUD)
    // ========================================
    handleAddSuspensao,
    handleEditSuspensao,
    handleDeleteSuspensao,

    // ========================================
    // HANDLERS - WHATSAPP
    // ========================================
    handleWhatsAppClick,
    handleRetryVerification,
    handleSendWhatsAppMessage,
    handleSaveWhatsAppInteraction,
  };
}
