"use client";

import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { Users, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { v4 as uuidv4 } from "uuid";

import { useStudents } from "@/hooks/useStudents";
import { StudentFilters } from "@/components/students/StudentFilters";
import { StudentTable } from "@/components/students/StudentTable";
import { StudentPagination } from "@/components/students/StudentPagination";
import { Button } from "@/components/ui/button";
import { StudentTableSkeleton } from "@/components/shared/LoadingSkeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "sonner";
import { Estudante, Student } from "@/types";
import { StudentDataService } from "@/services/studentDataService";
import { logger } from "@/utils/logger";
import { studentFormSchema } from "@/schemas/studentSchemas";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy load heavy components
// ✅ FIX: StudentDialog usa named export, não default export
const StudentDialog = lazy(() =>
  import("@/components/students/StudentDialog").then(module => ({ default: module.StudentDialog }))
);

export default function CadastrarEstudantePage() {
    const { students, loading, error, setStudents, fetchStudents } = useStudents();

    // Filter states
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
    
    // Sorting states
    const [sortColumn, setSortColumn] = useState<string>("");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(10);
    
    // Modal states
    const [editingEstudante, setEditingEstudante] = useState<Estudante | null>(null);
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [openModal, setOpenModal] = useState(false);
    const [cepChangedManually, setCepChangedManually] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Visible columns state
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
    
    // Form
    const form = useForm({
        resolver: zodResolver(studentFormSchema),
        defaultValues: {
            nome: "",
            turma: "",
            turno: "MANHÃ",
            dataNascimento: "",
            matricula: "",
            status: "ATIVO",
            bolsaFamilia: "NÃO",
            email: "",
            endereco: {
                cep: "",
                rua: "",
                numero: "",
                complemento: "",
                bairro: "",
                cidade: "",
                estado: "",
            },
            contatos: [{ podeReceberMensagem: true, nome: "", telefone: "", parentesco: "" }],
            deficiencia: {
                estudanteComDeficiencia: false,
                tipoDeficiencia: "",
                observacoes: "",
            },
        },
    });
    
    // Filtered students
    const filteredStudents = useMemo(() => {
        return students.filter((est) => {
            const matchTurma = turmaFiltro === "" || turmaFiltro === "all" || est.turma === turmaFiltro;
            const matchNome = nomeFiltro === "" || est.nome.toLowerCase().includes(nomeFiltro.toLowerCase());
            const matchMatricula = matriculaFiltro === "" || (est.matricula?.toLowerCase().includes(matriculaFiltro.toLowerCase()) ?? false);
            const matchStatus = statusFiltro === "" || statusFiltro === "all" || est.status === statusFiltro;
            const matchTurno = turnoFiltro === "" || turnoFiltro === "all" || est.turno === turnoFiltro;
            const matchBolsaFamilia = bolsaFamiliaFiltro === "" || bolsaFamiliaFiltro === "all" || est.bolsaFamilia === bolsaFamiliaFiltro;
            const matchContato = contatoFiltro === "" || (est.contatos?.some(
                (contato) =>
                    contato.nome.toLowerCase().includes(contatoFiltro.toLowerCase()) ||
                    contato.telefone.includes(contatoFiltro)
            ) ?? false);
            const matchEmail = emailFiltro === "" || (est.email?.toLowerCase().includes(emailFiltro.toLowerCase()) ?? false);
            const matchEndereco = enderecoFiltro === "" || (est.endereco
                ? `${est.endereco.rua} ${est.endereco.numero} ${est.endereco.bairro} ${est.endereco.cidade} ${est.endereco.estado} ${est.endereco.cep} ${est.endereco.complemento}`
                    .toLowerCase()
                    .includes(enderecoFiltro.toLowerCase())
                : false);
            const cleanDataNascimento = (dateStr: string): string => dateStr.replace(/\D/g, '');
            const matchDataNascimento = dataNascimentoFiltro === "" || (est.dataNascimento?.includes(cleanDataNascimento(dataNascimentoFiltro)) ?? false);
            const matchComDeficiencia = comDeficienciaFiltro === "" || comDeficienciaFiltro === "all" || (est.deficiencia?.estudanteComDeficiencia
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
    }, [
        students,
        turmaFiltro,
        nomeFiltro,
        matriculaFiltro,
        statusFiltro,
        turnoFiltro,
        bolsaFamiliaFiltro,
        contatoFiltro,
        emailFiltro,
        enderecoFiltro,
        dataNascimentoFiltro,
        comDeficienciaFiltro,
    ]);
    
    // Sorted data
    const sortedData = useMemo(() => {
        return [...filteredStudents].sort((a, b) => {
            // Se não há coluna de ordenação customizada, ordenar por turma e depois por nome
            if (!sortColumn) {
                // Primeiro por turma (ordem crescente)
                const turmaA = (a.turma || "").toLowerCase();
                const turmaB = (b.turma || "").toLowerCase();

                if (turmaA !== turmaB) {
                    return turmaA > turmaB ? 1 : -1;
                }

                // Se turmas são iguais, ordenar por nome (ordem crescente)
                const nomeA = (a.nome || "").toLowerCase();
                const nomeB = (b.nome || "").toLowerCase();
                return nomeA > nomeB ? 1 : -1;
            }

            // Ordenação customizada por coluna clicada
            let aVal = a[sortColumn as keyof Student] || "";
            let bVal = b[sortColumn as keyof Student] || "";

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }, [filteredStudents, sortColumn, sortDirection]);
    
    // Pagination calculations
    const totalPages = Math.ceil(sortedData.length / recordsPerPage);
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = sortedData.slice(indexOfFirstRecord, indexOfLastRecord);
    
    // Handlers
    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };
    
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };
    
    const handleRecordsPerPageChange = (value: string) => {
        setRecordsPerPage(parseInt(value, 10));
        setCurrentPage(1);
    };
    
    const handleNewStudent = () => {
        form.reset({
            nome: "",
            turma: "",
            turno: "MANHÃ",
            dataNascimento: "",
            matricula: "",
            status: "ATIVO",
            bolsaFamilia: "NÃO",
            email: "",
            endereco: {
                cep: "",
                rua: "",
                numero: "",
                complemento: "",
                bairro: "",
                cidade: "",
                estado: "",
            },
            contatos: [{ podeReceberMensagem: true, nome: "", telefone: "", parentesco: "" }],
            deficiencia: {
                estudanteComDeficiencia: false,
                tipoDeficiencia: "",
                observacoes: "",
            },
        });
        setEditingEstudante(null);
        setEditingIndex(-1);
        setCepChangedManually(false);
        setOpenModal(true);
    };
    
    const handleFormSubmit = async (data: any) => {
        if (isSaving) return; // Prevenir múltiplos cliques

        setIsSaving(true);

        let processedData: any = null;

        try {
            // Validação manual mínima para garantir campos obrigatórios
            if (!data.nome?.trim()) {
                toast.error("Nome é obrigatório");
                return;
            }

            if (!data.turma?.trim()) {
                toast.error("Turma é obrigatória");
                return;
            }
            // Processar dados para garantir formato correto
            processedData = {
                ...data,
                estudanteId: editingEstudante ? editingEstudante.estudanteId : uuidv4(),
                dataNascimento: data.dataNascimento ? data.dataNascimento.replace(/\D/g, '') : '',
                endereco: data.endereco ? {
                    ...data.endereco,
                    cep: data.endereco.cep?.replace(/\D/g, '') || '',
                } : undefined,
                contatos: data.contatos?.filter((contato: any) => 
                    contato.nome.trim() || contato.telefone.trim() || contato.parentesco.trim()
                ).map((contato: any) => ({
                    nome: contato.nome || '',
                    telefone: contato.telefone ? contato.telefone.replace(/\D/g, '') : '',
                    parentesco: contato.parentesco || '',
                })) || [],
                deficiencia: data.deficiencia ? {
                    estudanteComDeficiencia: data.deficiencia.estudanteComDeficiencia || false,
                    tipoDeficiencia: Array.isArray(data.deficiencia.tipoDeficiencia) 
                        ? data.deficiencia.tipoDeficiencia 
                        : [],
                    possuiBarreiras: data.deficiencia.possuiBarreiras ?? true,
                    aee: data.deficiencia.aee || undefined,
                    instituicao: data.deficiencia.instituicao || undefined,
                    horarioAtendimento: data.deficiencia.horarioAtendimento || 'NENHUM',
                    atendimentoSaude: Array.isArray(data.deficiencia.atendimentoSaude) 
                        ? data.deficiencia.atendimentoSaude 
                        : [],
                    possuiEstagiario: data.deficiencia.possuiEstagiario || false,
                    nomeEstagiario: data.deficiencia.nomeEstagiario || 'NÃO NECESSITA',
                    justificativaEstagiario: data.deficiencia.justificativaEstagiario || 'SEM BARREIRAS',
                    ave: data.deficiencia.ave || false,
                    nomeAve: data.deficiencia.nomeAve || '',
                    justificativaAve: Array.isArray(data.deficiencia.justificativaAve) 
                        ? data.deficiencia.justificativaAve 
                        : [],
                    observacoes: data.deficiencia.observacoes || '',
                } : {
                    estudanteComDeficiencia: false,
                    tipoDeficiencia: [],
                    possuiBarreiras: true,
                    horarioAtendimento: 'NENHUM',
                    atendimentoSaude: [],
                    possuiEstagiario: false,
                    nomeEstagiario: 'NÃO NECESSITA',
                    justificativaEstagiario: 'SEM BARREIRAS',
                    ave: false,
                    nomeAve: '',
                    justificativaAve: [],
                    observacoes: '',
                }
            };
            
            if (editingEstudante) {
                // Atualizar estudante usando DUAL-WRITE (V2 + V3)
                await StudentDataService.updateStudent(processedData);

                // Atualizar o estado local
                const updatedStudents = students.map((student) => {
                    if (student.estudanteId === editingEstudante.estudanteId) {
                        return { ...student, ...processedData };
                    }
                    return student;
                });
                setStudents(updatedStudents);
            } else {
                // Verificar se já existe um estudante com o mesmo nome e turma
                const exists = students.some(student =>
                    student.nome.toUpperCase() === processedData.nome.toUpperCase() &&
                    student.turma.toUpperCase() === processedData.turma.toUpperCase()
                );

                if (exists) {
                    toast.error(`Estudante ${processedData.nome} já existe na turma ${processedData.turma}`);
                    return;
                }

                // Adicionar novo estudante usando DUAL-WRITE (V2 + V3)
                await StudentDataService.addStudent(processedData);

                // Atualizar o estado local
                setStudents([...students, processedData]);
            }

            setOpenModal(false);
            
            toast.success(
                editingEstudante 
                    ? `Estudante ${processedData.nome} atualizado com sucesso!` 
                    : `Estudante ${processedData.nome} cadastrado com sucesso!`
            );
            
        } catch (error) {
            logger.studentOperation(
                editingEstudante ? 'update' : 'create',
                processedData?.estudanteId || '',
                processedData?.nome,
                { error: error instanceof Error ? error.message : 'unknown' }
            );
            toast.error(
                editingEstudante
                    ? "Erro ao atualizar estudante. Tente novamente."
                    : "Erro ao cadastrar estudante. Tente novamente."
            );
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleCancel = () => {
        setOpenModal(false);
        form.reset({
            nome: "",
            turma: "",
            turno: "MANHÃ",
            dataNascimento: "",
            matricula: "",
            status: "ATIVO",
            bolsaFamilia: "NÃO",
            email: "",
            endereco: {
                cep: "",
                rua: "",
                numero: "",
                complemento: "",
                bairro: "",
                cidade: "",
                estado: "",
            },
            contatos: [{ podeReceberMensagem: true, nome: "", telefone: "", parentesco: "" }],
            deficiencia: {
                estudanteComDeficiencia: false,
                tipoDeficiencia: "",
                observacoes: "",
            },
        });
        setEditingEstudante(null);
        setEditingIndex(-1);
        setCepChangedManually(false);
    };
    
    const filters = {
        turmaFiltro,
        nomeFiltro,
        matriculaFiltro,
        statusFiltro,
        bolsaFamiliaFiltro,
        turnoFiltro,
        contatoFiltro,
        emailFiltro,
        enderecoFiltro,
        dataNascimentoFiltro,
        comDeficienciaFiltro,
    };
    
    const setters = {
        setTurmaFiltro,
        setNomeFiltro,
        setMatriculaFiltro,
        setStatusFiltro,
        setBolsaFamiliaFiltro,
        setTurnoFiltro,
        setContatoFiltro,
        setEmailFiltro,
        setEnderecoFiltro,
        setDataNascimentoFiltro,
        setComDeficienciaFiltro,
    };

    // Error handling
    useEffect(() => {
        if (error) {
            toast.error("Erro ao carregar estudantes: " + error.message);
        }
    }, [error]);

    // Fill form when editing a student
    useEffect(() => {
        if (editingEstudante && openModal) {
            form.reset({
                nome: editingEstudante.nome || "",
                turma: editingEstudante.turma || "",
                turno: editingEstudante.turno || "MANHÃ",
                dataNascimento: editingEstudante.dataNascimento ? editingEstudante.dataNascimento.replace(/\D/g, '') : "",
                matricula: editingEstudante.matricula || "",
                status: editingEstudante.status || "ATIVO",
                bolsaFamilia: editingEstudante.bolsaFamilia || "NÃO",
                email: editingEstudante.email || "",
                endereco: {
                    cep: editingEstudante.endereco?.cep || "",
                    rua: editingEstudante.endereco?.rua || "",
                    numero: editingEstudante.endereco?.numero || "",
                    complemento: editingEstudante.endereco?.complemento || "",
                    bairro: editingEstudante.endereco?.bairro || "",
                    cidade: editingEstudante.endereco?.cidade || "",
                    estado: editingEstudante.endereco?.estado || "",
                },
                contatos: editingEstudante.contatos && editingEstudante.contatos.length > 0
                    ? editingEstudante.contatos.map(contato => ({
                        podeReceberMensagem: contato.podeReceberMensagem ?? true,
                        nome: contato.nome,
                        telefone: contato.telefone,
                        parentesco: contato.parentesco || ''
                    }))
                    : [{ podeReceberMensagem: true, nome: "", telefone: "", parentesco: "" }],
                deficiencia: {
                    estudanteComDeficiencia: editingEstudante.deficiencia?.estudanteComDeficiencia || false,
                    tipoDeficiencia: editingEstudante.deficiencia?.tipoDeficiencia || "",
                    observacoes: editingEstudante.deficiencia?.observacoes || "",
                },
            });
        }
    }, [editingEstudante, openModal, form]);

    const totalRecords = sortedData.length;

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <div className="container mx-auto p-4 max-w-[1400px]">
                    <div className="mb-6">
                        <Skeleton className="h-12 w-64 mb-2" />
                        <Skeleton className="h-4 w-96" />
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6">
                        <div className="mb-6 flex gap-4">
                            <Skeleton className="h-10 w-32" />
                            <Skeleton className="h-10 w-40" />
                        </div>

                        <StudentTableSkeleton rows={10} />

                        <div className="mt-6 flex justify-between items-center">
                            <Skeleton className="h-10 w-48" />
                            <Skeleton className="h-10 w-32" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <Toaster />

                {/* Main Content */}
                <div className="container mx-auto p-4 max-w-[1400px]">
                {/* Compact Header with Gradient */}
                <div className="mb-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl shadow-lg overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-white">
                                    Gerenciamento de Estudantes
                                </h1>
                                <p className="text-xs text-blue-100">
                                    {students.length} cadastrados • {totalRecords} resultados
                                </p>
                            </div>
                        </div>

                        <Button
                            size="sm"
                            className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                            onClick={handleNewStudent}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Estudante
                        </Button>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="space-y-4">
                    {/* Filters */}
                    <StudentFilters
                        students={students}
                        turmaFiltro={filters.turmaFiltro}
                        setTurmaFiltro={setters.setTurmaFiltro}
                        nomeFiltro={filters.nomeFiltro}
                        setNomeFiltro={setters.setNomeFiltro}
                        matriculaFiltro={filters.matriculaFiltro}
                        setMatriculaFiltro={setters.setMatriculaFiltro}
                        statusFiltro={filters.statusFiltro}
                        setStatusFiltro={setters.setStatusFiltro}
                        bolsaFamiliaFiltro={filters.bolsaFamiliaFiltro}
                        setBolsaFamiliaFiltro={setters.setBolsaFamiliaFiltro}
                        turnoFiltro={filters.turnoFiltro}
                        setTurnoFiltro={setters.setTurnoFiltro}
                        contatoFiltro={filters.contatoFiltro}
                        setContatoFiltro={setters.setContatoFiltro}
                        emailFiltro={filters.emailFiltro}
                        setEmailFiltro={setters.setEmailFiltro}
                        enderecoFiltro={filters.enderecoFiltro}
                        setEnderecoFiltro={setters.setEnderecoFiltro}
                        dataNascimentoFiltro={filters.dataNascimentoFiltro}
                        setDataNascimentoFiltro={setters.setDataNascimentoFiltro}
                        comDeficienciaFiltro={filters.comDeficienciaFiltro}
                        setComDeficienciaFiltro={setters.setComDeficienciaFiltro}
                        visibleColumns={visibleColumns}
                        setVisibleColumns={setVisibleColumns}
                    />

                    {/* Table */}
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

                    {/* Pagination */}
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

            {/* Dialog Modal - Lazy Loaded */}
            {openModal && (
                <Suspense fallback={
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 animate-pulse">
                            <div className="h-8 w-64 bg-slate-200 rounded mb-4"></div>
                            <div className="space-y-3">
                                <div className="h-4 w-full bg-slate-200 rounded"></div>
                                <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
                            </div>
                        </div>
                    </div>
                }>
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
                        isSaving={isSaving}
                    />
                </Suspense>
            )}
        </div>
        </ErrorBoundary>
    );
}