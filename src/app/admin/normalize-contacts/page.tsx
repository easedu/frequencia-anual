"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';

interface ContactChange {
  estudanteNome: string;
  estudanteId: string;
  turma: string;
  telefone: string;
  nomeOriginal: string;
  nomeNormalizado: string;
}

interface NormalizationResult {
  success: boolean;
  preview?: ContactChange[];
  totalContacts?: number;
  affectedContacts?: number;
  duplicateFieldsRemoved?: number;
  message?: string;
  error?: string;
}

export default function NormalizeContactsPage() {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<ContactChange[] | null>(null);
  const [result, setResult] = useState<NormalizationResult | null>(null);

  const loadPreview = async () => {
    setLoading(true);
    setPreviewData(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/normalize-contacts?preview=true');
      const data: NormalizationResult = await response.json();

      if (data.success && data.preview) {
        setPreviewData(data.preview);
        toast.success(`Encontrados ${data.affectedContacts} contatos para normalizar`);
      } else {
        toast.error(data.error || 'Erro ao carregar preview');
      }
    } catch (error) {
      console.error('Erro ao carregar preview:', error);
      toast.error('Erro ao carregar preview');
    } finally {
      setLoading(false);
    }
  };

  const executeNormalization = async () => {
    if (!confirm('Tem certeza que deseja normalizar os nomes dos contatos? Esta ação não pode ser desfeita.')) {
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/normalize-contacts', {
        method: 'POST'
      });
      const data: NormalizationResult = await response.json();

      setResult(data);

      if (data.success) {
        toast.success(data.message || 'Nomes normalizados com sucesso!');
        setPreviewData(null);
      } else {
        toast.error(data.error || 'Erro ao normalizar nomes');
      }
    } catch (error) {
      console.error('Erro ao normalizar:', error);
      toast.error('Erro ao executar normalização');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white text-2xl">
              <Users className="h-8 w-8" />
              Normalizar Nomes de Contatos
            </CardTitle>
            <p className="text-blue-100 mt-2">
              Remove informações de parentesco dos nomes (ex: "Maria (mãe)" → "Maria") e limpa dados duplicados
            </p>
          </CardHeader>
        </Card>

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Esta ferramenta:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Remove texto entre parênteses dos nomes dos contatos (ex: "(mãe)", "(pai)")</li>
              <li>Remove campo <code>contactName</code> da coleção <code>whatsapp_verified_numbers</code></li>
              <li>Garante que os nomes sejam sempre buscados dos dados atuais do estudante</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button
              onClick={loadPreview}
              disabled={loading || processing}
              variant="outline"
              size="lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Visualizar Mudanças
                </>
              )}
            </Button>

            <Button
              onClick={executeNormalization}
              disabled={!previewData || previewData.length === 0 || processing}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {processing ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Executar Normalização
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <Alert className={result.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
              {result.success ? (
                <div>
                  <p className="font-semibold">{result.message}</p>
                  <p className="text-sm mt-1">
                    Total de contatos: {result.totalContacts} |
                    Contatos normalizados: {result.affectedContacts}
                    {result.duplicateFieldsRemoved !== undefined && ` | Campos duplicados removidos: ${result.duplicateFieldsRemoved}`}
                  </p>
                </div>
              ) : (
                result.error
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Preview Table */}
        {previewData && previewData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                Preview das Mudanças ({previewData.length} contatos)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {previewData.map((change, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                            {change.turma}
                          </Badge>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {change.estudanteNome}
                          </span>
                        </div>

                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          📞 {change.telefone}
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                              Nome Original:
                            </div>
                            <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-300">
                              {change.nomeOriginal}
                            </Badge>
                          </div>

                          <div className="text-2xl text-slate-400">→</div>

                          <div className="flex-1">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                              Nome Normalizado:
                            </div>
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              {change.nomeNormalizado}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {previewData && previewData.length === 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ✅ Nenhum contato precisa ser normalizado. Todos os nomes já estão limpos!
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
