"use client";
import { useStudents } from "@/hooks/useStudents";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptySearchState } from "@/components/shared";
import { useAbsenceControls, useAbsences } from "@/hooks/api";
import { logger } from "@/utils/logger";
import {
    FileText,
    Search,
    Filter,
    Users,
    Printer,
    Eye,
    EyeOff,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ChevronLeft,
    ChevronRight
} from "lucide-react";

interface Estudante {
    id: string; // Internal ID (usado para queries)
    estudanteId: string; // Firebase UUID (legacy)
    turma: string;
    nome: string;
    status: string;
    bolsaFamilia: "SIM" | "NÃO";
}

const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
] as const;

export default function RelatorioFaltasPage() {
    const [students, setStudents] = useState<Estudante[]>([]);
    const [loadingStudents, setLoadingStudents] = useState<boolean>(true);
    const [searchFilter, setSearchFilter] = useState<string>("");
    const debouncedSearchFilter = useDebounce(searchFilter, 500);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [recordsPerPage, setRecordsPerPage] = useState<number>(10);
    const [selectedMonths, setSelectedMonths] = useState<Set<string>>(
        new Set([new Date().toLocaleString('pt-BR', { month: 'long' }).charAt(0).toUpperCase() + new Date().toLocaleString('pt-BR', { month: 'long' }).slice(1)])
    );
    const [showAbsences, setShowAbsences] = useState<boolean>(false);
    const [showFrequency, setShowFrequency] = useState<boolean>(true);
    const [excludeJustified, setExcludeJustified] = useState<boolean>(true);
    const [showOnlyLowFrequency, setShowOnlyLowFrequency] = useState<boolean>(false);
    const [diasLetivos, setDiasLetivos] = useState<{ [key: number]: number }>({});

    // ✅ Usar hooks da API REST (sem Supabase direto)
    const { controls: absenceControls } = useAbsenceControls({ academic_year: 2025 });
    const { absences } = useAbsences({
        allowAll: true // ✅ Carrega TODAS as faltas com paginação recursiva paralela
    });

    const parseDate = (dateStr: string): Date | null => {
        if (!dateStr) return null;

        // Se está em formato ISO (YYYY-MM-DD)
        if (dateStr.includes('-')) {
            const [year, month, day] = dateStr.split('-').map(Number);
            if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
            return new Date(year, month - 1, day);
        }

        // Se está em formato BR (DD/MM/YYYY)
        if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/').map(Number);
            if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
            return new Date(year, month - 1, day);
        }

        return null;
    };

    // Calcular dias letivos quando absenceControls mudar
    useEffect(() => {

        if (!absenceControls || absenceControls.length === 0) {
            return;
        }

        try {
            const diasPorMes: { [key: number]: number } = {};

            months.forEach((_, index) => {
                diasPorMes[index] = 0;
            });

            // Calcular dias letivos por mês baseado nos bimestres
            absenceControls.forEach((control) => {
                if (control.start_date && control.end_date) {
                    const startDate = new Date(control.start_date);
                    const endDate = new Date(control.end_date);

                    // Contar dias entre start e end (simplificado - pode precisar ajuste)
                    const currentDate = new Date(startDate);
                    while (currentDate <= endDate) {
                        const monthIndex = currentDate.getMonth();
                        diasPorMes[monthIndex] = (diasPorMes[monthIndex] || 0) + 1;
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                }
            });

            setDiasLetivos(diasPorMes);
        } catch (error) {
            logger.error("Erro ao calcular dias letivos", {}, error as Error);
        }
    }, [absenceControls]);

    // ✅ Usar hook da API REST com filtros corretos
    const { students: allStudents, loading: loadingAllStudents } = useStudents({
        status: "ATIVO",
        bolsa_familia: "SIM"
    });

    useEffect(() => {
        // Estudantes já vêm filtrados da API - os campos já existem via transformToClientModel
        const mappedStudents: Estudante[] = allStudents.map(s => {
            // API retorna tanto snake_case quanto camelCase
            const student = s as unknown as Record<string, unknown>;
            return {
                id: (student.id as string) || '',
                estudanteId: (student.estudanteId || student.student_id) as string,
                turma: (student.turma || student.class) as string,
                nome: (student.nome || student.name) as string,
                status: student.status as string,
                bolsaFamilia: (student.bolsaFamilia || student.bolsa_familia || 'NÃO') as "SIM" | "NÃO"
            };
        });
        setStudents(mappedStudents);
        setLoadingStudents(loadingAllStudents);
    }, [allStudents, loadingAllStudents]);

    // Memoizar cálculos de faltas por estudante/mês para evitar recalcular sempre
    const absencesByStudentMonth = useMemo(() => {
        const cache: Record<string, Record<number, number>> = {};

        if (!absences || absences.length === 0) {
            return cache;
        }

        // 🚀 OTIMIZAÇÃO CRÍTICA: Criar índice de faltas por estudante ANTES do loop
        // Reduz de O(n × m × k) para O(k + n × m) onde k=faltas, n=estudantes, m=meses
        const absencesByStudent = new Map<string, typeof absences>();

        absences.forEach((absence) => {
            // Aplicar filtro de justificadas UMA VEZ
            if (excludeJustified && absence.is_justified) return;

            const studentId = absence.student_id;
            if (!studentId) return;

            if (!absencesByStudent.has(studentId)) {
                absencesByStudent.set(studentId, []);
            }
            absencesByStudent.get(studentId)!.push(absence);
        });

        // Agora processar estudantes com lookup O(1)
        students.forEach((student) => {
            const studentKey = student.id; // Internal ID
            cache[studentKey] = {};

            const studentAbsences = absencesByStudent.get(studentKey) || [];

            months.forEach((_, monthIndex) => {
                // Filter apenas nas faltas DESTE estudante (não todas!)
                const count = studentAbsences.filter(absence => {
                    const recordDate = parseDate(absence.absence_date);
                    return recordDate && recordDate.getMonth() === monthIndex;
                }).length;

                cache[studentKey][monthIndex] = count;
            });
        });

        return cache;
    }, [students, absences, excludeJustified]);

    const getAbsencesByMonth = useCallback((estudanteId: string, monthIndex: number): number => {
        return absencesByStudentMonth[estudanteId]?.[monthIndex] || 0;
    }, [absencesByStudentMonth]);

    const getPercentageByMonth = useCallback((estudanteId: string, monthIndex: number): string => {
        const absences = getAbsencesByMonth(estudanteId, monthIndex);
        const diasLetivosMes = diasLetivos[monthIndex] || 0;
        const frequency = diasLetivosMes > 0 ? (1 - absences / diasLetivosMes) * 100 : 100;
        return frequency.toFixed(1) + "%";
    }, [getAbsencesByMonth, diasLetivos]);

    const hasLowFrequency = useCallback((estudanteId: string): boolean => {
        // ⚠️ IMPORTANTE: Se não há dias letivos calculados, NÃO filtrar nada
        if (Object.keys(diasLetivos).length === 0) {
            return false; // Não filtra ninguém se não há dados
        }

        // ✅ CORREÇÃO CRÍTICA: Verificar APENAS os meses SELECIONADOS no filtro
        const result = months.some((month, index) => {
            // 🎯 Só calcular para meses que estão SELECIONADOS
            if (!selectedMonths.has(month)) {
                return false; // Ignora meses não selecionados
            }

            const absences = getAbsencesByMonth(estudanteId, index);
            const diasLetivosMes = diasLetivos[index] || 0;

            // Se não há dias letivos no mês, ignorar (100% de frequência)
            if (diasLetivosMes === 0) return false;

            const frequency = (1 - absences / diasLetivosMes) * 100;
            return frequency < 75;
        });

        return result;
    }, [getAbsencesByMonth, diasLetivos, students, selectedMonths]);

    const filteredStudents = useMemo(() => {
        const filtered = students
            .filter(student => {
                const matchesSearch = debouncedSearchFilter === "" ||
                    student.turma.toLowerCase().includes(debouncedSearchFilter.toLowerCase()) ||
                    student.nome.toLowerCase().includes(debouncedSearchFilter.toLowerCase());

                const matchesFrequencyFilter = !showOnlyLowFrequency || hasLowFrequency(student.id); // ✅ Internal ID

                return matchesSearch && matchesFrequencyFilter;
            })
            .sort((a, b) => a.nome.localeCompare(b.nome));

        // 🔍 DEBUG: Log do filtro (apenas meses SELECIONADOS)
        if (showOnlyLowFrequency && filtered.length > 0) {
            // Calcular frequência APENAS para meses SELECIONADOS
            const _primeiros5ComFrequencia = filtered.slice(0, 5).map(s => {
                const totalFaltas = months.reduce((sum, month, idx) =>
                    selectedMonths.has(month) ? sum + getAbsencesByMonth(s.id, idx) : sum,
                    0
                );
                const totalDias = months.reduce((sum, month, idx) =>
                    selectedMonths.has(month) ? sum + (diasLetivos[idx] || 0) : sum,
                    0
                );
                const freq = totalDias > 0 ? ((totalDias - totalFaltas) / totalDias * 100) : 100;

                // Identificar QUAIS meses SELECIONADOS têm frequência < 75%
                const mesesComBaixaFreq = months
                    .map((month, idx) => {
                        // ✅ Só analisar meses SELECIONADOS
                        if (!selectedMonths.has(month)) return null;

                        const faltas = getAbsencesByMonth(s.id, idx);
                        const dias = diasLetivos[idx] || 0;
                        if (dias === 0) return null;
                        const freqMes = (1 - faltas / dias) * 100;
                        return freqMes < 75 ? { mes: month, freq: freqMes.toFixed(1) + '%', faltas, dias } : null;
                    })
                    .filter(m => m !== null);

                return {
                    nome: s.nome,
                    mesesSelecionados: mesesSelecionadosArray.join(', '),
                    frequenciaMesesSelecionados: freq.toFixed(1) + '%',
                    mesesComProblema: mesesComBaixaFreq
                };
            });
        }

        return filtered;
    }, [students, debouncedSearchFilter, showOnlyLowFrequency, hasLowFrequency, getAbsencesByMonth, diasLetivos, selectedMonths]);

    const totalRecords = filteredStudents.length;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredStudents.slice(indexOfFirstRecord, indexOfLastRecord);

    const handleMonthChange = (month: string): void => {
        const newSelectedMonths = new Set(selectedMonths);
        if (newSelectedMonths.has(month)) {
            newSelectedMonths.delete(month);
        } else {
            newSelectedMonths.add(month);
        }
        setSelectedMonths(newSelectedMonths);
    };

    const handleShowAbsencesChange = (checked: boolean): void => {
        setShowAbsences(checked);
    };

    const handleShowFrequencyChange = (checked: boolean): void => {
        setShowFrequency(checked);
    };

    const handleExcludeJustifiedChange = (checked: boolean): void => {
        setExcludeJustified(checked);
    };

    const handleShowOnlyLowFrequencyChange = (checked: boolean): void => {
        setShowOnlyLowFrequency(checked);
    };

    const handleRecordsPerPageChange = (value: string): void => {
        setRecordsPerPage(Number(value));
        setCurrentPage(1);
    };

    const handlePageChange = (page: number): void => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handlePrint = () => {
        const printFrame = document.createElement('iframe');
        printFrame.style.display = 'none';
        document.body.appendChild(printFrame);

        const printDoc = printFrame.contentWindow?.document;
        if (!printDoc) {
            logger.error("Não foi possível acessar o documento do iframe");
            document.body.removeChild(printFrame);
            return;
        }

        const tableHtml = `
            <html>
            <head>
                <title>Relatório de Faltas</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 14px; }
                    h1 { font-size: 16px; margin-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th, td { border: 1px solid black; padding: 8px; text-align: center; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    .data-cell { display: flex; justify-content: center; align-items: center; }
                    .data-cell .absences { width: 48px; text-align: right; }
                    .data-cell .separator { margin: 0 4px; }
                    .data-cell .percentage { width: 48px; text-align: left; }
                    .low-frequency { color: red; font-weight: bold; }
                </style>
            </head>
            <body>
                <h1>Relatório de Faltas${excludeJustified ? ' (Excluindo Faltas Justificadas)' : ''}</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Turma</th>
                            <th>Nome do Estudante</th>
                            ${months
                .filter(month => selectedMonths.has(month))
                .map(month => `
                                    <th>${month} (${diasLetivos[months.indexOf(month)] || 0} dias)${(showAbsences && showFrequency) ? '<br>Faltas | %' : showAbsences ? '<br>Faltas' : '<br>%'}</th>
                                `)
                .join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredStudents
                .map(student => `
                                <tr class="${hasLowFrequency(student.id) ? 'low-frequency' : ''}">
                                    <td>${student.turma}</td>
                                    <td>${student.nome}</td>
                                    ${months
                        .filter(month => selectedMonths.has(month))
                        .map((month) => {
                            const monthIndex = months.indexOf(month);
                            const absences = getAbsencesByMonth(student.id, monthIndex); // ✅ Internal ID
                            const percentage = getPercentageByMonth(student.id, monthIndex); // ✅ Internal ID
                            return `
                                                <td>
                                                    ${showAbsences && showFrequency ? `
                                                        <div class="data-cell">
                                                            <span class="absences">${absences}</span>
                                                            <span class="separator">|</span>
                                                            <span class="percentage">${percentage}</span>
                                                        </div>
                                                    ` : showAbsences ? absences : percentage}
                                                </td>
                                            `;
                        })
                        .join('')}
                                </tr>
                            `)
                .join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        printDoc.open();
        printDoc.write(tableHtml);
        printDoc.close();

        printFrame.contentWindow?.focus();
        setTimeout(() => {
            printFrame.contentWindow?.print();
            document.body.removeChild(printFrame);
        }, 100);
    };

    // Estatísticas para o header
    const lowFrequencyStudents = filteredStudents.filter(student => hasLowFrequency(student.id)).length; // ✅ Internal ID
    const selectedMonthsCount = selectedMonths.size;

    if (loadingStudents || loadingAbsences) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="container mx-auto p-6 max-w-7xl">
                    <div className="space-y-6">
                        {/* Header Skeleton com informação de carregamento */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <FileText className="w-6 h-6 text-blue-600 animate-pulse" />
                                        </div>
                                        <div>
                                            <h1 className="text-3xl font-bold text-slate-800">Relatório de Faltas</h1>
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                <p className="text-sm text-blue-600 font-medium">
                                                    {loadingStudents && loadingAbsences
                                                        ? "Carregando estudantes e faltas..."
                                                        : loadingStudents
                                                        ? "Carregando estudantes..."
                                                        : "Carregando faltas..."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filtros Skeleton */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Filter className="w-5 h-5 text-slate-400" />
                                <Skeleton className="h-6 w-32" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                                ))}
                            </div>
                        </div>

                        {/* Tabela Skeleton */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <FileText className="w-5 h-5 text-slate-400" />
                                <Skeleton className="h-6 w-48" />
                            </div>
                            <div className="space-y-3">
                                <Skeleton className="h-12 w-full" />
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-16 w-full" />
                                ))}
                            </div>
                            <div className="mt-4 flex justify-center">
                                <p className="text-sm text-slate-500 italic">
                                    Aguarde enquanto processamos os dados...
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="container mx-auto p-6 max-w-7xl">
                {/* Header unificado */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <FileText className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-800">Relatório de Faltas</h1>
                                    <p className="text-slate-600 mt-1">Análise de frequência dos estudantes</p>
                                </div>
                            </div>

                            {/* Stats integrado */}
                            <div className="flex items-center gap-6 pl-6 border-l border-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-50 rounded-lg">
                                        <Users className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-600">Total de Estudantes</p>
                                        <p className="text-xl font-bold text-green-600">{totalRecords}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-50 rounded-lg">
                                        <TrendingDown className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-600">Frequência Baixa</p>
                                        <p className="text-xl font-bold text-red-600">{lowFrequencyStudents}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-50 rounded-lg">
                                        <Calendar className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-600">Meses Selecionados</p>
                                        <p className="text-xl font-bold text-purple-600">{selectedMonthsCount}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 
                                     text-white rounded-lg hover:from-blue-700 hover:to-blue-800 
                                     transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir Relatório
                        </Button>
                    </div>
                </div>

                {/* Card de Filtros */}
                <Card className="bg-white shadow-sm border border-slate-200 mb-6">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                        <CardTitle className="flex items-center gap-2 text-slate-800">
                            <Filter className="w-5 h-5" />
                            Filtros de Meses
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                            {months.map((month, index) => (
                                <div key={month} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                                    <Checkbox
                                        id={month}
                                        checked={selectedMonths.has(month)}
                                        onCheckedChange={() => handleMonthChange(month)}
                                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                    />
                                    <label htmlFor={month} className="text-sm font-medium cursor-pointer flex-1">
                                        <div>{month}</div>
                                        <div className="text-xs text-slate-500">{diasLetivos[index] || 0} dias</div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Card Principal */}
                <Card className="bg-white shadow-sm border border-slate-200 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                        <CardTitle className="flex items-center gap-2 text-slate-800">
                            <FileText className="w-5 h-5" />
                            Dados de Frequência
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        {/* Controles */}
                        <div className="flex flex-col lg:flex-row gap-4 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <Input
                                    placeholder="Buscar por turma ou nome do estudante..."
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                    className="pl-10 focus:ring-2 focus:ring-blue-500 border-slate-300"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-lg">
                                    <Checkbox
                                        id="showAbsences"
                                        checked={showAbsences}
                                        onCheckedChange={(checked) => handleShowAbsencesChange(checked as boolean)}
                                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                    />
                                    <label htmlFor="showAbsences" className="text-sm font-medium cursor-pointer flex items-center gap-1">
                                        {showAbsences ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                        Faltas
                                    </label>
                                </div>

                                <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-lg">
                                    <Checkbox
                                        id="showFrequency"
                                        checked={showFrequency}
                                        onCheckedChange={(checked) => handleShowFrequencyChange(checked as boolean)}
                                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                    />
                                    <label htmlFor="showFrequency" className="text-sm font-medium cursor-pointer flex items-center gap-1">
                                        {showFrequency ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                        Frequência
                                    </label>
                                </div>

                                <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-lg">
                                    <Checkbox
                                        id="excludeJustified"
                                        checked={excludeJustified}
                                        onCheckedChange={(checked) => handleExcludeJustifiedChange(checked as boolean)}
                                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                    />
                                    <label htmlFor="excludeJustified" className="text-sm font-medium cursor-pointer flex items-center gap-1">
                                        {excludeJustified ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        Excluir Justificadas
                                    </label>
                                </div>

                                <div className="flex items-center space-x-2 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                                    <Checkbox
                                        id="showOnlyLowFrequency"
                                        checked={showOnlyLowFrequency}
                                        onCheckedChange={(checked) => handleShowOnlyLowFrequencyChange(checked as boolean)}
                                        className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                    />
                                    <label htmlFor="showOnlyLowFrequency" className="text-sm font-medium cursor-pointer flex items-center gap-1 text-red-700">
                                        <AlertTriangle className="w-3 h-3" />
                                        Frequência &lt; 75%
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Tabela */}
                        <div className="rounded-lg border border-slate-200 overflow-hidden">
                            <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="font-semibold text-slate-800 text-center border-r border-slate-200">Turma</TableHead>
                                            <TableHead className="font-semibold text-slate-800 border-r border-slate-200">Nome do Estudante</TableHead>
                                            {months.map((month, index) => (
                                                selectedMonths.has(month) && (
                                                    <TableHead key={month} className="font-semibold text-slate-800 text-center border-r border-slate-200 last:border-r-0">
                                                        <div className="space-y-1">
                                                            <div>{month}</div>
                                                            <div className="text-xs font-normal text-slate-600">
                                                                ({diasLetivos[index] || 0} dias)
                                                            </div>
                                                            <div className="text-xs font-normal text-slate-600">
                                                                {(showAbsences && showFrequency) ? "Faltas | %" : showAbsences ? "Faltas" : "%"}
                                                            </div>
                                                        </div>
                                                    </TableHead>
                                                )
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {currentRecords.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={2 + selectedMonths.size} className="p-0">
                                                <EmptySearchState
                                                    title="Nenhum estudante encontrado"
                                                    description="Tente ajustar os filtros de busca ou meses selecionados"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        currentRecords.map(student => (
                                            <TableRow
                                                key={student.estudanteId}
                                                className={`hover:bg-slate-50 transition-colors ${hasLowFrequency(student.id) ? 'bg-red-50 border-red-200' : '' // ✅ Internal ID
                                                    }`}
                                            >
                                                <TableCell className="text-center font-medium border-r border-slate-200">
                                                    {student.turma}
                                                </TableCell>
                                                <TableCell className={`border-r border-slate-200 ${hasLowFrequency(student.id) ? 'text-red-700 font-semibold' : '' // ✅ Internal ID
                                                    }`}>
                                                    {student.nome}
                                                </TableCell>
                                                {months.map((month, index) => (
                                                    selectedMonths.has(month) && (
                                                        <TableCell key={month} className="text-center border-r border-slate-200 last:border-r-0">
                                                            {showAbsences && showFrequency ? (
                                                                <div className="flex justify-center items-center gap-2">
                                                                    <span className={`w-8 text-right font-medium ${hasLowFrequency(student.id) ? 'text-red-600' : 'text-slate-700' // ✅ Internal ID
                                                                        }`}>
                                                                        {getAbsencesByMonth(student.id, index)} {/* ✅ Internal ID */}
                                                                    </span>
                                                                    <span className="text-slate-400">|</span>
                                                                    <span className={`w-12 text-left font-medium ${hasLowFrequency(student.id) ? 'text-red-600' : 'text-slate-700' // ✅ Internal ID
                                                                        }`}>
                                                                        {getPercentageByMonth(student.id, index)} {/* ✅ Internal ID */}
                                                                    </span>
                                                                </div>
                                                            ) : showAbsences ? (
                                                                <span className={`font-medium ${hasLowFrequency(student.id) ? 'text-red-600' : 'text-slate-700' // ✅ Internal ID
                                                                    }`}>
                                                                    {getAbsencesByMonth(student.id, index)} {/* ✅ Internal ID */}
                                                                </span>
                                                            ) : (
                                                                <span className={`font-medium ${hasLowFrequency(student.id) ? 'text-red-600' : 'text-slate-700' // ✅ Internal ID
                                                                    }`}>
                                                                    {getPercentageByMonth(student.id, index)} {/* ✅ Internal ID */}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    )
                                                ))}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Paginação */}
                        {totalRecords > 0 && (
                            <div className="flex flex-col md:flex-row items-center justify-between mt-6 gap-4 pt-6 border-t border-slate-200">
                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-medium text-slate-700">Registros por página:</label>
                                    <Select
                                        onValueChange={handleRecordsPerPageChange}
                                        value={recordsPerPage.toString()}
                                    >
                                        <SelectTrigger className="w-20 focus:ring-2 focus:ring-blue-500 border-slate-300">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">5</SelectItem>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="20">20</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="text-sm text-slate-600 bg-slate-50 px-4 py-2 rounded-lg">
                                    <span className="font-medium">Total:</span> {totalRecords} estudantes
                                </div>

                                {totalRecords > recordsPerPage && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="flex items-center gap-1"
                                        >
                                            <ChevronLeft className="w-3 h-3" />
                                            Anterior
                                        </Button>
                                        <div className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg">
                                            Página {currentPage} de {totalPages}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className="flex items-center gap-1"
                                        >
                                            Próxima
                                            <ChevronRight className="w-3 h-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}