import { useEffect, useRef, memo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, X, Calendar, MessageSquare, AlertTriangle, Edit3, Send, Loader2, CheckCircle2 } from "lucide-react";
import { FamilyInteraction, Contato } from "@/types";
import { formatDateInput } from "@/app/utils";
import WhatsAppContactSelector from "@/components/whatsapp/WhatsAppContactSelector";

interface RegisterInteractionCardProps {
    interactionType: string;
    interactionDate: string;
    interactionDescription: string;
    interactionSensitive: boolean;
    editingInteraction: FamilyInteraction | null;
    userRole: string | null;
    setInteractionType: (value: string) => void;
    setInteractionDate: (value: string) => void;
    setInteractionDescription: (value: string) => void;
    setInteractionSensitive: (value: boolean) => void;
    setEditingInteraction: (value: FamilyInteraction | null) => void;
    onAddInteraction: () => Promise<void>;
    onEditInteraction: () => Promise<void>;
    id?: string;
    readonlyType?: boolean;
    allowedTypes?: string[];
    // WhatsApp integration props
    contacts?: Contato[];
    selectedWhatsAppPhones?: Set<string>;
    onWhatsAppPhonesChange?: (phones: Set<string>) => void;
    whatsAppMessage?: string;
    onWhatsAppMessageChange?: (message: string) => void;
    verifiedWhatsAppNumbers?: Set<string>;
    contactVerificationData?: Map<string, {
        verificationStatus?: string;
        hasWhatsApp?: boolean;
        whatsapp?: {
            verified?: boolean;
            exists?: boolean;
        };
    }>;
    // Loading/Success states
    isSendingWhatsApp?: boolean;
    whatsAppSendSuccess?: boolean;
}

/**
 * RegisterInteractionCard - Componente para criar/editar interações familiares
 *
 * Features:
 * - Suporta múltiplos tipos de interação
 * - Integração WhatsApp para tipo "Contato digital"
 * - Layout responsivo otimizado (mensagem e descrição lado a lado)
 * - Seleção de contatos via chips inline
 * - Validação completa de campos obrigatórios
 * - CVA para variantes de estado
 */

