"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase.config";
import { v4 as uuidv4 } from "uuid";

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
    nomeAve?: string; // Novo campo adicionado
    justificativaAve?: string[]; // HIGIENE, LOCOMOÇÃO, ALIMENTAÇÃO, etc.
}

export interface Estudante {
    estudanteId: string;
    turma: string;
    nome: string;
    status: string;
    turno: "MANHÃ" | "TARDE";
    bolsaFamilia: "SIM" | "NÃO";
    contatos?: Contato[];
    email?: string;
    endereco?: Endereco;
    dataNascimento?: string;
    deficiencia?: Deficiencia;
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
                console.log("Dados brutos do Firebase:", data);
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
                    };
                    const fetchedStudent = {
                        estudanteId: s.estudanteId || uuidv4(),
                        turma: s.turma || "",
                        nome: s.nome || "",
                        status: s.status || "",
                        turno: s.turno || determinarTurno(s.turma || ""),
                        bolsaFamilia: s.bolsaFamilia || "NÃO",
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
                                nomeAve: s.deficiencia.nomeAve || "", // Novo campo incluído
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
                                nomeAve: "", // Novo campo incluído
                                justificativaAve: [],
                            },
                    };
                    console.log("Estudante processado:", fetchedStudent);
                    return fetchedStudent;
                });
                setStudents(fetchedStudents);
                console.log("Lista final de estudantes:", fetchedStudents);
            } else {
                console.log("Documento não existe no Firebase, inicializando vazio.");
                setStudents([]);
            }
        } catch (err) {
            console.error("Erro ao buscar estudantes:", err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    // Função para salvar os estudantes no Firebase
    const saveStudents = async (newStudents: Estudante[]) => {
        try {
            const cleanedStudents = newStudents.map((student) => removeUndefined(student));
            console.log("Dados limpos a serem salvos no Firebase:", cleanedStudents);
            const docRef = doc(db, "2025", "lista_de_estudantes");
            await setDoc(docRef, { estudantes: cleanedStudents }, { merge: false });
            setStudents(newStudents);
            console.log("Dados salvos com sucesso no Firebase.");
        } catch (err) {
            console.error("Erro ao salvar no Firebase:", err);
            setError(err as Error);
            throw err;
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    return { students, loading, error, fetchStudents, saveStudents, setStudents };
};