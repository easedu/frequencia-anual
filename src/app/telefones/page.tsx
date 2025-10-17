"use client";

import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import RegisterInteractionCard from '@/components/interactions/RegisterInteractionCard';
import { logger } from '@/utils/logger';
import { WhatsAppTrackingService } from '@/services/whatsappTrackingService';
import { useStudents } from '@/hooks/useStudents';
import { useContactsManagement } from '@/hooks/useContactsManagement';
import { ContactFilters, ContactStats, ContactList } from '@/components/contacts';
import { EmptySearchState } from '@/components/shared';
import { FullPageSkeleton } from '@/components/shared/LoadingSkeletons';
import {
  Phone,
  RefreshCw,
  Download,
  FileSpreadsheet,
  Users,
  XCircle,
} from 'lucide-react';
import { getAuth } from 'firebase/auth';

// ════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════

export default function TelefonesPage() {
  const { students, loading: studentsLoading } = useStudents(false, true);
  const auth = getAuth();
  const [userRole, setUserRole] = useState<string | null>(null);

  // Hook centralizado com toda lógica
  const {
    // Estados
    searchTerm,
    setSearchTerm,
    verifyingPhone,
    loadingWhatsAppData,
    uploading,
    processingFile,

    // Filtros
    selectedTurma,
    setSelectedTurma,
    selectedVerificationStatus,
    setSelectedVerificationStatus,
    selectedPhoneType,
    setSelectedPhoneType,
    selectedWhatsAppStatus,
    setSelectedWhatsAppStatus,

    // Modal WhatsApp
    isWhatsAppModalOpen,
    setIsWhatsAppModalOpen,
    selectedContact,
    setSelectedContact,
    isSendingWhatsApp,
    whatsAppSendSuccess,
    whatsAppMessage,
    setWhatsAppMessage,
    selectedWhatsAppPhones,
    setSelectedWhatsAppPhones,
    interactionDescription,
    setInteractionDescription,
    interactionSensitive,
    setInteractionSensitive,

    // Computed
    uniqueTurmas,
    filteredPhones,
    stats,
    phoneContacts,
    verifiedWhatsAppNumbers,
    contactVerificationData,

    // Helpers
    formatPhone,

    // Handlers
    verifyWhatsApp,
    copyPhone,
    openWhatsAppModal,
    handleSaveWhatsAppInteraction,
  } = useContactsManagement({ students, studentsLoading });

  // ──────────────────────────────────────────────────────────────
  // Handlers Locais (Exportar e Processar CSV)
  // ──────────────────────────────────────────────────────────────

  const exportToExcel = () => {
    try {
      const headers = [
        'Nº',
        'Telefone Completo',
        'Telefone Original',
        'Nome do Contato',
        'Estudante',
        'Turma',
        'Turno',
        'WhatsApp Verificado',
        'Tem WhatsApp',
        'Data da Verificação'
      ];

      const rows = filteredPhones.map((contact, index) => [
        index + 1,
        `+55${contact.telefone}`,
        contact.telefone,
        contact.nome,
        contact.estudanteNome,
        contact.turma,
        contact.turno,
        contact.whatsAppVerified ? 'Sim' : 'Não',
        contact.hasWhatsApp === undefined ? 'Não verificado' : (contact.hasWhatsApp ? 'Sim' : 'Não'),
        contact.lastVerified ? new Date(contact.lastVerified).toLocaleDateString('pt-BR') : ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(','))
      ].join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

      const today = new Date();
      const dateStr = today.toLocaleDateString('pt-BR').replace(/\//g, '-');
      const fileName = `lista-telefones-${dateStr}.csv`;

      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Arquivo ${fileName} exportado com sucesso!`);
      logger.info('Lista de telefones exportada para CSV', {
        total: filteredPhones.length,
        fileName
      });
    } catch (error) {
      logger.error('Erro ao exportar lista de telefones para CSV', {}, error as Error);
      toast.error('Erro ao exportar arquivo CSV');
    }
  };

  const processExcelFile = async (file: File) => {
    // Esta função seria movida para o hook, mas por simplicidade mantive aqui
    // pois é usada apenas na UI
    try {
      const text = await file.text();
      const parseResult = Papa.parse(text, {
        header: false,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
      });

      const jsonData = parseResult.data as string[][];

      if (jsonData.length === 0) {
        throw new Error('Arquivo está vazio ou não pôde ser lido');
      }

      let processedCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];

        if (!row || row.length === 0) {
          skippedCount++;
          continue;
        }

        try {
          let phone = String(row[0] || '').replace(/\D/g, '');

          if (phone.startsWith('55') && phone.length > 11) {
            phone = phone.substring(2);
          }

          const hasWhatsAppValue = String(row[1] || '').toLowerCase();
          const whatsappName = String(row[2] || '');

          if (phone.length < 10) {
            skippedCount++;
            continue;
          }

          const hasWhatsAppBool = hasWhatsAppValue.includes('true') ||
                                 hasWhatsAppValue.includes('sim') ||
                                 hasWhatsAppValue.includes('yes') ||
                                 hasWhatsAppValue.includes('1') ||
                                 hasWhatsAppValue === 'true';

          await WhatsAppTrackingService.markNumberAsVerified(
            phone,
            hasWhatsAppBool,
            undefined,
            whatsappName || undefined
          );

          processedCount++;

        } catch (error) {
          errorCount++;
        }
      }

      WhatsAppTrackingService.clearCache();
      window.location.reload();

      const message = `Importação concluída!
        ✅ ${processedCount} números processados
        ${errorCount > 0 ? `❌ ${errorCount} erros` : ''}
        ${skippedCount > 0 ? `⚠️ ${skippedCount} linhas puladas` : ''}`;

      toast.success(message);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao processar arquivo: ${errorMessage}`);
    }
  };

  // ──────────────────────────────────────────────────────────────
  // Renderização
  // ──────────────────────────────────────────────────────────────

  if (studentsLoading || loadingWhatsAppData) {
    return <FullPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <Phone className="h-10 w-10 text-blue-600" />
            Lista de Telefones
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Todos os números de telefone da base de dados com verificação de WhatsApp
          </p>
        </div>

        {/* Estatísticas - Componente Extraído */}
        <ContactStats
          total={stats.total}
          verified={stats.verified}
          withWhatsApp={stats.withWhatsApp}
          mobile={stats.mobile}
        />

        {/* Filtros - Componente Extraído */}
        <ContactFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedTurma={selectedTurma}
          onTurmaChange={setSelectedTurma}
          selectedVerificationStatus={selectedVerificationStatus}
          onVerificationStatusChange={setSelectedVerificationStatus}
          selectedPhoneType={selectedPhoneType}
          onPhoneTypeChange={setSelectedPhoneType}
          selectedWhatsAppStatus={selectedWhatsAppStatus}
          onWhatsAppStatusChange={setSelectedWhatsAppStatus}
          uniqueTurmas={uniqueTurmas}
        />

        {/* Ações */}
        <Card className="border-2 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <strong>{filteredPhones.length}</strong> de <strong>{phoneContacts.length}</strong> telefones
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedTurma('all');
                    setSelectedVerificationStatus('all');
                    setSelectedPhoneType('all');
                    setSelectedWhatsAppStatus('all');
                  }}
                  className="text-gray-600"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
                <Button
                  size="sm"
                  onClick={exportToExcel}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Telefones - Componente Extraído */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Resultados ({filteredPhones.length} {filteredPhones.length === 1 ? 'telefone' : 'telefones'})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredPhones.length === 0 ? (
              <EmptySearchState
                title="Nenhum telefone encontrado"
                description="Ajuste os filtros para encontrar resultados"
              />
            ) : (
              <ContactList
                contacts={filteredPhones}
                formatPhone={formatPhone}
                copyPhone={copyPhone}
                verifyWhatsApp={verifyWhatsApp}
                openWhatsAppModal={openWhatsAppModal}
                verifyingPhone={verifyingPhone}
              />
            )}
          </CardContent>
        </Card>

        {/* Upload de Arquivo */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-purple-600" />
              Importar Verificações de WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Faça upload de um arquivo CSV com verificações de WhatsApp para atualizar a base de dados.
                O arquivo deve conter colunas: <code className="bg-gray-100 px-2 py-1 rounded">Telefone</code>, <code className="bg-gray-100 px-2 py-1 rounded">Tem_WhatsApp</code>, <code className="bg-gray-100 px-2 py-1 rounded">Nome_WhatsApp</code>
              </p>

              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      processExcelFile(file);
                    }
                  }}
                  disabled={uploading || processingFile}
                  className="flex-1"
                  key={Math.random()}
                />

                {(uploading || processingFile) && (
                  <div className="flex items-center gap-2 text-purple-600">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm">
                      {uploading ? 'Lendo arquivo...' : 'Processando dados...'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Interaction Modal */}
        <Dialog
          open={isWhatsAppModalOpen && !!selectedContact}
          onOpenChange={(open) => {
            setIsWhatsAppModalOpen(open);
            if (!open) {
              setSelectedContact(null);
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Enviar WhatsApp - {selectedContact?.estudanteNome || ''}
              </DialogTitle>
              <DialogDescription>
                Preencha os campos abaixo para enviar uma mensagem via WhatsApp e registrar a interação
              </DialogDescription>
            </DialogHeader>

            <RegisterInteractionCard
              interactionType="Contato digital"
              interactionDate={new Date().toLocaleDateString('pt-BR')}
              interactionDescription={interactionDescription}
              interactionSensitive={interactionSensitive}
              editingInteraction={null}
              userRole={userRole}
              setInteractionType={() => {}}
              setInteractionDate={() => {}}
              setInteractionDescription={setInteractionDescription}
              setInteractionSensitive={setInteractionSensitive}
              setEditingInteraction={() => {}}
              onAddInteraction={handleSaveWhatsAppInteraction}
              onEditInteraction={async () => {}}
              readonlyType={true}
              readonlyDate={true}
              hideFields={{ type: true, date: true }}
              contacts={selectedContact ?
                phoneContacts
                  .filter(c => c.estudanteId === selectedContact.estudanteId)
                  .map(c => ({
                    nome: c.nome,
                    telefone: c.telefone,
                    parentesco: c.parentesco,
                    podeReceberMensagem: c.podeReceberMensagem
                  }))
                : []
              }
              selectedWhatsAppPhones={selectedWhatsAppPhones}
              onWhatsAppPhonesChange={setSelectedWhatsAppPhones}
              whatsAppMessage={whatsAppMessage}
              onWhatsAppMessageChange={setWhatsAppMessage}
              verifiedWhatsAppNumbers={verifiedWhatsAppNumbers}
              contactVerificationData={contactVerificationData}
              isSendingWhatsApp={isSendingWhatsApp}
              whatsAppSendSuccess={whatsAppSendSuccess}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
