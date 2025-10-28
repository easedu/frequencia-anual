/**
 * WHATSAPP DATA SERVICE (API VERSION)
 *
 * Serviço centralizado para salvar verificações de WhatsApp.
 * Refatorado para usar /api/whatsapp/verified (Sprint 2)
 */

import { logger } from '@/utils/logger';
import { getAuthHeaders } from '@/utils/authToken';

interface WhatsAppVerificationData {
  exists: boolean;
  jid?: string | null;
  name?: string | null;
}

interface SaveResult {
  success: boolean;
  errors: string[];
  timestamp: number;
}

/**
 * Salvar verificação de WhatsApp via API
 * Atualiza tanto whatsapp_verified_numbers quanto student_contacts.whatsapp_data
 */
export async function saveWhatsAppVerification(
  estudanteId: string,
  contactId: string,
  telefone: string,
  verificationData: WhatsAppVerificationData
): Promise<SaveResult> {

  const errors: string[] = [];

  // Verificar se temos IDs válidos (não temporários/unknown)
  const hasValidIds = estudanteId &&
                      contactId &&
                      estudanteId !== 'unknown' &&
                      !contactId.startsWith('temp-');

  // Preparar promises
  const promises: Promise<void>[] = [
    // 1. Tabela whatsapp_verified_numbers (lookup table) - SEMPRE salvar
    saveToVerifiedNumbers(telefone, verificationData)
  ];

  // 2. Atualizar student_contacts.whatsapp_data - APENAS se temos IDs válidos
  if (hasValidIds) {
    promises.push(updateContactWhatsAppData(estudanteId, contactId, telefone, verificationData));
  }

  // Salvar simultaneamente
  const results = await Promise.allSettled(promises);
  const [verifiedNumbersResult, contactsResult] = results;

  // Verificar resultados
  if (verifiedNumbersResult.status === 'rejected') {
    const errorMsg = `whatsapp_verified_numbers falhou: ${verifiedNumbersResult.reason}`;
    errors.push(errorMsg);
    logger.error('whatsapp_verified_numbers falhou', { telefone }, verifiedNumbersResult.reason as Error);
  }

  // Verificar contactsResult apenas se existe (quando hasValidIds = true)
  if (contactsResult) {
    if (contactsResult.status === 'rejected') {
      const errorMsg = `student_contacts falhou: ${contactsResult.reason}`;
      errors.push(errorMsg);
      logger.error('student_contacts falhou', { estudanteId, contactId }, contactsResult.reason as Error);
    }
  }

  // Se pelo menos UMA estrutura funcionou = SUCESSO
  const success = verifiedNumbersResult.status === 'fulfilled' ||
                  (contactsResult && contactsResult.status === 'fulfilled');

  if (success) {
  } else {
    logger.error('Falha ao salvar verificação WhatsApp', {
      telefone,
      errors: errors.join('; ')
    });
  }

  return {
    success,
    errors,
    timestamp: Date.now()
  };
}

/**
 * Salvar/atualizar na tabela whatsapp_verified_numbers via API
 */
async function saveToVerifiedNumbers(
  telefone: string,
  verificationData: WhatsAppVerificationData
): Promise<void> {
  // ✅ Adicionar headers de autenticação
  const headers = await getAuthHeaders();

  // API POST faz upsert automaticamente (verifica duplicata e atualiza/insere)
  const response = await fetch('/api/whatsapp/verified', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone_number: telefone,
      is_verified: verificationData.exists,
      whatsapp_jid: verificationData.jid || null,
      contact_name: verificationData.name || null,
      account_exists: verificationData.exists,
      verification_status: verificationData.exists ? 'VERIFIED' : 'NOT_FOUND'
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`API returned ${response.status}: ${errorData.error || 'Failed to save'}`);
  }
}

/**
 * Atualizar whatsapp_data no contact do estudante via API
 */
async function updateContactWhatsAppData(
  estudanteId: string,
  contactId: string,
  telefone: string,
  verificationData: WhatsAppVerificationData
): Promise<void> {
  // ✅ Adicionar headers de autenticação
  const headers = await getAuthHeaders();

  // Build whatsapp_data JSONB object (match schema exactly)
  const whatsappData = {
    verified: true,
    exists: verificationData.exists,
    verifiedAt: new Date().toISOString(), // ISO string as per schema
    name: verificationData.name || null,
    number: telefone || null
  };

  const response = await fetch(`/api/contacts/${contactId}`, {
    method: 'PUT',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      whatsappData: whatsappData
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`API returned ${response.status}: ${errorData.error || 'Failed to update contact'}`);
  }
}

/**
 * Salvar múltiplas verificações em lote via API
 * Útil para processos de verificação em massa
 */
