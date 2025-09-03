"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
    MessageCircle, 
    Send, 
    X, 
    User, 
    GraduationCap, 
    Phone, 
    CheckCircle, 
    AlertCircle,
    Loader2
} from "lucide-react";
import { Student, Contato } from "../app/types";
import { formatPhoneNumber } from "@/utils/formatters";

interface WhatsAppModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student | null;
    selectedContact: Contato | null;
    onSendMessage: (phone: string, message: string, checkWhatsApp: boolean) => Promise<{
        success: boolean;
        message: string;
        data?: any;
        error?: string;
    }>;
    verifiedNumbers: Set<string>;
}

export default function WhatsAppModal({
    isOpen,
    onClose,
    student,
    selectedContact,
    onSendMessage,
    verifiedNumbers
}: WhatsAppModalProps) {
    const [message, setMessage] = useState("")
    const [isSending, setIsSending] = useState(false);
    const [sendResult, setSendResult] = useState<{
        success: boolean;
        message: string;
        error?: string;
    } | null>(null);

    // Reset modal state when opening/closing
    useEffect(() => {
        if (isOpen) {
            setMessage("");
            setSendResult(null);
            setIsSending(false);
        }
    }, [isOpen]);

    // Format phone number for API (remove formatting, keep only digits)
    const getCleanPhoneNumber = (phone: string): string => {
        return phone.replace(/\D/g, '');
    };

    // Check if contact phone number is WhatsApp eligible (starts with 9 after DDD)
    const isWhatsAppEligible = (phone: string): boolean => {
        const cleanPhone = getCleanPhoneNumber(phone);
        // Check if after removing DDD (first 2 digits), the number starts with 9
        return cleanPhone.length >= 3 && cleanPhone.substring(2, 3) === '9';
    };

    // Check if this number was already verified
    const isNumberVerified = (phone: string): boolean => {
        const cleanPhone = getCleanPhoneNumber(phone);
        return verifiedNumbers.has(cleanPhone);
    };

    const handleSendMessage = async () => {
        if (!selectedContact || !message.trim()) return;

        const cleanPhone = getCleanPhoneNumber(selectedContact.telefone);
        const isVerified = isNumberVerified(selectedContact.telefone);
        
        setIsSending(true);
        setSendResult(null);

        try {
            const result = await onSendMessage(cleanPhone, message.trim(), !isVerified);
            setSendResult(result);
            
            if (result.success) {
                // Clear message after successful send
                setMessage("");
                // Auto close after 2 seconds on success
                setTimeout(() => {
                    onClose();
                }, 2000);
            }
        } catch (error) {
            setSendResult({
                success: false,
                message: "Erro interno ao enviar mensagem",
                error: error instanceof Error ? error.message : "Erro desconhecido"
            });
        } finally {
            setIsSending(false);
        }
    };

    if (!selectedContact || !student) return null;

    const cleanPhone = getCleanPhoneNumber(selectedContact.telefone);
    const isEligible = isWhatsAppEligible(selectedContact.telefone);
    const isVerified = isNumberVerified(selectedContact.telefone);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-green-600" />
                        Enviar WhatsApp
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Student Info */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold">{student.nome}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-purple-600" />
                            <span className="text-sm text-gray-600">Turma: {student.turma}</span>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-green-600" />
                                <span className="font-medium">{selectedContact.nome}</span>
                            </div>
                            {isVerified && (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    WhatsApp Verificado
                                </Badge>
                            )}
                        </div>
                        <div className="text-sm text-gray-600">
                            {formatPhoneNumber(selectedContact.telefone)}
                        </div>
                        
                        {!isEligible && (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-sm">
                                    Este número pode não ter WhatsApp (não inicia com 9 após DDD)
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    {/* Message Input */}
                    <div className="space-y-2">
                        <label htmlFor="message" className="text-sm font-medium">
                            Mensagem
                        </label>
                        <Textarea
                            id="message"
                            placeholder="Digite sua mensagem aqui..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                            maxLength={1000}
                            disabled={isSending}
                        />
                        <div className="text-xs text-gray-500 text-right">
                            {message.length}/1000 caracteres
                        </div>
                    </div>

                    {/* Send Result */}
                    {sendResult && (
                        <Alert variant={sendResult.success ? "default" : "destructive"}>
                            {sendResult.success ? (
                                <CheckCircle className="h-4 w-4" />
                            ) : (
                                <AlertCircle className="h-4 w-4" />
                            )}
                            <AlertDescription>
                                {sendResult.message}
                                {sendResult.error && (
                                    <div className="mt-1 text-xs opacity-75">
                                        {sendResult.error}
                                    </div>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isSending}
                    >
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSendMessage}
                        disabled={!message.trim() || isSending}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {isSending ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4 mr-1" />
                        )}
                        {isSending ? "Enviando..." : "Enviar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}