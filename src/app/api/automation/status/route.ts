import { NextRequest, NextResponse } from 'next/server';
import { AutomationExecutionService, AutomationExecution } from '@/services/supabase/automationExecutionService';
import { logger } from '@/utils/logger';

/**
 * Metadata structure stored in automation executions
 */
interface ExecutionMetadata {
  startedAt?: string;
  completedAt?: string;
  updatedAt?: string;
  dryRun?: boolean;
  absenceMultiple?: number;
  totalStudents?: number;
  processedStudents?: number;
  results?: Record<string, unknown>;
  [key: string]: unknown;
}

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

      // Extract metadata with type safety
      const metadata = execution.metadata as ExecutionMetadata;
      const totalStudents = metadata.totalStudents ?? 0;
      const processedStudents = metadata.processedStudents ?? 0;

      // Calcular progresso
      const progressPercentage = totalStudents > 0
        ? Math.round((processedStudents / totalStudents) * 100)
        : 0;

      const startedMs = metadata.startedAt ? new Date(metadata.startedAt).getTime() : new Date(execution.executedAt).getTime();
      const finishedMs = metadata.completedAt ? new Date(metadata.completedAt).getTime() : Date.now();
      const elapsedMinutes = Math.round((finishedMs - startedMs) / 1000 / 60);

      return NextResponse.json({
        success: true,
        execution: {
          executionId: execution.id,
          status: execution.executionStatus,
          startedAt: metadata.startedAt ?? execution.executedAt,
          finishedAt: metadata.completedAt ?? null,
          updatedAt: metadata.updatedAt ?? execution.executedAt,
          elapsedMinutes,
          dryRun: metadata.dryRun ?? false,
          absenceMultiple: metadata.absenceMultiple ?? 0,
          progress: {
            totalStudents,
            processedStudents,
            remainingStudents: totalStudents - processedStudents,
            percentage: progressPercentage
          },
          results: (metadata.results as Record<string, unknown>) ?? {}
        }
      });
    }

    // ==========================================
    // CASO 2: LISTAR EXECUÇÕES RECENTES
    // ==========================================
    const executions = await AutomationExecutionService.getRecentExecutions(limitParam);

    const formattedExecutions = executions.map((execution: AutomationExecution) => {
      // Extract metadata with type safety
      const metadata = execution.metadata as ExecutionMetadata;
      const totalStudents = metadata.totalStudents ?? 0;
      const processedStudents = metadata.processedStudents ?? 0;

      const progressPercentage = totalStudents > 0
        ? Math.round((processedStudents / totalStudents) * 100)
        : 0;

      const results = (metadata.results as Record<string, unknown>) ?? {};

      return {
        executionId: execution.id,
        status: execution.executionStatus,
        startedAt: metadata.startedAt ?? execution.executedAt,
        finishedAt: metadata.completedAt ?? null,
        dryRun: metadata.dryRun ?? false,
        absenceMultiple: metadata.absenceMultiple ?? 0,
        processedStudents,
        totalStudents,
        progressPercentage,
        results
      };
    });

    return NextResponse.json({
      success: true,
      count: formattedExecutions.length,
      executions: formattedExecutions
    });

  } catch (_error: unknown) {
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
