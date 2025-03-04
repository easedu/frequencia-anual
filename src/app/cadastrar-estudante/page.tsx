"use client";

import { useState } from "react";
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

import { useStudents, Estudante } from "@/hooks/useStudents";

export default function CadastrarEstudantePage() {
    const { students, loading, saveStudents, setStudents } = useStudents();

    const [turmaFiltro, setTurmaFiltro] = useState<string>("");
    const [nomeFiltro, setNomeFiltro] = useState<string>("");
    const [statusFiltro, setStatusFiltro] = useState<string>("");
    const [bolsaFamiliaFiltro, setBolsaFamiliaFiltro] = useState<string>(""); // Novo filtro
    const [currentPage] = useState<number>(1);
    const [recordsPerPage] = useState<number>(10);
    const [sortColumn, setSortColumn] = useState<string>("");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

    const [editingEstudante, setEditingEstudante] = useState<Estudante | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [openModal, setOpenModal] = useState<boolean>(false);

    // --- Filtragem e Ordenação ---
    const turmas = Array.from(new Set(students.map((est) => est.turma)));
    const statusList = Array.from(new Set(students.map((est) => est.status)));

    const estudantesFiltrados = students.filter((est) => {
        const matchTurma = turmaFiltro === "" || turmaFiltro === "all" || est.turma === turmaFiltro;
        const matchNome =
            nomeFiltro === "" || est.nome.toLowerCase().includes(nomeFiltro.toLowerCase());
        const matchStatus = statusFiltro === "" || statusFiltro === "all" || est.status === statusFiltro;
        const matchBolsaFamilia = bolsaFamiliaFiltro === "" || bolsaFamiliaFiltro === "all" || est.bolsaFamilia === bolsaFamiliaFiltro;
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

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingEstudante) return;
        if (!editingEstudante.turma || !editingEstudante.nome || !editingEstudante.status || !editingEstudante.bolsaFamilia) {
            toast.error("Todos os campos são obrigatórios.");
            return;
        }
        const student = {
            estudanteId: editingEstudante.estudanteId || uuidv4(),
            turma: editingEstudante.turma.toUpperCase(),
            nome: editingEstudante.nome.toUpperCase(),
            status: editingEstudante.status.toUpperCase(),
            bolsaFamilia: editingEstudante.bolsaFamilia // Novo campo
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
                <p>Carregando dados...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Toaster />

            <div className="container mx-auto p-4 max-w-7xl">
                <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">Cadastro de Estudante</h2>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="default"
                                onClick={() => {
                                    setEditingEstudante({
                                        turma: "",
                                        nome: "",
                                        status: "ATIVO",
                                        bolsaFamilia: "NÃO" // Valor padrão
                                    } as Estudante);
                                    setEditingIndex(null);
                                    setOpenModal(true);
                                }}
                            >
                                + Novo Estudante
                            </Button>
                        </div>
                    </div>
                    {/* Filtros */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4"> {/* Mudado para 4 colunas */}
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
                        <Input
                            placeholder="Nome do estudante"
                            value={nomeFiltro}
                            onChange={(e) => setNomeFiltro(e.target.value)}
                        />
                        <Select onValueChange={setBolsaFamiliaFiltro} value={bolsaFamiliaFiltro}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a Bolsa Família" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="SIM">Sim</SelectItem>
                                <SelectItem value="NÃO">Não</SelectItem>
                            </SelectContent>
                        </Select>
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
                    {/* Tabela de Estudantes */}
                    {students.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">
                            Não há nenhum estudante.
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead
                                                onClick={() => handleSort("turma")}
                                                className="cursor-pointer"
                                            >
                                                Turma {sortColumn === "turma" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                                            </TableHead>
                                            <TableHead
                                                onClick={() => handleSort("nome")}
                                                className="cursor-pointer"
                                            >
                                                Nome do Estudante {sortColumn === "nome" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                                            </TableHead>
                                            <TableHead
                                                onClick={() => handleSort("bolsaFamilia")}
                                                className="cursor-pointer"
                                            >
                                                Bolsa Família {sortColumn === "bolsaFamilia" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                                            </TableHead>
                                            <TableHead
                                                onClick={() => handleSort("status")}
                                                className="cursor-pointer"
                                            >
                                                Status {sortColumn === "status" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                                            </TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {currentRecords.map((est, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{est.turma}</TableCell>
                                                <TableCell>{est.nome}</TableCell>
                                                <TableCell>{est.bolsaFamilia}</TableCell>
                                                <TableCell>{est.status}</TableCell>
                                                <TableCell>
                                                    <Edit
                                                        className="cursor-pointer"
                                                        onClick={() => {
                                                            const globalIndex = students.findIndex(
                                                                (item) =>
                                                                    item.turma === est.turma &&
                                                                    item.nome === est.nome &&
                                                                    item.status === est.status &&
                                                                    item.bolsaFamilia === est.bolsaFamilia &&
                                                                    item.estudanteId === est.estudanteId
                                                            );
                                                            setEditingEstudante(est);
                                                            setEditingIndex(globalIndex);
                                                            setOpenModal(true);
                                                        }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {/* Paginação - permanece igual */}
                            <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-2">
                                {/* ... código de paginação existente ... */}
                            </div>
                        </>
                    )}
                </div>
                {/* Modal de Cadastro/Edição */}
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
                                    value={editingEstudante?.bolsaFamilia || ""}
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
                                    value={editingEstudante?.status || ""}
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