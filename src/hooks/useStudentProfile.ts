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
  useStudents as useStudentsAPI,
  useStudent as useStudentAPI,
  useInteractions,
  useCreateInteraction,
  useUpdateInteraction,
  useDeleteInteraction,
  useAbsences,
  useMedicalCertificates,
  useSuspensions,
  useAbsenceControls,
  useCurrentUserProfile,
} from "@/hooks/api";
import type { Student as APIStudent } from "@/hooks/api/useStudents";

// Services mantidos APENAS para lógica complexa (absences com atestados/suspensões)
import { AbsenceService } from "@/services/supabase/absenceService";
import { MedicalCertificatesService } from "@/services/supabase/medicalCertificatesService";
import { StudentSuspensionsService } from "@/services/supabase/studentSuspensionsService";
import type {
  Student,
  StudentRecord,
  FamilyInteraction,
  Atestado,
  Suspensao,
  AbsenceRecord,
  BimesterDates,
  Contato,
  WhatsAppData,
  ProvaSaoPaulo,
} from "@/types";
import {
  parseDate,
  parseDateToFirebase,
  getBimesterByDate,
  calculateDiasLetivos,
} from "@/app/utils";
import { formatDate as _formatDate } from "@/utils/dateUtils";
import { logger } from "@/utils/logger";

// Interface para dados de verificação de contatos WhatsApp
interface ContactVerificationData extends Record<string, unknown> {
  isVerified: boolean;
  verifiedAt?: string;
  whatsapp: {
    verified: boolean;
    exists: boolean;
  };
}

