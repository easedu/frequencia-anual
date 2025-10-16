/**
 * WhatsApp Tracking Service - SUPABASE VERSION
 *
 * Wrapper service que mantém a mesma interface externa mas usa Supabase internamente.
 * Isso evita refatorar 4+ arquivos que usam este serviço.
 */

import { logger } from "@/utils/logger";
import {
  saveWhatsAppVerification,
  getVerifiedNumber,
  getStudentContactsWithWhatsApp
} from "./whatsappDataService";

// Interface for verified WhatsApp number (mantida para compatibilidade)
interface VerifiedWhatsAppNumber {
    phone: string;
    hasWhatsApp: boolean;
    verifiedAt: any;
    lastMessageAt?: any;
    messageCount: number;
    studentId?: string;
    contactName?: string;
    verificationStatus: 'verified' | 'unavailable' | 'error';
}

// Service class for WhatsApp number tracking
export class WhatsAppTrackingService {
    private static cache = new Map<string, VerifiedWhatsAppNumber>();
    private static cacheExpiry = new Map<string, number>();
    private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    /**
     * Check if a phone number is verified to have WhatsApp
     * MIGRADO: Usa Supabase via whatsappDataService
     */
    static async isNumberVerified(phone: string): Promise<boolean> {
        try {
            const cleanPhone = this.cleanPhoneNumber(phone);

            // Check cache first
            if (this.isCacheValid(cleanPhone)) {
                const cached = this.cache.get(cleanPhone);
                return cached?.hasWhatsApp ?? false;
            }

            // Fetch from Supabase via whatsappDataService
            const data = await getVerifiedNumber(cleanPhone);

            if (data && data.isVerified) {
                // Convert to legacy format and update cache
                const legacyData: VerifiedWhatsAppNumber = {
                    phone: cleanPhone,
                    hasWhatsApp: data.exists,
                    verifiedAt: data.verifiedAt ? new Date(data.verifiedAt) : new Date(),
                    messageCount: 0,
                    verificationStatus: data.exists ? 'verified' : 'unavailable'
                };

                this.cache.set(cleanPhone, legacyData);
                this.cacheExpiry.set(cleanPhone, Date.now() + this.CACHE_DURATION);

                return data.exists;
            }

            return false;
        } catch (error) {
            logger.error("Error checking if number is verified", { phone }, error as Error);
            return false;
        }
    }

    /**
     * Mark a phone number as verified with WhatsApp status
     * MIGRADO: Usa Supabase via whatsappDataService
     */
    static async markNumberAsVerified(
        phone: string,
        hasWhatsApp: boolean,
        studentId?: string,
        contactName?: string, // Ignorado - mantido para compatibilidade
        verificationStatus: 'verified' | 'unavailable' | 'error' = 'verified',
        contactId?: string
    ): Promise<void> {
        try {
            const cleanPhone = this.cleanPhoneNumber(phone);

            // Se temos studentId e contactId, salvar via whatsappDataService
            if (studentId && contactId) {
                await saveWhatsAppVerification(
                    studentId,
                    contactId,
                    cleanPhone,
                    {
                        exists: hasWhatsApp,
                        jid: null,
                        name: null
                    }
                );

                logger.info("Number marked as verified (Supabase)", {
                    phone: `${cleanPhone.substring(0, 4)}****`,
                    hasWhatsApp,
                    studentId,
                    contactId
                });
            } else {
                // Fallback: salvar apenas em whatsapp_verified_numbers (sem associação)
                // Isso é para casos onde não temos o studentId/contactId
                logger.warn("Salvando verificação sem studentId/contactId - dados limitados", {
                    phone: `${cleanPhone.substring(0, 4)}****`,
                    hasWhatsApp
                });

                // Usar saveToVerifiedNumbers do whatsappDataService para evitar duplicação
                try {
                    const { saveWhatsAppVerification } = await import('./whatsappDataService');

                    // Criar um contactId temporário se não tiver
                    const tempContactId = 'temp-' + Date.now();
                    const tempStudentId = studentId || 'unknown';

                    await saveWhatsAppVerification(
                        tempStudentId,
                        tempContactId,
                        cleanPhone,
                        {
                            exists: hasWhatsApp,
                            jid: null,
                            name: contactName || null
                        }
                    );
                } catch (error) {
                    logger.error("Erro ao salvar verificação no Supabase", { phone: `${cleanPhone.substring(0, 4)}****`, error });
                }
            }

            // Update cache
            const verifiedNumber: VerifiedWhatsAppNumber = {
                phone: cleanPhone,
                hasWhatsApp,
                verifiedAt: new Date(),
                lastMessageAt: new Date(),
                messageCount: 1,
                verificationStatus,
                studentId,
                contactName
            };

            this.cache.set(cleanPhone, verifiedNumber);
            this.cacheExpiry.set(cleanPhone, Date.now() + this.CACHE_DURATION);

        } catch (error) {
            logger.error("Error marking number as verified", {
                phone,
                hasWhatsApp,
                studentId
            }, error as Error);
            throw error;
        }
    }

