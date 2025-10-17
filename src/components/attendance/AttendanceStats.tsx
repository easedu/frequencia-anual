/**
 * AttendanceStats Component
 *
 * Estatísticas de presença (Total, Presentes, Ausentes).
 * Extrai ~30 linhas do componente marcar-faltas/page.tsx
 */

import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, UserX } from "lucide-react";

// ════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════

interface AttendanceStatsProps {
    totalStudents: number;
    presentStudents: number;
    absentStudents: number;
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE
// ════════════════════════════════════════════════════════════════

export const AttendanceStats = memo(function AttendanceStats({
    totalStudents,
    presentStudents,
    absentStudents,
}: AttendanceStatsProps) {
    return (
        <div className="grid grid-cols-3 gap-2">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-2 text-center">
                    <div className="flex items-center justify-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span className="text-lg font-bold">{totalStudents}</span>
                    </div>
                    <p className="text-xs text-blue-100 mt-0.5">Total</p>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-2 text-center">
                    <div className="flex items-center justify-center space-x-1">
                        <UserCheck className="w-3 h-3" />
                        <span className="text-lg font-bold">{presentStudents}</span>
                    </div>
                    <p className="text-xs text-green-100 mt-0.5">Presentes</p>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                <CardContent className="p-2 text-center">
                    <div className="flex items-center justify-center space-x-1">
                        <UserX className="w-3 h-3" />
                        <span className="text-lg font-bold">{absentStudents}</span>
                    </div>
                    <p className="text-xs text-red-100 mt-0.5">Ausentes</p>
                </CardContent>
            </Card>
        </div>
    );
});
