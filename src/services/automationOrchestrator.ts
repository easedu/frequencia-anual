/**
 * Automation Orchestrator com Sistema de Checkpoint
 *
 * Processa automação de alertas de faltas com:
 * - Checkpoints granulares (por estudante)
 * - Capacidade de retomada após falhas
 * - Isolamento de erros (1 estudante não trava todos)
 * - Idempotência (previne duplicatas)
 *
 * MIGRADO PARA SUPABASE (PostgreSQL)
 */

import { AutomationExecutionService } from './supabase/automationExecutionService';
import { getStudentByFirebaseUUID } from './supabase/studentService';
import {
  AutomationExecution,
  AutomationExecutionSummary,
  Student
} from '@/types';
import { WhatsAppRetryService } from './whatsappRetryService';
import { MessageHistoryService } from './messageHistoryService';
import { generateAbsenceAlertMessage } from '@/utils/messageTemplates';
import { logger } from '@/utils/logger';

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
  messagesSkippedAlreadySent: number;
  tasksCreated: number;
  tasksSkippedDuplicate: number;
  errors: Array<{ estudanteId: string; estudanteNome: string; error: string }>;
}

/**
 * Verifica se já existe uma task para o estudante + contato com mesma quantidade de faltas e mês
 * IMPORTANTE: Verifica por contato (whatsapp_phone) para permitir múltiplas tasks para diferentes contatos
 */
async function checkDuplicateTask(params: {
  estudanteId: string;
  absencesCount: number;
  referenceMonth: number;
  referenceYear: number;
  whatsappPhone: string; // ✅ NOVO: Verificar por contato também
}): Promise<boolean> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BASE_URL_API_HABIB_KYRILLOS || 'http://localhost:3000';
    const apiUser = process.env.API_HABIB_KYRILLOS_USERNAME || '';
    const apiPassword = process.env.API_HABIB_KYRILLOS_PASSWORD || '';
    const basicAuth = Buffer.from(`${apiUser}:${apiPassword}`).toString('base64');

    // Buscar tasks do estudante neste mês/ano
    const queryParams = new URLSearchParams({
      estudanteId: params.estudanteId,
      limit: '100' // Verificar últimas 100 tasks
    });

    const response = await fetch(`${apiUrl}/api/tasks?${queryParams}`, {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return false; // Em caso de erro, assumir que não há duplicata (fail-safe)
    }

    const result = await response.json();
    const tasks = result.data || [];

    // Verificar se já existe task com:
    // - Mesmo estudante
    // - Mesmo mês/ano
    // - Mesmo número de faltas (no title)
    // - Mesmo telefone (whatsapp_phone) ✅ NOVO
    // - Criada pela automação
    const titlePattern = `Alerta de ${params.absencesCount} faltas - ${params.referenceMonth}/${params.referenceYear}`;

    const duplicate = tasks.some((task: any) => {
      return (
        task.title === titlePattern &&
        task.created_by === 'AUTOMAÇÃO' &&
        task.whatsapp_phone === params.whatsappPhone // ✅ Verificar por contato
      );
    });

    if (duplicate) {
      logger.info('[checkDuplicateTask] Task duplicada detectada', {
        estudanteId: params.estudanteId,
        absencesCount: params.absencesCount,
        referenceMonth: params.referenceMonth,
        whatsappPhone: params.whatsappPhone // ✅ Log do telefone
      });
    }

    return duplicate;
  } catch (error) {
    logger.error('[checkDuplicateTask] Erro ao verificar duplicata', error as Error);
    return false; // Em caso de erro, assumir que não há duplicata (fail-safe)
  }
}

/**
 * Busca estudantes com múltiplos de faltas
 */
