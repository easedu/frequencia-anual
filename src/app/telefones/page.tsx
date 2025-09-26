"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Phone,
  Search,
  MessageCircle,
  CheckCircle,
  XCircle,
  Users,
  RefreshCw,
  Copy,
  ExternalLink,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { useStudents } from '@/hooks/useStudents';
import { toast } from 'sonner';
import { WhatsAppTrackingService } from '@/services/whatsappTrackingService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase.config';
import * as XLSX from 'xlsx';
import WhatsAppModal from '@/components/WhatsAppModal';
import { logger } from '@/utils/logger';

interface PhoneContact {
  telefone: string;
  nome: string;
  estudanteNome: string;
  estudanteId: string;
  turma: string;
  turno: string;
  hasWhatsApp?: boolean;
  whatsAppVerified?: boolean;
  lastVerified?: string;
}

export default function TelefonesPage() {
  const { students, loading: studentsLoading } = useStudents();

  const [phoneContacts, setPhoneContacts] = useState<PhoneContact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [verifyingPhone, setVerifyingPhone] = useState<string | null>(null);
  const [loadingWhatsAppData, setLoadingWhatsAppData] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);

  // Estados para o modal do WhatsApp
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<PhoneContact | null>(null);
  const [verifiedWhatsAppNumbers, setVerifiedWhatsAppNumbers] = useState<Set<string>>(new Set());

  // Extrair todos os telefones dos estudantes
  const extractPhoneContacts = useMemo(() => {
    const contacts: PhoneContact[] = [];

    students.forEach(student => {
      if (student.contatos && student.contatos.length > 0) {
        student.contatos.forEach(contato => {
          if (contato.telefone && contato.telefone.trim()) {
            // Limpar e normalizar número
            const cleanPhone = contato.telefone.replace(/\D/g, '');
            if (cleanPhone.length >= 10) { // Mínimo para um telefone válido
              contacts.push({
                telefone: cleanPhone,
                nome: contato.nome,
                estudanteNome: student.nome,
                estudanteId: student.estudanteId,
                turma: student.turma,
                turno: student.turno
              });
            }
          }
        });
      }
    });

    // Remover duplicatas baseado no número de telefone
    const uniqueContacts = contacts.filter((contact, index, self) =>
      index === self.findIndex(c => c.telefone === contact.telefone)
    );

    return uniqueContacts.sort((a, b) => a.telefone.localeCompare(b.telefone));
  }, [students]);

  // Carregar dados de verificação do WhatsApp
  const loadWhatsAppVerificationData = async () => {
    try {
      setLoadingWhatsAppData(true);

      // Carregar todos os números verificados
      const verifiedNumbers = new Map<string, { hasWhatsApp: boolean; verifiedAt: string }>();

      const querySnapshot = await getDocs(collection(db, 'whatsapp_verified_numbers'));

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const docId = doc.id;

        // Usar o doc.id como chave (que é como o Firebase salva)
        verifiedNumbers.set(docId, {
          hasWhatsApp: data.hasWhatsApp,
          verifiedAt: data.verifiedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });

      // Atualizar contatos com dados de verificação
      const updatedContacts = extractPhoneContacts.map(contact => {
        const verification = verifiedNumbers.get(contact.telefone);
        const hasVerification = !!verification;

        return {
          ...contact,
          hasWhatsApp: verification?.hasWhatsApp,
          whatsAppVerified: hasVerification,
          lastVerified: verification?.verifiedAt
        };
      });

      setPhoneContacts(updatedContacts);

      // Atualizar conjunto de números verificados com WhatsApp
      const numbersWithWhatsApp = new Set<string>();
      verifiedNumbers.forEach((data, phone) => {
        if (data.hasWhatsApp) {
          numbersWithWhatsApp.add(phone);
        }
      });
      setVerifiedWhatsAppNumbers(numbersWithWhatsApp);

    } catch (error) {
      console.error('Erro ao carregar dados de verificação:', error);
      toast.error('Erro ao carregar dados de verificação do WhatsApp');
      // Mesmo com erro, carregar os contatos básicos
      setPhoneContacts(extractPhoneContacts);
    } finally {
      setLoadingWhatsAppData(false);
    }
  };

  useEffect(() => {
    if (extractPhoneContacts.length > 0) {
      loadWhatsAppVerificationData();
    }
  }, [extractPhoneContacts]);

  // Filtrar telefones baseado na busca
  const filteredPhones = useMemo(() => {
    if (!searchTerm.trim()) return phoneContacts;

    const term = searchTerm.toLowerCase();
    return phoneContacts.filter(contact =>
      contact.telefone.includes(term) ||
      contact.nome.toLowerCase().includes(term) ||
      contact.estudanteNome.toLowerCase().includes(term) ||
      contact.turma.toLowerCase().includes(term)
    );
  }, [phoneContacts, searchTerm]);

  // Função para formatar telefone para exibição
  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    } else if (phone.length === 10) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  // Função para verificar WhatsApp usando a API real
  const verifyWhatsApp = async (phone: string) => {
    setVerifyingPhone(phone);

    try {
      // Encontrar o contato para obter informações do estudante
      const contact = phoneContacts.find(c => c.telefone === phone);

      // Usar API route em vez de chamar o serviço diretamente
      const response = await fetch('/api/whatsapp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone,
          studentId: contact?.estudanteId,
          contactName: contact?.nome
        })
      });

      const result = await response.json();

      // Atualizar estado local
      setPhoneContacts(prev => prev.map(c =>
        c.telefone === phone
          ? {
              ...c,
              hasWhatsApp: result.hasWhatsApp,
              whatsAppVerified: true,
              lastVerified: new Date().toISOString()
            }
          : c
      ));

      if (result.success) {
        toast.success(
          result.hasWhatsApp
            ? `WhatsApp encontrado! ${result.whatsappName ? `(${result.whatsappName})` : ''}`
            : "Número verificado - WhatsApp não encontrado"
        );
      } else {
        toast.error(`Erro: ${result.error}`);
      }

    } catch (error) {
      console.error('Erro ao verificar WhatsApp:', error);
      toast.error('Erro ao verificar WhatsApp');
    } finally {
      setVerifyingPhone(null);
    }
  };

  // Função para copiar telefone
  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success('Telefone copiado!');
    } catch (error) {
      toast.error('Erro ao copiar telefone');
    }
  };

  // Função para abrir modal do WhatsApp
  const openWhatsAppModal = (contact: PhoneContact) => {
    setSelectedContact(contact);
    setIsWhatsAppModalOpen(true);
  };

  // Função para enviar mensagem via WhatsApp
  const handleSendWhatsAppMessage = async (
    phone: string,
    message: string,
    checkWhatsApp: boolean = false
  ) => {
    try {
      // Preparar dados da requisição
      const requestData = {
        phone,
        message,
        studentId: selectedContact?.estudanteId,
        contactName: selectedContact?.nome,
        checkWhatsApp
      };

      // Fazer requisição usando a mesma API do envio de mensagens
      const response = await fetch(process.env.NEXT_PUBLIC_WHATSAPP_API_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WHATSAPP_API_TOKEN}`
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Mensagem enviada com sucesso!");

        // Atualizar contador de mensagens se necessário
        if (selectedContact) {
          await WhatsAppTrackingService.updateMessageCount(phone);
        }

        return {
          success: true,
          message: "Mensagem enviada com sucesso!",
          data: result
        };
      } else {
        toast.error(result.message || "Falha ao enviar mensagem");
        return {
          success: false,
          message: result.message || "Falha ao enviar mensagem"
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      logger.error("Erro ao enviar mensagem WhatsApp", {
        phone: `${phone.substring(0, 4)}****${phone.substring(phone.length - 4)}`,
        studentId: selectedContact?.estudanteId
      }, error as Error);

      toast.error("Erro interno ao enviar mensagem");
      return {
        success: false,
        message: "Erro interno ao enviar mensagem",
        error: errorMessage
      };
    }
  };

  // Função para processar arquivo Excel de verificação
  const processExcelFile = async (file: File) => {
    setUploading(true);
    setProcessingFile(true);

    try {
      // Ler arquivo
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      // Pegar a primeira planilha
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Converter para JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length === 0) {
        throw new Error('Arquivo está vazio ou não pôde ser lido');
      }

      if (jsonData.length === 1) {
        throw new Error('Arquivo contém apenas cabeçalho, sem dados para processar');
      }

      // Processar dados
      let processedCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      for (let i = 1; i < jsonData.length; i++) { // Pular header (linha 0)
        const row = jsonData[i];

        if (!row || row.length === 0) {
          skippedCount++;
          continue;
        }

        try {
          let phone = String(row[0] || '').replace(/\D/g, ''); // Limpar número

          // Se o número começa com 55 (código do Brasil), remover para normalizar
          if (phone.startsWith('55') && phone.length > 11) {
            phone = phone.substring(2); // Remove o +55
          }

          const hasWhatsAppValue = String(row[1] || '').toLowerCase();
          const whatsappName = String(row[2] || '');

          if (phone.length < 10) {
            skippedCount++;
            continue;
          }

          // Determinar se tem WhatsApp baseado na coluna
          const hasWhatsAppBool = hasWhatsAppValue.includes('true') ||
                                 hasWhatsAppValue.includes('sim') ||
                                 hasWhatsAppValue.includes('yes') ||
                                 hasWhatsAppValue.includes('1') ||
                                 hasWhatsAppValue === 'true';

          // Salvar no Firebase usando o serviço existente
          await WhatsAppTrackingService.markNumberAsVerified(
            phone,
            hasWhatsAppBool,
            undefined, // studentId (será buscado automaticamente se existir)
            whatsappName || undefined
          );

          processedCount++;

        } catch (error) {
          errorCount++;
        }
      }

      // Limpar cache do WhatsAppTrackingService para forçar nova busca
      WhatsAppTrackingService.clearCache();

      // Atualizar dados locais
      await loadWhatsAppVerificationData();

      const message = `Importação concluída!
        ✅ ${processedCount} números processados
        ${errorCount > 0 ? `❌ ${errorCount} erros` : ''}
        ${skippedCount > 0 ? `⚠️ ${skippedCount} linhas puladas` : ''}`;

      toast.success(message);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao processar arquivo: ${errorMessage}`);
    } finally {
      setUploading(false);
      setProcessingFile(false);
    }
  };

  // Função para exportar para Excel
  const exportToExcel = () => {
    try {
      // Preparar dados para exportação
      const exportData = filteredPhones.map((contact, index) => ({
        'Nº': index + 1,
        'Telefone Completo': `+55${contact.telefone}`,
        'Telefone Original': contact.telefone,
        'Nome do Contato': contact.nome,
        'Estudante': contact.estudanteNome,
        'Turma': contact.turma,
        'Turno': contact.turno,
        'WhatsApp Verificado': contact.whatsAppVerified ? 'Sim' : 'Não',
        'Tem WhatsApp': contact.hasWhatsApp === undefined ? 'Não verificado' : (contact.hasWhatsApp ? 'Sim' : 'Não'),
        'Data da Verificação': contact.lastVerified ? new Date(contact.lastVerified).toLocaleDateString('pt-BR') : ''
      }));

      // Criar workbook e worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Configurar largura das colunas
      const columnWidths = [
        { wch: 5 },   // Nº
        { wch: 18 },  // Telefone Completo
        { wch: 15 },  // Telefone Original
        { wch: 25 },  // Nome do Contato
        { wch: 30 },  // Estudante
        { wch: 8 },   // Turma
        { wch: 10 },  // Turno
        { wch: 18 },  // WhatsApp Verificado
        { wch: 15 },  // Tem WhatsApp
        { wch: 18 }   // Data da Verificação
      ];
      worksheet['!cols'] = columnWidths;

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Lista de Telefones');

      // Gerar nome do arquivo com data atual
      const today = new Date();
      const dateStr = today.toLocaleDateString('pt-BR').replace(/\//g, '-');
      const fileName = `lista-telefones-${dateStr}.xlsx`;

      // Fazer download
      XLSX.writeFile(workbook, fileName);

      toast.success(`Arquivo ${fileName} exportado com sucesso!`);
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      toast.error('Erro ao exportar arquivo Excel');
    }
  };

  // Estatísticas
  const stats = useMemo(() => {
    const total = phoneContacts.length;
    const verified = phoneContacts.filter(c => c.whatsAppVerified).length;
    const hasWhatsApp = phoneContacts.filter(c => c.hasWhatsApp).length;
    const noWhatsApp = phoneContacts.filter(c => c.whatsAppVerified && !c.hasWhatsApp).length;

    return { total, verified, hasWhatsApp, noWhatsApp };
  }, [phoneContacts]);

  if (studentsLoading || loadingWhatsAppData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">
            {studentsLoading ? 'Carregando dados dos estudantes...' : 'Carregando dados de verificação do WhatsApp...'}
          </p>
        </div>
      </div>
    );
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

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-100">Total de Telefones</p>
                  <p className="text-3xl font-bold text-white">{stats.total}</p>
                </div>
                <Phone className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-600 to-purple-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-100">Verificados</p>
                  <p className="text-3xl font-bold text-white">{stats.verified}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-600 to-green-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-100">Com WhatsApp</p>
                  <p className="text-3xl font-bold text-white">{stats.hasWhatsApp}</p>
                </div>
                <MessageCircle className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-600 to-red-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-100">Sem WhatsApp</p>
                  <p className="text-3xl font-bold text-white">{stats.noWhatsApp}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />
              Buscar Telefones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Buscar por telefone, nome ou turma</Label>
                <Input
                  id="search"
                  placeholder="Digite para buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  onClick={loadWhatsAppVerificationData}
                  disabled={loadingWhatsAppData}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  {loadingWhatsAppData ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Atualizar
                </Button>

                <Button
                  variant="default"
                  onClick={exportToExcel}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>

              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Telefones */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Telefones Encontrados ({filteredPhones.length})
              </div>
              <div className="text-sm font-normal text-gray-600">
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredPhones.map((contact, index) => (
                <div
                  key={`${contact.telefone}-${index}`}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-semibold text-gray-900">
                        {formatPhone(contact.telefone)}
                      </span>
                      {contact.whatsAppVerified && (
                        <Badge
                          variant={contact.hasWhatsApp ? "default" : "secondary"}
                          className={contact.hasWhatsApp ? "bg-green-600" : "bg-gray-500"}
                        >
                          {contact.hasWhatsApp ? "WhatsApp ✓" : "Sem WhatsApp"}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{contact.nome}</span> - {contact.estudanteNome}
                    </div>
                    <div className="text-xs text-gray-500">
                      Turma: {contact.turma} | Turno: {contact.turno}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyPhone(contact.telefone)}
                      title="Copiar telefone"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar
                    </Button>

                    {contact.hasWhatsApp && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openWhatsAppModal(contact)}
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        title="Enviar mensagem via WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        WhatsApp
                      </Button>
                    )}

                    {(!contact.whatsAppVerified || (contact.whatsAppVerified && !contact.hasWhatsApp)) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => verifyWhatsApp(contact.telefone)}
                        disabled={verifyingPhone === contact.telefone}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        {verifyingPhone === contact.telefone ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                            Verificando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {contact.whatsAppVerified && !contact.hasWhatsApp ? 'Reverificar' : 'Verificar'}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {filteredPhones.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum telefone encontrado</p>
                </div>
              )}
            </div>
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
                Faça upload de um arquivo Excel com verificações de WhatsApp para atualizar a base de dados.
                O arquivo deve conter colunas: <code className="bg-gray-100 px-2 py-1 rounded">Telefone</code>, <code className="bg-gray-100 px-2 py-1 rounded">Tem_WhatsApp</code>, <code className="bg-gray-100 px-2 py-1 rounded">Nome_WhatsApp</code>
              </p>

              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      processExcelFile(file);
                    }
                  }}
                  disabled={uploading || processingFile}
                  className="flex-1"
                  key={Math.random()} // Force reset after each upload
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

        {/* WhatsApp Modal */}
        <WhatsAppModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            setSelectedContact(null);
          }}
          student={{
            nome: selectedContact?.estudanteNome || '',
            estudanteId: selectedContact?.estudanteId || '',
            turma: selectedContact?.turma || '',
            turno: (selectedContact?.turno as "MANHÃ" | "TARDE") || "MANHÃ",
            status: "ATIVO",
            bolsaFamilia: "NÃO",
            contatos: selectedContact ? [{
              nome: selectedContact.nome,
              telefone: selectedContact.telefone
            }] : []
          }}
          selectedContact={selectedContact ? {
            nome: selectedContact.nome,
            telefone: selectedContact.telefone
          } : null}
          onSendMessage={handleSendWhatsAppMessage}
          verifiedNumbers={verifiedWhatsAppNumbers}
        />
      </div>
    </div>
  );
}