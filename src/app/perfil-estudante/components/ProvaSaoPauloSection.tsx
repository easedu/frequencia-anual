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
 * Só renderiza se houver estudante selecionado e dados da prova.
 */
export const ProvaSaoPauloSection = memo(function ProvaSaoPauloSection(props: ProvaSaoPauloSectionProps) {
  if (!props.student) {
    return null;
  }

  // Só renderizar se o estudante tiver dados da Prova São Paulo
  if (!props.student.provaSaoPaulo || props.student.provaSaoPaulo.length === 0) {
    return null;
  }

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
