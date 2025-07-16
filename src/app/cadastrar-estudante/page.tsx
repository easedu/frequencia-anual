"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Plus } from "lucide-react";

import { formSchema } from "./constants/formSchema";
import { Estudante } from "./interfaces";
import { cleanTelefone, cleanCep, formatTelefone, cleanDataNascimento } from "./utils/formatters";
import { useStudents } from "@/hooks/useStudents";
import { StudentFilters } from "./components/StudentFilters";
import { StudentTable } from "./components/StudentTable";
import { StudentPagination } from "./components/StudentPagination";
import { StudentDialog } from "./components/StudentDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster, toast } from "sonner";

export default function CadastrarEstudantePage() {
    const { students, loading, error, saveStudents, setStudents } = useStudents();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nome: "",
            turma: "",
            matricula: "",
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
                nomeAve: "",
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
    const [matriculaFiltro, setMatriculaFiltro] = useState<string>("");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [recordsPerPage, setRecordsPerPage] = useState<number>(10);
    const [sortColumn, setSortColumn] = useState<string>("");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set([
            "turma",
            "nome",
            "matricula",
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
    const [cepChangedManually, setCepChangedManually] = useState<boolean>(false);
    const [editingEstudante, setEditingEstudante] = useState<Estudante | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [openModal, setOpenModal] = useState<boolean>(false);

    useEffect(() => {
        if (editingEstudante) {
            console.log("Preenchendo formulário com editingEstudante:", editingEstudante);
            setCepChangedManually(false);
            form.reset({
                nome: editingEstudante.nome || "",
                turma: editingEstudante.turma || "",
                matricula: editingEstudante.matricula || "",
                bolsaFamilia: editingEstudante.bolsaFamilia || "NÃO",
                status: (editingEstudante.status as "ATIVO" | "INATIVO") || "ATIVO",
                dataNascimento: editingEstudante.dataNascimento || "",
                turno: editingEstudante.turno || "MANHÃ",
                email: editingEstudante.email || "",
                endereco: {
                    cep: editingEstudante.endereco?.cep || "",
                    rua: editingEstudante.endereco?.rua || "",
                    numero: editingEstudante.endereco?.numero || "",
                    bairro: editingEstudante.endereco?.bairro || "",
                    cidade: editingEstudante.endereco?.cidade || "",
                    estado: editingEstudante.endereco?.estado || "",
                    complemento: editingEstudante.endereco?.complemento || "",
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
                    nomeAve: "",
                    justificativaAve: [],
                },
            });
        }
    }, [editingEstudante, form]);

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
            console.log("Contém matricula?", "matricula" in students[0]);
            console.log("Contém provaSaoPaulo?", "provaSaoPaulo" in students[0]);
        }
        if (error) {
            console.error("Erro no hook useStudents:", error);
            toast.error("Erro ao carregar estudantes: " + error.message);
        }
    }, [students, loading, error]);

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
            matricula: data.matricula?.trim() || "",
            status: data.status.toUpperCase(),
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
                    nomeAve: data.deficiencia.nomeAve || "",
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
            // Preservar dados existentes da Prova São Paulo
            provaSaoPaulo: editingEstudante.provaSaoPaulo || [],
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
        setCepChangedManually(false);
        form.reset();
    };

    const estudantesFiltrados = students.filter((est) => {
        const matchTurma =
            turmaFiltro === "" || turmaFiltro === "all" || est.turma === turmaFiltro;
        const matchNome =
            nomeFiltro === "" ||
            est.nome.toLowerCase().includes(nomeFiltro.toLowerCase());
        const matchMatricula =
            matriculaFiltro === "" ||
            (est.matricula?.toLowerCase().includes(matriculaFiltro.toLowerCase()) ?? false);
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
            matchMatricula &&
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
                if (sortColumn === "matricula") {
                    const aValue = a.matricula?.toLowerCase() || "";
                    const bValue = b.matricula?.toLowerCase() || "";
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

    console.log("Total de registros:", totalRecords);
    console.log("Páginas totais:", totalPages);
    console.log("Página atual:", currentPage);
    console.log("Índices:", { indexOfFirstRecord, indexOfLastRecord });
    console.log("Registros atuais:", currentRecords);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <div className="flex items-center justify-center min-h-screen">
                    <div className="space-y-6 w-full max-w-lg mx-auto p-8">
                        <div className="flex items-center justify-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
                            <div className="text-xl font-semibold text-slate-600 dark:text-slate-300">
                                Carregando estudantes...
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Skeleton className="h-16 w-full rounded-2xl" />
                            <Skeleton className="h-12 w-4/5 rounded-xl" />
                            <Skeleton className="h-12 w-3/5 rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <Toaster />

            {/* Main Content */}
            <div className="container mx-auto p-6 max-w-[1400px]">
                {/* Header Card */}
                <div className="mb-8 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-slate-700/20 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8">
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                                    <Users className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white">
                                        Gerenciamento de Estudantes
                                    </h1>
                                    <p className="text-blue-100 mt-2 text-lg">
                                        {students.length} estudantes cadastrados • {totalRecords} resultados
                                    </p>
                                </div>
                            </div>

                            <Button
                                size="lg"
                                className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/40 backdrop-blur-sm transition-all duration-300 shadow-lg hover:shadow-xl px-8 py-6 text-lg rounded-2xl"
                                onClick={() => {
                                    setEditingEstudante({
                                        estudanteId: "",
                                        turma: "",
                                        nome: "",
                                        matricula: "",
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
                                            nomeAve: "",
                                            justificativaAve: [],
                                        },
                                        provaSaoPaulo: [],
                                    });
                                    setEditingIndex(null);
                                    setOpenModal(true);
                                    setCepChangedManually(false);
                                }}
                            >
                                <Plus className="w-6 h-6 mr-3" />
                                Novo Estudante
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="space-y-8">
                    {/*  Filters */}
                    <StudentFilters
                        students={students}
                        turmaFiltro={turmaFiltro}
                        setTurmaFiltro={setTurmaFiltro}
                        nomeFiltro={nomeFiltro}
                        setNomeFiltro={setNomeFiltro}
                        matriculaFiltro={matriculaFiltro}
                        setMatriculaFiltro={setMatriculaFiltro}
                        statusFiltro={statusFiltro}
                        setStatusFiltro={setStatusFiltro}
                        bolsaFamiliaFiltro={bolsaFamiliaFiltro}
                        setBolsaFamiliaFiltro={setBolsaFamiliaFiltro}
                        turnoFiltro={turnoFiltro}
                        setTurnoFiltro={setTurnoFiltro}
                        contatoFiltro={contatoFiltro}
                        setContatoFiltro={setContatoFiltro}
                        emailFiltro={emailFiltro}
                        setEmailFiltro={setEmailFiltro}
                        enderecoFiltro={enderecoFiltro}
                        setEnderecoFiltro={setEnderecoFiltro}
                        dataNascimentoFiltro={dataNascimentoFiltro}
                        setDataNascimentoFiltro={setDataNascimentoFiltro}
                        comDeficienciaFiltro={comDeficienciaFiltro}
                        setComDeficienciaFiltro={setComDeficienciaFiltro}
                        visibleColumns={visibleColumns}
                        setVisibleColumns={setVisibleColumns}
                    />

                    {/*  Table */}
                    <StudentTable
                        currentRecords={currentRecords}
                        visibleColumns={visibleColumns}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        handleSort={handleSort}
                        setEditingEstudante={setEditingEstudante}
                        setEditingIndex={setEditingIndex}
                        setOpenModal={setOpenModal}
                        students={students}
                    />

                    {/*  Pagination */}
                    {totalRecords > 0 && (
                        <StudentPagination
                            currentPage={currentPage}
                            totalRecords={totalRecords}
                            recordsPerPage={recordsPerPage}
                            totalPages={totalPages}
                            handlePageChange={handlePageChange}
                            handleRecordsPerPageChange={handleRecordsPerPageChange}
                        />
                    )}
                </div>
            </div>

            {/*  Dialog Modal */}
            <StudentDialog
                openModal={openModal}
                setOpenModal={setOpenModal}
                form={form}
                editingIndex={editingIndex}
                editingEstudante={editingEstudante}
                handleFormSubmit={handleFormSubmit}
                handleCancel={handleCancel}
                cepChangedManually={cepChangedManually}
                setCepChangedManually={setCepChangedManually}
            />
        </div>
    );
}