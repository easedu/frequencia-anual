import React, { useState } from 'react';
import { Search, Filter, X, ChevronDown, Settings, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Estudante } from '@/types';
import { formatDataNascimento, cleanDataNascimento } from '../utils/formatters';

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

export function StudentFilters({
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
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-slate-700/20 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 px-8 py-6 border-b border-slate-200/50 dark:border-slate-600/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-blue-500/20 rounded-2xl">
                            <Filter className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                Filtros Avançados
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 mt-1">
                                Refine sua pesquisa com filtros inteligentes
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        {activeFiltersCount > 0 && (
                            <div className="flex items-center space-x-2">
                                <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1">
                                    {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''}
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearAllFilters}
                                    className="text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-600/50 rounded-xl"
                                >
                                    <X className="w-4 h-4 mr-1" />
                                    Limpar
                                </Button>
                            </div>
                        )}

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowColumnSettings(!showColumnSettings)}
                            className="text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-600/50 rounded-xl"
                        >
                            <Settings className="w-4 h-4 mr-1" />
                            Colunas
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Filters */}
            <div className="p-8">
                {/* Quick Search */}
                <div className="mb-8">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <Input
                            placeholder="Pesquisar por nome do estudante..."
                            value={nomeFiltro}
                            onChange={(e) => setNomeFiltro(e.target.value)}
                            className="pl-12 h-14 text-lg rounded-2xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        />
                    </div>
                </div>

                {/* Primary Filters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Turma */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                            🏫 Turma
                        </label>
                        <Select value={turmaFiltro} onValueChange={setTurmaFiltro}>
                            <SelectTrigger className="h-12 rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm hover:border-blue-400 transition-all duration-200">
                                <SelectValue placeholder="Todas as turmas" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                                <SelectItem value="all">Todas as turmas</SelectItem>
                                {turmasUnicas.map((turma) => (
                                    <SelectItem key={turma} value={turma}>
                                        {turma}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Status */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                            ✅ Status
                        </label>
                        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                            <SelectTrigger className="h-12 rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm hover:border-blue-400 transition-all duration-200">
                                <SelectValue placeholder="Todos os status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                                <SelectItem value="all">Todos os status</SelectItem>
                                <SelectItem value="ATIVO">ATIVO</SelectItem>
                                <SelectItem value="INATIVO">INATIVO</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Turno */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                            ⏰ Turno
                        </label>
                        <Select value={turnoFiltro} onValueChange={setTurnoFiltro}>
                            <SelectTrigger className="h-12 rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm hover:border-blue-400 transition-all duration-200">
                                <SelectValue placeholder="Todos os turnos" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                                <SelectItem value="all">Todos os turnos</SelectItem>
                                <SelectItem value="MANHÃ">MANHÃ</SelectItem>
                                <SelectItem value="TARDE">TARDE</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Bolsa Família */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                            💰 Bolsa Família
                        </label>
                        <Select value={bolsaFamiliaFiltro} onValueChange={setBolsaFamiliaFiltro}>
                            <SelectTrigger className="h-12 rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm hover:border-blue-400 transition-all duration-200">
                                <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="SIM">SIM</SelectItem>
                                <SelectItem value="NÃO">NÃO</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Advanced Filters Toggle */}
                <div className="flex justify-center mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-600/50 rounded-xl px-6 py-3"
                    >
                        <Sliders className="w-4 h-4 mr-2" />
                        {showAdvanced ? 'Ocultar' : 'Mostrar'} Filtros Avançados
                        <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
                    </Button>
                </div>

                {/* Advanced Filters */}
                {showAdvanced && (
                    <div className="bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 dark:border-slate-600/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Matrícula */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                                    🎓 Matrícula
                                </label>
                                <Input
                                    placeholder="Número da matrícula"
                                    value={matriculaFiltro}
                                    onChange={(e) => setMatriculaFiltro(e.target.value)}
                                    className="h-12 rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 transition-all duration-200"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                                    ✉️ E-mail
                                </label>
                                <Input
                                    placeholder="E-mail do estudante"
                                    value={emailFiltro}
                                    onChange={(e) => setEmailFiltro(e.target.value)}
                                    className="h-12 rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 transition-all duration-200"
                                />
                            </div>

                            {/* Contato */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                                    📞 Contato
                                </label>
                                <Input
                                    placeholder="Nome ou telefone"
                                    value={contatoFiltro}
                                    onChange={(e) => setContatoFiltro(e.target.value)}
                                    className="h-12 rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 transition-all duration-200"
                                />
                            </div>

                            {/* Endereço */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                                    🏠 Endereço
                                </label>
                                <Input
                                    placeholder="Rua, número, bairro..."
                                    value={enderecoFiltro}
                                    onChange={(e) => setEnderecoFiltro(e.target.value)}
                                    className="h-12 rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 transition-all duration-200"
                                />
                            </div>

                            {/* Data de Nascimento */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                                    📅 Data de Nascimento
                                </label>
                                <Input
                                    placeholder="dd/mm/aaaa"
                                    value={formatDataNascimento(dataNascimentoFiltro)}
                                    onChange={(e) => {
                                        const inputValue = e.target.value;
                                        const cleanedValue = cleanDataNascimento(inputValue).slice(0, 8);
                                        setDataNascimentoFiltro(cleanedValue);
                                    }}
                                    className="h-12 rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 transition-all duration-200"
                                />
                            </div>

                            {/* Deficiência */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                                    ♿ Com Deficiência
                                </label>
                                <Select value={comDeficienciaFiltro} onValueChange={setComDeficienciaFiltro}>
                                    <SelectTrigger className="h-12 rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm hover:border-blue-400 transition-all duration-200">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
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
                    <div className="mt-6 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 dark:border-slate-600/50">
                        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                            <Settings className="w-5 h-5 mr-2" />
                            Configurar Colunas Visíveis
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {columnOptions.map((option) => (
                                <div key={option.key} className="flex items-center space-x-3 p-3 bg-white/60 dark:bg-slate-700/60 rounded-xl hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all duration-200">
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
                                    <label htmlFor={option.key} className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex items-center">
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
}