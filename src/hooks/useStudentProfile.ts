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
import WhatsAppTrackingService from "@/services/whatsappTrackingService";

// ✅ SPRINT 4 - FASE 8: Migração COMPLETA para API REST
// TODOS os dados agora vêm via hooks API (sem fetch direto)
import {
  useStudents,
  useStudent,
  useInteractions,
  useCreateInteraction,
  useUpdateInteraction,
  useDeleteInteraction,
  useAbsences,
  useMedicalCertificates,
  useCreateMedicalCertificate,
  useUpdateMedicalCertificate,
  useDeleteMedicalCertificate,
  useSuspensions,
  useCreateSuspension,
  useUpdateSuspension,
  useDeleteSuspension,
  useAbsenceControls,
  useCurrentUserProfile,
} from "@/hooks/api";

// Services mantidos APENAS para lógica complexa (absences com atestados/suspensões)
import { AbsenceService } from "@/services/supabase/absenceService";
import { MedicalCertificatesService } from "@/services/supabase/medicalCertificatesService";
import { StudentSuspensionsService } from "@/services/supabase/studentSuspensionsService";
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

  // ✅ SPRINT 4 - FASE 8: Usar hooks API
  // IMPORTANTE: Buscar TODOS os estudantes ativos (limit alto) para dropdown de turmas
  const { students: allStudentsData, loading: loadingStudents, refetch: refetchStudents } = useStudents({
    status: 'ATIVO',
    limit: 10000 // Buscar todos os estudantes para dropdown de turmas
  });
  const { userProfile: currentUser, loading: loadingUser } = useCurrentUserProfile();
  const { controls: absenceControls, loading: loadingAbsenceControls } = useAbsenceControls({
    academic_year: parseInt(process.env.NEXT_PUBLIC_SCHOOL_YEAR || "2025"),
  });

  // Mutation hooks
  const { createInteraction } = useCreateInteraction();
  const { updateInteraction } = useUpdateInteraction();
  const { deleteInteraction } = useDeleteInteraction();
  const { createCertificate: createMedicalCertificate } = useCreateMedicalCertificate();
  const { updateCertificate: updateMedicalCertificate } = useUpdateMedicalCertificate();
  const { deleteCertificate: deleteMedicalCertificate } = useDeleteMedicalCertificate();
  const { createSuspension } = useCreateSuspension();
  const { updateSuspension } = useUpdateSuspension();
  const { deleteSuspension } = useDeleteSuspension();

  // ═══════════════════════════════════════════════════════════
  // 1. STUDENT SELECTION (busca, turma, estudante selecionado)
  // ═══════════════════════════════════════════════════════════

  const [selectedTurma, setSelectedTurma] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [searchName, setSearchName] = useState<string>("");
  const debouncedSearchName = useDebounce(searchName, 300);
  const [suggestions, setSuggestions] = useState<Student[]>([]);
  const isSelectingStudent = useRef(false);

  // Map API students para formato esperado
  const allStudents = useMemo(() => {
    return (allStudentsData as any[]).map((student: any) => ({
      ...student,
      // IMPORTANTE: id (UUID do banco) é usado para buscar estudante individual
      id: student.id, // UUID do banco Supabase (Internal ID)
      estudanteId: student.student_id || student.estudanteId, // Firebase UUID
      nome: student.name || student.nome,
      turma: student.class || student.turma,
      contatos: (student as any).student_contacts || (student as any).contacts || (student as any).contatos || [],
      provaSaoPaulo: student.provaSaoPaulo || [],
    })).sort((a: any, b: any) => a.nome.localeCompare(b.nome));
  }, [allStudentsData]);

  // Validar selectedStudentId antes de usar
  // ⚠️ IMPORTANTE: Se o estudante foi explicitamente selecionado (via URL ou busca),
  // permitir carregar seus dados mesmo que não esteja na lista de ATIVOS
  const validatedStudentId = useMemo(() => {

    if (!selectedStudentId) {
      return '';
    }

    // Se allStudents ainda não carregou, usar selectedStudentId mesmo assim
    if (allStudents.length === 0) {
      return selectedStudentId;
    }

    // ✅ Verificar se existe na lista
    const exists = allStudents.some((s: any) => s.estudanteId === selectedStudentId);
    if (!exists) {
      console.warn('[useStudentProfile] ⚠️ ID não encontrado na lista de ATIVOS, mas usando mesmo assim (pode ser estudante INATIVO):', selectedStudentId);
      // ✅ MUDANÇA: Não retornar '', usar o ID fornecido
      // Isso permite visualizar estudantes inativos se forem explicitamente selecionados
      return selectedStudentId;
    }

    return selectedStudentId;
  }, [selectedStudentId, allStudents]);

  // ⚡ PERFORMANCE FIX: Memoizar filtros para evitar re-criação desnecessária e múltiplos fetches
  const interactionFilters = useMemo(() => ({
    estudanteId: validatedStudentId || undefined,
  }), [validatedStudentId]);

  const absenceFilters = useMemo(() => {
    return {
      estudanteId: validatedStudentId || undefined,
    };
  }, [validatedStudentId]);

  const certificateFilters = useMemo(() => {
    return {
      estudanteId: validatedStudentId || undefined,
    };
  }, [validatedStudentId, selectedStudentId]);

  const suspensionFilters = useMemo(() => ({
    estudanteId: validatedStudentId || undefined,
  }), [validatedStudentId]);

  // Hooks condicionais para dados do estudante selecionado (usar validatedStudentId)
  const { student: studentData, loading: loadingStudent, refetch: refetchStudent } = useStudent(validatedStudentId);
  const { interactions: interactionsData, loading: loadingInteractions, refetch: refetchInteractions } = useInteractions(interactionFilters);
  const { absences: absencesData, loading: loadingAbsences, refetch: refetchAbsences } = useAbsences(absenceFilters);
  const { certificates: atestadosData, loading: loadingAtestados, refetch: refetchAtestados } = useMedicalCertificates(certificateFilters);
  const { suspensions: suspensoesData, loading: loadingSuspensoes, refetch: refetchSuspensoes } = useSuspensions(suspensionFilters);

  // ═══════════════════════════════════════════════════════════
  // 2. STUDENT DATA (student, absences, atestados, suspensões, interactions)
  // ═══════════════════════════════════════════════════════════

  // Map hook data para formato esperado pelos componentes
  const student = useMemo(() => {
    if (!studentData) return null;
    const data = studentData as any;

    return {
      ...studentData,
      estudanteId: data.student_id || data.estudanteId,
      nome: data.name || data.nome,
      turma: data.class || data.turma,
      // API já retorna 'contatos' correto via convertSupabaseToEstudante
      contatos: data.contatos || [],
    } as any;
  }, [studentData]);

  // ✅ SIMPLIFICADO: API agora retorna tudo no formato correto (camelCase com todos os campos)
  const interactions = useMemo(() => {
    return interactionsData || [];
  }, [interactionsData]);

  const absences = useMemo(() => {
    const mapped = (absencesData || []).map((abs: any) => ({
      ...abs,
      data: abs.absence_date || abs.data,
      estudanteId: abs.student_id || abs.estudanteId,
      justified: abs.is_justified || abs.justified,
    }));
    return mapped;
  }, [absencesData]);

  const atestados = useMemo(() => {
    return (atestadosData || []).map((cert: any) => {
      // ✅ CALCULAR quantidade de dias entre start_date e end_date
      let days = 1;
      if (cert.start_date && cert.end_date) {
        const start = new Date(cert.start_date);
        const end = new Date(cert.end_date);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 porque inclui o dia inicial
      }

      return {
        id: cert.id,
        startDate: cert.start_date || cert.startDate,
        endDate: cert.end_date || cert.endDate,
        days,
        description: cert.reason || cert.notes || cert.diagnosis || cert.doctor_name || 'Sem descrição',
        // Buscar nome do usuário via JOIN (submitter.name)
        createdBy: cert.submitter?.name || cert.submitted_by || cert.createdBy || 'Desconhecido'
      };
    });
  }, [atestadosData]);

  const suspensoes = useMemo(() => {
    return (suspensoesData || []).map((susp: any) => {
      // ✅ CALCULAR quantidade de dias entre start_date e end_date
      let days = 1;
      if (susp.start_date && susp.end_date) {
        const start = new Date(susp.start_date);
        const end = new Date(susp.end_date);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 porque inclui o dia inicial
      }

      return {
        id: susp.id,
        startDate: susp.start_date || susp.startDate,
        endDate: susp.end_date || susp.endDate,
        days, // ✅ Calculado dinamicamente
        description: susp.reason || susp.description || 'Sem descrição',
        // Buscar nome do usuário via JOIN (decision_by_name)
        createdBy: susp.decision_by_name || susp.decision_by || susp.createdBy || 'Desconhecido'
      };
    });
  }, [suspensoesData]);

  const bimesterDates = useMemo(() => {
    const dates: BimesterDates = {};
    (absenceControls || []).forEach((bimester: any) => {
      if (bimester.start_date && bimester.end_date) {
        dates[bimester.bimester] = {
          start: bimester.start_date,
          end: bimester.end_date,
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

    return dates;
  }, [absenceControls]);

  const [studentRecord, setStudentRecord] = useState<StudentRecord | null>(null);
  const [studentRecordWithoutJustified, setStudentRecordWithoutJustified] = useState<StudentRecord | null>(null);

  // 🔄 Auto-refresh de status WhatsApp (polling adaptativo)
  // ✅ REFATORADO: Agora usa refetch externo ao invés de criar useInteractions duplicado
  const interactionsWithLiveStatus = useWhatsAppStatusPolling(interactions, {
    enabled: !!selectedStudentId,
    fastInterval: 5000, // 5s para SENT
    slowInterval: 60000, // 60s para DELIVERED
    studentId: selectedStudentId,
    refetch: refetchInteractions, // ✅ Passa refetch do useInteractions existente
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
  const [isDeletingInteraction, setIsDeletingInteraction] = useState(false);

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

  const loadingProfile = loadingStudent || loadingInteractions || loadingAbsences || loadingAtestados || loadingSuspensoes;
  const userRole = currentUser?.role?.toLowerCase() || "user";

  // ═══════════════════════════════════════════════════════════
  // EFFECTS: Initialization & URL Params
  // ═══════════════════════════════════════════════════════════

  // URL param: studentId (validar se existe na lista antes de usar)
  useEffect(() => {
    const studentId = searchParams.get("studentId");

    if (studentId && studentId !== selectedStudentId) {
      // Aguardar allStudents carregar antes de validar
      if (loadingStudents || allStudents.length === 0) {
        return;
      }

      // Verificar se o estudante existe na lista carregada
      // ✅ Suportar tanto Internal ID (id) quanto Firebase UUID (estudanteId)
      const student = allStudents.find((s: any) =>
        s.id === studentId || s.estudanteId === studentId
      );

      if (student) {
        // SEMPRE usar estudanteId (Firebase UUID) internamente
        setSelectedStudentId(student.estudanteId);
      } else {
        console.warn('[useStudentProfile] Student ID from URL not found in loaded students:', studentId);
        // Limpar estado e URL inválida
        setSelectedStudentId('');
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('studentId');
          window.history.replaceState({}, '', url.toString());
        }
      }
    }
  }, [searchParams, selectedStudentId, allStudents, loadingStudents]);

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
  // REFETCH FUNCTION (para refrescar dados após mutations)
  // ═══════════════════════════════════════════════════════════

  // ❌ REMOVIDO - fetchAllStudents() (FASE 8)
  // Dados agora vêm via hook: useStudents({ status: 'ATIVO' })

  // ❌ REMOVIDO - fetchBimesterDates() (FASE 8)
  // Dados agora vêm via hook: useAbsenceControls({ academic_year })

  // ✅ NOVA - fetchStudentData simplificada (FASE 8)
  // Apenas refetch dos hooks, autenticação automática
  const fetchStudentData = useCallback(
    async (studentId: string): Promise<void> => {
      if (!studentId) return;

      await Promise.all([
        refetchStudent(),
        refetchInteractions(),
        refetchAbsences(),
        refetchAtestados(),
        refetchSuspensoes(),
      ]);
    },
    [refetchStudent, refetchInteractions, refetchAbsences, refetchAtestados, refetchSuspensoes]
  );

  // ═══════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════

  const handleSelectStudent = useCallback(
    (studentId: string) => {
      isSelectingStudent.current = true;

      // ✅ NORMALIZAR: Se recebeu Internal ID, converter para Firebase UUID
      const student = allStudents.find((s: any) =>
        s.id === studentId || s.estudanteId === studentId
      );

      const normalizedId = student?.estudanteId || studentId;

      setSelectedStudentId(normalizedId);
      setSearchName("");
      setSuggestions([]);
      fetchStudentData(normalizedId);

      // Reset selecting flag after a short delay
      setTimeout(() => {
        isSelectingStudent.current = false;
      }, 100);
    },
    [fetchStudentData, allStudents]
  );

  // ═══════════════════════════════════════════════════════════
  // HANDLERS - INTERACTIONS
  // ═══════════════════════════════════════════════════════════

  const handleAddInteraction = useCallback(async (): Promise<void> => {
    if (!selectedStudentId || !interactionType || !interactionDate || !interactionDescription) {
      toast.error("Preencha todos os campos para adicionar uma interação.");
      return;
    }

    // Converter data de DD/MM/YYYY para DDMMYYYY (formato esperado pela API)
    const dateParts = interactionDate.split('/');
    if (dateParts.length !== 3) {
      toast.error("Data inválida. Use o formato DD/MM/YYYY.");
      return;
    }
    const formattedDate = dateParts.join(''); // Remove as barras: "18/10/2025" → "18102025"

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
        const contact = student.contatos.find((c: Contato) => c.telefone.replace(/\D/g, '') === phoneNumber);
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

      // Determinar responsável (contato ou genérico)
      let responsavel = "Responsável";
      if (interactionType === "Contato digital" && selectedWhatsAppPhones.size === 1 && student?.contatos) {
        const phoneNumber = Array.from(selectedWhatsAppPhones)[0];
        const contact = student.contatos.find((c: Contato) => c.telefone.replace(/\D/g, '') === phoneNumber);
        if (contact) {
          responsavel = contact.nome;
        }
      }

      // ✅ SPRINT 4 - FASE 8: Usar hook de criação com campos no formato correto (português)
      await createInteraction({
        estudanteId: selectedStudentId,
        tipo: interactionType,
        data: formattedDate,
        responsavel: responsavel,
        assunto: interactionType, // Usar o tipo como assunto padrão
        descricao: finalDescription,
        criadoPor: currentUser, // Nome do usuário autenticado
        ...(whatsappData && {
          whatsapp_message: whatsappData.whatsappMessage,
          whatsapp_phones: whatsappData.whatsappPhones,
          whatsapp_message_id: whatsappData.whatsappMessageId,
          whatsapp_status: whatsappData.whatsappStatus,
          whatsapp_sent_at: whatsappData.whatsappSentAt,
        }),
      });

      logger.interactionOperation('create', selectedStudentId, interactionType, { supabase: true });

      // Aguardar um pouco para garantir que o banco processou
      await new Promise(resolve => setTimeout(resolve, 100));

      // Recarregar dados do estudante
      await fetchStudentData(selectedStudentId);

      // ⚡ IMPORTANTE: Aguardar React processar a atualização antes de limpar campos
      await new Promise(resolve => setTimeout(resolve, 200));

      // Limpar campos após garantir que dados foram atualizados
      setInteractionType("");
      setInteractionDate(new Date().toLocaleDateString("pt-BR"));
      setInteractionDescription("");
      setInteractionSensitive(false);
      setSelectedWhatsAppPhones(new Set());
      setWhatsAppMessage("");

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

    // Converter data de DD/MM/YYYY para DDMMYYYY (formato esperado pela API)
    const dateParts = interactionDate.split('/');
    if (dateParts.length !== 3) {
      toast.error("Data inválida. Use o formato DD/MM/YYYY.");
      return;
    }
    const formattedDate = dateParts.join(''); // Remove as barras: "18/10/2025" → "18102025"

    try {
      // ✅ SPRINT 4 - FASE 8: Usar hook de update com campos no formato correto (português)
      await updateInteraction(editingInteraction.id, {
        tipo: interactionType,
        data: formattedDate,
        descricao: interactionDescription,
        // Nota: responsavel e assunto não podem ser alterados na edição
      });

      logger.interactionOperation('update', selectedStudentId, editingInteraction.type, { supabase: true });

      // Aguardar um pouco para garantir que o banco processou
      await new Promise(resolve => setTimeout(resolve, 100));

      // Recarregar dados do estudante
      await fetchStudentData(selectedStudentId);

      // Limpar campos
      setEditingInteraction(null);
      setInteractionType("");
      setInteractionDate(new Date().toLocaleDateString("pt-BR"));
      setInteractionDescription("");
      setInteractionSensitive(false);

      toast.success("Interação atualizada com sucesso!");
    } catch (error) {
      logger.error("Erro ao atualizar interação", error as Error);
      toast.error("Erro ao atualizar interação. Tente novamente.");
    }
  }, [editingInteraction, selectedStudentId, interactionType, interactionDate, interactionDescription, interactionSensitive, fetchStudentData]);

  const handleDeleteInteraction = useCallback(async (interactionId: string): Promise<void> => {
    if (!selectedStudentId) return;
    try {
      setIsDeletingInteraction(true);
      setShowDeleteDialog(null); // Fechar modal imediatamente

      // ✅ SPRINT 4 - FASE 8: Usar hook de delete
      await deleteInteraction(interactionId);
      logger.interactionOperation('delete', selectedStudentId, 'unknown', { supabase: true });

      // Recarregar dados do estudante
      await fetchStudentData(selectedStudentId);

      // Aguardar um tick para garantir que a UI foi atualizada
      await new Promise(resolve => setTimeout(resolve, 100));

      toast.success("Interação excluída com sucesso!");
    } catch (error) {
      logger.error("Erro ao excluir interação", error as Error);
      toast.error("Erro ao excluir interação. Tente novamente.");
    } finally {
      setIsDeletingInteraction(false);
    }
  }, [selectedStudentId, fetchStudentData, deleteInteraction]);

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

      // ✅ A API /api/medical-certificates já atualiza as faltas existentes
      // automaticamente com is_justified=true e medical_certificate_id.
      // Não precisamos criar faltas para dias sem ausência!
      // Ver: src/app/api/medical-certificates/route.ts linhas 206-236

      setAtestadoStartDate("");
      setAtestadoDays("");
      setAtestadoDescription("");

      // ✅ Aguardar um pouco para garantir que o banco processou
      await new Promise(resolve => setTimeout(resolve, 500));

      // ✅ Forçar refresh dos dados (isso limpa o cache)
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

      // ✅ API agora recria faltas automaticamente ao editar atestado
      await MedicalCertificatesService.update(editingAtestado.id, {
        startDate: formattedDate,
        endDate: endDate.toISOString().split('T')[0],
        diagnosis: atestadoDescription,
      });

      // ✅ Aguardar um momento para o banco processar
      await new Promise(resolve => setTimeout(resolve, 500));

      // ✅ Forçar refetch dos hooks individuais (AGUARDAR)
      await Promise.all([
        refetchAtestados(),
        refetchAbsences(),
      ]);

      // ✅ Limpar formulário após refetch
      setEditingAtestado(null);
      setAtestadoStartDate("");
      setAtestadoDays("");
      setAtestadoDescription("");

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

      // ✅ Backend agora gerencia faltas automaticamente via API POST
      // Código antigo de manipulação manual de faltas removido

      // ✅ Aguardar um momento para o banco processar
      await new Promise(resolve => setTimeout(resolve, 500));

      // ✅ Forçar refetch dos hooks individuais (AGUARDAR)
      await Promise.all([
        refetchSuspensoes(),
        refetchAbsences(),
      ]);

      // ✅ Limpar formulário APÓS refetch
      setSuspensaoStartDate("");
      setSuspensaoDays("");
      setSuspensaoDescription("");

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

      // ✅ Backend agora gerencia faltas automaticamente via API PUT
      // Código antigo de manipulação manual de faltas removido

      // ✅ Aguardar um momento para o banco processar
      await new Promise(resolve => setTimeout(resolve, 500));

      // ✅ Forçar refetch dos hooks individuais (AGUARDAR)
      await Promise.all([
        refetchSuspensoes(),
        refetchAbsences(),
      ]);

      // ✅ Limpar formulário APÓS refetch
      setEditingSuspensao(null);
      setSuspensaoStartDate("");
      setSuspensaoDays("");
      setSuspensaoDescription("");
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

      // ✅ Backend agora gerencia faltas automaticamente via API DELETE
      // Código antigo de manipulação manual de faltas removido

      // ✅ Aguardar um momento para o banco processar
      await new Promise(resolve => setTimeout(resolve, 500));

      // ✅ Forçar refetch dos hooks individuais (AGUARDAR)
      await Promise.all([
        refetchSuspensoes(),
        refetchAbsences(),
      ]);

      toast.success("Suspensão excluída com sucesso!");
    } catch (error) {
      logger.error("Erro ao excluir suspensão", error as Error);
      toast.error("Erro ao excluir suspensão. Tente novamente.");
    } finally {
      setShowDeleteSuspensaoDialog(null);
    }
  }, [selectedStudentId, refetchSuspensoes, refetchAbsences]);

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
      const contact = student.contatos?.find((c: Contato) => c.telefone.replace(/\D/g, '') === phoneNumber);
      const contactName = contact ? `${contact.nome}${contact.parentesco ? ` (${contact.parentesco})` : ''}` : phoneNumber;
      const finalDescription = `Mensagem enviada via WhatsApp para: ${contactName} - ${phoneNumber}\n\n${interactionDescription}`;

      const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido";

      // ✅ SPRINT 4 - FASE 8: Usar hook de criação
      await createInteraction({
        student_id: selectedStudentId,
        interaction_type: 'Contato digital',
        interaction_date: new Date().toISOString().split('T')[0],
        description: finalDescription,
        created_by: currentUser,
        is_sensitive: interactionSensitive,
        whatsapp_message: whatsappMessageText,
        whatsapp_phones: whatsappPhones,
        whatsapp_message_id: whatsappMessageId,
        whatsapp_status: 'SENT',
        whatsapp_sent_at: new Date().toISOString(),
      });

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

    // ✅ NORMALIZAR: Se recebeu Internal ID, converter para Firebase UUID
    const student = allStudents.find((s: any) =>
      s.id === studentId || s.estudanteId === studentId
    );

    const normalizedId = student?.estudanteId || studentId;

    setSelectedStudentId(normalizedId);
    setSearchName("");
    setSuggestions([]);
  }, [allStudents]);

  // ═══════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════

  const uniqueTurmas: string[] = useMemo(() =>
    Array.from(new Set(allStudents.map((s: Student) => s.turma)))
      .filter(turma => turma && turma.trim().length > 0) // Filtrar turmas vazias
      .sort((a, b) => {
        const matchA = a.match(/(\d+)([A-Z]+)/);
        const matchB = b.match(/(\d+)([A-Z]+)/);

        // Se algum regex falhar, usar comparação alfabética simples
        if (!matchA || !matchB) {
          return a.localeCompare(b);
        }

        const [, numA, letterA] = matchA;
        const [, numB, letterB] = matchB;
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
    isDeletingInteraction,

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
