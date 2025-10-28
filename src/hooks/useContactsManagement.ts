/**
 * useContactsManagement Hook
 * ✅ SPRINT 4 - FASE 6: Migrado para API REST
 *
 * Centraliza toda a lógica de gerenciamento de contatos telefônicos e WhatsApp.
 * Extrai ~400-500 linhas do componente telefones/page.tsx
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebounce } from "@/hooks/useDebounce";
import { useCreateInteraction } from '@/hooks/api';
import { toast } from 'sonner';
import { WhatsAppTrackingService } from '@/services/whatsappTrackingService';
import { logger } from '@/utils/logger';
import { getAuth } from 'firebase/auth';
import type { Estudante } from '@/hooks/useStudents';

// ════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════

export interface PhoneContact {
  telefone: string;
  nome: string;
  parentesco?: string;
  estudanteNome: string;
  estudanteId: string;
  turma: string;
  turno: string;
  hasWhatsApp?: boolean;
  whatsAppVerified?: boolean;
  lastVerified?: string;
  podeReceberMensagem?: boolean;
}

interface UseContactsManagementProps {
  students: Estudante[];
  studentsLoading: boolean;
}

// ════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ════════════════════════════════════════════════════════════════

export function useContactsManagement({ students }: UseContactsManagementProps) {
  const auth = getAuth();

  // ✅ MIGRADO: Hook da API REST
  const { createInteraction } = useCreateInteraction();

  // ──────────────────────────────────────────────────────────────
  // Estados
  // ──────────────────────────────────────────────────────────────

  const [phoneContacts, setPhoneContacts] = useState<PhoneContact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [verifyingPhone, setVerifyingPhone] = useState<string | null>(null);
  const [loadingWhatsAppData, setLoadingWhatsAppData] = useState(true);

  // Filtros
  const [selectedTurma, setSelectedTurma] = useState<string>('all');
  const [selectedVerificationStatus, setSelectedVerificationStatus] = useState<string>('all');
  const [selectedPhoneType, setSelectedPhoneType] = useState<string>('all');
  const [selectedWhatsAppStatus, setSelectedWhatsAppStatus] = useState<string>('all');
  const [selectedStudentWhatsAppFilter, setSelectedStudentWhatsAppFilter] = useState<string>('all');

  // Modal WhatsApp
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<PhoneContact | null>(null);
  const [verifiedWhatsAppNumbers, setVerifiedWhatsAppNumbers] = useState<Set<string>>(new Set());
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppSendSuccess, setWhatsAppSendSuccess] = useState(false);
  const [contactVerificationData, setContactVerificationData] = useState<Map<string, {
    verificationStatus?: string;
    hasWhatsApp?: boolean;
    whatsapp?: {
      verified?: boolean;
      exists?: boolean;
    };
  }>>(new Map());

  // Formulário WhatsApp
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [selectedWhatsAppPhones, setSelectedWhatsAppPhones] = useState<Set<string>>(new Set());
  const [interactionDescription, setInteractionDescription] = useState('');
  const [interactionSensitive, setInteractionSensitive] = useState(false);

  // ──────────────────────────────────────────────────────────────
  // Extração de Contatos
  // ──────────────────────────────────────────────────────────────

  const extractPhoneContacts = useMemo(() => {
    const contacts: PhoneContact[] = [];

    students.forEach(student => {
      if (student.contatos && student.contatos.length > 0) {
        student.contatos.forEach((contato) => {
          if (contato.telefone && contato.telefone.trim()) {
            const cleanPhone = contato.telefone.replace(/\D/g, '');
            if (cleanPhone.length >= 10) {
              contacts.push({
                telefone: cleanPhone,
                nome: contato.nome,
                parentesco: contato.parentesco,
                estudanteNome: student.nome,
                estudanteId: student.estudanteId,
                turma: student.turma,
                turno: student.turno,
                whatsAppVerified: contato.whatsapp?.verified || false,
                hasWhatsApp: contato.whatsapp?.exists || false,
                lastVerified: contato.whatsapp?.verifiedAt || undefined,
                podeReceberMensagem: contato.podeReceberMensagem,
              });
            }
          }
        });
      }
    });

    const uniqueContacts = contacts.filter((contact, index, self) =>
      index === self.findIndex(c => c.telefone === contact.telefone)
    );

    return uniqueContacts.sort((a, b) => a.telefone.localeCompare(b.telefone));
  }, [students]);

  // ──────────────────────────────────────────────────────────────
  // Effects
  // ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (extractPhoneContacts.length > 0) {
      setPhoneContacts(extractPhoneContacts);

      const numbersWithWhatsApp = new Set<string>();
      const verificationDataMap = new Map<string, {
        verificationStatus?: string;
        hasWhatsApp?: boolean;
        isVerified?: boolean;
        verifiedAt?: string;
        whatsapp?: {
          verified?: boolean;
          exists?: boolean;
        };
      }>();

      extractPhoneContacts.forEach(contact => {
        if (contact.hasWhatsApp) {
          numbersWithWhatsApp.add(contact.telefone);
        }

        verificationDataMap.set(contact.telefone, {
          hasWhatsApp: contact.hasWhatsApp || false,
          verificationStatus: contact.whatsAppVerified ? 'verified' : 'error',
          isVerified: contact.whatsAppVerified || false,
          verifiedAt: contact.lastVerified,
          whatsapp: {
            verified: contact.whatsAppVerified,
            exists: contact.hasWhatsApp
          }
        });
      });

      setVerifiedWhatsAppNumbers(numbersWithWhatsApp);
      setContactVerificationData(verificationDataMap);
      setLoadingWhatsAppData(false);
    }
  }, [extractPhoneContacts]);

  // ──────────────────────────────────────────────────────────────
  // Turmas e Filtros
  // ──────────────────────────────────────────────────────────────

  const uniqueTurmas = useMemo(() => {
    const turmas = new Set(phoneContacts.map(c => c.turma));
    return Array.from(turmas).sort((a, b) => {
      const matchA = a.match(/(\d+)([A-Z]+)/);
      const matchB = b.match(/(\d+)([A-Z]+)/);
      if (!matchA || !matchB) return 0;
      const [, numA, letterA] = matchA;
      const [, numB, letterB] = matchB;
      const numCompare = Number(numA) - Number(numB);
      if (numCompare !== 0) return numCompare;
      return letterA.localeCompare(letterB);
    });
  }, [phoneContacts]);

  const filteredPhones = useMemo(() => {
    let filtered = [...phoneContacts];

    if (debouncedSearchTerm.trim()) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.telefone.includes(term) ||
        contact.nome.toLowerCase().includes(term) ||
        contact.estudanteNome.toLowerCase().includes(term) ||
        contact.turma.toLowerCase().includes(term)
      );
    }

    if (selectedTurma !== 'all') {
      filtered = filtered.filter(c => c.turma === selectedTurma);
    }

    if (selectedVerificationStatus === 'verified') {
      filtered = filtered.filter(c => c.whatsAppVerified);
    } else if (selectedVerificationStatus === 'not-verified') {
      filtered = filtered.filter(c => !c.whatsAppVerified);
    }

    if (selectedPhoneType === 'mobile') {
      filtered = filtered.filter(c => c.telefone.length === 11);
    } else if (selectedPhoneType === 'landline') {
      filtered = filtered.filter(c => c.telefone.length === 10);
    }

    if (selectedWhatsAppStatus === 'has-whatsapp') {
      filtered = filtered.filter(c => c.hasWhatsApp === true);
    } else if (selectedWhatsAppStatus === 'no-whatsapp') {
      filtered = filtered.filter(c => c.whatsAppVerified && c.hasWhatsApp === false);
    }

    // Filtro por estudante com/sem WhatsApp
    if (selectedStudentWhatsAppFilter === 'students-with-whatsapp') {
      // Pegar IDs de estudantes que têm pelo menos 1 WhatsApp verificado
      const studentsWithWhatsApp = new Set(
        phoneContacts
          .filter(c => c.hasWhatsApp === true)
          .map(c => c.estudanteId)
      );
      filtered = filtered.filter(c => studentsWithWhatsApp.has(c.estudanteId));
    } else if (selectedStudentWhatsAppFilter === 'students-without-whatsapp') {
      // Pegar IDs de estudantes que NÃO têm nenhum WhatsApp verificado
      const studentsWithWhatsApp = new Set(
        phoneContacts
          .filter(c => c.hasWhatsApp === true)
          .map(c => c.estudanteId)
      );
      filtered = filtered.filter(c => !studentsWithWhatsApp.has(c.estudanteId));
    }

    return filtered.sort((a, b) => {
      const matchA = a.turma.match(/(\d+)([A-Z]+)/);
      const matchB = b.turma.match(/(\d+)([A-Z]+)/);

      if (matchA && matchB) {
        const [, numA, letterA] = matchA;
        const [, numB, letterB] = matchB;

        const numCompare = Number(numA) - Number(numB);
        if (numCompare !== 0) return numCompare;

        const letterCompare = letterA.localeCompare(letterB);
        if (letterCompare !== 0) return letterCompare;
      }

      return a.estudanteNome.localeCompare(b.estudanteNome);
    });
  }, [phoneContacts, debouncedSearchTerm, selectedTurma, selectedVerificationStatus, selectedPhoneType, selectedWhatsAppStatus, selectedStudentWhatsAppFilter]);

  // ──────────────────────────────────────────────────────────────
  // Estatísticas
  // ──────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = filteredPhones.length;
    const verified = filteredPhones.filter(c => c.whatsAppVerified).length;
    const withWhatsApp = filteredPhones.filter(c => c.hasWhatsApp).length;
    const mobile = filteredPhones.filter(c => c.telefone.length === 11).length;

    // Calcular estudantes únicos com/sem WhatsApp
    const studentsWithWhatsApp = new Set(
      phoneContacts
        .filter(c => c.hasWhatsApp === true)
        .map(c => c.estudanteId)
    );

    const allStudents = new Set(phoneContacts.map(c => c.estudanteId));
    const studentsWithoutWhatsApp = allStudents.size - studentsWithWhatsApp.size;

    return {
      total,
      verified,
      withWhatsApp,
      mobile,
      studentsWithWhatsApp: studentsWithWhatsApp.size,
      studentsWithoutWhatsApp
    };
  }, [filteredPhones, phoneContacts]);

  // ──────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    } else if (phone.length === 10) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  const getContactId = async (studentId: string, phone: string): Promise<string | undefined> => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('[TELEFONES] Usuário não autenticado');
        return undefined;
      }

      const token = await user.getIdToken();
      const cleanPhone = phone.replace(/\D/g, '');

      // Buscar estudante com contatos via API
      const response = await fetch(`/api/students/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('[TELEFONES] Erro ao buscar estudante:', response.status);
        return undefined;
      }

      const result = await response.json();

      if (!result.success || !result.data || !result.data.student) {
        console.error('[TELEFONES] Resposta inválida da API');
        return undefined;
      }

      // API retorna { success: true, data: { student: {...} } }
      const student = result.data.student;

      // Buscar contato pelo telefone
      if (student.contatos && Array.isArray(student.contatos)) {
        for (const contato of student.contatos) {
          const contatoPhone = contato.telefone?.replace(/\D/g, '');

          if (contatoPhone === cleanPhone) {
            // Retornar o contactId do Supabase
            return contato.id;
          }
        }
      }

      return undefined;
    } catch (err) {
      console.error('[TELEFONES] Erro ao buscar contactId:', err);
      return undefined;
    }
  };

  // ──────────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────────

  const verifyWhatsApp = async (phone: string) => {
    setVerifyingPhone(phone);

    try {
      const contact = phoneContacts.find(c => c.telefone === phone);

      if (!contact) {
        toast.error('Contato não encontrado');
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        toast.error("Usuário não autenticado. Faça login novamente.");
        setVerifyingPhone(null);
        return;
      }

      const token = await user.getIdToken();

      const response = await fetch('/api/evolution/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ phone })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta da API:', errorText);
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const contactId = await getContactId(contact.estudanteId, phone);

        try {
          await WhatsAppTrackingService.markNumberAsVerified(
            phone,
            result.data.hasWhatsApp,
            contact.estudanteId,
            contact.nome,
            'verified',
            contactId
          );

          setPhoneContacts(prev => prev.map(c =>
            c.telefone === phone
              ? {
                  ...c,
                  hasWhatsApp: result.data.hasWhatsApp,
                  whatsAppVerified: true,
                  lastVerified: new Date().toISOString()
                }
              : c
          ));

          toast.success(
            result.data.hasWhatsApp
              ? "WhatsApp encontrado e salvo!"
              : "Número verificado e salvo - WhatsApp não encontrado"
          );
        } catch (saveError) {
          console.error('[TELEFONES-VERIFY] ❌ Erro ao salvar no Supabase:', saveError);
          toast.error('Verificação OK, mas erro ao salvar. Tente novamente.');
          throw saveError;
        }
      } else {
        toast.error(`Erro: ${result.error || 'Erro desconhecido'}`);
      }

    } catch (err) {
      console.error('[TELEFONES-VERIFY] Erro ao verificar WhatsApp:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Falha na verificação: ${errorMessage}`);
    } finally {
      setVerifyingPhone(null);
    }
  };

  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success('Telefone copiado!');
    } catch (err) {
      console.error('Erro ao copiar telefone:', err);
      toast.error('Erro ao copiar telefone');
    }
  };

  const openWhatsAppModal = (contact: PhoneContact) => {
    setSelectedContact(contact);
    setSelectedWhatsAppPhones(new Set([contact.telefone.replace(/\D/g, '')]));
    setIsWhatsAppModalOpen(true);
  };

  const handleSaveWhatsAppInteraction = useCallback(async () => {
    if (!selectedContact || selectedWhatsAppPhones.size === 0) return;

    try {
      setIsSendingWhatsApp(true);
      setWhatsAppSendSuccess(false);

      const whatsappPhones = Array.from(selectedWhatsAppPhones);
      const whatsappMessageText = whatsAppMessage;

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

      const phoneNumber = whatsappPhones[0];
      const contactName = selectedContact.parentesco
        ? `${selectedContact.nome} (${selectedContact.parentesco})`
        : selectedContact.nome;
      const finalDescription = `Mensagem enviada via WhatsApp para: ${contactName} - ${phoneNumber}\n\n${interactionDescription}`;

      const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido";

      // ✅ MIGRADO: Usar hook da API REST
      await createInteraction({
        studentId: selectedContact.estudanteId,
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
      });

      logger.interactionOperation('create', selectedContact.estudanteId, 'Contato digital', { apiRest: true });

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
      logger.error("Erro ao cadastrar interação", {
        studentId: selectedContact?.estudanteId,
        phoneCount: selectedWhatsAppPhones.size
      }, err as Error);
      toast.error("Erro ao salvar interação. Tente novamente.");
      setIsSendingWhatsApp(false);
      setWhatsAppSendSuccess(false);
    }
  }, [selectedContact, auth.currentUser, selectedWhatsAppPhones, whatsAppMessage, interactionDescription, interactionSensitive, createInteraction]);

  // ──────────────────────────────────────────────────────────────
  // Retorno do Hook
  // ──────────────────────────────────────────────────────────────

  return {
    // Estados
    phoneContacts,
    searchTerm,
    setSearchTerm,
    verifyingPhone,
    loadingWhatsAppData,
    verifiedWhatsAppNumbers,
    contactVerificationData,

    // Filtros
    selectedTurma,
    setSelectedTurma,
    selectedVerificationStatus,
    setSelectedVerificationStatus,
    selectedPhoneType,
    setSelectedPhoneType,
    selectedWhatsAppStatus,
    setSelectedWhatsAppStatus,
    selectedStudentWhatsAppFilter,
    setSelectedStudentWhatsAppFilter,

    // Modal WhatsApp
    isWhatsAppModalOpen,
    setIsWhatsAppModalOpen,
    selectedContact,
    setSelectedContact,
    isSendingWhatsApp,
    whatsAppSendSuccess,
    whatsAppMessage,
    setWhatsAppMessage,
    selectedWhatsAppPhones,
    setSelectedWhatsAppPhones,
    interactionDescription,
    setInteractionDescription,
    interactionSensitive,
    setInteractionSensitive,

    // Computed
    uniqueTurmas,
    filteredPhones,
    stats,

    // Helpers
    formatPhone,

    // Handlers
    verifyWhatsApp,
    copyPhone,
    openWhatsAppModal,
    handleSaveWhatsAppInteraction,
  };
}