export function useStudentProfile() {
  const searchParams = useSearchParams();
  const auth = getAuth();

  // ✅ SPRINT 4 - FASE 8: Usar hooks API
  // IMPORTANTE: Buscar TODOS os estudantes ativos (limit alto) para dropdown de turmas
  const { students: allStudentsData, loading: loadingStudents } = useStudentsAPI({
    status: 'ATIVO',
    limit: 10000 // Buscar todos os estudantes para dropdown de turmas
  });
  const { userProfile: currentUser } = useCurrentUserProfile();
  const { controls: absenceControls, loading: loadingAbsenceControls } = useAbsenceControls({
    academic_year: parseInt(process.env.NEXT_PUBLIC_SCHOOL_YEAR || "2025"),
  });

  // Mutation hooks
  const { createInteraction } = useCreateInteraction();
  const { updateInteraction } = useUpdateInteraction();
  const { deleteInteraction } = useDeleteInteraction();

  // ═══════════════════════════════════════════════════════════
  // 1. STUDENT SELECTION (busca, turma, estudante selecionado)
  // ═══════════════════════════════════════════════════════════

  const [selectedTurma, setSelectedTurma] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [searchName, setSearchName] = useState<string>("");
  const debouncedSearchName = useDebounce(searchName, 300);
  const [suggestions, setSuggestions] = useState<Student[]>([]);
  const isSelectingStudent = useRef(false);
  const lastSelectedIdRef = useRef<string>('');

  // Map API students para formato esperado
  const allStudents = useMemo(() => {
    if (!allStudentsData) return [];

    return (allStudentsData as APIStudent[]).map((apiStudent): Student => ({
      // IMPORTANTE: id (UUID do banco) é usado para buscar estudante individual
      id: apiStudent.id, // UUID do banco Supabase (Internal ID)
      estudanteId: apiStudent.student_id, // Firebase UUID
      nome: apiStudent.name,
      turma: apiStudent.class,
      status: apiStudent.status,
      turno: apiStudent.shift,
      bolsaFamilia: apiStudent.bolsa_familia || 'NÃO',
      matricula: apiStudent.registration_number || undefined,
      dataNascimento: apiStudent.birth_date || undefined,
      // Mapear contatos (se existirem)
      contatos: apiStudent.student_contacts?.map(contact => ({
        id: contact.id,
        nome: contact.name,
        telefone: contact.phone || '',
        parentesco: contact.relationship,
        podeReceberMensagem: contact.can_receive_whatsapp,
        whatsappData: (contact.whatsapp_data as WhatsAppData) || undefined,
      })) || [],
      // Mapear endereço (se existir)
      endereco: apiStudent.address ? {
        rua: apiStudent.address.rua || '',
        numero: apiStudent.address.numero || '',
        bairro: apiStudent.address.bairro || '',
        cidade: apiStudent.address.cidade || '',
        estado: apiStudent.address.estado || '',
        cep: apiStudent.address.cep || '',
        complemento: apiStudent.address.complemento || '',
      } : undefined,
      // Mapear deficiência (se existir) - API usa disabilities (plural)
      deficiencia: apiStudent.disabilities && apiStudent.disabilities.length > 0 ? {
        estudanteComDeficiencia: apiStudent.disabilities[0].estudanteComDeficiencia || false,
        tipoDeficiencia: apiStudent.disabilities[0].tipoDeficiencia,
        possuiBarreiras: apiStudent.disabilities[0].possuiBarreiras,
        aee: apiStudent.disabilities[0].aee,
        observacoes: apiStudent.disabilities[0].observacoes,
      } : undefined,
      // Prova São Paulo from Supabase exam_scores
      // @ts-expect-error - exam_scores will be added after migration 009 is executed
      provaSaoPaulo: ((apiStudent.exam_scores as unknown) as ProvaSaoPaulo[]) || [],
    })).sort((a, b) => a.nome.localeCompare(b.nome));
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
    const exists = allStudents.some((s: Student) => s.estudanteId === selectedStudentId);
    if (!exists) {
      console.warn('[useStudentProfile] ⚠️ ID não encontrado na lista de ATIVOS, mas usando mesmo assim (pode ser estudante INATIVO):', selectedStudentId);
      // ✅ MUDANÇA: Não retornar '', usar o ID fornecido
      // Isso permite visualizar estudantes inativos se forem explicitamente selecionados
      return selectedStudentId;
    }

    return selectedStudentId;
  }, [selectedStudentId, allStudents]);

  // ⚡ PERFORMANCE FIX: Memoizar filtros para evitar re-criação desnecessária e múltiplos fetches
  const interactionFilters = useMemo(() => {
    // Only create filters object if we have a valid student ID
    if (!validatedStudentId) return undefined;
    return {
      estudanteId: validatedStudentId,
    };
  }, [validatedStudentId]);

  const absenceFilters = useMemo(() => {
    // Only create filters object if we have a valid student ID
    if (!validatedStudentId) return undefined;
    return {
      estudanteId: validatedStudentId,
    };
  }, [validatedStudentId]);

  const certificateFilters = useMemo(() => {
    // Only create filters object if we have a valid student ID
    if (!validatedStudentId) return undefined;
    return {
      estudanteId: validatedStudentId,
    };
  }, [validatedStudentId]);

  const suspensionFilters = useMemo(() => {
    // Only create filters object if we have a valid student ID
    if (!validatedStudentId) return undefined;
    return {
      estudanteId: validatedStudentId,
    };
  }, [validatedStudentId]);

  // Hooks condicionais para dados do estudante selecionado (usar validatedStudentId)
  // Only fetch if we have a valid student ID
  const { student: studentData, loading: loadingStudent, refetch: refetchStudent } = useStudentAPI(
    validatedStudentId || '' // Pass empty string if undefined to prevent unnecessary fetch
  );
  const { interactions: interactionsData, loading: loadingInteractions, refetch: refetchInteractions } = useInteractions(interactionFilters);
  const { absences: absencesData, loading: loadingAbsences, refetch: refetchAbsences } = useAbsences(absenceFilters);
  const { certificates: atestadosData, loading: loadingAtestados, refetch: refetchAtestados } = useMedicalCertificates(certificateFilters);
  const { suspensions: suspensoesData, loading: loadingSuspensoes, refetch: refetchSuspensoes } = useSuspensions(suspensionFilters);

  // ═══════════════════════════════════════════════════════════
  // 2. STUDENT DATA (student, absences, atestados, suspensões, interactions)
  // ═══════════════════════════════════════════════════════════

  // Map hook data para formato esperado pelos componentes
  const student = useMemo((): Student | null => {
    if (!studentData) return null;

    // Type guard: check if it's API student or already converted
    const apiStudent = studentData as APIStudent;

    // If it already has Portuguese field names, return as is (safe cast through unknown)
    if ('nome' in studentData && 'turma' in studentData) {
      return studentData as unknown as Student;
    }

    // Convert from API format to Student format
    return {
      id: apiStudent.id,
      estudanteId: apiStudent.student_id,
      nome: apiStudent.name,
      turma: apiStudent.class,
      status: apiStudent.status,
      turno: apiStudent.shift,
      bolsaFamilia: apiStudent.bolsa_familia || 'NÃO',
      matricula: apiStudent.registration_number || undefined,
      dataNascimento: apiStudent.birth_date || undefined,
      contatos: apiStudent.student_contacts?.map(contact => ({
        id: contact.id,
        nome: contact.name,
        telefone: contact.phone || '',
        parentesco: contact.relationship,
        podeReceberMensagem: contact.can_receive_whatsapp,
        whatsappData: (contact.whatsapp_data as WhatsAppData) || undefined,
      })) || [],
      endereco: apiStudent.address ? {
        rua: apiStudent.address.rua || '',
        numero: apiStudent.address.numero || '',
        bairro: apiStudent.address.bairro || '',
        cidade: apiStudent.address.cidade || '',
        estado: apiStudent.address.estado || '',
        cep: apiStudent.address.cep || '',
        complemento: apiStudent.address.complemento || '',
      } : undefined,
      // Mapear deficiência (se existir) - API usa disabilities (plural)
      deficiencia: apiStudent.disabilities && apiStudent.disabilities.length > 0 ? {
        estudanteComDeficiencia: apiStudent.disabilities[0].estudanteComDeficiencia || false,
        tipoDeficiencia: apiStudent.disabilities[0].tipoDeficiencia,
        possuiBarreiras: apiStudent.disabilities[0].possuiBarreiras,
        aee: apiStudent.disabilities[0].aee,
        observacoes: apiStudent.disabilities[0].observacoes,
      } : undefined,
      // @ts-expect-error - exam_scores will be added after migration 009 is executed
      provaSaoPaulo: ((apiStudent.exam_scores as unknown) as ProvaSaoPaulo[]) || [],
    };
  }, [studentData]);

  // ✅ SIMPLIFICADO: API agora retorna tudo no formato correto (camelCase com todos os campos)
  const interactions = useMemo(() => {
    return interactionsData || [];
  }, [interactionsData]);

  const absences = useMemo(() => {
    const mapped = (absencesData || []).map((abs) => {
      const absenceRecord = abs as { absence_date?: string; data?: string; student_id?: string; estudanteId?: string; is_justified?: boolean; justified?: boolean };
      return {
        ...abs,
        data: absenceRecord.absence_date || absenceRecord.data || '',
        estudanteId: absenceRecord.student_id || absenceRecord.estudanteId || '',
        justified: absenceRecord.is_justified ?? absenceRecord.justified ?? false,
      } as AbsenceRecord;
    });
    return mapped;
  }, [absencesData]);

  const atestados = useMemo(() => {
    return (atestadosData || [])
      .map((cert) => {
        const certificate = cert as { id: string; start_date?: string; end_date?: string; startDate?: string; endDate?: string; reason?: string; notes?: string; diagnosis?: string; doctor_name?: string; submitter?: { name?: string }; submitted_by?: string; createdBy?: string };

        // ✅ CALCULAR quantidade de dias entre start_date e end_date
        let days = 1;
        if (certificate.start_date && certificate.end_date) {
          const start = new Date(certificate.start_date);
          const end = new Date(certificate.end_date);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 porque inclui o dia inicial
        }

        return {
          id: certificate.id,
          startDate: certificate.start_date || certificate.startDate || '',
          endDate: certificate.end_date || certificate.endDate || '',
          days,
          description: certificate.reason || certificate.notes || certificate.diagnosis || certificate.doctor_name || 'Sem descrição',
          // Buscar nome do usuário via JOIN (submitter.name)
          createdBy: certificate.submitter?.name || certificate.submitted_by || certificate.createdBy || 'Desconhecido'
        };
      })
      .sort((a, b) => {
        // Ordenar do mais recente para o mais antigo
        const dateA = new Date(a.startDate);
        const dateB = new Date(b.startDate);
        return dateB.getTime() - dateA.getTime();
      });
  }, [atestadosData]);

  const suspensoes = useMemo(() => {
    return (suspensoesData || []).map((susp) => {
      const suspension = susp as { id: string; start_date?: string; end_date?: string; startDate?: string; endDate?: string; reason?: string; description?: string; decision_by_name?: string; decision_by?: string; createdBy?: string };

      // ✅ CALCULAR quantidade de dias entre start_date e end_date
      let days = 1;
      if (suspension.start_date && suspension.end_date) {
        const start = new Date(suspension.start_date);
        const end = new Date(suspension.end_date);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 porque inclui o dia inicial
      }

      return {
        id: suspension.id,
        startDate: suspension.start_date || suspension.startDate || '',
        endDate: suspension.end_date || suspension.endDate || '',
        days, // ✅ Calculado dinamicamente
        description: suspension.reason || suspension.description || 'Sem descrição',
        // Buscar nome do usuário via JOIN (decision_by_name)
        createdBy: suspension.decision_by_name || suspension.decision_by || suspension.createdBy || 'Desconhecido'
      };
    });
  }, [suspensoesData]);

  const bimesterDates = useMemo(() => {
    const dates: BimesterDates = {};
    (absenceControls || []).forEach((bimester) => {
      const control = bimester as { start_date?: string; end_date?: string; bimester: number };
      if (control.start_date && control.end_date) {
        dates[control.bimester] = {
          start: control.start_date,
          end: control.end_date,
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

  // ✅ CALCULAR studentRecord e studentRecordWithoutJustified quando dados mudam
  useEffect(() => {
    // ⚠️ CORREÇÃO: Não setar null durante loading (race condition fix)
    // Só setar null se dados já carregaram mas estudante não existe
    if (!student && !loadingStudent) {
      setStudentRecord(null);
      setStudentRecordWithoutJustified(null);
      return;
    }

    // ⚠️ IMPORTANTE: Aguardar todos os dados carregarem antes de calcular
    if (loadingStudent || loadingAbsences || loadingAbsenceControls) {
      // Não setar null, apenas aguardar
      return;
    }

    // ⚠️ Se não há estudante após loading, setar null
    // IMPORTANTE: absences pode ser array vazio [] (estudante sem faltas) - isso é válido!
    if (!student || absences === null || absences === undefined || Object.keys(bimesterDates).length === 0) {
      setStudentRecord(null);
      setStudentRecordWithoutJustified(null);
      return;
    }

    const calculateRecords = async () => {
      const today = new Date();
      const currentYear = parseInt(process.env.NEXT_PUBLIC_SCHOOL_YEAR || new Date().getFullYear().toString());
      const startDate = new Date(currentYear, 0, 1); // 1º de janeiro do ano letivo

      // Calcular dias letivos (função assíncrona importada de @/app/utils)
      const diasLetivosData = await calculateDiasLetivos(
        startDate.toLocaleDateString("pt-BR"),
        today.toLocaleDateString("pt-BR")
      );

    // ============================================
    // 1. studentRecord (COM faltas justificadas)
    // ============================================
    const faltasB1 = absences.filter((d) => d.data && getBimesterByDate(d.data, bimesterDates) === 1).length;
    const faltasB2 = absences.filter((d) => d.data && getBimesterByDate(d.data, bimesterDates) === 2).length;
    const faltasB3 = absences.filter((d) => d.data && getBimesterByDate(d.data, bimesterDates) === 3).length;
    const faltasB4 = absences.filter((d) => d.data && getBimesterByDate(d.data, bimesterDates) === 4).length;
    const totalFaltas = faltasB1 + faltasB2 + faltasB3 + faltasB4;

    const totalFaltasAteHoje = absences.filter((record) => {
      // Type guard: ensure data is defined
      if (!record.data) return false;
      const date = parseDate(record.data);
      return date !== null && date >= startDate && date <= today;
    }).length;

    const aggregated: StudentRecord = {
      estudanteId: student.estudanteId,
      turma: student.turma || "",
      nome: student.nome || "",
      faltasB1,
      faltasB2,
      faltasB3,
      faltasB4,
      totalFaltas,
      totalFaltasAteHoje,
      percentualFaltas: diasLetivosData.anual ? Number((totalFaltas / diasLetivosData.anual * 100).toFixed(1)) : 0,
      percentualFaltasAteHoje: diasLetivosData.ateHoje ? Number((totalFaltasAteHoje / diasLetivosData.ateHoje * 100).toFixed(1)) : 0,
      percentualFrequencia: diasLetivosData.anual ? Number((100 - (totalFaltas / diasLetivosData.anual * 100)).toFixed(1)) : 100,
      percentualFrequenciaAteHoje: diasLetivosData.ateHoje ? Number((100 - (totalFaltasAteHoje / diasLetivosData.ateHoje * 100)).toFixed(1)) : 100,
      diasLetivosAteHoje: diasLetivosData.ateHoje,
      diasLetivosB1: diasLetivosData.b1,
      diasLetivosB2: diasLetivosData.b2,
      diasLetivosB3: diasLetivosData.b3,
      diasLetivosB4: diasLetivosData.b4,
      diasLetivosAnual: diasLetivosData.anual,
    };
    setStudentRecord(aggregated);

    // ============================================
    // 2. studentRecordWithoutJustified (SEM faltas justificadas)
    // ============================================
    const faltasB1NoJustified = absences.filter((d) => d.data && getBimesterByDate(d.data, bimesterDates) === 1 && !d.justified).length;
    const faltasB2NoJustified = absences.filter((d) => d.data && getBimesterByDate(d.data, bimesterDates) === 2 && !d.justified).length;
    const faltasB3NoJustified = absences.filter((d) => d.data && getBimesterByDate(d.data, bimesterDates) === 3 && !d.justified).length;
    const faltasB4NoJustified = absences.filter((d) => d.data && getBimesterByDate(d.data, bimesterDates) === 4 && !d.justified).length;
    const totalFaltasNoJustified = faltasB1NoJustified + faltasB2NoJustified + faltasB3NoJustified + faltasB4NoJustified;

    const totalFaltasAteHojeNoJustified = absences.filter((record) => {
      // Type guard: ensure data is defined
      if (!record.data) return false;
      const date = parseDate(record.data);
      return date !== null && date >= startDate && date <= today && !record.justified;
    }).length;

    const aggregatedNoJustified: StudentRecord = {
      estudanteId: student.estudanteId,
      turma: student.turma || "",
      nome: student.nome || "",
      faltasB1: faltasB1NoJustified,
      faltasB2: faltasB2NoJustified,
      faltasB3: faltasB3NoJustified,
      faltasB4: faltasB4NoJustified,
      totalFaltas: totalFaltasNoJustified,
      totalFaltasAteHoje: totalFaltasAteHojeNoJustified,
      percentualFaltas: diasLetivosData.anual ? Number((totalFaltasNoJustified / diasLetivosData.anual * 100).toFixed(1)) : 0,
      percentualFaltasAteHoje: diasLetivosData.ateHoje ? Number((totalFaltasAteHojeNoJustified / diasLetivosData.ateHoje * 100).toFixed(1)) : 0,
      percentualFrequencia: diasLetivosData.anual ? Number((100 - (totalFaltasNoJustified / diasLetivosData.anual * 100)).toFixed(1)) : 100,
      percentualFrequenciaAteHoje: diasLetivosData.ateHoje ? Number((100 - (totalFaltasAteHojeNoJustified / diasLetivosData.ateHoje * 100)).toFixed(1)) : 100,
      diasLetivosAteHoje: diasLetivosData.ateHoje,
      diasLetivosB1: diasLetivosData.b1,
      diasLetivosB2: diasLetivosData.b2,
      diasLetivosB3: diasLetivosData.b3,
      diasLetivosB4: diasLetivosData.b4,
      diasLetivosAnual: diasLetivosData.anual,
    };
    setStudentRecordWithoutJustified(aggregatedNoJustified);
    };

    calculateRecords();
  }, [student, absences, bimesterDates, loadingStudent, loadingAbsences, loadingAbsenceControls]);

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
  const [contactVerificationData, setContactVerificationData] = useState<Map<string, ContactVerificationData>>(new Map());
  const [selectedWhatsAppPhones, setSelectedWhatsAppPhones] = useState<Set<string>>(new Set());
  const [whatsAppMessage, setWhatsAppMessage] = useState<string>("");
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<boolean>(false);
  const [whatsAppSendSuccess, setWhatsAppSendSuccess] = useState<boolean>(false);

  // ═══════════════════════════════════════════════════════════
  // 5. LOADING/ERROR/USER
  // ═══════════════════════════════════════════════════════════

  const loadingProfile = loadingStudents || loadingStudent || loadingInteractions || loadingAbsences || loadingAtestados || loadingSuspensoes;
  const userRole = currentUser?.role?.toLowerCase() || "user";
  const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido";

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
      const student = allStudents.find((s) =>
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
          const { verified, exists, verifiedAt } = contato.whatsapp as { verified: boolean; exists: boolean; verifiedAt?: string };

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
      setAtestadoStartDate(_formatDate(editingAtestado.startDate));
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
      setSuspensaoStartDate(_formatDate(editingSuspensao.startDate));
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
    async (studentId?: string): Promise<void> => {
      // Type guard: ensure studentId is defined and not empty
      if (!studentId || studentId.trim() === '') return;

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
      // ✅ NORMALIZAR PRIMEIRO: Se recebeu Internal ID, converter para Firebase UUID
      const student = allStudents.find((s) =>
        s.id === studentId || s.estudanteId === studentId
      );

      const normalizedId = student?.estudanteId || studentId;

      // ✅ GUARD 1: Evitar re-seleção do mesmo estudante (usar normalizedId!)
      if (normalizedId === selectedStudentId) {
        return;
      }

      // ✅ GUARD 2: Evitar chamada duplicada imediata (verificar contra lastSelectedIdRef)
      if (normalizedId === lastSelectedIdRef.current) {
        return;
      }

      // ✅ GUARD 3: Evitar chamadas múltiplas enquanto ainda está selecionando
      if (isSelectingStudent.current) {
        return;
      }

      isSelectingStudent.current = true;
      lastSelectedIdRef.current = normalizedId;

      setSelectedStudentId(normalizedId);
      setSearchName("");
      setSuggestions([]);
      fetchStudentData(normalizedId);

      // ✅ NÃO limpar selectedTurma - causa re-mount do Select e comportamento estranho
      // O usuário pode querer selecionar outro estudante da mesma turma

      // Reset selecting flag after a short delay
      setTimeout(() => {
        isSelectingStudent.current = false;
      }, 1000);
    },
    [fetchStudentData, allStudents, selectedStudentId]
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
        } catch (_error) {
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

      // ✅ SPRINT 4 - FASE 8: Usar hook de criação com campos no formato esperado pela API
      await createInteraction({
        estudanteId: selectedStudentId, // ✅ CORRETO: API espera "estudanteId"
        tipo: interactionType,
        data: formattedDate.replace(/\//g, ''), // Converter DD/MM/YYYY para DDMMYYYY
        descricao: finalDescription,
        criadoPor: currentUserName, // Nome do usuário autenticado
        responsavel: currentUserName, // Nome do responsável pela interação
        assunto: interactionType, // Assunto da interação (mesmo que o tipo)
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
      logger.error("Erro ao cadastrar interação", {}, error as Error);
      toast.error("Erro ao salvar interação. Os campos foram mantidos para você tentar novamente.");
      setIsSendingWhatsApp(false);
      setWhatsAppSendSuccess(false);
    }
  }, [selectedStudentId, student, interactionType, interactionDate, interactionDescription, interactionSensitive, selectedWhatsAppPhones, whatsAppMessage, auth, fetchStudentData, createInteraction]);

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
      // ✅ SPRINT 4 - FASE 8: Usar hook de update com campos no formato correto (camelCase English)
      await updateInteraction(editingInteraction.id, {
        type: interactionType,
        date: formattedDate,
        description: interactionDescription,
        sensitive: interactionSensitive,
        // Nota: createdBy não pode ser alterado na edição
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
    } catch (err) {
      logger.error("Erro ao atualizar interação", {}, err as Error);
      toast.error("Erro ao atualizar interação. Tente novamente.");
    }
  }, [editingInteraction, selectedStudentId, interactionType, interactionDate, interactionDescription, interactionSensitive, fetchStudentData, updateInteraction]);

  const handleDeleteInteraction = useCallback(async (interactionId: string): Promise<void> => {
    if (!selectedStudentId) return;

    // ✅ Validar se ID é válido antes de deletar
    if (!interactionId || typeof interactionId !== 'string') {
      toast.error("ID da interação inválido. Recarregue a página e tente novamente.");
      logger.error("ID da interação inválido", {}, new Error(`Invalid ID: ${interactionId}`));
      setShowDeleteDialog(null);
      return;
    }

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
      const errorMessage = (error as Error).message || '';
      logger.error("Erro ao excluir interação", {}, error as Error);

      // ✅ Feedback mais específico baseado no erro
      if (errorMessage.includes('NOT_FOUND') || errorMessage.includes('404')) {
        toast.error("Interação não encontrada. Ela pode já ter sido excluída. Atualizando...");
        // Recarregar dados mesmo em caso de erro 404
        await fetchStudentData(selectedStudentId);
      } else {
        toast.error("Erro ao excluir interação. Tente novamente.");
      }
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

      const newCertificate = await MedicalCertificatesService.create({
        studentId: selectedStudentId,
        startDate: formattedDate,
        endDate: endDate.toISOString().split('T')[0],
        diagnosis: atestadoDescription,
        createdBy: currentUserName,
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
      logger.error("Erro ao cadastrar atestado", {}, error as Error);
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
    } catch (err) {
      logger.error("Erro ao atualizar atestado", {}, err as Error);
      toast.error("Erro ao atualizar atestado. Tente novamente.");
    }
  }, [editingAtestado, selectedStudentId, atestadoStartDate, atestadoDays, atestadoDescription, fetchStudentData]);

  const handleDeleteAtestado = useCallback(async (atestadoId: string): Promise<void> => {
    // Type guard: ensure selectedStudentId is defined
    if (!selectedStudentId || selectedStudentId.trim() === '') {
      toast.error("Nenhum estudante selecionado.");
      return;
    }

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
      logger.error("Erro ao excluir atestado", {}, error as Error);
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

      const newSuspension = await StudentSuspensionsService.create({
        studentId: selectedStudentId,
        startDate: formattedDate,
        endDate: endDate.toISOString().split('T')[0],
        reason: suspensaoDescription,
        description: suspensaoDescription,
        severity: 'MODERADA',
        decisionBy: currentUserName,
        decisionDate: formattedDate,
        createdBy: currentUserName,
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
    } catch (err) {
      logger.error("Erro ao cadastrar suspensão", {}, err as Error);
      toast.error("Erro ao salvar suspensão. Tente novamente.");
    }
  }, [selectedStudentId, suspensaoStartDate, suspensaoDays, suspensaoDescription, fetchStudentData]);

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
    } catch (err) {
      logger.error("Erro ao atualizar suspensão", {}, err as Error);
      toast.error("Erro ao atualizar suspensão. Tente novamente.");
    }
  }, [editingSuspensao, selectedStudentId, suspensaoStartDate, suspensaoDays, suspensaoDescription, fetchStudentData]);

  const handleDeleteSuspensao = useCallback(async (suspensaoId: string): Promise<void> => {
    // Type guard: ensure selectedStudentId is defined
    if (!selectedStudentId || selectedStudentId.trim() === '') {
      toast.error("Nenhum estudante selecionado.");
      return;
    }

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
    } catch (err) {
      logger.error("Erro ao excluir suspensão", {}, err as Error);
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
    } catch (err) {
      logger.error("Erro ao reverificar WhatsApp", { phone: contact.telefone }, err as Error);
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      logger.error("Erro ao enviar mensagem WhatsApp", {
        phone: `${phone.substring(0, 4)}****${phone.substring(phone.length - 4)}`,
        studentId: selectedStudentId
      }, err as Error);

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
        } catch (err) {
          toast.dismiss(toastId);
          toast.error("Falha ao enviar mensagem. A interação NÃO foi salva.");
          setIsSendingWhatsApp(false);
          setWhatsAppSendSuccess(false);
          console.error('Erro ao enviar WhatsApp:', err);
          return;
        }
      }

      // Salvar interação
      const phoneNumber = whatsappPhones[0];
      const contact = student?.contatos?.find((c: Contato) => c.telefone.replace(/\D/g, '') === phoneNumber);
      const contactName = contact ? `${contact.nome}${contact.parentesco ? ` (${contact.parentesco})` : ''}` : phoneNumber;
      const finalDescription = `Mensagem enviada via WhatsApp para: ${contactName} - ${phoneNumber}\n\n${interactionDescription}`;

      // ✅ SPRINT 4 - FASE 8: Usar hook de criação com campos no formato esperado pela API
      await createInteraction({
        estudanteId: selectedStudentId, // ✅ CORRETO: API espera "estudanteId"
        tipo: 'Contato digital',
        data: new Date().toLocaleDateString('pt-BR').split('/').reverse().join(''), // DDMMYYYY format
        descricao: finalDescription,
        criadoPor: currentUserName,
        responsavel: currentUserName,
        assunto: 'Contato digital',
        whatsapp_message: whatsappMessageText,
        whatsapp_phones: whatsappPhones,
        whatsapp_message_id: whatsappMessageId,
        whatsapp_status: 'SENT',
        whatsapp_sent_at: new Date().toISOString(),
      });

      logger.interactionOperation('create', selectedStudentId, 'Contato digital', { apiRest: true });

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
    } catch (err) {
      logger.error("Erro ao cadastrar interação", {}, err as Error);
      toast.error("Erro ao salvar interação. Tente novamente.");
      setIsSendingWhatsApp(false);
      setWhatsAppSendSuccess(false);
    }
  }, [selectedStudentId, student, selectedWhatsAppPhones, whatsAppMessage, interactionDescription, interactionSensitive, fetchStudentData, createInteraction]);

  // ═══════════════════════════════════════════════════════════
  // HANDLERS - SEARCH
  // ═══════════════════════════════════════════════════════════

  const handleSearchName = useCallback((value: string) => {
    // ✅ CRITICAL: Verificar ANTES de atualizar o estado
    if (isSelectingStudent.current) {
      isSelectingStudent.current = false;
      return;
    }

    setSearchName(value);
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
    const student = allStudents.find((s: Student) =>
      s.id === studentId || s.estudanteId === studentId
    );

    const normalizedId = student?.estudanteId || studentId;

    setSelectedStudentId(normalizedId);

    // ✅ CRITICAL: Usar setTimeout para garantir que setSearchName execute após o clique
    // Isso previne race condition com eventos onChange do Input
    setTimeout(() => {
      setSearchName(""); // Limpa campo para reabilitar busca por turma
      setSuggestions([]);
      isSelectingStudent.current = false;
    }, 0);

    // ✅ NÃO limpar selectedTurma - permite voltar à busca por turma facilmente
    // Usuário pode querer selecionar outro estudante da mesma turma
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
