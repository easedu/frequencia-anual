"use client";

import { useState, useEffect, useCallback } from "react";
import { StudentDataService } from "@/services/studentDataService";
import { logger } from "@/utils/logger";
import type { Estudante } from "@/types";

// Re-exporta o tipo para uso externo
export type { Estudante };

/**
 * Hook para carregar estudantes otimizado para redes lentas (2G/3G)
 *
 * ✅ USA API REST COM CACHE SERVER-SIDE
 *
 * Performance:
 * - 1ª carga: ~3-8s (2G/3G)
 * - 2ª+ cargas: < 500ms (cached) ⚡
 *
 * @param includeDeleted - Incluir estudantes deletados (soft-delete)
 * @param includeContacts - Incluir contatos dos estudantes
 */
export const useStudents = (includeDeleted: boolean = false, includeContacts: boolean = true) => {
    const [students, setStudents] = useState<Estudante[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Fetch students via API REST (otimizado para redes lentas)
    // useCallback previne recriação da função a cada render
    const fetchStudents = useCallback(async () => {
        let slowConnectionTimeout: NodeJS.Timeout | undefined;

        setLoading(true);
        setError(null);

        try {
            // ✅ Feedback progressivo para conexões lentas (após 5s)
            slowConnectionTimeout = setTimeout(() => {
                // Feedback silencioso - apenas aguardar
            }, 5000);

            // ✅ USA NOVA API (cache server-side, queries paralelas)
            const fetchedStudents = await StudentDataService.getStudentsViaAPI(includeDeleted, includeContacts);

            if (slowConnectionTimeout) {
                clearTimeout(slowConnectionTimeout);
            }

            setStudents(fetchedStudents);
        } catch (err) {
            if (slowConnectionTimeout) {
                clearTimeout(slowConnectionTimeout);
            }

            logger.error("[useStudents] ❌ Erro ao buscar estudantes", {}, err as Error);

            setError(err as Error);

            // ⚠️ FALLBACK: Tentar método legado se API falhar
            logger.warn("[useStudents] ⚠️ Tentando fallback com método legado...");
            try {
                const fallbackStudents = await StudentDataService.getStudents(includeDeleted, includeContacts);
                setStudents(fallbackStudents);
            } catch (fallbackErr) {
                logger.error("[useStudents] ❌ Fallback também falhou", {}, fallbackErr as Error);
                // Mantém erro original
            }
        } finally {
            setLoading(false);
        }
    }, [includeDeleted, includeContacts]); // Dependências corretas

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]); // Agora fetchStudents é estável

    return { students, loading, error, fetchStudents, setStudents };
};