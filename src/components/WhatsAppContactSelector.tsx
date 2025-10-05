"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    AlertCircle,
    Phone,
    Check
} from "lucide-react";
import { Contato } from "@/app/types";
import { formatPhoneNumber } from "@/utils/formatters";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Variantes do item de contato usando CVA (similar ao StudentInfoCard)
 */
const contactItemVariants = cva(
    "group flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 text-sm cursor-pointer",
    {
        variants: {
            variant: {
                default: "bg-gray-50 hover:bg-blue-50 border-gray-200 hover:border-blue-200",
                selected: "bg-blue-50 border-blue-400 ring-1 ring-blue-200",
            },
            size: {
                sm: "px-2 py-1.5 text-xs",
                md: "px-3 py-2 text-sm",
                lg: "px-4 py-2.5 text-base",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "md",
        },
    }
);

interface WhatsAppContactSelectorProps extends VariantProps<typeof contactItemVariants> {
    contacts: Contato[];
    selectedPhones: Set<string>;
    onSelectionChange: (phones: Set<string>) => void;
    className?: string;
    verifiedNumbers?: Set<string>;
    contactVerificationData?: Map<string, {
        verificationStatus?: string;
        hasWhatsApp?: boolean;
        whatsapp?: {
            verified?: boolean;
            exists?: boolean;
        };
    }>;
    readonly?: boolean; // Modo read-only para edição
}

export default function WhatsAppContactSelector({
    contacts,
    selectedPhones,
    onSelectionChange,
    className,
    verifiedNumbers = new Set(),
    contactVerificationData = new Map(),
    variant,
    size,
    readonly = false,
}: WhatsAppContactSelectorProps) {
    const [whatsAppContacts, setWhatsAppContacts] = useState<Contato[]>([]);

    // Filtrar contatos com WhatsApp verificado E que podem receber mensagem
    useEffect(() => {
        const filteredContacts = contacts.filter(contact => {
            const cleanPhone = contact.telefone.replace(/\D/g, '');
            const verificationData = contactVerificationData.get(cleanPhone);

            // Verificar se tem WhatsApp verificado via dados de verificação
            const hasWhatsAppData = verificationData?.whatsapp?.exists ||
                                    verificationData?.hasWhatsApp;

            // Verificar se pode receber mensagem
            const canReceiveMessages = contact.podeReceberMensagem !== false;

            return hasWhatsAppData && canReceiveMessages;
        });

        setWhatsAppContacts(filteredContacts);
    }, [contacts, contactVerificationData]);

    const handleContactToggle = (phone: string) => {
        // Não permitir alteração se estiver em modo read-only
        if (readonly) return;

        const cleanPhone = phone.replace(/\D/g, '');
        const newSelection = new Set(selectedPhones);

        if (newSelection.has(cleanPhone)) {
            newSelection.delete(cleanPhone);
        } else {
            newSelection.add(cleanPhone);
        }

        onSelectionChange(newSelection);
    };

    if (whatsAppContacts.length === 0) {
        return (
            <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-xs">
                    Nenhum contato disponível para WhatsApp. Verifique se há contatos com WhatsApp verificado.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className={cn("space-y-2", className)}>
            {/* Label com contador */}
            <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-gray-700 flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-blue-600" />
                    <span>Selecione os contatos</span>
                    {!readonly && <span className="text-red-500">*</span>}
                </Label>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-xs px-2 py-0">
                    {selectedPhones.size}/{whatsAppContacts.length}
                </Badge>
            </div>

            {/* Contatos em linha (similar ao StudentInfoCard) */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex flex-wrap gap-2">
                    {whatsAppContacts.map((contato) => {
                        const cleanPhone = contato.telefone.replace(/\D/g, '');
                        const isSelected = selectedPhones.has(cleanPhone);

                        return (
                            <div
                                key={cleanPhone}
                                onClick={() => handleContactToggle(contato.telefone)}
                                className={cn(contactItemVariants({
                                    variant: isSelected ? "selected" : "default",
                                    size
                                }), readonly && "cursor-not-allowed opacity-70")}
                            >
                                {/* Nome e número (similar ao StudentInfoCard) */}
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-medium text-gray-900 truncate">
                                        {contato.nome}
                                        {contato.parentesco && (
                                            <span className="text-xs text-gray-500 ml-1">({contato.parentesco})</span>
                                        )}:
                                    </span>
                                    <span className="text-gray-600 font-mono text-xs">
                                        {formatPhoneNumber(contato.telefone)}
                                    </span>

                                    {/* Ícone de selecionado */}
                                    {isSelected && (
                                        <Check className="w-4 h-4 text-blue-600 flex-shrink-0 ml-1" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Hint */}
            <p className="text-xs text-gray-500 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>Clique nos contatos para selecionar/desselecionar</span>
            </p>
        </div>
    );
}
