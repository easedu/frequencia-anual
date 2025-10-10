import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/utils/logger';
import type { AutomationExecution } from '@/types';
import { processAbsencesWithCheckpoint } from '@/services/automationOrchestrator';

/**
 * WATCHDOG MONITOR - DETECTA E RETOMA PROCESSOS TRAVADOS
 *
 * Busca execuções que estão há mais de X tempo sem checkpoint
 * e retoma automaticamente.
 *
 * Deve ser chamado periodicamente (ex: a cada 30 minutos via cron separado)
 *
 * Method: POST
 * Auth: Basic Auth
 * Query Params:
 * - timeoutMinutes (opcional): Tempo sem checkpoint para considerar travado (padrão: 60)
 * - autoResume (opcional): Se true, retoma automaticamente. Se false, apenas lista (padrão: false)
 */
export async function POST(request: NextRequest) {
  logger.info('[WATCHDOG] 🐕 Iniciando monitoramento de execuções travadas');

  // ==========================================
  // AUTENTICAÇÃO
  // ==========================================
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return NextResponse.json(
      { success: false, error: 'Authorization header required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="API"' } }
    );
  }

  try {
    // Validar Basic Auth
    const base64Credentials = authorization.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    const expectedUser = process.env.API_HABIB_KYRILLOS_USERNAME || '';
    const expectedPassword = process.env.API_HABIB_KYRILLOS_PASSWORD || '';

    if (username !== expectedUser || password !== expectedPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="API"' } }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid authorization format' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="API"' } }
    );
  }

  // ==========================================
  // QUERY PARAMS
  // ==========================================
  const searchParams = request.nextUrl.searchParams;
  const timeoutMinutes = parseInt(searchParams.get('timeoutMinutes') || '60');
  const autoResume = searchParams.get('autoResume') === 'true';

  const timeoutMs = timeoutMinutes * 60 * 1000;
  const cutoffTime = Date.now() - timeoutMs;

  logger.info('[WATCHDOG] 🔍 Buscando execuções travadas', {
    timeoutMinutes,
    cutoffTime: new Date(cutoffTime).toISOString(),
    autoResume
  });

  try {
    // ==========================================
    // BUSCAR EXECUÇÕES TRAVADAS
    // ==========================================
    // Execuções RUNNING ou RESUMING com lastCheckpointAt antigo
    const stuckQuery = adminDb.collection('automationExecutions')
      .where('status', 'in', ['RUNNING', 'RESUMING']);

    const stuckSnapshot = await stuckQuery.get();
    const stuckExecutions: AutomationExecution[] = [];

    stuckSnapshot.forEach(doc => {
      const data = doc.data() as AutomationExecution;
      const lastCheckpoint = data.lastCheckpointAt || data.startedAt;

      // Verificar se está travado (checkpoint muito antigo)
      if (lastCheckpoint < cutoffTime) {
        stuckExecutions.push(data);
      }
    });

    logger.info('[WATCHDOG] 📊 Execuções travadas encontradas', {
      count: stuckExecutions.length,
      executions: stuckExecutions.map(e => ({
        executionId: e.executionId,
        status: e.status,
        lastCheckpointAt: e.lastCheckpointAt ? new Date(e.lastCheckpointAt).toISOString() : null,
        minutesSinceCheckpoint: Math.round((Date.now() - (e.lastCheckpointAt || e.startedAt)) / 1000 / 60)
      }))
    });

    // ==========================================
    // SE AUTO-RESUME ATIVADO: RETOMAR
    // ==========================================
    if (autoResume && stuckExecutions.length > 0) {
      const resumed: string[] = [];
      const failed: Array<{ executionId: string; error: string }> = [];

      for (const execution of stuckExecutions) {
        try {
          logger.info('[WATCHDOG] 🔄 Retomando execução travada', {
            executionId: execution.executionId,
            processedStudents: execution.processedStudents,
            totalStudents: execution.totalStudents
          });

          // Marcar como RESUMING
          await adminDb.collection('automationExecutions').doc(execution.executionId).update({
            status: 'RESUMING',
            lastCheckpointAt: FieldValue.serverTimestamp()
          });

          // Retomar em background
          processAbsencesWithCheckpoint(
            execution.executionId,
            {
              dryRun: execution.dryRun,
              absenceMultiple: execution.absenceMultiple,
              notificationPhone: execution.notificationPhone,
              referenceMonth: execution.referenceMonth,
              referenceYear: execution.referenceYear
            },
            authorization
          ).catch(error => {
            logger.error('[WATCHDOG] ❌ Erro ao retomar', {
              executionId: execution.executionId,
              error: error.message
            });
          });

          resumed.push(execution.executionId);

        } catch (error) {
          failed.push({
            executionId: execution.executionId,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      return NextResponse.json({
        success: true,
        stuckCount: stuckExecutions.length,
        resumedCount: resumed.length,
        failedCount: failed.length,
        resumed,
        failed
      });
    }

    // ==========================================
    // CASO CONTRÁRIO: APENAS LISTAR
    // ==========================================
    return NextResponse.json({
      success: true,
      stuckCount: stuckExecutions.length,
      autoResume: false,
      executions: stuckExecutions.map(e => ({
        executionId: e.executionId,
        status: e.status,
        startedAt: new Date(e.startedAt).toISOString(),
        lastCheckpointAt: e.lastCheckpointAt ? new Date(e.lastCheckpointAt).toISOString() : null,
        minutesSinceCheckpoint: Math.round((Date.now() - (e.lastCheckpointAt || e.startedAt)) / 1000 / 60),
        processedStudents: e.processedStudents,
        totalStudents: e.totalStudents
      })),
      message: stuckExecutions.length > 0
        ? `${stuckExecutions.length} execução(ões) travada(s). Use autoResume=true para retomar.`
        : 'Nenhuma execução travada encontrada.'
    });

  } catch (error) {
    logger.error('[WATCHDOG] ❌ Erro no watchdog', {
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro no watchdog'
      },
      { status: 500 }
    );
  }
}
