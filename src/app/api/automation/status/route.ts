import { NextRequest, NextResponse } from 'next/server';
import { AutomationExecutionService } from '@/services/supabase/automationExecutionService';
import { logger } from '@/utils/logger';

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
      const execution = await AutomationExecutionService.getExecutionById(executionId);

      if (!execution) {
        return NextResponse.json(
          { success: false, error: 'Execution not found' },
          { status: 404 }
        );
      }

      // Calcular progresso
      const progressPercentage = execution.totalStudents > 0
        ? Math.round((execution.processedStudents / execution.totalStudents) * 100)
        : 0;

      const startedMs = execution.startedAt ? new Date(execution.startedAt).getTime() : new Date(execution.createdAt).getTime();
      const finishedMs = execution.completedAt ? new Date(execution.completedAt).getTime() : Date.now();
      const elapsedMinutes = Math.round((finishedMs - startedMs) / 1000 / 60);

      return NextResponse.json({
        success: true,
        execution: {
          executionId: execution.id,
          status: execution.status,
          startedAt: execution.startedAt || execution.createdAt,
          finishedAt: execution.completedAt || null,
          updatedAt: execution.updatedAt,
          elapsedMinutes,
          dryRun: execution.dryRun,
          absenceMultiple: execution.absenceMultiple,
          progress: {
            totalStudents: execution.totalStudents,
            processedStudents: execution.processedStudents,
            remainingStudents: execution.totalStudents - execution.processedStudents,
            percentage: progressPercentage
          },
          results: execution.results || {}
        }
      });
    }

    // ==========================================
    // CASO 2: LISTAR EXECUÇÕES RECENTES
    // ==========================================
    const executions = await AutomationExecutionService.getRecentExecutions(limitParam);

    const formattedExecutions = executions.map(data => {
      const progressPercentage = data.totalStudents > 0
        ? Math.round((data.processedStudents / data.totalStudents) * 100)
        : 0;

      const results = data.results || {};

      return {
        executionId: data.id,
        status: data.status,
        startedAt: data.startedAt || data.createdAt,
        finishedAt: data.completedAt || null,
        dryRun: data.dryRun,
        absenceMultiple: data.absenceMultiple,
        processedStudents: data.processedStudents,
        totalStudents: data.totalStudents,
        progressPercentage,
        results
      };
    });

    return NextResponse.json({
      success: true,
      count: formattedExecutions.length,
      executions: formattedExecutions
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
