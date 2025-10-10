import { useState, useMemo, useCallback, memo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FullDataTable } from "@/components/students/CustomFullDataTable";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Filter,
    RotateCcw,
    Users,
    Calendar,
    TrendingUp,
    Search,
    BookOpen,
    Clock,
    Sun,
    Moon
} from "lucide-react";

interface StudentRecord {
    estudanteId: string;
    turma: string;
    nome: string;
    faltasB1: number;
    faltasB2: number;
    faltasB3: number;
    faltasB4: number;
    totalFaltas: number;
    percentualFaltas: number;
    percentualFrequencia: number;
}

interface FrequencyTableCardProps {
    data: StudentRecord[];
}

interface RangeFilter {
    min: string;
    max: string;
}

interface FilterState {
    selectedTurmas: Set<string>;
    selectedCiclos: Set<string>;
    selectedTurnos: Set<string>; // Novo filtro para turnos
    b1: RangeFilter;
    b2: RangeFilter;
    b3: RangeFilter;
    b4: RangeFilter;
    totalFaltas: RangeFilter;
    percentualFaltas: RangeFilter;
    percentualFrequencia: RangeFilter;
}

// Definição dos ciclos
const CICLOS = {
    'Alfabetização': { anos: ['1', '2', '3'], label: 'Ciclo de Alfabetização (1°, 2°, 3°)' },
    'Interdisciplinar': { anos: ['4', '5', '6'], label: 'Ciclo Interdisciplinar (4°, 5°, 6°)' },
    'Autoral': { anos: ['7', '8', '9'], label: 'Ciclo Autoral (7°, 8°, 9°)' }
};

// Definição dos turnos baseada na lógica existente
const TURNOS = {
    'TARDE': { anos: ['1', '2', '3', '4'], label: 'Turno da Tarde (1° ao 4° ano)', icon: Sun },
    'MANHÃ': { anos: ['5', '6', '7', '8', '9'], label: 'Turno da Manhã (5° ao 9° ano)', icon: Moon }
};

// Função para determinar o ciclo baseado no ano da turma
const getCicloFromTurma = (turma: string): string | null => {
    const match = turma.match(/(\d+)[A-Z]+/);
    if (!match) return null;

    const ano = match[1];
    for (const [ciclo, config] of Object.entries(CICLOS)) {
        if (config.anos.includes(ano)) {
            return ciclo;
        }
    }
    return null;
};

// Função para determinar o turno baseado no ano da turma
const getTurnoFromTurma = (turma: string): string | null => {
    const match = turma.match(/(\d+)[A-Z]+/);
    if (!match) return null;

    const ano = match[1];
    for (const [turno, config] of Object.entries(TURNOS)) {
        if (config.anos.includes(ano)) {
            return turno;
        }
    }
    return null;
};

