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
import { Edit, Trash2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

import { useStudents, Estudante } from "@/hooks/useStudents";

// Interface para Contato
interface Contato {
    nome: string;
    telefone: string;
}

// Interface para Endereço
interface Endereco {
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    complemento: string;
}

// Funções utilitárias para contatos
const formatTelefone = (telefone: string): string => {
    const digits = telefone.replace(/\D/g, "");
    if (digits.length === 0) {
        return "";
    } else if (digits.length <= 2) {
        return `(${digits}`;
    } else if (digits.length <= 6) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length <= 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
};

const cleanTelefone = (telefone: string): string => {
    return telefone.replace(/\D/g, "");
};

const validateTelefone = (telefone: string): boolean => {
    const cleanedTelefone = cleanTelefone(telefone);
    return cleanedTelefone.length === 10 || cleanedTelefone.length === 11;
};

const validateNomeContato = (nome: string): boolean => {
    return nome.trim().length >= 2 && nome.trim().length <= 100;
};

const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const formatCep = (cep: string): string => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length <= 5) {
        return digits;
    }
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
};

const cleanCep = (cep: string): string => {
    return cep.replace(/\D/g, "");
};

const validateCep = (cep: string): boolean => {
    const cleanedCep = cleanCep(cep);
    return cleanedCep.length === 8;
};

// Funções para Data de Nascimento
const formatDataNascimento = (data: string): string => {
    const digits = data.replace(/\D/g, "");
    if (digits.length === 0) {
        return "";
    } else if (digits.length <= 2) {
        return digits;
    } else if (digits.length <= 4) {
        return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }
};

const cleanDataNascimento = (data: string): string => {
    return data.replace(/\D/g, "");
};

const validateDataNascimento = (data: string): boolean => {
    const cleanedData = cleanDataNascimento(data);
    if (cleanedData.length === 0) {
        return true; // Campo não é obrigatório
    }
    if (cleanedData.length !== 8) {
        return false; // Deve ter 8 dígitos (ddmmaaaa)
    }

    const day = parseInt(cleanedData.slice(0, 2), 10);
    const month = parseInt(cleanedData.slice(2, 4), 10);
    const year = parseInt(cleanedData.slice(4, 8), 10);

    // Verifica formato básico
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) {
        return false;
    }

    // Verifica meses com menos de 31 dias
    if ([4, 6, 9, 11].includes(month) && day > 30) {
        return false;
    }

    // Verifica fevereiro e anos bissextos
    if (month === 2) {
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        if (day > (isLeapYear ? 29 : 28)) {
            return false;
        }
    }

    // Verifica se a data é anterior à data atual
    const inputDate = new Date(year, month - 1, day);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Ignora horário
    if (inputDate >= currentDate) {
        return false;
    }

    return true;
};

// Função para consultar a API do ViaCEP
const fetchAddressFromCep = async (cep: string): Promise<Endereco | null> => {
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) {
            throw new Error("Erro na consulta do CEP");
        }
        const data = await response.json();
        if (data.erro) {
            throw new Error("CEP não encontrado");
        }
        return {
            rua: data.logradouro || "",
            numero: "",
            bairro: data.bairro || "",
            cidade: data.localidade || "",
            estado: data.uf || "",
            cep: cep,
            complemento: data.complemento || "",
        };
    } catch (error) {
        console.error("Erro ao consultar ViaCEP:", error);
        return null;
    }
};

