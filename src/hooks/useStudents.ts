"use client";

import { useState, useEffect, useCallback } from "react";
import { StudentDataService } from "@/services/studentDataService";
import { logger } from "@/utils/logger";
import type { Estudante } from "@/types";

// Re-exporta o tipo para uso externo
export type { Estudante };

/**
 * Hook para carregar estudantes do Firebase
 *
 * @param includeDeleted - Incluir estudantes deletados (soft-delete)
 * @param includeContacts - Incluir subcoleção de contatos (PERFORMANCE: false = 1 query, true = N queries)
 */
export const useStudents = (includeDeleted: boolean = false, includeContacts: boolean = true) => {
    const [students, setStudents] = useState<Estudante[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Fetch students using V3 unified service
    // useCallback previne recriação da função a cada render
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            // PERFORMANCE: Passar parâmetro includeContacts
            const fetchedStudents = await StudentDataService.getStudents(includeDeleted, includeContacts);
            setStudents(fetchedStudents);
        } catch (err) {
            logger.error("Erro ao buscar estudantes", err as Error);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [includeDeleted, includeContacts]); // Dependências corretas

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]); // Agora fetchStudents é estável

    return { students, loading, error, fetchStudents, setStudents };
};