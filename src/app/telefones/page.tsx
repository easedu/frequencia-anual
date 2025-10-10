"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useDebounce } from "@/hooks/useDebounce";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  FileSpreadsheet,
  Filter,
  Smartphone,
  PhoneCall,
  GraduationCap
} from 'lucide-react';
import { useStudents } from '@/hooks/useStudents';
import { toast } from 'sonner';
import { WhatsAppTrackingService } from '@/services/whatsappTrackingService';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase.config';
// Removido xlsx por vulnerabilidades de segurança - usando CSV nativo + papaparse
import Papa from 'papaparse';
import WhatsAppModal from '@/components/whatsapp/WhatsAppModal';
import { logger } from '@/utils/logger';
import { getStudentContacts } from '@/services/studentDataService';

interface PhoneContact {
  telefone: string;
  nome: string;
  parentesco?: string;
  estudanteNome: string;
  estudanteId: string;
  turma: string;
  turno: string;
  hasWhatsApp?: boolean;
  whatsAppVerified?: boolean;
  lastVerified?: string;
}

export default function TelefonesPage() {
  // PERFORMANCE: includeContacts=true (página PRECISA de contatos para extrair telefones)
  const { students, loading: studentsLoading } = useStudents(false, true);

  const [phoneContacts, setPhoneContacts] = useState<PhoneContact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [verifyingPhone, setVerifyingPhone] = useState<string | null>(null);
  const [loadingWhatsAppData, setLoadingWhatsAppData] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);

  // Smart Filters
  const [selectedTurma, setSelectedTurma] = useState<string>('all');
  const [selectedVerificationStatus, setSelectedVerificationStatus] = useState<string>('all');
  const [selectedPhoneType, setSelectedPhoneType] = useState<string>('all');
  const [selectedWhatsAppStatus, setSelectedWhatsAppStatus] = useState<string>('all');

  // Estados para o modal do WhatsApp
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<PhoneContact | null>(null);
  const [verifiedWhatsAppNumbers, setVerifiedWhatsAppNumbers] = useState<Set<string>>(new Set());

  // Extrair todos os telefones dos estudantes COM dados de WhatsApp já incluídos
  const extractPhoneContacts = useMemo(() => {
    const contacts: PhoneContact[] = [];

    students.forEach(student => {
      if (student.contatos && student.contatos.length > 0) {
        student.contatos.forEach((contato: any) => {
          if (contato.telefone && contato.telefone.trim()) {
            // Limpar e normalizar número
            const cleanPhone = contato.telefone.replace(/\D/g, '');
            if (cleanPhone.length >= 10) { // Mínimo para um telefone válido
              contacts.push({
                telefone: cleanPhone,
                nome: contato.nome,
                parentesco: contato.parentesco,
                estudanteNome: student.nome,
                estudanteId: student.estudanteId,
                turma: student.turma,
                turno: student.turno,
                // INCLUIR dados de WhatsApp que já vêm do StudentDataService
                whatsAppVerified: contato.whatsappVerified || false,
                hasWhatsApp: contato.hasWhatsApp || false,
                lastVerified: contato.whatsappVerifiedAt || undefined,
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

  // PERFORMANCE OTIMIZADA: Dados já vêm da estrutura V3 (sem query extra!)
  useEffect(() => {
    if (extractPhoneContacts.length > 0) {
      console.log('[TELEFONES] ✅ Dados de WhatsApp já incluídos nos contatos V3!');
      setPhoneContacts(extractPhoneContacts);

      // Atualizar conjunto de números verificados
      const numbersWithWhatsApp = new Set<string>();
      extractPhoneContacts.forEach(contact => {
        if (contact.hasWhatsApp) {
          numbersWithWhatsApp.add(contact.telefone);
        }
      });
      setVerifiedWhatsAppNumbers(numbersWithWhatsApp);
      setLoadingWhatsAppData(false);
    }
  }, [extractPhoneContacts]);

  // Extrair turmas únicas para o filtro
  const uniqueTurmas = useMemo(() => {
    const turmas = new Set(phoneContacts.map(c => c.turma));
    return Array.from(turmas).sort((a, b) => {
      const matchA = a.match(/(\d+)([A-Z]+)/);
      const matchB = b.match(/(\d+)([A-Z]+)/);
      if (!matchA || !matchB) return 0;
      const [, numA, letterA] = matchA;
      const [, numB, letterB] = matchB;
      const numCompare = Number(numA) - Number(numB);
      if (numCompare !== 0) return numCompare;
      return letterA.localeCompare(letterB);
    });
  }, [phoneContacts]);

  // Filtrar telefones com SMART FILTERS e ordenar por turma e nome do estudante
  const filteredPhones = useMemo(() => {
    let filtered = [...phoneContacts];

    // Filtro de busca por texto
    if (debouncedSearchTerm.trim()) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.telefone.includes(term) ||
        contact.nome.toLowerCase().includes(term) ||
        contact.estudanteNome.toLowerCase().includes(term) ||
        contact.turma.toLowerCase().includes(term)
      );
    }

    // Filtro por turma
    if (selectedTurma !== 'all') {
      filtered = filtered.filter(c => c.turma === selectedTurma);
    }

    // Filtro por status de verificação
    if (selectedVerificationStatus === 'verified') {
      filtered = filtered.filter(c => c.whatsAppVerified);
    } else if (selectedVerificationStatus === 'not-verified') {
      filtered = filtered.filter(c => !c.whatsAppVerified);
    }

    // Filtro por tipo de telefone (fixo/celular)
    if (selectedPhoneType === 'mobile') {
      filtered = filtered.filter(c => c.telefone.length === 11); // Celular tem 11 dígitos
    } else if (selectedPhoneType === 'landline') {
      filtered = filtered.filter(c => c.telefone.length === 10); // Fixo tem 10 dígitos
    }

    // Filtro por status do WhatsApp
    if (selectedWhatsAppStatus === 'has-whatsapp') {
      filtered = filtered.filter(c => c.hasWhatsApp === true);
    } else if (selectedWhatsAppStatus === 'no-whatsapp') {
      filtered = filtered.filter(c => c.whatsAppVerified && c.hasWhatsApp === false);
    }

    // ORDENAR: Primeiro por turma (1A, 1B, 2A...), depois por nome do estudante
    return filtered.sort((a, b) => {
      // Comparar turmas
      const matchA = a.turma.match(/(\d+)([A-Z]+)/);
      const matchB = b.turma.match(/(\d+)([A-Z]+)/);

      if (matchA && matchB) {
        const [, numA, letterA] = matchA;
        const [, numB, letterB] = matchB;

        const numCompare = Number(numA) - Number(numB);
        if (numCompare !== 0) return numCompare;

        const letterCompare = letterA.localeCompare(letterB);
        if (letterCompare !== 0) return letterCompare;
      }

      // Se turmas iguais, ordenar por nome do estudante
      return a.estudanteNome.localeCompare(b.estudanteNome);
    });
  }, [phoneContacts, debouncedSearchTerm, selectedTurma, selectedVerificationStatus, selectedPhoneType, selectedWhatsAppStatus]);

  // Função para formatar telefone para exibição
  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    } else if (phone.length === 10) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  // FASE 3: Função para verificar WhatsApp e SALVAR no Firestore (dual-write)
  // Helper: Buscar o ID real do contato no Firestore
  const getContactId = async (studentId: string, phone: string): Promise<string | undefined> => {
    try {
      const contactsRef = collection(db, 'students', studentId, 'contacts');
      const contactsSnap = await getDocs(contactsRef);

      for (const doc of contactsSnap.docs) {
        const data = doc.data();
        const cleanPhone = data.telefone?.replace(/\D/g, '');
        if (cleanPhone === phone) {
          return doc.id;
        }
      }

      return undefined;
    } catch (error) {
      console.error('[TELEFONES] Erro ao buscar contactId:', error);
      return undefined;
    }
  };

  const verifyWhatsApp = async (phone: string) => {
    setVerifyingPhone(phone);

    try {
      // Encontrar o contato para obter informações do estudante
      const contact = phoneContacts.find(c => c.telefone === phone);

      if (!contact) {
        toast.error('Contato não encontrado');
        return;
      }

      console.log('[TELEFONES-VERIFY] Iniciando verificação:', {
        phone: `${phone.substring(0, 4)}****`,
        estudanteId: contact.estudanteId,
        nome: contact.nome
      });

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

      // Verificar se a resposta é válida
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta da API:', errorText);
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('[TELEFONES-VERIFY] ✅ Verificação bem-sucedida, salvando no Firestore...');

        // BUSCAR O ID REAL DO CONTATO NO FIRESTORE
        const contactId = await getContactId(contact.estudanteId, phone);

        console.log('[TELEFONES-VERIFY] contactId encontrado:', contactId || 'não encontrado');

        try {
          // Salvar usando WhatsAppTrackingService (dual-write automático)
          await WhatsAppTrackingService.markNumberAsVerified(
            phone,
            result.hasWhatsApp,
            contact.estudanteId,
            contact.nome,
            'verified',
            contactId // ID REAL do documento no Firestore
          );

          console.log('[TELEFONES-VERIFY] ✅ Salvo no Firestore com dual-write');

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

          toast.success(
            result.hasWhatsApp
              ? `WhatsApp encontrado e salvo! ${result.whatsappName ? `(${result.whatsappName})` : ''}`
              : "Número verificado e salvo - WhatsApp não encontrado"
          );
        } catch (saveError) {
          console.error('[TELEFONES-VERIFY] ❌ Erro ao salvar no Firestore:', saveError);
          toast.error('Verificação OK, mas erro ao salvar. Tente novamente.');
          throw saveError;
        }
      } else {
        toast.error(`Erro: ${result.error || 'Erro desconhecido'}`);
      }

    } catch (error) {
      console.error('[TELEFONES-VERIFY] Erro ao verificar WhatsApp:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Falha na verificação: ${errorMessage}`);
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
      // Usar API route para envio de mensagens
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          message
        })
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

  // Função para processar arquivo CSV de verificação (substituindo Excel)
  const processExcelFile = async (file: File) => {
    setUploading(true);
    setProcessingFile(true);

    try {
      // Ler arquivo CSV com papaparse
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

      // Recarregar página para pegar novos dados
      window.location.reload();

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

  // Função para exportar para CSV (substituindo Excel por segurança)
  const exportToExcel = () => {
    try {
      // Cabeçalhos
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

      // Dados
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

      // Combinar cabeçalhos e dados
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
          // Escapar células que contêm vírgulas ou aspas
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(','))
      ].join('\n');

      // Adicionar BOM UTF-8 para Excel reconhecer caracteres especiais
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

      // Gerar nome do arquivo com data atual
      const today = new Date();
      const dateStr = today.toLocaleDateString('pt-BR').replace(/\//g, '-');
      const fileName = `lista-telefones-${dateStr}.csv`;

      // Criar link de download
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

        {/* Smart Filters */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-blue-600" />
              Filtros Inteligentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Busca por texto */}
            <div>
              <Label htmlFor="search" className="flex items-center gap-2 mb-2">
                <Search className="h-4 w-4 text-gray-500" />
                Buscar por telefone, nome ou estudante
              </Label>
              <Input
                id="search"
                placeholder="Digite para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Filtros em grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtro por Turma */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <GraduationCap className="h-4 w-4 text-gray-500" />
                  Turma
                </Label>
                <Select value={selectedTurma} onValueChange={setSelectedTurma}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todas as turmas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as turmas</SelectItem>
                    {uniqueTurmas.map(turma => (
                      <SelectItem key={turma} value={turma}>{turma}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Status de Verificação */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-gray-500" />
                  Verificação
                </Label>
                <Select value={selectedVerificationStatus} onValueChange={setSelectedVerificationStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="verified">✓ Verificados</SelectItem>
                    <SelectItem value="not-verified">○ Não verificados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Tipo de Telefone */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Smartphone className="h-4 w-4 text-gray-500" />
                  Tipo de Telefone
                </Label>
                <Select value={selectedPhoneType} onValueChange={setSelectedPhoneType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="mobile">📱 Celular</SelectItem>
                    <SelectItem value="landline">☎️ Fixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por WhatsApp */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <MessageCircle className="h-4 w-4 text-gray-500" />
                  WhatsApp
                </Label>
                <Select value={selectedWhatsAppStatus} onValueChange={setSelectedWhatsAppStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="has-whatsapp">✓ Com WhatsApp</SelectItem>
                    <SelectItem value="no-whatsapp">✗ Sem WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex items-center justify-between pt-4 border-t">
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

        {/* Lista de Telefones - Tabela Moderna */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Resultados ({filteredPhones.length} {filteredPhones.length === 1 ? 'telefone' : 'telefones'})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredPhones.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Phone className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhum telefone encontrado</p>
                <p className="text-sm mt-2">Ajuste os filtros para encontrar resultados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Turma
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estudante
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contato
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Parentesco
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Telefone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        WhatsApp
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPhones.map((contact, index) => (
                      <tr
                        key={`${contact.telefone}-${index}`}
                        className="hover:bg-blue-50/50 transition-colors duration-150"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <GraduationCap className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-bold text-gray-900">{contact.turma}</div>
                              <div className="text-xs text-gray-500">{contact.turno}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{contact.estudanteNome}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{contact.nome}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">
                            {contact.parentesco || <span className="text-gray-400 italic">N/A</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="font-mono text-sm font-medium text-gray-900">
                              {formatPhone(contact.telefone)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyPhone(contact.telefone)}
                              className="h-6 w-6 p-0 hover:bg-blue-100"
                            >
                              <Copy className="h-3 w-3 text-gray-500" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center">
                            {contact.whatsAppVerified ? (
                              contact.hasWhatsApp ? (
                                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100" title="WhatsApp verificado e disponível">
                                  <MessageCircle className="h-4 w-4 text-green-600" />
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100" title="Verificado - sem WhatsApp">
                                  <XCircle className="h-4 w-4 text-gray-500" />
                                </div>
                              )
                            ) : (
                              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100" title="Não verificado">
                                <RefreshCw className="h-4 w-4 text-orange-500" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {contact.hasWhatsApp && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openWhatsAppModal(contact)}
                                className="text-green-600 border-green-200 hover:bg-green-50"
                              >
                                <MessageCircle className="h-4 w-4 mr-1" />
                                Enviar
                              </Button>
                            )}

                            {(!contact.whatsAppVerified || (contact.whatsAppVerified && !contact.hasWhatsApp)) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => verifyWhatsApp(contact.telefone)}
                                disabled={verifyingPhone === contact.telefone}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                {verifyingPhone === contact.telefone ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                                    Verificando
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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