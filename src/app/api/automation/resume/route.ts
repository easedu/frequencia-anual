import { NextRequest, NextResponse } from 'next/server';
import { AutomationExecutionService } from '@/services/supabase/automationExecutionService';
import { logger } from '@/utils/logger';
import { processAbsencesWithCheckpoint } from '@/services/automationOrchestrator';
import type { AutomationExecution } from '@/types';

/**
 * Helper para extrair dados da execução do metadata
 */
function extractExecutionData(execution: {
  id: string;
  metadata: Record<string, unknown>;
  executionStatus: string;
}): AutomationExecution | null {
  try {
    return {
      executionId: execution.id,
      status: execution.executionStatus as AutomationExecution['status'],
      startedAt: (execution.metadata.startedAt as number) || Date.now(),
      finishedAt: execution.metadata.finishedAt as number | undefined,
      lastCheckpointAt: execution.metadata.lastCheckpointAt as number | undefined,
      dryRun: (execution.metadata.dryRun as boolean) || false,
      absenceMultiple: (execution.metadata.absenceMultiple as number) || 3,
      notificationPhone: (execution.metadata.notificationPhone as string) || '',
      referenceMonth: (execution.metadata.referenceMonth as number) || 1,
      referenceYear: (execution.metadata.referenceYear as number) || 2025,
      totalStudents: (execution.metadata.totalStudents as number) || 0,
      processedStudents: (execution.metadata.processedStudents as number) || 0,
      currentStudentIndex: (execution.metadata.currentStudentIndex as number) || 0,
      processedStudentIds: (execution.metadata.processedStudentIds as string[]) || [],
      messagesSucceeded: (execution.metadata.messagesSucceeded as number) || 0,
      messagesFailed: (execution.metadata.messagesFailed as number) || 0,
      tasksCreated: (execution.metadata.tasksCreated as number) || 0,
      errors: (execution.metadata.errors as Array<{ estudanteId: string; estudanteNome: string; error: string }>) || [],
      summary: execution.metadata.summary as AutomationExecution['summary'],
      error: execution.metadata.error as string | undefined,
    };
  } catch (_error) {
    logger.error('[RESUME] Erro ao extrair dados da execução', { executionId: execution.id }, error as Error);
    return null;
  }
}

/**
 * API DE RETOMADA MANUAL
 *
 * Retoma uma execução que falhou ou foi interrompida.
 * Usa checkpoints salvos no Supabase para continuar de onde parou.
 *
 * Method: POST
 * Body: { executionId: string }
 * Auth: Basic Auth
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
  // VALIDAR BODY
  // ==========================================
  let executionId: string;
  try {
    const body = await request.json();
    executionId = body.executionId;

    if (!executionId) {
      return NextResponse.json(
        { success: false, error: 'executionId is required' },
        { status: 400 }
      );
    }
  } catch (_error: unknown) {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // ==========================================
  // BUSCAR EXECUÇÃO NO SUPABASE
  // ==========================================
  try {
    const rawExecution = await AutomationExecutionService.getExecutionById(executionId);

    if (!rawExecution) {
      return NextResponse.json(
        { success: false, error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Extrair dados da execução do metadata
    const execution = extractExecutionData(rawExecution);

    if (!execution) {
      return NextResponse.json(
        { success: false, error: 'Invalid execution data' },
        { status: 500 }
      );
    }

    // Verificar se já foi concluída
    if (execution.status === 'COMPLETED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Execution already completed',
          execution: {
            executionId,
            status: execution.status,
            processedStudents: execution.processedStudents,
            totalStudents: execution.totalStudents
          }
        },
        { status: 400 }
      );
    }

    // Verificar se já está rodando
    if (execution.status === 'RUNNING') {
      return NextResponse.json(
        {
          success: false,
          error: 'Execution is already running',
          execution: {
            executionId,
            status: execution.status,
            processedStudents: execution.processedStudents,
            totalStudents: execution.totalStudents
          }
        },
        { status: 409 } // 409 Conflict
      );
    }

    // ==========================================
    // MARCAR COMO RUNNING (RETOMANDO)
    // ==========================================
    await AutomationExecutionService.updateStatus(executionId, 'RUNNING');

    // ==========================================
    // RETOMAR PROCESSAMENTO EM BACKGROUND
    // ==========================================
    processAbsencesWithCheckpoint(
      executionId,
      {
        dryRun: execution.dryRun,
        absenceMultiple: execution.absenceMultiple,
        notificationPhone: execution.notificationPhone,
        referenceMonth: execution.referenceMonth,
        referenceYear: execution.referenceYear
      },
      authorization
    ).catch((error: unknown) => {
      logger.error('[AUTOMATION] ❌ Erro ao retomar processamento', {
        executionId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    });

    // ==========================================
    // RETORNAR IMEDIATAMENTE (202 ACCEPTED)
    // ==========================================
    return NextResponse.json(
      {
        success: true,
        executionId,
        status: 'RUNNING',
        message: 'Processamento retomado. Você receberá relatório via WhatsApp.',
        progress: {
          processedStudents: execution.processedStudents,
          totalStudents: execution.totalStudents,
          remainingStudents: execution.totalStudents - execution.processedStudents
        }
      },
      { status: 202 } // 202 Accepted
    );

  } catch (_error: unknown) {
    logger.error('[AUTOMATION] ❌ Erro ao retomar execução', {
      executionId,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao retomar automação'
      },
      { status: 500 }
    );
  }
}
