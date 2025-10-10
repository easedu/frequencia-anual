import { memo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { AbsenceRecord, Atestado, Suspensao, BimesterDates } from "@/types";
import { getBimesterByDate } from "@/app/utils";
import { Calendar, FileText, Clock, User, CheckCircle, XCircle, ChevronDown, ChevronRight, Trash2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { db } from "@/firebase.config";
import { collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { FIREBASE_PATHS } from "@/config/constants";
import { logger } from "@/utils/logger";

interface RegisteredAbsencesCardProps {
    absences: AbsenceRecord[];
    atestados: Atestado[];
    suspensoes: Suspensao[];
    bimesterDates: BimesterDates;
    userRole?: string | null;
    onAbsenceDeleted?: () => void;
    selectedStudentId?: string;
}

interface BimestreAbsencesProps {
    title: string;
    bimester: number;
    absences: AbsenceRecord[];
    atestados: Atestado[];
    suspensoes: Suspensao[];
    bimesterDates: BimesterDates;
    userRole?: string | null;
    onAbsenceDeleted?: () => void;
    selectedStudentId?: string;
}

const BimestreAbsences: React.FC<BimestreAbsencesProps> = ({
    title,
    bimester,
    absences,
    atestados,
    suspensoes,
    bimesterDates,
    userRole,
    onAbsenceDeleted,
    selectedStudentId
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredAbsences = absences.filter((absence) => {
        return getBimesterByDate(absence.data, bimesterDates) === bimester;
    });
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
                logger.warn("Data inválida ao formatar", { dateString });
                return dateString;
            }

            // Sempre retornar no formato dd/mm/yyyy
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();

            return `${day}/${month}/${year}`;
        } catch (error) {
            logger.error("Erro ao formatar a data", { dateString }, error as Error);
            return dateString;
        }
    };

    const handleDeleteAbsence = async (absenceDate: string) => {
        if (!selectedStudentId) return;

        setIsDeleting(true);
        try {
            // Converter a data para o formato do Firebase (YYYY-MM-DD)
            const [day, month, year] = absenceDate.split('/');
            const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

            // Buscar o documento da falta no Firestore
            const controleColRef = collection(db, FIREBASE_PATHS.absenceControl());
            const q = query(
                controleColRef,
                where("estudanteId", "==", selectedStudentId),
                where("data", "==", formattedDate)
            );

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast.error("Falta não encontrada no banco de dados.");
                return;
            }

            // Usar batch para deletar todos os registros encontrados (caso haja duplicatas)
            const batch = writeBatch(db);
            querySnapshot.forEach((docSnap) => {
                batch.delete(docSnap.ref);
            });

            await batch.commit();

            toast.success("Falta removida com sucesso!");

            // Chamar callback para atualizar os dados
            if (onAbsenceDeleted) {
                onAbsenceDeleted();
            }
        } catch (error) {
            logger.error("Erro ao remover falta", { absenceDate, studentId: selectedStudentId }, error as Error);
            toast.error("Erro ao remover falta. Tente novamente.");
        } finally {
            setIsDeleting(false);
            setShowDeleteDialog(null);
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

                                            <div className="flex items-center space-x-2">
                                                {absence.justified && absence.atestadoId && (
                                                    <TooltipTrigger asChild>
                                                        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer">
                                                            <FileText className="w-3 h-3 mr-1" />
                                                            Atestado
                                                        </Badge>
                                                    </TooltipTrigger>
                                                )}

                                                {!absence.justified && absence.suspensaoId && (
                                                    <TooltipTrigger asChild>
                                                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200 cursor-pointer">
                                                            <AlertCircle className="w-3 h-3 mr-1" />
                                                            Suspensão
                                                        </Badge>
                                                    </TooltipTrigger>
                                                )}

                                                {/* Botão de remoção - apenas para administradores */}
                                                {userRole === "admin" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => setShowDeleteDialog(absence.data)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
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

                                    {!absence.justified && absence.suspensaoId && (
                                        <TooltipContent className="p-4 max-w-[300px] bg-white border shadow-xl">
                                            <div className="space-y-2">
                                                <div className="flex items-center space-x-2 text-orange-600 font-medium">
                                                    <AlertCircle className="w-4 h-4" />
                                                    <span>Detalhes da Suspensão</span>
                                                </div>

                                                <div className="space-y-1 text-sm">
                                                    <div className="flex items-start space-x-2">
                                                        <span className="font-medium text-gray-600 min-w-[60px]">Descrição:</span>
                                                        <span className="text-gray-900">
                                                            {suspensoes.find(s => s.id === absence.suspensaoId)?.description || 'Sem descrição'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        <Calendar className="w-3 h-3 text-gray-500" />
                                                        <span className="font-medium text-gray-600">Início:</span>
                                                        <span className="text-gray-900">
                                                            {formatDate(suspensoes.find(s => s.id === absence.suspensaoId)?.startDate || 'Não informado')}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        <Clock className="w-3 h-3 text-gray-500" />
                                                        <span className="font-medium text-gray-600">Dias:</span>
                                                        <span className="text-gray-900">
                                                            {suspensoes.find(s => s.id === absence.suspensaoId)?.days || 'Não informado'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        <User className="w-3 h-3 text-gray-500" />
                                                        <span className="font-medium text-gray-600">Adicionado por:</span>
                                                        <span className="text-gray-900">
                                                            {suspensoes.find(s => s.id === absence.suspensaoId)?.createdBy || 'Não informado'}
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

            {/* Dialog de Confirmação de Exclusão */}
            <Dialog open={showDeleteDialog !== null} onOpenChange={() => setShowDeleteDialog(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2 text-red-600">
                            <AlertCircle className="w-5 h-5" />
                            <span>Confirmar Remoção</span>
                        </DialogTitle>
                        <DialogDescription className="text-gray-600">
                            Tem certeza de que deseja remover a falta do dia {showDeleteDialog ? formatDate(showDeleteDialog) : ''}?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <div className="flex items-start space-x-2">
                            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-800">
                                <p className="font-medium mb-1">Atenção:</p>
                                <p>Esta ação não pode ser desfeita. A falta será removida permanentemente do sistema.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(null)}
                            disabled={isDeleting}
                            className="border-gray-300 hover:bg-gray-50"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => showDeleteDialog && handleDeleteAbsence(showDeleteDialog)}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDeleting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Removendo...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Remover Falta
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const RegisteredAbsencesCard = memo(function RegisteredAbsencesCard({
    absences,
    atestados,
    suspensoes,
    bimesterDates,
    userRole,
    onAbsenceDeleted,
    selectedStudentId
}: RegisteredAbsencesCardProps) {
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
                        <BimestreAbsences
                            title="1º Bimestre"
                            bimester={1}
                            absences={absences}
                            atestados={atestados}
                            suspensoes={suspensoes}
                            bimesterDates={bimesterDates}
                            userRole={userRole}
                            onAbsenceDeleted={onAbsenceDeleted}
                            selectedStudentId={selectedStudentId}
                        />
                        <BimestreAbsences
                            title="2º Bimestre"
                            bimester={2}
                            absences={absences}
                            atestados={atestados}
                            suspensoes={suspensoes}
                            bimesterDates={bimesterDates}
                            userRole={userRole}
                            onAbsenceDeleted={onAbsenceDeleted}
                            selectedStudentId={selectedStudentId}
                        />
                        <BimestreAbsences
                            title="3º Bimestre"
                            bimester={3}
                            absences={absences}
                            atestados={atestados}
                            suspensoes={suspensoes}
                            bimesterDates={bimesterDates}
                            userRole={userRole}
                            onAbsenceDeleted={onAbsenceDeleted}
                            selectedStudentId={selectedStudentId}
                        />
                        <BimestreAbsences
                            title="4º Bimestre"
                            bimester={4}
                            absences={absences}
                            atestados={atestados}
                            suspensoes={suspensoes}
                            bimesterDates={bimesterDates}
                            userRole={userRole}
                            onAbsenceDeleted={onAbsenceDeleted}
                            selectedStudentId={selectedStudentId}
                        />
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
});

export default RegisteredAbsencesCard;