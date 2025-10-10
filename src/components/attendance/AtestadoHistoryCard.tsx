import { memo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { logger } from "@/utils/logger";
import { History, Pencil, Trash, Calendar, Clock, FileText, User, Shield } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Atestado } from "@/types";

interface AtestadoHistoryCardProps {
    atestados: Atestado[];
    userRole: string | null;
    showDeleteAtestadoDialog: string | null;
    setShowDeleteAtestadoDialog: (value: string | null) => void;
    setEditingAtestado: (value: Atestado | null) => void;
    onDeleteAtestado: (atestadoId: string) => Promise<void>;
}

const AtestadoHistoryCard = memo(function AtestadoHistoryCard({
    atestados,
    userRole,
    showDeleteAtestadoDialog,
    setShowDeleteAtestadoDialog,
    setEditingAtestado,
    onDeleteAtestado,
}: AtestadoHistoryCardProps) {
    const formatDate = (dateString: string) => {
        if (!dateString) return dateString;

        try {
            const parts = dateString.split('/');
            if (parts.length !== 3) {
                return dateString;
            }

            // CORREÇÃO: Usar o construtor numérico para evitar problemas de fuso horário (UTC).
            // O mês no construtor Date() é 0-indexado (0=janeiro, 1=fevereiro, etc.), por isso subtraímos 1.
            const [day, month, year] = parts.map(Number);
            const date = new Date(year, month - 1, day);

            if (isNaN(date.getTime())) {
                return dateString;
            }

            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            logger.error("Erro ao formatar a data", error as Error);
            return dateString;
        }
    };


    return (
        <>
            <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-t-lg py-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold flex items-center space-x-2">
                            <History className="w-4 h-4" />
                            <span>Histórico de Atestados</span>
                        </CardTitle>

                        {atestados.length > 0 && (
                            <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs">
                                {atestados.length} {atestados.length === 1 ? 'registro' : 'registros'}
                            </Badge>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="p-4">
                    {atestados.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-b border-gray-200">
                                        <TableHead className="text-xs font-semibold text-gray-700 py-2">
                                            <div className="flex items-center space-x-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>Data de Início</span>
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold text-gray-700 py-2">
                                            <div className="flex items-center space-x-1">
                                                <Clock className="w-3 h-3" />
                                                <span>Dias</span>
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
                                                <span>Adicionado por</span>
                                            </div>
                                        </TableHead>
                                        {userRole === "admin" && (
                                            <TableHead className="text-xs font-semibold text-gray-700 py-2 w-[80px] text-right">
                                                <div className="flex items-center justify-end space-x-1">
                                                    <Shield className="w-3 h-3" />
                                                    <span>Ações</span>
                                                </div>
                                            </TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {atestados.map((atestado: Atestado) => (
                                        <TableRow key={atestado.id} className="hover:bg-gray-50 transition-colors">
                                            <TableCell className="py-2 text-sm font-medium text-gray-900">
                                                {formatDate(atestado.startDate)}
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                                    {atestado.days} {atestado.days === 1 ? 'dia' : 'dias'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-2 text-sm text-gray-700 max-w-[200px]">
                                                <div className="truncate" title={atestado.description}>
                                                    {atestado.description}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2 text-sm text-gray-600">
                                                {atestado.createdBy}
                                            </TableCell>
                                            {userRole === "admin" && (
                                                <TableCell className="py-2 text-right">
                                                    <div className="flex items-center justify-end space-x-1">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                                                                        onClick={() => {
                                                                            setEditingAtestado(atestado);
                                                                            document.getElementById("atestado-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
                                                                        }}
                                                                    >
                                                                        <Pencil className="h-3 w-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Editar atestado</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                                                                        onClick={() => setShowDeleteAtestadoDialog(atestado.id)}
                                                                    >
                                                                        <Trash className="h-3 w-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Excluir atestado</p>
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
                            <p className="text-sm font-medium text-gray-600 mb-1">Nenhum atestado registrado</p>
                            <p className="text-xs text-gray-500">Os atestados cadastrados aparecerão aqui</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!showDeleteAtestadoDialog} onOpenChange={() => setShowDeleteAtestadoDialog(null)}>
                <AlertDialogContent className="sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center space-x-2 text-red-600">
                            <Trash className="w-5 h-5" />
                            <span>Confirmar exclusão</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600">
                            Tem certeza de que deseja excluir este atestado? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-gray-300 hover:bg-gray-50">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => showDeleteAtestadoDialog && onDeleteAtestado(showDeleteAtestadoDialog)}
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

export default AtestadoHistoryCard;