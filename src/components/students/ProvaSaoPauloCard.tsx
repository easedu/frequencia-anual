"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, BookOpen, Trophy, Hash, TrendingUp, TrendingDown, Minus, BarChart3, Target, Star, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Student, ProvaSaoPaulo } from "@/types";

interface ProvaSaoPauloData {
    matricula?: string;
    edicao: string;
    mediaAluno: number;
    nivelProficiencia: string;
    anoEscolar: string;
    disciplina?: string;
    dataImportacao: string;
}

interface ProvaSaoPauloCardProps {
    student: Student;
}

const ModernProvaSaoPauloCard = memo(function ModernProvaSaoPauloCard({ student }: ProvaSaoPauloCardProps) {
    // Definir todos os anos que devem aparecer (ano atual -1 até 2022)
    const currentYear = new Date().getFullYear();
    const allYears = Array.from({ length: currentYear - 2022 }, (_, i) => (currentYear - 1 - i).toString());

    // Função para obter cor do badge baseado no nível
    const getBadgeColor = (nivel: string) => {
        switch (nivel) {
            case 'Avançado':
                return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-sm';
            case 'Adequado':
                return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-sm';
            case 'Básico':
                return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-sm';
            default:
                return 'bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 shadow-sm';
        }
    };

    // Função para calcular tendência entre duas avaliações
    const getTrend = (current: number, previous: number) => {
        if (current > previous) return { icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' };
        if (current < previous) return { icon: TrendingDown, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' };
        return { icon: Minus, color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30' };
    };

    // Agrupar dados por disciplina e ano
    const organizeData = () => {
        const disciplinas = ['Língua Portuguesa', 'Matemática'];
        const organizedData: Record<string, Record<string, ProvaSaoPauloData | null>> = {};

        disciplinas.forEach(disciplina => {
            organizedData[disciplina] = {};
            allYears.forEach(year => {
                const prova = student.provaSaoPaulo?.find((p: ProvaSaoPaulo) =>
                    p.edicao === year && (p.disciplina === disciplina || (!p.disciplina && disciplina === 'Língua Portuguesa'))
                );
                organizedData[disciplina][year] = prova || null;
            });
        });

        return organizedData;
    };

    const organizedData = organizeData();

    // Verificar se há dados
    const hasData = student.provaSaoPaulo && student.provaSaoPaulo.length > 0;

    if (!hasData) {
        return (
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200/50 dark:border-slate-600/50 rounded-2xl shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-t-2xl pb-4">
                    <CardTitle className="flex items-center gap-3 text-lg">
                        <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        Dados da Prova São Paulo
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center">
                            <BarChart3 className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                            Nenhum dado encontrado
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                            Este estudante ainda não possui dados da Prova São Paulo. Os dados podem ser importados através da funcionalidade &quot;Importar Prova São Paulo&quot;.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Calcular estatísticas gerais
    const allProvas = student.provaSaoPaulo || [];
    const mediaGeral = allProvas.length > 0 ?
        (allProvas.reduce((acc: number, p: ProvaSaoPaulo) => acc + p.mediaAluno, 0) / allProvas.length).toFixed(1) : '0';
    const melhorMedia = allProvas.length > 0 ?
        Math.max(...allProvas.map((p: ProvaSaoPaulo) => p.mediaAluno)).toFixed(1) : '0';

    return (
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200/50 dark:border-slate-600/50 rounded-2xl shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-t-2xl pb-4">
                <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-3">
                        <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        Dados da Prova São Paulo
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1 bg-white/60 dark:bg-slate-700/60 rounded-lg px-2 py-1">
                            <Target className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {mediaGeral}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 bg-white/60 dark:bg-slate-700/60 rounded-lg px-2 py-1">
                            <Star className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {melhorMedia}
                            </span>
                        </div>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
                {/* Layout Side-by-Side Compacto com Tabela */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.entries(organizedData).map(([disciplina, dadosAnos]) => (
                        <div key={disciplina} className="space-y-4">
                            {/* Header da Disciplina Compacto */}
                            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-lg border border-slate-200/50 dark:border-slate-600/50">
                                <div className={`p-2 rounded-lg ${disciplina === 'Língua Portuguesa' ? 'bg-purple-500' : 'bg-emerald-500'} shadow-sm`}>
                                    <BookOpen className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                        {disciplina === 'Língua Portuguesa' ? 'Língua Portuguesa' : disciplina}
                                    </h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                        {Object.values(dadosAnos).filter(Boolean).length}/{allYears.length} anos
                                    </p>
                                </div>
                            </div>

                            {/* Cabeçalho da Tabela */}
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2 border border-slate-200/50 dark:border-slate-600/50">
                                <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 text-center">
                                    <div>Ano</div>
                                    <div>Tendência</div>
                                    <div>Média</div>
                                    <div>Turma</div>
                                    <div>Nível</div>
                                </div>
                            </div>

                            {/* Dados da Tabela */}
                            <div className="space-y-2">
                                {allYears.map((year, index) => {
                                    const prova = dadosAnos[year];
                                    const previousProva = index < allYears.length - 1 ? dadosAnos[allYears[index + 1]] : null;
                                    const trend = prova && previousProva ? getTrend(prova.mediaAluno, previousProva.mediaAluno) : null;

                                    return (
                                        <div key={year} className={`relative rounded-lg border transition-all duration-200 ${prova
                                            ? 'bg-white/60 dark:bg-slate-700/60 border-slate-200/50 dark:border-slate-600/50 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500'
                                            : 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-200/30 dark:border-slate-600/30 border-dashed'
                                            }`}>

                                            {prova ? (
                                                /* Grid para dados existentes */
                                                <div className="grid grid-cols-5 gap-2 p-3 items-center">
                                                    {/* Ano */}
                                                    <div className="flex justify-center">
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-sm bg-gradient-to-br from-blue-500 to-indigo-500">
                                                            {year}
                                                        </div>
                                                    </div>

                                                    {/* Tendência */}
                                                    <div className="flex justify-center">
                                                        {trend ? (
                                                            <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${trend.bgColor}`}>
                                                                <trend.icon className={`w-3 h-3 ${trend.color}`} />
                                                            </div>
                                                        ) : (
                                                            <div className="w-6 h-6 flex items-center justify-center">
                                                                <span className="text-xs text-slate-400">-</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Média */}
                                                    <div className="flex justify-center items-center gap-1">
                                                        <Trophy className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                                            {prova.mediaAluno}
                                                        </span>
                                                    </div>

                                                    {/* Turma */}
                                                    <div className="flex justify-center items-center gap-1">
                                                        <Hash className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                                                            {prova.anoEscolar}
                                                        </span>
                                                    </div>

                                                    {/* Nível */}
                                                    <div className="flex justify-center">
                                                        <Badge className={`${getBadgeColor(prova.nivelProficiencia)} text-xs px-2 py-1`}>
                                                            {prova.nivelProficiencia}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Grid para anos sem dados */
                                                <div className="grid grid-cols-5 gap-2 p-3 items-center">
                                                    {/* Ano */}
                                                    <div className="flex justify-center">
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-sm bg-gradient-to-br from-slate-400 to-slate-500">
                                                            {year}
                                                        </div>
                                                    </div>

                                                    {/* Colunas vazias com indicação */}
                                                    <div className="flex justify-center">
                                                        <span className="text-xs text-slate-400">-</span>
                                                    </div>
                                                    <div className="flex justify-center">
                                                        <span className="text-xs text-slate-400">-</span>
                                                    </div>
                                                    <div className="flex justify-center">
                                                        <span className="text-xs text-slate-400">-</span>
                                                    </div>
                                                    <div className="flex justify-center">
                                                        <span className="text-xs text-slate-400">N/A</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Resumo da Disciplina Compacto */}
                            {Object.values(dadosAnos).filter(Boolean).length > 1 && (
                                <div className={`p-3 rounded-lg border ${disciplina === 'Língua Portuguesa' ? 'bg-purple-50/50 border-purple-200/50 dark:bg-purple-900/20 dark:border-purple-800/50' : 'bg-emerald-50/50 border-emerald-200/50 dark:bg-emerald-900/20 dark:border-emerald-800/50'}`}>
                                    <h4 className={`font-semibold mb-2 text-xs ${disciplina === 'Língua Portuguesa' ? 'text-purple-800 dark:text-purple-200' : 'text-emerald-800 dark:text-emerald-200'}`}>
                                        Evolução
                                    </h4>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        {(() => {
                                            const provasDisciplina = Object.values(dadosAnos).filter(Boolean) as ProvaSaoPauloData[];
                                            const mediaDisc = provasDisciplina.length > 0 ?
                                                (provasDisciplina.reduce((acc, p) => acc + p.mediaAluno, 0) / provasDisciplina.length).toFixed(1) : '0';
                                            const melhorDisc = provasDisciplina.length > 0 ?
                                                Math.max(...provasDisciplina.map(p => p.mediaAluno)).toFixed(1) : '0';
                                            const variacao = provasDisciplina.length >= 2 ?
                                                (provasDisciplina[0].mediaAluno - provasDisciplina[provasDisciplina.length - 1].mediaAluno).toFixed(1) : '0';

                                            return (
                                                <>
                                                    <div className="text-center">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Média</p>
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">
                                                            {mediaDisc}
                                                        </p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Melhor</p>
                                                        <p className={`font-bold ${disciplina === 'Língua Portuguesa' ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                            {melhorDisc}
                                                        </p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Variação</p>
                                                        <p className={`font-bold ${parseFloat(variacao) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                            {parseFloat(variacao) >= 0 ? '+' : ''}{variacao}
                                                        </p>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Resumo Geral Compacto */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg">
                    <h4 className="font-bold mb-3 flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                        <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        Resumo Geral
                    </h4>
                    <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                            <div className="w-8 h-8 mx-auto mb-1 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Disciplinas</p>
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                                {Object.keys(organizedData).filter(disc =>
                                    Object.values(organizedData[disc]).some(Boolean)
                                ).length}
                            </p>
                        </div>
                        <div>
                            <div className="w-8 h-8 mx-auto mb-1 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                                <BarChart3 className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Avaliações</p>
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                                {allProvas.length}
                            </p>
                        </div>
                        <div>
                            <div className="w-8 h-8 mx-auto mb-1 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                                <Target className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Média</p>
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                                {mediaGeral}
                            </p>
                        </div>
                        <div>
                            <div className="w-8 h-8 mx-auto mb-1 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Último</p>
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                                {allProvas.length > 0 ? Math.max(...allProvas.map((p: ProvaSaoPaulo) => parseInt(p.edicao))) : '--'}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

export default ModernProvaSaoPauloCard;