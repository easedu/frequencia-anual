'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AcademicYearService } from '@/services/supabase/academicYearService';
import { logger } from '@/utils/logger';
import { toast, Toaster } from 'sonner';
import { Calendar, Save, BookOpen, Clock, CheckCircle2 } from 'lucide-react';

/* ==================== TIPOS E CONSTANTES ==================== */

export interface BimesterData {
    startDate: string; // dd/mm/aaaa
    endDate: string;   // dd/mm/aaaa
    dates: { date: string; isChecked: boolean }[];
}

export interface BimesterCardProps {
    title: string;
    onDataChange?: (data: BimesterData) => void;
    initialStartDate?: string;
    initialEndDate?: string;
    initialDates?: { date: string; isChecked: boolean }[];
}

/** Interface para os itens da lista de datas */
export interface DateItem {
    date: Date;
    isChecked: boolean;
}

const daysOfWeek: string[] = [
    'domingo',
    'segunda-feira',
    'terça-feira',
    'quarta-feira',
    'quinta-feira',
    'sexta-feira',
    'sábado'
];

/* ==================== EXPORT DEFAULT (COMPOSIÇÃO DA PÁGINA) ==================== */

/**
 * Componente principal da página de Cadastro de Ano Letivo.
 */
export default function CadastrarAnoLetivoPage() {
    const bimestres = useMemo(
        () => ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'],
        []
    );
    const [cardData, setCardData] = useState<{ [key: number]: BimesterData }>({});
    const [initialData, setInitialData] = useState<{ [key: number]: BimesterData }>({});

    // Recebe os dados de cada card
    function handleDataChange(index: number, data: BimesterData) {
        setCardData(prev => ({ ...prev, [index]: data }));
    }

    // Função auxiliar para converter data ISO para DD/MM/YYYY
    function convertISOtoDDMMYYYY(dateStr: string): string {
        if (!dateStr) return "";

        // Se já está em DD/MM/YYYY, retorna
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            return dateStr;
        }

        // Se está em YYYY-MM-DD (ISO), converte
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        }

        return dateStr;
    }

    // Consulta os dados salvos no Supabase ao carregar a página
    useEffect(() => {
        async function fetchData() {
            try {
                const data = await AcademicYearService.getAcademicYearComplete(2025);

                if (Object.keys(data).length > 0) {
                    const newInitialData: { [key: number]: BimesterData } = {};
                    bimestres.forEach((bim, index) => {
                        if (data[bim]) {
                            newInitialData[index] = data[bim];
                        }
                    });
                    setInitialData(newInitialData);
                    setCardData(newInitialData);
                }
            } catch (error) {
                logger.error("Erro ao buscar dados do Supabase", error as Error);
            }
        }
        fetchData();
    }, [bimestres]);

    // Salva os dados no Supabase
    async function handleSave() {
        try {
            const dataToSave: { [key: string]: BimesterData } = {};
            bimestres.forEach((bim, index) => {
                dataToSave[bim] = cardData[index] || { startDate: "", endDate: "", dates: [] };
            });

            await AcademicYearService.saveAcademicYearComplete(2025, dataToSave);
            toast.success("Dados salvos com sucesso!");
        } catch (error) {
            logger.error("Erro ao salvar dados no Supabase", error as Error);
            toast.error("Erro ao salvar dados. Tente novamente.");
        }
    }

    const totalDaysSelected = Object.values(cardData).reduce(
        (sum, data) => sum + data.dates.filter(d => d.isChecked).length,
        0
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <Toaster />

            <div className="container mx-auto p-6 max-w-7xl">
                {/* Header unificado */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <BookOpen className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-800">Ano Letivo 2025</h1>
                                    <p className="text-slate-600 mt-1">Configure os períodos e dias letivos</p>
                                </div>
                            </div>

                            {/* Stats integrado */}
                            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                                <div className="p-2 bg-green-50 rounded-lg">
                                    <Calendar className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600">Total de Dias Letivos</p>
                                    <p className="text-2xl font-bold text-green-600">{totalDaysSelected}</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 
                                     text-white rounded-lg hover:from-blue-700 hover:to-blue-800 
                                     transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            <Save className="w-4 h-4" />
                            Salvar
                        </button>
                    </div>
                </div>

                {/* Cards dos Bimestres */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                    {bimestres.map((titulo, index) => (
                        <div key={index} className="flex">
                            <BimesterCard
                                title={titulo}
                                onDataChange={data => handleDataChange(index, data)}
                                initialStartDate={initialData[index]?.startDate}
                                initialEndDate={initialData[index]?.endDate}
                                initialDates={initialData[index]?.dates}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ==================== FUNÇÕES AUXILIARES ==================== */

function formatInputDate(value: string): string {
    const digits = value.replace(/\D/g, '');
    let formatted = '';
    if (digits.length > 0) {
        formatted = digits.substring(0, 2);
        if (digits.length >= 3) {
            formatted += '/' + digits.substring(2, 4);
        }
        if (digits.length >= 5) {
            formatted += '/' + digits.substring(4, 8);
        }
    }
    return formatted;
}

function padTo2Digits(num: number): string {
    return num.toString().padStart(2, '0');
}

function formatDateToDDMMYYYY(date: Date): string {
    return [padTo2Digits(date.getDate()), padTo2Digits(date.getMonth() + 1), date.getFullYear()].join('/');
}

function parseDateFromDDMMYYYY(dateString: string): Date {
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
}

/* ==================== COMPONENTE BimesterCard ==================== */

/**
 * Componente que exibe um card para cada bimestre,
 * permitindo configurar a data de início e fim e exibindo os checkboxes.
 */
function BimesterCard({
    title,
    onDataChange,
    initialStartDate = '',
    initialEndDate = '',
    initialDates,
}: BimesterCardProps) {
    // Estados dos inputs (formato dd/mm/aaaa)
    const [startDate, setStartDate] = useState<string>(initialStartDate);
    const [endDate, setEndDate] = useState<string>(initialEndDate);
    // Estado da lista de datas (para os checkboxes)
    const [datesList, setDatesList] = useState<DateItem[]>([]);
    // Indica se o usuário modificou manualmente os inputs
    const [userModified, setUserModified] = useState(false);

    // Atualiza os inputs quando as props iniciais mudam (após carregar do Firebase)
    useEffect(() => {
        if (initialStartDate) {
            setStartDate(initialStartDate);
        }
    }, [initialStartDate]);

    useEffect(() => {
        if (initialEndDate) {
            setEndDate(initialEndDate);
        }
    }, [initialEndDate]);

    // Se houver dados do Firebase para os checkboxes e o usuário ainda não modificou os inputs, use-os
    useEffect(() => {
        if (initialDates && initialDates.length > 0 && !userModified) {
            const newDatesList = initialDates.map(item => ({
                date: parseDateFromDDMMYYYY(item.date),
                isChecked: item.isChecked,
            }));
            setDatesList(newDatesList);
        }
    }, [initialDates, userModified]);

    // Recalcula os checkboxes se os inputs forem alterados manualmente ou se não houver dados iniciais
    useEffect(() => {
        if (
            startDate &&
            endDate &&
            startDate.length === 10 &&
            endDate.length === 10 &&
            (userModified || !initialDates || initialDates.length === 0)
        ) {
            try {
                const start = parseDateFromDDMMYYYY(startDate);
                const end = parseDateFromDDMMYYYY(endDate);
                if (start > end) {
                    setDatesList([]);
                    return;
                }
                const tempList: DateItem[] = [];
                const current = new Date(start);
                while (current <= end) {
                    const day = current.getDay();
                    const isWeekday = day !== 0 && day !== 6;
                    tempList.push({ date: new Date(current), isChecked: isWeekday });
                    current.setDate(current.getDate() + 1);
                }
                tempList.sort((a, b) => a.date.getTime() - b.date.getTime());
                setDatesList(tempList);
            } catch (error) {
                logger.error("Erro ao interpretar data", error as Error);
                setDatesList([]);
            }
        }
    }, [startDate, endDate, userModified, initialDates]);

    // Repassa os dados para o componente pai
    useEffect(() => {
        if (onDataChange) {
            onDataChange({
                startDate,
                endDate,
                dates: datesList.map(item => ({
                    date: formatDateToDDMMYYYY(item.date),
                    isChecked: item.isChecked,
                })),
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate, datesList]);

    // Permite alternar a seleção dos checkboxes
    function handleCheckboxChange(date: Date) {
        setDatesList(prev =>
            prev.map(item =>
                item.date.getTime() === date.getTime() ? { ...item, isChecked: !item.isChecked } : item
            )
        );
    }

    const selectedDays = datesList.filter(item => item.isChecked).length;
    const totalDays = datesList.length;

    return (
        <Card className="bg-white hover:shadow-lg transition-all duration-300 border-slate-200 overflow-hidden flex flex-col h-full">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 flex-shrink-0">
                <CardTitle className="flex items-center justify-between text-slate-800">
                    <span className="text-lg font-semibold">{title}</span>
                    <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span className="font-bold text-blue-600">{selectedDays}</span>
                        <span className="text-slate-500">/ {totalDays}</span>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col">
                {/* Inputs de Data */}
                <div className="space-y-3 mb-4 flex-shrink-0">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Data Início</label>
                        <Input
                            type="text"
                            placeholder="dd/mm/aaaa"
                            value={startDate}
                            onChange={e => {
                                setStartDate(formatInputDate(e.target.value));
                                setUserModified(true);
                            }}
                            className="text-sm focus:ring-2 focus:ring-blue-500 border-slate-300"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Data Fim</label>
                        <Input
                            type="text"
                            placeholder="dd/mm/aaaa"
                            value={endDate}
                            onChange={e => {
                                setEndDate(formatInputDate(e.target.value));
                                setUserModified(true);
                            }}
                            className="text-sm focus:ring-2 focus:ring-blue-500 border-slate-300"
                        />
                    </div>
                </div>

                {/* Lista de Datas */}
                {datesList.length > 0 && (
                    <div className="space-y-1 flex-1 flex flex-col">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 pb-2 border-b border-slate-200 flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Dias do Período</span>
                        </div>
                        <div className="flex-1 space-y-1">
                            {datesList.map((item, index) => {
                                const dateStr = formatDateToDDMMYYYY(item.date);
                                const dayName = daysOfWeek[item.date.getDay()];
                                const isWeekend = item.date.getDay() === 0 || item.date.getDay() === 6;

                                return (
                                    <div
                                        key={index}
                                        className={`flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 transition-colors ${item.isChecked ? 'bg-blue-50 border border-blue-200' : ''
                                            }`}
                                    >
                                        <Checkbox
                                            checked={item.isChecked}
                                            onCheckedChange={() => handleCheckboxChange(item.date)}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                        />
                                        <span className={`text-sm flex-1 ${isWeekend ? 'text-red-600' : 'text-slate-700'
                                            }`}>
                                            <span className="font-medium">{dateStr}</span>
                                            <span className="text-slate-500 ml-2">({dayName})</span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {datesList.length === 0 && startDate && endDate && (
                    <div className="text-center py-8 text-slate-500 flex-1 flex flex-col justify-center">
                        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Configure as datas para ver os dias disponíveis</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}