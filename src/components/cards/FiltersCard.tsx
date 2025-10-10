"use client";

import { memo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateInput } from "@/utils/attendanceUtils";
import { Calendar, Clock, Settings, Filter, CheckSquare } from "lucide-react";

interface FiltersCardProps {
    selectedBimesters: Set<number>;
    setSelectedBimesters: React.Dispatch<React.SetStateAction<Set<number>>>;
    startDate: string;
    setStartDate: React.Dispatch<React.SetStateAction<string>>;
    endDate: string;
    setEndDate: React.Dispatch<React.SetStateAction<string>>;
    useToday: boolean;
    setUseToday: React.Dispatch<React.SetStateAction<boolean>>;
    useCustom: boolean;
    setUseCustom: React.Dispatch<React.SetStateAction<boolean>>;
    excludeJustified: boolean;
    setExcludeJustified: React.Dispatch<React.SetStateAction<boolean>>;
}

const FiltersCard = memo(function FiltersCard({
    selectedBimesters,
    setSelectedBimesters,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    useToday,
    setUseToday,
    useCustom,
    setUseCustom,
    excludeJustified,
    setExcludeJustified,
}: FiltersCardProps) {
    const handleBimesterChange = (bimester: number, checked: boolean | string) => {
        if (typeof checked === "boolean") {
            setSelectedBimesters((prev) => {
                const newSet = new Set(prev);
                if (checked) {
                    newSet.add(bimester);
                } else {
                    newSet.delete(bimester);
                }
                return newSet;
            });
        }
    };

    const handleTodayChange = (checked: boolean | string) => {
        if (typeof checked === "boolean") {
            setUseToday(checked);
            if (checked) {
                setUseCustom(false);
                setSelectedBimesters(new Set());
            }
        }
    };

    const handleCustomChange = (checked: boolean | string) => {
        if (typeof checked === "boolean") {
            setUseCustom(checked);
            if (checked) {
                setUseToday(false);
                setSelectedBimesters(new Set());
            }
        }
    };

    const handleDateChange = (type: "start" | "end", value: string) => {
        if (type === "start") {
            setStartDate(formatDateInput(value));
        } else {
            setEndDate(formatDateInput(value));
        }
    };

    const getBimesterColor = (bimester: number) => {
        const colors = {
            1: "border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700",
            2: "border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700",
            3: "border-orange-300 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700",
            4: "border-purple-300 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-700"
        };
        return colors[bimester as keyof typeof colors];
    };

    const activeFiltersCount = selectedBimesters.size + (useToday ? 1 : 0) + (useCustom ? 1 : 0) + (excludeJustified ? 1 : 0);

    return (
        <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-2 border-slate-200/50 dark:border-slate-700/50 shadow-lg" role="region" aria-label="Filtros de Período">
            <CardHeader className="bg-gradient-to-r from-indigo-50 via-blue-50 to-slate-50 dark:from-indigo-900/30 dark:via-blue-900/30 dark:to-slate-800/30 rounded-t-lg pb-4">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg">
                            <Filter className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                Filtros de Período
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
                                Configure os filtros para análise de dados
                            </p>
                        </div>
                    </div>
                    {activeFiltersCount > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 rounded-full">
                            <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                                {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''}
                            </span>
                        </div>
                    )}
                </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
                {/* Layout Grid Principal */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                    {/* Seção Bimestres - Compacta */}
                    <div className="lg:col-span-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Bimestres</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {[1, 2, 3, 4].map((bimester) => {
                                const isSelected = selectedBimesters.has(bimester);
                                const isDisabled = useToday || useCustom;

                                return (
                                    <div
                                        key={bimester}
                                        className={`p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer ${isSelected
                                                ? getBimesterColor(bimester) + " shadow-sm"
                                                : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                                            } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                                        onClick={() => !isDisabled && handleBimesterChange(bimester, !isSelected)}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`bimester-${bimester}`}
                                                checked={isSelected}
                                                onCheckedChange={(checked) => handleBimesterChange(bimester, checked)}
                                                disabled={isDisabled}
                                                aria-label={`Selecionar ${bimester}º Bimestre`}
                                                className={`h-4 w-4 ${isSelected
                                                        ? "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=checked]:text-white"
                                                        : ""
                                                    }`}
                                            />
                                            <Label
                                                htmlFor={`bimester-${bimester}`}
                                                className="font-medium text-sm cursor-pointer"
                                            >
                                                {bimester}º Bim.
                                            </Label>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Seção Período - Compacta */}
                    <div className="lg:col-span-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <Clock className="w-3 h-3 text-green-600 dark:text-green-400" />
                            </div>
                            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Período</h4>
                        </div>

                        <div className="space-y-2">
                            {/* Até Hoje - Compacto */}
                            <div
                                className={`p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer ${useToday
                                        ? "border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700 shadow-sm"
                                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                                    } ${useCustom ? "opacity-50 cursor-not-allowed" : ""}`}
                                onClick={() => !useCustom && handleTodayChange(!useToday)}
                            >
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="today"
                                        checked={useToday}
                                        onCheckedChange={handleTodayChange}
                                        disabled={useCustom}
                                        aria-label="Usar data até hoje"
                                        className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 h-4 w-4"
                                    />
                                    <Label htmlFor="today" className="font-medium text-sm cursor-pointer">
                                        Até Hoje
                                    </Label>
                                </div>
                            </div>

                            {/* Período Personalizado - Compacto */}
                            <div
                                className={`p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer ${useCustom
                                        ? "border-purple-300 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-700 shadow-sm"
                                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                                    } ${useToday ? "opacity-50 cursor-not-allowed" : ""}`}
                                onClick={() => !useToday && handleCustomChange(!useCustom)}
                            >
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="custom"
                                        checked={useCustom}
                                        onCheckedChange={handleCustomChange}
                                        disabled={useToday}
                                        aria-label="Usar período personalizado"
                                        className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500 h-4 w-4"
                                    />
                                    <Label htmlFor="custom" className="font-medium text-sm cursor-pointer">
                                        Personalizado
                                    </Label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Seção Opções Avançadas - Compacta */}
                    <div className="lg:col-span-3 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                <Settings className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                            </div>
                            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Opções</h4>
                        </div>

                        <div
                            className={`p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer ${excludeJustified
                                    ? "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700 shadow-sm"
                                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                                }`}
                            onClick={() => setExcludeJustified(!excludeJustified)}
                        >
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="excludeJustified"
                                    checked={excludeJustified}
                                    onCheckedChange={(checked) => setExcludeJustified(checked === true)}
                                    aria-label="Excluir faltas justificadas"
                                    className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500 h-4 w-4"
                                />
                                <Label htmlFor="excludeJustified" className="font-medium text-sm cursor-pointer">
                                    Excluir Justificadas
                                </Label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Campos de Data Personalizada - Aparecem abaixo quando ativados */}
                {useCustom && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                        <div className="space-y-1">
                            <Label htmlFor="start-date" className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                <Calendar className="w-3 h-3 text-purple-500" />
                                Data de Início
                            </Label>
                            <Input
                                id="start-date"
                                placeholder="dd/mm/aaaa"
                                value={startDate}
                                onChange={(e) => handleDateChange("start", e.target.value)}
                                maxLength={10}
                                disabled={!useCustom}
                                aria-label="Data de início"
                                className="h-9 text-sm border-purple-200 dark:border-purple-700 focus:border-purple-500 dark:focus:border-purple-400 bg-white dark:bg-slate-800"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="end-date" className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                <Calendar className="w-3 h-3 text-purple-500" />
                                Data de Fim
                            </Label>
                            <Input
                                id="end-date"
                                placeholder="dd/mm/aaaa"
                                value={endDate}
                                onChange={(e) => handleDateChange("end", e.target.value)}
                                maxLength={10}
                                disabled={!useCustom}
                                aria-label="Data de fim"
                                className="h-9 text-sm border-purple-200 dark:border-purple-700 focus:border-purple-500 dark:focus:border-purple-400 bg-white dark:bg-slate-800"
                            />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});

export default FiltersCard;