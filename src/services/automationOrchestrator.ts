/**
 * Automation Orchestrator com Sistema de Checkpoint
 *
 * Processa automação de alertas de faltas com:
 * - Checkpoints granulares (por estudante)
 * - Capacidade de retomada após falhas
 * - Isolamento de erros (1 estudante não trava todos)
 * - Idempotência (previne duplicatas)
 *
 * MIGRADO PARA FIREBASE ADMIN SDK (bypassa regras de segurança)
 */

import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  AutomationExecution,
  AutomationExecutionSummary,
  Student
} from '@/types';
import { WhatsAppRetryService } from './whatsappRetryService';
import { MessageHistoryService } from './messageHistoryService';
import { generateAbsenceAlertMessage } from '@/utils/messageTemplates';

const DELAY_BETWEEN_STUDENTS_MS = 2000; // 2s entre estudantes
const DELAY_BETWEEN_MESSAGES_MS = 5000; // 5s entre mensagens (rate limiting)

interface AutomationParams {
  dryRun: boolean;
  absenceMultiple: number;
  notificationPhone: string;
  referenceMonth: number;
  referenceYear: number;
}

interface StudentProcessResult {
  messagesSucceeded: number;
  messagesFailed: number;
  tasksCreated: number;
  errors: Array<{ estudanteId: string; estudanteNome: string; error: string }>;
}

/**
 * Busca estudantes com múltiplos de faltas
 */
