/**
 * StudentSelector Component
 *
 * Componente reutilizável para seleção de turma e estudante
 * Consolidado de: marcar-faltas, telefones, relatorio-interacoes
 *
 * Features:
 * - Seleção de turma com lista ordenada
 * - Seleção de estudante filtrado por turma
 * - Suporte para filtro por turno (MANHÃ/TARDE)
 * - Suporte para filtro por status (ATIVO/INATIVO)
 * - Visual consistente com ícones e badges
 */

import React, { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users, User } from 'lucide-react';

// ════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════

export interface Estudante {
  id: string;
  estudanteId: string;
  nome: string;
  turma: string;
  turno?: 'MANHÃ' | 'TARDE';
  status?: 'ATIVO' | 'INATIVO' | 'TRANSFERIDO';
}

export interface StudentSelectorProps {
  // Dados
  students: Estudante[];

  // Estado de seleção
  selectedClass?: string;
  selectedStudent?: string;

  // Callbacks
  onClassChange?: (turma: string) => void;
  onStudentChange?: (estudanteId: string) => void;

  // Configuração
  showStudentSelector?: boolean; // Se false, mostra apenas seletor de turma
  filterByTurno?: 'MANHÃ' | 'TARDE' | null;
  filterByStatus?: 'ATIVO' | 'INATIVO' | null;

  // Labels customizadas
  classLabel?: string;
  studentLabel?: string;
  classPlaceholder?: string;
  studentPlaceholder?: string;

  // Estilo
  className?: string;
  variant?: 'horizontal' | 'vertical'; // Layout dos seletores
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════

export function StudentSelector({
  students,
  selectedClass,
  selectedStudent,
  onClassChange,
  onStudentChange,
  showStudentSelector = true,
  filterByTurno = null,
  filterByStatus = 'ATIVO',
  classLabel = 'Turma',
  studentLabel = 'Estudante',
  classPlaceholder = 'Selecione a turma',
  studentPlaceholder = 'Selecione o estudante',
  className = '',
  variant = 'horizontal',
}: StudentSelectorProps) {

  // ──────────────────────────────────────────────────────────────
  // Lógica de Filtros
  // ──────────────────────────────────────────────────────────────

  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Filtro por turno
    if (filterByTurno) {
      filtered = filtered.filter(s => s.turno === filterByTurno);
    }

    // Filtro por status
    if (filterByStatus) {
      filtered = filtered.filter(s => s.status === filterByStatus);
    }

    return filtered;
  }, [students, filterByTurno, filterByStatus]);

  // Lista de turmas únicas (ordenadas)
  const turmas = useMemo(() => {
    const uniqueTurmas = [...new Set(filteredStudents.map(s => s.turma))];
    return uniqueTurmas.sort((a, b) => a.localeCompare(b));
  }, [filteredStudents]);

  // Estudantes da turma selecionada (ordenados por nome)
  const studentsInClass = useMemo(() => {
    if (!selectedClass) return [];
    return filteredStudents
      .filter(s => s.turma === selectedClass)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [filteredStudents, selectedClass]);

  // ──────────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────────

  const handleClassChange = (turma: string) => {
    onClassChange?.(turma);
    // Reset student selection when class changes
    onStudentChange?.('');
  };

  const handleStudentChange = (estudanteId: string) => {
    onStudentChange?.(estudanteId);
  };

  // ──────────────────────────────────────────────────────────────
  // Layout
  // ──────────────────────────────────────────────────────────────

  const containerClass = variant === 'horizontal'
    ? `grid grid-cols-1 ${showStudentSelector ? 'md:grid-cols-2' : ''} gap-4 ${className}`
    : `space-y-4 ${className}`;

  return (
    <div className={containerClass}>
      {/* Seletor de Turma */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
          <Users className="w-4 h-4 text-blue-600" />
          <span>{classLabel}</span>
        </Label>
        <Select onValueChange={handleClassChange} value={selectedClass}>
          <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors">
            <SelectValue placeholder={classPlaceholder} />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {turmas.map((turma) => (
              <SelectItem key={turma} value={turma} className="py-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>{turma}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Seletor de Estudante */}
      {showStudentSelector && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <User className="w-4 h-4 text-green-600" />
            <span>{studentLabel}</span>
          </Label>
          <Select
            onValueChange={handleStudentChange}
            value={selectedStudent}
            disabled={!selectedClass}
          >
            <SelectTrigger className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500 transition-colors disabled:opacity-50">
              <SelectValue placeholder={studentPlaceholder} />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {studentsInClass.map((student) => (
                <SelectItem
                  key={student.estudanteId}
                  value={student.estudanteId}
                  className="py-2 text-sm"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{student.nome}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!selectedClass && (
            <p className="text-xs text-gray-500 mt-1">
              Selecione uma turma primeiro
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// VARIANTES PRÉ-CONFIGURADAS
// ════════════════════════════════════════════════════════════════

/**
 * Seletor apenas de turma (sem estudante)
 */
export function ClassSelector(props: Omit<StudentSelectorProps, 'showStudentSelector'>) {
  return <StudentSelector {...props} showStudentSelector={false} />;
}

/**
 * Seletor vertical (mobile-friendly)
 */
export function StudentSelectorVertical(props: Omit<StudentSelectorProps, 'variant'>) {
  return <StudentSelector {...props} variant="vertical" />;
}
