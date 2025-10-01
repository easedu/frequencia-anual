"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
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
    [key: string]: any;
}

interface MigrationResult {
    success: boolean;
    message: string;
    stats?: {
        totalProcessed: number;
        totalWithContacts: number;
        totalUpdated: number;
        unchanged: number;
    };
    changes?: Array<{
        estudanteId: string;
        nome: string;
        original: any[];
        normalizado: any[];
    }>;
    error?: string;
}

/**
 * Converte string para Title Case (primeira letra de cada palavra maiúscula)
 */
function toTitleCase(str: string): string {
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Extrai o parentesco de dentro de parênteses
 */
function extractParentesco(nomeCompleto: string): { nome: string; parentesco: string } {
    const regex = /^(.+?)\s*\(\s*(.+?)\s*\)$/;
    const match = nomeCompleto.match(regex);

    if (match) {
        const nome = match[1].trim();
        const parentesco = match[2].trim();

        return {
            nome: toTitleCase(nome),
            parentesco: toTitleCase(parentesco)
        };
    }

    return {
        nome: toTitleCase(nomeCompleto.trim()),
        parentesco: ''
    };
}

/**
 * Normaliza os contatos de um estudante
 */
function normalizeContatos(contatos: Contato[]): Contato[] {
    if (!contatos || !Array.isArray(contatos)) {
        return [];
    }

    return contatos.map(contato => {
        const { nome, parentesco } = extractParentesco(contato.nome);

        return {
            nome,
            telefone: contato.telefone,
            parentesco: contato.parentesco || parentesco || ''
        };
    });
}

export default function MigrateContactsPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<MigrationResult | null>(null);

    const handleMigrate = async () => {
        setLoading(true);
        setResult(null);

        try {
            console.log('🚀 Iniciando normalização de contatos...');

            // 1. Buscar todos os estudantes
            const studentsRef = collection(db, CURRENT_SCHOOL_YEAR, 'escola', 'students');
            const snapshot = await getDocs(studentsRef);

            if (snapshot.empty) {
                setResult({
                    success: false,
                    message: 'Nenhum estudante encontrado no banco de dados.'
                });
                return;
            }

            const students: Student[] = [];
            snapshot.forEach((docSnap) => {
                students.push({ ...docSnap.data(), estudanteId: docSnap.id } as Student);
            });

            console.log(`✅ Encontrados ${students.length} estudantes`);

            // 2. Processar cada estudante
            let totalProcessed = 0;
            let totalUpdated = 0;
            let totalWithContacts = 0;
            const detailedLog: any[] = [];

            for (const student of students) {
                totalProcessed++;

                if (!student.contatos || student.contatos.length === 0) {
                    continue;
                }

                totalWithContacts++;
                const originalContatos = JSON.parse(JSON.stringify(student.contatos));
                const normalizedContatos = normalizeContatos(student.contatos);

                // Verificar se houve mudanças
                const hasChanges = JSON.stringify(originalContatos) !== JSON.stringify(normalizedContatos);

                if (hasChanges) {
                    totalUpdated++;

                    // Log das mudanças
                    const changes = {
                        estudanteId: student.estudanteId,
                        nome: student.nome,
                        original: originalContatos,
                        normalizado: normalizedContatos
                    };
                    detailedLog.push(changes);

                    console.log(`📝 Atualizando: ${student.nome}`);

                    // Atualizar no banco de dados
                    const studentRef = doc(db, CURRENT_SCHOOL_YEAR, 'escola', 'students', student.estudanteId);
                    await updateDoc(studentRef, {
                        contatos: normalizedContatos
                    });
                }
            }

            // 3. Relatório
            setResult({
                success: true,
                message: 'Migração concluída com sucesso!',
                stats: {
                    totalProcessed,
                    totalWithContacts,
                    totalUpdated,
                    unchanged: totalWithContacts - totalUpdated
                },
                changes: detailedLog
            });

            console.log('✅ Migração concluída');

        } catch (error: any) {
            console.error('❌ Erro durante a migração:', error);
            setResult({
                success: false,
                message: 'Erro ao executar migração',
                error: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle>Normalizar Contatos dos Estudantes</CardTitle>
                    <CardDescription>
                        Este processo irá:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Extrair o parentesco que está entre parênteses no campo "Nome do Contato"</li>
                            <li>Limpar o nome removendo a parte do parentesco</li>
                            <li>Padronizar o nome para Title Case (primeira letra maiúscula)</li>
                            <li>Padronizar o parentesco e preencher o campo correto</li>
                        </ul>
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <Button
                        onClick={handleMigrate}
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            'Executar Migração'
                        )}
                    </Button>

                    {result && (
                        <Alert variant={result.success ? "default" : "destructive"}>
                            {result.success ? (
                                <CheckCircle2 className="h-4 w-4" />
                            ) : (
                                <XCircle className="h-4 w-4" />
                            )}
                            <AlertTitle>{result.success ? 'Sucesso!' : 'Erro'}</AlertTitle>
                            <AlertDescription>
                                {result.message}
                                {result.stats && (
                                    <div className="mt-4 space-y-1">
                                        <p><strong>Total processados:</strong> {result.stats.totalProcessed}</p>
                                        <p><strong>Com contatos:</strong> {result.stats.totalWithContacts}</p>
                                        <p><strong>Atualizados:</strong> {result.stats.totalUpdated}</p>
                                        <p><strong>Sem mudanças:</strong> {result.stats.unchanged}</p>
                                    </div>
                                )}
                                {result.error && (
                                    <p className="mt-2 text-red-600">{result.error}</p>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    {result?.changes && result.changes.length > 0 && (
                        <div className="mt-4">
                            <h3 className="font-semibold mb-2">Detalhes das Mudanças:</h3>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {result.changes.map((change, idx) => (
                                    <Card key={idx} className="p-4">
                                        <h4 className="font-medium mb-2">{change.nome}</h4>
                                        {change.original.map((orig: any, i: number) => {
                                            const norm = change.normalizado[i];
                                            return (
                                                <div key={i} className="mb-2 text-sm">
                                                    <p className="text-gray-600">Contato {i + 1}:</p>
                                                    <p className="ml-4">
                                                        <span className="text-red-600">Antes:</span> Nome="{orig.nome}", Parentesco="{orig.parentesco || '(vazio)'}"
                                                    </p>
                                                    <p className="ml-4">
                                                        <span className="text-green-600">Depois:</span> Nome="{norm.nome}", Parentesco="{norm.parentesco || '(vazio)'}"
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
