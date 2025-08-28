"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase.config";
import { v4 as uuidv4 } from "uuid";
import { logger } from "@/utils/logger";
import { Estudante, Contato, Endereco, Deficiencia, ProvaSaoPaulo } from "@/types";

// Função para determinar o turno com base na turma
const determinarTurno = (turma: string): "MANHÃ" | "TARDE" => {
    const primeiroCaractere = turma.trim().charAt(0).toUpperCase();
    return ["1", "2", "3", "4"].includes(primeiroCaractere) ? "TARDE" : "MANHÃ";
};

export const useStudents = () => {
    const [students, setStudents] = useState<Estudante[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Função para remover campos undefined recursivamente
    const removeUndefined = (obj: unknown): unknown => {
        if (Array.isArray(obj)) {
            return obj.map(removeUndefined);
        }
        if (obj && typeof obj === "object") {
            return Object.fromEntries(
                Object.entries(obj)
                    .filter(([, value]) => value !== undefined)
                    .map(([key, value]) => [key, removeUndefined(value)])
            );
        }
        return obj;
    };

    // Função para buscar os estudantes do Firebase
    const fetchStudents = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, "2025", "lista_de_estudantes");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const fetchedStudents: Estudante[] = (data.estudantes || []).map((student: unknown) => {
                    const s = student as {
                        estudanteId?: string;
                        bolsaFamilia: string;
                        turma: string;
                        nome: string;
                        status: string;
                        turno?: string;
                        contatos?: Contato[];
                        email?: string;
                        endereco?: Endereco;
                        dataNascimento?: string;
                        deficiencia?: Deficiencia;
                        matricula?: string;
                        provaSaoPaulo?: ProvaSaoPaulo[];
                    };
                    const fetchedStudent = {
                        estudanteId: s.estudanteId || uuidv4(),
                        turma: s.turma || "",
                        nome: s.nome || "",
                        status: s.status || "",
                        turno: s.turno || determinarTurno(s.turma || ""),
                        bolsaFamilia: s.bolsaFamilia || "NÃO",
                        matricula: s.matricula || "",
                        contatos: s.contatos
                            ? s.contatos.map((contato) => ({
                                nome: contato.nome || "",
                                telefone: contato.telefone || "",
                            }))
                            : [],
                        email: s.email || "",
                        endereco: s.endereco
                            ? {
                                rua: s.endereco.rua || "",
                                numero: s.endereco.numero || "",
                                bairro: s.endereco.bairro || "",
                                cidade: s.endereco.cidade || "",
                                estado: s.endereco.estado || "",
                                cep: s.endereco.cep || "",
                                complemento: s.endereco.complemento || "",
                            }
                            : undefined,
                        dataNascimento: s.dataNascimento || "",
                        deficiencia: s.deficiencia
                            ? {
                                estudanteComDeficiencia: s.deficiencia.estudanteComDeficiencia || false,
                                tipoDeficiencia: s.deficiencia.tipoDeficiencia || [],
                                possuiBarreiras: s.deficiencia.possuiBarreiras ?? true,
                                aee: s.deficiencia.aee || undefined,
                                instituicao: s.deficiencia.instituicao || undefined,
                                horarioAtendimento: s.deficiencia.horarioAtendimento || "NENHUM",
                                atendimentoSaude: s.deficiencia.atendimentoSaude || [],
                                possuiEstagiario: s.deficiencia.possuiEstagiario || false,
                                nomeEstagiario: s.deficiencia.nomeEstagiario || "NÃO NECESSITA",
                                justificativaEstagiario: s.deficiencia.justificativaEstagiario || "SEM BARREIRAS",
                                ave: s.deficiencia.ave || false,
                                nomeAve: s.deficiencia.nomeAve || "",
                                justificativaAve: s.deficiencia.justificativaAve || [],
                            }
                            : {
                                estudanteComDeficiencia: false,
                                tipoDeficiencia: [],
                                possuiBarreiras: true,
                                aee: undefined,
                                instituicao: undefined,
                                horarioAtendimento: "NENHUM",
                                atendimentoSaude: [],
                                possuiEstagiario: false,
                                nomeEstagiario: "NÃO NECESSITA",
                                justificativaEstagiario: "SEM BARREIRAS",
                                ave: false,
                                nomeAve: "",
                                justificativaAve: [],
                            },
                        provaSaoPaulo: s.provaSaoPaulo
                            ? s.provaSaoPaulo.map((prova) => ({
                                matricula: prova.matricula || "",
                                edicao: prova.edicao || "",
                                mediaAluno: prova.mediaAluno || 0,
                                nivelProficiencia: prova.nivelProficiencia || "",
                                anoEscolar: prova.anoEscolar || "",
                                disciplina: prova.disciplina || "",
                                dataImportacao: prova.dataImportacao || "",
                            }))
                            : [],
                    };
                    return fetchedStudent;
                });
                setStudents(fetchedStudents);
            } else {
                setStudents([]);
            }
        } catch (err) {
            logger.error("Erro ao buscar estudantes", err as Error);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    // Função para salvar os estudantes no Firebase
    const saveStudents = async (newStudents: Estudante[]) => {
        try {
            const cleanedStudents = newStudents.map((student) => removeUndefined(student));
            const docRef = doc(db, "2025", "lista_de_estudantes");
            await setDoc(docRef, { estudantes: cleanedStudents }, { merge: false });
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