async function fetchStudentsWithAbsences(
  multiple: number
): Promise<Student[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BASE_URL_API_HABIB_KYRILLOS || '';
    const apiUser = process.env.API_HABIB_KYRILLOS_USERNAME || '';
    const apiPassword = process.env.API_HABIB_KYRILLOS_PASSWORD || '';

    if (!apiUrl || !apiUser || !apiPassword) {
      throw new Error('API credentials not configured');
    }

    const basicAuth = Buffer.from(`${apiUser}:${apiPassword}`).toString('base64');

    // Obter mês de referência (mês atual)
    const now = new Date();
    const referenceMonth = now.getMonth() + 1; // 1-12

    const response = await fetch(
      `${apiUrl}/api/students/absence-multiples?absenceMultiple=${multiple}&referenceMonth=${referenceMonth}`,
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
    return data.data || [];
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
    messagesSkippedAlreadySent: 0,
    tasksCreated: 0,
    tasksSkippedDuplicate: 0,
    errors: []
  };

  // ✅ CORREÇÃO: API retorna 'verifiedWhatsAppContacts' não 'contatos'
  const contacts = (student as any).verifiedWhatsAppContacts || student.contatos || [];
  const hasContacts = contacts && contacts.length > 0;

  // 1. SE TEM CONTATOS: Enviar mensagens
  if (hasContacts) {
    for (let i = 0; i < contacts.length; i++) {
      const contato = contacts[i];
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
          result.messagesSkippedAlreadySent++;

          // ✅ IMPORTANTE: Se mensagem já foi enviada, a task também já deve existir
          // Verificar e contar como duplicata (mesmo sem tentar criar novamente)
          const isDuplicateTask = await checkDuplicateTask({
            estudanteId: student.estudanteId,
            absencesCount: params.absenceMultiple,
            referenceMonth: params.referenceMonth,
            referenceYear: params.referenceYear,
            whatsappPhone: phone // ✅ Passar telefone do contato
          });

          if (isDuplicateTask) {
            result.tasksSkippedDuplicate++;
          }

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

          // Verificar se já existe task duplicada (POR CONTATO)
          const isDuplicateTask = await checkDuplicateTask({
            estudanteId: student.estudanteId,
            absencesCount: params.absenceMultiple,
            referenceMonth: params.referenceMonth,
            referenceYear: params.referenceYear,
            whatsappPhone: phone // ✅ Passar telefone do contato
          });

          if (isDuplicateTask) {
            result.tasksSkippedDuplicate++;
            console.log(`⏭️ [${student.nome}] Task já existe para ${phone}, pulando criação`);
          } else {
            // Criar tarefa fechada (RESOLVIDA) + interação
            const taskResult = await createTaskClosed({
              estudanteId: student.estudanteId,
              absencesCount: params.absenceMultiple,
              referenceMonth: params.referenceMonth,
              referenceYear: params.referenceYear,
              actionDescription: `Enviado alerta de ${params.absenceMultiple} faltas via WhatsApp para ${contato.nome} (${phone})`,
              whatsappPhone: phone,
              whatsappMessage: message,
              whatsappMessageId: sendResult.messageId
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
        if (i < contacts.length - 1) {
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
      // Verificar se já existe task duplicada (sem telefone = 'NO_CONTACT')
      const isDuplicateTask = await checkDuplicateTask({
        estudanteId: student.estudanteId,
        absencesCount: params.absenceMultiple,
        referenceMonth: params.referenceMonth,
        referenceYear: params.referenceYear,
        whatsappPhone: 'NO_CONTACT' // ✅ Marcador para estudantes sem contato
      });

      if (isDuplicateTask) {
        result.tasksSkippedDuplicate++;
        console.log(`⏭️ [${student.nome}] Task já existe (sem contato), pulando criação`);
      } else {
        const taskResult = await createTaskOpen({
          estudanteId: student.estudanteId,
          absencesCount: params.absenceMultiple,
          referenceMonth: params.referenceMonth,
          referenceYear: params.referenceYear,
          actionDescription: `Estudante com ${params.absenceMultiple} faltas sem contatos cadastrados. Necessário buscar contato e alertar família.`
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
 * Resolver Firebase UUID para Internal ID do Supabase
 *
 * ✅ MIGRADO: Usa StudentService (busca direta no Supabase)
 * Anteriormente: Chamava /api/students via HTTP (lento + auth complexo)
 *
 * @deprecated Use getStudentByFirebaseUUID() diretamente para mais detalhes
 */
async function resolveStudentInternalId(firebaseUUID: string): Promise<string | null> {
  try {
    const student = await getStudentByFirebaseUUID(firebaseUUID);

    if (!student) {
      logger.warn('[AutomationOrchestrator] Estudante não encontrado', { firebaseUUID });
      return null;
    }

    logger.debug('[AutomationOrchestrator] Estudante resolvido', {
      firebaseUUID,
      internalId: student.id,
      nome: student.nome
    });

    return student.id; // Internal ID
  } catch (error) {
    logger.error('[AutomationOrchestrator] Erro ao resolver Internal ID', {
      firebaseUUID,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    return null;
  }
}

/**
 * Criar tarefa FECHADA (resolvida) - para mensagens enviadas com sucesso
 *
 * ✅ OTIMIZADO: Usa StudentService para resolver Internal ID (sem HTTP)
 * ✅ NOVO: Cria também uma interação "Contato digital" registrando o envio
 */
async function createTaskClosed(params: {
  estudanteId: string;
  absencesCount: number;
  referenceMonth: number;
  referenceYear: number;
  actionDescription: string;
  whatsappPhone: string;
  whatsappMessage?: string;
  whatsappMessageId?: string;
}): Promise<{ success: boolean; taskId: string; error?: string }> {
  try {
    // ✅ OTIMIZADO: Busca direta no Supabase (sem HTTP)
    const student = await getStudentByFirebaseUUID(params.estudanteId);

    if (!student) {
      const errorMsg = `Estudante não encontrado: ${params.estudanteId}`;
      logger.error('[createTaskClosed] ' + errorMsg, { estudanteId: params.estudanteId });
      throw new Error(errorMsg);
    }

    logger.debug('[createTaskClosed] Estudante encontrado', {
      firebaseUUID: params.estudanteId,
      internalId: student.id,
      nome: student.nome
    });

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BASE_URL_API_HABIB_KYRILLOS || 'http://localhost:3000';
    const apiUser = process.env.API_HABIB_KYRILLOS_USERNAME || '';
    const apiPassword = process.env.API_HABIB_KYRILLOS_PASSWORD || '';
    const basicAuth = `Basic ${Buffer.from(`${apiUser}:${apiPassword}`).toString('base64')}`;

    // ✅ CORREÇÃO: Usar Internal ID (não Firebase UUID!)
    const taskData = {
      student_id: student.id,  // ✅ Internal ID do Supabase
      title: `Alerta de ${params.absencesCount} faltas - ${params.referenceMonth}/${params.referenceYear}`,
      description: params.actionDescription,
      action_taken: 'Contato digital',
      is_resolved: true,
      created_by: 'AUTOMAÇÃO',
    };

    const response = await fetch(`${apiUrl}/api/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': basicAuth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `API returned ${response.status}`);
    }

    const taskId = data.taskId || data.task?.id || 'unknown';

    logger.info('[createTaskClosed] Tarefa criada com sucesso', {
      taskId,
      estudante: student.nome
    });

    // 🆕 CRIAR INTERAÇÃO "Contato digital" registrando o envio do WhatsApp
    try {
      const today = new Date();
      const formattedDate = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}${today.getFullYear()}`;

      const interactionData = {
        estudanteId: params.estudanteId, // Firebase UUID
        tipo: 'Contato digital',
        data: formattedDate,
        descricao: `Alerta automático de ${params.absencesCount} faltas enviado via WhatsApp`,
        responsavel: 'AUTOMAÇÃO',
        assunto: `Alerta de ${params.absencesCount} faltas`,
        criadoPor: 'AUTOMAÇÃO',
        whatsapp_message: params.whatsappMessage || `Alerta de ${params.absencesCount} faltas`,
        whatsapp_phones: [params.whatsappPhone],
        whatsapp_message_id: params.whatsappMessageId,
        whatsapp_status: 'sent'
      };

      const interactionResponse = await fetch(`${apiUrl}/api/interactions`, {
        method: 'POST',
        headers: {
          'Authorization': basicAuth,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(interactionData)
      });

      const interactionResult = await interactionResponse.json();

      if (interactionResponse.ok && interactionResult.success) {
        logger.info('[createTaskClosed] Interação criada com sucesso', {
          interactionId: interactionResult.data?.id,
          estudante: student.nome
        });
      } else {
        logger.warn('[createTaskClosed] Erro ao criar interação (não crítico)', {
          error: interactionResult.error,
          estudante: student.nome
        });
      }
    } catch (interactionError) {
      // Não falhar a task se a interação falhar
      logger.warn('[createTaskClosed] Erro ao criar interação (não crítico)', {
        error: interactionError instanceof Error ? interactionError.message : 'Erro desconhecido',
        estudante: student.nome
      });
    }

    return {
      success: true,
      taskId
    };
  } catch (error) {
    logger.error('[createTaskClosed] Erro ao criar tarefa', {
      estudanteId: params.estudanteId,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });

    return {
      success: false,
      taskId: '',
      error: error instanceof Error ? error.message : 'Erro ao criar tarefa'
    };
  }
}

/**
 * Criar tarefa ABERTA (não resolvida) - para estudantes sem contatos
 *
 * ✅ OTIMIZADO: Usa StudentService para resolver Internal ID (sem HTTP)
 */
async function createTaskOpen(params: {
  estudanteId: string;
  absencesCount: number;
  referenceMonth: number;
  referenceYear: number;
  actionDescription: string;
}): Promise<{ success: boolean; taskId: string; error?: string }> {
  try {
    // ✅ OTIMIZADO: Busca direta no Supabase (sem HTTP)
    const student = await getStudentByFirebaseUUID(params.estudanteId);

    if (!student) {
      const errorMsg = `Estudante não encontrado: ${params.estudanteId}`;
      logger.error('[createTaskOpen] ' + errorMsg, { estudanteId: params.estudanteId });
      throw new Error(errorMsg);
    }

    logger.debug('[createTaskOpen] Estudante encontrado', {
      firebaseUUID: params.estudanteId,
      internalId: student.id,
      nome: student.nome
    });

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BASE_URL_API_HABIB_KYRILLOS || 'http://localhost:3000';
    const apiUser = process.env.API_HABIB_KYRILLOS_USERNAME || '';
    const apiPassword = process.env.API_HABIB_KYRILLOS_PASSWORD || '';
    const basicAuth = `Basic ${Buffer.from(`${apiUser}:${apiPassword}`).toString('base64')}`;

    // ✅ CORREÇÃO: Usar Internal ID (não Firebase UUID!)
    const taskData = {
      student_id: student.id,  // ✅ Internal ID do Supabase
      title: `⚠️ ${params.absencesCount} faltas SEM CONTATO - ${params.referenceMonth}/${params.referenceYear}`,
      description: params.actionDescription,
      recommended_action: 'Contato telefônico ou busca ativa - Estudante sem contato WhatsApp',
      action_taken: null,
      is_resolved: false,
      created_by: 'AUTOMAÇÃO',
    };

    const response = await fetch(`${apiUrl}/api/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': basicAuth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `API returned ${response.status}`);
    }

    logger.info('[createTaskOpen] Tarefa ABERTA criada com sucesso', {
      taskId: data.taskId,
      estudante: student.nome
    });

    return {
      success: true,
      taskId: data.taskId || data.task?.id || 'unknown'
    };
  } catch (error) {
    logger.error('[createTaskOpen] Erro ao criar tarefa aberta', {
      estudanteId: params.estudanteId,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });

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
      : null; // null quando não houve tentativas (exibir como "N/A")

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
• Taxa de sucesso: ${successRate !== null ? `${successRate}%` : 'N/A'}

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
  const startTime = Date.now();

  try {
    // 1. VERIFICAR SE JÁ EXISTE EXECUÇÃO RUNNING (Race Condition Check)
    console.log(`🔒 Verificando se há execução em andamento...`);
    const runningExecution = await AutomationExecutionService.getLastRunningExecution();

    if (runningExecution && runningExecution.id !== executionId) {
      const errorMsg = `❌ Já existe execução rodando: ${runningExecution.id}`;
      console.error(errorMsg);

      // Marcar esta execução como CANCELLED
      await AutomationExecutionService.updateStatus(executionId, 'CANCELLED');
      await AutomationExecutionService.updateError(executionId, errorMsg);

      throw new Error(errorMsg);
    }

    console.log(`✅ Nenhuma execução em andamento, prosseguindo...`);

    // 2. BUSCAR ESTUDANTES
    console.log(`🔍 Buscando estudantes com ${params.absenceMultiple} faltas...`);
    const students = await fetchStudentsWithAbsences(params.absenceMultiple);
    console.log(`✅ ${students.length} estudantes encontrados`);

    // 3. ATUALIZAR STATUS PARA RUNNING NO SUPABASE
    await AutomationExecutionService.updateStatus(executionId, 'RUNNING');

    // 4. VERIFICAR SE É RETOMADA (estudantes já processados)
    const execution = await AutomationExecutionService.getExecutionById(executionId);
    const processedIds = execution?.processedStudentIds || [];

    // Filtrar apenas estudantes não processados
    const remainingStudents = students.filter(
      s => !processedIds.includes(s.estudanteId)
    );

    console.log(`📊 Total: ${students.length} | Processados: ${processedIds.length} | Restantes: ${remainingStudents.length}`);

    // 5. PROCESSAR CADA ESTUDANTE COM CHECKPOINT
    const results = {
      messagesSucceeded: 0,
      messagesFailed: 0,
      messagesSkippedAlreadySent: 0,
      tasksCreated: 0,
      tasksSkippedDuplicate: 0,
      errors: [] as Array<{ estudanteId: string; estudanteNome: string; error: string }>
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
        results.messagesSkippedAlreadySent += studentResult.messagesSkippedAlreadySent;
        results.tasksCreated += studentResult.tasksCreated;
        results.tasksSkippedDuplicate += studentResult.tasksSkippedDuplicate;
        results.errors.push(...studentResult.errors);

        // CHECKPOINT: Atualizar no Supabase
        const updatedProcessedIds = [...processedIds, student.estudanteId];
        await AutomationExecutionService.updateCheckpoint(executionId, {
          processedStudents: updatedProcessedIds.length,
          currentStudentIndex: i + 1,
          processedStudentIds: updatedProcessedIds,
          results: {
            messagesSucceeded: results.messagesSucceeded,
            messagesFailed: results.messagesFailed,
            messagesSkippedAlreadySent: results.messagesSkippedAlreadySent,
            tasksCreated: results.tasksCreated,
            tasksSkippedDuplicate: results.tasksSkippedDuplicate,
            errors: results.errors
          }
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

    // 6. CRIAR SUMÁRIO FINAL
    const endTime = Date.now();

    // ✅ CORRIGIDO: Contar baseado nos estudantes PROCESSADOS (remainingStudents)
    // não nos estudantes ENCONTRADOS (students), pois alguns podem ter sido
    // pulados devido a checkpoint (já processados em execução anterior)
    //
    // ✅ CRÍTICO: Verificar AMBOS os campos de contatos:
    // - student.contatos (campo padrão)
    // - student.verifiedWhatsAppContacts (retornado pela API /api/students/absence-multiples)
    const studentsWithContacts = remainingStudents.filter(s => {
      const contacts = (s as any).verifiedWhatsAppContacts || s.contatos || [];
      return contacts && contacts.length > 0;
    }).length;
    const studentsWithoutContacts = remainingStudents.length - studentsWithContacts;

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
      messagesSkippedAlreadySent: results.messagesSkippedAlreadySent,
      tasksCreated: results.tasksCreated,
      tasksSkippedDuplicate: results.tasksSkippedDuplicate,
      errors: results.errors
    };

    // 7. FINALIZAR NO SUPABASE
    await AutomationExecutionService.updateStatus(executionId, 'COMPLETED');
    await AutomationExecutionService.updateCheckpoint(executionId, {
      processedStudents: students.length,
      currentStudentIndex: remainingStudents.length,
      processedStudentIds: students.map(s => s.estudanteId),
      results: {
        summary,
        messagesSucceeded: results.messagesSucceeded,
        messagesFailed: results.messagesFailed,
        messagesSkippedAlreadySent: results.messagesSkippedAlreadySent,
        tasksCreated: results.tasksCreated,
        tasksSkippedDuplicate: results.tasksSkippedDuplicate,
        errors: results.errors
      }
    });

    console.log(`\n✅ Processamento concluído!`);

    // 8. ENVIAR RELATÓRIO
    await sendExecutionReport(params.notificationPhone, summary, params.dryRun);

    return summary;

  } catch (error) {
    console.error('❌ Erro crítico no processamento:', error);

    // SALVAR ERRO NO SUPABASE MAS MANTER CHECKPOINT
    await AutomationExecutionService.updateError(
      executionId,
      error instanceof Error ? error.message : 'Erro desconhecido'
    );

    // Enviar notificação de falha
    await sendErrorNotification(
      params.notificationPhone,
      error instanceof Error ? error : new Error('Erro desconhecido'),
      executionId
    );

    throw error;
  }
}
