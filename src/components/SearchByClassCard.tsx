import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Student } from "../app/types";

interface SearchByClassCardProps {
    selectedTurma: string;
    selectedStudentId: string;
    uniqueTurmas: string[];
    studentsInTurma: Student[];
    searchName: string;
    onTurmaChange: (value: string) => void;
    onStudentChange: (value: string) => void;
}

export default function SearchByClassCard({
    selectedTurma,
    selectedStudentId,
    uniqueTurmas,
    studentsInTurma,
    searchName,
    onTurmaChange,
    onStudentChange,
}: SearchByClassCardProps) {
    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle>Buscar por Turma/Estudante</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                        <Label htmlFor="select-turma">Turma</Label>
                        <Select
                            onValueChange={onTurmaChange}
                            value={selectedTurma}
                            disabled={searchName.length > 0}
                        >
                            <SelectTrigger id="select-turma">
                                <SelectValue placeholder="Selecione uma turma" />
                            </SelectTrigger>
                            <SelectContent>
                                {uniqueTurmas.map((turma: string) => (
                                    <SelectItem key={turma} value={turma}>
                                        {turma}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="select-student">Estudante</Label>
                        <Select
                            onValueChange={onStudentChange}
                            value={selectedStudentId}
                            disabled={!selectedTurma || searchName.length > 0}
                        >
                            <SelectTrigger id="select-student">
                                <SelectValue placeholder="Selecione um estudante" />
                            </SelectTrigger>
                            <SelectContent>
                                {studentsInTurma.map((student: Student) => (
                                    <SelectItem key={student.estudanteId} value={student.estudanteId}>
                                        {student.nome}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}