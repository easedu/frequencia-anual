"use client";

import { useState, useEffect } from "react";
import { StudentDataService } from "@/services/studentDataService";
import { logger } from "@/utils/logger";
import type { Estudante } from "@/types";

export const useStudents = () => {
    const [students, setStudents] = useState<Estudante[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Fetch students using V3 unified service
    const fetchStudents = async () => {
        setLoading(true);
        try {
            const fetchedStudents = await StudentDataService.getStudents();
            setStudents(fetchedStudents);
        } catch (err) {
            logger.error("Erro ao buscar estudantes", err as Error);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    return { students, loading, error, fetchStudents, setStudents };
};