/**
 * Componente refatorado para exibir faltas por bimestre
 * Extraído do RegisteredAbsencesCard para melhor modularização
 */

"use client";

import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Calendar, 
  FileText, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  ChevronDown, 
  ChevronRight, 
  Trash2 
} from 'lucide-react';
import { AbsenceRecord, Atestado, BimesterDates } from '@/types';
import { getBimesterByDate, formatFirebaseDate } from '@/app/utils';
// import { formatDate } from '@/utils/dateUtils'; // TODO: Implement when available

interface BimesterAbsencesProps {
  title: string;
  bimester: number;
  absences: AbsenceRecord[];
  atestados: Atestado[];
  bimesterDates: BimesterDates;
  userRole?: string | null;
  onAbsenceDeleted?: () => void;
  selectedStudentId?: string;
  onDeleteAbsence?: (absenceDate: string) => void;
}

const BimesterAbsences: React.FC<BimesterAbsencesProps> = ({
  title,
  bimester,
  absences,
  atestados,
  bimesterDates,
  userRole,
  onDeleteAbsence
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Memoizar cálculos custosos
  const bimesterData = useMemo(() => {
    const filteredAbsences = absences.filter((absence) => 
      getBimesterByDate(absence.data, bimesterDates) === bimester
    );
    
    const justifiedCount = filteredAbsences.filter(absence => absence.justified).length;
    const unjustifiedCount = filteredAbsences.length - justifiedCount;
    
    return {
      absences: filteredAbsences,
      justifiedCount,
      unjustifiedCount,
      totalCount: filteredAbsences.length
    };
  }, [absences, bimester, bimesterDates]);

  const getBimesterColor = (bimester: number) => {
    const colors = {
      1: "from-blue-500 to-blue-500",
      2: "from-green-500 to-green-500",
      3: "from-orange-500 to-orange-500",
      4: "from-purple-500 to-purple-500"
    };
    return colors[bimester as keyof typeof colors] || "from-gray-400 to-gray-500";
  };

  const handleToggleExpand = () => {
    if (bimesterData.totalCount > 0) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header do Bimestre */}
      <div
        className={`relative ${bimesterData.totalCount > 0 ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={handleToggleExpand}
      >
        <div className={`bg-gradient-to-r ${getBimesterColor(bimester)} rounded-lg p-3 text-white shadow-lg transition-all duration-200 ${bimesterData.totalCount > 0 ? 'hover:shadow-xl' : ''
          } ${isExpanded ? 'ring-2 ring-white/30' : ''} min-h-[100px] flex flex-col justify-between`}>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="transition-transform duration-200">
                {bimesterData.totalCount > 0 ? (
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
              <span className="text-sm font-medium">{bimesterData.totalCount} faltas</span>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="mt-2 min-h-[16px]">
            {bimesterData.totalCount > 0 ? (
              <div className="flex space-x-4 font-bold text-xs">
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>{bimesterData.justifiedCount} justificadas</span>
                </div>
                <div className="flex items-center font-bold space-x-1">
                  <XCircle className="w-3 h-3" />
                  <span>{bimesterData.unjustifiedCount} não justificadas</span>
                </div>
              </div>
            ) : (
              <div className="text-xs font-bold text-white/70">
                Nenhuma falta registrada
              </div>
            )}
          </div>

          {/* Indicador de clique */}
          <div className="mt-2 text-xs text-white/70 flex items-center font-bold space-x-1 min-h-[16px]">
            {bimesterData.totalCount > 0 ? (
              <span>Clique para {isExpanded ? 'recolher' : 'expandir'} detalhes</span>
            ) : (
              <span>Sem faltas para exibir</span>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Faltas Expansível */}
      <div className={`transition-all duration-300 ${
        isExpanded ? 'max-h-none opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
      }`}>
        <AbsenceList 
          absences={bimesterData.absences}
          atestados={atestados}
          userRole={userRole}
          onDeleteAbsence={onDeleteAbsence}
        />
      </div>
    </div>
  );
};

// Componente separado para a lista de faltas
const AbsenceList: React.FC<{
  absences: AbsenceRecord[];
  atestados: Atestado[];
  userRole?: string | null;
  onDeleteAbsence?: (absenceDate: string) => void;
}> = ({ absences, atestados, userRole, onDeleteAbsence }) => {
  if (absences.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">Nenhuma falta registrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {absences.map((absence, index) => (
        <AbsenceItem
          key={`${absence.data}-${index}`}
          absence={absence}
          atestados={atestados}
          userRole={userRole}
          onDeleteAbsence={onDeleteAbsence}
        />
      ))}
    </div>
  );
};

// Componente para item individual de falta
const AbsenceItem: React.FC<{
  absence: AbsenceRecord;
  atestados: Atestado[];
  userRole?: string | null;
  onDeleteAbsence?: (absenceDate: string) => void;
}> = ({ absence, atestados, userRole, onDeleteAbsence }) => {
  const atestado = absence.atestadoId 
    ? atestados.find(a => a.id === absence.atestadoId)
    : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <div className={`group relative bg-white rounded-lg border-2 p-3 transition-all duration-200 hover:shadow-md ${
          absence.justified
            ? 'border-green-200 hover:border-green-300 bg-green-50'
            : 'border-red-200 hover:border-red-300 bg-red-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                absence.justified ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  {absence.data}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {absence.justified && atestado && (
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer">
                    <FileText className="w-3 h-3 mr-1" />
                    Atestado
                  </Badge>
                </TooltipTrigger>
              )}

              {/* Botão de remoção - apenas para administradores */}
              {userRole === "admin" && onDeleteAbsence && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDeleteAbsence(absence.data)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tooltip com detalhes do atestado */}
        {absence.justified && atestado && (
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
                    {atestado.description || 'Sem descrição'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="w-3 h-3 text-gray-500" />
                  <span className="font-medium text-gray-600">Início:</span>
                  <span className="text-gray-900">
                    {atestado.startDate}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Clock className="w-3 h-3 text-gray-500" />
                  <span className="font-medium text-gray-600">Dias:</span>
                  <span className="text-gray-900">{atestado.days}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <User className="w-3 h-3 text-gray-500" />
                  <span className="font-medium text-gray-600">Adicionado por:</span>
                  <span className="text-gray-900">{atestado.createdBy}</span>
                </div>
              </div>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export default React.memo(BimesterAbsences);