import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertDataTable, EnhancedStudentRecord } from "@/components/CustomAlertDataTable";
import { Estudante } from "@/hooks/useStudents";
import { AlertTriangle, Heart, Users, TrendingUp, TrendingDown, Target, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

// Componente para estatísticas
const StatsCard = ({
    title,
    value,
    icon: Icon,
    color,
    subtitle
}: {
    title: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    subtitle?: string;
}) => (
    <Card className="relative overflow-hidden border-0 shadow-sm">
        <div className={`absolute inset-0 bg-gradient-to-br opacity-5 ${color}`} />
        <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getIconBgColor(color)}`}>
                    <Icon className="h-4 w-4" />
                </div>
                <div>
                    <div className="text-xl font-bold text-gray-900">{value}</div>
                    <div className="text-xs font-medium text-gray-600">{title}</div>
                    {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
                </div>
            </div>
        </CardContent>
    </Card>
);

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

export default function AlertsCard({ data, students = [] }: AlertsCardProps) {
    const enrichDataWithDisability = (frequencyData: StudentRecord[]): EnhancedStudentRecord[] => {
        return frequencyData.map(student => {
            const studentInfo = students.find(s => s.estudanteId === student.estudanteId);
            return {
                ...student,
                temDeficiencia: studentInfo?.deficiencia?.estudanteComDeficiencia || false,
                tipoDeficiencia: studentInfo?.deficiencia?.tipoDeficiencia || []
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
    const excellentStudents = data.filter(s => s.percentualFrequencia >= 95).length;

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
            {/* Header com estatísticas gerais */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold text-gray-900">
                                Central de Alertas de Frequência
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