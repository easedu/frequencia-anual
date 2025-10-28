import { NextRequest, NextResponse } from 'next/server';
import { AutomationExecutionService, type AutomationExecution } from '@/services/supabase/automationExecutionService';
import { logger } from '@/utils/logger';
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
  } catch (_error: unknown) {
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

  try {
    // ==========================================
    // BUSCAR EXECUÇÕES TRAVADAS NO SUPABASE
    // ==========================================
    // Buscar última execução RUNNING
    const runningExecution = await AutomationExecutionService.getLastRunningExecution();
    const stuckExecutions: AutomationExecution[] = [];

    if (runningExecution && runningExecution.updatedAt) {
      const lastUpdated = new Date(runningExecution.updatedAt).getTime();

      // Verificar se está travado (sem atualização há muito tempo)
      if (lastUpdated < cutoffTime) {
        stuckExecutions.push(runningExecution);
      }
    }

    // ==========================================
    // SE AUTO-RESUME ATIVADO: RETOMAR
    // ==========================================
    if (autoResume && stuckExecutions.length > 0) {
      const resumed: string[] = [];
      const failed: Array<{ executionId: string; error: string }> = [];

      for (const execution of stuckExecutions) {
        try {
          // Marcar como RUNNING novamente (Supabase atualiza updated_at automaticamente)
          await AutomationExecutionService.updateStatus(execution.id, 'RUNNING');

          // Retomar em background
          const currentDate = new Date();
          processAbsencesWithCheckpoint(
            execution.id,
            {
              dryRun: execution.dryRun ?? false,
              absenceMultiple: execution.absenceMultiple ?? 3,
              notificationPhone: execution.notificationPhone ?? '',
              referenceMonth: currentDate.getMonth() + 1,
              referenceYear: currentDate.getFullYear()
            },
            authorization
          ).catch((error: unknown) => {
            logger.error('[WATCHDOG] ❌ Erro ao retomar', {
              executionId: execution.id,
              error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
          });

          resumed.push(execution.id);

        } catch (error: unknown) {
          failed.push({
            executionId: execution.id,
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
        executionId: e.id,
        status: e.status,
        startedAt: e.startedAt ?? e.createdAt ?? '',
        updatedAt: e.updatedAt,
        minutesSinceUpdate: e.updatedAt ? Math.round((Date.now() - new Date(e.updatedAt).getTime()) / 1000 / 60) : 0,
        processedStudents: e.processedStudents ?? 0,
        totalStudents: e.totalStudents ?? 0
      })),
      message: stuckExecutions.length > 0
        ? `${stuckExecutions.length} execução(ões) travada(s). Use autoResume=true para retomar.`
        : 'Nenhuma execução travada encontrada.'
    });

  } catch (error: unknown) {
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
