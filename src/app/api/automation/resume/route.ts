import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/utils/logger';
import type { AutomationExecution } from '@/types';
import { processAbsencesWithCheckpoint } from '@/services/automationOrchestrator';

/**
 * API DE RETOMADA MANUAL
 *
 * Retoma uma execução que falhou ou foi interrompida.
 * Usa checkpoints salvos no Firestore para continuar de onde parou.
 *
 * Method: POST
 * Body: { executionId: string }
 * Auth: Basic Auth
 */
export async function POST(request: NextRequest) {
  logger.info('[AUTOMATION] 🔄 Tentativa de retomada de execução');

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
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // ==========================================
  // BUSCAR EXECUÇÃO NO FIRESTORE
  // ==========================================
  try {
    const executionRef = adminDb.collection('automationExecutions').doc(executionId);
    const executionDoc = await executionRef.get();

    if (!executionDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Execution not found' },
        { status: 404 }
      );
    }

    const execution = executionDoc.data() as AutomationExecution;

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
    if (execution.status === 'RUNNING' || execution.status === 'RESUMING') {
      return NextResponse.json(
        {
          success: false,
          error: 'Execution is already running',
          execution: {
            executionId,
            status: execution.status,
            processedStudents: execution.processedStudents,
            totalStudents: execution.totalStudents,
            lastCheckpointAt: execution.lastCheckpointAt
          }
        },
        { status: 409 } // 409 Conflict
      );
    }

    logger.info('[AUTOMATION] 🔍 Execução encontrada, retomando...', {
      executionId,
      currentStatus: execution.status,
      processedStudents: execution.processedStudents,
      totalStudents: execution.totalStudents
    });

    // ==========================================
    // MARCAR COMO RESUMING
    // ==========================================
    await executionRef.update({
      status: 'RESUMING',
      lastCheckpointAt: FieldValue.serverTimestamp()
    });

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
    ).catch(error => {
      logger.error('[AUTOMATION] ❌ Erro ao retomar processamento', {
        executionId,
        error: error.message
      });
    });

    // ==========================================
    // RETORNAR IMEDIATAMENTE (202 ACCEPTED)
    // ==========================================
    return NextResponse.json(
      {
        success: true,
        executionId,
        status: 'RESUMING',
        message: 'Processamento retomado. Você receberá relatório via WhatsApp.',
        progress: {
          processedStudents: execution.processedStudents,
          totalStudents: execution.totalStudents,
          remainingStudents: execution.totalStudents - execution.processedStudents
        }
      },
      { status: 202 } // 202 Accepted
    );

  } catch (error) {
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
