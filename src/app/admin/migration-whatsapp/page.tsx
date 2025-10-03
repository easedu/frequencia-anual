"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Database,
  Users,
  Phone,
  AlertTriangle,
  TrendingUp,
  FileText
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';

interface AnalysisData {
  success: boolean;
  currentState: {
    totalStudents: number;
    activeStudents: number;
    totalContacts: number;
    totalWhatsAppVerified: number;
    orphanNumbers: number;
    duplicates: number;
  };
  newStructure: {
    exists: boolean;
    totalMigrated: number;
    percentage: number;
  };
  issues: string[];
  timestamp: string;
}

interface CreateStructureResult {
  success: boolean;
  dryRun: boolean;
  studentsProcessed: number;
  contactsCreated: number;
  errors: string[];
  preview?: {
    sampleStudent: string;
    sampleContacts: number;
    path: string;
  };
  validation: {
    oldDataIntact: boolean;
    newStructureCreated: boolean;
  };
}

interface MigrateDataResult {
  success: boolean;
  dryRun: boolean;
  progress: {
    studentsProcessed: number;
    contactsMigrated: number;
    whatsappIntegrated: number;
    currentBatch: number;
    totalBatches: number;
  };
  validation: {
    oldDataIntact: boolean;
    newDataCreated: boolean;
    countMatch: boolean;
  };
  errors: string[];
  warnings: string[];
  preview?: {
    sampleStudentId: string;
    sampleContact: any;
    estimatedTime: string;
  };
}

