"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Select as ShadcnSelect,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Toaster, toast } from "sonner";
import { FileSpreadsheet, Upload, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { db } from "@/firebase.config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { logger } from "@/utils/logger";
import Papa from "papaparse";

// Interfaces
interface CsvProvaSaoPaulo {
    nome: string;
    matricula?: string;
    edicao: string;
    media: string | number;
    nivelProficiencia: string;
    anoEscolar: string;
    disciplina?: string;
}

interface ProcessamentoCsv {
    totalLinhas: number;
    alunosEncontrados: number;
    alunosNaoEncontrados: number;
    alunosAtualizados: number;
    erros: string[];
    detalhes: {
        encontrados: { nome: string; estudanteId: string }[];
        naoEncontrados: string[];
        duplicatas: string[];
    };
}

interface Estudante {
    estudanteId: string;
    nome: string;
    turma: string;
    matricula?: string;
    provaSaoPaulo?: Array<{
        matricula?: string;
        edicao: string;
        mediaAluno: number;
        nivelProficiencia: string;
        anoEscolar: string;
        disciplina?: string;
        dataImportacao: string;
    }>;
    [key: string]: unknown;
}

export default function ProvaSaoPauloPage() {
    const [file, setFile] = useState<File | null>(null);
    const [disciplina, setDisciplina] = useState<string>("Língua Portuguesa");
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [resultado, setResultado] = useState<ProcessamentoCsv | null>(null);
    const [csvData, setCsvData] = useState<CsvProvaSaoPaulo[]>([]);
    const [previewData, setPreviewData] = useState<CsvProvaSaoPaulo[]>([]);

    // Função para normalizar nomes (remove acentos, converte para maiúsculas)
    const normalizeName = (name: string): string => {
        return name
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    };

    // Função para encontrar estudante por nome
    const findStudentByName = useCallback((searchName: string, students: Estudante[]): Estudante | null => {
        const normalizedSearch = normalizeName(searchName);

        // Busca exata primeiro
        let found = students.find(student =>
            normalizeName(student.nome) === normalizedSearch
        );

        if (found) return found;

        // Busca por similaridade (nome contém ou é contido)
        found = students.find(student => {
            const normalizedStudentName = normalizeName(student.nome);
            return normalizedStudentName.includes(normalizedSearch) ||
                normalizedSearch.includes(normalizedStudentName);
        });

        return found || null;
    }, []);

    // Função para processar o arquivo CSV
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile && selectedFile.type === "text/csv") {
            setFile(selectedFile);
            parseCSVFile(selectedFile);
        } else {
            toast.error("Por favor, selecione um arquivo CSV válido");
        }
    };

    // Função para fazer o parse do CSV
    const parseCSVFile = (csvFile: File) => {
        Papa.parse(csvFile, {
            header: false, // Não usar header automático para controlar melhor
            skipEmptyLines: true,
            encoding: "UTF-8",
            delimiter: ";", // Usar ponto e vírgula como separador
            complete: (results) => {
                let rows = results.data as string[][];

                // Remover linhas vazias e encontrar o cabeçalho real
                rows = rows.filter(row => row.some(cell => cell && cell.trim()));

                // Pular a primeira linha se for "Microdados"
                let headerRowIndex = 0;
                if (rows.length > 0 && rows[0][0] && rows[0][0].trim() === "Microdados") {
                    headerRowIndex = 1;
                }

                if (rows.length <= headerRowIndex) {
                    toast.error("Arquivo CSV não possui dados válidos");
                    return;
                }

                // Obter cabeçalhos da linha correta
                const headers = rows[headerRowIndex].map(header => header.trim());

                // Verificar se temos os cabeçalhos esperados
                const requiredHeaders = ["NomeDoAluno", "Edicao", "MediaDoAluno", "NivelProficienciaDoAluno", "CodigoDaTurmaDoAluno"];
                const missingHeaders = requiredHeaders.filter(header =>
                    !headers.some(h => h.includes(header))
                );

                if (missingHeaders.length > 0) {
                    toast.error(`Cabeçalhos obrigatórios não encontrados: ${missingHeaders.join(', ')}`);
                    return;
                }

                // Processar dados a partir da linha seguinte ao cabeçalho
                const dataRows = rows.slice(headerRowIndex + 1);

                // Mapear os dados para nossa estrutura
                const data: CsvProvaSaoPaulo[] = dataRows
                    .filter(row => row.length > 1 && row.some(cell => cell && cell.trim())) // Filtrar linhas vazias
                    .map((row) => {
                        const rowData: Record<string, string> = {};
                        headers.forEach((header, i) => {
                            rowData[header] = row[i] ? row[i].trim() : "";
                        });

                        return {
                            nome: rowData["NomeDoAluno"] || "",
                            matricula: rowData["MatriculaDoAluno"] || "",
                            edicao: rowData["Edicao"] || "",
                            media: rowData["MediaDoAluno"] || "",
                            nivelProficiencia: rowData["NivelProficienciaDoAluno"] || "",
                            anoEscolar: rowData["CodigoDaTurmaDoAluno"] || "", // Mudança aqui
                            disciplina: "Língua Portuguesa" // Assumindo LP como padrão
                        };
                    })
                    .filter(row => row.nome && row.nome.trim()); // Garantir que tem nome

                // Validar se temos dados válidos
                if (data.length === 0) {
                    toast.error("Nenhum dado válido encontrado no arquivo CSV");
                    return;
                }

                setCsvData(data);
                setPreviewData(data.slice(0, 5));
                toast.success(`${data.length} registros carregados do CSV`);
            },
            error: (error) => {
                toast.error(`Erro ao processar arquivo CSV: ${error.message}`);
            }
        });
    };

    // Função principal para processar e salvar os dados
    const processarDados = useCallback(async () => {
        if (csvData.length === 0) {
            toast.error("Nenhum dado para processar");
            return;
        }

        setIsProcessing(true);
        setProgress(0);

        try {
            // Buscar lista de estudantes
            const studentDoc = await getDoc(doc(db, "2025", "lista_de_estudantes"));
            if (!studentDoc.exists()) {
                throw new Error("Lista de estudantes não encontrada");
            }

            const studentData = studentDoc.data() as { estudantes: Estudante[] };
            const estudantes = studentData.estudantes;

            const resultado: ProcessamentoCsv = {
                totalLinhas: csvData.length,
                alunosEncontrados: 0,
                alunosNaoEncontrados: 0,
                alunosAtualizados: 0,
                erros: [],
                detalhes: {
                    encontrados: [],
                    naoEncontrados: [],
                    duplicatas: []
                }
            };

            const estudantesAtualizados = [...estudantes];
            const dataImportacao = new Date().toLocaleDateString("pt-BR");

            // Processar cada linha do CSV
            for (let i = 0; i < csvData.length; i++) {
                const row = csvData[i];
                setProgress((i / csvData.length) * 100);

                try {
                    // Validar dados obrigatórios
                    if (!row.nome || !row.edicao || !row.media || !row.nivelProficiencia || !row.anoEscolar) {
                        resultado.erros.push(`Linha ${i + 1}: Dados obrigatórios faltando`);
                        continue;
                    }

                    // Converter média (formato brasileiro com vírgula para ponto)
                    let mediaConvertida = 0;
                    if (typeof row.media === 'string') {
                        mediaConvertida = parseFloat(row.media.replace(',', '.'));
                    } else {
                        mediaConvertida = Number(row.media);
                    }

                    if (isNaN(mediaConvertida)) {
                        resultado.erros.push(`Linha ${i + 1}: Média inválida (${row.media})`);
                        continue;
                    }

                    // Encontrar estudante
                    const estudante = findStudentByName(row.nome, estudantesAtualizados);

                    if (!estudante) {
                        resultado.alunosNaoEncontrados++;
                        resultado.detalhes.naoEncontrados.push(row.nome);
                        continue;
                    }

                    // Verificar se já existe dados da mesma edição/disciplina
                    const jaExiste = estudante.provaSaoPaulo?.some(prova =>
                        prova.edicao === row.edicao &&
                        prova.disciplina === disciplina
                    );

                    if (jaExiste) {
                        resultado.detalhes.duplicatas.push(`${estudante.nome} - ${row.edicao} - ${disciplina}`);
                    }

                    // Adicionar ou atualizar matrícula se fornecida
                    if (row.matricula && !estudante.matricula) {
                        estudante.matricula = row.matricula;
                    }

                    // Inicializar array de prova se não existir
                    if (!estudante.provaSaoPaulo) {
                        estudante.provaSaoPaulo = [];
                    }

                    // IMPORTANTE: Não remover dados existentes, apenas substituir da mesma edição/disciplina
                    estudante.provaSaoPaulo = estudante.provaSaoPaulo.filter(prova =>
                        !(prova.edicao === row.edicao && prova.disciplina === disciplina)
                    );

                    // Adicionar novos dados (preservando outros dados existentes)
                    estudante.provaSaoPaulo.push({
                        matricula: row.matricula,
                        edicao: row.edicao,
                        mediaAluno: Math.round(mediaConvertida * 10) / 10,
                        nivelProficiencia: row.nivelProficiencia,
                        anoEscolar: row.anoEscolar.toString(),
                        disciplina: disciplina,
                        dataImportacao
                    });

                    resultado.alunosEncontrados++;
                    resultado.detalhes.encontrados.push({
                        nome: estudante.nome,
                        estudanteId: estudante.estudanteId
                    });

                } catch (error) {
                    resultado.erros.push(`Linha ${i + 1}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
                }
            }

            // Contar quantos foram efetivamente atualizados
            resultado.alunosAtualizados = resultado.alunosEncontrados;

            // Salvar dados atualizados no Firebase
            await setDoc(doc(db, "2025", "lista_de_estudantes"), {
                estudantes: estudantesAtualizados
            });

            setProgress(100);
            setResultado(resultado);

            toast.success(`Processamento concluído! ${resultado.alunosAtualizados} alunos atualizados.`);

        } catch (error) {
            logger.error("Erro durante processamento", error as Error);
            toast.error(`Erro durante processamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        } finally {
            setIsProcessing(false);
        }
    }, [csvData, disciplina, findStudentByName]);

    return (
        <div className="min-h-screen p-4">
            <Toaster />
            <div className="container mx-auto max-w-6xl space-y-6">

                {/* Header */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-6 w-6" />
                            Importar Dados da Prova São Paulo
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Faça upload de um arquivo CSV com os resultados da Prova São Paulo para associar os dados aos estudantes cadastrados.
                        </p>
                    </CardContent>
                </Card>

                {/* File Upload */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Upload className="h-5 w-5" />
                            Upload do Arquivo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="disciplina">Disciplina</Label>
                                <ShadcnSelect
                                    value={disciplina}
                                    onValueChange={setDisciplina}
                                    disabled={isProcessing}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione a disciplina" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Língua Portuguesa">Língua Portuguesa</SelectItem>
                                        <SelectItem value="Matemática">Matemática</SelectItem>
                                        <SelectItem value="Ciências da Natureza">Ciências da Natureza</SelectItem>
                                        <SelectItem value="Ciências Humanas">Ciências Humanas</SelectItem>
                                        <SelectItem value="Redação">Redação</SelectItem>
                                    </SelectContent>
                                </ShadcnSelect>
                            </div>

                            <div>
                                <Label htmlFor="csv-file">Arquivo CSV da Prova São Paulo</Label>
                                <Input
                                    id="csv-file"
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    disabled={isProcessing}
                                />
                            </div>
                        </div>

                        {file && (
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Disciplina:</strong> {disciplina} | <strong>Arquivo:</strong> {file.name} ({(file.size / 1024).toFixed(2)} KB)
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {/* Preview dos dados */}
                {previewData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Preview dos Dados (5 primeiras linhas)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-gray-300">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            {Object.keys(previewData[0]).map((header) => (
                                                <th key={header} className="border border-gray-300 p-2 text-left">
                                                    {header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.map((row, index) => (
                                            <tr key={index}>
                                                {Object.values(row).map((value, cellIndex) => (
                                                    <td key={cellIndex} className="border border-gray-300 p-2">
                                                        {String(value)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 flex gap-4">
                                <Button
                                    onClick={processarDados}
                                    disabled={isProcessing || csvData.length === 0}
                                    className="w-full md:w-auto"
                                >
                                    {isProcessing ? "Processando..." : "Processar e Salvar Dados"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Progress Bar */}
                {isProcessing && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Processando dados...</span>
                                    <span>{Math.round(progress)}%</span>
                                </div>
                                <Progress value={progress} className="w-full" />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Resultado do processamento */}
                {resultado && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                Resultado do Processamento
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">{resultado.totalLinhas}</div>
                                    <div className="text-sm text-blue-800">Total de linhas</div>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">{resultado.alunosEncontrados}</div>
                                    <div className="text-sm text-green-800">Alunos encontrados</div>
                                </div>
                                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                    <div className="text-2xl font-bold text-yellow-600">{resultado.alunosNaoEncontrados}</div>
                                    <div className="text-sm text-yellow-800">Não encontrados</div>
                                </div>
                                <div className="text-center p-4 bg-purple-50 rounded-lg">
                                    <div className="text-2xl font-bold text-purple-600">{resultado.alunosAtualizados}</div>
                                    <div className="text-sm text-purple-800">Atualizados</div>
                                </div>
                            </div>

                            {resultado.detalhes.naoEncontrados.length > 0 && (
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>Alunos não encontrados:</strong>
                                        <div className="mt-2 max-h-32 overflow-y-auto">
                                            {resultado.detalhes.duplicatas.map((item, index) => (
                                                <div key={index} className="text-sm">• {item}</div>
                                            ))}
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {resultado.erros.length > 0 && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>Erros encontrados:</strong>
                                        <div className="mt-2 max-h-32 overflow-y-auto">
                                            {resultado.erros.map((erro, index) => (
                                                <div key={index} className="text-sm">• {erro}</div>
                                            ))}
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}