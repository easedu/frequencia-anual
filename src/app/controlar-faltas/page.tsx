"use client";

import { useState, useEffect, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import FiltersCard from "@/components/cards/FiltersCard";
import KPIsCard from "@/components/cards/KPIsCard";
import ComparativeChartsCard from "@/components/cards/ComparativeChartsCard";
import TemporalAnalysisCard from "@/components/cards/TemporalAnalysisCard";
import AlertsCard from "@/components/cards/AlertsCard";
import FrequencyTableCard from "@/components/cards/FrequencyTableCard";
import StudentAbsencesCard from "@/components/cards/StudentAbsencesCard";
import DuplicateAbsencesCard from "@/components/cards/DuplicateAbsencesCard";
import { useAttendanceData } from "@/hooks/useAttendanceData";
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
    const [excludeJustified, setExcludeJustified] = useState<boolean>(false);
    const [selectedTurma, setSelectedTurma] = useState<string>("");
    const [selectedStudent, setSelectedStudent] = useState<string>("");

    const {
        bimesterDates,
        data,
        totalDiasLetivos,
        studentAbsences,
        duplicateAbsences,
        filterState,
        removeDuplicateAbsences,
    } = useAttendanceData({
        selectedBimesters,
        startDate,
        endDate,
        useToday,
        useCustom,
        excludeJustified,
        selectedStudent,
    });

    // Synchronize parent state with computed filter state, avoiding unnecessary updates
    useEffect(() => {
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

    // Helper function to compare Sets
    const areSetsEqual = (setA: Set<number>, setB: Set<number>) => {
        if (setA.size !== setB.size) return false;
        for (const item of setA) {
            if (!setB.has(item)) return false;
        }
        return true;
    };

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

            <KPIsCard data={data} totalDiasLetivos={totalDiasLetivos} />
            <ComparativeChartsCard data={data} />
            <TemporalAnalysisCard data={data} />
            <AlertsCard data={data} />
            <FrequencyTableCard data={data} />
            <StudentAbsencesCard
                data={data}
                selectedTurma={selectedTurma}
                setSelectedTurma={setSelectedTurma}
                selectedStudent={selectedStudent}
                setSelectedStudent={setSelectedStudent}
                studentAbsences={studentAbsences}
            />
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                <DayOfWeekDistributionCard
                    data={data}
                    startDate={startDate}
                    endDate={endDate}
                    selectedBimesters={selectedBimesters}
                    bimesterDates={bimesterDates}
                    excludeJustified={excludeJustified}
                />
            </Suspense>
            <DuplicateAbsencesCard
                duplicateAbsences={duplicateAbsences}
                removeDuplicateAbsences={removeDuplicateAbsences}
            />
        </div>
    );
}