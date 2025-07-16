"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, BookOpen, Trophy, Hash, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Student } from "../app/types";

export default function ProvaSaoPauloCard({ student }: { student: Student }) {
    if (!student.provaSaoPaulo || student.provaSaoPaulo.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-blue-600" />
                        Dados da Prova São Paulo
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-8">
                    <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h4 className="text-lg font-medium mb-2">Nenhum dado encontrado</h4>
                    <p className="text-sm text-muted-foreground">
                        Este estudante ainda não possui dados da Prova São Paulo.<br />
                        Os dados podem ser importados através da funcionalidade &quot;Importar Prova São Paulo&quot;.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Ordenar por edição (mais recente primeiro)
    const sortedProvaSaoPaulo = [...student.provaSaoPaulo].sort((a, b) =>
        b.edicao.localeCompare(a.edicao)
    );

    // Função para obter cor do badge baseado no nível
    const getBadgeColor = (nivel: string) => {
        switch (nivel) {
            case 'Avançado':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'Adequado':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Básico':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default:
                return 'bg-red-100 text-red-800 border-red-200';
        }
    };

    // Função para calcular tendência entre duas avaliações
    const getTrend = (current: number, previous: number) => {
        if (current > previous) return { icon: TrendingUp, color: 'text-green-600', text: 'Melhora' };
        if (current < previous) return { icon: TrendingDown, color: 'text-red-600', text: 'Declínio' };
        return { icon: Minus, color: 'text-gray-600', text: 'Manteve' };
    };

    // Agrupar por disciplina
    const groupedByDiscipline = sortedProvaSaoPaulo.reduce((acc, prova) => {
        const disciplina = prova.disciplina || 'Língua Portuguesa';
        if (!acc[disciplina]) acc[disciplina] = [];
        acc[disciplina].push(prova);
        return acc;
    }, {} as Record<string, typeof sortedProvaSaoPaulo>);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-600" />
                    Dados da Prova São Paulo
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {Object.entries(groupedByDiscipline).map(([disciplina, provas]) => (
                        <div key={disciplina} className="space-y-3">
                            <div className="flex items-center gap-2 border-b pb-2">
                                <BookOpen className="h-4 w-4 text-blue-600" />
                                <h3 className="font-semibold text-sm">{disciplina}</h3>
                                <span className="text-xs text-muted-foreground">
                                    ({provas.length} avaliação{provas.length > 1 ? 'ões' : ''})
                                </span>
                            </div>

                            {/* Timeline de resultados */}
                            <div className="space-y-3">
                                {provas.map((prova, index) => {
                                    const previousProva = provas[index + 1];
                                    const trend = previousProva ? getTrend(prova.mediaAluno, previousProva.mediaAluno) : null;

                                    return (
                                        <div key={`${prova.edicao}-${index}`}
                                            className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50">

                                            {/* Informações principais */}
                                            <div className="flex items-center gap-4">
                                                <div className="text-center">
                                                    <div className="text-xs text-muted-foreground">Ano</div>
                                                    <div className="font-bold text-lg">{prova.edicao}</div>
                                                </div>

                                                <div className="h-8 w-px bg-gray-300" />

                                                <div className="flex items-center gap-2">
                                                    <Trophy className="h-4 w-4 text-amber-600" />
                                                    <div>
                                                        <div className="text-xs text-muted-foreground">Média</div>
                                                        <div className="font-semibold">{prova.mediaAluno}</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Hash className="h-4 w-4 text-purple-600" />
                                                    <div>
                                                        <div className="text-xs text-muted-foreground">Turma</div>
                                                        <div className="font-semibold">{prova.anoEscolar}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Badge de nível e tendência */}
                                            <div className="flex items-center gap-3">
                                                {trend && (
                                                    <div className="flex items-center gap-1">
                                                        <trend.icon className={`h-4 w-4 ${trend.color}`} />
                                                        <span className={`text-xs ${trend.color}`}>{trend.text}</span>
                                                    </div>
                                                )}

                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getBadgeColor(prova.nivelProficiencia)}`}>
                                                    {prova.nivelProficiencia}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Estatísticas da disciplina */}
                            {provas.length > 1 && (
                                <Card className="bg-blue-50/50 border-blue-200">
                                    <CardContent className="pt-4">
                                        <h4 className="font-medium mb-3 text-sm">Evolução em {disciplina}</h4>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div className="text-center">
                                                <p className="text-muted-foreground text-xs">Média Geral</p>
                                                <p className="font-bold text-lg">
                                                    {(provas.reduce((acc, p) => acc + p.mediaAluno, 0) / provas.length).toFixed(1)}
                                                </p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-muted-foreground text-xs">Melhor Resultado</p>
                                                <p className="font-bold text-lg text-green-600">
                                                    {Math.max(...provas.map(p => p.mediaAluno)).toFixed(1)}
                                                </p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-muted-foreground text-xs">Variação</p>
                                                <p className="font-bold text-lg">
                                                    {provas.length >= 2 ?
                                                        (provas[0].mediaAluno - provas[provas.length - 1].mediaAluno >= 0 ? '+' : '') +
                                                        (provas[0].mediaAluno - provas[provas.length - 1].mediaAluno).toFixed(1)
                                                        : '--'
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    ))}
                </div>

                {/* Resumo geral - apenas se houver múltiplas disciplinas */}
                {Object.keys(groupedByDiscipline).length > 1 && (
                    <Card className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                        <CardContent className="pt-4">
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                                <Award className="h-4 w-4" />
                                Resumo Geral
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="text-center">
                                    <p className="text-muted-foreground text-xs">Disciplinas</p>
                                    <p className="font-bold text-lg">{Object.keys(groupedByDiscipline).length}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-muted-foreground text-xs">Total Avaliações</p>
                                    <p className="font-bold text-lg">{sortedProvaSaoPaulo.length}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-muted-foreground text-xs">Média Global</p>
                                    <p className="font-bold text-lg">
                                        {(sortedProvaSaoPaulo.reduce((acc, p) => acc + p.mediaAluno, 0) / sortedProvaSaoPaulo.length).toFixed(1)}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-muted-foreground text-xs">Último Ano</p>
                                    <p className="font-bold text-lg">{sortedProvaSaoPaulo[0].edicao}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </CardContent>
        </Card>
    );
}