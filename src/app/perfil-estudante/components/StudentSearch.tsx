/**
 * StudentSearch Component
 *
 * Wrapper que agrupa os componentes de busca e seleção de estudante:
 * - Busca por nome (com autocomplete)
 * - Busca por turma (com lista de estudantes)
 * - Informações do estudante selecionado
 */

import SearchByNameCard from '@/components/students/SearchByNameCard';
import SearchByClassCard from '@/components/students/SearchByClassCard';
import StudentInfoCard from '@/components/students/StudentInfoCard';
import type { Student } from '@/types';

interface StudentSearchProps {
  // Search by name
  searchName: string;
  setSearchName: (value: string) => void;
  suggestions: Student[];
  handleSuggestionSelect: (id: string) => void;
  handleSearchName: (value: string) => void;

  // Search by turma
  selectedTurma: string;
  setSelectedTurma: (turma: string) => void;
  uniqueTurmas: string[];
  studentsInTurma: Student[];
  handleSelectStudent: (id: string) => void;

  // Selected student
  student: Student | null;
  loadingProfile: boolean;
}

export function StudentSearch(props: StudentSearchProps) {
  return (
    <div className="space-y-6">
      {/* Busca por Nome e Turma - Lado a Lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Busca por Nome */}
        <SearchByNameCard
          searchName={props.searchName}
          onSearchChange={props.handleSearchName}
          suggestions={props.suggestions}
          onSuggestionSelect={props.handleSuggestionSelect}
        />

        {/* Busca por Turma */}
        <SearchByClassCard
          selectedTurma={props.selectedTurma}
          selectedStudentId={props.student?.estudanteId || ''}
          uniqueTurmas={props.uniqueTurmas}
          studentsInTurma={props.studentsInTurma || []}
          searchName={props.searchName}
          onTurmaChange={props.setSelectedTurma}
          onStudentChange={props.handleSelectStudent}
        />
      </div>

      {/* Informações do Estudante Selecionado */}
      {props.student && (
        <StudentInfoCard
          student={props.student}
          loading={props.loadingProfile}
        />
      )}
    </div>
  );
}
