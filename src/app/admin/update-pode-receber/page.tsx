'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db } from '@/firebase.config';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface UpdateResult {
  totalStudents: number;
  totalContacts: number;
  updated: number;
  skipped: number;
  errors: number;
}

export default function UpdatePodeReceberPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const updatePodeReceber = async () => {
    setIsLoading(true);
    setLogs([]);
    setResult(null);

    const SCHOOL_YEAR = process.env.NEXT_PUBLIC_SCHOOL_YEAR || new Date().getFullYear().toString();

    try {
      addLog('🚀 Iniciando atualização...');

      // PASSO 1: Carregar números com WhatsApp
      addLog('📱 Carregando números verificados...');
      const whatsappRef = collection(db, 'whatsapp_verified_numbers');
      const whatsappSnapshot = await getDocs(whatsappRef);

      const numerosComWhatsApp = new Set<string>();
      whatsappSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.hasWhatsApp === true) {
          numerosComWhatsApp.add(docSnap.id);
        }
      });

      addLog(`✅ ${numerosComWhatsApp.size} números com WhatsApp encontrados`);

      // PASSO 2: Carregar estudantes
      addLog('👥 Carregando estudantes...');
      const studentsDocRef = doc(db, SCHOOL_YEAR, 'lista_de_estudantes');
      const studentsDocSnap = await getDoc(studentsDocRef);

      if (!studentsDocSnap.exists()) {
        throw new Error('Documento de estudantes não encontrado');
      }

      const studentsData = studentsDocSnap.data();
      const allStudents = studentsData.estudantes || [];

      addLog(`✅ ${allStudents.length} estudantes encontrados`);

      // PASSO 3: Processar estudantes
      let totalStudentsProcessed = 0;
      let totalContactsProcessed = 0;
      let totalContactsUpdated = 0;
      let totalContactsSkipped = 0;
      let totalErrors = 0;

      const updatedStudents = allStudents.map((student: any) => {
        if (!student.contatos || student.contatos.length === 0) {
          return student;
        }

        totalStudentsProcessed++;

        const updatedContatos = student.contatos.map((contato: any) => {
          totalContactsProcessed++;

          const telefone = contato.telefone || '';
          const cleanPhone = telefone.replace(/\D/g, '');

          // Verificar se é celular (11 dígitos e terceiro dígito = 9)
          const isCelular = cleanPhone.length === 11 && cleanPhone[2] === '9';
          const temWhatsApp = numerosComWhatsApp.has(cleanPhone);

          // Celular com WhatsApp = pode receber
          if (isCelular && temWhatsApp) {
            if (contato.podeReceberMensagem !== true) {
              addLog(`✓ ${student.nome?.substring(0, 30)} - ${contato.nome || 'Sem nome'}: ${telefone} → pode receber`);
              totalContactsUpdated++;
              return { ...contato, podeReceberMensagem: true };
            } else {
              totalContactsSkipped++;
              return contato;
            }
          }

          // Celular sem WhatsApp ou fixo = não pode receber
          if (contato.podeReceberMensagem !== false) {
            const motivo = !isCelular ? 'fixo' : 'sem WhatsApp';
            addLog(`✗ ${student.nome?.substring(0, 30)} - ${contato.nome || 'Sem nome'}: ${telefone} → não pode (${motivo})`);
            totalContactsUpdated++;
            return { ...contato, podeReceberMensagem: false };
          }

          totalContactsSkipped++;
          return contato;
        });

        return { ...student, contatos: updatedContatos };
      });

      // PASSO 4: Salvar no Firebase
      addLog('💾 Salvando alterações no Firebase...');
      await updateDoc(studentsDocRef, {
        estudantes: updatedStudents
      });

      addLog('✅ Atualização concluída!');

      setResult({
        totalStudents: totalStudentsProcessed,
        totalContacts: totalContactsProcessed,
        updated: totalContactsUpdated,
        skipped: totalContactsSkipped,
        errors: totalErrors
      });

      toast.success(`Atualização concluída! ${totalContactsUpdated} contatos atualizados.`);

    } catch (error: any) {
      console.error('Erro:', error);
      addLog(`❌ ERRO: ${error.message}`);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Toaster position="top-right" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-6 h-6" />
            Atualizar podeReceberMensagem
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Este processo atualiza o campo <code className="bg-gray-100 px-1 rounded">podeReceberMensagem</code> em todos os contatos baseado em:
          </p>
          <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
            <li>Celulares (11 dígitos, 3º dígito = 9) <strong>com WhatsApp verificado</strong> = <span className="text-green-600 font-semibold">true</span></li>
            <li>Celulares sem WhatsApp ou telefones fixos = <span className="text-red-600 font-semibold">false</span></li>
          </ul>
        </CardHeader>

        <CardContent className="space-y-4">
          <Button
            onClick={updatePodeReceber}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Iniciar Atualização
              </>
            )}
          </Button>

          {result && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Resumo da Atualização
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Estudantes processados:</span>
                    <span className="font-semibold ml-2">{result.totalStudents}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Contatos processados:</span>
                    <span className="font-semibold ml-2">{result.totalContacts}</span>
                  </div>
                  <div>
                    <span className="text-green-600">Contatos atualizados:</span>
                    <span className="font-semibold ml-2 text-green-700">{result.updated}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Contatos já corretos:</span>
                    <span className="font-semibold ml-2">{result.skipped}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Logs de Execução</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black text-green-400 p-4 rounded font-mono text-xs max-h-96 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
