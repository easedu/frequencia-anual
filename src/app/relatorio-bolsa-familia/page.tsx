"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
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

export default function RelatorioFaltasPage() {
    const [students, setStudents] = useState<Estudante[]>([]);
    const [absenceRecords, setAbsenceRecords] = useState<AbsenceRecord[]>([]);
    const [loadingStudents, setLoadingStudents] = useState<boolean>(true);
    const [loadingAbsences, setLoadingAbsences] = useState<boolean>(true);
    const [searchFilter, setSearchFilter] = useState<string>("");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [recordsPerPage, setRecordsPerPage] = useState<number>(10);

    const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ] as const;

    // Pré-selecionar o mês atual diretamente no estado inicial
    const currentMonthIndex = new Date().getMonth(); // 0-based index
    const currentMonth = months[currentMonthIndex];
    const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set([currentMonth]));

    // Carregar estudantes e faltas
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
    }, []);

    // Filtrar alunos e aplicar busca genérica
    const filteredStudents = students
        .filter(student =>
            searchFilter === "" ||
            student.turma.toLowerCase().includes(searchFilter.toLowerCase()) ||
            student.nome.toLowerCase().includes(searchFilter.toLowerCase())
        )
        .sort((a, b) => a.nome.localeCompare(b.nome));

    // Paginação
    const totalRecords = filteredStudents.length;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredStudents.slice(indexOfFirstRecord, indexOfLastRecord);

    // Calcular faltas por mês para cada estudante
    const getAbsencesByMonth = (estudanteId: string, monthIndex: number): number => {
        return absenceRecords.filter(record => {
            const recordDate = new Date(record.data);
            return (
                record.estudanteId === estudanteId &&
                recordDate.getMonth() === monthIndex
            );
        }).length;
    };

    // Manipular seleção de meses
    const handleMonthChange = (month: string): void => {
        const newSelectedMonths = new Set(selectedMonths);
        if (newSelectedMonths.has(month)) {
            newSelectedMonths.delete(month);
        } else {
            newSelectedMonths.add(month);
        }
        setSelectedMonths(newSelectedMonths);
    };

    // Manipular mudança de registros por página
    const handleRecordsPerPageChange = (value: string): void => {
        setRecordsPerPage(Number(value));
        setCurrentPage(1);
    };

    // Manipular mudança de página
    const handlePageChange = (page: number): void => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
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
                        <CardTitle>Relatório de Faltas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4">
                            <Input
                                placeholder="Buscar por turma ou nome..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                            />
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
                                                    {month}
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
                                            <TableRow key={student.estudanteId}>
                                                <TableCell className="text-center">{student.turma}</TableCell>
                                                <TableCell>{student.nome}</TableCell>
                                                {months.map((month, index) => (
                                                    selectedMonths.has(month) && (
                                                        <TableCell key={month} className="text-center">
                                                            {getAbsencesByMonth(student.estudanteId, index)}
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