import { useState, useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FullDataTable } from "@/components/CustomFullDataTable";
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
    Search
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
    b1: RangeFilter;
    b2: RangeFilter;
    b3: RangeFilter;
    b4: RangeFilter;
    totalFaltas: RangeFilter;
    percentualFaltas: RangeFilter;
    percentualFrequencia: RangeFilter;
}

// Hook personalizado para gerenciar filtros
const useFilters = () => {
    const [filters, setFilters] = useState<FilterState>({
        selectedTurmas: new Set(),
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

    const updateRangeFilter = useCallback((field: keyof Omit<FilterState, 'selectedTurmas'>, type: 'min' | 'max', value: string) => {
        setFilters(prev => ({
            ...prev,
            [field]: {
                ...prev[field],
                [type]: value
            }
        }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters({
            selectedTurmas: new Set(),
            b1: { min: "", max: "" },
            b2: { min: "", max: "" },
            b3: { min: "", max: "" },
            b4: { min: "", max: "" },
            totalFaltas: { min: "", max: "" },
            percentualFaltas: { min: "", max: "" },
            percentualFrequencia: { min: "", max: "" }
        });
    }, []);

    return { filters, updateTurmaFilter, updateRangeFilter, resetFilters };
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

export default function FrequencyTableCard({ data }: FrequencyTableCardProps) {
    const { filters, updateTurmaFilter, updateRangeFilter, resetFilters } = useFilters();
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

            return (
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

        const ranges = [filters.b1, filters.b2, filters.b3, filters.b4, filters.totalFaltas, filters.percentualFaltas, filters.percentualFrequencia];
        ranges.forEach(range => {
            if (range.min || range.max) count++;
        });

        return count;
    }, [filters]);

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
                                    {filteredData.length} de {data.length} estudantes
                                </p>
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

            {/* Filtros com Tabs */}
            {showFilters && (
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-4">
                        <Tabs defaultValue="turmas" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-4">
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
}