const RegisterInteractionCard = memo(function RegisterInteractionCard({
    interactionType,
    interactionDate,
    interactionDescription,
    interactionSensitive,
    editingInteraction,
    userRole,
    setInteractionType,
    setInteractionDate,
    setInteractionDescription,
    setInteractionSensitive,
    setEditingInteraction,
    onAddInteraction,
    onEditInteraction,
    id,
    readonlyType = false,
    allowedTypes,
    contacts = [],
    selectedWhatsAppPhones = new Set(),
    onWhatsAppPhonesChange = () => {},
    whatsAppMessage = "",
    onWhatsAppMessageChange = () => {},
    verifiedWhatsAppNumbers = new Set(),
    contactVerificationData = new Map(),
    isSendingWhatsApp = false,
    whatsAppSendSuccess = false,
}: RegisterInteractionCardProps) {
    const whatsappTextareaRef = useRef<HTMLTextAreaElement>(null);
    const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize do textarea WhatsApp baseado no conteúdo
    useEffect(() => {
        const textarea = whatsappTextareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [whatsAppMessage]);

    // Sincronizar altura do campo Descrição com Mensagem WhatsApp (quando Contato digital)
    useEffect(() => {
        if (interactionType === "Contato digital") {
            const whatsappTextarea = whatsappTextareaRef.current;
            const descriptionTextarea = descriptionTextareaRef.current;

            if (whatsappTextarea && descriptionTextarea) {
                const whatsappHeight = whatsappTextarea.scrollHeight;
                descriptionTextarea.style.height = `${whatsappHeight}px`;
            }
        }
    }, [whatsAppMessage, interactionType]);

    useEffect(() => {
        if (editingInteraction) {
            setInteractionType(editingInteraction.type);

            // Formatar data de YYYY-MM-DD para DD/MM/YYYY
            const formattedDate = editingInteraction.date.includes('-')
                ? editingInteraction.date.split('-').reverse().join('/')
                : editingInteraction.date;
            setInteractionDate(formattedDate);

            setInteractionSensitive(editingInteraction.sensitive || false);

            // Para "Contato digital", usar campos whatsappMessage e whatsappPhones do banco
            if (editingInteraction.type === "Contato digital") {
                // Se tem whatsappMessage salvo no banco, usar ele (NOVO)
                if (editingInteraction.whatsappMessage) {
                    console.log('✅ Usando whatsappMessage do banco:', editingInteraction.whatsappMessage);
                    onWhatsAppMessageChange(editingInteraction.whatsappMessage);
                    setInteractionDescription(editingInteraction.description);

                    // Carregar telefones salvos
                    if (editingInteraction.whatsappPhones && editingInteraction.whatsappPhones.length > 0) {
                        onWhatsAppPhonesChange(new Set(editingInteraction.whatsappPhones));
                    }
                } else {
                    // FALLBACK: Tentar extrair da descrição (dados antigos)
                    const match = editingInteraction.description.match(/Mensagem enviada via WhatsApp para: .+ - (\d+)\n\n([\s\S]*)/);

                    console.log('⚠️ whatsappMessage não encontrado, tentando extrair da descrição');

                    if (match) {
                        const phoneNumber = match[1];
                        const extractedMessage = match[2];

                        onWhatsAppPhonesChange(new Set([phoneNumber]));
                        onWhatsAppMessageChange(extractedMessage);
                        setInteractionDescription(extractedMessage);
                    } else {
                        // Último recurso: usar descrição completa
                        console.warn('⚠️ Não foi possível extrair mensagem, usando descrição completa');
                        setInteractionDescription(editingInteraction.description);
                        onWhatsAppMessageChange(editingInteraction.description);
                    }
                }
            } else {
                setInteractionDescription(editingInteraction.description);
            }
        }
        // Não limpar campos se editingInteraction for null/undefined
        // Isso permite que o componente seja usado em modais sem resetar
    }, [editingInteraction, setInteractionType, setInteractionDate, setInteractionDescription, setInteractionSensitive, onWhatsAppPhonesChange, onWhatsAppMessageChange]);

    const handleSensitiveChange = (checked: boolean | string) => {
        const isChecked = typeof checked === "boolean" ? checked : checked === "true";
        setInteractionSensitive(isChecked);
    };

    const handleCancel = () => {
        setEditingInteraction(null);
        setInteractionType("");
        setInteractionDate(new Date().toLocaleDateString("pt-BR"));
        setInteractionDescription("");
        setInteractionSensitive(false);
        // Limpar campos WhatsApp
        onWhatsAppPhonesChange(new Set());
        onWhatsAppMessageChange("");
    };

    // Usar tipos permitidos se fornecidos, senão usar lista completa
    const interactionTypes = allowedTypes || [
        'Contato telefônico',
        'Contato digital',
        'Conversa com a família',
        'Visita domiciliar da ABAE',
        'Compensação de ausência',
        'Carta registrada',
        'Conselho tutelar',
        'Desligamento',
        'Justificativa da família',
        'Necessário acompanhamento da família',
        'Observações'
    ];

    return (
        <Card id={id} className="shadow-lg border-0 relative">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg py-2.5 px-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center space-x-2">
                        {editingInteraction ? (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Editar Interação</span>
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4" />
                                <span>Nova Interação</span>
                            </>
                        )}
                    </CardTitle>

                    {editingInteraction && (
                        <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs px-2 py-0.5">
                            <Edit3 className="w-3 h-3 mr-1" />
                            Editando
                        </Badge>
                    )}
                </div>
            </CardHeader>

            {/* 🔄 Loading/Success Overlay */}
            {(isSendingWhatsApp || whatsAppSendSuccess) && (
                <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 z-50 flex items-center justify-center rounded-lg backdrop-blur-sm">
                    <div className="flex flex-col items-center space-y-4">
                        {isSendingWhatsApp && !whatsAppSendSuccess && (
                            <>
                                <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                                <div className="text-center">
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Enviando mensagem...
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Aguarde enquanto processamos o envio
                                    </p>
                                </div>
                            </>
                        )}
                        {whatsAppSendSuccess && (
                            <>
                                <div className="relative">
                                    <CheckCircle2 className="w-20 h-20 text-green-500 animate-in zoom-in-50 duration-300" />
                                    <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                        Mensagem Enviada!
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Interação registrada com sucesso
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <CardContent className="p-3">
                <div className="space-y-2.5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="interaction-type" className="text-xs font-medium text-gray-700 flex items-center space-x-1">
                                <MessageSquare className="w-3 h-3 text-blue-600" />
                                <span>Tipo de Interação</span>
                            </Label>
                            {readonlyType || (editingInteraction && interactionType === "Contato digital") ? (
                                <div className="h-8 px-2.5 py-1.5 border border-gray-300 rounded-md bg-gray-50 flex items-center text-sm">
                                    <span className="text-gray-700">{interactionType}</span>
                                </div>
                            ) : (
                                <Select value={interactionType} onValueChange={setInteractionType}>
                                    <SelectTrigger id="interaction-type" className="h-8 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors text-sm">
                                        <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {interactionTypes.map((type) => (
                                            <SelectItem key={type} value={type} className="text-sm">
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="interaction-date" className="text-xs font-medium text-gray-700 flex items-center space-x-1">
                                <Calendar className="w-3 h-3 text-blue-600" />
                                <span>Data</span>
                            </Label>
                            <Input
                                id="interaction-date"
                                value={interactionDate}
                                onChange={(e) => setInteractionDate(formatDateInput(e.target.value))}
                                placeholder="dd/mm/aaaa"
                                maxLength={10}
                                disabled={!!(editingInteraction && interactionType === "Contato digital")}
                                className={`h-8 transition-colors text-sm ${
                                    editingInteraction && interactionType === "Contato digital"
                                        ? "bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed"
                                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                }`}
                            />
                        </div>
                    </div>

                    {/* WhatsApp Contact Selector - Exibir apenas quando "Contato digital" for selecionado */}
                    {interactionType === "Contato digital" && contacts.length > 0 && (
                        <WhatsAppContactSelector
                            contacts={contacts}
                            selectedPhones={selectedWhatsAppPhones}
                            onSelectionChange={onWhatsAppPhonesChange}
                            verifiedNumbers={verifiedWhatsAppNumbers}
                            contactVerificationData={contactVerificationData}
                            readonly={!!editingInteraction}
                            singleSelection={true}
                        />
                    )}

                    {/* Grid: Mensagem WhatsApp e Descrição lado a lado (quando Contato digital) */}
                    {interactionType === "Contato digital" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Mensagem WhatsApp */}
                            <div className="space-y-1">
                                <Label htmlFor="whatsapp-message" className="text-xs font-medium text-gray-700 flex items-center space-x-1">
                                    <Send className="w-3 h-3 text-blue-600" />
                                    <span>Mensagem WhatsApp</span>
                                    {!editingInteraction && <span className="text-red-500">*</span>}
                                </Label>
                                <Textarea
                                    ref={whatsappTextareaRef}
                                    id="whatsapp-message"
                                    value={whatsAppMessage}
                                    onChange={(e) => onWhatsAppMessageChange(e.target.value)}
                                    placeholder={editingInteraction ? "Mensagem já enviada" : "Digite a mensagem que será enviada..."}
                                    disabled={!!editingInteraction}
                                    className={`min-h-[180px] text-sm overflow-hidden ${
                                        editingInteraction
                                            ? "resize-none bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed"
                                            : "resize-none border-blue-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                                    }`}
                                />
                            </div>

                            {/* Descrição da Interação */}
                            <div className="space-y-1">
                                <Label htmlFor="interaction-description" className="text-xs font-medium text-gray-700 flex items-center space-x-1">
                                    <MessageSquare className="w-3 h-3 text-blue-600" />
                                    <span>Descrição da Interação</span>
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    ref={descriptionTextareaRef}
                                    id="interaction-description"
                                    value={interactionDescription}
                                    onChange={(e) => setInteractionDescription(e.target.value)}
                                    placeholder="Descrição da interação (ex: 'Mensagens enviadas para Rafaela')..."
                                    disabled={editingInteraction?.createdBy === "AUTOMAÇÃO"}
                                    className={`min-h-[180px] text-sm overflow-hidden ${
                                        editingInteraction?.createdBy === "AUTOMAÇÃO"
                                            ? "resize-none bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed"
                                            : "resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                    }`}
                                />
                            </div>
                        </div>
                    ) : (
                        /* Descrição normal quando não for Contato digital */
                        <div className="space-y-1">
                            <Label htmlFor="interaction-description" className="text-xs font-medium text-gray-700 flex items-center space-x-1">
                                <MessageSquare className="w-3 h-3 text-blue-600" />
                                <span>Descrição da Interação</span>
                            </Label>
                            <Textarea
                                id="interaction-description"
                                value={interactionDescription}
                                onChange={(e) => setInteractionDescription(e.target.value)}
                                placeholder="Descreva a interação com a família..."
                                rows={2}
                                className="resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors text-sm"
                            />
                        </div>
                    )}

                    {userRole === "admin" && (
                        <div className="flex items-center space-x-2 p-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-md border border-amber-200">
                            <Checkbox
                                id="interaction-sensitive"
                                checked={interactionSensitive}
                                onCheckedChange={handleSensitiveChange}
                                className="h-4 w-4 border-amber-300 text-amber-600 focus:ring-amber-500"
                            />
                            <Label htmlFor="interaction-sensitive" className="text-xs flex items-center space-x-1.5 cursor-pointer font-medium text-amber-800">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Marcar como sensível</span>
                            </Label>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-200">
                        <Button
                            onClick={editingInteraction ? onEditInteraction : onAddInteraction}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 flex items-center justify-center space-x-1.5 h-8 text-sm"
                        >
                            {editingInteraction ? (
                                <>
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Salvar Alterações</span>
                                </>
                            ) : interactionType === "Contato digital" ? (
                                <>
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Enviar e Salvar</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Adicionar Interação</span>
                                </>
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleCancel}
                            className="flex-1 sm:flex-initial border-gray-300 hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-1.5 h-8 text-sm"
                        >
                            <X className="w-3.5 h-3.5" />
                            <span>{editingInteraction ? "Cancelar" : "Limpar"}</span>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

export default RegisterInteractionCard;