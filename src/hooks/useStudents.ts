"use client";

import { useState, useEffect } from "react";
import { studentService } from "@/services/firebase/studentService";
import { logger } from "@/utils/logger";

export interface Contato {
    nome: string;
    telefone: string;
}

export interface Endereco {
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    complemento: string;
}

export interface Deficiencia {
    estudanteComDeficiencia: boolean;
    tipoDeficiencia?: string[]; // DI, DM, TEA, DF, SÍNDROME DE DOWN
    possuiBarreiras?: boolean;
    aee?: "PAEE" | "PAAI";
    instituicao?: "INSTITUTO JÔ CLEMENTE" | "CLIFAK" | "CEJOLE" | "CCA" | "NENHUM";
    horarioAtendimento?: "NENHUM" | "NO TURNO" | "CONTRATURNO";
    atendimentoSaude?: string[]; // NÃO FAZ, FONOAUDIOLOGIA, NEUROLOGIA, etc.
    possuiEstagiario?: boolean;
    nomeEstagiario?: string;
    justificativaEstagiario?: "MEDIAÇÃO E APOIO NAS ATIVIDADES DA UE" | "SEM BARREIRAS";
    ave?: boolean;
    nomeAve?: string;
    justificativaAve?: string[]; // HIGIENE, LOCOMOÇÃO, ALIMENTAÇÃO, etc.
}

// Interface para dados da Prova São Paulo
export interface ProvaSaoPaulo {
    matricula?: string;
    edicao: string;
    mediaAluno: number;
    nivelProficiencia: string;
    anoEscolar: string;
    disciplina?: string; // Ex: Língua Portuguesa, Matemática
    dataImportacao: string; // Data de quando foi importado
}

export interface Estudante {
    estudanteId: string;
    turma: string;
    nome: string;
    status: string;
    turno: "MANHÃ" | "TARDE";
    bolsaFamilia: "SIM" | "NÃO";
    matricula?: string; // Matrícula do aluno
    contatos?: Contato[];
    email?: string;
    endereco?: Endereco;
    dataNascimento?: string;
    deficiencia?: Deficiencia;
    provaSaoPaulo?: ProvaSaoPaulo[]; // Array de dados da Prova São Paulo
}

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