export default function CadastrarEstudantePage() {
    const { students, loading, saveStudents, setStudents } = useStudents();

    const [turmaFiltro, setTurmaFiltro] = useState<string>("");
    const [nomeFiltro, setNomeFiltro] = useState<string>("");
    const [statusFiltro, setStatusFiltro] = useState<string>("");
    const [bolsaFamiliaFiltro, setBolsaFamiliaFiltro] = useState<string>("");
    const [contatoFiltro, setContatoFiltro] = useState<string>("");
    const [emailFiltro, setEmailFiltro] = useState<string>("");
    const [enderecoFiltro, setEnderecoFiltro] = useState<string>("");
    const [dataNascimentoFiltro, setDataNascimentoFiltro] = useState<string>("");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [recordsPerPage, setRecordsPerPage] = useState<number>(10);
    const [sortColumn, setSortColumn] = useState<string>("");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set([
            "turma",
            "nome",
            "dataNascimento",
            "bolsaFamilia",
            "status",
            "contatos",
            "email",
            "endereco",
            "actions",
        ])
    );

    const [editingEstudante, setEditingEstudante] = useState<Estudante | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [openModal, setOpenModal] = useState<boolean>(false);

    // Debug dos dados
    useEffect(() => {
        if (!loading && students.length > 0) {
            console.log("Students data:", students);
            console.log("Primeiro estudante:", students[0]);
            console.log("Contém bolsaFamilia?", "bolsaFamilia" in students[0]);
            console.log("Contém contatos?", "contatos" in students[0]);
            console.log("Contém email?", "email" in students[0]);
            console.log("Contém endereco?", "endereco" in students[0]);
            console.log("Contém dataNascimento?", "dataNascimento" in students[0]);
        }
    }, [students, loading]);

    // Efeito para consultar CEP quando o campo CEP tem 8 dígitos
    useEffect(() => {
        if (editingEstudante?.endereco?.cep) {
            const cleanedCep = cleanCep(editingEstudante.endereco.cep);
            if (cleanedCep.length === 8) {
                fetchAddressFromCep(cleanedCep).then((address) => {
                    if (address) {
                        setEditingEstudante((prev) => ({
                            ...prev!,
                            endereco: {
                                ...prev!.endereco!,
                                rua: address.rua,
                                bairro: address.bairro,
                                cidade: address.cidade,
                                estado: address.estado,
                                complemento: address.complemento,
                            },
                        }));
                    } else {
                        toast.error("CEP não encontrado ou inválido.");
                    }
                });
            }
        }
    }, [editingEstudante?.endereco?.cep]);

    // Efeito para limpar campos de endereço se CEP for incompleto
    useEffect(() => {
        if (editingEstudante?.endereco?.cep) {
            const cleanedCep = cleanCep(editingEstudante.endereco.cep);
            if (cleanedCep.length > 0 && cleanedCep.length < 8) {
                setEditingEstudante((prev) => ({
                    ...prev!,
                    endereco: {
                        ...prev!.endereco!,
                        rua: "",
                        numero: "",
                        bairro: "",
                        cidade: "",
                        estado: "",
                        complemento: "",
                    },
                }));
            }
        }
    }, [editingEstudante?.endereco?.cep]);

    // --- Filtragem e Ordenação ---
    const turmas = Array.from(new Set(students.map((est) => est.turma))).sort((a, b) =>
        a.localeCompare(b)
    );
    const statusList = Array.from(new Set(students.map((est) => est.status))).sort((a, b) =>
        a.localeCompare(b)
    );
    const bolsaFamiliaOptions = ["SIM", "NÃO"];

    const estudantesFiltrados = students.filter((est) => {
        const matchTurma =
            turmaFiltro === "" || turmaFiltro === "all" || est.turma === turmaFiltro;
        const matchNome =
            nomeFiltro === "" ||
            est.nome.toLowerCase().includes(nomeFiltro.toLowerCase());
        const matchStatus =
            statusFiltro === "" || statusFiltro === "all" || est.status === statusFiltro;
        const matchBolsaFamilia =
            bolsaFamiliaFiltro === "" ||
            bolsaFamiliaFiltro === "all" ||
            est.bolsaFamilia === bolsaFamiliaFiltro;
        const matchContato =
            contatoFiltro === "" ||
            (est.contatos?.some(
                (contato) =>
                    contato.nome.toLowerCase().includes(contatoFiltro.toLowerCase()) ||
                    formatTelefone(contato.telefone).includes(contatoFiltro)
            ) ?? false);
        const matchEmail =
            emailFiltro === "" ||
            (est.email?.toLowerCase().includes(emailFiltro.toLowerCase()) ?? false);
        const matchEndereco =
            enderecoFiltro === "" ||
            (est.endereco
                ? `${est.endereco.rua} ${est.endereco.numero} ${est.endereco.bairro} ${est.endereco.cidade} ${est.endereco.estado} ${formatCep(est.endereco.cep)} ${est.endereco.complemento}`
                    .toLowerCase()
                    .includes(enderecoFiltro.toLowerCase())
                : false);
        const matchDataNascimento =
            dataNascimentoFiltro === "" ||
            (est.dataNascimento?.includes(cleanDataNascimento(dataNascimentoFiltro)) ?? false);
        return (
            matchTurma &&
            matchNome &&
            matchStatus &&
            matchBolsaFamilia &&
            matchContato &&
            matchEmail &&
            matchEndereco &&
            matchDataNascimento
        );
    });

    const sortData = (data: Estudante[]) => {
        if (sortColumn) {
            return [...data].sort((a, b) => {
                if (sortColumn === "contatos") {
                    const aValue =
                        a.contatos && a.contatos.length > 0
                            ? a.contatos[0].nome.toLowerCase()
                            : "";
                    const bValue =
                        b.contatos && b.contatos.length > 0
                            ? b.contatos[0].nome.toLowerCase()
                            : "";
                    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
                    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
                    return 0;
                }
                if (sortColumn === "email") {
                    const aValue = a.email?.toLowerCase() || "";
                    const bValue = b.email?.toLowerCase() || "";
                    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
                    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
                    return 0;
                }
                if (sortColumn === "endereco") {
                    const aValue = a.endereco?.rua.toLowerCase() || "";
                    const bValue = b.endereco?.rua.toLowerCase() || "";
                    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
                    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
                    return 0;
                }
                if (sortColumn === "dataNascimento") {
                    const aValue = a.dataNascimento || "";
                    const bValue = b.dataNascimento || "";
                    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
                    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
                    return 0;
                }
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
            toast.error("Por favor, preencha os campos obrigatórios: Turma, Nome e Status.");
            return;
        }

        if (editingEstudante.email && !validateEmail(editingEstudante.email)) {
            toast.error("Por favor, insira um e-mail válido.");
            return;
        }

        // Validação de data de nascimento
        if (editingEstudante.dataNascimento && !validateDataNascimento(editingEstudante.dataNascimento)) {
            toast.error("A data de nascimento é inválida ou está no futuro.");
            return;
        }

        // Validação de contatos
        if (editingEstudante.contatos && editingEstudante.contatos.length > 0) {
            for (const contato of editingEstudante.contatos) {
                const hasNome = contato.nome.trim().length > 0;
                const hasTelefone = contato.telefone.trim().length > 0;

                if (hasNome || hasTelefone) {
                    if (!hasNome) {
                        toast.error("O nome do contato é obrigatório quando o telefone está preenchido.");
                        return;
                    }
                    if (!hasTelefone) {
                        toast.error("O telefone do contato é obrigatório quando o nome está preenchido.");
                        return;
                    }
                    if (!validateNomeContato(contato.nome)) {
                        toast.error("O nome do contato deve ter entre 2 e 100 caracteres.");
                        return;
                    }
                    if (!validateTelefone(contato.telefone)) {
                        toast.error("O telefone deve ter 10 ou 11 dígitos.");
                        return;
                    }
                }
            }
        }

        // Validação de endereço
        if (editingEstudante.endereco?.cep) {
            const cleanedCep = cleanCep(editingEstudante.endereco.cep);
            if (!validateCep(cleanedCep)) {
                toast.error("O CEP deve ter 8 dígitos.");
                return;
            }
            if (!editingEstudante.endereco.rua) {
                toast.error("A rua é obrigatória quando o CEP está preenchido.");
                return;
            }
            if (!editingEstudante.endereco.numero) {
                toast.error("O número é obrigatório quando o CEP está preenchido.");
                return;
            }
            if (!editingEstudante.endereco.bairro) {
                toast.error("O bairro é obrigatório quando o CEP está preenchido.");
                return;
            }
            if (!editingEstudante.endereco.cidade) {
                toast.error("A cidade é obrigatória quando o CEP está preenchido.");
                return;
            }
            if (!editingEstudante.endereco.estado) {
                toast.error("O estado é obrigatório quando o CEP está preenchido.");
                return;
            }
        }

        const newTurma = editingEstudante.turma.toUpperCase();
        const newNome = editingEstudante.nome.toUpperCase();

        const duplicateExists = students.some(
            (est, index) =>
                est.turma.toUpperCase() === newTurma &&
                est.nome.toUpperCase() === newNome &&
                (editingIndex === null || index !== editingIndex)
        );

        if (duplicateExists) {
            toast.error("Já existe um estudante com esse nome e turma!");
            return;
        }

        const student: Estudante = {
            estudanteId: editingEstudante.estudanteId || uuidv4(),
            turma: newTurma,
            nome: newNome,
            status: editingEstudante.status.toUpperCase(),
            bolsaFamilia: editingEstudante.bolsaFamilia,
            contatos:
                editingEstudante.contatos
                    ?.filter((contato) => contato.nome.trim() || contato.telefone.trim())
                    .map((contato) => ({
                        nome: contato.nome.trim(),
                        telefone: cleanTelefone(contato.telefone),
                    })) || [],
            email: editingEstudante.email?.trim() || "",
            dataNascimento: editingEstudante.dataNascimento?.trim() || "",
        };

        // Inclui endereco apenas se o CEP estiver preenchido
        if (editingEstudante.endereco?.cep) {
            student.endereco = {
                rua: editingEstudante.endereco.rua.trim(),
                numero: editingEstudante.endereco.numero.trim(),
                bairro: editingEstudante.endereco.bairro.trim(),
                cidade: editingEstudante.endereco.cidade.trim(),
                estado: editingEstudante.endereco.estado.trim(),
                cep: cleanCep(editingEstudante.endereco.cep),
                complemento: editingEstudante.endereco.complemento?.trim() || "",
            };
        }

        console.log("Student object before saving:", student); // Debug: log do objeto student

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
                                    estudanteId: "",
                                    turma: "",
                                    nome: "",
                                    status: "ATIVO",
                                    bolsaFamilia: "NÃO",
                                    contatos: [{ nome: "", telefone: "" }],
                                    email: "",
                                    dataNascimento: "",
                                    endereco: {
                                        rua: "",
                                        numero: "",
                                        bairro: "",
                                        cidade: "",
                                        estado: "",
                                        cep: "",
                                        complemento: "",
                                    },
                                });
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
                            <Select
                                onValueChange={setBolsaFamiliaFiltro}
                                value={bolsaFamiliaFiltro}
                            >
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
                            <label className="block mb-1 font-semibold">Contato</label>
                            <Input
                                placeholder="Nome ou telefone do contato"
                                value={contatoFiltro}
                                onChange={(e) => setContatoFiltro(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-semibold">E-mail</label>
                            <Input
                                placeholder="E-mail do estudante"
                                value={emailFiltro}
                                onChange={(e) => setEmailFiltro(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-semibold">Endereço</label>
                            <Input
                                placeholder="Rua, número, bairro..."
                                value={enderecoFiltro}
                                onChange={(e) => setEnderecoFiltro(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-semibold">Data de Nascimento</label>
                            <Input
                                placeholder="dd/mm/aaaa"
                                value={formatDataNascimento(dataNascimentoFiltro)}
                                onChange={(e) => {
                                    const inputValue = e.target.value;
                                    const cleanedValue = cleanDataNascimento(inputValue).slice(0, 8);
                                    setDataNascimentoFiltro(cleanedValue);
                                }}
                            />
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
                                    <SelectItem value="dataNascimento">Data de Nascimento</SelectItem>
                                    <SelectItem value="bolsaFamilia">Bolsa Família</SelectItem>
                                    <SelectItem value="status">Status</SelectItem>
                                    <SelectItem value="contatos">Contatos</SelectItem>
                                    <SelectItem value="email">E-mail</SelectItem>
                                    <SelectItem value="endereco">Endereço</SelectItem>
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
                                    {visibleColumns.has("dataNascimento") && (
                                        <TableHead
                                            onClick={() => handleSort("dataNascimento")}
                                            className="cursor-pointer font-bold text-center"
                                        >
                                            Data de Nascimento{" "}
                                            {sortColumn === "dataNascimento" && (
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
                                    {visibleColumns.has("contatos") && (
                                        <TableHead
                                            onClick={() => handleSort("contatos")}
                                            className="cursor-pointer font-bold text-center"
                                        >
                                            Contatos{" "}
                                            {sortColumn === "contatos" && (
                                                <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                                            )}
                                        </TableHead>
                                    )}
                                    {visibleColumns.has("email") && (
                                        <TableHead
                                            onClick={() => handleSort("email")}
                                            className="cursor-pointer font-bold text-center"
                                        >
                                            E-mail{" "}
                                            {sortColumn === "email" && (
                                                <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                                            )}
                                        </TableHead>
                                    )}
                                    {visibleColumns.has("endereco") && (
                                        <TableHead
                                            onClick={() => handleSort("endereco")}
                                            className="cursor-pointer font-bold text-center"
                                        >
                                            Endereço{" "}
                                            {sortColumn === "endereco" && (
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
                                    currentRecords.map((est: Estudante, index: number) => (
                                        <TableRow key={index}>
                                            {visibleColumns.has("turma") && (
                                                <TableCell className="text-center">
                                                    {est.turma}
                                                </TableCell>
                                            )}
                                            {visibleColumns.has("nome") && (
                                                <TableCell className="text-left">{est.nome}</TableCell>
                                            )}
                                            {visibleColumns.has("dataNascimento") && (
                                                <TableCell className="text-center">
                                                    {est.dataNascimento ? formatDataNascimento(est.dataNascimento) : "NENHUMA"}
                                                </TableCell>
                                            )}
                                            {visibleColumns.has("bolsaFamilia") && (
                                                <TableCell className="text-center">
                                                    {est.bolsaFamilia}
                                                </TableCell>
                                            )}
                                            {visibleColumns.has("status") && (
                                                <TableCell className="text-center">
                                                    {est.status}
                                                </TableCell>
                                            )}
                                            {visibleColumns.has("contatos") && (
                                                <TableCell className="text-center">
                                                    {est.contatos && est.contatos.length > 0
                                                        ? est.contatos
                                                            .map(
                                                                (contato: Contato) =>
                                                                    `${contato.nome}: ${formatTelefone(
                                                                        contato.telefone
                                                                    )}`
                                                            )
                                                            .join(", ")
                                                        : "NENHUM"}
                                                </TableCell>
                                            )}
                                            {visibleColumns.has("email") && (
                                                <TableCell className="text-center">
                                                    {est.email || "NENHUM"}
                                                </TableCell>
                                            )}
                                            {visibleColumns.has("endereco") && (
                                                <TableCell className="text-center">
                                                    {est.endereco
                                                        ? `${est.endereco.rua}, ${est.endereco.numero}, ${est.endereco.complemento ? `${est.endereco.complemento}, ` : ""}${est.endereco.bairro}, ${est.endereco.cidade}-${est.endereco.estado}, ${formatCep(
                                                            est.endereco.cep
                                                        )}`
                                                        : "NENHUM"}
                                                </TableCell>
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
                                                                    item.bolsaFamilia ===
                                                                    est.bolsaFamilia &&
                                                                    item.estudanteId ===
                                                                    est.estudanteId
                                                            );
                                                            const contatos = est.contatos?.length
                                                                ? est.contatos
                                                                : [{ nome: "", telefone: "" }];
                                                            setEditingEstudante({
                                                                ...est,
                                                                contatos,
                                                            });
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                            </div>
                            <div>
                                <label className="block mb-1 font-semibold">Data de Nascimento</label>
                                <Input
                                    placeholder="dd/mm/aaaa"
                                    value={
                                        editingEstudante?.dataNascimento
                                            ? formatDataNascimento(editingEstudante.dataNascimento)
                                            : ""
                                    }
                                    onChange={(e) => {
                                        const inputValue = e.target.value;
                                        const cleanedValue = cleanDataNascimento(inputValue).slice(0, 8);
                                        setEditingEstudante({
                                            ...editingEstudante!,
                                            dataNascimento: cleanedValue,
                                        });
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-semibold">E-mail</label>
                                <Input
                                    placeholder="Digite o e-mail"
                                    value={editingEstudante?.email || ""}
                                    onChange={(e) =>
                                        setEditingEstudante({
                                            ...editingEstudante!,
                                            email: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-semibold">Endereço</label>
                                <div className="space-y-2">
                                    <Input
                                        placeholder="CEP (xxxxx-xxx)"
                                        value={
                                            editingEstudante?.endereco?.cep
                                                ? formatCep(editingEstudante.endereco.cep)
                                                : ""
                                        }
                                        onChange={(e) => {
                                            const inputValue = e.target.value;
                                            const cleanedValue = cleanCep(inputValue).slice(0, 8);
                                            setEditingEstudante({
                                                ...editingEstudante!,
                                                endereco: {
                                                    ...editingEstudante!.endereco!,
                                                    cep: cleanedValue,
                                                },
                                            });
                                        }}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <div className="md:col-span-3">
                                            <Input
                                                placeholder="Rua"
                                                value={editingEstudante?.endereco?.rua || ""}
                                                onChange={(e) =>
                                                    setEditingEstudante({
                                                        ...editingEstudante!,
                                                        endereco: {
                                                            ...editingEstudante!.endereco!,
                                                            rua: e.target.value,
                                                        },
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <Input
                                                placeholder="Número"
                                                value={editingEstudante?.endereco?.numero || ""}
                                                onChange={(e) =>
                                                    setEditingEstudante({
                                                        ...editingEstudante!,
                                                        endereco: {
                                                            ...editingEstudante!.endereco!,
                                                            numero: e.target.value,
                                                        },
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Input
                                            placeholder="Complemento"
                                            value={editingEstudante?.endereco?.complemento || ""}
                                            onChange={(e) =>
                                                setEditingEstudante({
                                                    ...editingEstudante!,
                                                    endereco: {
                                                        ...editingEstudante!.endereco!,
                                                        complemento: e.target.value,
                                                    },
                                                })
                                            }
                                        />
                                        <Input
                                            placeholder="Bairro"
                                            value={editingEstudante?.endereco?.bairro || ""}
                                            onChange={(e) =>
                                                setEditingEstudante({
                                                    ...editingEstudante!,
                                                    endereco: {
                                                        ...editingEstudante!.endereco!,
                                                        bairro: e.target.value,
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <div className="md:col-span-3">
                                            <Input
                                                placeholder="Cidade"
                                                value={editingEstudante?.endereco?.cidade || ""}
                                                onChange={(e) =>
                                                    setEditingEstudante({
                                                        ...editingEstudante!,
                                                        endereco: {
                                                            ...editingEstudante!.endereco!,
                                                            cidade: e.target.value,
                                                        },
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <Input
                                                placeholder="Estado"
                                                value={editingEstudante?.endereco?.estado || ""}
                                                onChange={(e) =>
                                                    setEditingEstudante({
                                                        ...editingEstudante!,
                                                        endereco: {
                                                            ...editingEstudante!.endereco!,
                                                            estado: e.target.value,
                                                        },
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 font-semibold">Contatos</label>
                                {editingEstudante?.contatos?.map((contato: Contato, index: number) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 mb-2 p-2 border rounded"
                                    >
                                        <div className="flex-1">
                                            <Input
                                                placeholder="Nome do contato"
                                                value={contato.nome}
                                                onChange={(e) => {
                                                    const newContatos = [
                                                        ...(editingEstudante.contatos || []),
                                                    ];
                                                    newContatos[index] = {
                                                        ...newContatos[index],
                                                        nome: e.target.value,
                                                    };
                                                    setEditingEstudante({
                                                        ...editingEstudante!,
                                                        contatos: newContatos,
                                                    });
                                                }}
                                            />
                                            <Input
                                                placeholder="(xx) xxxxx-xxxx"
                                                value={formatTelefone(contato.telefone)}
                                                onChange={(e) => {
                                                    const inputValue = e.target.value;
                                                    const cleanedValue = cleanTelefone(inputValue).slice(
                                                        0,
                                                        11
                                                    );
                                                    const newContatos = [
                                                        ...(editingEstudante.contatos || []),
                                                    ];
                                                    newContatos[index] = {
                                                        ...newContatos[index],
                                                        telefone: cleanedValue,
                                                    };
                                                    setEditingEstudante({
                                                        ...editingEstudante!,
                                                        contatos: newContatos,
                                                    });
                                                }}
                                            />
                                        </div>
                                        <Trash2
                                            className="h-5 w-5 text-red-500 cursor-pointer"
                                            onClick={() => {
                                                const newContatos = editingEstudante.contatos!.filter(
                                                    (_, i) => i !== index
                                                );
                                                setEditingEstudante({
                                                    ...editingEstudante!,
                                                    contatos: newContatos,
                                                });
                                            }}
                                        />
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setEditingEstudante({
                                            ...editingEstudante!,
                                            contatos: [
                                                ...(editingEstudante?.contatos || []),
                                                { nome: "", telefone: "" },
                                            ],
                                        });
                                    }}
                                >
                                    + Adicionar Contato
                                </Button>
                            </div>
                            <Button type="submit" className="w-full">
                                Salvar
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}