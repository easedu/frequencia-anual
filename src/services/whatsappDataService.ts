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
  console.log(`[WHATSAPP-SERVICE] 💾 Salvando verificação (dual-write)...`);
  console.log(`[WHATSAPP-SERVICE] Estudante: ${estudanteId}, Contato: ${contactId}, Tel: ${telefone}`);

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
    console.error('[WHATSAPP-SERVICE] ❌ Estrutura ANTIGA falhou:', oldResult.reason);
  } else {
    console.log('[WHATSAPP-SERVICE] ✅ Salvo na estrutura ANTIGA');
  }

  if (newResult.status === 'rejected') {
    const errorMsg = `Estrutura nova falhou: ${newResult.reason}`;
    errors.push(errorMsg);
    console.error('[WHATSAPP-SERVICE] ❌ Estrutura NOVA falhou:', newResult.reason);
  } else {
    console.log('[WHATSAPP-SERVICE] ✅ Salvo na estrutura NOVA');
  }

  // Se pelo menos UMA estrutura funcionou = SUCESSO
  const success = oldResult.status === 'fulfilled' || newResult.status === 'fulfilled';

  if (success) {
    console.log('[WHATSAPP-SERVICE] ✅ Verificação salva com sucesso (dual-write)');
  } else {
    console.error('[WHATSAPP-SERVICE] ❌ ERRO CRÍTICO: Ambas estruturas falharam!');
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
  console.log(`[WHATSAPP-SERVICE] 📦 Salvando ${verifications.length} verificações em lote...`);

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
    }
  }

  console.log(`[WHATSAPP-SERVICE] 📊 Lote concluído: ${successful} sucesso, ${failed} falhas`);

  return {
    totalProcessed: verifications.length,
    successful,
    failed,
    errors
  };
}
