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
import { Calendar, CheckCircle, TrendingUp, Users } from "lucide-react";

interface FrequencyAllAbsencesCardProps {
    studentRecord: StudentRecord | null;
}

export default function FrequencyAllAbsencesCard({ studentRecord }: FrequencyAllAbsencesCardProps) {
    return (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-t-lg py-3">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                    <Calendar className="w-5 h-5" />
                    Frequência Escolar
                </CardTitle>
            </CardHeader>

            <CardContent className="p-4">
                {studentRecord && (
                    <div className="space-y-4">
                        {/* Resumo Compacto */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                            <div className="grid grid-cols-4 gap-3">
                                <div className="text-center">
                                    <p className="text-xs text-gray-600 mb-1">Faltas</p>
                                    <p className="text-lg font-bold text-red-600">{studentRecord.totalFaltasAteHoje}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-600 mb-1">% Faltas</p>
                                    <p className="text-lg font-bold text-orange-600">{studentRecord.percentualFaltasAteHoje}%</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-600 mb-1">% Frequência</p>
                                    <p className={`text-lg font-bold ${getFrequencyColor(studentRecord.percentualFrequenciaAteHoje)}`}>
                                        {studentRecord.percentualFrequenciaAteHoje}%
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-600 mb-1">Dias Letivos</p>
                                    <p className="text-lg font-bold text-blue-600">{studentRecord.diasLetivosAteHoje}</p>
                                </div>
                            </div>
                        </div>

                        {/* Tabela Compacta */}
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-gray-600" />
                                    Detalhamento por Bimestre
                                </h4>
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50/50">
                                            <TableHead className="font-semibold text-gray-700 py-2 px-3 text-sm">Período</TableHead>
                                            <TableHead className="font-semibold text-gray-700 text-center py-2 text-sm">Faltas</TableHead>
                                            <TableHead className="font-semibold text-gray-700 text-center py-2 text-sm">% Faltas</TableHead>
                                            <TableHead className="font-semibold text-gray-700 text-center py-2 text-sm">% Frequência</TableHead>
                                            <TableHead className="font-semibold text-gray-700 text-center py-2 text-sm">Dias Letivos</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow className="hover:bg-blue-50/50 transition-colors">
                                            <TableCell className="font-medium py-2 px-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                    1º Bim
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-medium text-sm">{studentRecord.faltasB1}</TableCell>
                                            <TableCell className="text-center py-2 font-medium text-orange-600 text-sm">
                                                {studentRecord.diasLetivosB1 ? Number((studentRecord.faltasB1 / studentRecord.diasLetivosB1 * 100).toFixed(1)) : 0}%
                                            </TableCell>
                                            <TableCell className={`text-center py-2 font-bold text-sm ${getFrequencyColor(studentRecord.diasLetivosB1 ? Number((100 - (studentRecord.faltasB1 / studentRecord.diasLetivosB1 * 100)).toFixed(1)) : 100)}`}>
                                                {studentRecord.diasLetivosB1 ? Number((100 - (studentRecord.faltasB1 / studentRecord.diasLetivosB1 * 100)).toFixed(1)) : 100}%
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-medium text-sm">{studentRecord.diasLetivosB1}</TableCell>
                                        </TableRow>

                                        <TableRow className="hover:bg-blue-50/50 transition-colors">
                                            <TableCell className="font-medium py-2 px-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                    2º Bim
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-medium text-sm">{studentRecord.faltasB2}</TableCell>
                                            <TableCell className="text-center py-2 font-medium text-orange-600 text-sm">
                                                {studentRecord.diasLetivosB2 ? Number((studentRecord.faltasB2 / studentRecord.diasLetivosB2 * 100).toFixed(1)) : 0}%
                                            </TableCell>
                                            <TableCell className={`text-center py-2 font-bold text-sm ${getFrequencyColor(studentRecord.diasLetivosB2 ? Number((100 - (studentRecord.faltasB2 / studentRecord.diasLetivosB2 * 100)).toFixed(1)) : 100)}`}>
                                                {studentRecord.diasLetivosB2 ? Number((100 - (studentRecord.faltasB2 / studentRecord.diasLetivosB2 * 100)).toFixed(1)) : 100}%
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-medium text-sm">{studentRecord.diasLetivosB2}</TableCell>
                                        </TableRow>

                                        <TableRow className="hover:bg-blue-50/50 transition-colors">
                                            <TableCell className="font-medium py-2 px-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                                    3º Bim
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-medium text-sm">{studentRecord.faltasB3}</TableCell>
                                            <TableCell className="text-center py-2 font-medium text-orange-600 text-sm">
                                                {studentRecord.diasLetivosB3 ? Number((studentRecord.faltasB3 / studentRecord.diasLetivosB3 * 100).toFixed(1)) : 0}%
                                            </TableCell>
                                            <TableCell className={`text-center py-2 font-bold text-sm ${getFrequencyColor(studentRecord.diasLetivosB3 ? Number((100 - (studentRecord.faltasB3 / studentRecord.diasLetivosB3 * 100)).toFixed(1)) : 100)}`}>
                                                {studentRecord.diasLetivosB3 ? Number((100 - (studentRecord.faltasB3 / studentRecord.diasLetivosB3 * 100)).toFixed(1)) : 100}%
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-medium text-sm">{studentRecord.diasLetivosB3}</TableCell>
                                        </TableRow>

                                        <TableRow className="hover:bg-blue-50/50 transition-colors">
                                            <TableCell className="font-medium py-2 px-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                                    4º Bim
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-medium text-sm">{studentRecord.faltasB4}</TableCell>
                                            <TableCell className="text-center py-2 font-medium text-orange-600 text-sm">
                                                {studentRecord.diasLetivosB4 ? Number((studentRecord.faltasB4 / studentRecord.diasLetivosB4 * 100).toFixed(1)) : 0}%
                                            </TableCell>
                                            <TableCell className={`text-center py-2 font-bold text-sm ${getFrequencyColor(studentRecord.diasLetivosB4 ? Number((100 - (studentRecord.faltasB4 / studentRecord.diasLetivosB4 * 100)).toFixed(1)) : 100)}`}>
                                                {studentRecord.diasLetivosB4 ? Number((100 - (studentRecord.faltasB4 / studentRecord.diasLetivosB4 * 100)).toFixed(1)) : 100}%
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-medium text-sm">{studentRecord.diasLetivosB4}</TableCell>
                                        </TableRow>

                                        {/* Total Anual */}
                                        <TableRow className="bg-gradient-to-r from-indigo-50 to-blue-50 border-t-2 border-indigo-200">
                                            <TableCell className="font-bold py-2 px-3 text-indigo-900 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="w-3 h-3 text-indigo-600" />
                                                    TOTAL
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-bold text-red-700 text-sm">{studentRecord.totalFaltas}</TableCell>
                                            <TableCell className="text-center py-2 font-bold text-orange-700 text-sm">{studentRecord.percentualFaltas}%</TableCell>
                                            <TableCell className={`text-center py-2 font-bold text-sm ${getFrequencyColor(studentRecord.percentualFrequencia)}`}>
                                                {studentRecord.percentualFrequencia}%
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-bold text-blue-700 text-sm">{studentRecord.diasLetivosAnual}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Info Footer Compacto */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <p className="text-xs text-blue-700">
                                    Frequência mínima: 75% • Dados atualizados até hoje
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}