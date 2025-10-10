import { memo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Student } from "@/types";
import { GraduationCap, User, BookOpen, Filter, AlertCircle } from "lucide-react";

interface SearchByClassCardProps {
    selectedTurma: string;
    selectedStudentId: string;
    uniqueTurmas: string[];
    studentsInTurma: Student[];
    searchName: string;
    onTurmaChange: (value: string) => void;
    onStudentChange: (value: string) => void;
}

const SearchByClassCard = memo(function SearchByClassCard({
    selectedTurma,
    selectedStudentId,
    uniqueTurmas,
    studentsInTurma,
    searchName,
    onTurmaChange,
    onStudentChange,
}: SearchByClassCardProps) {
    const isDisabled = searchName.length > 0;

    return (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-green-100/20 to-blue-100/20 rounded-full -translate-y-16 -translate-x-16"></div>

            <CardHeader className="bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-t-lg py-3 relative">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                    <Filter className="w-5 h-5" />
                    Buscar por Turma/Estudante
                </CardTitle>
                <div className="absolute top-2 right-2 opacity-20">
                    <BookOpen className="w-6 h-6" />
                </div>
            </CardHeader>

            <CardContent className="p-4 relative">
                <div className="space-y-4">
                    {/* Alert when disabled */}
                    {isDisabled && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-medium text-yellow-800">Busca por nome ativa</p>
                                <p className="text-xs text-yellow-700">
                                    Limpe o campo de busca por nome para usar a seleção por turma
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Turma Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="select-turma" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-green-600" />
                                Turma
                                <Badge variant="secondary" className="text-xs px-2 py-0">
                                    {uniqueTurmas.length} turmas
                                </Badge>
                            </Label>

                            <div className="relative">
                                <Select
                                    onValueChange={onTurmaChange}
                                    value={selectedTurma}
                                    disabled={isDisabled}
                                >
                                    <SelectTrigger
                                        id="select-turma"
                                        className={`h-11 border-2 transition-all duration-200 ${isDisabled
                                            ? 'border-gray-200 bg-gray-50/50 cursor-not-allowed'
                                            : 'border-gray-200 hover:border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white/80 backdrop-blur-sm'
                                            }`}
                                    >
                                        <SelectValue placeholder="Selecione uma turma..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {uniqueTurmas.map((turma: string) => (
                                            <SelectItem
                                                key={turma}
                                                value={turma}
                                                className="cursor-pointer hover:bg-green-50 focus:bg-green-50 py-2"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 bg-green-100 rounded-full">
                                                        <GraduationCap className="w-3 h-3 text-green-600" />
                                                    </div>
                                                    <span className="font-medium">Turma {turma}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Student Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="select-student" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <User className="w-4 h-4 text-teal-600" />
                                Estudante
                                {selectedTurma && (
                                    <Badge variant="secondary" className="text-xs px-2 py-0">
                                        {studentsInTurma.length} estudantes
                                    </Badge>
                                )}
                            </Label>

                            <div className="relative">
                                <Select
                                    onValueChange={onStudentChange}
                                    value={selectedStudentId}
                                    disabled={!selectedTurma || isDisabled}
                                >
                                    <SelectTrigger
                                        id="select-student"
                                        className={`h-11 border-2 transition-all duration-200 ${!selectedTurma || isDisabled
                                            ? 'border-gray-200 bg-gray-50/50 cursor-not-allowed'
                                            : 'border-gray-200 hover:border-teal-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 bg-white/80 backdrop-blur-sm'
                                            }`}
                                    >
                                        <SelectValue placeholder="Selecione um estudante..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {studentsInTurma.map((student: Student) => (
                                            <SelectItem
                                                key={student.estudanteId}
                                                value={student.estudanteId}
                                                className="cursor-pointer hover:bg-teal-50 focus:bg-teal-50 py-2"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 bg-teal-100 rounded-full">
                                                        <User className="w-3 h-3 text-teal-600" />
                                                    </div>
                                                    <span className="font-medium">{student.nome}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-3 border border-green-100">
                        <div className="flex items-start gap-2">
                            <BookOpen className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-medium text-green-800 mb-1">Como usar</p>
                                <p className="text-xs text-green-700">
                                    1. Selecione uma turma para ver os <strong>estudantes ativos</strong>
                                    <br />
                                    2. Escolha um estudante da lista para ver suas informações
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

export default SearchByClassCard;