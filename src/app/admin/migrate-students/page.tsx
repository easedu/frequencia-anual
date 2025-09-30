"use client";

import { useState } from "react";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  writeBatch,
  Timestamp
} from "firebase/firestore";
import { db } from "@/firebase.config";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const CURRENT_SCHOOL_YEAR = process.env.NEXT_PUBLIC_SCHOOL_YEAR || "2025";
const BATCH_SIZE = 500;

interface Student {
  estudanteId: string;
  nome: string;
  turma: string;
  [key: string]: any;
}

interface MigrationLog {
  type: "info" | "success" | "error" | "warning";
  message: string;
}

export default function MigrateStudentsPage() {
  const [logs, setLogs] = useState<MigrationLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isDryRun, setIsDryRun] = useState(true);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const addLog = (type: MigrationLog["type"], message: string) => {
    setLogs((prev) => [...prev, { type, message }]);
    console.log(`[${type.toUpperCase()}]`, message);
  };

  const addAuditFields = (student: Student): Student => {
    const now = Timestamp.now();
    return {
      ...student,
      deleted: student.deleted || false,
      createdAt: now,
      updatedAt: now,
      migratedAt: now,
      migratedFrom: "lista_de_estudantes_array",
    };
  };

  const migrateStudents = async (dryRun: boolean) => {
    setIsRunning(true);
    setLogs([]);
    setProgress({ current: 0, total: 0 });

    try {
      addLog("info", `🎓 Iniciando migração - Modo: ${dryRun ? "DRY-RUN (simulação)" : "PRODUÇÃO"}`);
      addLog("info", `📅 Ano letivo: ${CURRENT_SCHOOL_YEAR}`);

      // 1. Read current data from V1
      addLog("info", "📖 Lendo dados da estrutura antiga (V1)...");
      const oldDocRef = doc(db, CURRENT_SCHOOL_YEAR, "lista_de_estudantes");
      const oldDocSnap = await getDoc(oldDocRef);

      if (!oldDocSnap.exists()) {
        addLog("error", "❌ Documento lista_de_estudantes não encontrado!");
        setIsRunning(false);
        return;
      }

      const data = oldDocSnap.data();
      const students: Student[] = data?.estudantes || [];

      if (students.length === 0) {
        addLog("warning", "⚠️ Nenhum estudante encontrado no documento");
        setIsRunning(false);
        return;
      }

      addLog("success", `✅ ${students.length} estudantes encontrados`);
      setProgress({ current: 0, total: students.length });

      // 2. Validate
      addLog("info", "🔍 Validando dados...");
      let validationErrors = 0;
      students.forEach((student, index) => {
        if (!student.estudanteId || !student.nome || !student.turma) {
          validationErrors++;
          if (validationErrors <= 5) {
            addLog("error", `Estudante ${index + 1}: Dados incompletos (${student.nome || "sem nome"})`);
          }
        }
      });

      if (validationErrors > 0) {
        addLog("error", `❌ ${validationErrors} erros de validação encontrados`);
        setIsRunning(false);
        return;
      }

      addLog("success", "✅ Validação concluída sem erros");

      if (dryRun) {
        addLog("info", "🔍 DRY-RUN: Simulando operações...");
        addLog("info", `Seriam criados ${students.length} documentos em: /${CURRENT_SCHOOL_YEAR}/escola/students/`);
        students.slice(0, 3).forEach((student, i) => {
          addLog("info", `   ${i + 1}. ${student.nome} (${student.turma}) → /${CURRENT_SCHOOL_YEAR}/escola/students/${student.estudanteId}`);
        });
        if (students.length > 3) {
          addLog("info", `   ... e mais ${students.length - 3} estudantes`);
        }
        addLog("success", "✅ DRY-RUN concluído. Nenhum dado foi modificado.");
        addLog("info", "💡 Para executar a migração real, desmarque 'Modo Simulação' e clique novamente");
        setIsRunning(false);
        return;
      }

      // 3. Real migration
      addLog("info", "🚀 Iniciando migração REAL...");
      let studentsProcessed = 0;

      for (let i = 0; i < students.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const batchStudents = students.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(students.length / BATCH_SIZE);

        addLog("info", `📦 Processando lote ${batchNumber}/${totalBatches} (${batchStudents.length} estudantes)...`);

        for (const student of batchStudents) {
          const studentWithAudit = addAuditFields(student);
          const docRef = doc(collection(db, CURRENT_SCHOOL_YEAR, "escola", "students"), student.estudanteId);
          batch.set(docRef, studentWithAudit);
          studentsProcessed++;
          setProgress({ current: studentsProcessed, total: students.length });
        }

        await batch.commit();
        addLog("success", `✅ Lote ${batchNumber}/${totalBatches} salvo com sucesso`);
      }

      // 4. Create migration marker
      addLog("info", "📝 Criando marcador de migração...");
      await setDoc(
        doc(db, CURRENT_SCHOOL_YEAR, "escola"),
        {
          _migration: {
            migratedAt: Timestamp.now(),
            studentsCollection: true,
            totalStudents: students.length,
            oldStructure: "lista_de_estudantes",
            newStructure: "escola/students/{estudanteId}",
            version: "2.0",
          },
        },
        { merge: true }
      );
      addLog("success", "✅ Marcador criado");

      addLog("success", `🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO! ${studentsProcessed} estudantes migrados`);
      addLog("info", "📋 PRÓXIMOS PASSOS:");
      addLog("info", "   1. Testar a aplicação (recarregar página marcar-faltas)");
      addLog("info", "   2. Verificar se as turmas aparecem corretamente");
      addLog("info", "   3. Após confirmar, pode manter ambas estruturas ou remover V1");
      addLog("warning", "⚠️ IMPORTANTE: O documento antigo (lista_de_estudantes) foi mantido como backup");

    } catch (error: any) {
      addLog("error", `❌ ERRO: ${error.message}`);
      console.error("Migration error:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const getLogIcon = (type: MigrationLog["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <div className="w-4 h-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Migração de Estudantes: V1 → V2</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>O que este script faz:</strong>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Lê estudantes de: <code>/{CURRENT_SCHOOL_YEAR}/lista_de_estudantes</code> (estrutura antiga)</li>
                <li>Cria documentos individuais em: <code>/{CURRENT_SCHOOL_YEAR}/escola/students/&#123;estudanteId&#125;</code></li>
                <li>Adiciona campos de auditoria (createdAt, updatedAt, deleted, etc)</li>
                <li>Mantém o documento antigo como backup</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="dryRun"
                checked={isDryRun}
                onChange={(e) => setIsDryRun(e.target.checked)}
                disabled={isRunning}
                className="w-4 h-4"
              />
              <label htmlFor="dryRun" className="text-sm font-medium">
                Modo Simulação (DRY-RUN) - Não modifica dados
              </label>
            </div>

            <Button
              onClick={() => migrateStudents(isDryRun)}
              disabled={isRunning}
              className="w-full"
              size="lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando... ({progress.current}/{progress.total})
                </>
              ) : (
                <>
                  {isDryRun ? "🔍 Simular Migração" : "🚀 Executar Migração"}
                </>
              )}
            </Button>
          </div>

          {logs.length > 0 && (
            <div className="border rounded-lg p-4 bg-slate-50 space-y-2 max-h-96 overflow-y-auto">
              <h3 className="font-semibold mb-2">Log da Migração:</h3>
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-2 text-sm font-mono ${
                    log.type === "error"
                      ? "text-red-700"
                      : log.type === "success"
                      ? "text-green-700"
                      : log.type === "warning"
                      ? "text-yellow-700"
                      : "text-slate-700"
                  }`}
                >
                  {getLogIcon(log.type)}
                  <span className="flex-1">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}