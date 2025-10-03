import { db } from "@/firebase.config";
import {
    collection,
    doc,
    getDoc,
    setDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    updateDoc
} from "firebase/firestore";
import { logger } from "@/utils/logger";

// Interface for verified WhatsApp number
interface VerifiedWhatsAppNumber {
    phone: string;
    hasWhatsApp: boolean;
    verifiedAt: any; // Firestore timestamp
    lastMessageAt?: any; // Firestore timestamp
    messageCount: number;
    studentId?: string;
    contactName?: string;
    verificationStatus: 'verified' | 'unavailable' | 'error'; // Status da verificação
}

// Service class for WhatsApp number tracking
export class WhatsAppTrackingService {
    private static readonly COLLECTION_PATH = "whatsapp_verified_numbers";
    private static cache = new Map<string, VerifiedWhatsAppNumber>();
    private static cacheExpiry = new Map<string, number>();
    private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    /**
     * Check if a phone number is verified to have WhatsApp
     */
    static async isNumberVerified(phone: string): Promise<boolean> {
        try {
            const cleanPhone = this.cleanPhoneNumber(phone);
            
            // Check cache first
            if (this.isCacheValid(cleanPhone)) {
                const cached = this.cache.get(cleanPhone);
                return cached?.hasWhatsApp ?? false;
            }

            // Fetch from Firebase
            const docRef = doc(db, this.COLLECTION_PATH, cleanPhone);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data() as VerifiedWhatsAppNumber;
                
                // Update cache
                this.cache.set(cleanPhone, data);
                this.cacheExpiry.set(cleanPhone, Date.now() + this.CACHE_DURATION);
                
                return data.hasWhatsApp;
            }
            
            return false;
        } catch (error) {
            logger.error("Error checking if number is verified", { phone }, error as Error);
            return false;
        }
    }

    /**
     * Mark a phone number as verified with WhatsApp status
     * NOTE: contactName is deprecated - names should always be fetched from student data
     *
     * FASE 3: Implementa DUAL-WRITE (salva em ambas estruturas)
     */
    static async markNumberAsVerified(
        phone: string,
        hasWhatsApp: boolean,
        studentId?: string,
        contactName?: string, // Deprecated - mantido para compatibilidade mas não será salvo
        verificationStatus: 'verified' | 'unavailable' | 'error' = 'verified',
        contactId?: string // NOVO: ID do contato na nova estrutura
    ): Promise<void> {
        try {
            const cleanPhone = this.cleanPhoneNumber(phone);

            // Criar objeto base sem campos opcionais
            const verifiedNumber: any = {
                phone: cleanPhone,
                hasWhatsApp,
                verifiedAt: serverTimestamp(),
                lastMessageAt: serverTimestamp(),
                messageCount: 1,
                verificationStatus
            };

            // Só adicionar studentId se tiver valor definido
            // NÃO salvar contactName - deve ser buscado dos dados do estudante
            if (studentId !== undefined && studentId !== null && studentId !== "") {
                verifiedNumber.studentId = studentId;
            }

            // DUAL-WRITE: Salvar em AMBAS estruturas
            const errors: string[] = [];

            const [oldResult, newResult] = await Promise.allSettled([
                // 1. Estrutura ANTIGA (whatsapp_verified_numbers)
                setDoc(doc(db, this.COLLECTION_PATH, cleanPhone), verifiedNumber, { merge: true }),

                // 2. Estrutura NOVA (students/{id}/contacts/{contactId}) - SE tiver os IDs
                studentId && contactId
                    ? updateDoc(doc(db, 'students', studentId, 'contacts', contactId), {
                        'whatsapp.verified': true,
                        'whatsapp.exists': hasWhatsApp,
                        'whatsapp.number': cleanPhone,
                        'whatsapp.verifiedAt': serverTimestamp(),
                        'whatsapp.verificationStatus': verificationStatus
                    })
                    : Promise.resolve() // Skip se não tiver IDs necessários
            ]);

            // Verificar resultados
            if (oldResult.status === 'rejected') {
                errors.push(`Estrutura antiga falhou: ${oldResult.reason}`);
                logger.error("Failed to save to old structure", { phone: cleanPhone }, oldResult.reason as Error);
            } else {
                logger.info("Saved to old structure (whatsapp_verified_numbers)", { phone: `${cleanPhone.substring(0, 4)}****` });
            }

            if (newResult.status === 'rejected') {
                errors.push(`Estrutura nova falhou: ${newResult.reason}`);
                logger.error("Failed to save to new structure", { phone: cleanPhone, studentId, contactId }, newResult.reason as Error);
            } else if (studentId && contactId) {
                logger.info("Saved to new structure (students/contacts)", { phone: `${cleanPhone.substring(0, 4)}****`, studentId, contactId });
            }

            // Se pelo menos UMA estrutura funcionou = sucesso
            if (oldResult.status === 'fulfilled' || newResult.status === 'fulfilled') {
                // Update cache
                this.cache.set(cleanPhone, verifiedNumber);
                this.cacheExpiry.set(cleanPhone, Date.now() + this.CACHE_DURATION);

                logger.info("Number marked as verified (dual-write)", {
                    phone: `${cleanPhone.substring(0, 4)}****${cleanPhone.substring(cleanPhone.length - 4)}`,
                    hasWhatsApp,
                    studentId,
                    savedInOld: oldResult.status === 'fulfilled',
                    savedInNew: newResult.status === 'fulfilled'
                });
            } else {
                throw new Error(`Ambas estruturas falharam: ${errors.join('; ')}`);
            }

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
     */
    static async updateMessageCount(phone: string): Promise<void> {
        try {
            const cleanPhone = this.cleanPhoneNumber(phone);
            const docRef = doc(db, this.COLLECTION_PATH, cleanPhone);
            
            // Get current data
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const currentData = docSnap.data() as VerifiedWhatsAppNumber;
                
                // Update with incremented count
                await setDoc(docRef, {
                    ...currentData,
                    lastMessageAt: serverTimestamp(),
                    messageCount: (currentData.messageCount || 0) + 1
                }, { merge: true });
                
                // Update cache
                const updatedData = {
                    ...currentData,
                    lastMessageAt: new Date(),
                    messageCount: (currentData.messageCount || 0) + 1
                };
                this.cache.set(cleanPhone, updatedData);
                this.cacheExpiry.set(cleanPhone, Date.now() + this.CACHE_DURATION);
            }
        } catch (error) {
            logger.error("Error updating message count", { phone }, error as Error);
            // Don't throw error as this is not critical
        }
    }

    /**
     * Get all verified numbers for a student
     */
    static async getVerifiedNumbersForStudent(studentId: string): Promise<VerifiedWhatsAppNumber[]> {
        try {
            const q = query(
                collection(db, this.COLLECTION_PATH), 
                where("studentId", "==", studentId)
            );
            
            const querySnapshot = await getDocs(q);
            const numbers: VerifiedWhatsAppNumber[] = [];
            
            querySnapshot.forEach((doc) => {
                numbers.push(doc.data() as VerifiedWhatsAppNumber);
            });
            
            return numbers;
        } catch (error) {
            logger.error("Error getting verified numbers for student", { studentId }, error as Error);
            return [];
        }
    }

    /**
     * Get all verified numbers (with WhatsApp) for cache preloading
     */
    static async getAllVerifiedNumbers(): Promise<Set<string>> {
        try {
            const querySnapshot = await getDocs(collection(db, this.COLLECTION_PATH));
            const verifiedNumbers = new Set<string>();
            
            querySnapshot.forEach((doc) => {
                const data = doc.data() as VerifiedWhatsAppNumber;
                if (data.hasWhatsApp) {
                    verifiedNumbers.add(data.phone);
                    
                    // Update cache
                    this.cache.set(data.phone, data);
                    this.cacheExpiry.set(data.phone, Date.now() + this.CACHE_DURATION);
                }
            });
            
            logger.info("Loaded verified WhatsApp numbers", { count: verifiedNumbers.size });
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