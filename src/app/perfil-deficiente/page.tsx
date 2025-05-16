"use client";

import { useState, useMemo, useEffect } from "react";
import { useStudents } from "@/hooks/useStudents";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Estudante } from "@/interfaces";
import { Pencil, Trash, X } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Toaster, toast } from "sonner";
import { db } from "@/firebase.config";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { formatDateInput, parseDateToFirebase, formatFirebaseDate } from "../utils";

// Interface de Ocorrência
interface Ocorrencia {
    id: string;
    date: string;
    description: string;
    createdBy: string;
    sensitive: boolean;
}

interface ChartData {
    name: string;
    value: number;
}

interface TurmaData {
    turma: string;
    semDeficiencia: number;
    comDeficienciaSemBarreiras: number;
    comDeficienciaComBarreiras: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"];

const processChartData = (
    students: Estudante[],
    key: keyof Exclude<Estudante["deficiencia"], undefined | null> | ((s: Estudante) => string[])
): ChartData[] => {
    const counts: { [key: string]: number } = {};
    students.forEach((student) => {
        if (student.deficiencia?.estudanteComDeficiencia) {
            if (typeof key === "function") {
                const values = key(student);
                values.forEach((value) => {
                    counts[value] = (counts[value] || 0) + 1;
                });
            } else {
                const value = student.deficiencia[key] as string | string[];
                if (Array.isArray(value)) {
                    value.forEach((v) => {
                        counts[v] = (counts[v] || 0) + 1;
                    });
                } else if (value) {
                    counts[value] = (counts[value] || 0) + 1;
                }
            }
        }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
};

export default function DashboardDeficiencia() {
    const { students, loading, error } = useStudents();
    const [filtroTipoDeficiencia, setFiltroTipoDeficiencia] = useState<string>("TODOS");
    const [filtroInstituicao, setFiltroInstituicao] = useState<string>("TODOS");
    const [filtroAee, setFiltroAee] = useState<string>("TODOS");
    const [filtroHorario, setFiltroHorario] = useState<string>("TODOS");
    const [filtroEstagiario, setFiltroEstagiario] = useState<string>("TODOS");
    const [filtroAve, setFiltroAve] = useState<string>("TODOS");
    const [filtroTurma, setFiltroTurma] = useState<string | null>(null);
    const [filtroTabelaEstagiario, setFiltroTabelaEstagiario] = useState<string>("");
    const [filtroTabelaAve, setFiltroTabelaAve] = useState<string>("");
    const [filtroTabelaEstudantes, setFiltroTabelaEstudantes] = useState<string>("");
    const [sortEstagiario, setSortEstagiario] = useState<"asc" | "desc" | null>(null);
    const [sortAve, setSortAve] = useState<"asc" | "desc" | null>(null);

    // Estados para Ocorrências
    const [selectedStudent, setSelectedStudent] = useState<Estudante | null>(null);
    const [occurrenceDate, setOccurrenceDate] = useState<string>(new Date().toLocaleDateString("pt-BR"));
    const [occurrenceDescription, setOccurrenceDescription] = useState<string>("");
    const [occurrenceSensitive, setOccurrenceSensitive] = useState<boolean>(false);
    const [editingOccurrence, setEditingOccurrence] = useState<Ocorrencia | null>(null);
    const [occurrences, setOccurrences] = useState<Ocorrencia[]>([]);
    const [showDeleteOccurrenceDialog, setShowDeleteOccurrenceDialog] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [filtroTabelaOcorrencias, setFiltroTabelaOcorrencias] = useState<string>("");
    const [isOccurrenceSectionVisible, setIsOccurrenceSectionVisible] = useState<boolean>(false);

    const auth = getAuth();

    // Verificar se há um ID de estudante na URL para abrir os cards de ocorrência automaticamente
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const studentId = urlParams.get('studentId');

            if (studentId && students.length > 0) {
                const foundStudent = students.find(s => s.estudanteId === studentId);
                if (foundStudent) {
                    setSelectedStudent(foundStudent);
                    setIsOccurrenceSectionVisible(true);

                    // Usar setTimeout para garantir que os elementos foram renderizados
                    setTimeout(() => {
                        document.getElementById("occurrence-section")?.scrollIntoView({ behavior: "smooth" });
                    }, 500);
                }
            }
        }
    }, [students]);

