/**
 * StudentCheckboxList Component
 *
 * Lista de estudantes com checkboxes para marcação de presença/ausência.
 * Extrai ~100-120 linhas do componente marcar-faltas/page.tsx
 */

import React, { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, AlertCircle, UserX, CheckCircle2 } from "lucide-react";
import type { Estudante } from "@/hooks/useStudents";

// ════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════

interface Atestado {
    id: string;
    startDate: string;
    days: number;
    description: string;
    createdBy: string;
}

interface Suspensao {
    id: string;
    startDate: string;
    days: number;
    description: string;
    createdBy: string;
}

interface Coverage {
    hasAtestado: boolean;
    hasSuspensao: boolean;
    atestado?: Atestado;
    suspensao?: Suspensao;
}

type Role = "admin" | "super-user" | "user";

interface StudentCheckboxListProps {
    students: Estudante[];
    markedAbsences: { [key: string]: boolean };
    existingAbsences: { [key: string]: boolean };
    role: Role | null;
    onCheckboxChange: (studentId: string) => void;
    checkCoverageForStudent: (studentId: string, dateStr: string) => Coverage;
    selectedDate: string;
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE
// ════════════════════════════════════════════════════════════════

export const StudentCheckboxList = memo(function StudentCheckboxList({
    students,
    markedAbsences,
    existingAbsences,
    role,
    onCheckboxChange,
    checkCoverageForStudent,
    selectedDate,
}: StudentCheckboxListProps) {
    const sortedStudents = [...students].sort((a, b) => a.nome.localeCompare(b.nome));

    return (
        <div className="space-y-2">
            {sortedStudents.map((est: Estudante) => {
                const isLocked = role === "user" && existingAbsences[est.estudanteId];
                const isAbsent = markedAbsences[est.estudanteId] === true;
                const coverage = checkCoverageForStudent(est.estudanteId, selectedDate);

                return (
                    <div
                        key={est.estudanteId}
                        className={`
                            flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-200
                            ${isAbsent
                                ? 'bg-red-50 border-red-200 hover:bg-red-100'
                                : 'bg-green-50 border-green-200 hover:bg-green-100'
                            }
                            ${!isLocked ? 'cursor-pointer' : 'cursor-default opacity-75'}
                        `}
                        onClick={!isLocked ? () => onCheckboxChange(est.estudanteId) : undefined}
                    >
                        <div className="flex items-center space-x-3">
                            <Checkbox
                                checked={isAbsent}
                                disabled={isLocked}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isLocked) onCheckboxChange(est.estudanteId);
                                }}
                                className="h-5 w-5"
                            />
                            <div>
                                <p className="font-medium text-gray-900">{est.nome}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                    {isLocked && (
                                        <p className="text-xs text-gray-500 flex items-center space-x-1">
                                            <Clock className="w-3 h-3" />
                                            <span>Já registrado</span>
                                        </p>
                                    )}
                                    {coverage.hasAtestado && (
                                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200">
                                            <FileText className="w-3 h-3 mr-1" />
                                            Atestado
                                        </Badge>
                                    )}
                                    {coverage.hasSuspensao && (
                                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 border-orange-200">
                                            <AlertCircle className="w-3 h-3 mr-1" />
                                            Suspensão
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {isAbsent ? (
                                <Badge variant="destructive" className="text-xs">
                                    <UserX className="w-3 h-3 mr-1" />
                                    Ausente
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Presente
                                </Badge>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
});