export default function MigrationWhatsAppPage() {
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [creatingStructure, setCreatingStructure] = useState(false);
  const [structureResult, setStructureResult] = useState<CreateStructureResult | null>(null);
  const [simulationComplete, setSimulationComplete] = useState(false);

  // Fase 2: Migração de dados
  const [migratingData, setMigratingData] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrateDataResult | null>(null);
  const [dataMigrationSimComplete, setDataMigrationSimComplete] = useState(false);

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/migration-whatsapp-analysis');
      const data: AnalysisData = await response.json();

      if (data.success) {
        setAnalysisData(data);
        toast.success('Análise carregada com sucesso');
      } else {
        toast.error('Erro ao carregar análise');
      }
    } catch (error) {
      console.error('Erro ao carregar análise:', error);
      toast.error('Erro ao conectar com servidor');
    } finally {
      setLoading(false);
    }
  };

  // Criar estrutura (simulação ou real)
  const createStructure = async (dryRun: boolean) => {
    setCreatingStructure(true);
    try {
      const response = await fetch('/api/admin/migration-whatsapp-create-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun })
      });

      const data: CreateStructureResult = await response.json();

      if (data.success) {
        setStructureResult(data);

        if (dryRun) {
          setSimulationComplete(true);
          toast.success(`✅ Simulação concluída! ${data.studentsProcessed} estudantes processados, ${data.contactsCreated} contatos serão criados.`);
        } else {
          toast.success(`✅ Estrutura criada com sucesso! ${data.studentsProcessed} estudantes, ${data.contactsCreated} contatos criados.`);
          // Recarregar análise após criação real
          await loadAnalysis();
          setSimulationComplete(false);
        }
      } else {
        toast.error('Erro ao criar estrutura');
      }
    } catch (error) {
      console.error('Erro ao criar estrutura:', error);
      toast.error('Erro ao conectar com servidor');
    } finally {
      setCreatingStructure(false);
    }
  };

  // Migrar dados (simulação ou real)
  const migrateData = async (dryRun: boolean) => {
    setMigratingData(true);
    try {
      const response = await fetch('/api/admin/migration-whatsapp-migrate-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun,
          batchSize: 735, // Processar todos de uma vez (735 estudantes)
          startFrom: 0
        })
      });

      const data: MigrateDataResult = await response.json();

      if (data.success) {
        setMigrationResult(data);

        if (dryRun) {
          setDataMigrationSimComplete(true);
          toast.success(`✅ Simulação concluída! ${data.progress.contactsMigrated} contatos prontos para migrar. WhatsApp integrado: ${data.progress.whatsappIntegrated}`);
        } else {
          toast.success(`✅ Migração concluída! ${data.progress.contactsMigrated} contatos migrados com ${data.progress.whatsappIntegrated} verificações WhatsApp.`);
          // Recarregar análise após migração real
          await loadAnalysis();
          setDataMigrationSimComplete(false);
        }
      } else {
        toast.error('Erro ao migrar dados');
      }
    } catch (error) {
      console.error('Erro ao migrar dados:', error);
      toast.error('Erro ao conectar com servidor');
    } finally {
      setMigratingData(false);
    }
  };

  // Carregar análise automaticamente ao montar
  useEffect(() => {
    loadAnalysis();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-purple-600 to-pink-600">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3 text-white text-2xl">
                  <Database className="h-8 w-8" />
                  Migração - Estrutura WhatsApp
                </CardTitle>
                <p className="text-purple-100 mt-2">
                  Análise e migração de dados de verificação WhatsApp
                </p>
              </div>
              <Link href="/docs/migration-whatsapp-plan.md" target="_blank">
                <Button variant="secondary" size="sm" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Ver Documentação
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>

        {/* Análise do Estado Atual */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5 text-blue-600" />
                Análise do Estado Atual
              </CardTitle>
              <Button
                onClick={loadAnalysis}
                disabled={loading}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {loading && !analysisData ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : analysisData ? (
              <div className="space-y-6">

                {/* Grid de Métricas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  {/* Estudantes */}
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-600 rounded-lg">
                          <Users className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-blue-600 font-medium">Estudantes</p>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {analysisData.currentState.totalStudents}
                          </p>
                          <p className="text-xs text-blue-700">
                            {analysisData.currentState.activeStudents} ativos
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contatos */}
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-600 rounded-lg">
                          <Phone className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-green-600 font-medium">Contatos</p>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                            {analysisData.currentState.totalContacts}
                          </p>
                          <p className="text-xs text-green-700">
                            Total cadastrados
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* WhatsApp Verificados */}
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-600 rounded-lg">
                          <CheckCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-purple-600 font-medium">WhatsApp Verificados</p>
                          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                            {analysisData.currentState.totalWhatsAppVerified}
                          </p>
                          <p className="text-xs text-purple-700">
                            Estrutura antiga
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                </div>

                {/* Problemas Identificados */}
                {analysisData.currentState.orphanNumbers > 0 && (
                  <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <AlertDescription className="text-orange-800 dark:text-orange-200">
                      <strong>Números órfãos encontrados:</strong> {analysisData.currentState.orphanNumbers} números
                      verificados sem estudante associado.
                    </AlertDescription>
                  </Alert>
                )}

                {analysisData.currentState.duplicates > 0 && (
                  <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                      <strong>Possíveis duplicados:</strong> {analysisData.currentState.duplicates} registros
                      podem estar duplicados entre estruturas.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Issues */}
                {analysisData.issues.length > 0 && (
                  <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200 text-base">
                        <AlertCircle className="h-5 w-5" />
                        Issues Identificados
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysisData.issues.map((issue, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                            <span className="mt-1">•</span>
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-5 w-5" />
                <AlertDescription>
                  Nenhuma análise carregada. Clique em "Atualizar" para iniciar.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Status da Migração */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-700">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Status da Nova Estrutura
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-6">
            {analysisData ? (
              <div className="space-y-4">

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progresso da Migração</span>
                    <Badge variant={analysisData.newStructure.percentage === 100 ? "default" : "secondary"}>
                      {analysisData.newStructure.percentage}%
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${analysisData.newStructure.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Estatísticas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Estrutura Nova</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {analysisData.newStructure.exists ? 'Criada' : 'Não criada'}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Estudantes Migrados</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {analysisData.newStructure.totalMigrated} / {analysisData.currentState.totalStudents}
                    </p>
                  </div>
                </div>

              </div>
            ) : (
              <p className="text-sm text-slate-600">Carregue a análise para ver o status</p>
            )}
          </CardContent>
        </Card>

        {/* Ações */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-700">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-purple-600" />
              Fase 1 - Criar Estrutura Paralela
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => createStructure(true)}
                disabled={creatingStructure || !analysisData || analysisData.newStructure.exists}
              >
                <RefreshCw className={`h-5 w-5 ${creatingStructure ? 'animate-spin' : ''}`} />
                <span>Simular Criação</span>
                <span className="text-xs text-slate-500">
                  {analysisData?.newStructure.exists ? '(Estrutura já criada)' : '(Dry-run - sem modificar dados)'}
                </span>
              </Button>

              <Button
                variant="default"
                className="h-20 flex-col gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                onClick={() => createStructure(false)}
                disabled={creatingStructure || !simulationComplete || analysisData?.newStructure.exists}
              >
                <CheckCircle className="h-5 w-5" />
                <span>Executar Criação</span>
                <span className="text-xs">
                  {analysisData?.newStructure.exists ? '(Estrutura já criada)' : simulationComplete ? '(Criar estrutura real)' : '(Execute simulação primeiro)'}
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                disabled
              >
                <AlertTriangle className="h-5 w-5" />
                <span>Rollback</span>
                <span className="text-xs text-slate-500">(Fase 2)</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                disabled
              >
                <FileText className="h-5 w-5" />
                <span>Relatório Detalhado</span>
                <span className="text-xs text-slate-500">(Fase 2)</span>
              </Button>

            </div>

            {/* Resultado da Criação de Estrutura */}
            {structureResult && (
              <div className="mt-6 space-y-4">
                <Alert className={structureResult.validation.oldDataIntact ? "border-green-200 bg-green-50 dark:bg-green-900/20" : "border-red-200 bg-red-50 dark:bg-red-900/20"}>
                  <CheckCircle className={`h-5 w-5 ${structureResult.validation.oldDataIntact ? 'text-green-600' : 'text-red-600'}`} />
                  <AlertDescription className={structureResult.validation.oldDataIntact ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}>
                    <strong>{structureResult.dryRun ? 'Simulação' : 'Execução'} {structureResult.validation.oldDataIntact ? 'Concluída' : 'Falhou'}:</strong>
                    <ul className="mt-2 space-y-1">
                      <li>• Estudantes processados: {structureResult.studentsProcessed}</li>
                      <li>• Contatos {structureResult.dryRun ? 'serão criados' : 'criados'}: {structureResult.contactsCreated}</li>
                      <li>• Dados antigos: {structureResult.validation.oldDataIntact ? '✅ Intactos' : '❌ Modificados'}</li>
                      <li>• Nova estrutura: {structureResult.validation.newStructureCreated ? '✅ Criada' : structureResult.dryRun ? 'Não criada (dry-run)' : '❌ Não criada'}</li>
                      {structureResult.errors.length > 0 && (
                        <li className="text-red-700">• Erros: {structureResult.errors.length}</li>
                      )}
                    </ul>
                    {structureResult.preview && (
                      <div className="mt-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-xs font-mono">
                          <strong>Preview:</strong><br />
                          Estudante: {structureResult.preview.sampleStudent}<br />
                          Contatos: {structureResult.preview.sampleContacts}<br />
                          Path: {structureResult.preview.path}
                        </p>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>

                {structureResult.errors.length > 0 && (
                  <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
                    <CardHeader>
                      <CardTitle className="text-red-800 dark:text-red-200 text-sm">Erros Encontrados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-xs text-red-700 dark:text-red-300">
                        {structureResult.errors.map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <Alert className="mt-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <strong>Fase 1 - Criar Estrutura Paralela:</strong> Esta fase cria a nova estrutura de coleções sem modificar os dados existentes. Execute a simulação primeiro para verificar o resultado.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Fase 2: Migração de Dados */}
        {analysisData?.newStructure.exists && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-700">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5 text-green-600" />
                Fase 2 - Migração de Dados Reais
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => migrateData(true)}
                  disabled={migratingData}
                >
                  <RefreshCw className={`h-5 w-5 ${migratingData ? 'animate-spin' : ''}`} />
                  <span>Simular Migração de Dados</span>
                  <span className="text-xs text-slate-500">(Dry-run - testar integração WhatsApp)</span>
                </Button>

                <Button
                  variant="default"
                  className="h-20 flex-col gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  onClick={() => migrateData(false)}
                  disabled={migratingData || !dataMigrationSimComplete}
                >
                  <CheckCircle className="h-5 w-5" />
                  <span>Executar Migração</span>
                  <span className="text-xs">
                    {dataMigrationSimComplete ? '(Migrar dados reais + WhatsApp)' : '(Execute simulação primeiro)'}
                  </span>
                </Button>

              </div>

              {/* Resultado da Migração de Dados */}
              {migrationResult && (
                <div className="mt-6 space-y-4">
                  <Alert className={migrationResult.validation.oldDataIntact ? "border-green-200 bg-green-50 dark:bg-green-900/20" : "border-red-200 bg-red-50 dark:bg-red-900/20"}>
                    <CheckCircle className={`h-5 w-5 ${migrationResult.validation.oldDataIntact ? 'text-green-600' : 'text-red-600'}`} />
                    <AlertDescription className={migrationResult.validation.oldDataIntact ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}>
                      <strong>{migrationResult.dryRun ? 'Simulação' : 'Migração'} {migrationResult.validation.oldDataIntact ? 'Concluída' : 'Falhou'}:</strong>
                      <ul className="mt-2 space-y-1">
                        <li>• Estudantes: {migrationResult.progress.studentsProcessed}</li>
                        <li>• Contatos {migrationResult.dryRun ? 'a migrar' : 'migrados'}: {migrationResult.progress.contactsMigrated}</li>
                        <li>• WhatsApp integrado: {migrationResult.progress.whatsappIntegrated}</li>
                        <li>• Dados antigos: {migrationResult.validation.oldDataIntact ? '✅ Intactos' : '❌ Modificados'}</li>
                        <li>• Dados novos: {migrationResult.validation.newDataCreated ? '✅ Criados' : migrationResult.dryRun ? 'Não criados (dry-run)' : '❌ Não criados'}</li>
                        {migrationResult.errors.length > 0 && (
                          <li className="text-red-700">• Erros: {migrationResult.errors.length}</li>
                        )}
                        {migrationResult.warnings.length > 0 && (
                          <li className="text-orange-700">• Avisos: {migrationResult.warnings.length}</li>
                        )}
                      </ul>
                      {migrationResult.preview && (
                        <div className="mt-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                          <p className="text-xs font-mono">
                            <strong>Preview do Contato Migrado:</strong><br />
                            Estudante: {migrationResult.preview.sampleStudentId}<br />
                            Nome: {migrationResult.preview.sampleContact?.nome}<br />
                            Telefone: {migrationResult.preview.sampleContact?.telefone}<br />
                            WhatsApp verificado: {migrationResult.preview.sampleContact?.whatsapp?.verified ? 'Sim' : 'Não'}<br />
                            WhatsApp existe: {migrationResult.preview.sampleContact?.whatsapp?.exists !== null ? (migrationResult.preview.sampleContact?.whatsapp?.exists ? 'Sim' : 'Não') : 'Não verificado'}<br />
                            {migrationResult.preview.estimatedTime && `Tempo: ${migrationResult.preview.estimatedTime}`}
                          </p>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>

                  {migrationResult.warnings.length > 0 && (
                    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                      <CardHeader>
                        <CardTitle className="text-orange-800 dark:text-orange-200 text-sm">Avisos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1 text-xs text-orange-700 dark:text-orange-300">
                          {migrationResult.warnings.map((warning, idx) => (
                            <li key={idx}>• {warning}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {migrationResult.errors.length > 0 && (
                    <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
                      <CardHeader>
                        <CardTitle className="text-red-800 dark:text-red-200 text-sm">Erros Encontrados</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1 text-xs text-red-700 dark:text-red-300">
                          {migrationResult.errors.map((error, idx) => (
                            <li key={idx}>• {error}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              <Alert className="mt-6 border-green-200 bg-green-50 dark:bg-green-900/20">
                <AlertCircle className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>Fase 2 - Migração de Dados:</strong> Esta fase migra os dados reais dos contatos e integra com verificações WhatsApp. Execute a simulação primeiro para ver o preview.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Timestamp */}
        {analysisData && (
          <p className="text-xs text-center text-slate-500">
            Última atualização: {new Date(analysisData.timestamp).toLocaleString('pt-BR')}
          </p>
        )}

      </div>
    </div>
  );
}
