"use client";

import { useState, useMemo } from "react";
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
import { Estudante } from "@/interfaces";

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

    // Logs para depuração
    console.log("Tipos de Deficiência:", tiposDeficienciaData);
    console.log("AEE:", aeeData);
    console.log("Instituições:", instituicaoData);
    console.log("Horário:", horarioData);
    console.log("Estagiário:", estagiarioData);
    console.log("AVE:", aveData);
    console.log("Turmas Data:", turmasData);
    console.log("Filtro Turma:", filtroTurma);
    console.log("Totais:", {
        totalComDeficiencia,
        totalComBarreiras,
        totalSemBarreiras,
        totalComEstagiario,
        totalSemEstagiario,
        totalComAve,
        totalSemAve,
    });

    const handleTurmaClick = (turma: string) => {
        setFiltroTurma(filtroTurma === turma ? null : turma);
    };

    if (loading) return <div>Carregando...</div>;
    if (error) return <div>Erro: {error.message}</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">
                Dashboard de Estudantes com Deficiência
            </h1>

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

            <div className="grid grid-cols-1 gap-4">
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
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEstudantesDetalhes.map((student) => (
                                        <TableRow key={student.estudanteId}>
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
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}