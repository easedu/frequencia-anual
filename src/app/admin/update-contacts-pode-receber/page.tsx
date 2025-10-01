"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "sonner";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase.config";

const SCHOOL_YEAR = process.env.NEXT_PUBLIC_SCHOOL_YEAR || new Date().getFullYear().toString();

interface UpdateResult {
  totalStudents: number;
  totalContactsUpdated: number;
  totalContactsSkipped: number;
  details: {
    studentName: string;
    contacts: {
      name: string;
      phone: string;
      podeReceber: boolean;
    }[];
  }[];
}

export default function UpdateContactsPodeReceberPage() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async () => {
    setIsUpdating(true);
    setError(null);
    setResult(null);

    try {
      console.log('🚀 Iniciando atualização de podeReceberMensagem nos contatos...');

      const studentsRef = collection(db, SCHOOL_YEAR, 'escola', 'students');
      const snapshot = await getDocs(studentsRef);

      let totalStudents = 0;
      let totalContactsUpdated = 0;
      let totalContactsSkipped = 0;
      const details: {
        studentName: string;
        contacts: {
          name: string;
          phone: string;
          podeReceber: boolean;
        }[];
      }[] = [];

      for (const docSnapshot of snapshot.docs) {
        const student = docSnapshot.data();

        if (!student.contatos || student.contatos.length === 0) {
          continue;
        }

        totalStudents++;
        let hasChanges = false;
        const contactsForDetails: {
          name: string;
          phone: string;
          podeReceber: boolean;
        }[] = [];

        const updatedContatos = student.contatos.map((contato: any) => {
          const telefone = contato.telefone || '';
          const cleanPhone = telefone.replace(/\D/g, '');

          // Se já tem o campo definido, pular
          if (contato.podeReceberMensagem !== undefined) {
            totalContactsSkipped++;
            return contato;
          }

          // Verificar se o terceiro dígito é 9 (celular brasileiro)
          const podeReceberMensagem = cleanPhone.length === 11 && cleanPhone[2] === '9';

          hasChanges = true;
          totalContactsUpdated++;

          contactsForDetails.push({
            name: contato.nome || 'Sem nome',
            phone: telefone,
            podeReceber: podeReceberMensagem
          });

          return {
            ...contato,
            podeReceberMensagem
          };
        });

        // Atualizar apenas se houve mudanças
        if (hasChanges) {
          const studentDocRef = doc(db, SCHOOL_YEAR, 'escola', 'students', docSnapshot.id);
          await updateDoc(studentDocRef, {
            contatos: updatedContatos
          });

          details.push({
            studentName: student.nome,
            contacts: contactsForDetails
          });
        }
      }

      setResult({
        totalStudents,
        totalContactsUpdated,
        totalContactsSkipped,
        details
      });

      toast.success("Contatos atualizados com sucesso!");

    } catch (err: any) {
      console.error('❌ Erro:', err);
      setError(err.message || 'Erro ao atualizar contatos');
      toast.error(err.message || 'Erro ao atualizar contatos');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <Toaster />

      <div className="container mx-auto max-w-4xl">
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-t-xl">
            <CardTitle className="text-2xl">Atualizar Campo "Pode Receber Mensagem"</CardTitle>
            <CardDescription className="text-blue-100">
              Atualiza todos os contatos existentes baseado na regra do terceiro dígito do telefone
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Regra:</strong> Telefones com 11 dígitos E terceiro dígito 9 (celular) = <strong className="text-green-600">PODE receber</strong>
              </AlertDescription>
            </Alert>

            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleUpdate}
                disabled={isUpdating}
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Executar Atualização
                  </>
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Atualização concluída!
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Estudantes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">{result.totalStudents}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Atualizados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">{result.totalContactsUpdated}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Ignorados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-slate-600">{result.totalContactsSkipped}</div>
                    </CardContent>
                  </Card>
                </div>

                {result.details.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Detalhes</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-96 overflow-y-auto">
                      <div className="space-y-4">
                        {result.details.map((detail, idx) => (
                          <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                            <div className="font-semibold">{detail.studentName}</div>
                            <div className="space-y-1 mt-2">
                              {detail.contacts.map((contact, cidx) => (
                                <div key={cidx} className="flex items-center gap-2 text-sm">
                                  {contact.podeReceber ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  )}
                                  <span>
                                    {contact.name} - {contact.phone} -{" "}
                                    <span className={contact.podeReceber ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                      {contact.podeReceber ? "PODE" : "NÃO PODE"}
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
