import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil, Trash, FileText, AlertTriangle, History, User, Calendar, MessageSquare } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FamilyInteraction, Student, StudentRecord } from "../app/types";

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

export default function InteractionHistoryCard({
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
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-900">{interaction.type}</span>
                                                    {interaction.sensitive && (
                                                        <Badge variant="destructive" className="text-xs bg-red-100 text-red-700 border-red-200">
                                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                                            Sensível
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <span className="text-sm text-gray-600 font-medium">{interaction.date}</span>
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
}