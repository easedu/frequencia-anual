'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { db } from '@/firebase.config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';

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

    // Consulta os dados salvos no Firebase ao carregar a página
    useEffect(() => {
        async function fetchData() {
            try {
                const docRef = doc(db, "2025", "ano_letivo");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
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
                console.error("Erro ao buscar dados do Firebase", error);
            }
        }
        fetchData();
    }, [bimestres]);

    // Salva os dados no Firebase
    async function handleSave() {
        try {
            const dataToSave: { [key: string]: BimesterData } = {};
            bimestres.forEach((bim, index) => {
                dataToSave[bim] = cardData[index] || { startDate: "", endDate: "", dates: [] };
            });
            const docRef = doc(db, "2025", "ano_letivo");
            await setDoc(docRef, dataToSave);
            toast.success("Dados salvos com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar dados no Firebase", error);
            toast.error("Erro ao salvar dados no Firebase");
        }
    }

    return (
        <div>
            {/* Componente Toaster para exibir as notificações */}
            <Toaster />

            <div className="container mx-auto p-4">
                {/* Cabeçalho com título e botão Salvar */}
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold">Cadastro de Ano Letivo</h1>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                    >
                        Salvar
                    </button>
                </div>
                {/* Somatório total de datas selecionadas */}
                <div className="mb-4 font-bold text-lg">
                    Total de Dias Letivos:{" "}
                    {Object.values(cardData).reduce(
                        (sum, data) => sum + data.dates.filter(d => d.isChecked).length,
                        0
                    )}
                </div>
                {/* Exibe os 4 cards lado a lado (em telas maiores) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {bimestres.map((titulo, index) => (
                        <BimesterCard
                            key={index}
                            title={titulo}
                            onDataChange={data => handleDataChange(index, data)}
                            initialStartDate={initialData[index]?.startDate}
                            initialEndDate={initialData[index]?.endDate}
                            initialDates={initialData[index]?.dates}
                        />
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
                console.error("Erro ao interpretar data", error);
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

    return (
        <Card className="p-4">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-2 font-bold">
                    Total: {datesList.filter(item => item.isChecked).length}
                </div>
                <div className="flex flex-col gap-2">
                    <div>
                        <label className="block text-sm font-bold mb-1">Data Início:</label>
                        <Input
                            type="text"
                            placeholder="dd/mm/aaaa"
                            value={startDate}
                            onChange={e => {
                                setStartDate(formatInputDate(e.target.value));
                                setUserModified(true);
                            }}
                            className="w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Data Fim:</label>
                        <Input
                            type="text"
                            placeholder="dd/mm/aaaa"
                            value={endDate}
                            onChange={e => {
                                setEndDate(formatInputDate(e.target.value));
                                setUserModified(true);
                            }}
                            className="w-full"
                        />
                    </div>
                </div>
                {datesList.length > 0 && (
                    <div className="mt-4 flex flex-col gap-2">
                        {datesList.map((item, index) => {
                            const dateStr = formatDateToDDMMYYYY(item.date);
                            const dayName = daysOfWeek[item.date.getDay()];
                            return (
                                <div key={index} className="flex items-center gap-2">
                                    <Checkbox
                                        checked={item.isChecked}
                                        onCheckedChange={() => handleCheckboxChange(item.date)}
                                    />
                                    <span>
                                        {dateStr} ({dayName})
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}