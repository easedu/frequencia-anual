import { logger } from "@/utils/logger";

// WhatsApp API Configuration
const WHATSAPP_API_URL = process.env.NEXT_PUBLIC_WHATSAPP_API_URL;
const WHATSAPP_API_TOKEN = process.env.NEXT_PUBLIC_WHATSAPP_API_TOKEN;

// Interface for API request body
interface WhatsAppSendRequest {
    phone: string;
    message: string;
    checkWhatsApp: boolean;
    metadata: {
        campaign: string;
        priority: string;
    };
    Authorization: string;
}

// Interface for API response
interface WhatsAppSendResponse {
    success: boolean;
    message: string;
    data?: {
        messageId: string;
        phone: string;
        status: string;
        hasWhatsApp: boolean;
        sentAt: number;
    };
    error?: string;
}

// Service class for WhatsApp operations
export class WhatsAppService {
    /**
     * Send WhatsApp message via API
     */
    static async sendMessage(
        phone: string,
        message: string,
        checkWhatsApp: boolean = true
    ): Promise<WhatsAppSendResponse> {
        try {
            // Validate inputs
            if (!phone || !message.trim()) {
                throw new Error("Telefone e mensagem são obrigatórios");
            }

            // Check if API URL is configured
            if (!WHATSAPP_API_URL || WHATSAPP_API_URL.includes("your-whatsapp-api-endpoint.com")) {
                throw new Error("URL da API WhatsApp não configurada. Configure NEXT_PUBLIC_WHATSAPP_API_URL no .env.local");
            }

            // Check if API token is configured
            if (!WHATSAPP_API_TOKEN) {
                throw new Error("Token da API WhatsApp não configurado. Configure NEXT_PUBLIC_WHATSAPP_API_TOKEN no .env.local");
            }

            // Prepare request body
            const requestBody: WhatsAppSendRequest = {
                phone,
                message: message.trim(),
                checkWhatsApp,
                metadata: {
                    campaign: "informativos",
                    priority: "normal"
                },
                Authorization: WHATSAPP_API_TOKEN
            };

            logger.info("Sending WhatsApp message", {
                phone: `${phone.substring(0, 4)}****${phone.substring(phone.length - 4)}`,
                messageLength: message.length,
                checkWhatsApp,
                apiUrl: WHATSAPP_API_URL.replace(/\/\/.*@/, '//*****@') // Hide credentials in logs
            });

            // Make API request with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

            try {
                const response = await fetch(WHATSAPP_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                // Handle HTTP errors
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
                }

                // Parse response
                const result: WhatsAppSendResponse = await response.json();

                // Log result (without sensitive data)
                logger.info("WhatsApp message result", {
                    success: result.success,
                    phone: `${phone.substring(0, 4)}****${phone.substring(phone.length - 4)}`,
                    hasWhatsApp: result.data?.hasWhatsApp,
                    status: result.data?.status
                });

                return result;

            } catch (fetchError) {
                clearTimeout(timeoutId);
                
                // Handle different types of fetch errors
                if (fetchError instanceof Error) {
                    if (fetchError.name === 'AbortError') {
                        throw new Error('Timeout: A API WhatsApp não respondeu em 30 segundos');
                    } else if (fetchError.message.includes('Failed to fetch')) {
                        throw new Error('Erro de rede: Não foi possível conectar à API WhatsApp. Verifique a URL e conexão de internet.');
                    } else if (fetchError.message.includes('CORS')) {
                        throw new Error('Erro CORS: A API WhatsApp não permite requisições deste domínio.');
                    }
                }
                throw fetchError;
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            
            logger.error("Error sending WhatsApp message", {
                phone: `${phone.substring(0, 4)}****${phone.substring(phone.length - 4)}`,
                messageLength: message.length
            }, error as Error);

            return {
                success: false,
                message: "Falha ao enviar mensagem",
                error: errorMessage
            };
        }
    }

    /**
     * Validate if phone number is WhatsApp eligible
     * Phone numbers without DDD that start with 9 are potentially WhatsApp numbers
     */
    static isWhatsAppEligible(phone: string): boolean {
        const cleanPhone = phone.replace(/\D/g, '');
        
        // Must have at least 11 digits (DDD + 9 digits)
        if (cleanPhone.length < 11) return false;
        
        // Third digit should be 9 (after DDD)
        return cleanPhone.substring(2, 3) === '9';
    }

    /**
     * Format phone number for API (ensure it has country code)
     */
    static formatPhoneForAPI(phone: string): string {
        const cleanPhone = phone.replace(/\D/g, '');
        
        // If doesn't start with country code, add Brazil code (55)
        if (!cleanPhone.startsWith('55')) {
            return `55${cleanPhone}`;
        }
        
        return cleanPhone;
    }

    /**
     * Clean phone number (remove all non-digits)
     */
    static cleanPhoneNumber(phone: string): string {
        return phone.replace(/\D/g, '');
    }

    /**
     * Validate phone number format
     */
    static validatePhoneNumber(phone: string): {
        isValid: boolean;
        error?: string;
        cleanPhone?: string;
    } {
        const cleanPhone = this.cleanPhoneNumber(phone);
        
        if (!cleanPhone) {
            return {
                isValid: false,
                error: "Número de telefone é obrigatório"
            };
        }
        
        if (cleanPhone.length < 10 || cleanPhone.length > 13) {
            return {
                isValid: false,
                error: "Número de telefone deve ter entre 10 e 13 dígitos"
            };
        }
        
        return {
            isValid: true,
            cleanPhone
        };
    }
}

// Export default instance
export default WhatsAppService;