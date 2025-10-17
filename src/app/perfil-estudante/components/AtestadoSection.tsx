/**
 * AtestadoSection Component
 *
 * Wrapper que agrupa componentes de atestados médicos:
 * - RegisterAtestadoCard (formulário de cadastro/edição)
 * - AtestadoHistoryCard (histórico de atestados)
 */

import { memo } from 'react';
import RegisterAtestadoCard from '@/components/attendance/RegisterAtestadoCard';
import AtestadoHistoryCard from '@/components/attendance/AtestadoHistoryCard';
import type { Student, Atestado } from '@/types';

interface AtestadoSectionProps {
  student: Student | null;
  atestados: Atestado[];
  userRole?: string | null;

  // Form states
  atestadoStartDate: string;
  setAtestadoStartDate: (date: string) => void;
  atestadoDays: string;
  setAtestadoDays: (days: string) => void;
  atestadoDescription: string;
  setAtestadoDescription: (desc: string) => void;
  editingAtestado: Atestado | null;
  setEditingAtestado: (atestado: Atestado | null) => void;
  isSubmittingAtestado: boolean;

  // Handlers
  handleAddAtestado: () => Promise<void>;
  handleEditAtestado: () => Promise<void>;
  handleDeleteAtestado: (id: string) => Promise<void>;

  // Dialog state
  showDeleteAtestadoDialog: string | null;
  setShowDeleteAtestadoDialog: (id: string | null) => void;
}

/**
 * Seção de atestados médicos.
 * Só renderiza se houver estudante selecionado.
 */
export const AtestadoSection = memo(function AtestadoSection(props: AtestadoSectionProps) {
  if (!props.student) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Card: Cadastrar/Editar Atestado */}
      <RegisterAtestadoCard
        atestadoStartDate={props.atestadoStartDate}
        setAtestadoStartDate={props.setAtestadoStartDate}
        atestadoDays={props.atestadoDays}
        setAtestadoDays={props.setAtestadoDays}
        atestadoDescription={props.atestadoDescription}
        setAtestadoDescription={props.setAtestadoDescription}
        onAddAtestado={props.handleAddAtestado}
        onEditAtestado={props.handleEditAtestado}
        editingAtestado={props.editingAtestado}
        setEditingAtestado={props.setEditingAtestado}
        isSubmitting={props.isSubmittingAtestado}
      />

      {/* Card: Histórico de Atestados */}
      {props.atestados.length > 0 && (
        <AtestadoHistoryCard
          atestados={props.atestados}
          userRole={props.userRole}
          showDeleteAtestadoDialog={props.showDeleteAtestadoDialog}
          setShowDeleteAtestadoDialog={props.setShowDeleteAtestadoDialog}
          setEditingAtestado={props.setEditingAtestado}
          onDeleteAtestado={props.handleDeleteAtestado}
        />
      )}
    </div>
  );
});
