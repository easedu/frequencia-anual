"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
    TableHead,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Edit } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

import { useStudents, Estudante } from "@/hooks/useStudents";

export default function CadastrarEstudantePage() {
    const { students, loading, saveStudents, setStudents } = useStudents();

    const [turmaFiltro, setTurmaFiltro] = useState<string>("");
    const [nomeFiltro, setNomeFiltro] = useState<string>("");
    const [statusFiltro, setStatusFiltro] = useState<string>("");
    const [bolsaFamiliaFiltro, setBolsaFamiliaFiltro] = useState<string>("");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [recordsPerPage, setRecordsPerPage] = useState<number>(10);
    const [sortColumn, setSortColumn] = useState<string>("");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set(["turma", "nome", "bolsaFamilia", "status", "actions"])
    );

    const [editingEstudante, setEditingEstudante] = useState<Estudante | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [openModal, setOpenModal] = useState<boolean>(false);

    // Debug dos dados
    useEffect(() => {
        if (!loading && students.length > 0) {
            console.log('Students data:', students);
            console.log('Primeiro estudante:', students[0]);
            console.log('Contém bolsaFamilia?', 'bolsaFamilia' in students[0]);
        }
    }, [students, loading]);

    // --- Filtragem e Ordenação ---
    const turmas = Array.from(new Set(students.map((est) => est.turma))).sort((a, b) => a.localeCompare(b));
    const statusList = Array.from(new Set(students.map((est) => est.status))).sort((a, b) => a.localeCompare(b));
    const bolsaFamiliaOptions = ["SIM", "NÃO"];

    const estudantesFiltrados = students.filter((est) => {
        const matchTurma = turmaFiltro === "" || turmaFiltro === "all" || est.turma === turmaFiltro;
        const matchNome =
            nomeFiltro === "" || est.nome.toLowerCase().includes(nomeFiltro.toLowerCase());
        const matchStatus = statusFiltro === "" || statusFiltro === "all" || est.status === statusFiltro;
        const matchBolsaFamilia = bolsaFamiliaFiltro === "" ||
            bolsaFamiliaFiltro === "all" ||
            (est.bolsaFamilia || "NÃO") === bolsaFamiliaFiltro;
        return matchTurma && matchNome && matchStatus && matchBolsaFamilia;
    });

    const sortData = (data: Estudante[]) => {
        if (sortColumn) {
            return [...data].sort((a, b) => {
                const aValue = (a[sortColumn as keyof Estudante] as string)?.toLowerCase() || "";
                const bValue = (b[sortColumn as keyof Estudante] as string)?.toLowerCase() || "";
                if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
                if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
                return 0;
            });
        }
        return data;
    };

    const sortedData = sortData(estudantesFiltrados);
    const totalRecords = sortedData.length;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = sortedData.slice(indexOfFirstRecord, indexOfLastRecord);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const handleRecordsPerPageChange = (value: string) => {
        setRecordsPerPage(Number(value));
        setCurrentPage(1);
    };

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingEstudante) return;
        if (!editingEstudante.turma || !editingEstudante.nome || !editingEstudante.status) {
            toast.error("Turma, nome e status são obrigatórios.");
            return;
        }

        const newTurma = editingEstudante.turma.toUpperCase();
        const newNome = editingEstudante.nome.toUpperCase();

        // Verifica se já existe um estudante com o mesmo nome e turma (ignorando o estudante sendo editado)
        const duplicateExists = students.some((est, index) =>
            est.turma.toUpperCase() === newTurma &&
            est.nome.toUpperCase() === newNome &&
            (editingIndex === null || index !== editingIndex)
        );

        if (duplicateExists) {
            toast.error("Já existe um estudante com esse nome e turma!");
            return;
        }

        const student = {
            estudanteId: editingEstudante.estudanteId || uuidv4(),
            turma: newTurma,
            nome: newNome,
            status: editingEstudante.status.toUpperCase(),
            bolsaFamilia: editingEstudante.bolsaFamilia || "NÃO", // Valor padrão
        };
        const newStudents = [...students];
        if (editingIndex !== null) {
            newStudents[editingIndex] = student;
        } else {
            newStudents.push(student);
        }
        setStudents(newStudents);
        setEditingEstudante(null);
        setEditingIndex(null);
        setOpenModal(false);
        try {
            await saveStudents(newStudents);
            toast.success("Registro salvo com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar no Firebase:", error);
            toast.error("Erro ao salvar o registro no Firebase.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Skeleton className="h-10 w-3/4" />
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Toaster />

            <div className="container mx-auto p-4 max-w-7xl">
                <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">Cadastro de Estudantes</h2>
                        <Button
                            variant="default"
                            onClick={() => {
                                setEditingEstudante({
                                    turma: "",
                                    nome: "",
                                    status: "ATIVO",
                                    bolsaFamilia: "NÃO",
                                } as Estudante);
                                setEditingIndex(null);
                                setOpenModal(true);
                            }}
                        >
                            + Novo Estudante
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                        <div>
                            <label className="block mb-1 font-semibold">Turma</label>
                            <Select onValueChange={setTurmaFiltro} value={turmaFiltro}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a Turma" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as turmas</SelectItem>
                                    {turmas.map((turma) => (
                                        <SelectItem key={turma} value={turma}>
                                            {turma}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block mb-1 font-semibold">Nome</label>
                            <Input
                                placeholder="Nome do estudante"
                                value={nomeFiltro}
                                onChange={(e) => setNomeFiltro(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-semibold">Bolsa Família</label>
                            <Select onValueChange={setBolsaFamiliaFiltro} value={bolsaFamiliaFiltro}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {bolsaFamiliaOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block mb-1 font-semibold">Status</label>
                            <Select onValueChange={setStatusFiltro} value={statusFiltro}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os status</SelectItem>
                                    {statusList.map((st) => (
                                        <SelectItem key={st} value={st}>
                                            {st}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block mb-1 font-semibold">Colunas visíveis</label>
                            <Select
                                onValueChange={(value) => {
                                    const newColumns = new Set(visibleColumns);
                                    if (newColumns.has(value)) {
                                        newColumns.delete(value);
                                    } else {
                                        newColumns.add(value);
                                    }
                                    setVisibleColumns(newColumns);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione colunas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="turma">Turma</SelectItem>
                                    <SelectItem value="nome">Nome do Estudante</SelectItem>
                                    <SelectItem value="bolsaFamilia">Bolsa Família</SelectItem>
                                    <SelectItem value="status">Status</SelectItem>
                                    <SelectItem value="actions">Ações</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {visibleColumns.has("turma") && (
                                        <TableHead
                                            onClick={() => handleSort("turma")}
                                            className="cursor-pointer font-bold text-center"
                                        >
                                            Turma{" "}
                                            {sortColumn === "turma" && (
                                                <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                                            )}
                                        </TableHead>
                                    )}
                                    {visibleColumns.has("nome") && (
                                        <TableHead
                                            onClick={() => handleSort("nome")}
                                            className="cursor-pointer font-bold"
                                        >
                                            Nome do Estudante{" "}
                                            {sortColumn === "nome" && (
                                                <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                                            )}
                                        </TableHead>
                                    )}
                                    {visibleColumns.has("bolsaFamilia") && (
                                        <TableHead
                                            onClick={() => handleSort("bolsaFamilia")}
                                            className="cursor-pointer font-bold text-center"
                                        >
                                            Bolsa Família{" "}
                                            {sortColumn === "bolsaFamilia" && (
                                                <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                                            )}
                                        </TableHead>
                                    )}
                                    {visibleColumns.has("status") && (
                                        <TableHead
                                            onClick={() => handleSort("status")}
                                            className="cursor-pointer font-bold text-center"
                                        >
                                            Status{" "}
                                            {sortColumn === "status" && (
                                                <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                                            )}
                                        </TableHead>
                                    )}
                                    {visibleColumns.has("actions") && (
                                        <TableHead className="font-bold text-center">Ações</TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentRecords.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={visibleColumns.size}
                                            className="text-center text-gray-500 py-10"
                                        >
                                            Não há estudantes para exibir com os filtros aplicados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    currentRecords.map((est, index) => (
                                        <TableRow key={index}>
                                            {visibleColumns.has("turma") && (
                                                <TableCell className="text-center">{est.turma}</TableCell>
                                            )}
                                            {visibleColumns.has("nome") && (
                                                <TableCell className="text-left">{est.nome}</TableCell>
                                            )}
                                            {visibleColumns.has("bolsaFamilia") && (
                                                <TableCell className="text-center">
                                                    {est.bolsaFamilia || "NÃO INFORMADO"}
                                                </TableCell>
                                            )}
                                            {visibleColumns.has("status") && (
                                                <TableCell className="text-center">{est.status}</TableCell>
                                            )}
                                            {visibleColumns.has("actions") && (
                                                <TableCell className="text-center">
                                                    <Edit
                                                        className="cursor-pointer inline-block"
                                                        onClick={() => {
                                                            const globalIndex = students.findIndex(
                                                                (item) =>
                                                                    item.turma === est.turma &&
                                                                    item.nome === est.nome &&
                                                                    item.status === est.status &&
                                                                    (item.bolsaFamilia || "NÃO") === (est.bolsaFamilia || "NÃO") &&
                                                                    item.estudanteId === est.estudanteId
                                                            );
                                                            setEditingEstudante(est);
                                                            setEditingIndex(globalIndex);
                                                            setOpenModal(true);
                                                        }}
                                                    />
                                                </TableCell>
                                            )}
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
                </div>

                <Dialog open={openModal} onOpenChange={setOpenModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editingIndex !== null ? "Editar Estudante" : "Adicionar Estudante"}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleFormSubmit} className="space-y-4 mt-4">
                            <div>
                                <label className="block mb-1 font-semibold">Turma</label>
                                <Input
                                    placeholder="Digite a turma"
                                    value={editingEstudante?.turma || ""}
                                    onChange={(e) =>
                                        setEditingEstudante({
                                            ...editingEstudante!,
                                            turma: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-semibold">Nome</label>
                                <Input
                                    placeholder="Digite o nome"
                                    value={editingEstudante?.nome || ""}
                                    onChange={(e) =>
                                        setEditingEstudante({
                                            ...editingEstudante!,
                                            nome: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-semibold">Bolsa Família</label>
                                <Select
                                    onValueChange={(value) =>
                                        setEditingEstudante({
                                            ...editingEstudante!,
                                            bolsaFamilia: value as "SIM" | "NÃO",
                                        })
                                    }
                                    value={editingEstudante?.bolsaFamilia || "NÃO"}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SIM">SIM</SelectItem>
                                        <SelectItem value="NÃO">NÃO</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="block mb-1 font-semibold">Status</label>
                                <Select
                                    onValueChange={(value) =>
                                        setEditingEstudante({
                                            ...editingEstudante!,
                                            status: value,
                                        })
                                    }
                                    value={editingEstudante?.status || "ATIVO"}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ATIVO">ATIVO</SelectItem>
                                        <SelectItem value="INATIVO">INATIVO</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit">Salvar</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}