import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Student } from "../app/types";

interface SearchByNameCardProps {
    searchName: string;
    suggestions: Student[];
    onSearchChange: (value: string) => void;
    onSuggestionSelect: (studentId: string) => void;
}

export default function SearchByNameCard({
    searchName,
    suggestions,
    onSearchChange,
    onSuggestionSelect,
}: SearchByNameCardProps) {
    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle>Buscar por Nome</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                        <Label htmlFor="select-turma">Estudante</Label>
                        <Input
                            value={searchName}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Digite o nome do estudante"
                            autoComplete="off"
                        />
                        {suggestions.length > 0 && (
                            <div className="absolute z-10 bg-white border rounded-md mt-1 w-full max-h-40 overflow-y-auto">
                                {suggestions.map((student) => (
                                    <div
                                        key={student.estudanteId}
                                        className="p-2 hover:bg-gray-100 cursor-pointer"
                                        onClick={() => onSuggestionSelect(student.estudanteId)}
                                    >
                                        {student.nome} ({student.turma})
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}