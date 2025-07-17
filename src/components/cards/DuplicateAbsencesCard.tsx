import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    AlertTriangle,
    Trash2,
    FileText,
    Calendar,
    Users,
    Hash,
    CheckCircle,
    Loader2
} from "lucide-react";

interface AbsenceRecord {
    estudanteId: string;
    turma: string;
    data: string;
    docId: string;
    justified: boolean;
}

interface DuplicateAbsencesCardProps {
    duplicateAbsences: AbsenceRecord[];
    removeDuplicateAbsences: () => Promise<void>;
}

export default function DuplicateAbsencesCard({
    duplicateAbsences,
    removeDuplicateAbsences,
}: DuplicateAbsencesCardProps) {
    const [isRemoving, setIsRemoving] = useState(false);

    const handleRemoveDuplicates = async () => {
        setIsRemoving(true);
        try {
            await removeDuplicateAbsences();
        } finally {
            setIsRemoving(false);
        }
    };

    const groupedByStudent = duplicateAbsences.reduce((acc, record) => {
        const key = `${record.estudanteId}-${record.data}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(record);
        return acc;
    }, {} as Record<string, AbsenceRecord[]>);

    return (
        <Card className="border-0 shadow-lg overflow-hidden">
            {/* Header com design moderno */}
            <CardHeader className={`pb-3 ${duplicateAbsences.length > 0 ? 'bg-gradient-to-r from-red-50 to-orange-50' : 'bg-gradient-to-r from-green-50 to-emerald-50'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${duplicateAbsences.length > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                            {duplicateAbsences.length > 0 ? (
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            ) : (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold text-gray-900">
                                Registros Duplicados
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                {duplicateAbsences.length > 0
                                    ? `${duplicateAbsences.length} registro${duplicateAbsences.length !== 1 ? 's' : ''} duplicado${duplicateAbsences.length !== 1 ? 's' : ''} encontrado${duplicateAbsences.length !== 1 ? 's' : ''}`
                                    : "Nenhuma duplicata encontrada"
                                }
                            </p>
                        </div>
                    </div>

                    {duplicateAbsences.length > 0 && (
                        <Badge
                            variant="destructive"
                            className="px-3 py-1 text-sm font-medium"
                        >
                            {duplicateAbsences.length} duplicata{duplicateAbsences.length !== 1 ? 's' : ''}
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-4">
                {duplicateAbsences.length > 0 ? (
                    <div className="space-y-4">
                        {/* Estatísticas rápidas */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <Hash className="h-4 w-4 text-gray-600" />
                                    <span className="text-lg font-bold text-gray-900">
                                        {Object.keys(groupedByStudent).length}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600">Ocorrências únicas</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <Users className="h-4 w-4 text-gray-600" />
                                    <span className="text-lg font-bold text-gray-900">
                                        {new Set(duplicateAbsences.map(r => r.estudanteId)).size}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600">Estudantes afetados</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <Calendar className="h-4 w-4 text-gray-600" />
                                    <span className="text-lg font-bold text-gray-900">
                                        {new Set(duplicateAbsences.map(r => r.data)).size}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600">Datas diferentes</p>
                            </div>
                        </div>

                        {/* Lista de duplicatas agrupadas */}
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {Object.entries(groupedByStudent).map(([key, records]) => (
                                <Card key={key} className="border border-red-200 bg-red-50/50">
                                    <CardContent className="p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {records[0].turma}
                                                </Badge>
                                                <span className="text-sm font-medium text-gray-900">
                                                    ID: {records[0].estudanteId}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                <Calendar className="h-3 w-3" />
                                                {records[0].data}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-gray-700">
                                                Documentos duplicados:
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {records.map((record, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center gap-2 p-2 bg-white rounded border text-xs"
                                                    >
                                                        <FileText className="h-3 w-3 text-gray-400" />
                                                        <span className="font-mono text-gray-600 truncate">
                                                            {record.docId}
                                                        </span>
                                                        {record.justified && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                Justificada
                                                            </Badge>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Botão de ação */}
                        <div className="flex items-center justify-center pt-4 border-t border-gray-100">
                            <Button
                                onClick={handleRemoveDuplicates}
                                disabled={isRemoving}
                                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                                size="lg"
                            >
                                {isRemoving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Removendo...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Remover {duplicateAbsences.length} Duplicata{duplicateAbsences.length !== 1 ? 's' : ''}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Estado vazio */
                    <div className="text-center py-8">
                        <div className="flex items-center justify-center mb-4">
                            <div className="p-3 bg-green-100 rounded-full">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Tudo em ordem!
                        </h3>
                        <p className="text-sm text-gray-600 max-w-md mx-auto">
                            Não foram encontrados registros de faltas duplicados no sistema.
                            Os dados estão consistentes e íntegros.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}