/**
 * WHATSAPP DATA SERVICE (SUPABASE VERSION)
 *
 * Serviço centralizado para salvar verificações de WhatsApp.
 * Migrado de Firebase para Supabase - remove dual-write.
 */

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';

interface WhatsAppVerificationData {
  exists: boolean;
  jid?: string | null;
  name?: string | null;
  [key: string]: any;
}

interface SaveResult {
  success: boolean;
  errors: string[];
  timestamp: number;
}

/**
 * Salvar verificação de WhatsApp no Supabase
 * Atualiza tanto whatsapp_verified_numbers quanto student_contacts.whatsapp_data
 */
export async function saveWhatsAppVerification(
  estudanteId: string,
  contactId: string,
  telefone: string,
  verificationData: WhatsAppVerificationData
): Promise<SaveResult> {
  logger.info('Salvando verificação WhatsApp (Supabase)', {
    estudanteId,
    contactId,
    telefone,
    exists: verificationData.exists
  });

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
  } else {
    logger.debug('Pulando atualização de student_contacts (IDs inválidos ou temporários)', {
      estudanteId,
      contactId
    });
  }

  // Salvar simultaneamente
  const results = await Promise.allSettled(promises);
  const [verifiedNumbersResult, contactsResult] = results;

  // Verificar resultados
  if (verifiedNumbersResult.status === 'rejected') {
    const errorMsg = `whatsapp_verified_numbers falhou: ${verifiedNumbersResult.reason}`;
    errors.push(errorMsg);
    logger.error('whatsapp_verified_numbers falhou', { telefone }, verifiedNumbersResult.reason as Error);
  } else {
    logger.debug('Salvo em whatsapp_verified_numbers', { telefone });
  }

  // Verificar contactsResult apenas se existe (quando hasValidIds = true)
  if (contactsResult) {
    if (contactsResult.status === 'rejected') {
      const errorMsg = `student_contacts falhou: ${contactsResult.reason}`;
      errors.push(errorMsg);
      logger.error('student_contacts falhou', { estudanteId, contactId }, contactsResult.reason as Error);
    } else {
      logger.debug('Salvo em student_contacts', { estudanteId, contactId });
    }
  }

  // Se pelo menos UMA estrutura funcionou = SUCESSO
  const success = verifiedNumbersResult.status === 'fulfilled' ||
                  (contactsResult && contactsResult.status === 'fulfilled');

  if (success) {
    logger.info('Verificação WhatsApp salva com sucesso', {
      telefone,
      exists: verificationData.exists
    });
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
 * Salvar/atualizar na tabela whatsapp_verified_numbers
 */
async function saveToVerifiedNumbers(
  telefone: string,
  verificationData: WhatsAppVerificationData
): Promise<void> {
  // Primeiro, tentar buscar registro existente
  const { data: existing, error: selectError } = await (supabase as any)
    .from('whatsapp_verified_numbers')
    .select('phone_number')
    .eq('phone_number', telefone)
    .maybeSingle(); // maybeSingle() não gera erro quando não encontra

  // Se registro existe, fazer UPDATE
  if (existing) {
    const { error } = await (supabase as any)
      .from('whatsapp_verified_numbers')
      .update({
        is_verified: verificationData.exists,
        whatsapp_jid: verificationData.jid || null,
        contact_name: verificationData.name || null,
        verified_at: new Date().toISOString()
      })
      .eq('phone_number', telefone);

    if (error) throw error;
  } else {
    // Registro não existe, fazer INSERT
    // Usar try-catch para lidar com race condition (caso outro processo insira ao mesmo tempo)
    const { error } = await (supabase as any)
      .from('whatsapp_verified_numbers')
      .insert({
        phone_number: telefone,
        is_verified: verificationData.exists,
        whatsapp_jid: verificationData.jid || null,
        contact_name: verificationData.name || null,
        verified_at: new Date().toISOString()
      });

    // Se erro de duplicação (23505), tentar UPDATE ao invés de falhar
    if (error && error.code === '23505') {
      logger.warn('Race condition detectada em whatsapp_verified_numbers, tentando UPDATE', { telefone });

      const { error: updateError } = await (supabase as any)
        .from('whatsapp_verified_numbers')
        .update({
          is_verified: verificationData.exists,
          whatsapp_jid: verificationData.jid || null,
          contact_name: verificationData.name || null,
          verified_at: new Date().toISOString()
        })
        .eq('phone_number', telefone);

      if (updateError) throw updateError;
    } else if (error) {
      throw error;
    }
  }
}

/**
 * Atualizar whatsapp_data no contact do estudante
 */
async function updateContactWhatsAppData(
  estudanteId: string,
  contactId: string,
  telefone: string,
  verificationData: WhatsAppVerificationData
): Promise<void> {
  // Build whatsapp_data JSONB object
  const whatsappData = {
    verified: true,
    exists: verificationData.exists,
    jid: verificationData.jid || null,
    name: verificationData.name || null,
    number: telefone,
    verifiedAt: new Date().toISOString(),
    verificationStatus: verificationData.exists ? 'verified' : 'unavailable'
  };

  // Find contact by student_id and id (UUID from migration)
  const { error } = await (supabase as any)
    .from('student_contacts')
    .update({
      whatsapp_data: whatsappData
    })
    .eq('student_id', estudanteId)
    .eq('id', contactId);

  if (error) throw error;
}

/**
 * Salvar múltiplas verificações em lote
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
  logger.info('Salvando verificações WhatsApp em lote (Supabase)', {
    totalVerifications: verifications.length
  });

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

  logger.info('Lote de verificações WhatsApp concluído', {
    totalProcessed: verifications.length,
    successful,
    failed
  });

  return {
    totalProcessed: verifications.length,
    successful,
    failed,
    errors
  };
}

/**
 * QUERY FUNCTIONS - Supabase
 * Funções para consultar dados WhatsApp
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
 * Buscar contatos de um estudante com status WhatsApp
 */
export async function getStudentContactsWithWhatsApp(
  studentId: string
): Promise<ContactWithWhatsAppStatus[]> {
  try {
    logger.debug('Buscando contatos do estudante (Supabase)', { studentId });

    const { data, error } = await (supabase
      .from('student_contacts')
      .select('*')
      .eq('student_id', studentId)
      .eq('deleted', false) as any);

    if (error) throw error;

    const contacts: ContactWithWhatsAppStatus[] = (data || []).map((contact: any) => ({
      contactId: contact.id,
      nome: contact.name || '',
      parentesco: contact.relationship || '',
      telefone: contact.phone || '',
      telefoneNumerico: contact.phone_numeric || '',
      podeReceberWhatsapp: contact.can_receive_whatsapp !== false,
      whatsapp: contact.whatsapp_data || undefined,
    }));

    logger.info('Contatos do estudante carregados', {
      studentId,
      count: contacts.length
    });
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
 * Verificar se um telefone específico tem WhatsApp
 */
export async function checkWhatsAppStatus(
  studentId: string,
  contactId: string
): Promise<boolean | null> {
  try {
    const { data, error } = await (supabase
      .from('student_contacts')
      .select('whatsapp_data')
      .eq('student_id', studentId)
      .eq('id', contactId)
      .single() as any);

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw error;
    }

    const whatsappData = data?.whatsapp_data as any;
    return whatsappData?.exists === true && whatsappData?.verified === true;

  } catch (error) {
    logger.error('checkWhatsAppStatus falhou', { studentId, contactId }, error as Error);
    return null;
  }
}

/**
 * Buscar número verificado na lookup table
 */
export async function getVerifiedNumber(telefone: string): Promise<{
  isVerified: boolean;
  exists: boolean;
  jid?: string | null;
  name?: string | null;
  verifiedAt?: string | null;
} | null> {
  try {
    const { data, error } = await (supabase
      .from('whatsapp_verified_numbers')
      .select('*')
      .eq('phone_number', telefone)
      .single() as any);

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw error;
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
