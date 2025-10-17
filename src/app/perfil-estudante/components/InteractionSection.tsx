/**
 * InteractionSection Component
 *
 * Wrapper que agrupa componentes de interações familiares:
 * - RegisterInteractionCard (formulário de cadastro/edição)
 * - InteractionHistoryCard (histórico de interações)
 */

import { memo } from 'react';
import RegisterInteractionCard from '@/components/interactions/RegisterInteractionCard';
import InteractionHistoryCard from '@/components/interactions/InteractionHistoryCard';
import { InteractionListSkeleton } from '@/components/shared/LoadingSkeletons';
import type { Student, FamilyInteraction, Contato } from '@/types';

interface InteractionSectionProps {
  student: Student | null;
  interactions: FamilyInteraction[];

  // Form states
  interactionType: string;
  setInteractionType: (type: string) => void;
  interactionDate: string;
  setInteractionDate: (date: string) => void;
  interactionDescription: string;
  setInteractionDescription: (desc: string) => void;
  interactionSensitive: boolean;
  setInteractionSensitive: (sensitive: boolean) => void;
  editingInteraction: FamilyInteraction | null;
  setEditingInteraction: (interaction: FamilyInteraction | null) => void;

  // WhatsApp states
  selectedWhatsAppPhones: Set<string>;
  setSelectedWhatsAppPhones: (phones: Set<string>) => void;
  whatsAppMessage: string;
  setWhatsAppMessage: (message: string) => void;
  isSendingWhatsApp: boolean;
  whatsAppSendSuccess: boolean;
  verifiedWhatsAppNumbers: Set<string>;
  contactVerificationData: Map<string, any>;
  isWhatsAppModalOpen: boolean;
  setIsWhatsAppModalOpen: (open: boolean) => void;
  selectedContact: Contato | null;
  setSelectedContact: (contact: Contato | null) => void;

  // Handlers
  handleAddInteraction: () => Promise<void>;
  handleEditInteraction: () => Promise<void>;
  handleDeleteInteraction: (id: string) => Promise<void>;
  handleWhatsAppClick: (contact: Contato) => void;
  handleRetryVerification: (contact: Contato) => Promise<void>;
  handleSendWhatsAppMessage: (phone: string, message: string) => Promise<any>;
  handleSaveWhatsAppInteraction: () => Promise<void>;

  // Dialog state
  showDeleteDialog: string | null;
  setShowDeleteDialog: (id: string | null) => void;

  // User role (para permissões)
  userRole: string | null;

  // Loading
  loadingProfile: boolean;
}

/**
 * Seção de interações familiares com suporte a WhatsApp.
 * Inclui formulário de cadastro e histórico completo.
 */
export const InteractionSection = memo(function InteractionSection(props: InteractionSectionProps) {
  if (!props.student) {
    return null;
  }

  if (props.loadingProfile) {
    return <InteractionListSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Card: Cadastrar/Editar Interação */}
      <RegisterInteractionCard
        interactionType={props.interactionType}
        setInteractionType={props.setInteractionType}
        interactionDate={props.interactionDate}
        setInteractionDate={props.setInteractionDate}
        interactionDescription={props.interactionDescription}
        setInteractionDescription={props.setInteractionDescription}
        interactionSensitive={props.interactionSensitive}
        setInteractionSensitive={props.setInteractionSensitive}
        editingInteraction={props.editingInteraction}
        setEditingInteraction={props.setEditingInteraction}
        userRole={props.userRole}
        onAddInteraction={props.handleAddInteraction}
        onEditInteraction={props.handleEditInteraction}
        id="interaction-card"
        contacts={props.student?.contatos || []}
        selectedWhatsAppPhones={props.selectedWhatsAppPhones}
        onWhatsAppPhonesChange={props.setSelectedWhatsAppPhones}
        whatsAppMessage={props.whatsAppMessage}
        onWhatsAppMessageChange={props.setWhatsAppMessage}
        isSendingWhatsApp={props.isSendingWhatsApp}
        whatsAppSendSuccess={props.whatsAppSendSuccess}
        verifiedWhatsAppNumbers={props.verifiedWhatsAppNumbers}
        contactVerificationData={props.contactVerificationData}
      />

      {/* Card: Histórico de Interações */}
      {props.interactions.length > 0 && (
        <InteractionHistoryCard
          interactions={props.interactions}
          student={props.student}
          studentRecord={null}
          userRole={props.userRole}
          showDeleteDialog={props.showDeleteDialog}
          setShowDeleteDialog={props.setShowDeleteDialog}
          setEditingInteraction={props.setEditingInteraction}
          onDeleteInteraction={props.handleDeleteInteraction}
          onPrintReport={() => {}}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Só re-renderizar se mudar estudante, interações, form states ou estados de WhatsApp

  // Verificar se alguma interação mudou (status WhatsApp, por exemplo)
  if (prevProps.interactions.length !== nextProps.interactions.length) {
    return false; // Re-renderizar se tamanho mudou
  }

  // Verificar se o conteúdo das interações mudou (status WhatsApp, etc)
  const interactionsChanged = prevProps.interactions.some((prev, index) => {
    const next = nextProps.interactions[index];
    if (!next) return true;

    // Verificar mudanças em campos críticos que afetam a UI
    return (
      prev.id !== next.id ||
      prev.whatsappStatus !== next.whatsappStatus ||
      prev.whatsappDeliveredAt !== next.whatsappDeliveredAt ||
      prev.whatsappReadAt !== next.whatsappReadAt ||
      prev.whatsappPlayedAt !== next.whatsappPlayedAt
    );
  });

  if (interactionsChanged) {
    return false; // Re-renderizar se alguma interação mudou
  }

  return (
    prevProps.student?.estudanteId === nextProps.student?.estudanteId &&
    prevProps.editingInteraction?.id === nextProps.editingInteraction?.id &&
    prevProps.interactionType === nextProps.interactionType &&
    prevProps.interactionDate === nextProps.interactionDate &&
    prevProps.interactionDescription === nextProps.interactionDescription &&
    prevProps.interactionSensitive === nextProps.interactionSensitive &&
    prevProps.whatsAppMessage === nextProps.whatsAppMessage &&
    prevProps.selectedWhatsAppPhones.size === nextProps.selectedWhatsAppPhones.size &&
    prevProps.isSendingWhatsApp === nextProps.isSendingWhatsApp &&
    prevProps.whatsAppSendSuccess === nextProps.whatsAppSendSuccess &&
    prevProps.loadingProfile === nextProps.loadingProfile
  );
});
