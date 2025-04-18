import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

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

export default function StudentAbsencesCard({
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

    return (
        <Card role="region" aria-label="Faltas por Estudante">
            <CardHeader>
                <CardTitle>Faltas por Estudante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="select-turma">Selecionar Turma</Label>
                        <Select
                            onValueChange={(value) => {
                                setSelectedTurma(value);
                                setSelectedStudent("");
                            }}
                            value={selectedTurma}
                        >
                            <SelectTrigger id="select-turma" aria-label="Selecionar Turma">
                                <SelectValue placeholder="Escolha uma turma" />
                            </SelectTrigger>
                            <SelectContent>
                                {uniqueTurmas.map(turma => (
                                    <SelectItem key={turma} value={turma}>
                                        {turma}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="select-student">Selecionar Estudante</Label>
                        <Select
                            onValueChange={setSelectedStudent}
                            value={selectedStudent}
                            disabled={!selectedTurma}
                        >
                            <SelectTrigger id="select-student" aria-label="Selecionar Estudante">
                                <SelectValue placeholder="Escolha um estudante" />
                            </SelectTrigger>
                            <SelectContent>
                                {studentsInTurma.map(student => (
                                    <SelectItem key={student.estudanteId} value={student.estudanteId}>
                                        {student.nome}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {selectedStudent &&
                    (studentAbsences.b1.length > 0 ||
                        studentAbsences.b2.length > 0 ||
                        studentAbsences.b3.length > 0 ||
                        studentAbsences.b4.length > 0) ? (
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Dias de Falta por Bimestre</h3>
                        <div className="rounded-md border">
                            <Table aria-label="Faltas por Bimestre">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-1/4 text-center">1º Bimestre</TableHead>
                                        <TableHead className="w-1/4 text-center">2º Bimestre</TableHead>
                                        <TableHead className="w-1/4 text-center">3º Bimestre</TableHead>
                                        <TableHead className="w-1/4 text-center">4º Bimestre</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="align-top text-center">
                                            <div className="space-y-1">
                                                {studentAbsences.b1.length > 0 ? (
                                                    studentAbsences.b1.map((date, index) => (
                                                        <p key={index} className="text-sm">{date}</p>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">Nenhuma falta</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-top text-center">
                                            <div className="space-y-1">
                                                {studentAbsences.b2.length > 0 ? (
                                                    studentAbsences.b2.map((date, index) => (
                                                        <p key={index} className="text-sm">{date}</p>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">Nenhuma falta</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-top text-center">
                                            <div className="space-y-1">
                                                {studentAbsences.b3.length > 0 ? (
                                                    studentAbsences.b3.map((date, index) => (
                                                        <p key={index} className="text-sm">{date}</p>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">Nenhuma falta</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-top text-center">
                                            <div className="space-y-1">
                                                {studentAbsences.b4.length > 0 ? (
                                                    studentAbsences.b4.map((date, index) => (
                                                        <p key={index} className="text-sm">{date}</p>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">Nenhuma falta</p>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : selectedStudent ? (
                    <p className="text-sm text-muted-foreground">Nenhuma falta registrada para este estudante.</p>
                ) : null}
            </CardContent>
        </Card>
    );
}