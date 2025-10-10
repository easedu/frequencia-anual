import React, { useState, memo } from 'react';
import { Search, Filter, X, ChevronDown, Settings, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Estudante } from '@/types';
import { formatDate } from '@/utils/formatters';

// Helper functions for date formatting
const formatDataNascimento = (dateStr: string): string => {
    if (!dateStr) return '';
    if (dateStr.length <= 2) return dateStr;
    if (dateStr.length <= 4) return dateStr.slice(0, 2) + '/' + dateStr.slice(2);
    return dateStr.slice(0, 2) + '/' + dateStr.slice(2, 4) + '/' + dateStr.slice(4);
};

const cleanDataNascimento = (dateStr: string): string => {
    return dateStr.replace(/\D/g, '');
};

interface StudentFiltersProps {
    students: Estudante[];
    turmaFiltro: string;
    setTurmaFiltro: (value: string) => void;
    nomeFiltro: string;
    setNomeFiltro: (value: string) => void;
    matriculaFiltro: string;
    setMatriculaFiltro: (value: string) => void;
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

export const StudentFilters = memo(function StudentFilters({
    students,
    turmaFiltro,
    setTurmaFiltro,
    nomeFiltro,
    setNomeFiltro,
    matriculaFiltro,
    setMatriculaFiltro,
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
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showColumnSettings, setShowColumnSettings] = useState(false);

    const turmasUnicas = [...new Set(students.map(s => s.turma))].sort();

    const activeFiltersCount = [
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
    ].filter(filter => filter && filter !== "all").length;

    const clearAllFilters = () => {
        setTurmaFiltro("");
        setNomeFiltro("");
        setMatriculaFiltro("");
        setStatusFiltro("");
        setBolsaFamiliaFiltro("");
        setTurnoFiltro("");
        setContatoFiltro("");
        setEmailFiltro("");
        setEnderecoFiltro("");
        setDataNascimentoFiltro("");
        setComDeficienciaFiltro("");
    };

    const columnOptions = [
        { key: "turma", label: "Turma", icon: "🏫" },
        { key: "nome", label: "Nome", icon: "👤" },
        { key: "matricula", label: "Matrícula", icon: "🎓" },
        { key: "dataNascimento", label: "Data Nascimento", icon: "📅" },
        { key: "turno", label: "Turno", icon: "⏰" },
        { key: "bolsaFamilia", label: "Bolsa Família", icon: "💰" },
        { key: "status", label: "Status", icon: "✅" },
        { key: "contatos", label: "Contatos", icon: "📞" },
        { key: "email", label: "E-mail", icon: "✉️" },
        { key: "endereco", label: "Endereço", icon: "🏠" },
        { key: "deficiencia", label: "Deficiência", icon: "♿" },
        { key: "actions", label: "Ações", icon: "⚙️" },
    ];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-700 overflow-hidden">
            {/* Compact Header with Gradient */}
            <div className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 px-4 py-3 border-b border-slate-300/50 dark:border-slate-600/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-500/20 rounded-lg">
                            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            Filtros
                        </h3>
                        {activeFiltersCount > 0 && (
                            <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5">
                                {activeFiltersCount}
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {activeFiltersCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAllFilters}
                                className="h-8 text-xs"
                            >
                                <X className="w-3 h-3 mr-1" />
                                Limpar
                            </Button>
                        )}

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowColumnSettings(!showColumnSettings)}
                            className="h-8 text-xs"
                        >
                            <Settings className="w-3 h-3 mr-1" />
                            Colunas
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="h-8 text-xs"
                        >
                            <Sliders className="w-3 h-3 mr-1" />
                            {showAdvanced ? 'Menos' : 'Mais'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Compact Filters */}
            <div className="p-4">
                {/* Quick Search */}
                <div className="mb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            placeholder="Pesquisar por nome..."
                            value={nomeFiltro}
                            onChange={(e) => setNomeFiltro(e.target.value)}
                            className="pl-9 h-9 text-sm"
                        />
                    </div>
                </div>

                {/* Primary Filters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                    {/* Turma */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Turma
                        </label>
                        <Select value={turmaFiltro} onValueChange={setTurmaFiltro}>
                            <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {turmasUnicas.map((turma) => (
                                    <SelectItem key={turma} value={turma}>
                                        {turma}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Status
                        </label>
                        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                            <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="ATIVO">ATIVO</SelectItem>
                                <SelectItem value="INATIVO">INATIVO</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Turno */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Turno
                        </label>
                        <Select value={turnoFiltro} onValueChange={setTurnoFiltro}>
                            <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="MANHÃ">MANHÃ</SelectItem>
                                <SelectItem value="TARDE">TARDE</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Bolsa Família */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Bolsa Família
                        </label>
                        <Select value={bolsaFamiliaFiltro} onValueChange={setBolsaFamiliaFiltro}>
                            <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="SIM">SIM</SelectItem>
                                <SelectItem value="NÃO">NÃO</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Advanced Filters */}
                {showAdvanced && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* Matrícula */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                    Matrícula
                                </label>
                                <Input
                                    placeholder="Número da matrícula"
                                    value={matriculaFiltro}
                                    onChange={(e) => setMatriculaFiltro(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                    E-mail
                                </label>
                                <Input
                                    placeholder="E-mail do estudante"
                                    value={emailFiltro}
                                    onChange={(e) => setEmailFiltro(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>

                            {/* Contato */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                    Contato
                                </label>
                                <Input
                                    placeholder="Nome ou telefone"
                                    value={contatoFiltro}
                                    onChange={(e) => setContatoFiltro(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>

                            {/* Endereço */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                    Endereço
                                </label>
                                <Input
                                    placeholder="Rua, número, bairro..."
                                    value={enderecoFiltro}
                                    onChange={(e) => setEnderecoFiltro(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>

                            {/* Data de Nascimento */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                    Data Nascimento
                                </label>
                                <Input
                                    placeholder="dd/mm/aaaa"
                                    value={formatDataNascimento(dataNascimentoFiltro)}
                                    onChange={(e) => {
                                        const inputValue = e.target.value;
                                        const cleanedValue = cleanDataNascimento(inputValue).slice(0, 8);
                                        setDataNascimentoFiltro(cleanedValue);
                                    }}
                                    className="h-9 text-sm"
                                />
                            </div>

                            {/* Deficiência */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                    Com Deficiência
                                </label>
                                <Select value={comDeficienciaFiltro} onValueChange={setComDeficienciaFiltro}>
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="SIM">SIM</SelectItem>
                                        <SelectItem value="NÃO">NÃO</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Column Settings */}
                {showColumnSettings && (
                    <div className="mt-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                        <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3 flex items-center">
                            <Settings className="w-4 h-4 mr-2" />
                            Colunas Visíveis
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {columnOptions.map((option) => (
                                <div key={option.key} className="flex items-center space-x-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
                                    <Checkbox
                                        id={option.key}
                                        checked={visibleColumns.has(option.key)}
                                        onCheckedChange={(checked) => {
                                            const newColumns = new Set(visibleColumns);
                                            if (checked) {
                                                newColumns.add(option.key);
                                            } else {
                                                newColumns.delete(option.key);
                                            }
                                            setVisibleColumns(newColumns);
                                        }}
                                    />
                                    <label htmlFor={option.key} className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex items-center">
                                        <span className="mr-2">{option.icon}</span>
                                        {option.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});