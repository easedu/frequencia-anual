/**
 * AttendanceConfirmDialog Component
 *
 * Dialog de confirmação de salvamento de faltas.
 * Extrai ~80 linhas do componente marcar-faltas/page.tsx
 */

import React, { memo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Save, Calendar, Users, UserX, CheckCircle2 } from "lucide-react";
import type { Estudante } from "@/hooks/useStudents";

// ════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════

interface AttendanceConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedDate: string;
    selectedClass: string;
    absentStudents: number;
    filteredStudents: Estudante[];
    markedAbsences: { [key: string]: boolean };
    isSaving: boolean;
    onConfirm: () => void;
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE
// ════════════════════════════════════════════════════════════════

export const AttendanceConfirmDialog = memo(function AttendanceConfirmDialog({
    open,
    onOpenChange,
    selectedDate,
    selectedClass,
    absentStudents,
    filteredStudents,
    markedAbsences,
    isSaving,
    onConfirm,
}: AttendanceConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2 text-blue-600">
                        <Save className="w-5 h-5" />
                        <span>Confirmar Marcação de Faltas</span>
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                        Revise os dados antes de confirmar a marcação.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">Data:</span>
                            <span>{selectedDate}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">Turma:</span>
                            <span>{selectedClass}</span>
                        </div>
                    </div>

                    <div>
                        <p className="font-medium text-gray-700 mb-2 flex items-center space-x-2">
                            <UserX className="w-4 h-4 text-red-600" />
                            <span>Alunos Ausentes ({absentStudents}):</span>
                        </p>
                        {absentStudents > 0 ? (
                            <ul className="space-y-1 max-h-32 overflow-y-auto">
                                {filteredStudents
                                    .filter((est: Estudante) => markedAbsences[est.estudanteId])
                                    .map((est: Estudante) => (
                                        <li key={est.estudanteId} className="text-sm text-gray-600 flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                            <span>{est.nome}</span>
                                        </li>
                                    ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500 italic">Nenhum aluno ausente</p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="border-gray-300 hover:bg-gray-50"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isSaving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Salvando...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Confirmar
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
});
