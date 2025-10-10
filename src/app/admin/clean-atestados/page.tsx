'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { useRouter } from 'next/navigation';
import { db } from '@/firebase.config';
import { collection, getDocs, writeBatch, doc, query, where } from 'firebase/firestore';
import { FIREBASE_PATHS } from '@/config/constants';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Trash2, Search, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface AtestadoData {
  id: string;
  ref: any;
  startDate: string;
  days: number;
  description: string;
  createdBy?: string;
}

interface DuplicateGroup {
  key: string;
  total: number;
  registros: Array<{ id: string; createdBy?: string }>;
  toRemove: string[];
  toKeep: string;
  detalhes?: {
    startDate: string;
    days: number;
    description: string;
  };
}

export default function CleanAtestadosPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [estudanteId, setEstudanteId] = useState('e3d06f0c-35fa-420c-bacd-0e4f4749c37c'); // BEATRIZ
  const [analyzing, setAnalyzing] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [analyzeAll, setAnalyzeAll] = useState(false);

  // Verificar perfil do usuário
  useEffect(() => {
    if (authLoading) {
      console.log('⏳ CleanAtestados: Carregando autenticação...');
      return;
    }

    if (!user) {
      console.log('🔒 CleanAtestados: Usuário não autenticado, redirecionando para login');
      router.push('/login');
      return;
    }

    if (!userProfile) {
      console.log('⏳ CleanAtestados: Aguardando perfil do usuário...');
      return;
    }

    console.log('👤 CleanAtestados: Perfil do usuário:', userProfile.perfil);

    if (userProfile.perfil !== 'admin') {
      console.log('❌ CleanAtestados: Acesso negado - perfil não é admin');
      toast.error('Acesso negado. Apenas administradores podem acessar esta página.');
      router.push('/home');
    } else {
      console.log('✅ CleanAtestados: Acesso permitido - usuário é admin');
    }
  }, [user, userProfile, authLoading, router]);

  // Função para analisar todos os estudantes
  async function analyzeAllStudents() {
    setAnalyzing(true);
    setResult(null);

    try {
      toast.info('🔍 Buscando todos os estudantes...');

      // Buscar todos os estudantes
      const estudantesSnapshot = await getDocs(collection(db, 'estudantes'));
      const totalEstudantes = estudantesSnapshot.size;

      console.log(`📊 Total de estudantes encontrados: ${totalEstudantes}`);
      toast.info(`📊 Analisando ${totalEstudantes} estudantes...`);

      let totalAtestados = 0;
      let totalDuplicatasGlobal = 0;
      let totalRegistrosDuplicados = 0;
      const estudantesComDuplicatas: Array<{
        estudanteId: string;
        estudanteNome: string;
        duplicatas: DuplicateGroup[];
        toRemove: AtestadoData[];
      }> = [];

      // Processar cada estudante
      let processados = 0;
      for (const estudanteDoc of estudantesSnapshot.docs) {
        const estudanteId = estudanteDoc.id;
        const estudanteNome = estudanteDoc.data().nome || 'Sem nome';

        processados++;
        if (processados % 50 === 0) {
          console.log(`⏳ Processados ${processados}/${totalEstudantes} estudantes...`);
        }

        // Buscar atestados do estudante
        const atestadosSnapshot = await getDocs(
          collection(db, FIREBASE_PATHS.medicalCertificates(estudanteId))
        );

        if (atestadosSnapshot.empty) continue;

        const atestados: AtestadoData[] = atestadosSnapshot.docs.map(doc => ({
          id: doc.id,
          ref: doc.ref,
          startDate: doc.data().startDate as string,
          days: doc.data().days as number,
          description: doc.data().description as string,
          createdBy: doc.data().createdBy as string | undefined,
        }));

        totalAtestados += atestados.length;

        // Agrupar duplicatas
        const grupos = new Map<string, AtestadoData[]>();

        atestados.forEach((atestado) => {
          const key = `${atestado.startDate}-${atestado.days}-${atestado.description}`;

          if (!grupos.has(key)) {
            grupos.set(key, []);
          }
          grupos.get(key)!.push(atestado);
        });

        // Identificar duplicatas
        const duplicatas: DuplicateGroup[] = [];
        const toRemove: AtestadoData[] = [];

        grupos.forEach((grupo, key) => {
          if (grupo.length > 1) {
            grupo.sort((a, b) => a.id.localeCompare(b.id));

            const toKeep = grupo[0];
            const toDelete = grupo.slice(1);

            duplicatas.push({
              key,
              total: grupo.length,
              registros: grupo.map(a => ({ id: a.id, createdBy: a.createdBy })),
              toRemove: toDelete.map(a => a.id),
              toKeep: toKeep.id,
              detalhes: {
                startDate: toKeep.startDate,
                days: toKeep.days,
                description: toKeep.description,
              },
            });

            toRemove.push(...toDelete);
          }
        });

        if (duplicatas.length > 0) {
          estudantesComDuplicatas.push({
            estudanteId,
            estudanteNome,
            duplicatas,
            toRemove,
          });
          totalDuplicatasGlobal += duplicatas.length;
          totalRegistrosDuplicados += toRemove.length;
        }
      }

      // Guardar resultado global
      setResult({
        isGlobal: true,
        totalEstudantes,
        totalAtestados,
        estudantesComDuplicatas: estudantesComDuplicatas.length,
        totalDuplicatasGlobal,
        totalRegistrosDuplicados,
        estudantes: estudantesComDuplicatas,
      });

      if (totalDuplicatasGlobal === 0) {
        toast.success('✅ Nenhuma duplicata encontrada em todo o banco!');
      } else {
        toast.info(
          `🔍 Encontradas ${totalDuplicatasGlobal} duplicata(s) em ${estudantesComDuplicatas.length} estudante(s)`
        );
      }

    } catch (error: any) {
      console.error('Erro ao analisar todos os estudantes:', error);
      toast.error('Erro ao analisar: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  }

  // Função para analisar duplicatas de um estudante
  async function analyzeDuplicates() {
    if (!estudanteId.trim()) {
      toast.error('Digite o ID do estudante');
      return;
    }

    setAnalyzing(true);
    setResult(null);

    try {
      // Buscar todos os atestados
      const atestadosSnapshot = await getDocs(
        collection(db, FIREBASE_PATHS.medicalCertificates(estudanteId))
      );

      const atestados: AtestadoData[] = atestadosSnapshot.docs.map(doc => ({
        id: doc.id,
        ref: doc.ref,
        startDate: doc.data().startDate as string,
        days: doc.data().days as number,
        description: doc.data().description as string,
        createdBy: doc.data().createdBy as string | undefined,
      }));

      // Agrupar duplicatas
      const grupos = new Map<string, AtestadoData[]>();

      atestados.forEach((atestado) => {
        const key = `${atestado.startDate}-${atestado.days}-${atestado.description}`;

        if (!grupos.has(key)) {
          grupos.set(key, []);
        }
        grupos.get(key)!.push(atestado);
      });

      // Identificar duplicatas
      const duplicatas: DuplicateGroup[] = [];
      const toRemove: AtestadoData[] = [];

      grupos.forEach((grupo, key) => {
        if (grupo.length > 1) {
          grupo.sort((a, b) => a.id.localeCompare(b.id));

          const toKeep = grupo[0];
          const toDelete = grupo.slice(1);

          duplicatas.push({
            key,
            total: grupo.length,
            registros: grupo.map(a => ({ id: a.id, createdBy: a.createdBy })),
            toRemove: toDelete.map(a => a.id),
            toKeep: toKeep.id,
            detalhes: {
              startDate: toKeep.startDate,
              days: toKeep.days,
              description: toKeep.description,
            },
          });

          toRemove.push(...toDelete);
        }
      });

      // Guardar resultado
      setResult({
        totalAtestados: atestados.length,
        duplicatasEncontradas: duplicatas.length,
        registrosDuplicados: toRemove.length,
        duplicatas,
        toRemove,
      });

      if (duplicatas.length === 0) {
        toast.success('✅ Nenhuma duplicata encontrada!');
      } else {
        toast.info(`🔍 Encontradas ${duplicatas.length} duplicata(s)`);
      }

    } catch (error: any) {
      console.error('Erro ao analisar duplicatas:', error);
      toast.error('Erro ao analisar duplicatas: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  }

  // Função para limpar duplicatas (modo global ou individual)
  async function cleanDuplicates() {
    if (!result) {
      toast.error('Nenhuma análise foi realizada');
      return;
    }

    // Modo global
    if (result.isGlobal) {
      if (!result.estudantes || result.estudantes.length === 0) {
        toast.error('Nenhuma duplicata para remover');
        return;
      }

      setCleaning(true);

      try {
        let totalRemovidos = 0;

        // Processar cada estudante
        for (const estudante of result.estudantes) {
          const batch = writeBatch(db);

          estudante.toRemove.forEach((atestado: AtestadoData) => {
            batch.delete(atestado.ref);
          });

          await batch.commit();
          totalRemovidos += estudante.toRemove.length;
        }

        toast.success(
          `✅ ${totalRemovidos} duplicata(s) removida(s) de ${result.estudantes.length} estudante(s)!`
        );

        // Reanalizar
        setResult(null);
        await analyzeAllStudents();
      } catch (error: any) {
        console.error('Erro ao limpar duplicatas globais:', error);
        toast.error('Erro ao limpar duplicatas: ' + error.message);
      } finally {
        setCleaning(false);
      }
    }
    // Modo individual
    else {
      if (!result.toRemove || result.toRemove.length === 0) {
        toast.error('Nenhuma duplicata para remover');
        return;
      }

      setCleaning(true);

      try {
        const batch = writeBatch(db);

        result.toRemove.forEach((atestado: AtestadoData) => {
          batch.delete(atestado.ref);
        });

        await batch.commit();

        toast.success(`✅ ${result.toRemove.length} duplicata(s) removida(s) com sucesso!`);

        // Reanalizar
        setResult(null);
        await analyzeDuplicates();
      } catch (error: any) {
        console.error('Erro ao limpar duplicatas:', error);
        toast.error('Erro ao limpar duplicatas: ' + error.message);
      } finally {
        setCleaning(false);
      }
    }
  }

  // Loading de autenticação
  if (authLoading || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Não autenticado ou não admin
  if (!user || userProfile.perfil !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-red-500 to-orange-600 text-white">
            <CardTitle className="flex items-center space-x-2">
              <Trash2 className="w-5 h-5" />
              <span>Limpeza de Atestados Duplicados</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="estudanteId">ID do Estudante</Label>
                <Input
                  id="estudanteId"
                  value={estudanteId}
                  onChange={(e) => setEstudanteId(e.target.value)}
                  placeholder="e3d06f0c-35fa-420c-bacd-0e4f4749c37c"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ID padrão: BEATRIZ APARECIDA LONGUINHOS FAUSTINO
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={analyzeDuplicates}
                  disabled={analyzing || cleaning}
                  className="flex-1"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Analisar Este Estudante
                    </>
                  )}
                </Button>

                <Button
                  onClick={analyzeAllStudents}
                  disabled={analyzing || cleaning}
                  variant="outline"
                  className="flex-1"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Analisar Todos os Estudantes
                    </>
                  )}
                </Button>
              </div>

              {result && ((result.isGlobal && result.totalRegistrosDuplicados > 0) || (!result.isGlobal && result.duplicatasEncontradas > 0)) && (
                <Button
                  onClick={cleanDuplicates}
                  disabled={analyzing || cleaning}
                  variant="destructive"
                  className="w-full"
                >
                  {cleaning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Limpando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Limpar Todas as Duplicatas
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resultado - Modo Global */}
        {result && result.isGlobal && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Resultado da Análise Global</span>
                {result.totalRegistrosDuplicados === 0 ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Sem Duplicatas
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {result.estudantesComDuplicatas} Estudante(s) com Duplicatas
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Estatísticas Globais */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">
                    {result.totalEstudantes}
                  </div>
                  <div className="text-xs text-blue-600">Total de Estudantes</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">
                    {result.totalAtestados}
                  </div>
                  <div className="text-xs text-purple-600">Total de Atestados</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-700">
                    {result.totalDuplicatasGlobal}
                  </div>
                  <div className="text-xs text-yellow-600">Grupos de Duplicatas</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-700">
                    {result.totalRegistrosDuplicados}
                  </div>
                  <div className="text-xs text-red-600">Registros Duplicados</div>
                </div>
              </div>

              {/* Lista de Estudantes com Duplicatas */}
              {result.estudantes && result.estudantes.map((estudante: any, idx: number) => (
                <div key={idx} className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                  <h3 className="font-bold text-lg text-orange-900 mb-2">
                    {estudante.estudanteNome}
                  </h3>
                  <p className="text-xs text-orange-700 mb-3 font-mono">
                    ID: {estudante.estudanteId}
                  </p>

                  {estudante.duplicatas.map((dup: DuplicateGroup, dupIdx: number) => (
                    <div key={dupIdx} className="border rounded-lg p-3 bg-white mb-2">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">
                            Duplicata #{dupIdx + 1}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">
                            <strong>Data:</strong> {dup.detalhes?.startDate} •{' '}
                            <strong>Dias:</strong> {dup.detalhes?.days} •{' '}
                            <strong>Descrição:</strong> {dup.detalhes?.description}
                          </p>
                        </div>
                        <Badge>{dup.total} registros</Badge>
                      </div>

                      <div className="space-y-1">
                        {dup.registros.map((reg) => (
                          <div
                            key={reg.id}
                            className={`flex items-center justify-between p-1.5 rounded text-xs ${
                              reg.id === dup.toKeep
                                ? 'bg-green-100 border border-green-300'
                                : 'bg-red-100 border border-red-300'
                            }`}
                          >
                            <div className="flex items-center space-x-1">
                              {reg.id === dup.toKeep ? (
                                <CheckCircle className="w-3 h-3 text-green-600" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-600" />
                              )}
                              <span className="font-mono">{reg.id}</span>
                            </div>
                            <Badge variant={reg.id === dup.toKeep ? 'default' : 'destructive'} className="text-xs">
                              {reg.id === dup.toKeep ? 'Manter' : 'Remover'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Resultado - Modo Individual */}
        {result && !result.isGlobal && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Resultado da Análise</span>
                {result.duplicatasEncontradas === 0 ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Sem Duplicatas
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {result.duplicatasEncontradas} Duplicata(s)
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Estatísticas */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">
                    {result.totalAtestados}
                  </div>
                  <div className="text-xs text-blue-600">Total de Atestados</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-700">
                    {result.duplicatasEncontradas}
                  </div>
                  <div className="text-xs text-yellow-600">Grupos de Duplicatas</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-700">
                    {result.registrosDuplicados}
                  </div>
                  <div className="text-xs text-red-600">Registros Duplicados</div>
                </div>
              </div>

              {/* Lista de Duplicatas */}
              {result.duplicatas && result.duplicatas.map((dup: DuplicateGroup, idx: number) => (
                <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Duplicata #{idx + 1}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Data:</strong> {dup.detalhes?.startDate} •{' '}
                        <strong>Dias:</strong> {dup.detalhes?.days} •{' '}
                        <strong>Descrição:</strong> {dup.detalhes?.description}
                      </p>
                    </div>
                    <Badge>{dup.total} registros</Badge>
                  </div>

                  <div className="space-y-2">
                    {dup.registros.map((reg) => (
                      <div
                        key={reg.id}
                        className={`flex items-center justify-between p-2 rounded ${
                          reg.id === dup.toKeep
                            ? 'bg-green-100 border border-green-300'
                            : 'bg-red-100 border border-red-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {reg.id === dup.toKeep ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="text-xs font-mono">{reg.id}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {reg.createdBy && (
                            <span className="text-xs text-gray-600">{reg.createdBy}</span>
                          )}
                          <Badge variant={reg.id === dup.toKeep ? 'default' : 'destructive'} className="text-xs">
                            {reg.id === dup.toKeep ? 'Manter' : 'Remover'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
