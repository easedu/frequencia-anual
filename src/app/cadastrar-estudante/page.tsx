"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import Select, { MultiValue, StylesConfig } from "react-select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select as ShadcnSelect,
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
    DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Trash2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

// Interface para opções do react-select
interface SelectOption {
    value: string;
    label: string;
}

// Estilização personalizada para react-select
const customSelectStyles: StylesConfig<SelectOption, true> = {
    control: (provided) => ({
        ...provided,
        borderColor: "hsl(var(--input))",
        borderRadius: "0.375rem",
        padding: "0.25rem",
        backgroundColor: "hsl(var(--background))",
        "&:hover": {
            borderColor: "hsl(var(--primary))",
        },
    }),
    menu: (provided) => ({
        ...provided,
        backgroundColor: "hsl(var(--background))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "0.375rem",
    }),
    option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isSelected
            ? "hsl(var(--primary))"
            : state.isFocused
                ? "hsl(var(--primary)/0.1)"
                : "hsl(var(--background))",
        color: state.isSelected ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
        "&:hover": {
            backgroundColor: "hsl(var(--primary)/0.1)",
        },
    }),
    multiValue: (provided) => ({
        ...provided,
        backgroundColor: "hsl(var(--primary)/0.1)",
    }),
    multiValueLabel: (provided) => ({
        ...provided,
        color: "hsl(var(--foreground))",
    }),
    multiValueRemove: (provided) => ({
        ...provided,
        color: "hsl(var(--foreground))",
        "&:hover": {
            backgroundColor: "hsl(var(--destructive))",
            color: "hsl(var(--destructive-foreground))",
        },
    }),
};

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
        return true;
    }
    if (cleanedData.length !== 8) {
        return false;
    }

    const day = parseInt(cleanedData.slice(0, 2), 10);
    const month = parseInt(cleanedData.slice(2, 4), 10);
    const year = parseInt(cleanedData.slice(4, 8), 10);

    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) {
        return false;
    }

    if ([4, 6, 9, 11].includes(month) && day > 30) {
        return false;
    }

    if (month === 2) {
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        if (day > (isLeapYear ? 29 : 28)) {
            return false;
        }
    }

    const inputDate = new Date(year, month - 1, day);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
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

// Esquema de validação com zod
const formSchema = z.object({
    nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").max(100),
    turma: z.string().min(1, "A turma é obrigatória"),
    bolsaFamilia: z.enum(["SIM", "NÃO"]),
    status: z.enum(["ATIVO", "INATIVO"]),
    dataNascimento: z.string().optional().refine(
        (val) => !val || validateDataNascimento(val),
        "Data de nascimento inválida ou no futuro"
    ),
    turno: z.enum(["MANHÃ", "TARDE"]),
    email: z.string().optional().refine((val) => !val || validateEmail(val), "E-mail inválido"),
    endereco: z
        .object({
            cep: z.string().optional(),
            rua: z.string().optional(),
            numero: z.string().optional(),
            bairro: z.string().optional(),
            cidade: z.string().optional(),
            estado: z.string().optional(),
            complemento: z.string().optional(),
        })
        .optional()
        .refine(
            (data) =>
                !data?.cep ||
                (validateCep(data.cep) &&
                    !!data.rua &&
                    !!data.numero &&
                    !!data.bairro &&
                    !!data.cidade &&
                    !!data.estado),
            "Todos os campos de endereço são obrigatórios quando o CEP está preenchido"
        ),
    contatos: z
        .array(
            z.object({
                nome: z.string().optional(),
                telefone: z.string().optional(),
            })
        )
        .optional()
        .refine(
            (data) =>
                !data ||
                data.every(
                    (contato) =>
                        (!contato.nome && !contato.telefone) ||
                        (contato.nome &&
                            contato.telefone &&
                            validateNomeContato(contato.nome) &&
                            validateTelefone(contato.telefone))
                ),
            "Contatos devem ter nome e telefone válidos ou estar vazios"
        ),
    deficiencia: z
        .object({
            estudanteComDeficiencia: z.boolean(),
            tipoDeficiencia: z.array(z.string()).optional(),
            possuiBarreiras: z.boolean().optional(),
            aee: z.enum(["PAEE", "PAAI"]).optional(),
            instituicao: z.enum(["INSTITUTO JÔ CLEMENTE", "CLIFAK", "CEJOLE", "CCA"]).optional(),
            horarioAtendimento: z.enum(["NENHUM", "NO TURNO", "CONTRATURNO"]).optional(),
            atendimentoSaude: z.array(z.string()).optional(),
            possuiEstagiario: z.boolean().optional(),
            nomeEstagiario: z.string().optional(),
            justificativaEstagiario: z
                .enum(["MEDIAÇÃO E APOIO NAS ATIVIDADES DA UE", "SEM BARREIRAS"])
                .optional(),
            ave: z.boolean().optional(),
            justificativaAve: z.array(z.string()).optional(),
        })
        .optional()
        .refine(
            (data) =>
                !data?.estudanteComDeficiencia ||
                (data.tipoDeficiencia && data.tipoDeficiencia.length > 0),
            "Selecione pelo menos um tipo de deficiência quando estudante com deficiência está marcado"
        )
        .refine(
            (data) =>
                !data?.possuiEstagiario ||
                (data.nomeEstagiario && data.nomeEstagiario.trim() !== ""),
            "O nome do estagiário é obrigatório quando possui estagiário"
        ),
});

