import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertDataTable, EnhancedStudentRecord } from "@/components/CustomAlertDataTable";
import { Estudante } from "@/hooks/useStudents";
import { AlertTriangle, Heart, Users, TrendingUp, TrendingDown, Target, Shield, Trophy, Star, Medal, Crown, Sparkles, X, Filter, Globe, GraduationCap, ChevronUp, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface StudentRecord {
    estudanteId: string;
    turma: string;
    nome: string;
    faltasB1: number;
    faltasB2: number;
    faltasB3: number;
    faltasB4: number;
    totalFaltas: number;
    percentualFaltas: number;
    percentualFrequencia: number;
}

interface AlertsCardProps {
    data: StudentRecord[];
    students?: Estudante[];
}

interface SeriesData {
    serie: string;
    students: StudentRecord[];
    turmas: string[];
    totalStudents: number;
    excellentCount: number;
    criticalCount: number;
    nearLimitCount: number;
    averageFrequency: number;
}

type ViewMode = 'global' | 'grouped';
type SortField = 'serie' | 'totalStudents' | 'excellentCount' | 'criticalCount' | 'nearLimitCount' | 'averageFrequency';
type SortDirection = 'asc' | 'desc';

// Função para extrair série da turma (ex: "4A" -> "4", "2B" -> "2")
const extractSeries = (turma: string): string => {
    const match = turma.match(/^(\d+)/);
    return match ? match[1] : turma;
};

// Função para agrupar turmas por série
const groupBySeries = (data: StudentRecord[]): SeriesData[] => {
    const grouped = data.reduce((acc, student) => {
        const serie = extractSeries(student.turma);
        if (!acc[serie]) {
            acc[serie] = [];
        }
        acc[serie].push(student);
        return acc;
    }, {} as Record<string, StudentRecord[]>);

    return Object.entries(grouped).map(([serie, students]) => ({
        serie,
        students,
        turmas: [...new Set(students.map(s => s.turma))].sort(),
        totalStudents: students.length,
        excellentCount: students.filter(s => s.percentualFrequencia >= 95).length,
        criticalCount: students.filter(s => s.percentualFaltas >= 25).length,
        nearLimitCount: students.filter(s => s.percentualFaltas >= 20 && s.percentualFaltas < 25).length,
        averageFrequency: students.reduce((sum, s) => sum + s.percentualFrequencia, 0) / students.length
    })).sort((a, b) => parseInt(a.serie) - parseInt(b.serie));
};

// Função para agrupar estudantes por posição (considerando empates)
const groupStudentsByPosition = (students: StudentRecord[]) => {
    if (students.length === 0) return [];

    // Ordenar por frequência (maior primeiro)
    const sorted = [...students].sort((a, b) => b.percentualFrequencia - a.percentualFrequencia);

    const grouped: Array<{
        position: number;
        students: StudentRecord[];
        frequency: number;
    }> = [];

    let currentPosition = 1;
    let currentFrequency = sorted[0].percentualFrequencia;
    let currentGroup: StudentRecord[] = [];

    for (let i = 0; i < sorted.length; i++) {
        const student = sorted[i];

        if (student.percentualFrequencia === currentFrequency) {
            // Mesmo percentual, adicionar ao grupo atual
            currentGroup.push(student);
        } else {
            // Percentual diferente, finalizar grupo atual e iniciar novo
            if (currentGroup.length > 0) {
                grouped.push({
                    position: currentPosition,
                    students: [...currentGroup],
                    frequency: currentFrequency
                });
                // Próxima posição é sequencial (não pula baseado na quantidade de empatados)
                currentPosition++;
            }

            currentFrequency = student.percentualFrequencia;
            currentGroup = [student];
        }
    }

    // Adicionar último grupo
    if (currentGroup.length > 0) {
        grouped.push({
            position: currentPosition,
            students: [...currentGroup],
            frequency: currentFrequency
        });
    }

    return grouped;
};

// Função auxiliar para cores dos ícones
const getIconBgColor = (color: string): string => {
    const colorMap: Record<string, string> = {
        "text-blue-600 border-blue-200": "bg-blue-100 text-blue-600",
        "text-red-600 border-red-200": "bg-red-100 text-red-600",
        "text-orange-600 border-orange-200": "bg-orange-100 text-orange-600",
        "text-purple-600 border-purple-200": "bg-purple-100 text-purple-600",
        "text-green-600 border-green-200": "bg-green-100 text-green-600"
    };
    return colorMap[color] || "bg-blue-100 text-blue-600";
};

// Função para ordenar dados
const sortSeriesData = (dataToSort: SeriesData[], field: SortField, direction: SortDirection): SeriesData[] => {
    return [...dataToSort].sort((a, b) => {
        let aValue: number | string = a[field];
        let bValue: number | string = b[field];

        // Para série, converter para número
        if (field === 'serie') {
            aValue = parseInt(String(aValue));
            bValue = parseInt(String(bValue));
        }

        // Garantir que temos valores numéricos para comparação
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            return direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // Para strings
        if (direction === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });
};

// Componente para o modal de premiação
const ExcellentStudentsModal = ({
    isOpen,
    onClose,
    excellentStudents,
    viewMode,
    selectedSerie
}: {
    isOpen: boolean;
    onClose: () => void;
    excellentStudents: StudentRecord[];
    viewMode: ViewMode;
    selectedSerie?: string;
}) => {
    if (!isOpen) return null;

    // Filtrar estudantes se estiver em modo agrupado
    const filteredStudents = viewMode === 'grouped' && selectedSerie
        ? excellentStudents.filter(s => extractSeries(s.turma) === selectedSerie)
        : excellentStudents;

    // Agrupar estudantes por posição considerando empates
    const groupedPositions = groupStudentsByPosition(filteredStudents);

    const getPositionIcon = (position: number, isGroup: boolean = false) => {
        if (isGroup && position <= 3) {
            switch (position) {
                case 1: return <Crown className="h-6 w-6 text-yellow-500" />;
                case 2: return <Medal className="h-6 w-6 text-gray-400" />;
                case 3: return <Trophy className="h-6 w-6 text-amber-600" />;
                default: return <Star className="h-5 w-5 text-blue-500" />;
            }
        }
        return <Star className="h-5 w-5 text-blue-500" />;
    };

    const getGradientClass = (position: number) => {
        switch (position) {
            case 1: return "from-yellow-100 via-yellow-50 to-amber-100";
            case 2: return "from-gray-100 via-gray-50 to-slate-100";
            case 3: return "from-amber-100 via-orange-50 to-yellow-100";
            default: return "from-blue-50 via-indigo-50 to-purple-50";
        }
    };

    const getPositionLabel = (position: number, studentsCount: number) => {
        const positionText = position === 1 ? "🥇" : position === 2 ? "🥈" : position === 3 ? "🥉" : "⭐";
        const suffix = studentsCount > 1 ? ` (${studentsCount} empatados)` : "";
        return `${positionText} ${position}º Lugar${suffix}`;
    };

    const modalTitle = viewMode === 'grouped' && selectedSerie
        ? `🏆 Hall da Fama - ${selectedSerie}º Ano`
        : "🏆 Hall da Fama - Excelente Frequência";

    const modalSubtitle = viewMode === 'grouped' && selectedSerie
        ? `Parabéns aos ${filteredStudents.length} estudantes do ${selectedSerie}º ano com frequência ≥ 95%!`
        : `Parabéns aos ${filteredStudents.length} estudantes com frequência ≥ 95%!`;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header do Modal */}
                <div className="bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-orange-400/20"></div>
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
                                <Trophy className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    {modalTitle}
                                    <Sparkles className="h-6 w-6 text-yellow-200" />
                                </h2>
                                <p className="text-yellow-100">
                                    {modalSubtitle}
                                </p>
                                {viewMode === 'grouped' && selectedSerie && (
                                    <div className="mt-2">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white/20 text-white">
                                            <GraduationCap className="h-4 w-4 mr-1" />
                                            Ano: {selectedSerie}º
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X className="h-6 w-6 text-white" />
                        </button>
                    </div>
                </div>

                {/* Confetes animados */}
                <div className="absolute top-0 left-0 w-full h-20 pointer-events-none overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-bounce"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 2}s`,
                                animationDuration: `${2 + Math.random() * 2}s`
                            }}
                        >
                            {['🎉', '⭐', '🏆', '🎊', '✨'][Math.floor(Math.random() * 5)]}
                        </div>
                    ))}
                </div>

                {/* Conteúdo do Modal */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {groupedPositions.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
                                <Trophy className="h-12 w-12 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Nenhum estudante qualificado ainda
                            </h3>
                            <p className="text-gray-600">
                                {viewMode === 'grouped' && selectedSerie
                                    ? `Aguardando estudantes do ${selectedSerie}º ano com 95% ou mais de frequência`
                                    : "Aguardando estudantes com 95% ou mais de frequência"
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Top 3 - Pódio (apenas se houver pelo menos 3 posições diferentes) */}
                            {groupedPositions.length >= 3 && groupedPositions[0].position === 1 && groupedPositions[1].position === 2 && groupedPositions[2].position === 3 && (
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-center mb-6 text-gray-800">
                                        🏆 Pódio dos Campeões de Frequência 🏆
                                    </h3>
                                    <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                                        {/* 2º Lugar */}
                                        <div className="flex flex-col items-center">
                                            <div className="h-16 w-full bg-gradient-to-t from-gray-300 to-gray-200 rounded-t-lg flex items-end justify-center pb-2">
                                                <span className="text-white font-bold">2º</span>
                                            </div>
                                            <div className="bg-gradient-to-br from-gray-100 to-slate-100 p-4 rounded-lg w-full text-center border-2 border-gray-200">
                                                <Medal className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                                {groupedPositions[1].students.length === 1 ? (
                                                    <>
                                                        <p className="font-bold text-gray-800 text-sm">{groupedPositions[1].students[0].nome}</p>
                                                        <p className="text-xs text-gray-600">{groupedPositions[1].students[0].turma}</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="font-bold text-gray-800 text-sm">{groupedPositions[1].students.length} Empatados</p>
                                                        <p className="text-xs text-gray-600">Múltiplas turmas</p>
                                                    </>
                                                )}
                                                <p className="text-lg font-bold text-gray-700">{groupedPositions[1].frequency}%</p>
                                            </div>
                                        </div>

                                        {/* 1º Lugar - Mais alto */}
                                        <div className="flex flex-col items-center">
                                            <div className="h-20 w-full bg-gradient-to-t from-yellow-400 to-yellow-300 rounded-t-lg flex items-end justify-center pb-2">
                                                <span className="text-white font-bold">1º</span>
                                            </div>
                                            <div className="bg-gradient-to-br from-yellow-100 to-amber-100 p-4 rounded-lg w-full text-center border-2 border-yellow-300">
                                                <Crown className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                                                {groupedPositions[0].students.length === 1 ? (
                                                    <>
                                                        <p className="font-bold text-yellow-800 text-sm">{groupedPositions[0].students[0].nome}</p>
                                                        <p className="text-xs text-yellow-700">{groupedPositions[0].students[0].turma}</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="font-bold text-yellow-800 text-sm">{groupedPositions[0].students.length} Empatados</p>
                                                        <p className="text-xs text-yellow-700">Múltiplas turmas</p>
                                                    </>
                                                )}
                                                <p className="text-lg font-bold text-yellow-800">{groupedPositions[0].frequency}%</p>
                                                <div className="mt-2">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-200 text-yellow-800">
                                                        👑 Campeão{groupedPositions[0].students.length > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 3º Lugar */}
                                        <div className="flex flex-col items-center">
                                            <div className="h-12 w-full bg-gradient-to-t from-amber-400 to-orange-300 rounded-t-lg flex items-end justify-center pb-2">
                                                <span className="text-white font-bold">3º</span>
                                            </div>
                                            <div className="bg-gradient-to-br from-amber-100 to-orange-100 p-4 rounded-lg w-full text-center border-2 border-amber-200">
                                                <Trophy className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                                                {groupedPositions[2].students.length === 1 ? (
                                                    <>
                                                        <p className="font-bold text-amber-800 text-sm">{groupedPositions[2].students[0].nome}</p>
                                                        <p className="text-xs text-amber-700">{groupedPositions[2].students[0].turma}</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="font-bold text-amber-800 text-sm">{groupedPositions[2].students.length} Empatados</p>
                                                        <p className="text-xs text-amber-700">Múltiplas turmas</p>
                                                    </>
                                                )}
                                                <p className="text-lg font-bold text-amber-700">{groupedPositions[2].frequency}%</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Lista completa de premiados por posição */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                                    <Star className="h-5 w-5 text-blue-500" />
                                    Todos os Premiados
                                </h3>
                                <div className="grid gap-4">
                                    {groupedPositions.map((positionGroup) => (
                                        <div key={positionGroup.position} className="space-y-2">
                                            {/* Cabeçalho da posição */}
                                            <div className={`bg-gradient-to-r ${getGradientClass(positionGroup.position)} p-3 rounded-xl border shadow-sm`}>
                                                <div className="flex items-center gap-3">
                                                    {getPositionIcon(positionGroup.position, true)}
                                                    <div>
                                                        <h4 className="font-bold text-gray-800">
                                                            {getPositionLabel(positionGroup.position, positionGroup.students.length)}
                                                        </h4>
                                                        <p className="text-sm text-gray-600">
                                                            Frequência: {positionGroup.frequency}%
                                                        </p>
                                                    </div>
                                                    <div className="ml-auto">
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white/60 text-gray-800 font-medium">
                                                            {positionGroup.students.length} estudante{positionGroup.students.length > 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Lista de estudantes nesta posição */}
                                            <div className="grid gap-2 ml-6">
                                                {positionGroup.students.map((student) => (
                                                    <div
                                                        key={student.estudanteId}
                                                        className="bg-white p-3 rounded-lg border shadow-sm hover:shadow-md transition-all duration-200"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="font-bold text-gray-800">{student.nome}</p>
                                                                <p className="text-sm text-gray-600">Turma: {student.turma}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-lg font-bold text-gray-800">
                                                                    {student.percentualFrequencia}%
                                                                </div>
                                                                <div className="text-xs text-gray-600">
                                                                    {student.totalFaltas} faltas
                                                                </div>
                                                                <div className="mt-1">
                                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                                                        ⭐ Excelente
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Estatísticas da premiação */}
                            <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl">
                                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    Estatísticas da Premiação
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                                    <div className="bg-white/60 p-3 rounded-lg">
                                        <div className="text-lg font-bold text-blue-900">
                                            {filteredStudents.length}
                                        </div>
                                        <p className="text-xs text-blue-700">Premiados</p>
                                    </div>
                                    <div className="bg-white/60 p-3 rounded-lg">
                                        <div className="text-lg font-bold text-blue-900">
                                            {groupedPositions.length > 0 ? groupedPositions[0].frequency : 0}%
                                        </div>
                                        <p className="text-xs text-blue-700">Melhor Frequência</p>
                                    </div>
                                    <div className="bg-white/60 p-3 rounded-lg">
                                        <div className="text-lg font-bold text-blue-900">
                                            {filteredStudents.length > 0 ? (filteredStudents.reduce((sum, s) => sum + s.percentualFrequencia, 0) / filteredStudents.length).toFixed(1) : 0}%
                                        </div>
                                        <p className="text-xs text-blue-700">Média dos Premiados</p>
                                    </div>
                                    <div className="bg-white/60 p-3 rounded-lg">
                                        <div className="text-lg font-bold text-blue-900">
                                            {filteredStudents.length > 0 ? Math.min(...filteredStudents.map(s => s.totalFaltas)) : 0}
                                        </div>
                                        <p className="text-xs text-blue-700">Menor Nº de Faltas</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer do Modal */}
                <div className="bg-gray-50 px-6 py-4 border-t">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Heart className="h-4 w-4 text-red-500" />
                            Parabéns pela dedicação e comprometimento!
                        </p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Componente para estatísticas
const StatsCard = ({
    title,
    value,
    icon: Icon,
    color,
    subtitle,
    onClick,
    isClickable = false
}: {
    title: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    subtitle?: string;
    onClick?: () => void;
    isClickable?: boolean;
}) => (
    <Card
        className={`relative overflow-hidden border-0 shadow-sm ${isClickable ? 'cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200' : ''
            }`}
        onClick={onClick}
    >
        <div className={`absolute inset-0 bg-gradient-to-br opacity-5 ${color}`} />
        <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getIconBgColor(color)} ${isClickable ? 'group-hover:scale-110 transition-transform' : ''}`}>
                    <Icon className="h-4 w-4" />
                </div>
                <div>
                    <div className="text-xl font-bold text-gray-900">{value}</div>
                    <div className="text-xs font-medium text-gray-600">{title}</div>
                    {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
                    {isClickable && (
                        <div className="text-xs text-blue-600 font-medium mt-1">
                            👆 Clique para ver premiação!
                        </div>
                    )}
                </div>
            </div>
        </CardContent>
    </Card>
);

// Componente para cards de série
const SeriesCard = ({
    serie,
    data,
    onExcellentClick
}: {
    serie: string;
    data: SeriesData;
    onExcellentClick: () => void;
}) => (
    <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <GraduationCap className="h-5 w-5 text-indigo-600" />
                    </div>
                    <span className="text-indigo-900">{serie}º Ano</span>
                </div>
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                    {data.turmas.join(', ')}
                </Badge>
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white/60 p-3 rounded-lg text-center">
                    <div className="text-lg font-bold text-indigo-900">{data.totalStudents}</div>
                    <p className="text-xs text-indigo-700">Total</p>
                </div>
                <div
                    className="bg-white/60 p-3 rounded-lg text-center cursor-pointer hover:bg-green-100 transition-colors"
                    onClick={onExcellentClick}
                >
                    <div className="text-lg font-bold text-green-900">{data.excellentCount}</div>
                    <p className="text-xs text-green-700">Excelente</p>
                    <p className="text-xs text-blue-600 font-medium">👆 Ver premiação</p>
                </div>
                <div className="bg-white/60 p-3 rounded-lg text-center">
                    <div className="text-lg font-bold text-red-900">{data.criticalCount}</div>
                    <p className="text-xs text-red-700">Crítico</p>
                </div>
                <div className="bg-white/60 p-3 rounded-lg text-center">
                    <div className="text-lg font-bold text-purple-900">{data.averageFrequency.toFixed(1)}%</div>
                    <p className="text-xs text-purple-700">Freq. Média</p>
                </div>
            </div>
        </CardContent>
    </Card>
);

export default function AlertsCard({ data, students = [] }: AlertsCardProps) {
    const [showExcellentModal, setShowExcellentModal] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('global');
    const [selectedSerie, setSelectedSerie] = useState<string>('');
    const [sortField, setSortField] = useState<SortField>('serie');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Dados agrupados por série
    const seriesData = groupBySeries(data);

    // Dados ordenados
    const sortedSeriesData = sortSeriesData(seriesData, sortField, sortDirection);

    // Função para lidar com clique no cabeçalho
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Componente para cabeçalho ordenável
    const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
        <th
            className="text-center py-2 px-3 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50 transition-colors select-none"
            onClick={() => handleSort(field)}
        >
            <div className="flex items-center justify-center gap-1">
                {children}
                <div className="flex flex-col">
                    <ChevronUp
                        className={`h-3 w-3 ${sortField === field && sortDirection === 'asc'
                            ? 'text-blue-600'
                            : 'text-gray-400'
                            }`}
                    />
                    <ChevronDown
                        className={`h-3 w-3 -mt-1 ${sortField === field && sortDirection === 'desc'
                            ? 'text-blue-600'
                            : 'text-gray-400'
                            }`}
                    />
                </div>
            </div>
        </th>
    );

    const enrichDataWithDisability = (frequencyData: StudentRecord[]): EnhancedStudentRecord[] => {
        return frequencyData.map(student => {
            const studentInfo = students.find(s => s.estudanteId === student.estudanteId);
            const tipoDeficiencia = studentInfo?.deficiencia?.tipoDeficiencia;
            return {
                ...student,
                temDeficiencia: studentInfo?.deficiencia?.estudanteComDeficiencia || false,
                tipoDeficiencia: Array.isArray(tipoDeficiencia) ? tipoDeficiencia : (tipoDeficiencia ? [tipoDeficiencia] : [])
            };
        });
    };

    const filterAndEnrichStudents = (
        frequencyData: StudentRecord[],
        targetRange: { min: number; max?: number }
    ): EnhancedStudentRecord[] => {
        const studentsInRange = frequencyData.filter(s => {
            if (targetRange.max !== undefined) {
                return s.percentualFaltas >= targetRange.min && s.percentualFaltas < targetRange.max;
            } else {
                return s.percentualFaltas >= targetRange.min;
            }
        });
        return enrichDataWithDisability(studentsInRange);
    };

    const nearLimitStudents = filterAndEnrichStudents(data, { min: 20, max: 25 })
        .sort((a, b) => b.percentualFaltas - a.percentualFaltas);

    const criticalStudents = filterAndEnrichStudents(data, { min: 25 })
        .sort((a, b) => b.percentualFaltas - a.percentualFaltas);

    const allEnrichedData = enrichDataWithDisability(data);
    const totalPCD = allEnrichedData.filter(s => s.temDeficiencia).length;
    const criticalPCD = criticalStudents.filter(s => s.temDeficiencia).length;
    const nearLimitPCD = nearLimitStudents.filter(s => s.temDeficiencia).length;
    const excellentStudentsData = data.filter(s => s.percentualFrequencia >= 95);
    const excellentStudents = excellentStudentsData.length;

    const handleExcellentClick = (serie?: string) => {
        if (serie) {
            setSelectedSerie(serie);
            setViewMode('grouped');
        } else {
            setViewMode('global');
            setSelectedSerie('');
        }
        setShowExcellentModal(true);
    };

    if (data.length === 0) {
        return (
            <Card className="border-0 shadow-lg">
                <CardContent className="py-12">
                    <div className="text-center text-gray-500">
                        <div className="flex items-center justify-center mb-4">
                            <div className="p-3 bg-gray-100 rounded-full">
                                <Users className="h-8 w-8 text-gray-300" />
                            </div>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Nenhum dado disponível
                        </h3>
                        <p className="text-sm text-gray-600">
                            Não há dados de frequência para análise no momento
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Modal de Premiação */}
            <ExcellentStudentsModal
                isOpen={showExcellentModal}
                onClose={() => setShowExcellentModal(false)}
                excellentStudents={excellentStudentsData}
                viewMode={viewMode}
                selectedSerie={selectedSerie}
            />

            {/* Toggle de Visualização */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Filter className="h-5 w-5 text-gray-600" />
                            <h3 className="font-semibold text-gray-900">Modo de Visualização</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setViewMode('global')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${viewMode === 'global'
                                    ? 'bg-blue-100 text-blue-800 shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <Globe className="h-4 w-4" />
                                Visão Global
                            </button>
                            <button
                                onClick={() => setViewMode('grouped')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${viewMode === 'grouped'
                                    ? 'bg-indigo-100 text-indigo-800 shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <GraduationCap className="h-4 w-4" />
                                Por Ano
                            </button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {viewMode === 'global' ? (
                <>
                    {/* Header com estatísticas gerais */}
                    <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <TrendingUp className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-semibold text-gray-900">
                                        Central de Alertas de Frequência - Visão Global
                                    </CardTitle>
                                    <p className="text-sm text-gray-600">
                                        Monitoramento inteligente da frequência escolar
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <StatsCard
                                    title="Total de Estudantes"
                                    value={data.length}
                                    icon={Users}
                                    color="text-blue-600 border-blue-200"
                                />
                                <StatsCard
                                    title="Situação Crítica"
                                    value={criticalStudents.length}
                                    icon={AlertTriangle}
                                    color="text-red-600 border-red-200"
                                    subtitle="≥ 25% faltas"
                                />
                                <StatsCard
                                    title="Próximos ao Limite"
                                    value={nearLimitStudents.length}
                                    icon={Target}
                                    color="text-orange-600 border-orange-200"
                                    subtitle="20-25% faltas"
                                />
                                <StatsCard
                                    title="Excelente Frequência"
                                    value={excellentStudents}
                                    icon={TrendingUp}
                                    color="text-green-600 border-green-200"
                                    subtitle="≥ 95% presença"
                                    onClick={() => handleExcellentClick()}
                                    isClickable={true}
                                />
                                <StatsCard
                                    title="Estudantes PCD"
                                    value={totalPCD}
                                    icon={Heart}
                                    color="text-purple-600 border-purple-200"
                                    subtitle="Atenção especial"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Resumo executivo */}
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                                    <div className="text-lg font-bold text-blue-900">
                                        {((data.length - criticalStudents.length - nearLimitStudents.length) / data.length * 100).toFixed(1)}%
                                    </div>
                                    <p className="text-xs text-blue-700">Frequência Adequada</p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-lg">
                                    <div className="text-lg font-bold text-red-900">
                                        {((criticalStudents.length + nearLimitStudents.length) / data.length * 100).toFixed(1)}%
                                    </div>
                                    <p className="text-xs text-red-700">Necessitam Intervenção</p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                                    <div className="text-lg font-bold text-purple-900">
                                        {criticalPCD + nearLimitPCD}
                                    </div>
                                    <p className="text-xs text-purple-700">PCD com Alertas</p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                                    <div className="text-lg font-bold text-green-900">
                                        {(data.reduce((sum, s) => sum + s.percentualFrequencia, 0) / data.length).toFixed(1)}%
                                    </div>
                                    <p className="text-xs text-green-700">Frequência Média Geral</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tabelas de alertas */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {/* Alunos próximos ao limite */}
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Target className="h-4 w-4 text-orange-600" />
                                        <span>Atenção Necessária</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant="secondary"
                                            className="bg-orange-100 text-orange-800 text-xs"
                                        >
                                            {nearLimitStudents.length} estudantes
                                        </Badge>
                                        {nearLimitPCD > 0 && (
                                            <Badge
                                                variant="secondary"
                                                className="bg-purple-100 text-purple-800 text-xs"
                                            >
                                                {nearLimitPCD} PCD
                                            </Badge>
                                        )}
                                    </div>
                                </CardTitle>
                                <p className="text-sm text-gray-600">
                                    Estudantes entre 20-25% de faltas que precisam de acompanhamento
                                </p>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {nearLimitStudents.length > 0 ? (
                                    <AlertDataTable data={nearLimitStudents} />
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <div className="flex items-center justify-center mb-4">
                                            <div className="p-3 bg-green-100 rounded-full">
                                                <Shield className="h-6 w-6 text-green-600" />
                                            </div>
                                        </div>
                                        <h3 className="text-sm font-medium text-gray-900 mb-1">
                                            Situação controlada
                                        </h3>
                                        <p className="text-xs text-gray-600">
                                            Nenhum estudante próximo ao limite de faltas
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Alunos críticos */}
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-red-600" />
                                        <span>Intervenção Urgente</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant="secondary"
                                            className="bg-red-100 text-red-800 text-xs"
                                        >
                                            {criticalStudents.length} estudantes
                                        </Badge>
                                        {criticalPCD > 0 && (
                                            <Badge
                                                variant="secondary"
                                                className="bg-purple-100 text-purple-800 text-xs"
                                            >
                                                {criticalPCD} PCD
                                            </Badge>
                                        )}
                                    </div>
                                </CardTitle>
                                <p className="text-sm text-gray-600">
                                    Estudantes com ≥25% de faltas em situação crítica
                                </p>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {criticalStudents.length > 0 ? (
                                    <AlertDataTable data={criticalStudents} />
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <div className="flex items-center justify-center mb-4">
                                            <div className="p-3 bg-green-100 rounded-full">
                                                <Shield className="h-6 w-6 text-green-600" />
                                            </div>
                                        </div>
                                        <h3 className="text-sm font-medium text-gray-900 mb-1">
                                            Excelente resultado!
                                        </h3>
                                        <p className="text-xs text-gray-600">
                                            Nenhum estudante em situação crítica
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </>
            ) : (
                <>
                    {/* Vista por ano */}
                    <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-50 to-purple-50">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <GraduationCap className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-semibold text-gray-900">
                                        Central de Alertas de Frequência - Por Ano
                                    </CardTitle>
                                    <p className="text-sm text-gray-600">
                                        Análise detalhada por ano escolar
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4">
                                {seriesData.map((serieData) => (
                                    <SeriesCard
                                        key={serieData.serie}
                                        serie={serieData.serie}
                                        data={serieData}
                                        onExcellentClick={() => handleExcellentClick(serieData.serie)}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Resumo comparativo por ano */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-indigo-600" />
                                Comparativo por Ano
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Clique nos cabeçalhos para ordenar as colunas
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <SortableHeader field="serie">Ano</SortableHeader>
                                            <th className="text-center py-2 px-3 font-semibold text-gray-900">Turmas</th>
                                            <SortableHeader field="totalStudents">Total</SortableHeader>
                                            <SortableHeader field="excellentCount">Excelente</SortableHeader>
                                            <SortableHeader field="criticalCount">Crítico</SortableHeader>
                                            <SortableHeader field="nearLimitCount">Atenção</SortableHeader>
                                            <SortableHeader field="averageFrequency">Freq. Média</SortableHeader>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedSeriesData.map((serieData) => (
                                            <tr key={serieData.serie} className="border-b hover:bg-gray-50 transition-colors">
                                                <td className="py-3 px-3 font-medium text-center">{serieData.serie}º</td>
                                                <td className="py-3 px-3 text-center text-xs">
                                                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                                                        {serieData.turmas.join(', ')}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-3 text-center font-medium">{serieData.totalStudents}</td>
                                                <td className="py-3 px-3 text-center">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 font-medium">
                                                        {serieData.excellentCount}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 font-medium">
                                                        {serieData.criticalCount}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800 font-medium">
                                                        {serieData.nearLimitCount}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-center font-medium text-blue-900">
                                                    {serieData.averageFrequency.toFixed(1)}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Indicadores de performance */}
            {(criticalStudents.length > 0 || nearLimitStudents.length > 0) && (
                <Card className="border-0 shadow-sm bg-gradient-to-r from-amber-50 to-orange-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <TrendingDown className="h-5 w-5 text-amber-600" />
                            <h3 className="font-semibold text-amber-900">Recomendações de Ação</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="p-3 bg-white/60 rounded-lg">
                                <h4 className="font-medium text-amber-900 mb-2">Próximos ao Limite</h4>
                                <ul className="space-y-1 text-amber-800">
                                    <li>• Contato com responsáveis</li>
                                    <li>• Acompanhamento semanal</li>
                                    <li>• Plano de recuperação</li>
                                </ul>
                            </div>
                            <div className="p-3 bg-white/60 rounded-lg">
                                <h4 className="font-medium text-red-900 mb-2">Situação Crítica</h4>
                                <ul className="space-y-1 text-red-800">
                                    <li>• Intervenção imediata</li>
                                    <li>• Reunião com família</li>
                                    <li>• Protocolo de evasão</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}