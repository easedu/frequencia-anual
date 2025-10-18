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
import { formatDate } from "@/utils/dateUtils";
import { History, Pencil, Trash, Calendar, Clock, AlertCircle, User, Shield } from "lucide-react";
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
import { Suspensao, Student } from "@/types";

interface SuspensaoHistoryCardProps {
    suspensoes: Suspensao[];
    userRole: string | null | undefined; // Aceitar undefined também
    student?: Student | null | undefined; // Aceitar student (não usado mas passado)
    showDeleteSuspensaoDialog: string | null;
    setShowDeleteSuspensaoDialog: (value: string | null) => void;
    setEditingSuspensao: (value: Suspensao | null) => void;
    onDeleteSuspensao: (suspensaoId: string) => Promise<void>;
}

const SuspensaoHistoryCard = memo(function SuspensaoHistoryCard({
    suspensoes,
    userRole,
    showDeleteSuspensaoDialog,
    setShowDeleteSuspensaoDialog,
    setEditingSuspensao,
    onDeleteSuspensao,
}: SuspensaoHistoryCardProps) {


    return (
        <>
            <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-t-lg py-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold flex items-center space-x-2">
                            <History className="w-4 h-4" />
                            <span>Histórico de Suspensões</span>
                        </CardTitle>

                        {suspensoes.length > 0 && (
                            <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs">
                                {suspensoes.length} {suspensoes.length === 1 ? 'registro' : 'registros'}
                            </Badge>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="p-4">
                    {suspensoes.length > 0 ? (
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
                                                <AlertCircle className="w-3 h-3" />
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
                                    {suspensoes.map((suspensao: Suspensao) => (
                                        <TableRow key={suspensao.id} className="hover:bg-gray-50 transition-colors">
                                            <TableCell className="py-2 text-sm font-medium text-gray-900">
                                                {formatDate(suspensao.startDate)}
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                                    {suspensao.days} {suspensao.days === 1 ? 'dia' : 'dias'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-2 text-sm text-gray-700 max-w-[200px]">
                                                <div className="truncate" title={suspensao.description}>
                                                    {suspensao.description}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2 text-sm text-gray-600">
                                                {suspensao.createdBy}
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
                                                                            setEditingSuspensao(suspensao);
                                                                            document.getElementById("suspensao-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
                                                                        }}
                                                                    >
                                                                        <Pencil className="h-3 w-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Editar suspensão</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                                                                        onClick={() => setShowDeleteSuspensaoDialog(suspensao.id)}
                                                                    >
                                                                        <Trash className="h-3 w-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Excluir suspensão</p>
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
                            <p className="text-sm font-medium text-gray-600 mb-1">Nenhuma suspensão registrada</p>
                            <p className="text-xs text-gray-500">As suspensões cadastradas aparecerão aqui</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!showDeleteSuspensaoDialog} onOpenChange={() => setShowDeleteSuspensaoDialog(null)}>
                <AlertDialogContent className="sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center space-x-2 text-red-600">
                            <Trash className="w-5 h-5" />
                            <span>Confirmar exclusão</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600">
                            Tem certeza de que deseja excluir esta suspensão? Esta ação não pode ser desfeita e removerá as faltas associadas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-gray-300 hover:bg-gray-50">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => showDeleteSuspensaoDialog && onDeleteSuspensao(showDeleteSuspensaoDialog)}
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

export default SuspensaoHistoryCard;
