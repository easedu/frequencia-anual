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

interface FrequencyNoJustifiedCardProps {
    studentRecordWithoutJustified: StudentRecord | null;
}

export default function FrequencyNoJustifiedCard({ studentRecordWithoutJustified }: FrequencyNoJustifiedCardProps) {
    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Frequência (Excluindo Faltas Justificadas)</CardTitle>
            </CardHeader>
            <CardContent>
                {studentRecordWithoutJustified && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Frequência</h3>
                            <div className="bg-gray-100 p-5 rounded-lg shadow-sm">
                                <h4 className="text-md font-medium mb-3 text-center">Até Hoje</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Faltas</p>
                                        <p className="text-lg font-semibold">{studentRecordWithoutJustified.totalFaltasAteHoje}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">% Faltas</p>
                                        <p className="text-lg font-semibold">{studentRecordWithoutJustified.percentualFaltasAteHoje}%</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">% Frequência</p>
                                        <p className={`text-lg font-semibold ${getFrequencyColor(studentRecordWithoutJustified.percentualFrequenciaAteHoje)}`}>
                                            {studentRecordWithoutJustified.percentualFrequenciaAteHoje}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Dias Letivos</p>
                                        <p className="text-lg font-semibold">{studentRecordWithoutJustified.diasLetivosAteHoje}</p>
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
                                        <TableCell className="text-center">{studentRecordWithoutJustified.faltasB1}</TableCell>
                                        <TableCell className="text-center">{studentRecordWithoutJustified.diasLetivosB1 ? Number((studentRecordWithoutJustified.faltasB1 / studentRecordWithoutJustified.diasLetivosB1 * 100).toFixed(1)) : 0}%</TableCell>
                                        <TableCell className={getFrequencyColor(studentRecordWithoutJustified.diasLetivosB1 ? Number((100 - (studentRecordWithoutJustified.faltasB1 / studentRecordWithoutJustified.diasLetivosB1 * 100)).toFixed(1)) : 100)}>
                                            {studentRecordWithoutJustified.diasLetivosB1 ? Number((100 - (studentRecordWithoutJustified.faltasB1 / studentRecordWithoutJustified.diasLetivosB1 * 100)).toFixed(1)) : 100}%
                                        </TableCell>
                                        <TableCell className="text-center">{studentRecordWithoutJustified.diasLetivosB1}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="text-left">2º Bimestre</TableCell>
                                        <TableCell className="text-center">{studentRecordWithoutJustified.faltasB2}</TableCell>
                                        <TableCell className="text-center">{studentRecordWithoutJustified.diasLetivosB2 ? Number((studentRecordWithoutJustified.faltasB2 / studentRecordWithoutJustified.diasLetivosB2 * 100).toFixed(1)) : 0}%</TableCell>
                                        <TableCell className={getFrequencyColor(studentRecordWithoutJustified.diasLetivosB2 ? Number((100 - (studentRecordWithoutJustified.faltasB2 / studentRecordWithoutJustified.diasLetivosB2 * 100)).toFixed(1)) : 100)}>
                                            {studentRecordWithoutJustified.diasLetivosB2 ? Number((100 - (studentRecordWithoutJustified.faltasB2 / studentRecordWithoutJustified.diasLetivosB2 * 100)).toFixed(1)) : 100}%
                                        </TableCell>
                                        <TableCell className="text-center">{studentRecordWithoutJustified.diasLetivosB2}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="text-left">3º Bimestre</TableCell>
                                        <TableCell className="text-center">{studentRecordWithoutJustified.faltasB3}</TableCell>
                                        <TableCell className="text-center">{studentRecordWithoutJustified.diasLetivosB3 ? Number((studentRecordWithoutJustified.faltasB3 / studentRecordWithoutJustified.diasLetivosB3 * 100).toFixed(1)) : 0}%</TableCell>
                                        <TableCell className={getFrequencyColor(studentRecordWithoutJustified.diasLetivosB3 ? Number((100 - (studentRecordWithoutJustified.faltasB3 / studentRecordWithoutJustified.diasLetivosB3 * 100)).toFixed(1)) : 100)}>
                                            {studentRecordWithoutJustified.diasLetivosB3 ? Number((100 - (studentRecordWithoutJustified.faltasB3 / studentRecordWithoutJustified.diasLetivosB3 * 100)).toFixed(1)) : 100}%
                                        </TableCell>
                                        <TableCell className="text-center">{studentRecordWithoutJustified.diasLetivosB3}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="text-left">4º Bimestre</TableCell>
                                        <TableCell className="text-center">{studentRecordWithoutJustified.faltasB4}</TableCell>
                                        <TableCell className="text-center">{studentRecordWithoutJustified.diasLetivosB4 ? Number((studentRecordWithoutJustified.faltasB4 / studentRecordWithoutJustified.diasLetivosB4 * 100).toFixed(1)) : 0}%</TableCell>
                                        <TableCell className={getFrequencyColor(studentRecordWithoutJustified.diasLetivosB4 ? Number((100 - (studentRecordWithoutJustified.faltasB4 / studentRecordWithoutJustified.diasLetivosB4 * 100)).toFixed(1)) : 100)}>
                                            {studentRecordWithoutJustified.diasLetivosB4 ? Number((100 - (studentRecordWithoutJustified.faltasB4 / studentRecordWithoutJustified.diasLetivosB4 * 100)).toFixed(1)) : 100}%
                                        </TableCell>
                                        <TableCell className="text-center">{studentRecordWithoutJustified.diasLetivosB4}</TableCell>
                                    </TableRow>
                                    <TableRow className="bg-gray-50 font-semibold">
                                        <TableCell className="text-left">Anual</TableCell>
                                        <TableCell className="text-center">{studentRecordWithoutJustified.totalFaltas}</TableCell>
                                        <TableCell className="text-center">{studentRecordWithoutJustified.percentualFaltas}%</TableCell>
                                        <TableCell className={getFrequencyColor(studentRecordWithoutJustified.percentualFrequencia)}>
                                            {studentRecordWithoutJustified.percentualFrequencia}%
                                        </TableCell>
                                        <TableCell className="text-center">{studentRecordWithoutJustified.diasLetivosAnual}</TableCell>
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