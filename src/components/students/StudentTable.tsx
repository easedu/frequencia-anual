import React, { memo } from 'react';
import { Edit, ChevronUp, ChevronDown, Mail, Phone, MapPin, User, Calendar, Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { Estudante, Contato } from '@/types';
import { formatPhoneNumber, formatCep, formatDate } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Componentes otimizados com React.memo
const StatusBadge = memo(({ status }: { status: string }) => {
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
});
StatusBadge.displayName = 'StatusBadge';

const TurnoBadge = memo(({ turno }: { turno: string }) => {
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
});
TurnoBadge.displayName = 'TurnoBadge';

const BolsaFamiliaBadge = memo(({ bolsa }: { bolsa: string }) => {
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
});
BolsaFamiliaBadge.displayName = 'BolsaFamiliaBadge';

const SortHeader = memo(({
    column,
    children,
    className = "",
    sortColumn,
    sortDirection,
    onSort
}: {
    column: string;
    children: React.ReactNode;
    className?: string;
    sortColumn: string;
    sortDirection: "asc" | "desc";
    onSort: (column: string) => void;
}) => (
    <th
        className={`px-4 py-2.5 text-center text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${className}`}
        onClick={() => onSort(column)}
    >
        <div className="flex items-center justify-center space-x-1.5">
            <span>{children}</span>
            {sortColumn === column && (
                sortDirection === "asc" ?
                    <ChevronUp className="w-3 h-3 text-blue-500" /> :
                    <ChevronDown className="w-3 h-3 text-blue-500" />
            )}
        </div>
    </th>
));
SortHeader.displayName = 'SortHeader';

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

export const StudentTable = memo(function StudentTable({
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

    if (currentRecords.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">
                        Nenhum estudante encontrado
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                        Ajuste os filtros para encontrar os estudantes desejados
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-700 overflow-hidden">
            {/* Compact Header */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 px-4 py-3 border-b border-green-200/50 dark:border-green-800/50">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-green-500/20 rounded-lg">
                        <User className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            Lista de Estudantes
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                            {currentRecords.length} estudante{currentRecords.length !== 1 ? 's' : ''} encontrado{currentRecords.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                            {visibleColumns.has("actions") && (
                                <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">
                                    <div className="flex items-center justify-center gap-1.5">
                                        ✏️ <span>Editar</span>
                                    </div>
                                </th>
                            )}
                            {visibleColumns.has("turma") && (
                                <SortHeader 
                                    column="turma"
                                    sortColumn={sortColumn}
                                    sortDirection={sortDirection}
                                    onSort={handleSort}
                                >
                                    <div className="flex items-center">
                                        🏫 <span className="ml-2">Turma</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("nome") && (
                                <SortHeader 
                                    column="nome"
                                    sortColumn={sortColumn}
                                    sortDirection={sortDirection}
                                    onSort={handleSort}
                                >
                                    <div className="flex items-center">
                                        👤 <span className="ml-2">Nome</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("matricula") && (
                                <SortHeader 
                                    column="matricula"
                                    sortColumn={sortColumn}
                                    sortDirection={sortDirection}
                                    onSort={handleSort}
                                >
                                    <div className="flex items-center">
                                        🎓 <span className="ml-2">Matrícula</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("dataNascimento") && (
                                <SortHeader 
                                    column="dataNascimento"
                                    sortColumn={sortColumn}
                                    sortDirection={sortDirection}
                                    onSort={handleSort}
                                >
                                    <div className="flex items-center">
                                        📅 <span className="ml-2">Nascimento</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("turno") && (
                                <SortHeader 
                                    column="turno"
                                    sortColumn={sortColumn}
                                    sortDirection={sortDirection}
                                    onSort={handleSort}
                                >
                                    <div className="flex items-center">
                                        ⏰ <span className="ml-2">Turno</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("bolsaFamilia") && (
                                <SortHeader 
                                    column="bolsaFamilia"
                                    sortColumn={sortColumn}
                                    sortDirection={sortDirection}
                                    onSort={handleSort}
                                >
                                    <div className="flex items-center">
                                        💰 <span className="ml-2">Bolsa Família</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("status") && (
                                <SortHeader 
                                    column="status"
                                    sortColumn={sortColumn}
                                    sortDirection={sortDirection}
                                    onSort={handleSort}
                                >
                                    <div className="flex items-center">
                                        ✅ <span className="ml-2">Status</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("contatos") && (
                                <SortHeader 
                                    column="contatos"
                                    sortColumn={sortColumn}
                                    sortDirection={sortDirection}
                                    onSort={handleSort}
                                >
                                    <div className="flex items-center">
                                        📞 <span className="ml-2">Contatos</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("email") && (
                                <SortHeader 
                                    column="email"
                                    sortColumn={sortColumn}
                                    sortDirection={sortDirection}
                                    onSort={handleSort}
                                >
                                    <div className="flex items-center">
                                        ✉️ <span className="ml-2">E-mail</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("endereco") && (
                                <SortHeader 
                                    column="endereco"
                                    sortColumn={sortColumn}
                                    sortDirection={sortDirection}
                                    onSort={handleSort}
                                >
                                    <div className="flex items-center">
                                        🏠 <span className="ml-2">Endereço</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("deficiencia") && (
                                <SortHeader 
                                    column="deficiencia"
                                    sortColumn={sortColumn}
                                    sortDirection={sortDirection}
                                    onSort={handleSort}
                                >
                                    <div className="flex items-center">
                                        ♿ <span className="ml-2">Deficiência</span>
                                    </div>
                                </SortHeader>
                            )}
                            {visibleColumns.has("provaSaoPaulo") && (
                                <SortHeader 
                                    column="provaSaoPaulo"
                                    sortColumn={sortColumn}
                                    sortDirection={sortDirection}
                                    onSort={handleSort}
                                >
                                    <div className="flex items-center">
                                        📊 <span className="ml-2">Prova SP</span>
                                    </div>
                                </SortHeader>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {currentRecords.map((est: Estudante, index: number) => (
                            <tr key={est.estudanteId || index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                {visibleColumns.has("actions") && (
                                    <td className="px-4 py-2.5">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                const originalIndex = students.findIndex(s => s.estudanteId === est.estudanteId);
                                                setEditingEstudante(est);
                                                setEditingIndex(originalIndex);
                                                setOpenModal(true);
                                            }}
                                            className="h-8 w-8 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                            title="Editar estudante"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                    </td>
                                )}
                                {visibleColumns.has("turma") && (
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center">
                                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                                <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">
                                                    {est.turma.slice(0, 2)}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("nome") && (
                                    <td className="px-4 py-2.5">
                                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                            {est.nome}
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("matricula") && (
                                    <td className="px-4 py-2.5">
                                        <div className="text-center">
                                            {est.matricula ? (
                                                <Badge variant="outline" className="bg-slate-100 dark:bg-slate-700 text-xs">
                                                    {est.matricula}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500 text-xs">
                                                    Não informada
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("dataNascimento") && (
                                    <td className="px-4 py-2.5">
                                        <div className="text-center">
                                            {est.dataNascimento ? (
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Calendar className="w-3 h-3 text-slate-500" />
                                                    <span className="text-sm text-slate-700 dark:text-slate-300">
                                                        {formatDate(est.dataNascimento)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500 text-xs">
                                                    Não informada
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("turno") && (
                                    <td className="px-4 py-2.5">
                                        <div className="flex justify-center">
                                            <TurnoBadge turno={est.turno} />
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("bolsaFamilia") && (
                                    <td className="px-4 py-2.5">
                                        <div className="flex justify-center">
                                            <BolsaFamiliaBadge bolsa={est.bolsaFamilia} />
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("status") && (
                                    <td className="px-4 py-2.5">
                                        <div className="flex justify-center">
                                            <StatusBadge status={est.status} />
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("contatos") && (
                                    <td className="px-4 py-2.5">
                                        <div className="space-y-1">
                                            {est.contatos && est.contatos.length > 0 ? (
                                                est.contatos.slice(0, 2).map((contato: Contato, i: number) => (
                                                    <div key={i} className="flex items-center text-sm">
                                                        <Phone className="w-3 h-3 mr-2 text-slate-500" />
                                                        <span className="text-slate-700 dark:text-slate-300 truncate">
                                                            {contato.nome}
                                                            {contato.parentesco && <span className="text-slate-500"> ({contato.parentesco})</span>}
                                                            : {formatPhoneNumber(contato.telefone)}
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
                                    <td className="px-4 py-2.5">
                                        <div className="text-center">
                                            {est.email ? (
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Mail className="w-3 h-3 text-slate-500" />
                                                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-48">
                                                        {est.email}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500 text-xs">
                                                    Não informado
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("endereco") && (
                                    <td className="px-4 py-2.5">
                                        <div className="text-left">
                                            {est.endereco ? (
                                                <div className="flex items-start gap-1.5">
                                                    <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0 mt-0.5" />
                                                    <div className="text-xs text-slate-700 dark:text-slate-300">
                                                        <div>{est.endereco.rua}, {est.endereco.numero}</div>
                                                        {est.endereco.complemento && <div>{est.endereco.complemento}</div>}
                                                        <div>{est.endereco.bairro}</div>
                                                        <div>{est.endereco.cidade}-{est.endereco.estado}</div>
                                                        <div className="text-slate-500">{formatCep(est.endereco.cep)}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500 text-xs">
                                                    Não informado
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.has("deficiencia") && (
                                    <td className="px-4 py-2.5">
                                        <div className="text-center">
                                            {est.deficiencia?.estudanteComDeficiencia ? (
                                                <div className="space-y-1">
                                                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">
                                                        ♿ SIM
                                                    </Badge>
                                                    {est.deficiencia.tipoDeficiencia && est.deficiencia.tipoDeficiencia.length > 0 && (
                                                        <div className="text-xs text-slate-600 dark:text-slate-400">
                                                            {Array.isArray(est.deficiencia.tipoDeficiencia)
                                                                ? est.deficiencia.tipoDeficiencia.join(", ")
                                                                : est.deficiencia.tipoDeficiencia}
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
                                    <td className="px-4 py-2.5">
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
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});