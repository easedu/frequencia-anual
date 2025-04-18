"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateInput } from "@/utils/attendanceUtils";

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

export default function FiltersCard({
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
        // Tratar apenas valores booleanos, ignorar "indeterminate"
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

    return (
        <Card role="region" aria-label="Filtros de Período">
            <CardHeader>
                <CardTitle>Filtros de Período</CardTitle>
            </CardHeader>
            <CardContent>
                <nav className="grid grid-cols-1 md:grid-cols-8 gap-4 items-center">
                    {[1, 2, 3, 4].map((bimester) => (
                        <div key={bimester} className="flex items-center space-x-2">
                            <Checkbox
                                id={`bimester-${bimester}`}
                                checked={selectedBimesters.has(bimester)}
                                onCheckedChange={(checked) => handleBimesterChange(bimester, checked)}
                                disabled={useToday || useCustom}
                                aria-label={`Selecionar ${bimester}º Bimestre`}
                            />
                            <Label htmlFor={`bimester-${bimester}`}>{`${bimester}º Bimestre`}</Label>
                        </div>
                    ))}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="today"
                            checked={useToday}
                            onCheckedChange={handleTodayChange}
                            disabled={useCustom}
                            aria-label="Usar data até hoje"
                        />
                        <Label htmlFor="today">Até Hoje</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="custom"
                            checked={useCustom}
                            onCheckedChange={handleCustomChange}
                            disabled={useToday}
                            aria-label="Usar período personalizado"
                        />
                        <Label htmlFor="custom">Personalizado</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="start-date">Início</Label>
                        <Input
                            id="start-date"
                            placeholder="dd/mm/aaaa"
                            value={startDate}
                            onChange={(e) => handleDateChange("start", e.target.value)}
                            maxLength={10}
                            disabled={!useCustom}
                            aria-label="Data de início"
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="end-date">Fim</Label>
                        <Input
                            id="end-date"
                            placeholder="dd/mm/aaaa"
                            value={endDate}
                            onChange={(e) => handleDateChange("end", e.target.value)}
                            maxLength={10}
                            disabled={!useCustom}
                            aria-label="Data de fim"
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="excludeJustified"
                            checked={excludeJustified}
                            onCheckedChange={(checked) => setExcludeJustified(checked === true)}
                            aria-label="Excluir faltas justificadas"
                        />
                        <Label htmlFor="excludeJustified">Excluir Justificadas</Label>
                    </div>
                </nav>
            </CardContent>
        </Card>
    );
}