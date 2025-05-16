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
import { Occurrence, Student, StudentRecord } from "../app/types";

interface OccurrenceHistoryCardProps {
    occurrences: Occurrence[];
    student: Student | null;
    studentRecord: StudentRecord | null;
    userRole: string | null;
    showDeleteDialog: string | null;
    setShowDeleteDialog: (value: string | null) => void;
    setEditingOccurrence: (value: Occurrence | null) => void;
    onDeleteOccurrence: (occurrenceId: string) => Promise<void>;
}

export default function OccurrenceHistoryCard({
    occurrences,
    userRole,
    showDeleteDialog,
    setShowDeleteDialog,
    setEditingOccurrence,
    onDeleteOccurrence,
}: OccurrenceHistoryCardProps) {
    return (
        <>
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>Histórico de Ocorrências</CardTitle>
                </CardHeader>
                <CardContent>
                    {occurrences.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Criado por</TableHead>
                                        {userRole === "admin" && <TableHead className="w-[100px] text-right">Ações</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {occurrences.map((occurrence: Occurrence) => (
                                        <TableRow
                                            key={occurrence.id}
                                            className={occurrence.sensitive ? "bg-red-50" : ""}
                                        >
                                            <TableCell>{occurrence.date}</TableCell>
                                            <TableCell>
                                                {occurrence.description}
                                                {occurrence.sensitive && (
                                                    <span className="ml-2 inline-block bg-red-500 text-white text-xs px-2 py-1 rounded">
                                                        Sensível
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>{occurrence.createdBy}</TableCell>
                                            {userRole === "admin" && (
                                                <TableCell className="text-right">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => {
                                                                        setEditingOccurrence(occurrence);
                                                                        document.getElementById("occurrence-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
                                                                    }}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Editar ocorrência</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => setShowDeleteDialog(occurrence.id)}
                                                                >
                                                                    <Trash className="h-4 w-4 text-red-500" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Excluir ocorrência</p>
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
                        <p className="text-sm text-muted-foreground">Nenhuma ocorrência registrada.</p>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza de que deseja excluir esta ocorrência? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => showDeleteDialog && onDeleteOccurrence(showDeleteDialog)}>
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}