import { useMemo, memo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    User,
    Users,
    Calendar,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    Clock
} from "lucide-react";

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

interface StudentAbsencesByBimester {
    b1: string[];
    b2: string[];
    b3: string[];
    b4: string[];
}

interface StudentAbsencesCardProps {
    data: StudentRecord[];
    selectedTurma: string;
    setSelectedTurma: React.Dispatch<React.SetStateAction<string>>;
    selectedStudent: string;
    setSelectedStudent: React.Dispatch<React.SetStateAction<string>>;
    studentAbsences: StudentAbsencesByBimester;
}

// Componente para card de bimestre
const BimesterCard = ({
    title,
    dates,
    bimesterNumber
}: {
    title: string;
    dates: string[];
    bimesterNumber: number;
}) => {
    const bgColors = [
        "bg-blue-50 border-blue-200",
        "bg-green-50 border-green-200",
        "bg-purple-50 border-purple-200",
        "bg-orange-50 border-orange-200"
    ];

    const hasAbsences = dates.length > 0;

    return (
        <Card className={`border-2 transition-all duration-200 hover:shadow-md ${hasAbsences ? bgColors[bimesterNumber - 1] : 'bg-gray-50 border-gray-200'
            }`}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-700">
                        {title}
                    </CardTitle>
                    <Badge
                        variant={hasAbsences ? "destructive" : "secondary"}
                        className="text-xs"
                    >
                        {dates.length} falta{dates.length !== 1 ? 's' : ''}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-2 max-h-32 overflow-y-auto">
                    {hasAbsences ? (
                        dates.map((date, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-2 p-2 bg-white rounded-md border text-xs"
                            >
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className="font-mono">{date}</span>
                            </div>
                        ))
                    ) : (
                        <div className="flex items-center justify-center py-4 text-gray-500">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            <span className="text-xs">Nenhuma falta</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

// Componente para estatísticas do estudante
const StudentStats = ({ student }: { student: StudentRecord }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-lg font-bold text-blue-900">{student.totalFaltas}</span>
                </div>
                <p className="text-xs text-blue-700">Total de Faltas</p>
            </div>

            <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                <div className="flex items-center justify-center gap-1 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-lg font-bold text-green-900">{student.percentualFrequencia}%</span>
                </div>
                <p className="text-xs text-green-700">Frequência</p>
            </div>

            <div className="text-center p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                <div className="flex items-center justify-center gap-1 mb-1">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-lg font-bold text-red-900">{student.percentualFaltas}%</span>
                </div>
                <p className="text-xs text-red-700">% de Faltas</p>
            </div>

            <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <div className="flex items-center justify-center gap-1 mb-1">
                    <Users className="h-4 w-4 text-purple-600" />
                    <Badge variant="outline" className="text-xs font-mono">
                        {student.turma}
                    </Badge>
                </div>
                <p className="text-xs text-purple-700">Turma</p>
            </div>
        </div>
    );
};

const StudentAbsencesCard = memo(function StudentAbsencesCard({
    data,
    selectedTurma,
    setSelectedTurma,
    selectedStudent,
    setSelectedStudent,
    studentAbsences,
}: StudentAbsencesCardProps) {
    const uniqueTurmas = useMemo(
        () =>
            Array.from(new Set(data.map(item => item.turma))).sort((a, b) => {
                const [numA, letterA] = a.match(/(\d+)([A-Z]+)/)!.slice(1);
                const [numB, letterB] = b.match(/(\d+)([A-Z]+)/)!.slice(1);
                const numCompare = Number(numA) - Number(numB);
                if (numCompare !== 0) return numCompare;
                return letterA.localeCompare(letterB);
            }),
        [data]
    );

    const studentsInTurma = useMemo(
        () =>
            data
                .filter(student => student.turma === selectedTurma)
                .sort((a, b) => a.nome.localeCompare(b.nome)),
        [data, selectedTurma]
    );

    const selectedStudentData = useMemo(
        () => data.find(student => student.estudanteId === selectedStudent),
        [data, selectedStudent]
    );

    const hasAbsences = selectedStudent && (
        studentAbsences.b1.length > 0 ||
        studentAbsences.b2.length > 0 ||
        studentAbsences.b3.length > 0 ||
        studentAbsences.b4.length > 0
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <User className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold text-gray-900">
                                Análise Individual de Faltas
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Visualize as faltas detalhadas por estudante e bimestre
                            </p>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Seletores */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="select-turma" className="flex items-center gap-2 text-sm font-medium">
                                <Users className="h-4 w-4" />
                                Selecionar Turma
                            </Label>
                            <Select
                                onValueChange={(value) => {
                                    setSelectedTurma(value);
                                    setSelectedStudent("");
                                }}
                                value={selectedTurma || undefined}
                            >
                                <SelectTrigger id="select-turma" className="h-10">
                                    <SelectValue placeholder="Selecione uma turma" />
                                </SelectTrigger>
                                <SelectContent>
                                    {uniqueTurmas.map(turma => (
                                        <SelectItem key={turma} value={turma}>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {turma}
                                                </Badge>
                                                <span>
                                                    {data.filter(s => s.turma === turma).length} estudantes
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="select-student" className="flex items-center gap-2 text-sm font-medium">
                                <User className="h-4 w-4" />
                                Selecionar Estudante
                            </Label>
                            <Select
                                onValueChange={setSelectedStudent}
                                value={selectedStudent || undefined}
                                disabled={!selectedTurma}
                            >
                                <SelectTrigger id="select-student" className="h-10">
                                    <SelectValue placeholder={
                                        !selectedTurma
                                            ? "Primeiro selecione uma turma"
                                            : "Selecione um estudante"
                                    } />
                                </SelectTrigger>
                                <SelectContent>
                                    {studentsInTurma.map(student => (
                                        <SelectItem key={student.estudanteId} value={student.estudanteId}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{student.nome}</span>
                                                <Badge
                                                    variant={student.percentualFrequencia >= 75 ? "secondary" : "destructive"}
                                                    className="text-xs"
                                                >
                                                    {student.totalFaltas} faltas
                                                </Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Dados do estudante selecionado */}
            {selectedStudentData && (
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-semibold">
                                    {selectedStudentData.nome}
                                </CardTitle>
                                <p className="text-sm text-gray-600">
                                    Turma {selectedStudentData.turma}
                                </p>
                            </div>
                            <Badge
                                variant={selectedStudentData.percentualFrequencia >= 75 ? "secondary" : "destructive"}
                                className="px-3 py-1"
                            >
                                {selectedStudentData.percentualFrequencia >= 75 ? "Frequência OK" : "Frequência Baixa"}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <StudentStats student={selectedStudentData} />
                    </CardContent>
                </Card>
            )}

            {/* Detalhes das faltas por bimestre */}
            {hasAbsences ? (
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-gray-600" />
                            <CardTitle className="text-lg">Detalhamento por Bimestre</CardTitle>
                        </div>
                        <p className="text-sm text-gray-600">
                            Datas específicas das faltas registradas
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <BimesterCard
                                title="1º Bimestre"
                                dates={studentAbsences.b1}
                                bimesterNumber={1}
                            />
                            <BimesterCard
                                title="2º Bimestre"
                                dates={studentAbsences.b2}
                                bimesterNumber={2}
                            />
                            <BimesterCard
                                title="3º Bimestre"
                                dates={studentAbsences.b3}
                                bimesterNumber={3}
                            />
                            <BimesterCard
                                title="4º Bimestre"
                                dates={studentAbsences.b4}
                                bimesterNumber={4}
                            />
                        </div>
                    </CardContent>
                </Card>
            ) : selectedStudent ? (
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-8">
                        <div className="text-center text-gray-500">
                            <div className="flex items-center justify-center mb-4">
                                <div className="p-3 bg-green-100 rounded-full">
                                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                                </div>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Excelente frequência!
                            </h3>
                            <p className="text-sm text-gray-600">
                                {selectedStudentData?.nome} não possui faltas registradas no período selecionado.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : null}
        </div>
    );
});

export default StudentAbsencesCard;