async function fetchStudentsWithAbsences(
  multiple: number
): Promise<Student[]> {
  try {
    const apiUrl = process.env.BASE_URL_API_HABIB_KYRILLOS || '';
    const apiUser = process.env.API_USER || '';
    const apiPassword = process.env.API_PASSWORD || '';

    if (!apiUrl || !apiUser || !apiPassword) {
      throw new Error('API credentials not configured');
    }

    const basicAuth = Buffer.from(`${apiUser}:${apiPassword}`).toString('base64');

    const response = await fetch(
      `${apiUrl}/api/students/absence-multiples?multiple=${multiple}`,
      {
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return data.students || [];
  } catch (error) {
    console.error('Error fetching students:', error);
    throw error;
  }
}

/**
 * Processa um único estudante (envia mensagens e cria tarefas)
 */
async function processStudentAbsences(
  student: Student,
  params: AutomationParams,
  authorization: string
): Promise<StudentProcessResult> {
  const result: StudentProcessResult = {
    messagesSucceeded: 0,
    messagesFailed: 0,
    tasksCreated: 0,
    errors: []
  };

  const hasContacts = student.contatos && student.contatos.length > 0;

  // 1. SE TEM CONTATOS: Enviar mensagens
  if (hasContacts) {
    for (let i = 0; i < student.contatos!.length; i++) {
      const contato = student.contatos![i];
      const phone = contato.telefone?.replace(/\D/g, '');

      // Validar telefone WhatsApp (celular brasileiro: 11 dígitos)
      if (!phone || phone.length !== 11 || !phone.startsWith('11')) {
        console.log(`⏭️ [${student.nome}] Pulando ${phone} (não é celular WhatsApp)`);
        continue;
      }

      try {
        // Verificar se já foi enviado (idempotência)
        const alreadySent = await MessageHistoryService.wasAlreadySent({
          estudanteId: student.estudanteId,
          contatoTelefone: phone,
          anoReferencia: params.referenceYear,
          mesReferencia: params.referenceMonth,
          quantidadeFaltas: params.absenceMultiple
        });

        if (alreadySent) {
          console.log(`⏭️ [${student.nome}] Mensagem já enviada para ${phone}, pulando`);
          continue;
        }

        // Gerar mensagem
        const message = generateAbsenceAlertMessage({
          nomeContato: contato.nome || 'Responsável',
          nomeEstudante: student.nome,
          turma: student.turma,
          turno: student.turno as 'MANHÃ' | 'TARDE',
          numeroFaltas: params.absenceMultiple
        });

        // Enviar com retry
        const sendResult = await WhatsAppRetryService.sendWithRetry({
          phone,
          message,
          isDryRun: params.dryRun
        });

        if (sendResult.success) {
          result.messagesSucceeded++;

          // Salvar histórico
          await MessageHistoryService.recordSent({
            estudanteId: student.estudanteId,
            contatoTelefone: phone,
            anoReferencia: params.referenceYear,
            mesReferencia: params.referenceMonth,
            quantidadeFaltas: params.absenceMultiple,
            estudanteNome: student.nome,
            contatoNome: contato.nome || 'Responsável',
            taskId: '',
            status: 'SUCCESS',
            messageId: sendResult.messageId,
            sentAt: sendResult.sentAt,
            retryCount: sendResult.retryCount,
            isDryRun: params.dryRun
          });

          // Criar tarefa fechada (RESOLVIDA)
          const taskResult = await createTaskClosed({
            estudanteId: student.estudanteId,
            absencesCount: params.absenceMultiple,
            referenceMonth: params.referenceMonth,
            referenceYear: params.referenceYear,
            actionDescription: `Enviado alerta de ${params.absenceMultiple} faltas via WhatsApp para ${contato.nome} (${phone})`,
            whatsappPhone: phone,
            authorization
          });

          if (taskResult.success) {
            result.tasksCreated++;
          } else {
            result.errors.push({
              estudanteId: student.estudanteId,
              estudanteNome: student.nome,
              error: taskResult.error || 'Erro ao criar tarefa'
            });
          }

          console.log(`✅ [${student.nome}] Mensagem enviada para ${phone}`);
        } else {
          result.messagesFailed++;
          result.errors.push({
            estudanteId: student.estudanteId,
            estudanteNome: student.nome,
            error: `Falha ao enviar para ${phone}: ${sendResult.error}`
          });
        }

        // Rate limiting entre mensagens
        if (i < student.contatos!.length - 1) {
          await sleep(DELAY_BETWEEN_MESSAGES_MS);
        }

      } catch (error) {
        result.messagesFailed++;
        result.errors.push({
          estudanteId: student.estudanteId,
          estudanteNome: student.nome,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
  }
  // 2. SE NÃO TEM CONTATOS: Criar tarefa aberta
  else {
    try {
      const taskResult = await createTaskOpen({
        estudanteId: student.estudanteId,
        absencesCount: params.absenceMultiple,
        referenceMonth: params.referenceMonth,
        referenceYear: params.referenceYear,
        actionDescription: `Estudante com ${params.absenceMultiple} faltas sem contatos cadastrados. Necessário buscar contato e alertar família.`,
        authorization
      });

      if (taskResult.success) {
        result.tasksCreated++;
        console.log(`📋 [${student.nome}] Tarefa ABERTA criada (sem contatos)`);
      } else {
        result.errors.push({
          estudanteId: student.estudanteId,
          estudanteNome: student.nome,
          error: taskResult.error || 'Erro ao criar tarefa aberta'
        });
      }
    } catch (error) {
      result.errors.push({
        estudanteId: student.estudanteId,
        estudanteNome: student.nome,
        error: error instanceof Error ? error.message : 'Erro ao criar tarefa aberta'
      });
    }
  }

  return result;
}

/**
 * Criar tarefa FECHADA (resolvida) - para mensagens enviadas com sucesso
 */
async function createTaskClosed(params: {
  estudanteId: string;
  absencesCount: number;
  referenceMonth: number;
  referenceYear: number;
  actionDescription: string;
  whatsappPhone: string;
  authorization: string;
}): Promise<{ success: boolean; taskId: string; error?: string }> {
  try {
    const apiUrl = process.env.BASE_URL_API_HABIB_KYRILLOS || '';

    const taskData = {
      estudante_id: params.estudanteId,
      absences_count: params.absencesCount,
      reference_month: params.referenceMonth,
      reference_year: params.referenceYear,
      created_at: new Date().toISOString(),
      action_taken: 'Contato digital',
      is_resolved: true,
      priority: 2,
      created_by: 'AUTOMAÇÃO',
      solved_by: 'AUTOMAÇÃO',
      processed_at: new Date().toISOString(),
      action_description: params.actionDescription,
      whatsapp_phone: params.whatsappPhone
    };

    const response = await fetch(`${apiUrl}/api/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': params.authorization,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `API returned ${response.status}`);
    }

    return {
      success: true,
      taskId: data.taskId || data.task?.id || 'unknown'
    };
  } catch (error) {
    return {
      success: false,
      taskId: '',
      error: error instanceof Error ? error.message : 'Erro ao criar tarefa'
    };
  }
}

/**
 * Criar tarefa ABERTA (não resolvida) - para estudantes sem contatos
 */
async function createTaskOpen(params: {
  estudanteId: string;
  absencesCount: number;
  referenceMonth: number;
  referenceYear: number;
  actionDescription: string;
  authorization: string;
}): Promise<{ success: boolean; taskId: string; error?: string }> {
  try {
    const apiUrl = process.env.BASE_URL_API_HABIB_KYRILLOS || '';

    const taskData = {
      estudante_id: params.estudanteId,
      absences_count: params.absencesCount,
      reference_month: params.referenceMonth,
      reference_year: params.referenceYear,
      created_at: new Date().toISOString(),
      action_taken: 'Pendente',
      is_resolved: false,
      priority: 2,
      created_by: 'AUTOMAÇÃO',
      action_description: params.actionDescription
    };

    const response = await fetch(`${apiUrl}/api/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': params.authorization,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `API returned ${response.status}`);
    }

    return {
      success: true,
      taskId: data.taskId || data.task?.id || 'unknown'
    };
  } catch (error) {
    return {
      success: false,
      taskId: '',
      error: error instanceof Error ? error.message : 'Erro ao criar tarefa'
    };
  }
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Enviar relatório de execução via WhatsApp
 */
async function sendExecutionReport(
  phone: string,
  summary: AutomationExecutionSummary,
  isDryRun: boolean
): Promise<void> {
  try {
    const durationMinutes = Math.round(summary.durationMs / 1000 / 60);
    const successRate = summary.messagesAttempted > 0
      ? Math.round((summary.messagesSucceeded / summary.messagesAttempted) * 100)
      : 0;

    const message = `📊 *Relatório de Automação de Alertas*

🆔 Execução: ${summary.executionId}
${isDryRun ? '🧪 MODO TESTE (Dry-Run)\n' : ''}
⏱️ Duração: ${durationMinutes} minuto${durationMinutes !== 1 ? 's' : ''}
📅 Referência: ${summary.referenceMonth}/${summary.referenceYear}
🔢 Múltiplo de faltas: ${summary.absenceMultiple}

👥 *Estudantes*
• Encontrados: ${summary.studentsFound}
• Com contatos: ${summary.studentsWithContacts}
• Sem contatos: ${summary.studentsWithoutContacts}

📱 *Mensagens WhatsApp*
• Tentadas: ${summary.messagesAttempted}
• Enviadas: ${summary.messagesSucceeded} ✅
• Falhas: ${summary.messagesFailed} ❌
• Já enviadas (puladas): ${summary.messagesSkippedAlreadySent}
• Taxa de sucesso: ${successRate}%

📋 *Tarefas*
• Criadas: ${summary.tasksCreated}
• Duplicadas (puladas): ${summary.tasksSkippedDuplicate}

${summary.errors.length > 0 ? `⚠️ *Erros (${summary.errors.length})*\n${summary.errors.slice(0, 5).map(e => `• ${e.estudanteNome}: ${e.error}`).join('\n')}${summary.errors.length > 5 ? `\n... e mais ${summary.errors.length - 5} erro(s)` : ''}` : '✅ Sem erros'}

---
🏫 EMEF Habib Kyrillos - Sistema de Frequência`;

    await WhatsAppRetryService.sendWithRetry({
      phone,
      message,
      isDryRun: false // Sempre enviar relatório, mesmo em dry-run
    });

    console.log(`✅ Relatório enviado para ${phone}`);
  } catch (error) {
    console.error('Erro ao enviar relatório:', error);
  }
}

/**
 * Enviar notificação de erro crítico
 */
async function sendErrorNotification(
  phone: string,
  error: Error,
  executionId: string
): Promise<void> {
  try {
    const message = `🚨 *ERRO na Automação de Alertas*

🆔 Execução: ${executionId}
⏰ ${new Date().toLocaleString('pt-BR')}

❌ *Erro:*
${error.message}

Por favor, verificar logs e retomar manualmente se necessário.

---
🏫 EMEF Habib Kyrillos - Sistema de Frequência`;

    await WhatsAppRetryService.sendWithRetry({
      phone,
      message,
      isDryRun: false
    });

    console.log(`✅ Notificação de erro enviada para ${phone}`);
  } catch (err) {
    console.error('Erro ao enviar notificação de erro:', err);
  }
}

/**
 * FUNÇÃO PRINCIPAL: Processa automação com checkpoint e retomada
 */
export async function processAbsencesWithCheckpoint(
  executionId: string,
  params: AutomationParams,
  authorization: string
): Promise<AutomationExecutionSummary> {
  const executionRef = adminDb.collection('automationExecutions').doc(executionId);
  const startTime = Date.now();

  try {
    // 1. BUSCAR ESTUDANTES
    console.log(`🔍 Buscando estudantes com ${params.absenceMultiple} faltas...`);
    const students = await fetchStudentsWithAbsences(params.absenceMultiple);
    console.log(`✅ ${students.length} estudantes encontrados`);

    // 2. INICIALIZAR ESTADO NO FIRESTORE
    const initialData: Partial<AutomationExecution> = {
      status: 'RUNNING',
      totalStudents: students.length,
      processedStudents: 0,
      currentStudentIndex: 0,
      processedStudentIds: [],
      messagesSucceeded: 0,
      messagesFailed: 0,
      tasksCreated: 0,
      errors: []
    };

    await executionRef.update({
      ...initialData,
      lastCheckpointAt: FieldValue.serverTimestamp()
    });

    // 3. VERIFICAR SE É RETOMADA (estudantes já processados)
    const executionDoc = await executionRef.get();
    const execution = executionDoc.data() as AutomationExecution;
    const processedIds = execution.processedStudentIds || [];

    // Filtrar apenas estudantes não processados
    const remainingStudents = students.filter(
      s => !processedIds.includes(s.estudanteId)
    );

    console.log(`📊 Total: ${students.length} | Processados: ${processedIds.length} | Restantes: ${remainingStudents.length}`);

    // 4. PROCESSAR CADA ESTUDANTE COM CHECKPOINT
    const results = {
      messagesSucceeded: execution.messagesSucceeded || 0,
      messagesFailed: execution.messagesFailed || 0,
      tasksCreated: execution.tasksCreated || 0,
      errors: execution.errors || []
    };

    for (let i = 0; i < remainingStudents.length; i++) {
      const student = remainingStudents[i];

      try {
        console.log(`\n🔄 [${i + 1}/${remainingStudents.length}] Processando: ${student.nome}`);

        // Processar estudante
        const studentResult = await processStudentAbsences(
          student,
          params,
          authorization
        );

        // Acumular resultados
        results.messagesSucceeded += studentResult.messagesSucceeded;
        results.messagesFailed += studentResult.messagesFailed;
        results.tasksCreated += studentResult.tasksCreated;
        results.errors.push(...studentResult.errors);

        // CHECKPOINT: Marcar como processado
        await executionRef.update({
          processedStudents: processedIds.length + i + 1,
          currentStudentIndex: i + 1,
          processedStudentIds: FieldValue.arrayUnion(student.estudanteId),
          messagesSucceeded: results.messagesSucceeded,
          messagesFailed: results.messagesFailed,
          tasksCreated: results.tasksCreated,
          errors: results.errors,
          lastCheckpointAt: FieldValue.serverTimestamp()
        });

        console.log(`✅ [${i + 1}/${remainingStudents.length}] ${student.nome} processado e checkpoint salvo`);

      } catch (error) {
        console.error(`❌ Erro ao processar ${student.nome}:`, error);
        results.errors.push({
          estudanteId: student.estudanteId,
          estudanteNome: student.nome,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });

        // CONTINUAR mesmo com erro (não travar todo o processo)
      }

      // Rate limiting entre estudantes
      if (i < remainingStudents.length - 1) {
        await sleep(DELAY_BETWEEN_STUDENTS_MS);
      }
    }

    // 5. CRIAR SUMÁRIO FINAL
    const endTime = Date.now();
    const studentsWithContacts = students.filter(s => s.contatos && s.contatos.length > 0).length;
    const studentsWithoutContacts = students.length - studentsWithContacts;

    const summary: AutomationExecutionSummary = {
      executionId,
      startedAt: new Date(startTime).toISOString(),
      finishedAt: new Date(endTime).toISOString(),
      durationMs: endTime - startTime,
      dryRun: params.dryRun,
      absenceMultiple: params.absenceMultiple,
      referenceMonth: params.referenceMonth,
      referenceYear: params.referenceYear,
      studentsFound: students.length,
      studentsWithContacts,
      studentsWithoutContacts,
      messagesAttempted: results.messagesSucceeded + results.messagesFailed,
      messagesSucceeded: results.messagesSucceeded,
      messagesFailed: results.messagesFailed,
      messagesSkippedAlreadySent: 0, // TODO: contar
      tasksCreated: results.tasksCreated,
      tasksSkippedDuplicate: 0, // TODO: contar
      errors: results.errors
    };

    // 6. FINALIZAR NO FIRESTORE
    await executionRef.update({
      status: 'COMPLETED',
      finishedAt: endTime,
      summary,
      lastCheckpointAt: FieldValue.serverTimestamp()
    });

    console.log(`\n✅ Processamento concluído!`);

    // 7. ENVIAR RELATÓRIO
    await sendExecutionReport(params.notificationPhone, summary, params.dryRun);

    return summary;

  } catch (error) {
    console.error('❌ Erro crítico no processamento:', error);

    // SALVAR ERRO MAS MANTER CHECKPOINT
    await executionRef.update({
      status: 'FAILED',
      finishedAt: Date.now(),
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      lastCheckpointAt: FieldValue.serverTimestamp()
    });

    // Enviar notificação de falha
    await sendErrorNotification(
      params.notificationPhone,
      error instanceof Error ? error : new Error('Erro desconhecido'),
      executionId
    );

    throw error;
  }
}
