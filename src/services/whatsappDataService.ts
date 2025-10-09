/**
 * WHATSAPP DATA SERVICE
 *
 * Serviço centralizado para salvar verificações de WhatsApp.
 * Implementa DUAL-WRITE: salva em ambas estruturas (antiga e nova).
 *
 * FASE 3: Atualização do Código
 */

import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase.config';
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
  savedInOld: boolean;
  savedInNew: boolean;
  timestamp: number;
}

/**
 * Salvar verificação de WhatsApp
 * Implementa dual-write com tratamento de erros robusto
 */
export async function saveWhatsAppVerification(
  estudanteId: string,
  contactId: string,
  telefone: string,
  verificationData: WhatsAppVerificationData
): Promise<SaveResult> {
  logger.info('Salvando verificação WhatsApp (dual-write)', {
    estudanteId,
    contactId,
    telefone,
    exists: verificationData.exists
  });

  const errors: string[] = [];

  // DUAL-WRITE: Salvar em AMBAS estruturas simultaneamente
  const [oldResult, newResult] = await Promise.allSettled([
    // 1. Estrutura ANTIGA (whatsapp_verified_numbers)
    saveToOldStructure(telefone, verificationData),

    // 2. Estrutura NOVA (students/{id}/contacts/{contactId})
    saveToNewStructure(estudanteId, contactId, telefone, verificationData)
  ]);

  // Verificar resultados
  if (oldResult.status === 'rejected') {
    const errorMsg = `Estrutura antiga falhou: ${oldResult.reason}`;
    errors.push(errorMsg);
    logger.error('Estrutura ANTIGA falhou', { telefone }, oldResult.reason as Error);
  } else {
    logger.debug('Salvo na estrutura ANTIGA', { telefone });
  }

  if (newResult.status === 'rejected') {
    const errorMsg = `Estrutura nova falhou: ${newResult.reason}`;
    errors.push(errorMsg);
    logger.error('Estrutura NOVA falhou', { estudanteId, contactId }, newResult.reason as Error);
  } else {
    logger.debug('Salvo na estrutura NOVA', { estudanteId, contactId });
  }

  // Se pelo menos UMA estrutura funcionou = SUCESSO
  const success = oldResult.status === 'fulfilled' || newResult.status === 'fulfilled';

  if (success) {
    logger.whatsappOperation('verify', telefone, 'success', {
      savedInOld: oldResult.status === 'fulfilled',
      savedInNew: newResult.status === 'fulfilled'
    });
  } else {
    logger.whatsappOperation('verify', telefone, 'failed', {
      errors: errors.join('; ')
    });
  }

  return {
    success,
    errors,
    savedInOld: oldResult.status === 'fulfilled',
    savedInNew: newResult.status === 'fulfilled',
    timestamp: Date.now()
  };
}

/**
 * Salvar na estrutura ANTIGA (whatsapp_verified_numbers)
 */
async function saveToOldStructure(
  telefone: string,
  verificationData: WhatsAppVerificationData
): Promise<void> {
  const whatsappRef = doc(db, 'whatsapp_verified_numbers', telefone);

  await setDoc(whatsappRef, {
    hasWhatsApp: verificationData.exists,
    phone: telefone,
    jid: verificationData.jid || null,
    contactName: verificationData.name || null,
    verifiedAt: serverTimestamp()
  });
}

/**
 * Salvar na estrutura NOVA (students/{id}/contacts/{contactId})
 */
async function saveToNewStructure(
  estudanteId: string,
  contactId: string,
  telefone: string,
  verificationData: WhatsAppVerificationData
): Promise<void> {
  const contactRef = doc(db, 'students', estudanteId, 'contacts', contactId);

  await updateDoc(contactRef, {
    'whatsapp.verified': true,
    'whatsapp.exists': verificationData.exists,
    'whatsapp.jid': verificationData.jid || null,
    'whatsapp.name': verificationData.name || null,
    'whatsapp.number': telefone,
    'whatsapp.verifiedAt': serverTimestamp(),
    'whatsapp.verificationStatus': verificationData.exists ? 'verified' : 'unavailable'
  });
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
  logger.info('Salvando verificações WhatsApp em lote', {
    totalVerifications: verifications.length
  });

  const errors: string[] = [];
  let successful = 0;
  let failed = 0;

  for (const verification of verifications) {
    try {
      const result = await saveWhatsAppVerification(
        verification.estudanteId,
        verification.contactId,
        verification.telefone,
        verification.verificationData
      );

      if (result.success) {
        successful++;
      } else {
        failed++;
        errors.push(...result.errors);
      }
    } catch (error) {
      failed++;
      const errorMsg = `Erro ao processar ${verification.telefone}: ${error instanceof Error ? error.message : 'unknown'}`;
      errors.push(errorMsg);
      logger.error('Erro ao processar verificação em lote', {
        telefone: verification.telefone
      }, error as Error);
    }
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
 * QUERY FUNCTIONS - V3 Structure
 * Funções para consultar dados WhatsApp na estrutura V3
 */

import { collection, getDocs, query, where, orderBy, limit, getDoc } from 'firebase/firestore';
import { FIREBASE_PATHS_V3 } from '@/config/constants';

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
    verifiedAt?: any;
    verificationStatus?: string;
  };
}

/**
 * Buscar contatos de um estudante com status WhatsApp
 * Lê da estrutura V3: students/{id}/contacts
 */
export async function getStudentContactsWithWhatsApp(
  studentId: string
): Promise<ContactWithWhatsAppStatus[]> {
  try {
    logger.debug('Buscando contatos do estudante', { studentId });

    const contactsRef = collection(db, FIREBASE_PATHS_V3.contacts(studentId));
    const contactsSnap = await getDocs(contactsRef);

    const contacts: ContactWithWhatsAppStatus[] = contactsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        contactId: doc.id,
        nome: data.nome || '',
        parentesco: data.parentesco || '',
        telefone: data.telefone || '',
        telefoneNumerico: data.telefoneNumerico || '',
        podeReceberWhatsapp: data.podeReceberWhatsapp !== false,
        whatsapp: data.whatsapp,
      };
    });

    logger.info('Contatos do estudante carregados', {
      studentId,
      count: contacts.length
    });
    return contacts;

  } catch (error) {
    logger.firebaseError('getStudentContactsWithWhatsApp', error as Error, { studentId });
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
 * Verificar se um telefone específico tem WhatsApp (estrutura V3)
 */
export async function checkWhatsAppStatusV3(
  studentId: string,
  contactId: string
): Promise<boolean | null> {
  try {
    const contactRef = doc(db, FIREBASE_PATHS_V3.contact(studentId, contactId));
    const contactSnap = await getDoc(contactRef);

    if (!contactSnap.exists()) {
      return null;
    }

    const data = contactSnap.data();
    return data.whatsapp?.exists === true && data.whatsapp?.verified === true;

  } catch (error) {
    logger.firebaseError('checkWhatsAppStatusV3', error as Error, { studentId, contactId });
    return null;
  }
}
