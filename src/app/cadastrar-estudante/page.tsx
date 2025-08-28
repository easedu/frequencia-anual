"use client";

import { useEffect, useState, useMemo } from "react";
import { Users, Plus } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useStudents } from "@/hooks/useStudents";
import { StudentFilters } from "@/components/StudentFilters";
import { StudentTable } from "@/components/StudentTable";
import { StudentPagination } from "@/components/StudentPagination";
import { StudentDialog } from "@/components/StudentDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "sonner";
import { Estudante } from "@/types";

// Student form schema - Minimal validation for debugging
const studentSchema = z.object({
    nome: z.string().min(1, "Nome é obrigatório"),
    turma: z.string().min(1, "Turma é obrigatória"),
    turno: z.string().default("MANHÃ"),
    dataNascimento: z.string().optional(),
    matricula: z.string().optional(),
    status: z.string().default("ATIVO"),
    bolsaFamilia: z.string().default("NÃO"),
    email: z.string().optional(),
}).passthrough(); // Allow all other fields to pass through without validation

export default function CadastrarEstudantePage() {
    const { students, loading, error, saveStudents, setStudents } = useStudents();
    
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
        resolver: zodResolver(studentSchema),
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
            contatos: [{ nome: "", telefone: "", parentesco: "" }],
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
        if (!sortColumn) return filteredStudents;
        
        return [...filteredStudents].sort((a, b) => {
            let aVal = a[sortColumn] || "";
            let bVal = b[sortColumn] || "";
            
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
    
    const handleRecordsPerPageChange = (records: number) => {
        setRecordsPerPage(records);
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
            contatos: [{ nome: "", telefone: "", parentesco: "" }],
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
            const processedData = {
                ...data,
                estudanteId: editingEstudante ? editingEstudante.estudanteId : Date.now().toString(),
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
            
            let updatedStudents;
            if (editingEstudante) {
                // Use o ID do estudante para encontrar e atualizar
                updatedStudents = students.map((student) => {
                    if (student.estudanteId === editingEstudante.estudanteId) {
                        return { ...student, ...processedData };
                    }
                    return student;
                });
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
                
                updatedStudents = [...students, processedData];
            }
            
            await saveStudents(updatedStudents);
            setStudents(updatedStudents);
            setOpenModal(false);
            
            toast.success(
                editingEstudante 
                    ? `Estudante ${processedData.nome} atualizado com sucesso!` 
                    : `Estudante ${processedData.nome} cadastrado com sucesso!`
            );
            
        } catch (error) {
            console.error('Erro ao salvar estudante:', error);
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
            contatos: [{ nome: "", telefone: "", parentesco: "" }],
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
            console.log('🔧 Filling form with student data:', editingEstudante);
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
                contatos: editingEstudante.contatos?.length > 0 
                    ? editingEstudante.contatos 
                    : [{ nome: "", telefone: "", parentesco: "" }],
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
                                onClick={handleNewStudent}
                            >
                                <Plus className="w-6 h-6 mr-3" />
                                Novo Estudante
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="space-y-8">
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

            {/* Dialog Modal */}
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
        </div>
    );
}