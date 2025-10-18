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
import { Contato } from "@/types";
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
    singleSelection?: boolean; // Permitir apenas 1 seleção (para Contato digital)
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
    singleSelection = false,
}: WhatsAppContactSelectorProps) {
    const [whatsAppContacts, setWhatsAppContacts] = useState<Contato[]>([]);

    // Filtrar contatos com WhatsApp verificado (independente de podeReceberMensagem)
    useEffect(() => {
        const filteredContacts = contacts.filter(contact => {
            const cleanPhone = contact.telefone.replace(/\D/g, '');
            const verificationData = contactVerificationData.get(cleanPhone);

            // Verificar se tem WhatsApp verificado via dados de verificação
            const hasWhatsAppData = verificationData?.whatsapp?.exists ||
                                    verificationData?.hasWhatsApp;

            // ✅ MOSTRAR todos os contatos com WhatsApp, independente de podeReceberMensagem
            // O campo podeReceberMensagem será usado apenas para desabilitar a seleção
            return hasWhatsAppData;
        });

        setWhatsAppContacts(filteredContacts);
    }, [contacts, contactVerificationData]);

    const handleContactToggle = (phone: string, contact: Contato) => {
        // Não permitir alteração se estiver em modo read-only
        if (readonly) return;

        // ✅ Bloquear se contato não pode receber mensagem
        if (contact.podeReceberMensagem === false) return;

        const cleanPhone = phone.replace(/\D/g, '');

        if (singleSelection) {
            // Modo seleção única: desmarcar se já está selecionado, senão marcar apenas este
            if (selectedPhones.has(cleanPhone)) {
                // Desmarcar: criar novo Set vazio
                onSelectionChange(new Set());
            } else {
                // Marcar apenas este: criar novo Set com apenas este telefone
                onSelectionChange(new Set([cleanPhone]));
            }
        } else {
            // Modo seleção múltipla (comportamento original)
            const newSelection = new Set(selectedPhones);
            if (newSelection.has(cleanPhone)) {
                newSelection.delete(cleanPhone);
            } else {
                newSelection.add(cleanPhone);
            }
            onSelectionChange(newSelection);
        }
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
                    <span>Selecione {singleSelection ? 'o contato' : 'os contatos'}</span>
                    {!readonly && <span className="text-red-500">*</span>}
                </Label>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-xs px-2 py-0">
                    {selectedPhones.size}/{singleSelection ? '1' : whatsAppContacts.length}
                </Badge>
            </div>

            {/* Contatos em linha (similar ao StudentInfoCard) */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex flex-wrap gap-2">
                    {whatsAppContacts.map((contato) => {
                        const cleanPhone = contato.telefone.replace(/\D/g, '');
                        const isSelected = selectedPhones.has(cleanPhone);
                        const cannotReceiveMessage = contato.podeReceberMensagem === false;

                        return (
                            <div
                                key={cleanPhone}
                                onClick={() => handleContactToggle(contato.telefone, contato)}
                                className={cn(
                                    contactItemVariants({
                                        variant: isSelected ? "selected" : "default",
                                        size
                                    }),
                                    readonly && "cursor-not-allowed opacity-70",
                                    cannotReceiveMessage && "cursor-not-allowed opacity-50 bg-gray-100"
                                )}
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
                <span>
                    {singleSelection
                        ? 'Clique no contato para selecionar (apenas 1)'
                        : 'Clique nos contatos para selecionar/desselecionar'}
                </span>
            </p>
        </div>
    );
}
