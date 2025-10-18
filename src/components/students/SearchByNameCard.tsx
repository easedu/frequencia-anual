import { memo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Student } from "@/types";
import { Search, User, GraduationCap, Sparkles } from "lucide-react";

interface SearchByNameCardProps {
    searchName: string;
    suggestions: Student[];
    onSearchChange: (value: string) => void;
    onSuggestionSelect: (studentId: string) => void;
    selectedStudentId?: string;
}

const SearchByNameCard = memo(function SearchByNameCard({
    searchName,
    suggestions,
    onSearchChange,
    onSuggestionSelect,
    selectedStudentId,
}: SearchByNameCardProps) {

    return (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/20 to-purple-100/20 rounded-full -translate-y-16 translate-x-16"></div>

            <CardHeader className="bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-t-lg py-3 relative">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                    <Search className="w-5 h-5" />
                    Buscar por Nome
                </CardTitle>
                <div className="absolute top-2 right-2 opacity-20">
                    <Sparkles className="w-6 h-6" />
                </div>
            </CardHeader>

            <CardContent className="p-4 relative">
                <div className="space-y-3">
                    <div className="relative">
                        <Label htmlFor="student-search" className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-purple-600" />
                            Estudante
                        </Label>

                        <div className="relative">
                            <Input
                                id="student-search"
                                value={searchName}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder="Digite o nome do estudante..."
                                autoComplete="off"
                                className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white/80 backdrop-blur-sm"
                            />
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        </div>

                        {/* Suggestions Dropdown - Agora se estende para fora do card */}
                        {suggestions.length > 0 && (
                            <div className="absolute z-50 bg-white border-2 border-gray-200 rounded-lg mt-1 w-full max-h-80 overflow-y-auto shadow-xl left-0 right-0">
                                <div className="p-2 bg-gray-50 border-b border-gray-200">
                                    <p className="text-xs font-medium text-gray-600 flex items-center gap-1">
                                        <Search className="w-3 h-3" />
                                        {suggestions.length} estudante{suggestions.length > 1 ? 's' : ''} encontrado{suggestions.length > 1 ? 's' : ''}
                                    </p>
                                </div>

                                {suggestions.map((student) => (
                                    <div
                                        key={student.id}
                                        className="p-3 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-b-0 group"
                                        onClick={() => onSuggestionSelect(student.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-100 rounded-full group-hover:bg-purple-200 transition-colors">
                                                    <User className="w-4 h-4 text-purple-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 group-hover:text-purple-900 transition-colors">
                                                        {student.nome}
                                                    </p>
                                                    <p className="text-xs text-gray-600 flex items-center gap-1">
                                                        <GraduationCap className="w-3 h-3" />
                                                        Turma {student.turma}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* Removida a badge de status ATIVO */}
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs px-2 py-1 border-purple-200 text-purple-700"
                                                >
                                                    {student.turno}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* No results message */}
                        {searchName && suggestions.length === 0 && searchName.length > 2 && !selectedStudentId && (
                            <div className="absolute z-50 bg-white border-2 border-gray-200 rounded-lg mt-1 w-full shadow-xl left-0 right-0">
                                <div className="p-4 text-center">
                                    <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600">Nenhum estudante encontrado</p>
                                    <p className="text-xs text-gray-500">Tente outro nome ou verifique a ortografia</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Search tips */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-100">
                        <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-medium text-purple-800 mb-1">Dica de busca</p>
                                <p className="text-xs text-purple-700">
                                    Digite pelo menos 3 caracteres para ver as sugestões.
                                    A busca é feita pelo nome do estudante.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

export default SearchByNameCard;