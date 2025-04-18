import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FullDataTable } from "@/components/CustomFullDataTable";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp } from "lucide-react";

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

export default function FrequencyTableCard({ data }: FrequencyTableCardProps) {
    const [selectedTurmas, setSelectedTurmas] = useState<Set<string>>(new Set());
    const [b1Min, setB1Min] = useState<string>("");
    const [b1Max, setB1Max] = useState<string>("");
    const [b2Min, setB2Min] = useState<string>("");
    const [b2Max, setB2Max] = useState<string>("");
    const [b3Min, setB3Min] = useState<string>("");
    const [b3Max, setB3Max] = useState<string>("");
    const [b4Min, setB4Min] = useState<string>("");
    const [b4Max, setB4Max] = useState<string>("");
    const [totalFaltasMin, setTotalFaltasMin] = useState<string>("");
    const [totalFaltasMax, setTotalFaltasMax] = useState<string>("");
    const [percentualFaltasMin, setPercentualFaltasMin] = useState<string>("");
    const [percentualFaltasMax, setPercentualFaltasMax] = useState<string>("");
    const [percentualFrequenciaMin, setPercentualFrequenciaMin] = useState<string>("");
    const [percentualFrequenciaMax, setPercentualFrequenciaMax] = useState<string>("");
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [showTurmas, setShowTurmas] = useState(true);
    const [showBimestreFilters, setShowBimestreFilters] = useState(true);
    const [showOtherFilters, setShowOtherFilters] = useState(true);

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
                if (!groups[num]) {
                    groups[num] = [];
                }
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

    const handleTurmaChange = (turma: string) => {
        setSelectedTurmas(prev => {
            const newSet = new Set(prev);
            if (newSet.has(turma)) {
                newSet.delete(turma);
            } else {
                newSet.add(turma);
            }
            return newSet;
        });
    };

    const resetFilters = () => {
        setSelectedTurmas(new Set());
        setB1Min("");
        setB1Max("");
        setB2Min("");
        setB2Max("");
        setB3Min("");
        setB3Max("");
        setB4Min("");
        setB4Max("");
        setTotalFaltasMin("");
        setTotalFaltasMax("");
        setPercentualFaltasMin("");
        setPercentualFaltasMax("");
        setPercentualFrequenciaMin("");
        setPercentualFrequenciaMax("");
    };

    const filteredData = useMemo(() => {
        return data.filter(student => {
            const b1MinNum = b1Min ? Number(b1Min) : -Infinity;
            const b1MaxNum = b1Max ? Number(b1Max) : Infinity;
            const b2MinNum = b2Min ? Number(b2Min) : -Infinity;
            const b2MaxNum = b2Max ? Number(b2Max) : Infinity;
            const b3MinNum = b3Min ? Number(b3Min) : -Infinity;
            const b3MaxNum = b3Max ? Number(b3Max) : Infinity;
            const b4MinNum = b4Min ? Number(b4Min) : -Infinity;
            const b4MaxNum = b4Max ? Number(b4Max) : Infinity;
            const totalFaltasMinNum = totalFaltasMin ? Number(totalFaltasMin) : -Infinity;
            const totalFaltasMaxNum = totalFaltasMax ? Number(totalFaltasMax) : Infinity;
            const percentualFaltasMinNum = percentualFaltasMin ? Number(percentualFaltasMin) : -Infinity;
            const percentualFaltasMaxNum = percentualFaltasMax ? Number(percentualFaltasMax) : Infinity;
            const percentualFrequenciaMinNum = percentualFrequenciaMin ? Number(percentualFrequenciaMin) : -Infinity;
            const percentualFrequenciaMaxNum = percentualFrequenciaMax ? Number(percentualFrequenciaMax) : Infinity;

            return (
                (selectedTurmas.size === 0 || selectedTurmas.has(student.turma)) &&
                student.faltasB1 >= b1MinNum && student.faltasB1 <= b1MaxNum &&
                student.faltasB2 >= b2MinNum && student.faltasB2 <= b2MaxNum &&
                student.faltasB3 >= b3MinNum && student.faltasB3 <= b3MaxNum &&
                student.faltasB4 >= b4MinNum && student.faltasB4 <= b4MaxNum &&
                student.totalFaltas >= totalFaltasMinNum && student.totalFaltas <= totalFaltasMaxNum &&
                student.percentualFaltas >= percentualFaltasMinNum && student.percentualFaltas <= percentualFaltasMaxNum &&
                student.percentualFrequencia >= percentualFrequenciaMinNum && student.percentualFrequencia <= percentualFrequenciaMaxNum
            );
        });
    }, [
        data,
        selectedTurmas,
        b1Min, b1Max,
        b2Min, b2Max,
        b3Min, b3Max,
        b4Min, b4Max,
        totalFaltasMin, totalFaltasMax,
        percentualFaltasMin, percentualFaltasMax,
        percentualFrequenciaMin, percentualFrequenciaMax
    ]);

    return (
        <Card role="region" aria-label="Tabela de Frequência dos Estudantes">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle>Tabela de Frequência dos Estudantes</CardTitle>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                    {showAdvancedFilters ? "Ocultar Filtros Avançados" : "Mostrar Filtros Avançados"}
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {showAdvancedFilters && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between py-2">
                            <CardTitle className="text-base flex items-center gap-2 cursor-pointer" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
                                Filtros Avançados
                                {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </CardTitle>
                            <Button variant="outline" size="sm" onClick={resetFilters}>
                                Limpar Filtros
                            </Button>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 p-4">
                            <Card>
                                <CardHeader className="py-2 px-4 flex flex-row items-center justify-between">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2 cursor-pointer" onClick={() => setShowTurmas(!showTurmas)}>
                                        Selecionar Turmas
                                        {showTurmas ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </CardTitle>
                                </CardHeader>
                                {showTurmas && (
                                    <CardContent className="p-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Turmas</Label>
                                            <div className="grid grid-cols-5 gap-4 max-h-[200px] overflow-y-auto">
                                                {Object.entries(groupedTurmas).map(([num, turmas]) => (
                                                    <div key={num} className="space-y-2">
                                                        <h4 className="text-sm font-semibold m-0">{`${num}º Ano`}</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                            {turmas.map(turma => (
                                                                <div key={turma} className="flex items-center space-x-2">
                                                                    <Checkbox
                                                                        id={`turma-${turma}`}
                                                                        checked={selectedTurmas.has(turma)}
                                                                        onCheckedChange={() => handleTurmaChange(turma)}
                                                                    />
                                                                    <Label htmlFor={`turma-${turma}`} className="text-sm">{turma}</Label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                            <div className="grid grid-cols-5 gap-3">
                                <Card className="p-4 col-span-3">
                                    <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2 cursor-pointer" onClick={() => setShowBimestreFilters(!showBimestreFilters)}>
                                            Faltas por Bimestre
                                            {showBimestreFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </CardTitle>
                                    </CardHeader>
                                    {showBimestreFilters && (
                                        <CardContent className="p-0">
                                            <div className="flex flex-row gap-3">
                                                {[
                                                    { label: "1º Bimestre", min: b1Min, setMin: setB1Min, max: b1Max, setMax: setB1Max },
                                                    { label: "2º Bimestre", min: b2Min, setMin: setB2Min, max: b2Max, setMax: setB2Max },
                                                    { label: "3º Bimestre", min: b3Min, setMin: setB3Min, max: b3Max, setMax: setB3Max },
                                                    { label: "4º Bimestre", min: b4Min, setMin: setB4Min, max: b4Max, setMax: setB4Max },
                                                ].map(({ label, min, setMin, max, setMax }) => (
                                                    <div key={label} className="space-y-1 flex-1">
                                                        <Label className="text-xs font-medium">{label}</Label>
                                                        <div className="flex items-center space-x-2">
                                                            <Input
                                                                type="number"
                                                                placeholder="Mín"
                                                                value={min}
                                                                onChange={(e) => setMin(e.target.value)}
                                                                min="0"
                                                                className="w-full text-sm"
                                                            />
                                                            <span className="text-xs">–</span>
                                                            <Input
                                                                type="number"
                                                                placeholder="Máx"
                                                                value={max}
                                                                onChange={(e) => setMax(e.target.value)}
                                                                min="0"
                                                                className="w-full text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    )}
                                </Card>
                                <Card className="p-4 col-span-2">
                                    <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2 cursor-pointer" onClick={() => setShowOtherFilters(!showOtherFilters)}>
                                            Outros Filtros
                                            {showOtherFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </CardTitle>
                                    </CardHeader>
                                    {showOtherFilters && (
                                        <CardContent className="p-0">
                                            <div className="flex flex-row gap-3">
                                                {[
                                                    { label: "Total de Faltas", min: totalFaltasMin, setMin: setTotalFaltasMin, max: totalFaltasMax, setMax: setTotalFaltasMax, minVal: 0 },
                                                    { label: "Percentual de Faltas (%)", min: percentualFaltasMin, setMin: setPercentualFaltasMin, max: percentualFaltasMax, setMax: setPercentualFaltasMax, minVal: 0, maxVal: 100 },
                                                    { label: "Percentual de Frequência (%)", min: percentualFrequenciaMin, setMin: setPercentualFrequenciaMin, max: percentualFrequenciaMax, setMax: setPercentualFrequenciaMax, minVal: 0, maxVal: 100 },
                                                ].map(({ label, min, setMin, max, setMax, minVal, maxVal }) => (
                                                    <div key={label} className="space-y-1 flex-1">
                                                        <Label className="text-xs font-medium">{label}</Label>
                                                        <div className="flex items-center space-x-2">
                                                            <Input
                                                                type="number"
                                                                placeholder="Mín"
                                                                value={min}
                                                                onChange={(e) => setMin(e.target.value)}
                                                                min={minVal}
                                                                max={maxVal}
                                                                className="w-full text-sm"
                                                            />
                                                            <span className="text-xs">–</span>
                                                            <Input
                                                                type="number"
                                                                placeholder="Máx"
                                                                value={max}
                                                                onChange={(e) => setMax(e.target.value)}
                                                                min={minVal}
                                                                max={maxVal}
                                                                className="w-full text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    )}
                                </Card>
                            </div>
                        </CardContent>
                    </Card>
                )}
                <Separator />
                {filteredData.length === 0 ? (
                    <Skeleton className="h-10 w-full" />
                ) : (
                    <FullDataTable data={filteredData} />
                )}
            </CardContent>
        </Card>
    );
}