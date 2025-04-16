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

export interface Estudante {
    estudanteId: string;
    turma: string;
    nome: string;
    status: string;
    bolsaFamilia: "SIM" | "NÃO";
    contatos?: Contato[];
    email?: string;
    endereco?: Endereco;
}

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
                console.log("Dados brutos do Firebase:", data); // Debug: log dos dados brutos
                // Garante que cada estudante possua todos os campos necessários
                const fetchedStudents: Estudante[] = (data.estudantes || []).map((student: unknown) => {
                    const s = student as {
                        estudanteId?: string;
                        bolsaFamilia: string;
                        turma: string;
                        nome: string;
                        status: string;
                        contatos?: Contato[];
                        email?: string;
                        endereco?: Endereco;
                    };
                    const fetchedStudent = {
                        estudanteId: s.estudanteId || uuidv4(),
                        turma: s.turma || "",
                        nome: s.nome || "",
                        status: s.status || "",
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
                    };
                    console.log("Estudante processado:", fetchedStudent); // Debug: log de cada estudante
                    return fetchedStudent;
                });
                setStudents(fetchedStudents);
                console.log("Lista final de estudantes:", fetchedStudents); // Debug: log da lista final
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
            // Limpa os dados removendo campos undefined
            const cleanedStudents = newStudents.map((student) => removeUndefined(student));
            console.log("Dados limpos a serem salvos no Firebase:", cleanedStudents); // Debug
            const docRef = doc(db, "2025", "lista_de_estudantes");
            await setDoc(docRef, { estudantes: cleanedStudents }, { merge: false });
            setStudents(newStudents);
            console.log("Dados salvos com sucesso no Firebase.");
        } catch (err) {
            console.error("Erro ao salvar no Firebase:", err);
            setError(err as Error);
            throw err; // Propaga o erro para o chamador
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    return { students, loading, error, fetchStudents, saveStudents, setStudents };
};