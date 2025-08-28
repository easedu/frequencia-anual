import React from 'react';
import { Edit, ChevronUp, ChevronDown, Mail, Phone, MapPin, User, Calendar, Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { Estudante, Contato } from '@/types';
import { formatTelefone, formatCep, formatDataNascimento } from '../utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StudentTableProps {
    currentRecords: Estudante[];
    visibleColumns: Set<string>;
    sortColumn: string;
    sortDirection: "asc" | "desc";
    handleSort: (column: string) => void;
    setEditingEstudante: (estudante: Estudante) => void;
    setEditingIndex: (index: number) => void;
    setOpenModal: (open: boolean) => void;
    students: Estudante[];
}

export function StudentTable({
    currentRecords,
    visibleColumns,
    sortColumn,
    sortDirection,
    handleSort,
    setEditingEstudante,
    setEditingIndex,
    setOpenModal,
    students,
}: StudentTableProps) {

    const getStatusBadge = (status: string) => {
        return status === "ATIVO" ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                ATIVO
            </Badge>
        ) : (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">
                <XCircle className="w-3 h-3 mr-1" />
                INATIVO
            </Badge>
        );
    };

    const getTurnoBadge = (turno: string) => {
        return turno === "MANHÃ" ? (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                <Clock className="w-3 h-3 mr-1" />
                MANHÃ
            </Badge>
        ) : (
            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                <Clock className="w-3 h-3 mr-1" />
                TARDE
            </Badge>
        );
    };

    const getBolsaFamiliaBadge = (bolsa: string) => {
        return bolsa === "SIM" ? (
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800">
                <DollarSign className="w-3 h-3 mr-1" />
                SIM
            </Badge>
        ) : (
            <Badge variant="outline" className="text-slate-600 dark:text-slate-400">
                NÃO
            </Badge>
        );
    };

    const SortHeader = ({ column, children, className = "" }: { column: string; children: React.ReactNode; className?: string }) => (
        <th
            className={`px-6 py-4 text-left font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-all duration-200 ${className}`}
            onClick={() => handleSort(column)}
        >
            <div className="flex items-center space-x-2">
                <span>{children}</span>
                {sortColumn === column && (
                    sortDirection === "asc" ?
                        <ChevronUp className="w-4 h-4 text-blue-500" /> :
                        <ChevronDown className="w-4 h-4 text-blue-500" />
                )}
            </div>
        </th>
    );

    if (currentRecords.length === 0) {
        return (
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-slate-700/20 overflow-hidden">
                <div className="p-16 text-center">
                    <div className="w-24 h-24 mx-auto mb-6 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                        <User className="w-12 h-12 text-slate-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                        Nenhum estudante encontrado
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-lg">
                        Ajuste os filtros para encontrar os estudantes desejados
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-slate-700/20 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 px-8 py-6 border-b border-slate-200/50 dark:border-slate-600/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-green-500/20 rounded-2xl">
                            <User className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                Lista de Estudantes
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 mt-1">
                                {currentRecords.length} estudante{currentRecords.length !== 1 ? 's' : ''} encontrado{currentRecords.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm">
                        <tr>
                            {visibleColumns.has("turma") && (
                                <SortHeader column="turma">
                                    <div className="flex items-center">
                                        🏫 <span className="ml-2">Turma</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("nome") && (
                                <SortHeader column="nome">
                                    <div className="flex items-center">
                                        👤 <span className="ml-2">Nome</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("matricula") && (
                                <SortHeader column="matricula">
                                    <div className="flex items-center">
                                        🎓 <span className="ml-2">Matrícula</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("dataNascimento") && (
                                <SortHeader column="dataNascimento">
                                    <div className="flex items-center">
                                        📅 <span className="ml-2">Nascimento</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("turno") && (
                                <SortHeader column="turno">
                                    <div className="flex items-center">
                                        ⏰ <span className="ml-2">Turno</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("bolsaFamilia") && (
                                <SortHeader column="bolsaFamilia">
                                    <div className="flex items-center">
                                        💰 <span className="ml-2">Bolsa Família</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("status") && (
                                <SortHeader column="status">
                                    <div className="flex items-center">
                                        ✅ <span className="ml-2">Status</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("contatos") && (
                                <SortHeader column="contatos">
                                    <div className="flex items-center">
                                        📞 <span className="ml-2">Contatos</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("email") && (
                                <SortHeader column="email">
                                    <div className="flex items-center">
                                        ✉️ <span className="ml-2">E-mail</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("endereco") && (
                                <SortHeader column="endereco">
                                    <div className="flex items-center">
                                        🏠 <span className="ml-2">Endereço</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("deficiencia") && (
                                <SortHeader column="deficiencia">
                                    <div className="flex items-center">
                                        ♿ <span className="ml-2">Deficiência</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("provaSaoPaulo") && (
                                <SortHeader column="provaSaoPaulo">
                                    <div className="flex items-center">
                                        📊 <span className="ml-2">Prova SP</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("actions") && (
                                <th className="px-6 py-4 text-left font-semibold text-slate-700 dark:text-slate-200">
                                    <div className="flex items-center">
                                        ⚙️ <span className="ml-2">Ações</span>
                                    </div>
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-600/50">
                        {currentRecords.map((est: Estudante, index: number) => (
                            <tr key={est.estudanteId || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-all duration-200">
                                {visibleColumns.has("turma") && (
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mr-3">
                                                <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                                                    {est.turma.slice(0, 2)}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("nome") && (
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div>
                                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {est.nome}
                                                </div>
                                                {est.matricula && (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                        Mat: {est.matricula}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("matricula") && (
                                    <td className="px-6 py-4">
                                        <div className="text-center">
                                            {est.matricula ? (
                                                <Badge variant="outline" className="bg-slate-100 dark:bg-slate-700">
                                                    {est.matricula}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500 text-sm">
                                                    Não informada
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("dataNascimento") && (
                                    <td className="px-6 py-4">
                                        <div className="text-center">
                                            {est.dataNascimento ? (
                                                <div className="flex items-center justify-center">
                                                    <Calendar className="w-4 h-4 mr-2 text-slate-500" />
                                                    <span className="text-slate-700 dark:text-slate-300">
                                                        {formatDataNascimento(est.dataNascimento)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500 text-sm">
                                                    Não informada
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("turno") && (
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center">
                                            {getTurnoBadge(est.turno)}
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("bolsaFamilia") && (
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center">
                                            {getBolsaFamiliaBadge(est.bolsaFamilia)}
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("status") && (
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center">
                                            {getStatusBadge(est.status)}
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("contatos") && (
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            {est.contatos && est.contatos.length > 0 ? (
                                                est.contatos.slice(0, 2).map((contato: Contato, i: number) => (
                                                    <div key={i} className="flex items-center text-sm">
                                                        <Phone className="w-3 h-3 mr-2 text-slate-500" />
                                                        <span className="text-slate-700 dark:text-slate-300 truncate">
                                                            {contato.nome}: {formatTelefone(contato.telefone)}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500 text-sm">
                                                    Nenhum contato
                                                </span>
                                            )}
                                            {est.contatos && est.contatos.length > 2 && (
                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                    +{est.contatos.length - 2} mais
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("email") && (
                                    <td className="px-6 py-4">
                                        <div className="text-center">
                                            {est.email ? (
                                                <div className="flex items-center justify-center">
                                                    <Mail className="w-4 h-4 mr-2 text-slate-500" />
                                                    <span className="text-slate-700 dark:text-slate-300 truncate max-w-48">
                                                        {est.email}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500 text-sm">
                                                    Não informado
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("endereco") && (
                                    <td className="px-6 py-4">
                                        <div className="text-center">
                                            {est.endereco ? (
                                                <div className="flex items-center justify-center">
                                                    <MapPin className="w-4 h-4 mr-2 text-slate-500 flex-shrink-0" />
                                                    <span className="text-slate-700 dark:text-slate-300 text-sm truncate max-w-48">
                                                        {est.endereco.rua}, {est.endereco.numero}
                                                        {est.endereco.complemento && `, ${est.endereco.complemento}`}
                                                        <br />
                                                        {est.endereco.bairro}, {est.endereco.cidade}-{est.endereco.estado}
                                                        <br />
                                                        {formatCep(est.endereco.cep)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500 text-sm">
                                                    Não informado
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("deficiencia") && (
                                    <td className="px-6 py-4">
                                        <div className="text-center">
                                            {est.deficiencia?.estudanteComDeficiencia ? (
                                                <div className="space-y-1">
                                                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">
                                                        ♿ SIM
                                                    </Badge>
                                                    {est.deficiencia.tipoDeficiencia && est.deficiencia.tipoDeficiencia.length > 0 && (
                                                        <div className="text-xs text-slate-600 dark:text-slate-400">
                                                            {est.deficiencia.tipoDeficiencia.join(", ")}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="text-slate-600 dark:text-slate-400">
                                                    NÃO
                                                </Badge>
                                            )}
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("provaSaoPaulo") && (
                                    <td className="px-6 py-4">
                                        <div className="text-center">
                                            {est.provaSaoPaulo && est.provaSaoPaulo.length > 0 ? (
                                                <div className="space-y-1">
                                                    {est.provaSaoPaulo.slice(0, 2).map((prova, i) => (
                                                        <div key={i} className="text-xs">
                                                            <Badge variant="outline" className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400">
                                                                {prova.edicao}: {prova.mediaAluno}
                                                            </Badge>
                                                            <div className="text-slate-500 dark:text-slate-400">
                                                                {prova.nivelProficiencia}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {est.provaSaoPaulo.length > 2 && (
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                                            +{est.provaSaoPaulo.length - 2} mais
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500 text-sm">
                                                    Nenhuma prova
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("actions") && (
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const globalIndex = students.findIndex(
                                                        (item) =>
                                                            item.turma === est.turma &&
                                                            item.nome === est.nome &&
                                                            item.status === est.status &&
                                                            item.bolsaFamilia === est.bolsaFamilia &&
                                                            item.estudanteId === est.estudanteId
                                                    );
                                                    setEditingEstudante(est);
                                                    setEditingIndex(globalIndex);
                                                    setOpenModal(true);
                                                }}
                                                className="hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl p-2 transition-all duration-200"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}