    // Buscar o perfil do usuário atual para definir permissões
    useEffect(() => {
        const fetchUserRole = async () => {
            try {
                const user = auth.currentUser;
                if (!user || !user.email) {
                    setUserRole("user");
                    return;
                }
                const q = query(collection(db, "users"), where("email", "==", user.email));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const userDoc = querySnapshot.docs[0];
                    const userData = userDoc.data();
                    setUserRole(userData.perfil || "user");
                } else {
                    setUserRole("user");
                }
            } catch (error) {
                console.error("Erro ao carregar perfil do usuário:", error);
                setUserRole("user");
            }
        };

        fetchUserRole();
    }, [auth]);

    // Resetar formulário de ocorrência quando mudar o aluno selecionado
    useEffect(() => {
        if (!selectedStudent) {
            setOccurrenceDate(new Date().toLocaleDateString("pt-BR"));
            setOccurrenceDescription("");
            setOccurrenceSensitive(false);
            setEditingOccurrence(null);
            setOccurrences([]);
            setIsOccurrenceSectionVisible(false);
        } else {
            fetchOccurrencesForStudent(selectedStudent.estudanteId);
            setIsOccurrenceSectionVisible(true);
        }
    }, [selectedStudent]);

    // Sincronizar campos do formulário com ocorrência sendo editada
    useEffect(() => {
        if (editingOccurrence) {
            setOccurrenceDate(editingOccurrence.date);
            setOccurrenceDescription(editingOccurrence.description);
            setOccurrenceSensitive(editingOccurrence.sensitive || false);
        } else {
            setOccurrenceDate(new Date().toLocaleDateString("pt-BR"));
            setOccurrenceDescription("");
            setOccurrenceSensitive(false);
        }
    }, [editingOccurrence]);

    // Buscar ocorrências para o estudante selecionado
    const fetchOccurrencesForStudent = async (studentId: string) => {
        try {
            const occurrencesSnapshot = await getDocs(collection(db, "2025", "occurrences", studentId));
            const occurrencesData: Ocorrencia[] = occurrencesSnapshot.docs.map(doc => ({
                id: doc.id,
                date: formatFirebaseDate(doc.data().date as string),
                description: doc.data().description as string,
                createdBy: doc.data().createdBy as string || "Não informado",
                sensitive: doc.data().sensitive as boolean || false,
            })).sort((a, b) => (parseDateToFirebase(b.date)?.localeCompare(parseDateToFirebase(a.date) || "") || 0));

            setOccurrences(occurrencesData);
        } catch (error) {
            console.error("Erro ao buscar ocorrências:", error);
            toast.error("Erro ao carregar ocorrências");
        }
    };

    // Adicionar uma nova ocorrência
    const handleAddOccurrence = async () => {
        if (!selectedStudent || !occurrenceDate || !occurrenceDescription) {
            toast.error("Selecione um aluno e preencha todos os campos");
            return;
        }

        const formattedDate = parseDateToFirebase(occurrenceDate);
        if (!formattedDate) {
            toast.error("Data inválida. Use o formato DD/MM/YYYY");
            return;
        }

        try {
            const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido";

            const occurrenceData = {
                date: formattedDate,
                description: occurrenceDescription,
                createdBy: currentUser,
                sensitive: occurrenceSensitive,
            };

            await addDoc(collection(db, "2025", "occurrences", selectedStudent.estudanteId), occurrenceData);

            setOccurrenceDate(new Date().toLocaleDateString("pt-BR"));
            setOccurrenceDescription("");
            setOccurrenceSensitive(false);

            await fetchOccurrencesForStudent(selectedStudent.estudanteId);
            toast.success("Ocorrência registrada com sucesso!");

            // Scroll para o card de ocorrências
            document.getElementById("occurrence-card")?.scrollIntoView({ behavior: "smooth" });

        } catch (error) {
            console.error("Erro ao adicionar ocorrência:", error);
            toast.error("Erro ao cadastrar ocorrência");
        }
    };

    // Editar uma ocorrência existente
    const handleEditOccurrence = async () => {
        if (!selectedStudent || !editingOccurrence || !occurrenceDate || !occurrenceDescription) {
            toast.error("Preencha todos os campos para editar a ocorrência");
            return;
        }

        const formattedDate = parseDateToFirebase(occurrenceDate);
        if (!formattedDate) {
            toast.error("Data inválida. Use o formato DD/MM/YYYY");
            return;
        }

        try {
            const occurrenceRef = doc(db, "2025", "occurrences", selectedStudent.estudanteId, editingOccurrence.id);

            await updateDoc(occurrenceRef, {
                date: formattedDate,
                description: occurrenceDescription,
                sensitive: occurrenceSensitive,
                createdBy: auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido",
            });

            setEditingOccurrence(null);
            setOccurrenceDate(new Date().toLocaleDateString("pt-BR"));
            setOccurrenceDescription("");
            setOccurrenceSensitive(false);

            await fetchOccurrencesForStudent(selectedStudent.estudanteId);
            toast.success("Ocorrência atualizada com sucesso!");

        } catch (error) {
            console.error("Erro ao atualizar ocorrência:", error);
            toast.error("Erro ao atualizar ocorrência");
        }
    };

    // Excluir uma ocorrência
    const handleDeleteOccurrence = async (occurrenceId: string) => {
        if (!selectedStudent) return;

        try {
            const occurrenceRef = doc(db, "2025", "occurrences", selectedStudent.estudanteId, occurrenceId);
            await deleteDoc(occurrenceRef);

            await fetchOccurrencesForStudent(selectedStudent.estudanteId);
            toast.success("Ocorrência excluída com sucesso!");

        } catch (error) {
            console.error("Erro ao excluir ocorrência:", error);
            toast.error("Erro ao excluir ocorrência");
        } finally {
            setShowDeleteOccurrenceDialog(null);
        }
    };

    // Selecionar estudante para registro de ocorrências
    const handleSelectStudentForOccurrence = (student: Estudante) => {
        // Se o mesmo estudante for selecionado novamente, alternar a visibilidade
        if (selectedStudent?.estudanteId === student.estudanteId) {
            setSelectedStudent(null);
            setIsOccurrenceSectionVisible(false);
        } else {
            setSelectedStudent(student);
            setIsOccurrenceSectionVisible(true);

            // Atualizar URL com o ID do estudante selecionado para permitir compartilhar
            if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.set('studentId', student.estudanteId);
                window.history.pushState({}, '', url.toString());
            }

            // Usar setTimeout para garantir que os elementos foram renderizados
            setTimeout(() => {
                document.getElementById("occurrence-section")?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        }
    };

    // Tratar mudança no checkbox de sensibilidade
    const handleSensitiveChange = (checked: boolean | string) => {
        const isChecked = typeof checked === "boolean" ? checked : checked === "true";
        setOccurrenceSensitive(isChecked);
    };

    // Clicar em uma turma para filtrar
    const handleTurmaClick = (turma: string) => {
        setFiltroTurma(filtroTurma === turma ? null : turma);
    };

    // Filtrar estudantes com base nos filtros selecionados
    const filteredStudents = useMemo(() => {
        return students.filter((student) => {
            const def = student.deficiencia;
            if (!def?.estudanteComDeficiencia) return false;
            return (
                (filtroTipoDeficiencia === "TODOS" ||
                    def.tipoDeficiencia?.includes(filtroTipoDeficiencia)) &&
                (filtroInstituicao === "TODOS" || def.instituicao === filtroInstituicao) &&
                (filtroAee === "TODOS" || def.aee === filtroAee) &&
                (filtroHorario === "TODOS" || def.horarioAtendimento === filtroHorario) &&
                (filtroEstagiario === "TODOS" ||
                    (filtroEstagiario === "true" && def.possuiEstagiario) ||
                    (filtroEstagiario === "false" && !def.possuiEstagiario)) &&
                (filtroAve === "TODOS" ||
                    (filtroAve === "true" && def.ave) ||
                    (filtroAve === "false" && !def.ave)) &&
                (filtroTurma === null || student.turma === filtroTurma)
            );
        });
    }, [
        students,
        filtroTipoDeficiencia,
        filtroInstituicao,
        filtroAee,
        filtroHorario,
        filtroEstagiario,
        filtroAve,
        filtroTurma,
    ]);

    // Filtrar estagiários para a tabela
    const filteredEstagiarios = useMemo(() => {
        let result = filteredStudents.filter((s) => s.deficiencia?.possuiEstagiario);
        if (filtroTabelaEstagiario) {
            const lowerFilter = filtroTabelaEstagiario.toLowerCase();
            result = result.filter((student) => {
                const def = student.deficiencia;
                return (
                    student.turma?.toLowerCase().includes(lowerFilter) ||
                    student.nome.toLowerCase().includes(lowerFilter) ||
                    def?.nomeEstagiario?.toLowerCase().includes(lowerFilter) ||
                    def?.justificativaEstagiario?.toLowerCase().includes(lowerFilter)
                );
            });
        }
        if (!sortEstagiario) return result;
        return [...result].sort((a, b) => {
            const nomeA = a.deficiencia?.nomeEstagiario?.toLowerCase() || "";
            const nomeB = b.deficiencia?.nomeEstagiario?.toLowerCase() || "";
            return sortEstagiario === "asc"
                ? nomeA.localeCompare(nomeB)
                : nomeB.localeCompare(nomeA);
        });
    }, [filteredStudents, filtroTabelaEstagiario, sortEstagiario]);

    // Filtrar AVEs para a tabela
    const filteredAves = useMemo(() => {
        let result = filteredStudents.filter((s) => s.deficiencia?.ave);
        if (filtroTabelaAve) {
            const lowerFilter = filtroTabelaAve.toLowerCase();
            result = result.filter((student) => {
                const def = student.deficiencia;
                return (
                    student.turma?.toLowerCase().includes(lowerFilter) ||
                    student.nome.toLowerCase().includes(lowerFilter) ||
                    def?.nomeAve?.toLowerCase().includes(lowerFilter) ||
                    def?.justificativaAve?.some((j) => j.toLowerCase().includes(lowerFilter))
                );
            });
        }
        if (!sortAve) return result;
        return [...result].sort((a, b) => {
            const nomeA = a.deficiencia?.nomeAve?.toLowerCase() || "";
            const nomeB = b.deficiencia?.nomeAve?.toLowerCase() || "";
            return sortAve === "asc"
                ? nomeA.localeCompare(nomeB)
                : nomeB.localeCompare(nomeA);
        });
    }, [filteredStudents, filtroTabelaAve, sortAve]);

    // Filtrar estudantes para a tabela de detalhes
    const filteredEstudantesDetalhes = useMemo(() => {
        let result = filteredStudents;
        if (filtroTabelaEstudantes) {
            const lowerFilter = filtroTabelaEstudantes.toLowerCase();
            result = result.filter((student) => {
                const def = student.deficiencia;
                return (
                    student.turma?.toLowerCase().includes(lowerFilter) ||
                    student.nome.toLowerCase().includes(lowerFilter) ||
                    def?.tipoDeficiencia?.some((t) => t.toLowerCase().includes(lowerFilter)) ||
                    def?.aee?.toLowerCase().includes(lowerFilter) ||
                    def?.instituicao?.toLowerCase().includes(lowerFilter) ||
                    def?.horarioAtendimento?.toLowerCase().includes(lowerFilter) ||
                    (def?.possuiEstagiario ? "sim" : "não").includes(lowerFilter) ||
                    def?.nomeEstagiario?.toLowerCase().includes(lowerFilter) ||
                    def?.justificativaEstagiario?.toLowerCase().includes(lowerFilter) ||
                    (def?.ave ? "sim" : "não").includes(lowerFilter) ||
                    def?.nomeAve?.toLowerCase().includes(lowerFilter) ||
                    def?.justificativaAve?.some((j) => j.toLowerCase().includes(lowerFilter)) ||
                    (def?.possuiBarreiras ? "sim" : "não").includes(lowerFilter)
                );
            });
        }
        return result;
    }, [filteredStudents, filtroTabelaEstudantes]);

    // Filtrar ocorrências para a tabela
    const filteredOccurrences = useMemo(() => {
        if (!filtroTabelaOcorrencias) return occurrences;

        const lowerFilter = filtroTabelaOcorrencias.toLowerCase();
        return occurrences.filter(occurrence =>
            occurrence.date.toLowerCase().includes(lowerFilter) ||
            occurrence.description.toLowerCase().includes(lowerFilter) ||
            occurrence.createdBy.toLowerCase().includes(lowerFilter)
        );
    }, [occurrences, filtroTabelaOcorrencias]);

    // Processar dados por turma
    const turmasData = useMemo(() => {
        const turmasMap: { [key: string]: TurmaData } = {};
        students.forEach((student) => {
            const turma = student.turma || "Sem Turma";
            if (!turmasMap[turma]) {
                turmasMap[turma] = {
                    turma,
                    semDeficiencia: 0,
                    comDeficienciaSemBarreiras: 0,
                    comDeficienciaComBarreiras: 0,
                };
            }
            if (student.deficiencia?.estudanteComDeficiencia) {
                if (student.deficiencia?.possuiBarreiras) {
                    turmasMap[turma].comDeficienciaComBarreiras += 1;
                } else {
                    turmasMap[turma].comDeficienciaSemBarreiras += 1;
                }
            } else {
                turmasMap[turma].semDeficiencia += 1;
            }
        });
        return Object.values(turmasMap).sort((a, b) => a.turma.localeCompare(b.turma));
    }, [students]);

    // Processar dados dos gráficos com base nos estudantes filtrados
    const tiposDeficienciaData = processChartData(filteredStudents, "tipoDeficiencia");
    const aeeData = processChartData(filteredStudents, "aee");
    const instituicaoData = processChartData(filteredStudents, "instituicao");
    const horarioData = processChartData(filteredStudents, "horarioAtendimento");
    const estagiarioData = processChartData(filteredStudents, "justificativaEstagiario");
    const aveData = processChartData(filteredStudents, "justificativaAve");

    // Cálculo dos totais para os cartões de big numbers
    const totalComDeficiencia = filteredStudents.length;
    const totalEstudantes = students.length;
    const totalComBarreiras = filteredStudents.filter(
        (s) => s.deficiencia?.possuiBarreiras
    ).length;
    const totalSemBarreiras = totalComDeficiencia - totalComBarreiras;
    const totalComEstagiario = filteredStudents.filter(
        (s) => s.deficiencia?.possuiEstagiario
    ).length;
    const totalSemEstagiario = totalComDeficiencia - totalComEstagiario;
    const totalComAve = filteredStudents.filter(
        (s) => s.deficiencia?.ave
    ).length;
    const totalSemAve = totalComDeficiencia - totalComAve;

    if (loading) return <div>Carregando...</div>;
    if (error) return <div>Erro: {error.message}</div>;

    return (
        <div className="p-6">
            <Toaster />
            <h1 className="text-2xl font-bold mb-4">
                Dashboard de Estudantes com Deficiência
            </h1>

            {/* Card de Filtros */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="filtro-tipo-deficiencia" className="mb-2 block">
                                Filtrar por Tipo de Deficiência
                            </Label>
                            <Select
                                onValueChange={setFiltroTipoDeficiencia}
                                value={filtroTipoDeficiencia}
                            >
                                <SelectTrigger id="filtro-tipo-deficiencia">
                                    <SelectValue placeholder="Selecione o tipo de deficiência" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TODOS">Todos</SelectItem>
                                    {tiposDeficienciaData.map((tipo) => (
                                        <SelectItem key={tipo.name} value={tipo.name}>
                                            {tipo.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="filtro-instituicao" className="mb-2 block">
                                Filtrar por Instituição
                            </Label>
                            <Select
                                onValueChange={setFiltroInstituicao}
                                value={filtroInstituicao}
                            >
                                <SelectTrigger id="filtro-instituicao">
                                    <SelectValue placeholder="Selecione a instituição" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TODOS">Todas</SelectItem>
                                    {[
                                        "INSTITUTO JÔ CLEMENTE",
                                        "CLIFAK",
                                        "CEJOLE",
                                        "CCA",
                                        "NENHUM",
                                    ].map((inst) => (
                                        <SelectItem key={inst} value={inst}>
                                            {inst}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="filtro-aee" className="mb-2 block">
                                Filtrar por AEE
                            </Label>
                            <Select onValueChange={setFiltroAee} value={filtroAee}>
                                <SelectTrigger id="filtro-aee">
                                    <SelectValue placeholder="Selecione o tipo de AEE" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TODOS">Todos</SelectItem>
                                    <SelectItem value="PAEE">PAEE</SelectItem>
                                    <SelectItem value="PAAI">PAAI</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="filtro-horario" className="mb-2 block">
                                Filtrar por Horário
                            </Label>
                            <Select onValueChange={setFiltroHorario} value={filtroHorario}>
                                <SelectTrigger id="filtro-horario">
                                    <SelectValue placeholder="Selecione o horário" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TODOS">Todos</SelectItem>
                                    <SelectItem value="NO TURNO">No Turno</SelectItem>
                                    <SelectItem value="CONTRATURNO">Contraturno</SelectItem>
                                    <SelectItem value="NENHUM">Nenhum</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="filtro-estagiario" className="mb-2 block">
                                Filtrar por Estagiário
                            </Label>
                            <Select
                                onValueChange={setFiltroEstagiario}
                                value={filtroEstagiario}
                            >
                                <SelectTrigger id="filtro-estagiario">
                                    <SelectValue placeholder="Selecione a opção de estagiário" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TODOS">Todos</SelectItem>
                                    <SelectItem value="true">Com Estagiário</SelectItem>
                                    <SelectItem value="false">Sem Estagiário</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="filtro-ave" className="mb-2 block">
                                Filtrar por AVE
                            </Label>
                            <Select onValueChange={setFiltroAve} value={filtroAve}>
                                <SelectTrigger id="filtro-ave">
                                    <SelectValue placeholder="Selecione a opção de AVE" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TODOS">Todos</SelectItem>
                                    <SelectItem value="true">Com AVE</SelectItem>
                                    <SelectItem value="false">Sem AVE</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Cards de Big Numbers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Com Deficiência</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{totalComDeficiencia}</p>
                        <p className="text-sm text-muted-foreground">
                            {totalEstudantes > 0
                                ? ((totalComDeficiencia / totalEstudantes) * 100).toFixed(1)
                                : "0.0"}
                            % do total ({totalEstudantes})
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Com Barreira</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{totalComBarreiras}</p>
                        <p className="text-sm text-muted-foreground">
                            {totalComDeficiencia > 0
                                ? ((totalComBarreiras / totalComDeficiencia) * 100).toFixed(1)
                                : "0.0"}
                            % dos c/ def.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Sem Barreira</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{totalSemBarreiras}</p>
                        <p className="text-sm text-muted-foreground">
                            {totalComDeficiencia > 0
                                ? ((totalSemBarreiras / totalComDeficiencia) * 100).toFixed(1)
                                : "0.0"}
                            % dos c/ def.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Com Estagiário(a)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{totalComEstagiario}</p>
                        <p className="text-sm text-muted-foreground">
                            {totalComDeficiencia > 0
                                ? ((totalComEstagiario / totalComDeficiencia) * 100).toFixed(1)
                                : "0.0"}
                            % dos c/ def.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Sem Estagiário(a)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{totalSemEstagiario}</p>
                        <p className="text-sm text-muted-foreground">
                            {totalComDeficiencia > 0
                                ? ((totalSemEstagiario / totalComDeficiencia) * 100).toFixed(1)
                                : "0.0"}
                            % dos c/ def.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Com AVE</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{totalComAve}</p>
                        <p className="text-sm text-muted-foreground">
                            {totalComDeficiencia > 0
                                ? ((totalComAve / totalComDeficiencia) * 100).toFixed(1)
                                : "0.0"}
                            % dos c/ def.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Sem AVE</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{totalSemAve}</p>
                        <p className="text-sm text-muted-foreground">
                            {totalComDeficiencia > 0
                                ? ((totalSemAve / totalComDeficiencia) * 100).toFixed(1)
                                : "0.0"}
                            % dos c/ def.
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Card de Turmas */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Visão por Turmas</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-11 gap-4">
                        {turmasData.map((turma) => {
                            const hasDeficiencia =
                                turma.comDeficienciaComBarreiras > 0 ||
                                turma.comDeficienciaSemBarreiras > 0;
                            const borderClass = hasDeficiencia
                                ? turma.comDeficienciaComBarreiras > 0
                                    ? "border-[#FFBB28] border-2"
                                    : "border-[#0088FE] border-2"
                                : "border-none";
                            const selectedBgClass = hasDeficiencia
                                ? filtroTurma === turma.turma
                                    ? turma.comDeficienciaComBarreiras > 0
                                        ? "bg-[#FFF7E6]"
                                        : "bg-[#E6F0FF]"
                                    : ""
                                : "";
                            return (
                                <Card
                                    key={turma.turma}
                                    className={`w-full bg-white ${borderClass} ${hasDeficiencia ? "cursor-pointer" : ""
                                        } ${selectedBgClass}`}
                                    onClick={
                                        hasDeficiencia
                                            ? () => handleTurmaClick(turma.turma)
                                            : undefined
                                    }
                                >
                                    <CardHeader>
                                        <CardTitle className="text-sm">{turma.turma}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm">
                                            SD: {turma.semDeficiencia}
                                        </p>
                                        <p className="text-sm font-bold">
                                            SB: {turma.comDeficienciaSemBarreiras}
                                        </p>
                                        <p className="text-sm font-bold">
                                            CB: {turma.comDeficienciaComBarreiras}
                                        </p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Cards de Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Tipos de Deficiência</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        {tiposDeficienciaData.length > 0 ? (
                            <RechartsPieChart width={400} height={300}>
                                <Pie
                                    data={tiposDeficienciaData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ value }) => value}
                                >
                                    {tiposDeficienciaData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [value, name]} />
                                <Legend style={{ fontSize: "12px" }} />
                            </RechartsPieChart>
                        ) : (
                            <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Tipo de AEE</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        {aeeData.length > 0 ? (
                            <RechartsPieChart width={400} height={300}>
                                <Pie
                                    data={aeeData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ value }) => value}
                                >
                                    {aeeData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [value, name]} />
                                <Legend style={{ fontSize: "12px" }} />
                            </RechartsPieChart>
                        ) : (
                            <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Instituições</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        {instituicaoData.length > 0 ? (
                            <RechartsPieChart width={400} height={300}>
                                <Pie
                                    data={instituicaoData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ value }) => value}
                                >
                                    {instituicaoData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [value, name]} />
                                <Legend style={{ fontSize: "12px" }} />
                            </RechartsPieChart>
                        ) : (
                            <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Horário de Atendimento</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        {horarioData.length > 0 ? (
                            <RechartsPieChart width={400} height={300}>
                                <Pie
                                    data={horarioData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ value }) => value}
                                >
                                    {horarioData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [value, name]} />
                                <Legend style={{ fontSize: "12px" }} />
                            </RechartsPieChart>
                        ) : (
                            <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Justificativa de Estagiários</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        {estagiarioData.length > 0 ? (
                            <RechartsPieChart width={400} height={300}>
                                <Pie
                                    data={estagiarioData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ value }) => value}
                                >
                                    {estagiarioData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [value, name]} />
                                <Legend style={{ fontSize: "12px" }} />
                            </RechartsPieChart>
                        ) : (
                            <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Justificativa de AVE</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        {aveData.length > 0 ? (
                            <RechartsPieChart width={400} height={300}>
                                <Pie
                                    data={aveData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ value }) => value}
                                >
                                    {aveData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [value, name]} />
                                <Legend style={{ fontSize: "12px" }} />
                            </RechartsPieChart>
                        ) : (
                            <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tabelas de dados */}
            <div className="grid grid-cols-1 gap-4 mb-6">
                {/* Tabela de Estagiários */}
                <Card>
                    <CardHeader>
                        <CardTitle>Estagiários</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input
                            placeholder="Pesquisar em qualquer coluna"
                            value={filtroTabelaEstagiario}
                            onChange={(e) => setFiltroTabelaEstagiario(e.target.value)}
                            className="mb-4"
                        />
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Turma</TableHead>
                                    <TableHead>Nome do Estudante</TableHead>
                                    <TableHead
                                        className="cursor-pointer"
                                        onClick={() =>
                                            setSortEstagiario(
                                                sortEstagiario === "asc" ? "desc" : "asc"
                                            )
                                        }
                                    >
                                        Nome do Estagiário{" "}
                                        {sortEstagiario && (sortEstagiario === "asc" ? "↑" : "↓")}
                                    </TableHead>
                                    <TableHead>Justificativa</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEstagiarios.map((student) => (
                                    <TableRow key={student.estudanteId}>
                                        <TableCell>{student.turma}</TableCell>
                                        <TableCell>{student.nome}</TableCell>
                                        <TableCell>{student.deficiencia?.nomeEstagiario}</TableCell>
                                        <TableCell>
                                            {student.deficiencia?.justificativaEstagiario}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Tabela de AVEs */}
                <Card>
                    <CardHeader>
                        <CardTitle>AVEs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input
                            placeholder="Pesquisar em qualquer coluna"
                            value={filtroTabelaAve}
                            onChange={(e) => setFiltroTabelaAve(e.target.value)}
                            className="mb-4"
                        />
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Turma</TableHead>
                                    <TableHead>Nome do Estudante</TableHead>
                                    <TableHead
                                        className="cursor-pointer"
                                        onClick={() =>
                                            setSortAve(sortAve === "asc" ? "desc" : "asc")
                                        }
                                    >
                                        Nome do AVE {sortAve && (sortAve === "asc" ? "↑" : "↓")}
                                    </TableHead>
                                    <TableHead>Justificativa</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAves.map((student) => (
                                    <TableRow key={student.estudanteId}>
                                        <TableCell>{student.turma}</TableCell>
                                        <TableCell>{student.nome}</TableCell>
                                        <TableCell>{student.deficiencia?.nomeAve}</TableCell>
                                        <TableCell>
                                            {student.deficiencia?.justificativaAve?.join(", ")}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Tabela de Detalhes dos Estudantes */}
                <Card>
                    <CardHeader>
                        <CardTitle>Detalhes dos Estudantes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input
                            placeholder="Pesquisar em qualquer coluna"
                            value={filtroTabelaEstudantes}
                            onChange={(e) => setFiltroTabelaEstudantes(e.target.value)}
                            className="mb-4"
                        />
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Turma</TableHead>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Tipo de Deficiência</TableHead>
                                        <TableHead>AEE</TableHead>
                                        <TableHead>Instituição</TableHead>
                                        <TableHead>Horário de Atendimento</TableHead>
                                        <TableHead>Possui Estagiário</TableHead>
                                        <TableHead>Nome do Estagiário</TableHead>
                                        <TableHead>Justificativa do Estagiário</TableHead>
                                        <TableHead>Possui AVE</TableHead>
                                        <TableHead>Nome do AVE</TableHead>
                                        <TableHead>Justificativa do AVE</TableHead>
                                        <TableHead>Possui Barreiras</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEstudantesDetalhes.map((student) => (
                                        <TableRow
                                            key={student.estudanteId}
                                            className={selectedStudent?.estudanteId === student.estudanteId ? "bg-slate-100" : ""}
                                        >
                                            <TableCell>{student.turma}</TableCell>
                                            <TableCell>{student.nome}</TableCell>
                                            <TableCell>
                                                {student.deficiencia?.tipoDeficiencia?.join(", ") || "-"}
                                            </TableCell>
                                            <TableCell>{student.deficiencia?.aee || "-"}</TableCell>
                                            <TableCell>{student.deficiencia?.instituicao || "-"}</TableCell>
                                            <TableCell>
                                                {student.deficiencia?.horarioAtendimento || "-"}
                                            </TableCell>
                                            <TableCell>
                                                {student.deficiencia?.possuiEstagiario ? "Sim" : "Não"}
                                            </TableCell>
                                            <TableCell>
                                                {student.deficiencia?.nomeEstagiario || "-"}
                                            </TableCell>
                                            <TableCell>
                                                {student.deficiencia?.justificativaEstagiario || "-"}
                                            </TableCell>
                                            <TableCell>
                                                {student.deficiencia?.ave ? "Sim" : "Não"}
                                            </TableCell>
                                            <TableCell>{student.deficiencia?.nomeAve || "-"}</TableCell>
                                            <TableCell>
                                                {student.deficiencia?.justificativaAve?.join(", ") || "-"}
                                            </TableCell>
                                            <TableCell>
                                                {student.deficiencia?.possuiBarreiras ? "Sim" : "Não"}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant={selectedStudent?.estudanteId === student.estudanteId ? "default" : "ghost"}
                                                    size="sm"
                                                    onClick={() => handleSelectStudentForOccurrence(student)}
                                                >
                                                    Ocorrências
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Seção de Ocorrências - Visível apenas quando um estudante está selecionado */}
            {isOccurrenceSectionVisible && selectedStudent && (
                <div id="occurrence-section" className="mt-8 mb-6 border-t border-gray-200 pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">
                            Gerenciamento de Ocorrências - {selectedStudent.nome}
                        </h2>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setSelectedStudent(null);
                                setIsOccurrenceSectionVisible(false);

                                // Remover o parâmetro da URL
                                if (typeof window !== 'undefined') {
                                    const url = new URL(window.location.href);
                                    url.searchParams.delete('studentId');
                                    window.history.pushState({}, '', url.toString());
                                }
                            }}
                        >
                            <X className="h-4 w-4 mr-1" /> Fechar
                        </Button>
                    </div>

                    {/* Card para Cadastrar Ocorrência */}
                    <Card id="register-occurrence-card" className="mb-6">
                        <CardHeader>
                            <CardTitle>{editingOccurrence ? "Editar Ocorrência" : "Cadastrar Ocorrência"}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="occurrence-date">Data</Label>
                                    <Input
                                        id="occurrence-date"
                                        value={occurrenceDate}
                                        onChange={(e) => setOccurrenceDate(formatDateInput(e.target.value))}
                                        placeholder="dd/mm/aaaa"
                                        maxLength={10}
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <Label htmlFor="occurrence-description">Descrição</Label>
                                <Textarea
                                    id="occurrence-description"
                                    value={occurrenceDescription}
                                    onChange={(e) => setOccurrenceDescription(e.target.value)}
                                    placeholder="Descreva a ocorrência"
                                    rows={4}
                                />
                            </div>
                            {userRole === "admin" && (
                                <div className="mt-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="occurrence-sensitive"
                                            checked={occurrenceSensitive}
                                            onCheckedChange={handleSensitiveChange}
                                        />
                                        <Label htmlFor="occurrence-sensitive">Marcar como sensível</Label>
                                    </div>
                                </div>
                            )}
                            <div className="mt-4 flex gap-2">
                                <Button onClick={editingOccurrence ? handleEditOccurrence : handleAddOccurrence}>
                                    {editingOccurrence ? "Salvar Alterações" : "Adicionar Ocorrência"}
                                </Button>
                                {editingOccurrence && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setEditingOccurrence(null);
                                            setOccurrenceDate(new Date().toLocaleDateString("pt-BR"));
                                            setOccurrenceDescription("");
                                            setOccurrenceSensitive(false);
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card de Histórico de Ocorrências */}
                    <Card id="occurrence-card" className="mb-6">
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle>Histórico de Ocorrências</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Input
                                placeholder="Pesquisar em qualquer coluna"
                                value={filtroTabelaOcorrencias}
                                onChange={(e) => setFiltroTabelaOcorrencias(e.target.value)}
                                className="mb-4"
                            />
                            {filteredOccurrences.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Data</TableHead>
                                                <TableHead>Descrição</TableHead>
                                                <TableHead>Criado por</TableHead>
                                                {userRole === "admin" && <TableHead className="w-[100px] text-right">Ações</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredOccurrences.map((occurrence) => (
                                                <TableRow
                                                    key={occurrence.id}
                                                    className={occurrence.sensitive ? "bg-red-50" : ""}
                                                >
                                                    <TableCell>{occurrence.date}</TableCell>
                                                    <TableCell>
                                                        {occurrence.description}
                                                        {occurrence.sensitive && (
                                                            <span className="ml-2 inline-block bg-red-500 text-white text-xs px-2 py-1 rounded">
                                                                Sensível
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{occurrence.createdBy}</TableCell>
                                                    {userRole === "admin" && (
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    setEditingOccurrence(occurrence);
                                                                    document.getElementById("register-occurrence-card")?.scrollIntoView({ behavior: "smooth" });
                                                                }}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setShowDeleteOccurrenceDialog(occurrence.id)}
                                                            >
                                                                <Trash className="h-4 w-4 text-red-500" />
                                                            </Button>
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Nenhuma ocorrência registrada para este estudante.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* AlertDialog para confirmar a exclusão de ocorrência */}
            <AlertDialog open={!!showDeleteOccurrenceDialog} onOpenChange={() => setShowDeleteOccurrenceDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza de que deseja excluir esta ocorrência? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => showDeleteOccurrenceDialog && handleDeleteOccurrence(showDeleteOccurrenceDialog)}>
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}