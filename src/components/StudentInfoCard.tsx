import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Student } from "../app/types";
import { formatAddress, formatPhoneNumber, formatDataNascimento } from "../app/utils";
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
    DollarSign
} from "lucide-react";

interface StudentInfoCardProps {
    student: Student;
}

export default function StudentInfoCard({ student }: StudentInfoCardProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ATIVO': return 'bg-green-100 text-green-800 border-green-200';
            case 'INATIVO': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getTurnoColor = (turno: string) => {
        switch (turno) {
            case 'MANHÃ': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'TARDE': return 'bg-orange-100 text-orange-800 border-orange-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getBolsaFamiliaColor = (bolsa: string) => {
        switch (bolsa) {
            case 'SIM': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'NÃO': return 'bg-gray-100 text-gray-600 border-gray-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
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

                    {/* Grid compacto - 6 colunas em telas médias */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
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

                    {/* Linha 2: Contatos em linha horizontal */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Phone className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-semibold text-gray-700">Contatos</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {student.contatos && student.contatos.length > 0 ? (
                                student.contatos.map((contato, index) => (
                                    <div key={index} className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded text-xs">
                                        <Phone className="w-3 h-3 text-green-600 flex-shrink-0" />
                                        <span className="font-medium text-gray-900">{contato.nome}:</span>
                                        <span className="text-gray-600">{formatPhoneNumber(contato.telefone)}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500">Nenhum contato cadastrado</p>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}