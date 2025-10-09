import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { StudentRecord } from "@/types";
import { getFrequencyColor } from "../app/utils";
import { CheckCircle, TrendingUp, Users, UserCheck } from "lucide-react";

interface FrequencyNoJustifiedCardProps {
    studentRecordWithoutJustified: StudentRecord | null;
}

export default function FrequencyNoJustifiedCard({ studentRecordWithoutJustified }: FrequencyNoJustifiedCardProps) {
    return (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50">
            <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-t-lg py-3">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                    <UserCheck className="w-5 h-5" />
                    Frequência (Excluindo Faltas Justificadas)
                </CardTitle>
            </CardHeader>

            <CardContent className="p-4">
                {studentRecordWithoutJustified && (
                    <div className="space-y-4">
                        {/* Resumo Compacto */}
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-100">
                            <div className="grid grid-cols-4 gap-3">
                                <div className="text-center">
                                    <p className="text-xs text-gray-600 mb-1">Faltas</p>
                                    <p className="text-lg font-bold text-red-600">{studentRecordWithoutJustified.totalFaltasAteHoje}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-600 mb-1">% Faltas</p>
                                    <p className="text-lg font-bold text-orange-600">{studentRecordWithoutJustified.percentualFaltasAteHoje}%</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-600 mb-1">% Frequência</p>
                                    <p className={`text-lg font-bold ${getFrequencyColor(studentRecordWithoutJustified.percentualFrequenciaAteHoje)}`}>
                                        {studentRecordWithoutJustified.percentualFrequenciaAteHoje}%
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-600 mb-1">Dias Letivos</p>
                                    <p className="text-lg font-bold text-blue-600">{studentRecordWithoutJustified.diasLetivosAteHoje}</p>
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
                                        <TableRow className="hover:bg-emerald-50/50 transition-colors">
                                            <TableCell className="font-medium py-2 px-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                    1º Bim
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-medium text-sm">{studentRecordWithoutJustified.faltasB1}</TableCell>
                                            <TableCell className="text-center py-2 font-medium text-orange-600 text-sm">
                                                {studentRecordWithoutJustified.diasLetivosB1 ? Number((studentRecordWithoutJustified.faltasB1 / studentRecordWithoutJustified.diasLetivosB1 * 100).toFixed(1)) : 0}%
                                            </TableCell>
                                            <TableCell className={`text-center py-2 font-bold text-sm ${getFrequencyColor(studentRecordWithoutJustified.diasLetivosB1 ? Number((100 - (studentRecordWithoutJustified.faltasB1 / studentRecordWithoutJustified.diasLetivosB1 * 100)).toFixed(1)) : 100)}`}>
                                                {studentRecordWithoutJustified.diasLetivosB1 ? Number((100 - (studentRecordWithoutJustified.faltasB1 / studentRecordWithoutJustified.diasLetivosB1 * 100)).toFixed(1)) : 100}%
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-medium text-sm">{studentRecordWithoutJustified.diasLetivosB1}</TableCell>
                                        </TableRow>

                                        <TableRow className="hover:bg-emerald-50/50 transition-colors">
                                            <TableCell className="font-medium py-2 px-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                    2º Bim
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-medium text-sm">{studentRecordWithoutJustified.faltasB2}</TableCell>
                                            <TableCell className="text-center py-2 font-medium text-orange-600 text-sm">
                                                {studentRecordWithoutJustified.diasLetivosB2 ? Number((studentRecordWithoutJustified.faltasB2 / studentRecordWithoutJustified.diasLetivosB2 * 100).toFixed(1)) : 0}%
                                            </TableCell>
                                            <TableCell className={`text-center py-2 font-bold text-sm ${getFrequencyColor(studentRecordWithoutJustified.diasLetivosB2 ? Number((100 - (studentRecordWithoutJustified.faltasB2 / studentRecordWithoutJustified.diasLetivosB2 * 100)).toFixed(1)) : 100)}`}>
                                                {studentRecordWithoutJustified.diasLetivosB2 ? Number((100 - (studentRecordWithoutJustified.faltasB2 / studentRecordWithoutJustified.diasLetivosB2 * 100)).toFixed(1)) : 100}%
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-medium text-sm">{studentRecordWithoutJustified.diasLetivosB2}</TableCell>
                                        </TableRow>

                                        <TableRow className="hover:bg-emerald-50/50 transition-colors">
                                            <TableCell className="font-medium py-2 px-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                                    3º Bim
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-medium text-sm">{studentRecordWithoutJustified.faltasB3}</TableCell>
                                            <TableCell className="text-center py-2 font-medium text-orange-600 text-sm">
                                                {studentRecordWithoutJustified.diasLetivosB3 ? Number((studentRecordWithoutJustified.faltasB3 / studentRecordWithoutJustified.diasLetivosB3 * 100).toFixed(1)) : 0}%
                                            </TableCell>
                                            <TableCell className={`text-center py-2 font-bold text-sm ${getFrequencyColor(studentRecordWithoutJustified.diasLetivosB3 ? Number((100 - (studentRecordWithoutJustified.faltasB3 / studentRecordWithoutJustified.diasLetivosB3 * 100)).toFixed(1)) : 100)}`}>
                                                {studentRecordWithoutJustified.diasLetivosB3 ? Number((100 - (studentRecordWithoutJustified.faltasB3 / studentRecordWithoutJustified.diasLetivosB3 * 100)).toFixed(1)) : 100}%
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-medium text-sm">{studentRecordWithoutJustified.diasLetivosB3}</TableCell>
                                        </TableRow>

                                        <TableRow className="hover:bg-emerald-50/50 transition-colors">
                                            <TableCell className="font-medium py-2 px-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                                    4º Bim
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-medium text-sm">{studentRecordWithoutJustified.faltasB4}</TableCell>
                                            <TableCell className="text-center py-2 font-medium text-orange-600 text-sm">
                                                {studentRecordWithoutJustified.diasLetivosB4 ? Number((studentRecordWithoutJustified.faltasB4 / studentRecordWithoutJustified.diasLetivosB4 * 100).toFixed(1)) : 0}%
                                            </TableCell>
                                            <TableCell className={`text-center py-2 font-bold text-sm ${getFrequencyColor(studentRecordWithoutJustified.diasLetivosB4 ? Number((100 - (studentRecordWithoutJustified.faltasB4 / studentRecordWithoutJustified.diasLetivosB4 * 100)).toFixed(1)) : 100)}`}>
                                                {studentRecordWithoutJustified.diasLetivosB4 ? Number((100 - (studentRecordWithoutJustified.faltasB4 / studentRecordWithoutJustified.diasLetivosB4 * 100)).toFixed(1)) : 100}%
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-medium text-sm">{studentRecordWithoutJustified.diasLetivosB4}</TableCell>
                                        </TableRow>

                                        {/* Total Anual */}
                                        <TableRow className="bg-gradient-to-r from-teal-50 to-emerald-50 border-t-2 border-teal-200">
                                            <TableCell className="font-bold py-2 px-3 text-teal-900 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="w-3 h-3 text-teal-600" />
                                                    TOTAL
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-bold text-red-700 text-sm">{studentRecordWithoutJustified.totalFaltas}</TableCell>
                                            <TableCell className="text-center py-2 font-bold text-orange-700 text-sm">{studentRecordWithoutJustified.percentualFaltas}%</TableCell>
                                            <TableCell className={`text-center py-2 font-bold text-sm ${getFrequencyColor(studentRecordWithoutJustified.percentualFrequencia)}`}>
                                                {studentRecordWithoutJustified.percentualFrequencia}%
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-bold text-blue-700 text-sm">{studentRecordWithoutJustified.diasLetivosAnual}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Info Footer Compacto */}
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-100">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                <p className="text-xs text-emerald-700">
                                    Frequência mínima: 75% • Dados excluem faltas justificadas
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}