import { NextRequest, NextResponse } from 'next/server';
import { AutomationExecutionService } from '@/services/supabase/automationExecutionService';
import { logger } from '@/utils/logger';
import { processAbsencesWithCheckpoint } from '@/services/automationOrchestrator';

/**
 * API ORQUESTRADORA - AUTOMAÇÃO DE ALERTAS DE FALTAS
 *
 * **Comportamento Fire-and-Forget:**
 * - Retorna 202 Accepted imediatamente (< 2s)
 * - Processamento roda em background
 * - Relatório enviado via WhatsApp ao final
 * - Estado salvo no Supabase (checkpoints)
 *
 * Chamada pelo GitHub Actions diariamente às 9h AM (São Paulo)
 *
 * Query Params:
 * - dryRun=true|false (default: false)
 * - multiple=3 (default: 3)
 * - notificationPhone=5511988384664
 *
 * Auth: Basic Auth (mesmas credenciais da API absence-multiples)
 */
export async function GET(request: NextRequest) {
  const executionId = `exec-${Date.now()}`;

  // Query params
  const searchParams = request.nextUrl.searchParams;
  const dryRun = searchParams.get('dryRun') === 'true';
  const absenceMultiple = parseInt(searchParams.get('multiple') || '3');
  const notificationPhone = searchParams.get('notificationPhone') || '5511988384664';

  logger.info('[AUTOMATION] 🚀 Execução iniciada (Fire-and-Forget)', {
    executionId,
    dryRun,
    absenceMultiple,
    notificationPhone
  });

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
  // CRIAR EXECUÇÃO NO SUPABASE (PENDING)
  // ==========================================
  try {
    const currentDate = new Date();
    const referenceMonth = currentDate.getMonth() + 1; // 1-12
    const referenceYear = currentDate.getFullYear();

    const execution = await AutomationExecutionService.createExecution({
      totalStudents: 0,
      studentsData: [],
      dryRun,
      absenceMultiple,
      notificationPhone
    });

    const createdExecutionId = execution.id;

    logger.info('[AUTOMATION] ✅ Execução criada no Supabase', {
      executionId: createdExecutionId,
      status: 'PENDING'
    });

    // ==========================================
    // DISPARAR PROCESSAMENTO EM BACKGROUND
    // ==========================================
    processAbsencesWithCheckpoint(
      createdExecutionId,
      {
        dryRun,
        absenceMultiple,
        notificationPhone,
        referenceMonth,
        referenceYear
      },
      authorization
    ).catch(error => {
      logger.error('[AUTOMATION] ❌ Erro no processamento background', {
        executionId: createdExecutionId,
        error: error.message
      });
    });

    // ==========================================
    // RETORNAR IMEDIATAMENTE (202 ACCEPTED)
    // ==========================================
    return NextResponse.json(
      {
        success: true,
        executionId: createdExecutionId,
        status: 'STARTED',
        message: 'Processamento iniciado em background. Você receberá relatório via WhatsApp.',
        dryRun,
        absenceMultiple,
        notificationPhone
      },
      { status: 202 } // 202 Accepted
    );

  } catch (error) {
    logger.error('[AUTOMATION] ❌ Erro ao criar execução', {
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao iniciar automação'
      },
      { status: 500 }
    );
  }
}
