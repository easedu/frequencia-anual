"use client";

import { useState, useEffect } from "react";
import { studentService } from "@/services/firebase/studentService";
import { logger } from "@/utils/logger";
import type { Estudante } from "@/types";

// Função para determinar o turno com base na turma
const determinarTurno = (turma: string): "MANHÃ" | "TARDE" => {
    const primeiroCaractere = turma.trim().charAt(0).toUpperCase();
    return ["1", "2", "3", "4"].includes(primeiroCaractere) ? "TARDE" : "MANHÃ";
};

export const useStudents = () => {
    const [students, setStudents] = useState<Estudante[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Função para buscar os estudantes usando o serviço centralizado
    const fetchStudents = async () => {
        setLoading(true);
        try {
            const fetchedStudents = await studentService.getStudents();
            setStudents(fetchedStudents);
        } catch (err) {
            logger.error("Erro ao buscar estudantes", err as Error);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    // Função para salvar os estudantes usando o serviço centralizado
    const saveStudents = async (newStudents: Estudante[]) => {
        try {
            await studentService.saveStudents(newStudents);
            setStudents(newStudents);
        } catch (err) {
            logger.error("Erro ao salvar no Firebase", err as Error);
            setError(err as Error);
            throw err;
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    return { students, loading, error, fetchStudents, saveStudents, setStudents };
};