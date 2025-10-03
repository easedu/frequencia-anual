import { logger } from "@/utils/logger";
import { WhatsAppTrackingService } from "./whatsappTrackingService";

// Interface para o request da API
interface WhatsAppCheckRequest {
    phone: string;
}

// Interface para o response da API (a API retorna um array)
interface WhatsAppCheckResponse extends Array<{
    success: boolean;
    data: Array<{
        exists: boolean;
        jid: string;
        name: string;
        number: string;
    }>;
}> {}

// Configuração da API
const API_BASE_URL = process.env.BASE_URL_API_HABIB_KYRILLOS!;
const API_ENDPOINT = process.env.ENDPOINT_API_HABIB_KYRILLOS_WHATSAPP_NUMBER_VERIFICATION!;
const API_USERNAME = process.env.API_HABIB_KYRILLOS_USERNAME!;
const API_PASSWORD = process.env.API_HABIB_KYRILLOS_PASSWORD!;

export class WhatsAppVerificationService {
    /**
     * Verifica se um número tem WhatsApp usando a API externa
     */
    static async checkWhatsAppNumber(phone: string): Promise<{
        hasWhatsApp: boolean;
        success: boolean;
        error?: string;
        whatsappName?: string;
        jid?: string;
        isApiUnavailable?: boolean;
    }> {
        try {
            // Limpar e formatar número
            const cleanPhone = this.cleanPhoneNumber(phone);

            // Preparar dados para a requisição
            const requestBody: WhatsAppCheckRequest = {
                phone: cleanPhone
            };

            // Preparar headers com Basic Auth
            const credentials = btoa(`${API_USERNAME}:${API_PASSWORD}`);

            // Construir URL completa
            const API_URL = `${API_BASE_URL}${API_ENDPOINT}`;

            logger.info("Checking WhatsApp number via API", {
                phone: `${cleanPhone.substring(0, 4)}****${cleanPhone.substring(cleanPhone.length - 4)}`,
                apiUrl: API_URL
            });

            // Fazer requisição para a API
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${credentials}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Sistema indisponível. Tente novamente mais tarde. (Status: ${response.status})`);
            }

            const result: WhatsAppCheckResponse = await response.json();

            // Verificar se a API retornou um array e o primeiro elemento tem success
            if (!Array.isArray(result) || result.length === 0) {
                throw new Error('API returned invalid response format');
            }

            const firstResult = result[0];
            if (!firstResult.success) {
                throw new Error('API returned success: false');
            }

            // Extrair dados do primeiro resultado
            const data = firstResult.data?.[0];
            if (!data) {
                throw new Error('No data returned from API');
            }

            const hasWhatsApp = data.exists;
            const whatsappName = data.name;
            const jid = data.jid;

            logger.info("WhatsApp check completed", {
                phone: `${cleanPhone.substring(0, 4)}****${cleanPhone.substring(cleanPhone.length - 4)}`,
                hasWhatsApp,
                whatsappName: whatsappName ? `${whatsappName.substring(0, 3)}***` : undefined
            });

            return {
                hasWhatsApp,
                success: true,
                whatsappName,
                jid
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            logger.error("Error checking WhatsApp number", {
                phone: `${phone.substring(0, 4)}****${phone.substring(phone.length - 4)}`,
                error: errorMessage
            });

            // Detectar se é erro de conectividade/API indisponível
            const isApiUnavailable = errorMessage.includes('fetch') ||
                                    errorMessage.includes('ECONNREFUSED') ||
                                    errorMessage.includes('ENOTFOUND') ||
                                    errorMessage.includes('network') ||
                                    errorMessage.includes('timeout');

            return {
                hasWhatsApp: false,
                success: false,
                error: errorMessage,
                isApiUnavailable
            };
        }
    }

    /**
     * Verifica e salva automaticamente o status do WhatsApp para um número
     * FASE 3: Suporta dual-write passando contactId
     */
    static async checkAndSaveWhatsAppStatus(
        phone: string,
        studentId?: string,
        contactName?: string,
        contactId?: string // NOVO: Para dual-write na nova estrutura
    ): Promise<{
        success: boolean;
        hasWhatsApp: boolean;
        error?: string;
        whatsappName?: string;
        verificationStatus?: string;
    }> {
        try {
            // Verificar na API
            const checkResult = await this.checkWhatsAppNumber(phone);

            if (!checkResult.success) {
                // Determinar o status baseado no tipo de erro
                const verificationStatus = (checkResult as any).isApiUnavailable ? 'unavailable' : 'error';

                // Salvar como verificação indisponível ou erro (DUAL-WRITE)
                await WhatsAppTrackingService.markNumberAsVerified(
                    phone,
                    false, // hasWhatsApp = false quando há erro
                    studentId || undefined,
                    contactName || undefined,
                    verificationStatus,
                    contactId || undefined // FASE 3: Para dual-write
                );

                return {
                    success: false,
                    hasWhatsApp: false,
                    error: checkResult.error,
                    verificationStatus
                };
            }

            // Salvar no Firebase usando o serviço existente (DUAL-WRITE)
            // Só passar studentId e contactName se não forem undefined
            await WhatsAppTrackingService.markNumberAsVerified(
                phone,
                checkResult.hasWhatsApp,
                studentId || undefined,
                contactName || checkResult.whatsappName || undefined,
                'verified',
                contactId || undefined // FASE 3: Para dual-write
            );

            logger.info("WhatsApp status saved to database", {
                phone: `${phone.substring(0, 4)}****${phone.substring(phone.length - 4)}`,
                hasWhatsApp: checkResult.hasWhatsApp,
                studentId
            });

            return {
                success: true,
                hasWhatsApp: checkResult.hasWhatsApp,
                whatsappName: checkResult.whatsappName
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            logger.error("Error checking and saving WhatsApp status", {
                phone: `${phone.substring(0, 4)}****${phone.substring(phone.length - 4)}`,
                studentId,
                error: errorMessage
            });

            return {
                success: false,
                hasWhatsApp: false,
                error: errorMessage
            };
        }
    }

    /**
     * Limpar número de telefone (manter apenas dígitos)
     */
    private static cleanPhoneNumber(phone: string): string {
        return phone.replace(/\D/g, '');
    }

    /**
     * Verificar se um número é elegível para WhatsApp (tem 11 dígitos e terceiro dígito é 9)
     */
    static isWhatsAppEligible(phone: string): boolean {
        const cleanPhone = this.cleanPhoneNumber(phone);

        // Deve ter pelo menos 11 dígitos (DDD + 9 dígitos)
        if (cleanPhone.length < 11) return false;

        // Terceiro dígito deve ser 9 (após DDD)
        return cleanPhone.substring(2, 3) === '9';
    }

    /**
     * Verificar múltiplos números em lote (com delay para evitar rate limiting)
     */
    static async checkMultipleNumbers(
        numbers: Array<{ phone: string; studentId?: string; contactName?: string }>
    ): Promise<Array<{
        phone: string;
        success: boolean;
        hasWhatsApp: boolean;
        error?: string;
        whatsappName?: string;
    }>> {
        const results = [];
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        for (const numberData of numbers) {
            const result = await this.checkAndSaveWhatsAppStatus(
                numberData.phone,
                numberData.studentId,
                numberData.contactName
            );

            results.push({
                phone: numberData.phone,
                ...result
            });

            // Delay de 1 segundo entre requisições para evitar rate limiting
            if (numbers.indexOf(numberData) < numbers.length - 1) {
                await delay(1000);
            }
        }

        return results;
    }
}

export default WhatsAppVerificationService;