export default function CadastrarEstudantePage() {
    const { students, loading, saveStudents, setStudents } = useStudents();

    // Inicializar o useForm no topo
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nome: "",
            turma: "",
            bolsaFamilia: "NÃO",
            status: "ATIVO",
            dataNascimento: "",
            turno: "MANHÃ",
            email: "",
            endereco: {
                cep: "",
                rua: "",
                numero: "",
                bairro: "",
                cidade: "",
                estado: "",
                complemento: "",
            },
            contatos: [{ nome: "", telefone: "" }],
            deficiencia: {
                estudanteComDeficiencia: false,
                tipoDeficiencia: [],
                possuiBarreiras: true,
                aee: undefined,
                instituicao: undefined,
                horarioAtendimento: "NENHUM",
                atendimentoSaude: [],
                possuiEstagiario: false,
                nomeEstagiario: "NÃO NECESSITA",
                justificativaEstagiario: "SEM BARREIRAS",
                ave: false,
                justificativaAve: [],
            },
        },
    });

    const [turmaFiltro, setTurmaFiltro] = useState<string>("");
    const [nomeFiltro, setNomeFiltro] = useState<string>("");
    const [statusFiltro, setStatusFiltro] = useState<string>("");
    const [bolsaFamiliaFiltro, setBolsaFamiliaFiltro] = useState<string>("");
    const [turnoFiltro, setTurnoFiltro] = useState<string>("");
    const [contatoFiltro, setContatoFiltro] = useState<string>("");
    const [emailFiltro, setEmailFiltro] = useState<string>("");
    const [enderecoFiltro, setEnderecoFiltro] = useState<string>("");
    const [dataNascimentoFiltro, setDataNascimentoFiltro] = useState<string>("");
    const [comDeficienciaFiltro, setComDeficienciaFiltro] = useState<string>("");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [recordsPerPage, setRecordsPerPage] = useState<number>(10);
    const [sortColumn, setSortColumn] = useState<string>("");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set([
            "turma",
            "nome",
            "dataNascimento",
            "turno",
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

    // Opções para os Selects de múltiplas seleções
    const tipoDeficienciaOptions: SelectOption[] = [
        { value: "DI", label: "DI" },
        { value: "DM", label: "DM" },
        { value: "TEA", label: "TEA" },
        { value: "DF", label: "DF" },
        { value: "SÍNDROME DE DOWN", label: "SÍNDROME DE DOWN" },
    ];

    const atendimentoSaudeOptions: SelectOption[] = [
        { value: "NÃO FAZ", label: "NÃO FAZ" },
        { value: "FONOAUDIOLOGIA", label: "FONOAUDIOLOGIA" },
        { value: "NEUROLOGIA", label: "NEUROLOGIA" },
        { value: "TERAPIA OCUPACIONAL", label: "TERAPIA OCUPACIONAL" },
        { value: "ORTOPEDIA", label: "ORTOPEDIA" },
        { value: "PSICOLOGIA", label: "PSICOLOGIA" },
        { value: "FISIOTERAPIA", label: "FISIOTERAPIA" },
    ];

    const justificativaAveOptions: SelectOption[] = [
        { value: "HIGIENE", label: "HIGIENE" },
        { value: "LOCOMOÇÃO", label: "LOCOMOÇÃO" },
        { value: "ALIMENTAÇÃO", label: "ALIMENTAÇÃO" },
        { value: "TROCA DE FRALDA", label: "TROCA DE FRALDA" },
        {
            value: "SIGNIFICATIVAS DIFICULDADES COGNITIVAS E FUNCIONAIS",
            label: "SIGNIFICATIVAS DIFICULDADES COGNITIVAS E FUNCIONAIS",
        },
    ];

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
            console.log("Contém turno?", "turno" in students[0]);
            console.log("Contém deficiencia?", "deficiencia" in students[0]);
        }
    }, [students, loading]);

    // Efeito para consultar CEP
    const cep = form.watch("endereco.cep");

    useEffect(() => {
        if (cep) {
            const cleanedCep = cleanCep(cep);
            if (cleanedCep.length === 8) {
                fetchAddressFromCep(cleanedCep).then((address) => {
                    if (address) {
                        form.setValue("endereco.rua", address.rua);
                        form.setValue("endereco.bairro", address.bairro);
                        form.setValue("endereco.cidade", address.cidade);
                        form.setValue("endereco.estado", address.estado);
                        form.setValue("endereco.complemento", address.complemento);
                    } else {
                        toast.error("CEP não encontrado ou inválido.");
                    }
                });
            }
        }
    }, [form, cep]);

    // Efeito para limpar endereço se CEP incompleto
    useEffect(() => {
        if (cep) {
            const cleanedCep = cleanCep(cep);
            if (cleanedCep.length > 0 && cleanedCep.length < 8) {
                form.setValue("endereco.rua", "");
                form.setValue("endereco.numero", "");
                form.setValue("endereco.bairro", "");
                form.setValue("endereco.cidade", "");
                form.setValue("endereco.estado", "");
                form.setValue("endereco.complemento", "");
            }
        }
    }, [form, cep]);

    // Efeito para ajustar campos dependentes de possuiEstagiario
    const possuiEstagiario = form.watch("deficiencia.possuiEstagiario");

    useEffect(() => {
        if (!possuiEstagiario) {
            form.setValue("deficiencia.nomeEstagiario", "NÃO NECESSITA");
            form.setValue("deficiencia.justificativaEstagiario", "SEM BARREIRAS");
        }
    }, [form, possuiEstagiario]);

    // --- Filtragem e Ordenação ---
    const turmas = Array.from(new Set(students.map((est) => est.turma))).sort((a, b) =>
        a.localeCompare(b)
    );
    const statusList = Array.from(new Set(students.map((est) => est.status))).sort((a, b) =>
        a.localeCompare(b)
    );
    const turnoList = ["MANHÃ", "TARDE"];
    const bolsaFamiliaOptions = ["SIM", "NÃO"];
    const comDeficienciaOptions = ["SIM", "NÃO"];

    const estudantesFiltrados = students.filter((est) => {
        const matchTurma =
            turmaFiltro === "" || turmaFiltro === "all" || est.turma === turmaFiltro;
        const matchNome =
            nomeFiltro === "" ||
            est.nome.toLowerCase().includes(nomeFiltro.toLowerCase());
        const matchStatus =
            statusFiltro === "" || statusFiltro === "all" || est.status === statusFiltro;
        const matchTurno =
            turnoFiltro === "" || turnoFiltro === "all" || est.turno === turnoFiltro;
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
                ? `${est.endereco.rua} ${est.endereco.numero} ${est.endereco.bairro} ${est.endereco.cidade} ${est.endereco.estado} ${est.endereco.cep} ${est.endereco.complemento}`
                    .toLowerCase()
                    .includes(enderecoFiltro.toLowerCase())
                : false);
        const matchDataNascimento =
            dataNascimentoFiltro === "" ||
            (est.dataNascimento?.includes(cleanDataNascimento(dataNascimentoFiltro)) ?? false);
        const matchComDeficiencia =
            comDeficienciaFiltro === "" ||
            comDeficienciaFiltro === "all" ||
            (est.deficiencia?.estudanteComDeficiencia
                ? comDeficienciaFiltro === "SIM"
                : comDeficienciaFiltro === "NÃO");
        return (
            matchTurma &&
            matchNome &&
            matchStatus &&
            matchTurno &&
            matchBolsaFamilia &&
            matchContato &&
            matchEmail &&
            matchEndereco &&
            matchDataNascimento &&
            matchComDeficiencia
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
                    return sortDirection === "asc"
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                }
                if (sortColumn === "email") {
                    const aValue = a.email?.toLowerCase() || "";
                    const bValue = b.email?.toLowerCase() || "";
                    return sortDirection === "asc"
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                }
                if (sortColumn === "endereco") {
                    const aValue = a.endereco?.rua.toLowerCase() || "";
                    const bValue = b.endereco?.rua.toLowerCase() || "";
                    return sortDirection === "asc"
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                }
                if (sortColumn === "dataNascimento") {
                    const aValue = a.dataNascimento || "";
                    const bValue = b.dataNascimento || "";
                    return sortDirection === "asc"
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                }
                if (sortColumn === "deficiencia") {
                    const aValue = a.deficiencia?.tipoDeficiencia?.join(", ")?.toLowerCase() || "";
                    const bValue = b.deficiencia?.tipoDeficiencia?.join(", ")?.toLowerCase() || "";
                    return sortDirection === "asc"
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                }
                const aValue = (a[sortColumn as keyof Estudante] as string)?.toLowerCase() || "";
                const bValue = (b[sortColumn as keyof Estudante] as string)?.toLowerCase() || "";
                return sortDirection === "asc"
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
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

    const handleFormSubmit = async (data: z.infer<typeof formSchema>) => {
        if (!editingEstudante) return;

        const newTurma = data.turma.toUpperCase();
        const newNome = data.nome.toUpperCase();

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
            status: data.status.toUpperCase() as "ATIVO" | "INATIVO",
            turno: data.turno.toUpperCase() as "MANHÃ" | "TARDE",
            bolsaFamilia: data.bolsaFamilia,
            contatos: data.contatos
                ?.filter((contato) => contato.nome?.trim() || contato.telefone?.trim())
                .map((contato) => ({
                    nome: contato.nome!.trim(),
                    telefone: cleanTelefone(contato.telefone!),
                })) || [],
            email: data.email?.trim() || "",
            dataNascimento: data.dataNascimento?.trim() || "",
            deficiencia: data.deficiencia?.estudanteComDeficiencia
                ? {
                    estudanteComDeficiencia: data.deficiencia.estudanteComDeficiencia,
                    tipoDeficiencia: data.deficiencia.tipoDeficiencia || [],
                    possuiBarreiras: data.deficiencia.possuiBarreiras ?? true,
                    aee: data.deficiencia.aee,
                    instituicao: data.deficiencia.instituicao,
                    horarioAtendimento: data.deficiencia.horarioAtendimento || "NENHUM",
                    atendimentoSaude: data.deficiencia.atendimentoSaude || [],
                    possuiEstagiario: data.deficiencia.possuiEstagiario || false,
                    nomeEstagiario: data.deficiencia.nomeEstagiario || "NÃO NECESSITA",
                    justificativaEstagiario: data.deficiencia.justificativaEstagiario || "SEM BARREIRAS",
                    ave: data.deficiencia.ave || false,
                    justificativaAve: data.deficiencia.justificativaAve || [],
                }
                : undefined,
            endereco: data.endereco?.cep
                ? {
                    rua: data.endereco.rua!.trim(),
                    numero: data.endereco.numero!.trim(),
                    bairro: data.endereco.bairro!.trim(),
                    cidade: data.endereco.cidade!.trim(),
                    estado: data.endereco.estado!.trim(),
                    cep: cleanCep(data.endereco.cep),
                    complemento: data.endereco.complemento?.trim() || "",
                }
                : undefined,
        };

        console.log("Student object before saving:", student);

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

    const handleCancel = () => {
        setEditingEstudante(null);
        setEditingIndex(null);
        setOpenModal(false);
        form.reset();
    };

    // Preencher o formulário ao editar
    useEffect(() => {
        if (editingEstudante) {
            form.reset({
                nome: editingEstudante.nome || "",
                turma: editingEstudante.turma || "",
                bolsaFamilia: editingEstudante.bolsaFamilia || "NÃO",
                status: (editingEstudante.status as "ATIVO" | "INATIVO") || "ATIVO",
                dataNascimento: editingEstudante.dataNascimento || "",
                turno: editingEstudante.turno || "MANHÃ",
                email: editingEstudante.email || "",
                endereco: editingEstudante.endereco || {
                    cep: "",
                    rua: "",
                    numero: "",
                    bairro: "",
                    cidade: "",
                    estado: "",
                    complemento: "",
                },
                contatos: editingEstudante.contatos?.length
                    ? editingEstudante.contatos
                    : [{ nome: "", telefone: "" }],
                deficiencia: editingEstudante.deficiencia || {
                    estudanteComDeficiencia: false,
                    tipoDeficiencia: [],
                    possuiBarreiras: true,
                    aee: undefined,
                    instituicao: undefined,
                    horarioAtendimento: "NENHUM",
                    atendimentoSaude: [],
                    possuiEstagiario: false,
                    nomeEstagiario: "NÃO NECESSITA",
                    justificativaEstagiario: "SEM BARREIRAS",
                    ave: false,
                    justificativaAve: [],
                },
            });
        }
    }, [editingEstudante, form]);

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
                                    turno: "MANHÃ",
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
                                    deficiencia: {
                                        estudanteComDeficiencia: false,
                                        tipoDeficiencia: [],
                                        possuiBarreiras: true,
                                        aee: undefined,
                                        instituicao: undefined,
                                        horarioAtendimento: "NENHUM",
                                        atendimentoSaude: [],
                                        possuiEstagiario: false,
                                        nomeEstagiario: "NÃO NECESSITA",
                                        justificativaEstagiario: "SEM BARREIRAS",
                                        ave: false,
                                        justificativaAve: [],
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
                            <ShadcnSelect onValueChange={setTurmaFiltro} value={turmaFiltro}>
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
                            </ShadcnSelect>
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
                            <ShadcnSelect
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
                            </ShadcnSelect>
                        </div>
                        <div>
                            <label className="block mb-1 font-semibold">Status</label>
                            <ShadcnSelect onValueChange={setStatusFiltro} value={statusFiltro}>
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
                            </ShadcnSelect>
                        </div>
                        <div>
                            <label className="block mb-1 font-semibold">Turno</label>
                            <ShadcnSelect onValueChange={setTurnoFiltro} value={turnoFiltro}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o Turno" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os turnos</SelectItem>
                                    {turnoList.map((turno) => (
                                        <SelectItem key={turno} value={turno}>
                                            {turno}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </ShadcnSelect>
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
                            <label className="block mb-1 font-semibold">Com Deficiência</label>
                            <ShadcnSelect
                                onValueChange={setComDeficienciaFiltro}
                                value={comDeficienciaFiltro}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {comDeficienciaOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </ShadcnSelect>
                        </div>
                        <div>
                            <label className="block mb-1 font-semibold">Colunas visíveis</label>
                            <ShadcnSelect
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
                                    <SelectItem value="turno">Turno</SelectItem>
                                    <SelectItem value="bolsaFamilia">Bolsa Família</SelectItem>
                                    <SelectItem value="status">Status</SelectItem>
                                    <SelectItem value="contatos">Contatos</SelectItem>
                                    <SelectItem value="email">E-mail</SelectItem>
                                    <SelectItem value="endereco">Endereço</SelectItem>
                                    <SelectItem value="deficiencia">Deficiência</SelectItem>
                                    <SelectItem value="actions">Ações</SelectItem>
                                </SelectContent>
                            </ShadcnSelect>
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
                                    {visibleColumns.has("turno") && (
                                        <TableHead
                                            onClick={() => handleSort("turno")}
                                            className="cursor-pointer font-bold text-center"
                                        >
                                            Turno{" "}
                                            {sortColumn === "turno" && (
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
                                    {visibleColumns.has("deficiencia") && (
                                        <TableHead
                                            onClick={() => handleSort("deficiencia")}
                                            className="cursor-pointer font-bold text-center"
                                        >
                                            Deficiência{" "}
                                            {sortColumn === "deficiencia" && (
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
                                        <TableRow key={est.estudanteId || index}>
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
                                                    {est.dataNascimento
                                                        ? formatDataNascimento(est.dataNascimento)
                                                        : "NENHUMA"}
                                                </TableCell>
                                            )}
                                            {visibleColumns.has("turno") && (
                                                <TableCell className="text-center">
                                                    {est.turno}
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
                                                        ? `${est.endereco.rua}, ${est.endereco.numero}, ${est.endereco.complemento
                                                            ? `${est.endereco.complemento}, `
                                                            : ""
                                                        }${est.endereco.bairro}, ${est.endereco.cidade}-${est.endereco.estado
                                                        }, ${formatCep(est.endereco.cep)}`
                                                        : "NENHUM"}
                                                </TableCell>
                                            )}
                                            {visibleColumns.has("deficiencia") && (
                                                <TableCell className="text-center">
                                                    {est.deficiencia?.estudanteComDeficiencia
                                                        ? `${est.deficiencia.tipoDeficiencia?.join(", ") || "NENHUM"}`
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
                                                                    item.bolsaFamilia === est.bolsaFamilia &&
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
                                <ShadcnSelect
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
                                </ShadcnSelect>
                            </div>
                            <p className="text-sm text-gray-700">Total de registros: {totalRecords}</p>
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
                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingIndex !== null ? "Editar Estudante" : "Adicionar Estudante"}
                            </DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 mt-4">
                                <p className="text-sm text-gray-500" id="form-desc">
                                    Campos com <span className="text-red-500">*</span> são obrigatórios.
                                </p>
                                <Tabs defaultValue="pessoais" className="w-full">
                                    <TabsList className="grid w-full grid-cols-4">
                                        <TabsTrigger value="pessoais">Pessoais</TabsTrigger>
                                        <TabsTrigger value="endereco">Endereço</TabsTrigger>
                                        <TabsTrigger value="contatos">Contatos</TabsTrigger>
                                        <TabsTrigger value="deficiencia">Deficiência</TabsTrigger>
                                    </TabsList>

                                    {/* Aba: Informações Pessoais */}
                                    <TabsContent value="pessoais" className="mt-4">
                                        <div className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="nome"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel htmlFor="nome">
                                                            Nome <span className="text-red-500">*</span>
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                id="nome"
                                                                placeholder="Digite o nome"
                                                                {...field}
                                                                aria-describedby="form-desc"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <FormField
                                                    control={form.control}
                                                    name="turma"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel htmlFor="turma">
                                                                Turma <span className="text-red-500">*</span>
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    id="turma"
                                                                    placeholder="Digite a turma"
                                                                    {...field}
                                                                    aria-describedby="form-desc"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="bolsaFamilia"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel htmlFor="bolsaFamilia">
                                                                Bolsa Família <span className="text-red-500">*</span>
                                                            </FormLabel>
                                                            <FormControl>
                                                                <ShadcnSelect
                                                                    onValueChange={field.onChange}
                                                                    value={field.value}
                                                                >
                                                                    <SelectTrigger id="bolsaFamilia">
                                                                        <SelectValue placeholder="Selecione" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="SIM">SIM</SelectItem>
                                                                        <SelectItem value="NÃO">NÃO</SelectItem>
                                                                    </SelectContent>
                                                                </ShadcnSelect>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="status"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel htmlFor="status">
                                                                Status <span className="text-red-500">*</span>
                                                            </FormLabel>
                                                            <FormControl>
                                                                <ShadcnSelect
                                                                    onValueChange={field.onChange}
                                                                    value={field.value}
                                                                >
                                                                    <SelectTrigger id="status">
                                                                        <SelectValue placeholder="Selecione o Status" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="ATIVO">ATIVO</SelectItem>
                                                                        <SelectItem value="INATIVO">INATIVO</SelectItem>
                                                                    </SelectContent>
                                                                </ShadcnSelect>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <FormField
                                                    control={form.control}
                                                    name="dataNascimento"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel htmlFor="dataNascimento">
                                                                Data de Nascimento
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    id="dataNascimento"
                                                                    placeholder="dd/mm/aaaa"
                                                                    value={field.value ? formatDataNascimento(field.value) : ""}
                                                                    onChange={(e) => {
                                                                        const inputValue = e.target.value;
                                                                        const cleanedValue = cleanDataNascimento(inputValue).slice(0, 8);
                                                                        field.onChange(cleanedValue);
                                                                    }}
                                                                    aria-describedby="form-desc"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="turno"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel htmlFor="turno">
                                                                Turno <span className="text-red-500">*</span>
                                                            </FormLabel>
                                                            <FormControl>
                                                                <ShadcnSelect
                                                                    onValueChange={field.onChange}
                                                                    value={field.value}
                                                                >
                                                                    <SelectTrigger id="turno">
                                                                        <SelectValue placeholder="Selecione o Turno" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="MANHÃ">MANHÃ</SelectItem>
                                                                        <SelectItem value="TARDE">TARDE</SelectItem>
                                                                    </SelectContent>
                                                                </ShadcnSelect>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <FormField
                                                control={form.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel htmlFor="email">E-mail</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                id="email"
                                                                placeholder="Digite o e-mail"
                                                                {...field}
                                                                aria-describedby="form-desc"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </TabsContent>

                                    {/* Aba: Endereço */}
                                    <TabsContent value="endereco" className="mt-4">
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold mb-4">Endereço</h3>
                                            <FormField
                                                control={form.control}
                                                name="endereco.cep"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel htmlFor="cep">CEP (xxxxx-xxx)</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                id="cep"
                                                                placeholder="CEP (xxxxx-xxx)"
                                                                value={field.value ? formatCep(field.value) : ""}
                                                                onChange={(e) => {
                                                                    const inputValue = e.target.value;
                                                                    const cleanedValue = cleanCep(inputValue).slice(0, 8);
                                                                    field.onChange(cleanedValue);
                                                                }}
                                                                aria-describedby="form-desc"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                <FormField
                                                    control={form.control}
                                                    name="endereco.rua"
                                                    render={({ field }) => (
                                                        <FormItem className="md:col-span-3">
                                                            <FormLabel htmlFor="rua">Rua</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    id="rua"
                                                                    placeholder="Rua"
                                                                    {...field}
                                                                    aria-describedby="form-desc"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="endereco.numero"
                                                    render={({ field }) => (
                                                        <FormItem className="md:col-span-1">
                                                            <FormLabel htmlFor="numero">Número</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    id="numero"
                                                                    placeholder="Número"
                                                                    {...field}
                                                                    aria-describedby="form-desc"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <FormField
                                                    control={form.control}
                                                    name="endereco.complemento"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel htmlFor="complemento">Complemento</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    id="complemento"
                                                                    placeholder="Complemento"
                                                                    {...field}
                                                                    aria-describedby="form-desc"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="endereco.bairro"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel htmlFor="bairro">Bairro</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    id="bairro"
                                                                    placeholder="Bairro"
                                                                    {...field}
                                                                    aria-describedby="form-desc"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                <FormField
                                                    control={form.control}
                                                    name="endereco.cidade"
                                                    render={({ field }) => (
                                                        <FormItem className="md:col-span-3">
                                                            <FormLabel htmlFor="cidade">Cidade</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    id="cidade"
                                                                    placeholder="Cidade"
                                                                    {...field}
                                                                    aria-describedby="form-desc"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="endereco.estado"
                                                    render={({ field }) => (
                                                        <FormItem className="md:col-span-1">
                                                            <FormLabel htmlFor="estado">Estado</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    id="estado"
                                                                    placeholder="Estado"
                                                                    {...field}
                                                                    aria-describedby="form-desc"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* Aba: Contatos */}
                                    <TabsContent value="contatos" className="mt-4">
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold mb-4">Contatos</h3>
                                            {form.watch("contatos")?.map((_, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-2 mb-2 p-2 border rounded"
                                                >
                                                    <div className="flex-1 space-y-2">
                                                        <FormField
                                                            control={form.control}
                                                            name={`contatos.${index}.nome`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel htmlFor={`contato-nome-${index}`}>
                                                                        Nome do contato
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            id={`contato-nome-${index}`}
                                                                            placeholder="Nome do contato"
                                                                            {...field}
                                                                            aria-describedby="form-desc"
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name={`contatos.${index}.telefone`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel htmlFor={`contato-telefone-${index}`}>
                                                                        Telefone
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            id={`contato-telefone-${index}`}
                                                                            placeholder="(xx) xxxxx-xxxx"
                                                                            value={field.value ? formatTelefone(field.value) : ""}
                                                                            onChange={(e) => {
                                                                                const inputValue = e.target.value;
                                                                                const cleanedValue = cleanTelefone(inputValue).slice(0, 11);
                                                                                field.onChange(cleanedValue);
                                                                            }}
                                                                            aria-describedby="form-desc"
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    <Trash2
                                                        className="h-5 w-5 text-red-500 cursor-pointer"
                                                        onClick={() => {
                                                            const newContatos = form
                                                                .getValues("contatos")
                                                                ?.filter((_, i) => i !== index);
                                                            form.setValue("contatos", newContatos || []);
                                                        }}
                                                        aria-label="Remover contato"
                                                    />
                                                </div>
                                            ))}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    const currentContatos = form.getValues("contatos") || [];
                                                    form.setValue("contatos", [
                                                        ...currentContatos,
                                                        { nome: "", telefone: "" },
                                                    ]);
                                                }}
                                                aria-label="Adicionar novo contato"
                                            >
                                                + Adicionar Contato
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    {/* Aba: Deficiência */}
                                    <TabsContent value="deficiencia" className="mt-4">
                                        <div className="space-y-6">
                                            <h3 className="text-lg font-semibold mb-4">Deficiência</h3>
                                            <FormField
                                                control={form.control}
                                                name="deficiencia.estudanteComDeficiencia"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel
                                                            className="flex items-center space-x-2"
                                                            htmlFor="estudanteComDeficiencia"
                                                        >
                                                            <FormControl>
                                                                <Checkbox
                                                                    id="estudanteComDeficiencia"
                                                                    checked={field.value}
                                                                    onCheckedChange={(checked) => {
                                                                        field.onChange(!!checked);
                                                                        if (!checked) {
                                                                            form.setValue("deficiencia", {
                                                                                estudanteComDeficiencia: false,
                                                                                tipoDeficiencia: [],
                                                                                possuiBarreiras: true,
                                                                                aee: undefined,
                                                                                instituicao: undefined,
                                                                                horarioAtendimento: "NENHUM",
                                                                                atendimentoSaude: [],
                                                                                possuiEstagiario: false,
                                                                                nomeEstagiario: "NÃO NECESSITA",
                                                                                justificativaEstagiario: "SEM BARREIRAS",
                                                                                ave: false,
                                                                                justificativaAve: [],
                                                                            });
                                                                        }
                                                                    }}
                                                                    aria-label="Indica se o estudante possui deficiência"
                                                                />
                                                            </FormControl>
                                                            <span>Estudante com Deficiência</span>
                                                        </FormLabel>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            {form.watch("deficiencia.estudanteComDeficiencia") && (
                                                <div className="space-y-6 p-4 border rounded bg-gray-50 transition-all duration-300">
                                                    <p className="text-sm text-gray-500" id="deficiencia-desc">
                                                        Campos com <span className="text-red-500">*</span> são
                                                        obrigatórios.
                                                    </p>

                                                    {/* Subseção: Informações Gerais */}
                                                    <div className="border-b pb-2">
                                                        <h4 className="text-lg font-semibold mb-4">
                                                            Informações Gerais
                                                        </h4>
                                                        <div className="space-y-4">
                                                            <FormField
                                                                control={form.control}
                                                                name="deficiencia.tipoDeficiencia"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel htmlFor="tipoDeficiencia">
                                                                            Tipo de Deficiência{" "}
                                                                            <span className="text-red-500">*</span>
                                                                        </FormLabel>
                                                                        <FormControl>
                                                                            <Select
                                                                                isMulti
                                                                                options={tipoDeficienciaOptions}
                                                                                value={tipoDeficienciaOptions.filter(
                                                                                    (option) =>
                                                                                        field.value?.includes(option.value)
                                                                                )}
                                                                                onChange={(
                                                                                    selectedOptions: MultiValue<SelectOption>
                                                                                ) => {
                                                                                    const newTipos = selectedOptions.map(
                                                                                        (option) => option.value
                                                                                    );
                                                                                    field.onChange(newTipos);
                                                                                }}
                                                                                styles={customSelectStyles}
                                                                                placeholder="Selecione os tipos"
                                                                                inputId="tipoDeficiencia"
                                                                                aria-describedby="deficiencia-desc"
                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            <FormField
                                                                control={form.control}
                                                                name="deficiencia.possuiBarreiras"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel
                                                                            className="flex items-center space-x-2"
                                                                            htmlFor="possuiBarreiras"
                                                                        >
                                                                            <FormControl>
                                                                                <Checkbox
                                                                                    id="possuiBarreiras"
                                                                                    checked={field.value}
                                                                                    onCheckedChange={field.onChange}
                                                                                />
                                                                            </FormControl>
                                                                            <span>Possui Barreiras</span>
                                                                        </FormLabel>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Subseção: Atendimento Educacional */}
                                                    <div className="border-b pb-2">
                                                        <h4 className="text-lg font-semibold mb-4">
                                                            Atendimento Educacional
                                                        </h4>
                                                        <div className="space-y-4">
                                                            <FormField
                                                                control={form.control}
                                                                name="deficiencia.aee"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel htmlFor="aee">A. E. E.</FormLabel>
                                                                        <FormControl>
                                                                            <ShadcnSelect
                                                                                onValueChange={field.onChange}
                                                                                value={field.value}
                                                                            >
                                                                                <SelectTrigger id="aee">
                                                                                    <SelectValue placeholder="Selecione" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="PAEE">
                                                                                        PAEE
                                                                                    </SelectItem>
                                                                                    <SelectItem value="PAAI">
                                                                                        PAAI
                                                                                    </SelectItem>
                                                                                </SelectContent>
                                                                            </ShadcnSelect>
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            <FormField
                                                                control={form.control}
                                                                name="deficiencia.instituicao"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel htmlFor="instituicao">
                                                                            Instituição
                                                                        </FormLabel>
                                                                        <FormControl>
                                                                            <ShadcnSelect
                                                                                onValueChange={field.onChange}
                                                                                value={field.value}
                                                                            >
                                                                                <SelectTrigger id="instituicao">
                                                                                    <SelectValue placeholder="Selecione" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="INSTITUTO JÔ CLEMENTE">
                                                                                        INSTITUTO JÔ CLEMENTE
                                                                                    </SelectItem>
                                                                                    <SelectItem value="CLIFAK">
                                                                                        CLIFAK
                                                                                    </SelectItem>
                                                                                    <SelectItem value="CEJOLE">
                                                                                        CEJOLE
                                                                                    </SelectItem>
                                                                                    <SelectItem value="CCA">CCA</SelectItem>
                                                                                </SelectContent>
                                                                            </ShadcnSelect>
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            <FormField
                                                                control={form.control}
                                                                name="deficiencia.horarioAtendimento"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel htmlFor="horarioAtendimento">
                                                                            Horário de Atendimento
                                                                        </FormLabel>
                                                                        <FormControl>
                                                                            <ShadcnSelect
                                                                                onValueChange={field.onChange}
                                                                                value={field.value}
                                                                            >
                                                                                <SelectTrigger id="horarioAtendimento">
                                                                                    <SelectValue placeholder="Selecione" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="NENHUM">
                                                                                        NENHUM
                                                                                    </SelectItem>
                                                                                    <SelectItem value="NO TURNO">
                                                                                        NO TURNO
                                                                                    </SelectItem>
                                                                                    <SelectItem value="CONTRATURNO">
                                                                                        CONTRATURNO
                                                                                    </SelectItem>
                                                                                </SelectContent>
                                                                            </ShadcnSelect>
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Subseção: Apoio e Estágio */}
                                                    <div className="border-b pb-2">
                                                        <h4 className="text-lg font-semibold mb-4">
                                                            Apoio e Estágio
                                                        </h4>
                                                        <div className="space-y-4">
                                                            <FormField
                                                                control={form.control}
                                                                name="deficiencia.atendimentoSaude"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel htmlFor="atendimentoSaude">
                                                                            Atendimento de Saúde
                                                                        </FormLabel>
                                                                        <FormControl>
                                                                            <Select
                                                                                isMulti
                                                                                options={atendimentoSaudeOptions}
                                                                                value={atendimentoSaudeOptions.filter(
                                                                                    (option) =>
                                                                                        field.value?.includes(option.value)
                                                                                )}
                                                                                onChange={(
                                                                                    selectedOptions: MultiValue<SelectOption>
                                                                                ) => {
                                                                                    const newTipos = selectedOptions.map(
                                                                                        (option) => option.value
                                                                                    );
                                                                                    field.onChange(newTipos);
                                                                                }}
                                                                                styles={customSelectStyles}
                                                                                placeholder="Selecione os atendimentos"
                                                                                inputId="atendimentoSaude"
                                                                                aria-describedby="deficiencia-desc"
                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            <FormField
                                                                control={form.control}
                                                                name="deficiencia.possuiEstagiario"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel
                                                                            className="flex items-center space-x-2"
                                                                            htmlFor="possuiEstagiario"
                                                                        >
                                                                            <FormControl>
                                                                                <Checkbox
                                                                                    id="possuiEstagiario"
                                                                                    checked={field.value}
                                                                                    onCheckedChange={(checked) => {
                                                                                        field.onChange(!!checked);
                                                                                        if (!checked) {
                                                                                            form.setValue(
                                                                                                "deficiencia.nomeEstagiario", "NÃO NECESSITA"
                                                                                            );
                                                                                            form.setValue(
                                                                                                "deficiencia.justificativaEstagiario",
                                                                                                "SEM BARREIRAS"
                                                                                            );
                                                                                        } else {
                                                                                            form.setValue(
                                                                                                "deficiencia.nomeEstagiario",
                                                                                                ""
                                                                                            );
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            </FormControl>
                                                                            <span>Possui Estagiário(a)</span>
                                                                        </FormLabel>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            {form.watch("deficiencia.possuiEstagiario") && (
                                                                <div className="mt-2 space-y-2 bg-gray-50 p-2 rounded transition-all duration-300">
                                                                    <FormField
                                                                        control={form.control}
                                                                        name="deficiencia.nomeEstagiario"
                                                                        render={({ field }) => (
                                                                            <FormItem>
                                                                                <FormLabel htmlFor="nomeEstagiario">
                                                                                    Nome do(a) Estagiário(a)
                                                                                </FormLabel>
                                                                                <FormControl>
                                                                                    <Input
                                                                                        id="nomeEstagiario"
                                                                                        placeholder="Nome do(a) Estagiário(a)"
                                                                                        {...field}
                                                                                        aria-describedby="deficiencia-desc"
                                                                                    />
                                                                                </FormControl>
                                                                                <FormMessage />
                                                                            </FormItem>
                                                                        )}
                                                                    />
                                                                    <FormField
                                                                        control={form.control}
                                                                        name="deficiencia.justificativaEstagiario"
                                                                        render={({ field }) => (
                                                                            <FormItem>
                                                                                <FormLabel htmlFor="justificativaEstagiario">
                                                                                    Justificativa
                                                                                </FormLabel>
                                                                                <FormControl>
                                                                                    <ShadcnSelect
                                                                                        onValueChange={field.onChange}
                                                                                        value={field.value}
                                                                                    >
                                                                                        <SelectTrigger id="justificativaEstagiario">
                                                                                            <SelectValue placeholder="Selecione a Justificativa" />
                                                                                        </SelectTrigger>
                                                                                        <SelectContent>
                                                                                            <SelectItem value="MEDIAÇÃO E APOIO NAS ATIVIDADES DA UE">
                                                                                                MEDIAÇÃO E APOIO NAS ATIVIDADES DA UE
                                                                                            </SelectItem>
                                                                                            <SelectItem value="SEM BARREIRAS">
                                                                                                SEM BARREIRAS
                                                                                            </SelectItem>
                                                                                        </SelectContent>
                                                                                    </ShadcnSelect>
                                                                                </FormControl>
                                                                                <FormMessage />
                                                                            </FormItem>
                                                                        )}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Subseção: AVE */}
                                                    <div>
                                                        <h4 className="text-lg font-semibold mb-4">AVE</h4>
                                                        <div className="space-y-4">
                                                            <FormField
                                                                control={form.control}
                                                                name="deficiencia.ave"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel
                                                                            className="flex items-center space-x-2"
                                                                            htmlFor="ave"
                                                                        >
                                                                            <FormControl>
                                                                                <Checkbox
                                                                                    id="ave"
                                                                                    checked={field.value}
                                                                                    onCheckedChange={field.onChange}
                                                                                />
                                                                            </FormControl>
                                                                            <span>AVE</span>
                                                                        </FormLabel>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            {form.watch("deficiencia.ave") && (
                                                                <div className="mt-2 space-y-2 bg-gray-50 p-2 rounded transition-all duration-300">
                                                                    <FormField
                                                                        control={form.control}
                                                                        name="deficiencia.justificativaAve"
                                                                        render={({ field }) => (
                                                                            <FormItem>
                                                                                <FormLabel htmlFor="justificativaAve">
                                                                                    Justificativa
                                                                                </FormLabel>
                                                                                <FormControl>
                                                                                    <Select
                                                                                        isMulti
                                                                                        options={justificativaAveOptions}
                                                                                        value={justificativaAveOptions.filter(
                                                                                            (option) =>
                                                                                                field.value?.includes(
                                                                                                    option.value
                                                                                                )
                                                                                        )}
                                                                                        onChange={(
                                                                                            selectedOptions: MultiValue<SelectOption>
                                                                                        ) => {
                                                                                            const newJustificativas =
                                                                                                selectedOptions.map(
                                                                                                    (option) => option.value
                                                                                                );
                                                                                            field.onChange(newJustificativas);
                                                                                        }}
                                                                                        styles={customSelectStyles}
                                                                                        placeholder="Selecione as justificativas"
                                                                                        inputId="justificativaAve"
                                                                                        aria-describedby="deficiencia-desc"
                                                                                    />
                                                                                </FormControl>
                                                                                <FormMessage />
                                                                            </FormItem>
                                                                        )}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={handleCancel}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit">Salvar</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}