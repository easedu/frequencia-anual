import { memo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil, Trash, FileText, AlertTriangle, History, User, Calendar, MessageSquare, CheckCheck, Check, Clock, XCircle, Play } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FamilyInteraction, Student, StudentRecord } from "@/types";

/**
 * Formatar data ISO (YYYY-MM-DD) para formato brasileiro (DD/MM/YYYY)
 */
function formatDateBR(dateString: string): string {
    if (!dateString) return dateString;

    // Se já está no formato DD/MM/YYYY, retornar como está
    if (dateString.includes('/')) return dateString;

    // Converter de YYYY-MM-DD para DD/MM/YYYY
    if (dateString.includes('-')) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }

    return dateString;
}

/**
 * Formatar timestamp ISO para formato brasileiro com hora
 */
function formatTimestamp(timestamp?: string): string {
    if (!timestamp) return '';

    try {
        const date = new Date(timestamp);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${day}/${month}/${year} às ${hours}:${minutes}`;
    } catch {
        return '';
    }
}

/**
 * Renderizar badge de status WhatsApp com ícone e cores apropriadas
 */
function getWhatsAppStatusBadge(interaction: FamilyInteraction) {
    const status = interaction.whatsappStatus;
    if (!status) return null;

    const statusConfig = {
        'DELIVERED': {
            icon: <CheckCheck className="h-3 w-3" />,
            label: 'Entregue',
            className: 'bg-blue-100 text-blue-700 border-blue-200',
            tooltip: interaction.whatsappDeliveredAt
                ? `Entregue em ${formatTimestamp(interaction.whatsappDeliveredAt)}`
                : 'Mensagem entregue ao WhatsApp'
        },
        'READ': {
            icon: <CheckCheck className="h-3 w-3" />,
            label: 'Lido',
            className: 'bg-green-100 text-green-700 border-green-200',
            tooltip: interaction.whatsappReadAt
                ? `Lido em ${formatTimestamp(interaction.whatsappReadAt)}`
                : 'Mensagem lida pelo destinatário'
        },
        'SENT': {
            icon: <Check className="h-3 w-3" />,
            label: 'Enviado',
            className: 'bg-gray-100 text-gray-700 border-gray-200',
            tooltip: interaction.whatsappSentAt
                ? `Enviado em ${formatTimestamp(interaction.whatsappSentAt)}`
                : 'Mensagem enviada'
        },
        'PENDING': {
            icon: <Clock className="h-3 w-3" />,
            label: 'Pendente',
            className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            tooltip: 'Aguardando envio'
        },
        'FAILED': {
            icon: <XCircle className="h-3 w-3" />,
            label: 'Falhou',
            className: 'bg-red-100 text-red-700 border-red-200',
            tooltip: 'Falha no envio da mensagem'
        },
        'PLAYED': {
            icon: <Play className="h-3 w-3" />,
            label: 'Ouvido',
            className: 'bg-purple-100 text-purple-700 border-purple-200',
            tooltip: interaction.whatsappPlayedAt
                ? `Áudio ouvido em ${formatTimestamp(interaction.whatsappPlayedAt)}`
                : 'Áudio ouvido pelo destinatário'
        }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge variant="outline" className={`text-xs ${config.className} cursor-help`}>
                        {config.icon}
                        <span className="ml-1">{config.label}</span>
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{config.tooltip}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

interface InteractionHistoryCardProps {
    interactions: FamilyInteraction[];
    student: Student | null;
    studentRecord: StudentRecord | null;
    userRole: string | null;
    showDeleteDialog: string | null;
    setShowDeleteDialog: (value: string | null) => void;
    setEditingInteraction: (value: FamilyInteraction | null) => void;
    onDeleteInteraction: (interactionId: string) => Promise<void>;
    onPrintReport: () => void;
}

const InteractionHistoryCard = memo(function InteractionHistoryCard({
    interactions,
    student,
    studentRecord,
    userRole,
    showDeleteDialog,
    setShowDeleteDialog,
    setEditingInteraction,
    onDeleteInteraction,
    onPrintReport,
}: InteractionHistoryCardProps) {
    return (
        <>
            <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-purple-400 to-violet-500 text-white rounded-t-lg py-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold flex items-center space-x-2">
                            <History className="w-4 h-4" />
                            <span>Histórico de Interações</span>
                        </CardTitle>

                        <div className="flex items-center space-x-2">
                            {interactions.length > 0 && (
                                <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs">
                                    {interactions.length} {interactions.length === 1 ? 'registro' : 'registros'}
                                </Badge>
                            )}

                            <Button
                                onClick={onPrintReport}
                                disabled={!student || !studentRecord}
                                size="sm"
                                className="h-7 bg-white/10 hover:bg-white/20 text-white border-white/20 transition-colors duration-200"
                                variant="outline"
                            >
                                <FileText className="h-3 w-3 mr-1" />
                                Relatório
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-4">
                    {interactions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-b border-gray-200">
                                        <TableHead className="text-xs font-semibold text-gray-700 py-2">
                                            <div className="flex items-center space-x-1">
                                                <MessageSquare className="w-3 h-3" />
                                                <span>Tipo</span>
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold text-gray-700 py-2">
                                            <div className="flex items-center space-x-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>Data</span>
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold text-gray-700 py-2">
                                            <div className="flex items-center space-x-1">
                                                <FileText className="w-3 h-3" />
                                                <span>Descrição</span>
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold text-gray-700 py-2">
                                            <div className="flex items-center space-x-1">
                                                <User className="w-3 h-3" />
                                                <span>Criado por</span>
                                            </div>
                                        </TableHead>
                                        {userRole === "admin" && (
                                            <TableHead className="text-xs font-semibold text-gray-700 py-2 w-[80px] text-right">
                                                <span>Ações</span>
                                            </TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {interactions.map((interaction: FamilyInteraction) => (
                                        <TableRow
                                            key={interaction.id}
                                            className={`hover:bg-gray-50 transition-colors ${interaction.sensitive ? "bg-red-50/50 border-l-4 border-l-red-400" : ""
                                                }`}
                                        >
                                            <TableCell className="py-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-medium text-gray-900">{interaction.type}</span>
                                                    {interaction.sensitive && (
                                                        <Badge variant="destructive" className="text-xs bg-red-100 text-red-700 border-red-200">
                                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                                            Sensível
                                                        </Badge>
                                                    )}
                                                    {interaction.whatsappStatus && getWhatsAppStatusBadge(interaction)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <span className="text-sm text-gray-600 font-medium">{formatDateBR(interaction.date)}</span>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <div className="max-w-[400px]">
                                                    <span className="text-sm text-gray-700 whitespace-pre-wrap break-words">{interaction.description}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <span className="text-sm text-gray-600">{interaction.createdBy}</span>
                                            </TableCell>
                                            {userRole === "admin" && (
                                                <TableCell className="text-right py-2">
                                                    <div className="flex justify-end items-center space-x-1">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                                        onClick={() => {
                                                                            setEditingInteraction(interaction);
                                                                            document.getElementById("interaction-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
                                                                        }}
                                                                    >
                                                                        <Pencil className="h-3 w-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Editar interação</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                                        onClick={() => setShowDeleteDialog(interaction.id)}
                                                                    >
                                                                        <Trash className="h-3 w-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Excluir interação</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm font-medium text-gray-600 mb-1">Nenhuma interação registrada</p>
                            <p className="text-xs text-gray-500">As interações cadastradas aparecerão aqui</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
                <AlertDialogContent className="sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center space-x-2 text-red-600">
                            <Trash className="w-5 h-5" />
                            <span>Confirmar exclusão</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600">
                            Tem certeza de que deseja excluir esta interação? Esta ação não pode ser desfeita e a interação será permanentemente removida do sistema.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-gray-300 hover:bg-gray-50">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => showDeleteDialog && onDeleteInteraction(showDeleteDialog)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
});

export default InteractionHistoryCard;