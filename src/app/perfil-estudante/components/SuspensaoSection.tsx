/**
 * SuspensaoSection Component
 *
 * Wrapper que agrupa componentes de suspensões:
 * - RegisterSuspensaoCard (formulário de cadastro/edição)
 * - SuspensaoHistoryCard (histórico de suspensões)
 */

import { memo } from 'react';
import RegisterSuspensaoCard from '@/components/attendance/RegisterSuspensaoCard';
import SuspensaoHistoryCard from '@/components/interactions/SuspensaoHistoryCard';
import type { Student, Suspensao } from '@/types';

interface SuspensaoSectionProps {
  student: Student | null;
  suspensoes: Suspensao[];
  userRole?: string | null;

  // Form states
  suspensaoStartDate: string;
  setSuspensaoStartDate: (date: string) => void;
  suspensaoDays: string;
  setSuspensaoDays: (days: string) => void;
  suspensaoDescription: string;
  setSuspensaoDescription: (desc: string) => void;
  editingSuspensao: Suspensao | null;
  setEditingSuspensao: (suspensao: Suspensao | null) => void;

  // Handlers
  handleAddSuspensao: () => Promise<void>;
  handleEditSuspensao: () => Promise<void>;
  handleDeleteSuspensao: (id: string) => Promise<void>;

  // Dialog state
  showDeleteSuspensaoDialog: string | null;
  setShowDeleteSuspensaoDialog: (id: string | null) => void;
}

/**
 * Seção de suspensões.
 * Só renderiza se houver estudante selecionado.
 */
export const SuspensaoSection = memo(function SuspensaoSection(props: SuspensaoSectionProps) {
  if (!props.student) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Card: Cadastrar/Editar Suspensão */}
      <RegisterSuspensaoCard
        suspensaoStartDate={props.suspensaoStartDate}
        setSuspensaoStartDate={props.setSuspensaoStartDate}
        suspensaoDays={props.suspensaoDays}
        setSuspensaoDays={props.setSuspensaoDays}
        suspensaoDescription={props.suspensaoDescription}
        setSuspensaoDescription={props.setSuspensaoDescription}
        onAddSuspensao={props.handleAddSuspensao}
        onEditSuspensao={props.handleEditSuspensao}
        editingSuspensao={props.editingSuspensao}
        setEditingSuspensao={props.setEditingSuspensao}
      />

      {/* Card: Histórico de Suspensões */}
      {props.suspensoes.length > 0 && (
        <SuspensaoHistoryCard
          suspensoes={props.suspensoes}
          userRole={props.userRole}
          showDeleteSuspensaoDialog={props.showDeleteSuspensaoDialog}
          setShowDeleteSuspensaoDialog={props.setShowDeleteSuspensaoDialog}
          setEditingSuspensao={props.setEditingSuspensao}
          onDeleteSuspensao={props.handleDeleteSuspensao}
        />
      )}
    </div>
  );
});
