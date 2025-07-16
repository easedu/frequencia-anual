import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { AbsenceRecord, Atestado, BimesterDates } from "../app/types";
import { getBimesterByDate } from "../app/utils";
import { Calendar, FileText, Clock, User, CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface RegisteredAbsencesCardProps {
    absences: AbsenceRecord[];
    atestados: Atestado[];
    bimesterDates: BimesterDates;
}

interface BimestreAbsencesProps {
    title: string;
    bimester: number;
    absences: AbsenceRecord[];
    atestados: Atestado[];
    bimesterDates: BimesterDates;
}

const BimestreAbsences: React.FC<BimestreAbsencesProps> = ({ title, bimester, absences, atestados, bimesterDates }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const filteredAbsences = absences.filter((absence) => getBimesterByDate(absence.data, bimesterDates) === bimester);
    const justifiedCount = filteredAbsences.filter(absence => absence.justified).length;
    const unjustifiedCount = filteredAbsences.length - justifiedCount;

    const getBimesterColor = (bimester: number) => {
        const colors = {
            1: "from-blue-500 to-blue-500",
            2: "from-green-500 to-green-500",
            3: "from-orange-500 to-orange-500",
            4: "from-purple-500 to-purple-500"
        };
        return colors[bimester as keyof typeof colors] || "from-gray-400 to-gray-500";
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return dateString;

        try {
            let date: Date;

            // Verificar se a string já está no formato dd/mm/yyyy
            if (dateString.includes('/')) {
                const parts = dateString.split('/');
                if (parts.length === 3) {
                    // Assumir que pode estar em formato dd/mm/yyyy ou mm/dd/yyyy
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]);
                    const year = parseInt(parts[2]);

                    // Se o primeiro número é maior que 12, assumir que está em dd/mm/yyyy
                    if (day > 12) {
                        date = new Date(year, month - 1, day);
                    }
                    // Se o segundo número é maior que 12, assumir que está em mm/dd/yyyy
                    else if (month > 12) {
                        date = new Date(year, day - 1, month);
                    }
                    // Se ambos são <= 12, tentar detectar pelo contexto ou assumir dd/mm/yyyy
                    else {
                        // Assumir dd/mm/yyyy como padrão brasileiro
                        date = new Date(year, month - 1, day);
                    }
                } else {
                    // Fallback para new Date se o formato não for reconhecido
                    date = new Date(dateString);
                }
            }
            // Verificar se está no formato ISO (yyyy-mm-dd ou yyyy-mm-ddThh:mm:ss)
            else if (dateString.includes('-')) {
                date = new Date(dateString);
            }
            // Outros formatos
            else {
                date = new Date(dateString);
            }

            // Verificar se a data é válida
            if (isNaN(date.getTime())) {
                console.warn("Data inválida:", dateString);
                return dateString;
            }

            // Sempre retornar no formato dd/mm/yyyy
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();

            return `${day}/${month}/${year}`;
        } catch (error) {
            console.error("Erro ao formatar a data:", error, "Data original:", dateString);
            return dateString;
        }
    };

    return (
        <div className="space-y-4">
            {/* Header do Bimestre - Clicável */}
            <div
                className={`relative ${filteredAbsences.length > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={() => filteredAbsences.length > 0 && setIsExpanded(!isExpanded)}
            >
                <div className={`bg-gradient-to-r ${getBimesterColor(bimester)} rounded-lg p-3 text-white shadow-lg transition-all duration-200 ${filteredAbsences.length > 0 ? 'hover:shadow-xl' : ''
                    } ${isExpanded ? 'ring-2 ring-white/30' : ''} min-h-[100px] flex flex-col justify-between`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className="transition-transform duration-200">
                                {filteredAbsences.length > 0 ? (
                                    isExpanded ? (
                                        <ChevronDown className="w-4 h-4" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4" />
                                    )
                                ) : (
                                    <div className="w-4 h-4" />
                                )}
                            </div>
                            <h3 className="font-bold text-base">{title}</h3>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm font-medium">{filteredAbsences.length} faltas</span>
                        </div>
                    </div>

                    {/* Seção de estatísticas - sempre presente para manter altura */}
                    <div className="mt-2 min-h-[16px]">
                        {filteredAbsences.length > 0 ? (
                            <div className="flex space-x-4 font-bold text-xs">
                                <div className="flex items-center space-x-1">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>{justifiedCount} justificadas</span>
                                </div>
                                <div className="flex items-center font-bold space-x-1">
                                    <XCircle className="w-3 h-3" />
                                    <span>{unjustifiedCount} não justificadas</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs font-bold text-white/70">
                                Nenhuma falta registrada
                            </div>
                        )}
                    </div>

                    {/* Indicador de clique - sempre presente para manter altura */}
                    <div className="mt-2 text-xs text-white/70 flex items-center font-bold space-x-1 min-h-[16px]">
                        {filteredAbsences.length > 0 ? (
                            <span>Clique para {isExpanded ? 'recolher' : 'expandir'} detalhes</span>
                        ) : (
                            <span>Sem faltas para exibir</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Lista de Faltas - Expansível */}
            <div className={`transition-all duration-300 ${isExpanded ? 'max-h-none opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                }`}>
                <div className="space-y-2">
                    {filteredAbsences.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm">Nenhuma falta registrada</p>
                        </div>
                    ) : (
                        filteredAbsences.map((absence, index) => (
                            <TooltipProvider key={index}>
                                <Tooltip>
                                    <div className={`group relative bg-white rounded-lg border-2 p-3 transition-all duration-200 hover:shadow-md ${absence.justified
                                        ? 'border-green-200 hover:border-green-300 bg-green-50'
                                        : 'border-red-200 hover:border-red-300 bg-red-50'
                                        }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-3 h-3 rounded-full ${absence.justified ? 'bg-green-500' : 'bg-red-500'
                                                    }`} />
                                                <div>
                                                    <p className="font-medium text-gray-900 text-sm">
                                                        {formatDate(absence.data)}
                                                    </p>
                                                </div>
                                            </div>

                                            {absence.justified && (
                                                <TooltipTrigger asChild>
                                                    <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer">
                                                        <FileText className="w-3 h-3 mr-1" />
                                                        Atestado
                                                    </Badge>
                                                </TooltipTrigger>
                                            )}
                                        </div>
                                    </div>

                                    {absence.justified && absence.atestadoId && (
                                        <TooltipContent className="p-4 max-w-[300px] bg-white border shadow-xl">
                                            <div className="space-y-2">
                                                <div className="flex items-center space-x-2 text-green-600 font-medium">
                                                    <FileText className="w-4 h-4" />
                                                    <span>Detalhes do Atestado</span>
                                                </div>

                                                <div className="space-y-1 text-sm">
                                                    <div className="flex items-start space-x-2">
                                                        <span className="font-medium text-gray-600 min-w-[60px]">Descrição:</span>
                                                        <span className="text-gray-900">
                                                            {atestados.find(a => a.id === absence.atestadoId)?.description || 'Sem descrição'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        <Calendar className="w-3 h-3 text-gray-500" />
                                                        <span className="font-medium text-gray-600">Início:</span>
                                                        <span className="text-gray-900">
                                                            {formatDate(atestados.find(a => a.id === absence.atestadoId)?.startDate || 'Não informado')}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        <Clock className="w-3 h-3 text-gray-500" />
                                                        <span className="font-medium text-gray-600">Dias:</span>
                                                        <span className="text-gray-900">
                                                            {atestados.find(a => a.id === absence.atestadoId)?.days || 'Não informado'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        <User className="w-3 h-3 text-gray-500" />
                                                        <span className="font-medium text-gray-600">Adicionado por:</span>
                                                        <span className="text-gray-900">
                                                            {atestados.find(a => a.id === absence.atestadoId)?.createdBy || 'Não informado'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default function RegisteredAbsencesCard({ absences, atestados, bimesterDates }: RegisteredAbsencesCardProps) {
    const totalAbsences = absences.length;
    const justifiedAbsences = absences.filter(absence => absence.justified).length;
    const unjustifiedAbsences = totalAbsences - justifiedAbsences;

    return (
        <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-indigo-400 to-purple-500 text-white rounded-t-lg py-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center space-x-2">
                        <Calendar className="w-5 h-5" />
                        <span>Faltas Registradas</span>
                    </CardTitle>

                    {totalAbsences > 0 && (
                        <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1 text-green-200">
                                <CheckCircle className="w-4 h-4" />
                                <span className="font-medium">{justifiedAbsences}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-red-200">
                                <XCircle className="w-4 h-4" />
                                <span className="font-medium">{unjustifiedAbsences}</span>
                            </div>
                            <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                                Total: {totalAbsences}
                            </Badge>
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-6">
                {absences.length > 0 && Object.keys(bimesterDates).length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                        <BimestreAbsences title="1º Bimestre" bimester={1} absences={absences} atestados={atestados} bimesterDates={bimesterDates} />
                        <BimestreAbsences title="2º Bimestre" bimester={2} absences={absences} atestados={atestados} bimesterDates={bimesterDates} />
                        <BimestreAbsences title="3º Bimestre" bimester={3} absences={absences} atestados={atestados} bimesterDates={bimesterDates} />
                        <BimestreAbsences title="4º Bimestre" bimester={4} absences={absences} atestados={atestados} bimesterDates={bimesterDates} />
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium text-gray-600 mb-2">Nenhuma falta registrada</p>
                        <p className="text-sm text-gray-500">
                            {Object.keys(bimesterDates).length === 0
                                ? 'Períodos de bimestre não carregados'
                                : 'Todas as presenças estão em dia'}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}