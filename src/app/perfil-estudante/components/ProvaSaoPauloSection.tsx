/**
 * ProvaSaoPauloSection Component
 *
 * Wrapper para o componente de resultados da Prova São Paulo.
 * Componente simples que apenas encapsula o ProvaSaoPauloCard.
 */

import { memo } from 'react';
import ProvaSaoPauloCard from '@/components/students/ProvaSaoPauloCard';
import type { Student } from '@/types';

interface ProvaSaoPauloSectionProps {
  student: Student | null;
}

/**
 * Seção de resultados da Prova São Paulo.
 * Renderiza o card que mostra dados ou empty state.
 */
export const ProvaSaoPauloSection = memo(function ProvaSaoPauloSection(props: ProvaSaoPauloSectionProps) {
  if (!props.student) {
    return null;
  }

  // Sempre renderizar o card - ele decide se mostra dados ou empty state
  return (
    <div>
      <ProvaSaoPauloCard student={props.student} />
    </div>
  );
}, (prevProps, nextProps) => {
  // Só re-renderizar se mudar o estudante ou dados da prova
  return (
    prevProps.student?.estudanteId === nextProps.student?.estudanteId &&
    prevProps.student?.provaSaoPaulo?.length === nextProps.student?.provaSaoPaulo?.length
  );
});
