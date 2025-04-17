import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { StudentRecord } from "../app/types";
import { getFrequencyColor } from "../app/utils";

interface FrequencyAllAbsencesCardProps {
    studentRecord: StudentRecord | null;
}

export default function FrequencyAllAbsencesCard({ studentRecord }: FrequencyAllAbsencesCardProps) {
    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Frequência (Todas as Faltas)</CardTitle>
            </CardHeader>
            <CardContent>
                {studentRecord && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Frequência</h3>
                            <div className="bg-gray-100 p-5 rounded-lg shadow-sm">
                                <h4 className="text-md font-medium mb-3 text-center">Até Hoje</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Faltas</p>
                                        <p className="text-lg font-semibold">{studentRecord.totalFaltasAteHoje}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">% Faltas</p>
                                        <p className="text-lg font-semibold">{studentRecord.percentualFaltasAteHoje}%</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">% Frequência</p>
                                        <p className={`text-lg font-semibold ${getFrequencyColor(studentRecord.percentualFrequenciaAteHoje)}`}>
                                            {studentRecord.percentualFrequenciaAteHoje}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Dias Letivos</p>
                                        <p className="text-lg font-semibold">{studentRecord.diasLetivosAteHoje}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-1/4 text-left">Bimestre</TableHead>
                                        <TableHead className="w-1/6 text-center">Faltas</TableHead>
                                        <TableHead className="w-1/6 text-center">% Faltas</TableHead>
                                        <TableHead className="w-1/6 text-center">% Frequência</TableHead>
                                        <TableHead className="w-1/6 text-center">Dias Letivos</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="text-left">1º Bimestre</TableCell>
                                        <TableCell className="text-center">{studentRecord.faltasB1}</TableCell>
                                        <TableCell className="text-center">{studentRecord.diasLetivosB1 ? Number((studentRecord.faltasB1 / studentRecord.diasLetivosB1 * 100).toFixed(1)) : 0}%</TableCell>
                                        <TableCell className={getFrequencyColor(studentRecord.diasLetivosB1 ? Number((100 - (studentRecord.faltasB1 / studentRecord.diasLetivosB1 * 100)).toFixed(1)) : 100)}>
                                            {studentRecord.diasLetivosB1 ? Number((100 - (studentRecord.faltasB1 / studentRecord.diasLetivosB1 * 100)).toFixed(1)) : 100}%
                                        </TableCell>
                                        <TableCell className="text-center">{studentRecord.diasLetivosB1}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="text-left">2º Bimestre</TableCell>
                                        <TableCell className="text-center">{studentRecord.faltasB2}</TableCell>
                                        <TableCell className="text-center">{studentRecord.diasLetivosB2 ? Number((studentRecord.faltasB2 / studentRecord.diasLetivosB2 * 100).toFixed(1)) : 0}%</TableCell>
                                        <TableCell className={getFrequencyColor(studentRecord.diasLetivosB2 ? Number((100 - (studentRecord.faltasB2 / studentRecord.diasLetivosB2 * 100)).toFixed(1)) : 100)}>
                                            {studentRecord.diasLetivosB2 ? Number((100 - (studentRecord.faltasB2 / studentRecord.diasLetivosB2 * 100)).toFixed(1)) : 100}%
                                        </TableCell>
                                        <TableCell className="text-center">{studentRecord.diasLetivosB2}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="text-left">3º Bimestre</TableCell>
                                        <TableCell className="text-center">{studentRecord.faltasB3}</TableCell>
                                        <TableCell className="text-center">{studentRecord.diasLetivosB3 ? Number((studentRecord.faltasB3 / studentRecord.diasLetivosB3 * 100).toFixed(1)) : 0}%</TableCell>
                                        <TableCell className={getFrequencyColor(studentRecord.diasLetivosB3 ? Number((100 - (studentRecord.faltasB3 / studentRecord.diasLetivosB3 * 100)).toFixed(1)) : 100)}>
                                            {studentRecord.diasLetivosB3 ? Number((100 - (studentRecord.faltasB3 / studentRecord.diasLetivosB3 * 100)).toFixed(1)) : 100}%
                                        </TableCell>
                                        <TableCell className="text-center">{studentRecord.diasLetivosB3}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="text-left">4º Bimestre</TableCell>
                                        <TableCell className="text-center">{studentRecord.faltasB4}</TableCell>
                                        <TableCell className="text-center">{studentRecord.diasLetivosB4 ? Number((studentRecord.faltasB4 / studentRecord.diasLetivosB4 * 100).toFixed(1)) : 0}%</TableCell>
                                        <TableCell className={getFrequencyColor(studentRecord.diasLetivosB4 ? Number((100 - (studentRecord.faltasB4 / studentRecord.diasLetivosB4 * 100)).toFixed(1)) : 100)}>
                                            {studentRecord.diasLetivosB4 ? Number((100 - (studentRecord.faltasB4 / studentRecord.diasLetivosB4 * 100)).toFixed(1)) : 100}%
                                        </TableCell>
                                        <TableCell className="text-center">{studentRecord.diasLetivosB4}</TableCell>
                                    </TableRow>
                                    <TableRow className="bg-gray-50 font-semibold">
                                        <TableCell className="text-left">Anual</TableCell>
                                        <TableCell className="text-center">{studentRecord.totalFaltas}</TableCell>
                                        <TableCell className="text-center">{studentRecord.percentualFaltas}%</TableCell>
                                        <TableCell className={getFrequencyColor(studentRecord.percentualFrequencia)}>
                                            {studentRecord.percentualFrequencia}%
                                        </TableCell>
                                        <TableCell className="text-center">{studentRecord.diasLetivosAnual}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}