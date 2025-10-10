import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { logger } from '@/utils/logger';
import type { AutomationExecution } from '@/types';

/**
 * API DE CONSULTA DE STATUS
 *
 * Permite consultar o status de uma execução específica ou listar execuções recentes.
 *
 * Method: GET
 * Query Params:
 * - executionId (opcional): ID da execução específica
 * - limit (opcional): Quantidade de execuções recentes (padrão: 10)
 * Auth: Basic Auth
 */
export async function GET(request: NextRequest) {
  logger.info('[AUTOMATION] 📊 Consulta de status');

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
  const executionId = searchParams.get('executionId');
  const limitParam = parseInt(searchParams.get('limit') || '10');

  try {
    // ==========================================
    // CASO 1: CONSULTAR EXECUÇÃO ESPECÍFICA
    // ==========================================
    if (executionId) {
      const executionRef = adminDb.collection('automationExecutions').doc(executionId);
      const executionDoc = await executionRef.get();

      if (!executionDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Execution not found' },
          { status: 404 }
        );
      }

      const execution = executionDoc.data() as AutomationExecution;

      // Calcular progresso
      const progressPercentage = execution.totalStudents > 0
        ? Math.round((execution.processedStudents / execution.totalStudents) * 100)
        : 0;

      const elapsedMs = execution.finishedAt
        ? execution.finishedAt - execution.startedAt
        : Date.now() - execution.startedAt;

      const elapsedMinutes = Math.round(elapsedMs / 1000 / 60);

      return NextResponse.json({
        success: true,
        execution: {
          executionId: execution.executionId,
          status: execution.status,
          startedAt: new Date(execution.startedAt).toISOString(),
          finishedAt: execution.finishedAt ? new Date(execution.finishedAt).toISOString() : null,
          lastCheckpointAt: execution.lastCheckpointAt ? new Date(execution.lastCheckpointAt).toISOString() : null,
          elapsedMinutes,
          dryRun: execution.dryRun,
          absenceMultiple: execution.absenceMultiple,
          referenceMonth: execution.referenceMonth,
          referenceYear: execution.referenceYear,
          progress: {
            totalStudents: execution.totalStudents,
            processedStudents: execution.processedStudents,
            remainingStudents: execution.totalStudents - execution.processedStudents,
            percentage: progressPercentage
          },
          results: {
            messagesSucceeded: execution.messagesSucceeded,
            messagesFailed: execution.messagesFailed,
            tasksCreated: execution.tasksCreated,
            errors: execution.errors
          },
          summary: execution.summary || null
        }
      });
    }

    // ==========================================
    // CASO 2: LISTAR EXECUÇÕES RECENTES
    // ==========================================
    const executionsQuery = adminDb.collection('automationExecutions')
      .orderBy('startedAt', 'desc')
      .limit(limitParam);

    const executionsSnapshot = await executionsQuery.get();
    const executions = executionsSnapshot.docs.map(doc => {
      const data = doc.data() as AutomationExecution;
      const progressPercentage = data.totalStudents > 0
        ? Math.round((data.processedStudents / data.totalStudents) * 100)
        : 0;

      return {
        executionId: data.executionId,
        status: data.status,
        startedAt: new Date(data.startedAt).toISOString(),
        finishedAt: data.finishedAt ? new Date(data.finishedAt).toISOString() : null,
        dryRun: data.dryRun,
        absenceMultiple: data.absenceMultiple,
        processedStudents: data.processedStudents,
        totalStudents: data.totalStudents,
        progressPercentage,
        messagesSucceeded: data.messagesSucceeded,
        tasksCreated: data.tasksCreated,
        errorCount: data.errors.length
      };
    });

    return NextResponse.json({
      success: true,
      count: executions.length,
      executions
    });

  } catch (error) {
    logger.error('[AUTOMATION] ❌ Erro ao consultar status', {
      executionId,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao consultar status'
      },
      { status: 500 }
    );
  }
}
