/**
 * Templates de Mensagens WhatsApp para Automação de Alertas de Faltas
 */

/**
 * Retorna nome do mês em português (minúsculas)
 */
function getMonthName(month: number): string {
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  return months[month - 1] || 'mês inválido';
}

/**
 * Gera mensagem de alerta de faltas para responsável
 */
export function generateAbsenceAlertMessage(params: {
  nomeContato: string;
  nomeEstudante: string;
  turma: string;
  turno: 'MANHÃ' | 'TARDE';
  numeroFaltas: number;
}): string {
  const { nomeContato, nomeEstudante, turma, turno, numeroFaltas } = params;

  return `🏫 EMEF Habib Kyrillos - Comunicado Importante!

Olá, ${nomeContato}! 👋

📢 Mensagem importante sobre o(a) aluno(a) *${nomeEstudante}* da turma ${turma} (${turno}).

Percebemos que ele(a) acumulou *${numeroFaltas}* faltas neste mês. Sabemos que imprevistos acontecem, mas a presença é fundamental para o aprendizado e o sucesso escolar.

*Entre em contato com a escola ou compareça para justificar as ausências. Estamos à disposição! 😊*

📞 Contato: (11) 5621-4087
🕐 Segunda a sexta: 7h às 18h30

*Juntos pelo melhor para ${nomeEstudante}!*`;
}

/**
 * Gera descrição para task fechada (mensagem enviada)
 */
export function generateTaskDescriptionSuccess(params: {
  telefone: string;
  nomeContato: string;
  numeroFaltas: number;
  mesReferencia: number;
  anoReferencia: number;
}): string {
  const { telefone, nomeContato, numeroFaltas, mesReferencia, anoReferencia } = params;
  const mesNome = getMonthName(mesReferencia);

  return `Mensagem enviada via WhatsApp ao número ${telefone} (${nomeContato}) informando que o(a) estudante possui ${numeroFaltas} faltas no mês de ${mesNome} de ${anoReferencia}.`;
}

/**
 * Gera relatório resumido de execução da automação
 */
export function generateExecutionReport(summary: {
  studentsFound: number;
  messagesSucceeded: number;
  messagesFailed: number;
  messagesSkippedAlreadySent: number;
  tasksCreated: number;
  durationMs: number;
  dryRun: boolean;
}): string {
  const {
    studentsFound,
    messagesSucceeded,
    messagesFailed,
    messagesSkippedAlreadySent,
    tasksCreated,
    durationMs,
    dryRun
  } = summary;

  const durationSec = (durationMs / 1000).toFixed(1);

  return `📊 RELATÓRIO DE EXECUÇÃO - ${dryRun ? 'MODO TESTE' : 'PRODUÇÃO'}

✅ Estudantes encontrados: ${studentsFound}
📤 Mensagens enviadas: ${messagesSucceeded}
❌ Falhas no envio: ${messagesFailed}
⏭️ Já enviadas (puladas): ${messagesSkippedAlreadySent}
📋 Tasks criadas: ${tasksCreated}
⏱️ Tempo total: ${durationSec}s

${dryRun ? '⚠️ ATENÇÃO: Este foi um teste. Nenhuma mensagem real foi enviada.' : ''}

--
Sistema Automático de Alertas`;
}

/**
 * Gera mensagem de erro crítico para administrador
 */
export function generateErrorNotification(error: {
  message: string;
  timestamp: string;
}): string {
  return `🚨 AUTOMAÇÃO DE FALTAS - ERRO

⚠️ A execução automática falhou!

📅 Data/Hora: ${new Date(error.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
❌ Erro: ${error.message}

Por favor, verifique os logs em:
https://vercel.com/dashboard/logs

--
Sistema Automático de Alertas`;
}

export { getMonthName };
