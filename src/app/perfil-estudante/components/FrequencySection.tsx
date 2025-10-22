/**
 * FrequencySection Component
 *
 * Wrapper que agrupa todos os componentes de frequência:
 * - FrequencyAllAbsencesCard (com faltas justificadas)
 * - FrequencyNoJustifiedCard (sem faltas justificadas)
 * - RegisteredAbsencesCard (lista de faltas registradas)
 */

import { memo } from 'react';
import FrequencyAllAbsencesCard from '@/components/attendance/FrequencyAllAbsencesCard';
import FrequencyNoJustifiedCard from '@/components/attendance/FrequencyNoJustifiedCard';
import RegisteredAbsencesCard from '@/components/attendance/RegisteredAbsencesCard';
import { FrequencyCardSkeleton } from '@/components/shared/LoadingSkeletons';
import type { Student, StudentRecord, AbsenceRecord, Atestado, Suspensao, BimesterDates } from '@/types';

interface FrequencySectionProps {
  student: Student | null;
  studentRecord: StudentRecord | null;
  studentRecordWithoutJustified: StudentRecord | null;
  absences: AbsenceRecord[];
  atestados: Atestado[];
  suspensoes: Suspensao[];
  bimesterDates: BimesterDates;
  loadingProfile: boolean;
  userRole?: string | null;
  selectedStudentId?: string | null;
  onAbsenceDeleted?: () => void;
}

/**
 * Componente memoizado para evitar re-renders desnecessários.
 * Só re-renderiza quando student ID ou absences mudam.
 */
export const FrequencySection = memo(function FrequencySection(props: FrequencySectionProps) {
  console.log('[FrequencySection] Render', {
    hasStudent: !!props.student,
    hasStudentRecord: !!props.studentRecord,
    hasStudentRecordWithoutJustified: !!props.studentRecordWithoutJustified,
    loadingProfile: props.loadingProfile,
    studentRecord: props.studentRecord,
    studentRecordWithoutJustified: props.studentRecordWithoutJustified
  });

  // Se não há estudante selecionado, não renderizar nada
  if (!props.student) {
    return null;
  }

  // Loading state
  if (props.loadingProfile) {
    return (
      <div className="space-y-6">
        {/* Skeletons lado a lado em desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FrequencyCardSkeleton />
          <FrequencyCardSkeleton />
        </div>
        <FrequencyCardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Frequência: SEMPRE visíveis, lado a lado em desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Frequência COM faltas justificadas (atestados) */}
        <FrequencyAllAbsencesCard
          studentRecord={props.studentRecord}
          student={props.student}
        />

        {/* Card: Frequência SEM faltas justificadas (visão pedagógica) */}
        <FrequencyNoJustifiedCard
          studentRecord={props.studentRecordWithoutJustified}
          student={props.student}
        />
      </div>

      {/* Card: Lista de faltas registradas por bimestre */}
      {/* ✅ SEMPRE renderizar (mesmo com 0 faltas) - componente tem mensagem "Nenhuma falta" */}
      {/* ✅ Renderiza também se houver atestados/suspensões (podem ter faltas justificadas) */}
      {(props.absences.length > 0 || props.atestados.length > 0 || props.suspensoes.length > 0) && (
        <RegisteredAbsencesCard
          absences={props.absences}
          atestados={props.atestados}
          suspensoes={props.suspensoes}
          bimesterDates={props.bimesterDates}
          userRole={props.userRole}
          selectedStudentId={props.selectedStudentId}
          onAbsenceDeleted={props.onAbsenceDeleted}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: só re-renderizar se mudar estudante ou faltas
  return (
    prevProps.student?.estudanteId === nextProps.student?.estudanteId &&
    prevProps.absences.length === nextProps.absences.length &&
    prevProps.loadingProfile === nextProps.loadingProfile
  );
});
