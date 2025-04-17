import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil, Trash } from "lucide-react";
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
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>Histórico de Interações com a Família</CardTitle>
                    <Button onClick={onPrintReport} disabled={!student || !studentRecord}>
                        Imprimir Relatório
                    </Button>
                </CardHeader>
                <CardContent>
                    {interactions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Criado por</TableHead>
                                        {userRole === "admin" && <TableHead className="w-[100px] text-right">Ações</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {interactions.map((interaction: FamilyInteraction) => (
                                        <TableRow
                                            key={interaction.id}
                                            className={interaction.sensitive ? "bg-red-50" : ""}
                                        >
                                            <TableCell>
                                                {interaction.type}
                                                {interaction.sensitive && (
                                                    <span className="ml-2 inline-block bg-red-500 text-white text-xs px-2 py-1 rounded">
                                                        Sensível
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>{interaction.date}</TableCell>
                                            <TableCell>{interaction.description}</TableCell>
                                            <TableCell>{interaction.createdBy}</TableCell>
                                            {userRole === "admin" && (
                                                <TableCell className="text-right">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => {
                                                                        setEditingInteraction(interaction);
                                                                        document.getElementById("interaction-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
                                                                    }}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
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
                                                                    size="icon"
                                                                    onClick={() => setShowDeleteDialog(interaction.id)}
                                                                >
                                                                    <Trash className="h-4 w-4 text-red-500" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Excluir interação</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma interação registrada.</p>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza de que deseja excluir esta interação? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => showDeleteDialog && onDeleteInteraction(showDeleteDialog)}>
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}