// Hook personalizado para gerenciar filtros
const useFilters = () => {
    const [filters, setFilters] = useState<FilterState>({
        selectedTurmas: new Set(),
        selectedCiclos: new Set(),
        selectedTurnos: new Set(), // Inicializar novo filtro
        b1: { min: "", max: "" },
        b2: { min: "", max: "" },
        b3: { min: "", max: "" },
        b4: { min: "", max: "" },
        totalFaltas: { min: "", max: "" },
        percentualFaltas: { min: "", max: "" },
        percentualFrequencia: { min: "", max: "" }
    });

    const updateTurmaFilter = useCallback((turma: string) => {
        setFilters(prev => ({
            ...prev,
            selectedTurmas: new Set(
                prev.selectedTurmas.has(turma)
                    ? [...prev.selectedTurmas].filter(t => t !== turma)
                    : [...prev.selectedTurmas, turma]
            )
        }));
    }, []);

    const updateCicloFilter = useCallback((ciclo: string) => {
        setFilters(prev => ({
            ...prev,
            selectedCiclos: new Set(
                prev.selectedCiclos.has(ciclo)
                    ? [...prev.selectedCiclos].filter(c => c !== ciclo)
                    : [...prev.selectedCiclos, ciclo]
            )
        }));
    }, []);

    // Novo callback para filtro de turnos
    const updateTurnoFilter = useCallback((turno: string) => {
        setFilters(prev => ({
            ...prev,
            selectedTurnos: new Set(
                prev.selectedTurnos.has(turno)
                    ? [...prev.selectedTurnos].filter(t => t !== turno)
                    : [...prev.selectedTurnos, turno]
            )
        }));
    }, []);

    const updateRangeFilter = useCallback((field: keyof Omit<FilterState, 'selectedTurmas' | 'selectedCiclos' | 'selectedTurnos'>, type: 'min' | 'max', value: string) => {
        setFilters(prev => ({
            ...prev,
            [field]: {
                ...prev[field],
                [type]: value
            }
        }));
    }, []);

    // Função para aplicar filtro de frequência crítica
    const applyFrequenciaCriticaFilter = useCallback(() => {
        setFilters(prev => ({
            ...prev,
            percentualFrequencia: { min: "", max: "74.9" }
        }));
    }, []);

    // Função para aplicar filtro de frequência excelente
    const applyFrequenciaExcelenteFilter = useCallback(() => {
        setFilters(prev => ({
            ...prev,
            percentualFrequencia: { min: "95.0", max: "" }
        }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters({
            selectedTurmas: new Set(),
            selectedCiclos: new Set(),
            selectedTurnos: new Set(), // Reset do novo filtro
            b1: { min: "", max: "" },
            b2: { min: "", max: "" },
            b3: { min: "", max: "" },
            b4: { min: "", max: "" },
            totalFaltas: { min: "", max: "" },
            percentualFaltas: { min: "", max: "" },
            percentualFrequencia: { min: "", max: "" }
        });
    }, []);

    return {
        filters,
        updateTurmaFilter,
        updateCicloFilter,
        updateTurnoFilter,
        updateRangeFilter,
        applyFrequenciaCriticaFilter,
        applyFrequenciaExcelenteFilter,
        resetFilters
    };
};

// Componente para input de range
const RangeInput = ({
    label,
    value,
    onChange,
    min = 0,
    max,
    suffix = ""
}: {
    label: string;
    value: RangeFilter;
    onChange: (type: 'min' | 'max', val: string) => void;
    min?: number;
    max?: number;
    suffix?: string;
}) => (
    <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">{label}</Label>
        <div className="flex items-center gap-2">
            <Input
                type="number"
                placeholder="Mín"
                value={value.min}
                onChange={(e) => onChange('min', e.target.value)}
                min={min}
                max={max}
                className="h-8 text-xs"
            />
            <div className="w-3 h-px bg-gray-300" />
            <Input
                type="number"
                placeholder="Máx"
                value={value.max}
                onChange={(e) => onChange('max', e.target.value)}
                min={min}
                max={max}
                className="h-8 text-xs"
            />
        </div>
        {suffix && <span className="text-xs text-gray-500">{suffix}</span>}
    </div>
);

// Componente para seleção de turnos
const TurnoSelector = ({
    selectedTurnos,
    onTurnoChange,
    turmasData
}: {
    selectedTurnos: Set<string>;
    onTurnoChange: (turno: string) => void;
    turmasData: string[];
}) => {
    const turnoStats = useMemo(() => {
        const stats: { [key: string]: { turmas: number; total: number } } = {};

        Object.keys(TURNOS).forEach(turno => {
            stats[turno] = { turmas: 0, total: 0 };
        });

        turmasData.forEach(turma => {
            const turno = getTurnoFromTurma(turma);
            if (turno && stats[turno]) {
                stats[turno].turmas++;
            }
        });

        return stats;
    }, [turmasData]);

    return (
        <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-3">
                Selecione os turnos escolares para filtrar:
            </div>

            <div className="space-y-3">
                {Object.entries(TURNOS).map(([turno, config]) => {
                    const isSelected = selectedTurnos.has(turno);
                    const stats = turnoStats[turno];
                    const IconComponent = config.icon;

                    return (
                        <div
                            key={turno}
                            className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${isSelected
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                            onClick={() => onTurnoChange(turno)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => onTurnoChange(turno)}
                                        className="h-4 w-4"
                                    />
                                    <div className="flex items-center gap-2">
                                        <IconComponent className="h-4 w-4 text-blue-600" />
                                        <div>
                                            <Label className="text-sm font-medium cursor-pointer text-gray-900">
                                                {config.label}
                                            </Label>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Anos: {config.anos.join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Badge variant={isSelected ? "default" : "secondary"} className="text-xs">
                                        {stats.turmas} turma{stats.turmas !== 1 ? 's' : ''}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedTurnos.size > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs font-medium text-gray-700 mb-2">Turnos selecionados:</div>
                    <div className="flex flex-wrap gap-2">
                        {Array.from(selectedTurnos).map(turno => (
                            <Badge key={turno} variant="default" className="text-xs">
                                {turno}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Componente para seleção de ciclos
const CicloSelector = ({
    selectedCiclos,
    onCicloChange,
    turmasData
}: {
    selectedCiclos: Set<string>;
    onCicloChange: (ciclo: string) => void;
    turmasData: string[];
}) => {
    const cicloStats = useMemo(() => {
        const stats: { [key: string]: { turmas: number; total: number } } = {};

        Object.keys(CICLOS).forEach(ciclo => {
            stats[ciclo] = { turmas: 0, total: 0 };
        });

        turmasData.forEach(turma => {
            const ciclo = getCicloFromTurma(turma);
            if (ciclo && stats[ciclo]) {
                stats[ciclo].turmas++;
            }
        });

        return stats;
    }, [turmasData]);

    return (
        <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-3">
                Selecione os ciclos educacionais para filtrar:
            </div>

            <div className="space-y-3">
                {Object.entries(CICLOS).map(([ciclo, config]) => {
                    const isSelected = selectedCiclos.has(ciclo);
                    const stats = cicloStats[ciclo];

                    return (
                        <div
                            key={ciclo}
                            className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${isSelected
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                            onClick={() => onCicloChange(ciclo)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => onCicloChange(ciclo)}
                                        className="h-4 w-4"
                                    />
                                    <div>
                                        <Label className="text-sm font-medium cursor-pointer text-gray-900">
                                            {config.label}
                                        </Label>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Anos: {config.anos.join(', ')}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Badge variant={isSelected ? "default" : "secondary"} className="text-xs">
                                        {stats.turmas} turma{stats.turmas !== 1 ? 's' : ''}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedCiclos.size > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs font-medium text-gray-700 mb-2">Ciclos selecionados:</div>
                    <div className="flex flex-wrap gap-2">
                        {Array.from(selectedCiclos).map(ciclo => (
                            <Badge key={ciclo} variant="default" className="text-xs">
                                {ciclo}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Componente para seleção de turmas
const TurmaSelector = ({
    groupedTurmas,
    selectedTurmas,
    onTurmaChange
}: {
    groupedTurmas: { [key: string]: string[] };
    selectedTurmas: Set<string>;
    onTurmaChange: (turma: string) => void;
}) => {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredTurmas = useMemo(() => {
        if (!searchTerm) return groupedTurmas;

        const filtered: { [key: string]: string[] } = {};
        Object.entries(groupedTurmas).forEach(([year, turmas]) => {
            const matchingTurmas = turmas.filter(turma =>
                turma.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (matchingTurmas.length > 0) {
                filtered[year] = matchingTurmas;
            }
        });
        return filtered;
    }, [groupedTurmas, searchTerm]);

    return (
        <div className="space-y-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Pesquisar turmas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-8 text-xs"
                />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-3">
                {Object.entries(filteredTurmas).map(([year, turmas]) => (
                    <div key={year} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">
                                {year}º Ano
                            </Badge>
                            <span className="text-xs text-gray-500">
                                {turmas.filter(t => selectedTurmas.has(t)).length}/{turmas.length}
                            </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {turmas.map(turma => (
                                <div key={turma} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`turma-${turma}`}
                                        checked={selectedTurmas.has(turma)}
                                        onCheckedChange={() => onTurmaChange(turma)}
                                        className="h-4 w-4"
                                    />
                                    <Label
                                        htmlFor={`turma-${turma}`}
                                        className="text-xs cursor-pointer hover:text-blue-600 transition-colors"
                                    >
                                        {turma}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const FrequencyTableCard = memo(function FrequencyTableCard({ data }: FrequencyTableCardProps) {
    const {
        filters,
        updateTurmaFilter,
        updateCicloFilter,
        updateTurnoFilter,
        updateRangeFilter,
        applyFrequenciaCriticaFilter,
        applyFrequenciaExcelenteFilter,
        resetFilters
    } = useFilters();
    const [showFilters, setShowFilters] = useState(false);

    const uniqueTurmas = useMemo(() => {
        return Array.from(new Set(data.map(item => item.turma))).sort((a, b) => {
            const [numA, letterA] = a.match(/(\d+)([A-Z]+)/)!.slice(1);
            const [numB, letterB] = b.match(/(\d+)([A-Z]+)/)!.slice(1);
            const numCompare = Number(numA) - Number(numB);
            if (numCompare !== 0) return numCompare;
            return letterA.localeCompare(letterB);
        });
    }, [data]);

    const groupedTurmas = useMemo(() => {
        const groups: { [key: string]: string[] } = {};
        uniqueTurmas.forEach(turma => {
            const match = turma.match(/(\d+)([A-Z]+)/);
            if (match) {
                const num = match[1];
                if (!groups[num]) groups[num] = [];
                groups[num].push(turma);
            }
        });
        return Object.keys(groups)
            .sort((a, b) => Number(a) - Number(b))
            .reduce((acc, num) => {
                acc[num] = groups[num];
                return acc;
            }, {} as { [key: string]: string[] });
    }, [uniqueTurmas]);

    const filteredData = useMemo(() => {
        return data.filter(student => {
            const numValue = (val: string) => val ? Number(val) : null;

            const inRange = (value: number, min: string, max: string) => {
                const minVal = numValue(min);
                const maxVal = numValue(max);
                return (minVal === null || value >= minVal) && (maxVal === null || value <= maxVal);
            };

            // Verificar filtro de ciclo
            const studentCiclo = getCicloFromTurma(student.turma);
            const cicloMatch = filters.selectedCiclos.size === 0 ||
                (studentCiclo && filters.selectedCiclos.has(studentCiclo));

            // Verificar filtro de turno
            const studentTurno = getTurnoFromTurma(student.turma);
            const turnoMatch = filters.selectedTurnos.size === 0 ||
                (studentTurno && filters.selectedTurnos.has(studentTurno));

            return (
                cicloMatch &&
                turnoMatch &&
                (filters.selectedTurmas.size === 0 || filters.selectedTurmas.has(student.turma)) &&
                inRange(student.faltasB1, filters.b1.min, filters.b1.max) &&
                inRange(student.faltasB2, filters.b2.min, filters.b2.max) &&
                inRange(student.faltasB3, filters.b3.min, filters.b3.max) &&
                inRange(student.faltasB4, filters.b4.min, filters.b4.max) &&
                inRange(student.totalFaltas, filters.totalFaltas.min, filters.totalFaltas.max) &&
                inRange(student.percentualFaltas, filters.percentualFaltas.min, filters.percentualFaltas.max) &&
                inRange(student.percentualFrequencia, filters.percentualFrequencia.min, filters.percentualFrequencia.max)
            );
        });
    }, [data, filters]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.selectedTurmas.size > 0) count++;
        if (filters.selectedCiclos.size > 0) count++;
        if (filters.selectedTurnos.size > 0) count++; // Contar filtro de turnos

        const ranges = [filters.b1, filters.b2, filters.b3, filters.b4, filters.totalFaltas, filters.percentualFaltas, filters.percentualFrequencia];
        ranges.forEach(range => {
            if (range.min || range.max) count++;
        });

        return count;
    }, [filters]);

    // Calcular estatísticas para o header
    const stats = useMemo(() => {
        const total = filteredData.length;
        const totalGeral = data.length;
        const excelentesCount = filteredData.filter(item => item.percentualFrequencia >= 95.0).length;
        const criticalCount = filteredData.filter(item => item.percentualFrequencia < 75.0).length;

        return { total, totalGeral, excelentesCount, criticalCount };
    }, [filteredData, data]);

    return (
        <div className="w-full space-y-4">
            {/* Header com design moderno */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-semibold text-gray-900">
                                    Tabela de Frequência
                                </CardTitle>
                                <p className="text-sm text-gray-600">
                                    {stats.total} de {stats.totalGeral} estudantes
                                </p>
                            </div>
                        </div>

                        {/* Estatísticas rápidas no header */}
                        <div className="flex items-center gap-4">
                            <div
                                className="text-center cursor-pointer hover:bg-green-100 rounded-lg p-2 transition-colors"
                                onClick={applyFrequenciaExcelenteFilter}
                                title="Clique para filtrar frequência excelente"
                            >
                                <div className="text-lg font-bold text-green-600">
                                    {stats.excelentesCount}
                                </div>
                                <div className="text-xs text-gray-600">Freq. Excelente (≥95%)</div>
                            </div>
                            <div
                                className="text-center cursor-pointer hover:bg-red-100 rounded-lg p-2 transition-colors"
                                onClick={applyFrequenciaCriticaFilter}
                                title="Clique para filtrar frequência crítica"
                            >
                                <div className="text-lg font-bold text-red-600">
                                    {stats.criticalCount}
                                </div>
                                <div className="text-xs text-gray-600">Freq. Crítica (&lt;75%)</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                                className="relative"
                            >
                                <Filter className="h-4 w-4 mr-2" />
                                Filtros
                                {activeFiltersCount > 0 && (
                                    <Badge
                                        variant="destructive"
                                        className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                                    >
                                        {activeFiltersCount}
                                    </Badge>
                                )}
                            </Button>

                            {activeFiltersCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetFilters}
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Limpar
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Filtros com Tabs - agora com 5 abas */}
            {showFilters && (
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-4">
                        <Tabs defaultValue="ciclos" className="w-full">
                            <TabsList className="grid w-full grid-cols-5 mb-4">
                                <TabsTrigger value="ciclos" className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" />
                                    Ciclos
                                </TabsTrigger>
                                <TabsTrigger value="turnos" className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Turnos
                                </TabsTrigger>
                                <TabsTrigger value="turmas" className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Turmas
                                </TabsTrigger>
                                <TabsTrigger value="bimestres" className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Bimestres
                                </TabsTrigger>
                                <TabsTrigger value="resumo" className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Resumo
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="ciclos" className="space-y-3">
                                <CicloSelector
                                    selectedCiclos={filters.selectedCiclos}
                                    onCicloChange={updateCicloFilter}
                                    turmasData={uniqueTurmas}
                                />
                            </TabsContent>

                            <TabsContent value="turnos" className="space-y-3">
                                <TurnoSelector
                                    selectedTurnos={filters.selectedTurnos}
                                    onTurnoChange={updateTurnoFilter}
                                    turmasData={uniqueTurmas}
                                />
                            </TabsContent>

                            <TabsContent value="turmas" className="space-y-3">
                                <TurmaSelector
                                    groupedTurmas={groupedTurmas}
                                    selectedTurmas={filters.selectedTurmas}
                                    onTurmaChange={updateTurmaFilter}
                                />
                            </TabsContent>

                            <TabsContent value="bimestres" className="space-y-3">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <RangeInput
                                        label="1º Bimestre"
                                        value={filters.b1}
                                        onChange={(type, val) => updateRangeFilter('b1', type, val)}
                                    />
                                    <RangeInput
                                        label="2º Bimestre"
                                        value={filters.b2}
                                        onChange={(type, val) => updateRangeFilter('b2', type, val)}
                                    />
                                    <RangeInput
                                        label="3º Bimestre"
                                        value={filters.b3}
                                        onChange={(type, val) => updateRangeFilter('b3', type, val)}
                                    />
                                    <RangeInput
                                        label="4º Bimestre"
                                        value={filters.b4}
                                        onChange={(type, val) => updateRangeFilter('b4', type, val)}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="resumo" className="space-y-3">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    <RangeInput
                                        label="Total de Faltas"
                                        value={filters.totalFaltas}
                                        onChange={(type, val) => updateRangeFilter('totalFaltas', type, val)}
                                    />
                                    <RangeInput
                                        label="Percentual de Faltas"
                                        value={filters.percentualFaltas}
                                        onChange={(type, val) => updateRangeFilter('percentualFaltas', type, val)}
                                        max={100}
                                        suffix="%"
                                    />
                                    <RangeInput
                                        label="Percentual de Frequência"
                                        value={filters.percentualFrequencia}
                                        onChange={(type, val) => updateRangeFilter('percentualFrequencia', type, val)}
                                        max={100}
                                        suffix="%"
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            )}

            {/* Tabela de dados */}
            <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                    {filteredData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="p-3 bg-gray-100 rounded-full mb-4">
                                <Search className="h-6 w-6 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Nenhum resultado encontrado
                            </h3>
                            <p className="text-gray-500 mb-4">
                                Tente ajustar os filtros para encontrar estudantes
                            </p>
                            <Button variant="outline" onClick={resetFilters}>
                                Limpar todos os filtros
                            </Button>
                        </div>
                    ) : (
                        <FullDataTable data={filteredData} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
});

export default FrequencyTableCard;