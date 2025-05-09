"use client";

import { Input } from "@/components/ui/input";
import {
    Select as ShadcnSelect,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Estudante } from "../interfaces";
import { formatDataNascimento, cleanDataNascimento } from "../utils/formatters";

interface StudentFiltersProps {
    students: Estudante[];
    turmaFiltro: string;
    setTurmaFiltro: (value: string) => void;
    nomeFiltro: string;
    setNomeFiltro: (value: string) => void;
    statusFiltro: string;
    setStatusFiltro: (value: string) => void;
    bolsaFamiliaFiltro: string;
    setBolsaFamiliaFiltro: (value: string) => void;
    turnoFiltro: string;
    setTurnoFiltro: (value: string) => void;
    contatoFiltro: string;
    setContatoFiltro: (value: string) => void;
    emailFiltro: string;
    setEmailFiltro: (value: string) => void;
    enderecoFiltro: string;
    setEnderecoFiltro: (value: string) => void;
    dataNascimentoFiltro: string;
    setDataNascimentoFiltro: (value: string) => void;
    comDeficienciaFiltro: string;
    setComDeficienciaFiltro: (value: string) => void;
    visibleColumns: Set<string>;
    setVisibleColumns: (columns: Set<string>) => void;
}

export function StudentFilters({
    students,
    turmaFiltro,
    setTurmaFiltro,
    nomeFiltro,
    setNomeFiltro,
    statusFiltro,
    setStatusFiltro,
    bolsaFamiliaFiltro,
    setBolsaFamiliaFiltro,
    turnoFiltro,
    setTurnoFiltro,
    contatoFiltro,
    setContatoFiltro,
    emailFiltro,
    setEmailFiltro,
    enderecoFiltro,
    setEnderecoFiltro,
    dataNascimentoFiltro,
    setDataNascimentoFiltro,
    comDeficienciaFiltro,
    setComDeficienciaFiltro,
    visibleColumns,
    setVisibleColumns,
}: StudentFiltersProps) {
    const turmas = Array.from(new Set(students.map((est) => est.turma))).sort((a, b) =>
        a.localeCompare(b)
    );
    const statusList = Array.from(new Set(students.map((est) => est.status))).sort((a, b) =>
        a.localeCompare(b)
    );
    const turnoList = ["MANHÃ", "TARDE"];
    const bolsaFamiliaOptions = ["SIM", "NÃO"];
    const comDeficienciaOptions = ["SIM", "NÃO"];

    return (
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
    );
}