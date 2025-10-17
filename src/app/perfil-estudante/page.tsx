"use client";

/**
 * Student Profile Page - REFACTORED ✨ (Sprint 3: Lazy Loading)
 *
 * Página de perfil de estudante completamente refatorada usando:
 * - useStudentProfile hook (1.511 linhas de lógica centralizada)
 * - Componentes wrapper modulares (6 seções)
 * - Memoização para performance
 * - Lazy loading para componentes pesados
 *
 * ANTES: 1.848 linhas monolíticas
 * DEPOIS: ~180 linhas de composição
 *
 * Redução: 90% 🎉
 */

import { lazy, Suspense } from "react";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { StudentSearch, AtestadoSection, SuspensaoSection } from "./components";
import { SectionSkeleton } from "@/components/common";

// Sprint 3: Lazy loading de componentes pesados (AtestadoSection e SuspensaoSection temporariamente sem lazy para debug)
const FrequencySection = lazy(() => import("./components").then(m => ({ default: m.FrequencySection })));
const InteractionSection = lazy(() => import("./components").then(m => ({ default: m.InteractionSection })));
const ProvaSaoPauloSection = lazy(() => import("./components").then(m => ({ default: m.ProvaSaoPauloSection })));

export default function StudentProfilePage() {
  // ========================================
  // TODA A LÓGICA ESTÁ NO HOOK! 🎯
  // ========================================
  const profile = useStudentProfile();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Toaster position="top-right" richColors />

        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Perfil do Estudante
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Gerenciamento completo de informações, frequência, atestados, suspensões e interações familiares
            </p>
          </div>

          {/* ========================================
              SEÇÃO 1: BUSCA E SELEÇÃO DE ESTUDANTE
              ======================================== */}
          <StudentSearch
            searchName={profile.searchName}
            setSearchName={profile.setSearchName}
            suggestions={profile.suggestions}
            handleSuggestionSelect={profile.handleSuggestionSelect}
            handleSearchName={profile.handleSearchName}
            selectedTurma={profile.selectedTurma}
            setSelectedTurma={profile.setSelectedTurma}
            uniqueTurmas={profile.uniqueTurmas}
            studentsInTurma={profile.studentsInTurma}
            handleSelectStudent={profile.handleSelectStudent}
            student={profile.student}
            loadingProfile={profile.loadingProfile}
          />

          {/* Mostrar seções apenas se houver estudante selecionado */}
          {profile.student && (
            <div className="mt-8 space-y-8">
              {/* ========================================
                  SEÇÃO 2: FREQUÊNCIA E FALTAS
                  ======================================== */}
              <Suspense fallback={<SectionSkeleton />}>
                <FrequencySection
                  student={profile.student}
                  studentRecord={profile.studentRecord}
                  studentRecordWithoutJustified={profile.studentRecordWithoutJustified}
                  absences={profile.absences}
                  atestados={profile.atestados}
                  suspensoes={profile.suspensoes}
                  bimesterDates={profile.bimesterDates}
                  loadingProfile={profile.loadingProfile}
                  userRole={profile.userRole}
                  selectedStudentId={profile.selectedStudentId}
                  onAbsenceDeleted={() => profile.selectedStudentId && profile.fetchStudentData(profile.selectedStudentId)}
                />
              </Suspense>

              {/* ========================================
                  SEÇÃO 3: INTERAÇÕES FAMILIARES
                  ======================================== */}
              <Suspense fallback={<SectionSkeleton />}>
                <InteractionSection
                student={profile.student}
                interactions={profile.interactions}
                interactionType={profile.interactionType}
                setInteractionType={profile.setInteractionType}
                interactionDate={profile.interactionDate}
                setInteractionDate={profile.setInteractionDate}
                interactionDescription={profile.interactionDescription}
                setInteractionDescription={profile.setInteractionDescription}
                interactionSensitive={profile.interactionSensitive}
                setInteractionSensitive={profile.setInteractionSensitive}
                editingInteraction={profile.editingInteraction}
                setEditingInteraction={profile.setEditingInteraction}
                selectedWhatsAppPhones={profile.selectedWhatsAppPhones}
                setSelectedWhatsAppPhones={profile.setSelectedWhatsAppPhones}
                whatsAppMessage={profile.whatsAppMessage}
                setWhatsAppMessage={profile.setWhatsAppMessage}
                isSendingWhatsApp={profile.isSendingWhatsApp}
                whatsAppSendSuccess={profile.whatsAppSendSuccess}
                verifiedWhatsAppNumbers={profile.verifiedWhatsAppNumbers}
                contactVerificationData={profile.contactVerificationData}
                isWhatsAppModalOpen={profile.isWhatsAppModalOpen}
                setIsWhatsAppModalOpen={profile.setIsWhatsAppModalOpen}
                selectedContact={profile.selectedContact}
                setSelectedContact={profile.setSelectedContact}
                handleAddInteraction={profile.handleAddInteraction}
                handleEditInteraction={profile.handleEditInteraction}
                handleDeleteInteraction={profile.handleDeleteInteraction}
                handleWhatsAppClick={profile.handleWhatsAppClick}
                handleRetryVerification={profile.handleRetryVerification}
                handleSendWhatsAppMessage={profile.handleSendWhatsAppMessage}
                handleSaveWhatsAppInteraction={profile.handleSaveWhatsAppInteraction}
                showDeleteDialog={profile.showDeleteDialog}
                setShowDeleteDialog={profile.setShowDeleteDialog}
                userRole={profile.userRole}
                loadingProfile={profile.loadingProfile}
              />
              </Suspense>

              {/* ========================================
                  SEÇÃO 4: ATESTADOS MÉDICOS
                  ======================================== */}
              <AtestadoSection
                student={profile.student}
                atestados={profile.atestados}
                userRole={profile.userRole}
                atestadoStartDate={profile.atestadoStartDate}
                setAtestadoStartDate={profile.setAtestadoStartDate}
                atestadoDays={profile.atestadoDays}
                setAtestadoDays={profile.setAtestadoDays}
                atestadoDescription={profile.atestadoDescription}
                setAtestadoDescription={profile.setAtestadoDescription}
                editingAtestado={profile.editingAtestado}
                setEditingAtestado={profile.setEditingAtestado}
                isSubmittingAtestado={profile.isSubmittingAtestado}
                handleAddAtestado={profile.handleAddAtestado}
                handleEditAtestado={profile.handleEditAtestado}
                handleDeleteAtestado={profile.handleDeleteAtestado}
                showDeleteAtestadoDialog={profile.showDeleteAtestadoDialog}
                setShowDeleteAtestadoDialog={profile.setShowDeleteAtestadoDialog}
              />

              {/* ========================================
                  SEÇÃO 5: SUSPENSÕES
                  ======================================== */}
              <SuspensaoSection
                student={profile.student}
                suspensoes={profile.suspensoes}
                userRole={profile.userRole}
                suspensaoStartDate={profile.suspensaoStartDate}
                setSuspensaoStartDate={profile.setSuspensaoStartDate}
                suspensaoDays={profile.suspensaoDays}
                setSuspensaoDays={profile.setSuspensaoDays}
                suspensaoDescription={profile.suspensaoDescription}
                setSuspensaoDescription={profile.setSuspensaoDescription}
                editingSuspensao={profile.editingSuspensao}
                setEditingSuspensao={profile.setEditingSuspensao}
                handleAddSuspensao={profile.handleAddSuspensao}
                handleEditSuspensao={profile.handleEditSuspensao}
                handleDeleteSuspensao={profile.handleDeleteSuspensao}
                showDeleteSuspensaoDialog={profile.showDeleteSuspensaoDialog}
                setShowDeleteSuspensaoDialog={profile.setShowDeleteSuspensaoDialog}
              />

              {/* ========================================
                  SEÇÃO 6: PROVA SÃO PAULO (OPCIONAL)
                  ======================================== */}
              <Suspense fallback={<SectionSkeleton />}>
                <ProvaSaoPauloSection student={profile.student} />
              </Suspense>
            </div>
          )}

          {/* Empty state: Nenhum estudante selecionado */}
          {!profile.student && !profile.loadingStudents && (
            <div className="mt-12 text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-4">
                <svg
                  className="w-8 h-8 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Selecione um estudante
              </h3>
              <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Use a busca por nome ou selecione uma turma para começar a visualizar o perfil completo do estudante.
              </p>
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
