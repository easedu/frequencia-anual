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
import { Atestado } from "../app/types";

interface AtestadoHistoryCardProps {
    atestados: Atestado[];
    userRole: string | null;
    showDeleteAtestadoDialog: string | null;
    setShowDeleteAtestadoDialog: (value: string | null) => void;
    setEditingAtestado: (value: Atestado | null) => void;
    onDeleteAtestado: (atestadoId: string) => Promise<void>;
}

export default function AtestadoHistoryCard({
    atestados,
    userRole,
    showDeleteAtestadoDialog,
    setShowDeleteAtestadoDialog,
    setEditingAtestado,
    onDeleteAtestado,
}: AtestadoHistoryCardProps) {
    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Atestados</CardTitle>
                </CardHeader>
                <CardContent>
                    {atestados.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data de Início</TableHead>
                                        <TableHead>Dias</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Criado por</TableHead>
                                        {userRole === "admin" && <TableHead className="w-[100px] text-right">Ações</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {atestados.map((atestado: Atestado) => (
                                        <TableRow key={atestado.id}>
                                            <TableCell>{atestado.startDate}</TableCell>
                                            <TableCell>{atestado.days}</TableCell>
                                            <TableCell>{atestado.description}</TableCell>
                                            <TableCell>{atestado.createdBy}</TableCell>
                                            {userRole === "admin" && (
                                                <TableCell className="text-right">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => {
                                                                        setEditingAtestado(atestado);
                                                                        document.getElementById("atestado-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
                                                                    }}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
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
                                                                    size="icon"
                                                                    onClick={() => setShowDeleteAtestadoDialog(atestado.id)}
                                                                >
                                                                    <Trash className="h-4 w-4 text-red-500" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Excluir atestado</p>
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
                        <p className="text-sm text-muted-foreground">Nenhum atestado registrado.</p>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!showDeleteAtestadoDialog} onOpenChange={() => setShowDeleteAtestadoDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza de que deseja excluir este atestado? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => showDeleteAtestadoDialog && onDeleteAtestado(showDeleteAtestadoDialog)}>
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}