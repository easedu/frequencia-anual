"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase.config";
import { v4 as uuidv4 } from "uuid";

export interface Estudante {
    estudanteId: string;
    turma: string;
    nome: string;
    status: string;
    bolsaFamilia: "SIM" | "NÃO"; // Novo campo
}

export const useStudents = () => {
    const [students, setStudents] = useState<Estudante[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Função para buscar os estudantes do Firebase
    const fetchStudents = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, "2025", "lista_de_estudantes");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Garante que cada estudante possua um estudanteId; se não tiver, gera um novo UUID
                const fetchedStudents: Estudante[] = (data.estudantes || []).map((student: unknown) => {
                    const s = student as { estudanteId?: string; bolsaFamilia: string; turma: string; nome: string; status: string };
                    return {
                        bolsaFamilia: s.bolsaFamilia,
                        estudanteId: s.estudanteId || uuidv4(),
                        turma: s.turma,
                        nome: s.nome,
                        status: s.status,
                    };
                });
                setStudents(fetchedStudents);
            }
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    // Função para salvar os estudantes no Firebase
    const saveStudents = async (newStudents: Estudante[]) => {
        try {
            const docRef = doc(db, "2025", "lista_de_estudantes");
            await setDoc(docRef, { estudantes: newStudents });
            setStudents(newStudents);
        } catch (err) {
            setError(err as Error);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    return { students, loading, error, fetchStudents, saveStudents, setStudents };
};