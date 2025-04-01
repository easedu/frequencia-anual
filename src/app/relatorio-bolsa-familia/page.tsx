"use client";

import { useState, useEffect, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, getDocs, getDoc, doc, DocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/firebase.config";

interface Estudante {
    estudanteId: string;
    turma: string;
    nome: string;
    status: string;
    bolsaFamilia: "SIM" | "NÃO";
}

interface AbsenceRecord {
    estudanteId: string;
    turma: string;
    data: string;
    docId: string;
}

interface AnoLetivoData {
    "1º Bimestre"?: BimesterData;
    "2º Bimestre"?: BimesterData;
    "3º Bimestre"?: BimesterData;
    "4º Bimestre"?: BimesterData;
}

interface BimesterData {
    startDate?: string;
    dates: BimesterDate[];
}

interface BimesterDate {
    date: string;
    isChecked: boolean;
}

const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
] as const;

export default function RelatorioFaltasPage() {
    const [students, setStudents] = useState<Estudante[]>([]);
    const [absenceRecords, setAbsenceRecords] = useState<AbsenceRecord[]>([]);
    const [loadingStudents, setLoadingStudents] = useState<boolean>(true);
    const [loadingAbsences, setLoadingAbsences] = useState<boolean>(true);
    const [searchFilter, setSearchFilter] = useState<string>("");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [recordsPerPage, setRecordsPerPage] = useState<number>(10);
    const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set([new Date().toLocaleString('pt-BR', { month: 'long' }).charAt(0).toUpperCase() + new Date().toLocaleString('pt-BR', { month: 'long' }).slice(1)]));
    const [showAbsences, setShowAbsences] = useState<boolean>(false);
    const [showFrequency, setShowFrequency] = useState<boolean>(true);
    const [diasLetivos, setDiasLetivos] = useState<{ [key: number]: number }>({});

    const parseDate = (dateStr: string): Date | null => {
        const [day, month, year] = dateStr.split('/').map(Number);
        if (!day || !month || !year) return null;
        return new Date(year, month - 1, day);
    };

    const calculateDiasLetivos = useCallback(async () => {
        try {
            const docRef = doc(db, "2025", "ano_letivo");
            const docSnap: DocumentSnapshot<DocumentData> = await getDoc(docRef);
            if (!docSnap.exists()) return {};

            const anoData = docSnap.data() as AnoLetivoData;
            const diasPorMes: { [key: number]: number } = {};

            months.forEach((_, index) => {
                diasPorMes[index] = 0;
            });

            for (const key in anoData) {
                const bimesterData = anoData[key as keyof AnoLetivoData];
                if (bimesterData?.dates) {
                    bimesterData.dates.forEach((d: BimesterDate) => {
                        if (d.isChecked && d.date) {
                            const date = parseDate(d.date);
                            if (date) {
                                const monthIndex = date.getMonth();
                                diasPorMes[monthIndex] = (diasPorMes[monthIndex] || 0) + 1;
                            }
                        }
                    });
                }
            }
            setDiasLetivos(diasPorMes);
        } catch (error) {
            console.error("Erro ao calcular dias letivos:", error);
            return {};
        }
    }, []);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const studentsDocSnap = await getDoc(doc(db, "2025", "lista_de_estudantes"));
                let studentList: Estudante[] = [];
                if (studentsDocSnap.exists()) {
                    const studentData = studentsDocSnap.data() as { estudantes: Estudante[] };
                    studentList = (studentData.estudantes || []).filter(
                        (student: Estudante) => student.status === "ATIVO" && student.bolsaFamilia === "SIM"
                    );
                }
                setStudents(studentList);
            } catch (error) {
                console.error("Erro ao carregar estudantes:", error);
            } finally {
                setLoadingStudents(false);
            }
        };

        const fetchAbsences = async () => {
            try {
                const absenceSnapshot = await getDocs(collection(db, "2025", "faltas", "controle"));
                const records: AbsenceRecord[] = absenceSnapshot.docs.map(doc => ({
                    estudanteId: doc.data().estudanteId,
                    turma: doc.data().turma,
                    data: doc.data().data,
                    docId: doc.id,
                }));
                setAbsenceRecords(records);
            } catch (error) {
                console.error("Erro ao carregar faltas:", error);
            } finally {
                setLoadingAbsences(false);
            }
        };

        fetchStudents();
        fetchAbsences();
        calculateDiasLetivos();
    }, [calculateDiasLetivos]);

    const filteredStudents = students
        .filter(student =>
            searchFilter === "" ||
            student.turma.toLowerCase().includes(searchFilter.toLowerCase()) ||
            student.nome.toLowerCase().includes(searchFilter.toLowerCase())
        )
        .sort((a, b) => a.nome.localeCompare(b.nome));

    const totalRecords = filteredStudents.length;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredStudents.slice(indexOfFirstRecord, indexOfLastRecord);

    const getAbsencesByMonth = (estudanteId: string, monthIndex: number): number => {
        return absenceRecords.filter(record => {
            const recordDate = new Date(record.data);
            return (
                record.estudanteId === estudanteId &&
                recordDate.getMonth() === monthIndex
            );
        }).length;
    };

    const getPercentageByMonth = (estudanteId: string, monthIndex: number): string => {
        const absences = getAbsencesByMonth(estudanteId, monthIndex);
        const diasLetivosMes = diasLetivos[monthIndex] || 0;
        const frequency = diasLetivosMes > 0 ? (1 - absences / diasLetivosMes) * 100 : 100;
        return frequency.toFixed(1) + "%";
    };

    const hasLowFrequency = (estudanteId: string): boolean => {
        return months.some((month, index) => {
            if (selectedMonths.has(month) && showFrequency) {
                const absences = getAbsencesByMonth(estudanteId, index);
                const diasLetivosMes = diasLetivos[index] || 0;
                const frequency = diasLetivosMes > 0 ? (1 - absences / diasLetivosMes) * 100 : 100;
                return frequency < 75;
            }
            return false;
        });
    };

    const handleMonthChange = (month: string): void => {
        const newSelectedMonths = new Set(selectedMonths);
        if (newSelectedMonths.has(month)) {
            newSelectedMonths.delete(month);
        } else {
            newSelectedMonths.add(month);
        }
        setSelectedMonths(newSelectedMonths);
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
            console.error("Não foi possível acessar o documento do iframe.");
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
                <h1>Relatório de Faltas</h1>
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
                                <tr class="${hasLowFrequency(student.estudanteId) ? 'low-frequency' : ''}">
                                    <td>${student.turma}</td>
                                    <td>${student.nome}</td>
                                    ${months
                        .filter(month => selectedMonths.has(month))
                        .map((month) => {
                            const monthIndex = months.indexOf(month);
                            const absences = getAbsencesByMonth(student.estudanteId, monthIndex);
                            const percentage = getPercentageByMonth(student.estudanteId, monthIndex);
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

    if (loadingStudents || loadingAbsences) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-full max-w-7xl p-4">
                    <Skeleton className="h-10 w-full mb-4" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="container mx-auto p-4 max-w-7xl">
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Filtros de Meses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {months.map((month) => (
                                <div key={month} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={month}
                                        checked={selectedMonths.has(month)}
                                        onCheckedChange={() => handleMonthChange(month)}
                                    />
                                    <label htmlFor={month} className="text-sm">{month}</label>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Relatório de Faltas</CardTitle>
                            <Button size="sm" onClick={handlePrint}>
                                Imprimir Relatório
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 flex items-center space-x-4">
                            <Input
                                placeholder="Buscar por turma ou nome..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className="flex-1"
                            />
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="showAbsences"
                                    checked={showAbsences}
                                    onCheckedChange={(checked) => setShowAbsences(checked as boolean)}
                                />
                                <label htmlFor="showAbsences" className="text-sm">Faltas</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="showFrequency"
                                    checked={showFrequency}
                                    onCheckedChange={(checked) => setShowFrequency(checked as boolean)}
                                />
                                <label htmlFor="showFrequency" className="text-sm">Frequência</label>
                            </div>
                        </div>

                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="font-bold text-center">Turma</TableHead>
                                        <TableHead className="font-bold">Nome do Estudante</TableHead>
                                        {months.map((month) => (
                                            selectedMonths.has(month) && (
                                                <TableHead key={month} className="font-bold text-center">
                                                    {month} ({diasLetivos[months.indexOf(month)] || 0} dias)
                                                    {(showAbsences && showFrequency) ? <><br />Faltas | %</> : showAbsences ? <><br />Faltas</> : <><br />%</>}
                                                </TableHead>
                                            )
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentRecords.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={2 + selectedMonths.size} className="text-center py-10">
                                                Nenhum estudante encontrado com os filtros aplicados.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        currentRecords.map(student => (
                                            <TableRow key={student.estudanteId} className={hasLowFrequency(student.estudanteId) ? 'text-red-500 font-bold' : ''}>
                                                <TableCell className="text-center">{student.turma}</TableCell>
                                                <TableCell>{student.nome}</TableCell>
                                                {months.map((month, index) => (
                                                    selectedMonths.has(month) && (
                                                        <TableCell key={month} className="text-center">
                                                            {showAbsences && showFrequency ? (
                                                                <div className="flex justify-center items-center">
                                                                    <span className="w-12 text-right">{getAbsencesByMonth(student.estudanteId, index)}</span>
                                                                    <span className="mx-1">|</span>
                                                                    <span className="w-12 text-left">{getPercentageByMonth(student.estudanteId, index)}</span>
                                                                </div>
                                                            ) : showAbsences ? (
                                                                getAbsencesByMonth(student.estudanteId, index)
                                                            ) : (
                                                                getPercentageByMonth(student.estudanteId, index)
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

                        {totalRecords > 0 && (
                            <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-2">
                                <div className="flex items-center space-x-2">
                                    <label className="font-semibold">Registros por página:</label>
                                    <Select
                                        onValueChange={handleRecordsPerPageChange}
                                        value={recordsPerPage.toString()}
                                    >
                                        <SelectTrigger className="w-20">
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

                                <p className="text-sm text-gray-700">
                                    Total de registros: {totalRecords}
                                </p>

                                {totalRecords > recordsPerPage && (
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                        >
                                            Anterior
                                        </Button>
                                        <span className="text-sm">
                                            Página {currentPage} de {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                        >
                                            Próxima
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