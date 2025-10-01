"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '@/firebase.config';

const CURRENT_SCHOOL_YEAR = process.env.NEXT_PUBLIC_SCHOOL_YEAR || new Date().getFullYear().toString();

interface Contato {
    nome: string;
    telefone: string;
    parentesco?: string;
}

interface Student {
    estudanteId: string;
    nome: string;
    contatos?: Contato[];
}

export default function DebugContactsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const studentsRef = collection(db, CURRENT_SCHOOL_YEAR, 'escola', 'students');
                const q = query(studentsRef, limit(10));
                const snapshot = await getDocs(q);

                const data: Student[] = [];
                snapshot.forEach((doc) => {
                    const studentData = doc.data();
                    if (studentData.contatos && studentData.contatos.length > 0) {
                        data.push({
                            estudanteId: doc.id,
                            nome: studentData.nome,
                            contatos: studentData.contatos
                        });
                    }
                });

                setStudents(data);
            } catch (error) {
                console.error('Erro ao carregar:', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    if (loading) {
        return <div className="p-6">Carregando...</div>;
    }

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle>Debug - Contatos dos Estudantes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {students.map((student) => (
                            <div key={student.estudanteId} className="border p-4 rounded-lg">
                                <h3 className="font-semibold mb-2">{student.nome}</h3>
                                <div className="space-y-2">
                                    {student.contatos?.map((contato, idx) => (
                                        <div key={idx} className="bg-slate-50 p-2 rounded text-sm">
                                            <p><strong>Nome:</strong> {contato.nome}</p>
                                            <p><strong>Telefone:</strong> {contato.telefone}</p>
                                            <p><strong>Parentesco:</strong> {contato.parentesco || <span className="text-red-500">(vazio)</span>}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {students.length === 0 && (
                            <p className="text-center text-slate-500">Nenhum estudante com contatos encontrado</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
