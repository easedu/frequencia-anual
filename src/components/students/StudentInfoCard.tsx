import { memo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Student, StudentRecord, Contato } from "@/types";
import { 
    formatAddress, 
    formatPhoneNumber, 
    formatDataNascimento,
    getStatusColor,
    getTurnoColor,
    getBolsaFamiliaColor,
    getFrequencyBand
} from "@/utils/formatters";
import {
    User,
    GraduationCap,
    CreditCard,
    Shield,
    Clock,
    Calendar,
    Mail,
    MapPin,
    Phone,
    DollarSign,
    Accessibility,
    TrendingUp,
    MessageCircle,
    CheckCircle,
    RotateCcw,
    AlertTriangle
} from "lucide-react";

interface StudentInfoCardProps {
    student: Student;
    studentRecord?: StudentRecord | null;
    studentRecordWithoutJustified?: StudentRecord | null;
    onWhatsAppClick?: (contact: Contato) => void;
    verifiedWhatsAppNumbers?: Set<string>;
    contactVerificationData?: Map<string, { verificationStatus?: string; hasWhatsApp?: boolean }>;
    onRetryVerification?: (contact: Contato) => void;
}

const StudentInfoCard = memo(function StudentInfoCard({
    student,
    studentRecordWithoutJustified,
    onWhatsAppClick,
    verifiedWhatsAppNumbers = new Set(),
    contactVerificationData = new Map(),
    onRetryVerification
}: StudentInfoCardProps) {
    // Calcular faixa de frequência baseada na frequência excluindo faltas justificadas
    const frequencyBandInfo = studentRecordWithoutJustified ? 
        getFrequencyBand(studentRecordWithoutJustified.percentualFrequenciaAteHoje) : 
        null;

    // Helper function to check if phone number is WhatsApp eligible
    const isWhatsAppEligible = (phone: string): boolean => {
        const cleanPhone = phone.replace(/\D/g, '');
        // Check if after removing DDD (first 2 digits), the number starts with 9
        return cleanPhone.length >= 11 && cleanPhone.substring(2, 3) === '9';
    };

    // Helper function to check if number is verified
    const isNumberVerified = (phone: string): boolean => {
        const cleanPhone = phone.replace(/\D/g, '');
        return verifiedWhatsAppNumbers.has(cleanPhone);
    };

    // Helper function to get verification status
    const getVerificationStatus = (phone: string): { status: string; hasWhatsApp: boolean } | null => {
        const cleanPhone = phone.replace(/\D/g, '');
        const data = contactVerificationData.get(cleanPhone);
        if (!data) return null;

        return {
            status: data.verificationStatus || 'verified',
            hasWhatsApp: data.hasWhatsApp || false
        };
    };

    // Helper function to check if retry is needed
    const needsRetry = (phone: string): boolean => {
        const verificationData = getVerificationStatus(phone);
        return verificationData?.status === 'unavailable' || verificationData?.status === 'error';
    };

    return (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50">
            <CardHeader className="bg-gradient-to-r from-blue-400 to-indigo-400 text-white rounded-t-lg py-3">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                    <User className="w-5 h-5" />
                    Informações do Estudante
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                {/* Seção Principal - Compacta */}
                <div className="mb-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                            <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{student.nome}</h3>
                            <p className="text-sm text-gray-600">Estudante</p>
                        </div>
                    </div>

                    {/* Grid compacto - 8 colunas em telas médias para incluir PCD e Faixa */}
                    <div className="grid grid-cols-2 md:grid-cols-8 gap-2 mb-4">
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-1 mb-1">
                                <CreditCard className="w-3 h-3 text-purple-600" />
                                <span className="text-xs font-medium text-gray-600">Matrícula</span>
                            </div>
                            <p className="text-sm font-bold text-gray-900 truncate">{student.matricula || "N/A"}</p>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-1 mb-1">
                                <GraduationCap className="w-3 h-3 text-indigo-600" />
                                <span className="text-xs font-medium text-gray-600">Turma</span>
                            </div>
                            <p className="text-sm font-bold text-gray-900">{student.turma}</p>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-1 mb-1">
                                <Shield className="w-3 h-3 text-green-600" />
                                <span className="text-xs font-medium text-gray-600">Status</span>
                            </div>
                            <Badge className={`${getStatusColor(student.status)} font-semibold text-xs px-2 py-0`}>
                                {student.status}
                            </Badge>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-1 mb-1">
                                <Clock className="w-3 h-3 text-blue-600" />
                                <span className="text-xs font-medium text-gray-600">Turno</span>
                            </div>
                            <Badge className={`${getTurnoColor(student.turno)} font-semibold text-xs px-2 py-0`}>
                                {student.turno}
                            </Badge>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-1 mb-1">
                                <DollarSign className="w-3 h-3 text-emerald-600" />
                                <span className="text-xs font-medium text-gray-600">Bolsa Família</span>
                            </div>
                            <Badge className={`${getBolsaFamiliaColor(student.bolsaFamilia)} font-semibold text-xs px-2 py-0`}>
                                {student.bolsaFamilia}
                            </Badge>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-1 mb-1">
                                <Calendar className="w-3 h-3 text-purple-600" />
                                <span className="text-xs font-medium text-gray-600">Nascimento</span>
                            </div>
                            <p className="text-xs font-medium text-gray-900 truncate">
                                {student.dataNascimento ? formatDataNascimento(student.dataNascimento) : "N/A"}
                            </p>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-1 mb-1">
                                <Accessibility className="w-3 h-3 text-blue-600" />
                                <span className="text-xs font-medium text-gray-600">PCD</span>
                            </div>
                            <Badge className={`${
                                student.deficiencia?.estudanteComDeficiencia 
                                    ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                            } font-semibold text-xs px-2 py-0`}>
                                {student.deficiencia?.estudanteComDeficiencia ? 'SIM' : 'NÃO'}
                            </Badge>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-1 mb-1">
                                <TrendingUp className="w-3 h-3 text-orange-600" />
                                <span className="text-xs font-medium text-gray-600">Frequência</span>
                            </div>
                            {frequencyBandInfo ? (
                                <Badge className={`${frequencyBandInfo.color} font-semibold text-xs px-2 py-0`}>
                                    {frequencyBandInfo.label}
                                </Badge>
                            ) : (
                                <Badge className="bg-gray-100 text-gray-600 border-gray-200 font-semibold text-xs px-2 py-0">
                                    N/A
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                {/* Seção Contato - Otimizada */}
                <div className="space-y-3">
                    {/* Linha 1: E-mail e Endereço */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <Mail className="w-4 h-4 text-red-600" />
                                <span className="text-xs font-semibold text-gray-700">E-mail</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {student.email || "Não informado"}
                            </p>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <MapPin className="w-4 h-4 text-orange-600" />
                                <span className="text-xs font-semibold text-gray-700">Endereço</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                {formatAddress(student.endereco)}
                            </p>
                        </div>
                    </div>

                    {/* Linha 2: Contatos otimizados em linha */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Phone className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-semibold text-gray-700">Contatos</span>
                            {student.contatos && student.contatos.length > 0 && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {student.contatos.length}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {student.contatos && student.contatos.length > 0 ? (
                                student.contatos.map((contato, index) => {
                                    const isEligible = isWhatsAppEligible(contato.telefone);
                                    const isVerified = isNumberVerified(contato.telefone);
                                    const verificationData = getVerificationStatus(contato.telefone);
                                    const showRetry = needsRetry(contato.telefone);

                                    return (
                                        <div key={index} className="group flex items-center gap-2 bg-gray-50 hover:bg-blue-50 px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-200 transition-all duration-200 text-sm">
                                            {/* Nome e número */}
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-medium text-gray-900 truncate">
                                                    {contato.nome}
                                                    {contato.parentesco && (
                                                        <span className="text-xs text-gray-500 ml-1">({contato.parentesco})</span>
                                                    )}:
                                                </span>
                                                <span className="text-gray-600 font-mono text-xs">
                                                    {formatPhoneNumber(contato.telefone)}
                                                </span>

                                                {/* Status badges */}
                                                {isVerified && (
                                                    <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                                                )}

                                                {verificationData?.status === 'unavailable' && (
                                                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs px-1 py-0">
                                                        <AlertTriangle className="w-2 h-2 mr-1" />
                                                        Indisponível
                                                    </Badge>
                                                )}

                                                {verificationData?.status === 'error' && (
                                                    <Badge className="bg-red-100 text-red-800 border-red-200 text-xs px-1 py-0">
                                                        <AlertTriangle className="w-2 h-2 mr-1" />
                                                        Erro
                                                    </Badge>
                                                )}

                                                {verificationData && !verificationData.hasWhatsApp && verificationData.status === 'verified' && (
                                                    <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs px-1 py-0">
                                                        Sem WhatsApp
                                                    </Badge>
                                                )}

                                                {/* Botão copiar (hover) */}
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(contato.telefone)}
                                                    className="text-gray-400 text-gray-600 text-xs"
                                                    title="Copiar número"
                                                >
                                                    📋
                                                </button>
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex items-center gap-1">
                                                {/* Retry verification button */}
                                                {isEligible && showRetry && onRetryVerification && (
                                                    <button
                                                        onClick={() => onRetryVerification(contato)}
                                                        className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 bg-yellow-100 hover:bg-yellow-200 text-yellow-700"
                                                        title="Tentar verificar novamente"
                                                    >
                                                        <RotateCcw className="w-3 h-3" />
                                                    </button>
                                                )}

                                                {/* WhatsApp button compacto */}
                                                {isEligible && onWhatsAppClick && isVerified && (
                                                    <button
                                                        onClick={() => onWhatsAppClick(contato)}
                                                        className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 bg-green-100 hover:bg-green-200 text-green-600"
                                                        title="Enviar WhatsApp (verificado)"
                                                    >
                                                        <MessageCircle className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-4 w-full">
                                    <div className="flex items-center justify-center gap-2 text-gray-500">
                                        <Phone className="w-4 h-4" />
                                        <span className="text-sm">Nenhum contato cadastrado</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

export default StudentInfoCard;