    /**
     * Update message count for a verified number
     * NOTA: Esta funcionalidade não existe no Supabase schema atual.
     * Mantida apenas para compatibilidade (não faz nada).
     */
    static async updateMessageCount(phone: string): Promise<void> {
        try {
            const cleanPhone = this.cleanPhoneNumber(phone);

            // Atualizar apenas o cache (Supabase não tem messageCount)
            const cached = this.cache.get(cleanPhone);
            if (cached) {
                cached.lastMessageAt = new Date();
                cached.messageCount = (cached.messageCount || 0) + 1;
                this.cache.set(cleanPhone, cached);
            }

            logger.debug("Message count updated (cache only)", { phone: `${cleanPhone.substring(0, 4)}****` });
        } catch (error) {
            logger.error("Error updating message count", { phone }, error as Error);
            // Don't throw error as this is not critical
        }
    }

    /**
     * Get all verified numbers for a student
     * MIGRADO: Usa Supabase via whatsappDataService
     */
    static async getVerifiedNumbersForStudent(studentId: string): Promise<VerifiedWhatsAppNumber[]> {
        try {
            const contacts = await getStudentContactsWithWhatsApp(studentId);

            return contacts.map(contact => ({
                phone: contact.telefoneNumerico || contact.telefone || '',
                hasWhatsApp: contact.whatsapp?.verified || false,
                verifiedAt: contact.whatsapp?.verifiedAt ? new Date(contact.whatsapp.verifiedAt) : new Date(),
                messageCount: 0,
                studentId,
                contactName: contact.nome,
                verificationStatus: contact.whatsapp?.verified ? 'verified' : 'unavailable'
            }));

        } catch (error) {
            logger.error("Error getting verified numbers for student", { studentId }, error as Error);
            return [];
        }
    }

    /**
     * Get all verified numbers (with WhatsApp) for cache preloading
     * MIGRADO: Usa Supabase com paginação completa
     *
     * ⚠️ FIX: Supabase tem limite padrão de 1000 registros.
     * Esta implementação usa paginação para buscar TODOS os registros.
     */
    static async getAllVerifiedNumbers(): Promise<Set<string>> {
        try {
            const { supabase } = await import('@/lib/supabaseClient');
            const verifiedNumbers = new Set<string>();

            const PAGE_SIZE = 1000;
            let from = 0;
            let hasMore = true;
            let totalPages = 0;

            while (hasMore) {
                const { data, error } = await supabase
                    .from('whatsapp_verified_numbers')
                    .select('phone_number, is_verified')
                    .eq('is_verified', true)
                    .range(from, from + PAGE_SIZE - 1)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (!data || data.length === 0) {
                    hasMore = false;
                    break;
                }

                totalPages++;

                // Adicionar registros ao Set e cache
                data.forEach((record: any) => {
                    if (record.phone_number) {
                        verifiedNumbers.add(record.phone_number);

                        // Update cache
                        this.cache.set(record.phone_number, {
                            phone: record.phone_number,
                            hasWhatsApp: true,
                            verifiedAt: new Date(),
                            messageCount: 0,
                            verificationStatus: 'verified'
                        });
                        this.cacheExpiry.set(record.phone_number, Date.now() + this.CACHE_DURATION);
                    }
                });

                // Se retornou menos que PAGE_SIZE, não há mais registros
                if (data.length < PAGE_SIZE) {
                    hasMore = false;
                } else {
                    from += PAGE_SIZE;
                }
            }

            return verifiedNumbers;

        } catch (error) {
            logger.error("Error loading verified numbers", {}, error as Error);
            return new Set<string>();
        }
    }

    /**
     * Clear cache for a specific number or all numbers
     */
    static clearCache(phone?: string): void {
        if (phone) {
            const cleanPhone = this.cleanPhoneNumber(phone);
            this.cache.delete(cleanPhone);
            this.cacheExpiry.delete(cleanPhone);
        } else {
            this.cache.clear();
            this.cacheExpiry.clear();
        }
    }

    /**
     * Get cache statistics
     */
    static getCacheStats() {
        return {
            size: this.cache.size,
            expiryCount: this.cacheExpiry.size,
            entries: Array.from(this.cache.keys()).map(key => ({
                phone: `${key.substring(0, 4)}****${key.substring(key.length - 4)}`,
                hasWhatsApp: this.cache.get(key)?.hasWhatsApp,
                valid: this.isCacheValid(key)
            }))
        };
    }

    /**
     * Private helper methods
     */
    private static cleanPhoneNumber(phone: string): string {
        return phone.replace(/\D/g, '');
    }

    private static isCacheValid(phone: string): boolean {
        const expiry = this.cacheExpiry.get(phone);
        return expiry ? Date.now() < expiry : false;
    }
}

// Export default instance
export default WhatsAppTrackingService;
