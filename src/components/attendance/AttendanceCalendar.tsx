/**
 * AttendanceCalendar Component
 *
 * Seletor de data para marcação de faltas com validação.
 * Extrai ~80-100 linhas do componente marcar-faltas/page.tsx
 */

import React, { memo } from "react";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";

// ════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════

interface AttendanceCalendarProps {
    selectedDate: string;
    onDateChange: (date: string) => void;
    validDates: string[];
    className?: string;
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE
// ════════════════════════════════════════════════════════════════

export const AttendanceCalendar = memo(function AttendanceCalendar({
    selectedDate,
    onDateChange,
    validDates,
    className = "",
}: AttendanceCalendarProps) {
    // Inverte a ordem das datas para mostrar as mais recentes primeiro
    const reversedDates = [...validDates].reverse();

    return (
        <div className={`space-y-2 ${className}`}>
            <Label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Data da Aula</span>
            </Label>
            <Select onValueChange={onDateChange} value={selectedDate}>
                <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors">
                    <SelectValue placeholder="Selecione a data" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                    {reversedDates.map((date) => (
                        <SelectItem key={date} value={date} className="py-2 text-sm">
                            <div className="flex items-center space-x-2">
                                <Calendar className="w-3 h-3 text-gray-500" />
                                <span>{date}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
});