export async function saveWhatsAppVerificationBatch(
  verifications: Array<{
    estudanteId: string;
    contactId: string;
    telefone: string;
    verificationData: WhatsAppVerificationData;
  }>
): Promise<{
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let successful = 0;
  let failed = 0;

  // Process in parallel batches of 10
  const batchSize = 10;
  for (let i = 0; i < verifications.length; i += batchSize) {
    const batch = verifications.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map(verification =>
        saveWhatsAppVerification(
          verification.estudanteId,
          verification.contactId,
          verification.telefone,
          verification.verificationData
        )
      )
    );

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successful++;
      } else {
        failed++;
        const verification = batch[idx];
        const errorMsg = result.status === 'rejected'
          ? `${verification.telefone}: ${result.reason}`
          : `${verification.telefone}: ${result.value.errors.join(', ')}`;
        errors.push(errorMsg);
      }
    });
  }

  return {
    totalProcessed: verifications.length,
    successful,
    failed,
    errors
  };
}

/**
 * QUERY FUNCTIONS - API VERSION
 * Funções para consultar dados WhatsApp via API
 */

export interface ContactWithWhatsAppStatus {
  contactId: string;
  nome: string;
  parentesco: string;
  telefone: string;
  telefoneNumerico: string;
  podeReceberWhatsapp: boolean;
  whatsapp?: {
    verified: boolean;
    exists: boolean;
    jid?: string | null;
    name?: string | null;
    number?: string;
    verifiedAt?: string;
    verificationStatus?: string;
  };
}

/**
 * Buscar contatos de um estudante com status WhatsApp via API
 */
export async function getStudentContactsWithWhatsApp(
  studentId: string
): Promise<ContactWithWhatsAppStatus[]> {
  try {
    const response = await fetch(`/api/contacts?estudanteId=${studentId}`);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();
    const contacts: ContactWithWhatsAppStatus[] = (result.data?.contacts || []).map((contact: {
      id: string;
      nome?: string;
      parentesco?: string;
      telefone?: string;
      podeReceberMensagem?: boolean;
      whatsapp?: {
        verified: boolean;
        exists: boolean;
        jid?: string | null;
        name?: string | null;
        number?: string;
        verifiedAt?: string;
        verificationStatus?: string;
      };
    }) => ({
      contactId: contact.id,
      nome: contact.nome || '',
      parentesco: contact.parentesco || '',
      telefone: contact.telefone || '',
      telefoneNumerico: contact.telefone?.replace(/\D/g, '') || '',
      podeReceberWhatsapp: contact.podeReceberMensagem !== false,
      whatsapp: contact.whatsapp || undefined,
    }));

    return contacts;

  } catch (error) {
    logger.error('getStudentContactsWithWhatsApp falhou', { studentId }, error as Error);
    return [];
  }
}

/**
 * Buscar contatos elegíveis para receber WhatsApp
 * (podeReceberWhatsapp = true AND whatsapp.exists = true)
 */
export async function getEligibleContactsForWhatsApp(
  studentId: string
): Promise<ContactWithWhatsAppStatus[]> {
  const allContacts = await getStudentContactsWithWhatsApp(studentId);

  return allContacts.filter(
    contact =>
      contact.podeReceberWhatsapp === true &&
      contact.whatsapp?.exists === true &&
      contact.whatsapp?.verified === true
  );
}

/**
 * Verificar se um telefone específico tem WhatsApp via API
 */
export async function checkWhatsAppStatus(
  studentId: string,
  contactId: string
): Promise<boolean | null> {
  try {
    const response = await fetch(`/api/contacts/${contactId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Not found
      }
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();
    const whatsappData = result.data?.contact?.whatsapp;
    return whatsappData?.exists === true && whatsappData?.verified === true;

  } catch (error) {
    logger.error('checkWhatsAppStatus falhou', { studentId, contactId }, error as Error);
    return null;
  }
}

/**
 * Buscar número verificado na lookup table via API
 */
export async function getVerifiedNumber(telefone: string): Promise<{
  isVerified: boolean;
  exists: boolean;
  jid?: string | null;
  name?: string | null;
  verifiedAt?: string | null;
} | null> {
  try {
    // ✅ Adicionar headers de autenticação
    const headers = await getAuthHeaders();

    const response = await fetch(`/api/whatsapp/verified?phone_number=${telefone}`, {
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Not found
      }
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();
    const data = result.data?.data?.[0]; // GET returns array in data.data

    if (!data) {
      return null; // No results
    }

    return {
      isVerified: data.is_verified,
      exists: data.is_verified, // Assume verified = exists
      jid: data.whatsapp_jid,
      name: data.contact_name,
      verifiedAt: data.verified_at
    };

  } catch (error) {
    logger.error('getVerifiedNumber falhou', { telefone }, error as Error);
    return null;
  }
}
