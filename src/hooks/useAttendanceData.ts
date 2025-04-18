import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, getDocs, getDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase.config";
import {
    getBimesterByDate,
    parseDate,
    formatFirebaseDate,
} from "@/utils/attendanceUtils";

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

interface AbsenceRecord {
    estudanteId: string;
    turma: string;
    data: string;
    docId: string;
    justified: boolean;
}

interface Student {
    estudanteId: string;
    nome: string;
    turma: string;
    status: string;
}

interface AnoLetivoData {
    [key: string]: { dates: { date: string; isChecked: boolean }[]; startDate: string; endDate: string };
}

interface BimesterDates {
    [key: number]: { start: string; end: string };
}

interface StudentAbsencesByBimester {
    b1: string[];
    b2: string[];
    b3: string[];
    b4: string[];
}

interface FilterState {
    computedStartDate: string;
    computedEndDate: string;
    computedSelectedBimesters: Set<number>;
    computedUseCustom: boolean;
}

interface UseAttendanceDataProps {
    selectedBimesters: Set<number>;
    startDate: string;
    endDate: string;
    useToday: boolean;
    useCustom: boolean;
    excludeJustified: boolean;
    selectedStudent: string;
}

export function useAttendanceData({
    selectedBimesters,
    startDate,
    endDate,
    useToday,
    useCustom,
    excludeJustified,
    selectedStudent,
}: UseAttendanceDataProps) {
    const [bimesterDates, setBimesterDates] = useState<BimesterDates>({});
    const [data, setData] = useState<StudentRecord[]>([]);
    const [totalDiasLetivos, setTotalDiasLetivos] = useState<number>(0);
    const [studentAbsences, setStudentAbsences] = useState<StudentAbsencesByBimester>({ b1: [], b2: [], b3: [], b4: [] });
    const [duplicateAbsences, setDuplicateAbsences] = useState<AbsenceRecord[]>([]);

    useEffect(() => {
        const fetchBimesterDates = async () => {
            try {
                const docRef = doc(db, "2025", "ano_letivo");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const anoData = docSnap.data() as AnoLetivoData;
                    const dates: BimesterDates = {};
                    const bimesters = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
                    for (let i = 0; i < bimesters.length; i++) {
                        const bimesterKey = bimesters[i];
                        const bimesterNum = i + 1;
                        if (anoData[bimesterKey]) {
                            const start = anoData[bimesterKey].startDate;
                            const end = anoData[bimesterKey].endDate;
                            if (start && end) {
                                dates[bimesterNum] = { start, end };
                            }
                        }
                    }
                    setBimesterDates(dates);
                }
            } catch (error) {
                console.error("Erro ao buscar períodos dos bimestres:", error);
            }
        };
        fetchBimesterDates();
    }, []);

    const filterState = useMemo<FilterState>(() => {
        if (Object.keys(bimesterDates).length === 0) {
            return {
                computedStartDate: "",
                computedEndDate: "",
                computedSelectedBimesters: selectedBimesters,
                computedUseCustom: useCustom,
            };
        }

        if (useToday) {
            const firstBimester = bimesterDates[1];
            const today = new Date().toLocaleDateString("pt-BR");
            return {
                computedStartDate: firstBimester ? firstBimester.start : "01/01/2025",
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
                computedStartDate: minBimester ? minBimester.start : "",
                computedEndDate: maxBimester ? maxBimester.end : "",
                computedSelectedBimesters: selectedBimesters,
                computedUseCustom: false,
            };
        } else {
            return {
                computedStartDate: "",
                computedEndDate: "",
                computedSelectedBimesters: selectedBimesters,
                computedUseCustom: useCustom,
            };
        }
    }, [bimesterDates, useToday, useCustom, selectedBimesters, startDate, endDate]);

    const fetchStudentData = useCallback(
        async (
            totalDiasLetivos: number,
            start: string,
            end: string,
            bimesterDates: BimesterDates
        ): Promise<StudentRecord[]> => {
            try {
                const absenceSnapshot = await getDocs(collection(db, "2025", "faltas", "controle"));
                const absenceRecords: AbsenceRecord[] = absenceSnapshot.docs.map(doc => ({
                    estudanteId: doc.data().estudanteId,
                    turma: doc.data().turma,
                    data: doc.data().data,
                    docId: doc.id,
                    justified: doc.data().justified ?? false,
                }));

                const studentsDocSnap = await getDoc(doc(db, "2025", "lista_de_estudantes"));
                let studentList: Student[] = [];
                if (studentsDocSnap.exists()) {
                    const studentData = studentsDocSnap.data() as { estudantes: Student[] };
                    studentList = (studentData.estudantes || []).filter(student => student.status === "ATIVO");
                }

                const studentMap: Record<string, { nome: string; turma: string }> = {};
                studentList.forEach(student => {
                    studentMap[student.estudanteId] = { nome: student.nome, turma: student.turma };
                });

                const startDateObj = parseDate(start);
                const endDateObj = useToday ? new Date() : parseDate(end);

                if (!startDateObj || !endDateObj || isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
                    return [];
                }

                const aggregated: Record<string, StudentRecord> = {};
                absenceRecords.forEach(record => {
                    const formattedDate = formatFirebaseDate(record.data);
                    const date = parseDate(formattedDate);
                    if (!date || date < startDateObj || date > endDateObj) {
                        return;
                    }

                    const bimester = getBimesterByDate(formattedDate, bimesterDates);
                    if (bimester === 0 || (selectedBimesters.size > 0 && !selectedBimesters.has(bimester))) {
                        return;
                    }

                    if (excludeJustified && record.justified) {
                        return;
                    }

                    const studentId = record.estudanteId;
                    if (!studentMap[studentId]) {
                        return;
                    }

                    if (!aggregated[studentId]) {
                        aggregated[studentId] = {
                            estudanteId: studentId,
                            turma: record.turma,
                            nome: studentMap[studentId].nome,
                            faltasB1: 0,
                            faltasB2: 0,
                            faltasB3: 0,
                            faltasB4: 0,
                            totalFaltas: 0,
                            percentualFaltas: 0,
                            percentualFrequencia: 100,
                        };
                    }

                    if (bimester === 1) aggregated[studentId].faltasB1++;
                    else if (bimester === 2) aggregated[studentId].faltasB2++;
                    else if (bimester === 3) aggregated[studentId].faltasB3++;
                    else if (bimester === 4) aggregated[studentId].faltasB4++;
                });

                studentList.forEach(student => {
                    if (!aggregated[student.estudanteId]) {
                        aggregated[student.estudanteId] = {
                            estudanteId: student.estudanteId,
                            turma: student.turma,
                            nome: student.nome,
                            faltasB1: 0,
                            faltasB2: 0,
                            faltasB3: 0,
                            faltasB4: 0,
                            totalFaltas: 0,
                            percentualFaltas: 0,
                            percentualFrequencia: 100,
                        };
                    }
                });

                const total = totalDiasLetivos || 40;
                Object.values(aggregated).forEach(student => {
                    student.totalFaltas = student.faltasB1 + student.faltasB2 + student.faltasB3 + student.faltasB4;
                    student.percentualFaltas = Number(Math.min((student.totalFaltas / total) * 100, 100).toFixed(1));
                    student.percentualFrequencia = Number((100 - student.percentualFaltas).toFixed(1));
                });

                return Object.values(aggregated);
            } catch (error) {
                console.error("Erro ao buscar registros de faltas:", error);
                return [];
            }
        },
        [selectedBimesters, useToday, excludeJustified]
    );

    const calculateDiasLetivos = useCallback(
        async (start: string, end: string): Promise<number> => {
            try {
                const docRef = doc(db, "2025", "ano_letivo");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const anoData = docSnap.data() as AnoLetivoData;
                    let total = 0;
                    const startDateObj = parseDate(start);
                    const endDateObj = useToday ? new Date() : parseDate(end);

                    if (!startDateObj || !endDateObj || isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
                        return 0;
                    }

                    const bimesters = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
                    for (const bimesterKey of bimesters) {
                        if (anoData[bimesterKey]?.dates) {
                            total += anoData[bimesterKey].dates.filter(d => {
                                const date = parseDate(d.date);
                                const bimesterNum = bimesters.indexOf(bimesterKey) + 1;
                                return (
                                    d.isChecked &&
                                    date &&
                                    date >= startDateObj &&
                                    date <= endDateObj &&
                                    (!selectedBimesters.size || selectedBimesters.has(bimesterNum))
                                );
                            }).length;
                        }
                    }
                    return total;
                }
                return 0;
            } catch (error) {
                console.error("Erro ao calcular dias letivos:", error);
                return 0;
            }
        },
        [useToday, selectedBimesters]
    );

    const fetchStudentAbsences = useCallback(
        async (studentId: string) => {
            try {
                const absenceSnapshot = await getDocs(collection(db, "2025", "faltas", "controle"));
                const absenceRecords: AbsenceRecord[] = absenceSnapshot.docs.map(doc => ({
                    estudanteId: doc.data().estudanteId,
                    turma: doc.data().turma,
                    data: formatFirebaseDate(doc.data().data),
                    docId: doc.id,
                    justified: doc.data().justified ?? false,
                }));

                const absencesByBimester: StudentAbsencesByBimester = { b1: [], b2: [], b3: [], b4: [] };
                absenceRecords
                    .filter(record => record.estudanteId === studentId && (!excludeJustified || !record.justified))
                    .forEach(record => {
                        const bimester = getBimesterByDate(record.data, bimesterDates);
                        if (bimester === 1) absencesByBimester.b1.push(record.data);
                        else if (bimester === 2) absencesByBimester.b2.push(record.data);
                        else if (bimester === 3) absencesByBimester.b3.push(record.data);
                        else if (bimester === 4) absencesByBimester.b4.push(record.data);
                    });

                absencesByBimester.b1.sort((a, b) => (parseDate(a)?.getTime() || 0) - (parseDate(b)?.getTime() || 0));
                absencesByBimester.b2.sort((a, b) => (parseDate(a)?.getTime() || 0) - (parseDate(b)?.getTime() || 0));
                absencesByBimester.b3.sort((a, b) => (parseDate(a)?.getTime() || 0) - (parseDate(b)?.getTime() || 0));
                absencesByBimester.b4.sort((a, b) => (parseDate(a)?.getTime() || 0) - (parseDate(b)?.getTime() || 0));

                setStudentAbsences(absencesByBimester);
            } catch (error) {
                console.error("Erro ao buscar faltas do estudante:", error);
                setStudentAbsences({ b1: [], b2: [], b3: [], b4: [] });
            }
        },
        [bimesterDates, excludeJustified]
    );

    const fetchDuplicateAbsences = useCallback(async () => {
        try {
            const absenceSnapshot = await getDocs(collection(db, "2025", "faltas", "controle"));
            const absenceRecords: AbsenceRecord[] = absenceSnapshot.docs.map(doc => ({
                estudanteId: doc.data().estudanteId,
                turma: doc.data().turma,
                data: formatFirebaseDate(doc.data().data),
                docId: doc.id,
                justified: doc.data().justified ?? false,
            }));

            const seen: Record<string, AbsenceRecord[]> = {};
            absenceRecords.forEach(record => {
                const key = `${record.estudanteId}-${record.data}`;
                if (!seen[key]) {
                    seen[key] = [];
                }
                seen[key].push(record);
            });

            const duplicates = Object.values(seen)
                .filter(group => group.length > 1)
                .flat();

            setDuplicateAbsences(duplicates);
        } catch (error) {
            console.error("Erro ao buscar duplicatas de faltas:", error);
            setDuplicateAbsences([]);
        }
    }, []);

    const removeDuplicateAbsences = useCallback(async () => {
        try {
            const absenceSnapshot = await getDocs(collection(db, "2025", "faltas", "controle"));
            const absenceRecords: AbsenceRecord[] = absenceSnapshot.docs.map(doc => ({
                estudanteId: doc.data().estudanteId,
                turma: doc.data().turma,
                data: formatFirebaseDate(doc.data().data),
                docId: doc.id,
                justified: doc.data().justified ?? false,
            }));

            const seen: Record<string, AbsenceRecord[]> = {};
            absenceRecords.forEach(record => {
                const key = `${record.estudanteId}-${record.data}`;
                if (!seen[key]) {
                    seen[key] = [];
                }
                seen[key].push(record);
            });

            const duplicatesToRemove = Object.values(seen)
                .filter(group => group.length > 1)
                .flatMap(group => group.slice(1));

            const deletePromises = duplicatesToRemove.map(record =>
                deleteDoc(doc(db, "2025", "faltas", "controle", record.docId))
            );
            await Promise.all(deletePromises);

            console.log(`Removidos ${duplicatesToRemove.length} registros duplicados.`);

            await fetchDuplicateAbsences();

            if (filterState.computedStartDate && filterState.computedEndDate) {
                const total = await calculateDiasLetivos(filterState.computedStartDate, filterState.computedEndDate);
                const newData = await fetchStudentData(total, filterState.computedStartDate, filterState.computedEndDate, bimesterDates);
                setData(newData);
            }
        } catch (error) {
            console.error("Erro ao remover duplicatas de faltas:", error);
        }
    }, [fetchDuplicateAbsences, filterState, calculateDiasLetivos, bimesterDates, fetchStudentData]);

    useEffect(() => {
        const updateData = async () => {
            if (
                (useToday || selectedBimesters.size > 0 || useCustom) &&
                filterState.computedStartDate &&
                filterState.computedEndDate
            ) {
                const start = parseDate(filterState.computedStartDate);
                const end = parseDate(filterState.computedEndDate);
                if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    const total = await calculateDiasLetivos(filterState.computedStartDate, filterState.computedEndDate);
                    setTotalDiasLetivos(total);
                    const newData = await fetchStudentData(total, filterState.computedStartDate, filterState.computedEndDate, bimesterDates);
                    setData(newData);
                } else {
                    setTotalDiasLetivos(0);
                    setData([]);
                }
            } else if (!useToday && !useCustom && selectedBimesters.size === 0) {
                setTotalDiasLetivos(0);
                setData([]);
            }
        };
        updateData();
    }, [filterState, useToday, useCustom, selectedBimesters, calculateDiasLetivos, bimesterDates, fetchStudentData]);

    useEffect(() => {
        if (selectedStudent) {
            fetchStudentAbsences(selectedStudent);
        } else {
            setStudentAbsences({ b1: [], b2: [], b3: [], b4: [] });
        }
    }, [selectedStudent, fetchStudentAbsences]);

    useEffect(() => {
        fetchDuplicateAbsences();
    }, [fetchDuplicateAbsences]);

    return {
        bimesterDates,
        data,
        totalDiasLetivos,
        studentAbsences,
        duplicateAbsences,
        filterState,
        fetchStudentAbsences,
        fetchDuplicateAbsences,
        removeDuplicateAbsences,
        calculateDiasLetivos,
    };
}