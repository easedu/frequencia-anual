"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import FiltersCard from "@/components/cards/FiltersCard";
import KPIsCard from "@/components/cards/KPIsCard";
import ComparativeChartsCard from "@/components/cards/ComparativeChartsCard";
import TemporalAnalysisCard from "@/components/cards/TemporalAnalysisCard";
import AlertsCard from "@/components/cards/AlertsCard";
import FrequencyTableCard from "@/components/cards/FrequencyTableCard";
import StudentAbsencesCard from "@/components/cards/StudentAbsencesCard";
import DuplicateAbsencesCard from "@/components/cards/DuplicateAbsencesCard";
import {
    useBimesterPeriods,
    useStudentRecords,
    useSchoolDays,
    useStudentAbsences,
    useDuplicateAbsences,
} from "@/hooks/attendance";
import { useStudents } from "@/hooks/useStudents";
import dynamic from "next/dynamic";

const DayOfWeekDistributionCard = dynamic(() => import("@/components/cards/DayOfWeekDistributionCard"), {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />,
});

export default function DashboardPage() {
    const [selectedBimesters, setSelectedBimesters] = useState<Set<number>>(new Set());
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [useToday, setUseToday] = useState<boolean>(true);
    const [useCustom, setUseCustom] = useState<boolean>(false);
    const [excludeJustified, setExcludeJustified] = useState<boolean>(true);
    const [selectedTurma, setSelectedTurma] = useState<string>("");
    const [selectedStudent, setSelectedStudent] = useState<string>("");

    // Usar hooks modulares
    const { students } = useStudents();
    const { bimesterDates } = useBimesterPeriods();
    const { studentRecords } = useStudentRecords({ autoRefresh: true });
    const { getSchoolDaysForPeriod } = useSchoolDays();
    const studentAbsencesHook = useStudentAbsences(selectedStudent || null, { excludeJustified });
    const { duplicates, removeDuplicates } = useDuplicateAbsences();

    // Calcular filterState (lógica do hook antigo)
    const filterState = useMemo(() => {
        if (!bimesterDates[1]) {
            return {
                computedStartDate: '',
                computedEndDate: '',
                computedSelectedBimesters: selectedBimesters,
                computedUseCustom: useCustom,
            };
        }

        if (useToday) {
            const firstBimester = bimesterDates[1];
            const today = new Date().toLocaleDateString('pt-BR');
            return {
                computedStartDate: firstBimester ? firstBimester.start : '01/01/2025',
                computedEndDate: today,
                computedSelectedBimesters: new Set<number>(),
                computedUseCustom: false,
            };
        } else if (useCustom) {
            return {
                computedStartDate: startDate,
                computedEndDate: endDate,
                computedSelectedBimesters: selectedBimesters,
                computedUseCustom: true,
            };
        } else if (selectedBimesters.size > 0) {
            const sortedBimesters = Array.from(selectedBimesters).sort();
            const minBimester = bimesterDates[sortedBimesters[0]];
            const maxBimester = bimesterDates[sortedBimesters[sortedBimesters.length - 1]];
            return {
                computedStartDate: minBimester ? minBimester.start : '',
                computedEndDate: maxBimester ? maxBimester.end : '',
                computedSelectedBimesters: selectedBimesters,
                computedUseCustom: false,
            };
        }

        return {
            computedStartDate: '',
            computedEndDate: '',
            computedSelectedBimesters: selectedBimesters,
            computedUseCustom: useCustom,
        };
    }, [bimesterDates, useToday, useCustom, selectedBimesters, startDate, endDate]);

    // Calcular totalDiasLetivos baseado no período selecionado
    const totalDiasLetivos = useMemo(() => {
        if (!filterState.computedStartDate || !filterState.computedEndDate) return 0;
        return getSchoolDaysForPeriod(filterState.computedStartDate, filterState.computedEndDate);
    }, [filterState.computedStartDate, filterState.computedEndDate, getSchoolDaysForPeriod]);

    // Synchronize parent state with computed filter state, avoiding unnecessary updates
    useEffect(() => {
        const areSetsEqual = (setA: Set<number>, setB: Set<number>) => {
            if (setA.size !== setB.size) return false;
            for (const item of setA) {
                if (!setB.has(item)) return false;
            }
            return true;
        };

        if (
            startDate !== filterState.computedStartDate ||
            endDate !== filterState.computedEndDate ||
            !areSetsEqual(selectedBimesters, filterState.computedSelectedBimesters) ||
            useCustom !== filterState.computedUseCustom
        ) {
            setStartDate(filterState.computedStartDate);
            setEndDate(filterState.computedEndDate);
            setSelectedBimesters(new Set(filterState.computedSelectedBimesters));
            setUseCustom(filterState.computedUseCustom);
        }
    }, [filterState, startDate, endDate, selectedBimesters, useCustom]);

    return (
        <div className="p-4 space-y-8">
            <FiltersCard
                selectedBimesters={selectedBimesters}
                setSelectedBimesters={setSelectedBimesters}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                useToday={useToday}
                setUseToday={setUseToday}
                useCustom={useCustom}
                setUseCustom={setUseCustom}
                excludeJustified={excludeJustified}
                setExcludeJustified={setExcludeJustified}
            />

            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">
                    Dashboard de Frequência{excludeJustified ? " (Excluindo Faltas Justificadas)" : ""}
                </h1>
                <div className="text-lg font-bold">Dias Letivos: {totalDiasLetivos}</div>
            </div>

            <KPIsCard data={studentRecords} totalDiasLetivos={totalDiasLetivos} />
            <ComparativeChartsCard data={studentRecords} />
            <TemporalAnalysisCard data={studentRecords} />
            {/* Passar dados dos estudantes para o AlertsCard */}
            <AlertsCard data={studentRecords} students={students} />
            <FrequencyTableCard data={studentRecords} />
            <StudentAbsencesCard
                data={studentRecords}
                selectedTurma={selectedTurma}
                setSelectedTurma={setSelectedTurma}
                selectedStudent={selectedStudent}
                setSelectedStudent={setSelectedStudent}
                studentAbsences={studentAbsencesHook.absences}
            />
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                <DayOfWeekDistributionCard
                    data={studentRecords}
                    startDate={startDate}
                    endDate={endDate}
                    selectedBimesters={selectedBimesters}
                    bimesterDates={bimesterDates}
                    excludeJustified={excludeJustified}
                />
            </Suspense>
            <DuplicateAbsencesCard
                duplicateAbsences={duplicates}
                removeDuplicateAbsences={removeDuplicates}
            />
        </div>
    );
}