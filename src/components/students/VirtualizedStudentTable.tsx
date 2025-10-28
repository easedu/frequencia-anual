import React, { memo, useMemo } from 'react';
import { Edit, Phone, User, Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { Estudante, Contato } from '@/types';
import { formatPhoneNumber, formatDate } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Componentes otimizados com React.memo (reutilizando do StudentTable)
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

interface VirtualizedStudentTableProps {
    students: Estudante[];
    visibleColumns: Set<string>;
    height?: number;
    onEditStudent: (student: Estudante, index: number) => void;
    searchTerm?: string;
}

// Componente de linha virtualizada
const StudentRow = memo(({ index, style, data }: {
    index: number;
    style: React.CSSProperties;
    data: {
        students: Estudante[];
        visibleColumns: Set<string>;
        onEditStudent: (student: Estudante, index: number) => void;
    };
}) => {
    const { students, visibleColumns, onEditStudent } = data;
    const student = students[index];

    if (!student) return null;

    return (
        <div style={style} className="flex items-center border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors px-6 py-4">
            {visibleColumns.has("turma") && (
                <div className="flex-shrink-0 w-20 text-center font-medium text-slate-900 dark:text-slate-100">
                    {student.turma}
                </div>
            )}
            
            {visibleColumns.has("nome") && (
                <div className="flex-1 min-w-0 px-4">
                    <div className="flex items-center space-x-3">
                        <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {student.nome}
                        </span>
                    </div>
                </div>
            )}

            {visibleColumns.has("matricula") && (
                <div className="flex-shrink-0 w-32 px-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                        {student.matricula || "N/A"}
                    </span>
                </div>
            )}

            {visibleColumns.has("turno") && (
                <div className="flex-shrink-0 w-24 px-2">
                    <TurnoBadge turno={student.turno} />
                </div>
            )}

            {visibleColumns.has("bolsaFamilia") && (
                <div className="flex-shrink-0 w-24 px-2">
                    <BolsaFamiliaBadge bolsa={student.bolsaFamilia} />
                </div>
            )}

            {visibleColumns.has("status") && (
                <div className="flex-shrink-0 w-24 px-2">
                    <StatusBadge status={student.status} />
                </div>
            )}

            {visibleColumns.has("contatos") && (
                <div className="flex-shrink-0 w-40 px-2">
                    {student.contatos && student.contatos.length > 0 ? (
                        <div className="space-y-1">
                            {student.contatos.slice(0, 2).map((contato: Contato, i: number) => (
                                <div key={i} className="flex items-center space-x-1">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                        {formatPhoneNumber(contato.telefone)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <span className="text-xs text-slate-400">N/A</span>
                    )}
                </div>
            )}

            {visibleColumns.has("actions") && (
                <div className="flex-shrink-0 w-24 px-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditStudent(student, index)}
                        className="w-full"
                    >
                        <Edit className="w-3 h-3 mr-1" />
                        Editar
                    </Button>
                </div>
            )}
        </div>
    );
});
StudentRow.displayName = 'StudentRow';

export const VirtualizedStudentTable = memo(function VirtualizedStudentTable({
    students,
    visibleColumns,
    height = 600,
    onEditStudent,
    searchTerm = "",
}: VirtualizedStudentTableProps) {
    
    // Filtro de busca otimizado com useMemo
    const filteredStudents = useMemo(() => {
        if (!searchTerm.trim()) return students;
        
        const term = searchTerm.toLowerCase();
        return students.filter(student => 
            student.nome.toLowerCase().includes(term) ||
            student.turma.toLowerCase().includes(term) ||
            (student.matricula && student.matricula.toLowerCase().includes(term))
        );
    }, [students, searchTerm]);

    // Dados para o componente virtualizado
    const itemData = useMemo(() => ({
        students: filteredStudents,
        visibleColumns,
        onEditStudent,
    }), [filteredStudents, visibleColumns, onEditStudent]);

    if (filteredStudents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                <User className="w-12 h-12 mb-4" />
                <p className="text-lg font-medium">Nenhum estudante encontrado</p>
                <p className="text-sm">Ajuste os filtros para ver mais resultados</p>
            </div>
        );
    }

    return (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-slate-700/20 overflow-hidden">
            {/* Header da tabela */}
            <div className="flex items-center border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">
                {visibleColumns.has("turma") && (
                    <div className="flex-shrink-0 w-20 text-center">
                        🏫 Turma
                    </div>
                )}
                {visibleColumns.has("nome") && (
                    <div className="flex-1 px-4">
                        👤 Nome
                    </div>
                )}
                {visibleColumns.has("matricula") && (
                    <div className="flex-shrink-0 w-32 px-2">
                        🎓 Matrícula
                    </div>
                )}
                {visibleColumns.has("turno") && (
                    <div className="flex-shrink-0 w-24 px-2">
                        ⏰ Turno
                    </div>
                )}
                {visibleColumns.has("bolsaFamilia") && (
                    <div className="flex-shrink-0 w-24 px-2">
                        💰 Bolsa
                    </div>
                )}
                {visibleColumns.has("status") && (
                    <div className="flex-shrink-0 w-24 px-2">
                        ✅ Status
                    </div>
                )}
                {visibleColumns.has("contatos") && (
                    <div className="flex-shrink-0 w-40 px-2">
                        📞 Contatos
                    </div>
                )}
                {visibleColumns.has("actions") && (
                    <div className="flex-shrink-0 w-24 px-2">
                        ⚙️ Ações
                    </div>
                )}
            </div>

            {/* Lista virtualizada */}
            <VirtualizedList
                items={filteredStudents}
                itemHeight={80}
                height={height}
                renderItem={(props) => <StudentRow {...props} data={itemData} />}
                className="virtualized-student-list"
                overscan={5}
                searchTerm={searchTerm}
                emptyComponent={
                    <div className="flex items-center justify-center h-32">
                        <p className="text-slate-500">Nenhum estudante encontrado</p>
                    </div>
                }
            />

            {/* Footer com informações */}
            <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm px-6 py-3">
                <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                    <span>
                        {searchTerm ? `${filteredStudents.length} de ${students.length}` : `${students.length}`} estudantes
                    </span>
                    <span className="text-xs">
                        Lista virtualizada para performance otimizada
                    </span>
                </div>
            </div>
        </div>
    );
});