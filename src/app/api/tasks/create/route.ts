import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { FIREBASE_PATHS } from '@/config/constants';
import { logger } from '@/utils/logger';
import type { Student, FamilyInteraction } from '@/app/types';
import type { UserTask, TaskType } from '@/types/tasks';
import { getStudentByIdFast } from '@/services/studentDataService';

/**
 * Interface para os dados de entrada da API
 */
interface CreateTaskRequest {
  estudante_id: string;
  absences_count: number;
  reference_month: number;
  reference_year: number;
  priority: 0 | 1 | 2; // 0 = Crítica, 1 = Atenção, 2 = Rotina
  created_at: string;
  created_by: string; // Nome de quem criou a tarefa
  processed_at?: string;
  solved_by?: string; // Nome de quem resolveu a tarefa (obrigatório se is_resolved = true)
  recommended_action?: string; // Obrigatório se is_resolved = false
  action_taken?: string; // Obrigatório se is_resolved = true
  action_description?: string;
  is_resolved: boolean;
}

/**
 * Interface para a resposta da API
 */
interface CreateTaskResponse {
  success: boolean;
  data?: {
    taskId: string;
    interactionId?: string;
    message: string;
  };
  error?: string;
}

/**
 * Função para determinar o tipo de tarefa baseado na ação recomendada
 */
function getTaskTypeFromAction(_action: string): TaskType {
  // Por enquanto só temos um tipo, mas pode ser expandido
  return 'CONSELHO_TUTELAR';
}

/**
 * Função para mapear prioridade numérica para TaskPriorityLevel
 */
function mapPriorityToLevel(priority: 0 | 1 | 2): 'critical' | 'attention' | 'routine' {
  switch (priority) {
    case 0:
      return 'critical';
    case 1:
      return 'attention';
    case 2:
      return 'routine';
  }
}

/**
 * Função para converter data ISO para formato Firebase (YYYY-MM-DD)
 */
function convertISOToFirebaseDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      // Se não for uma data válida, tentar como se fosse já no formato correto
      return isoString;
    }

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (error) {
    logger.error('Erro ao converter data ISO para Firebase:', error as Error);
    return new Date().toISOString().split('T')[0]; // Fallback para hoje
  }
}

/**
 * Função para determinar o bimestre baseado no mês (otimizada - sem leitura do Firebase)
 * PERFORMANCE: Removida busca ao Firebase - usa lógica baseada em mês
 */
function getBimesterFromMonth(month: number): string {
  // Lógica simplificada baseada no calendário escolar padrão
  if (month <= 3) return '1º Bimestre';
  if (month <= 6) return '2º Bimestre';
  if (month <= 9) return '3º Bimestre';
  return '4º Bimestre';
}

/**
 * FASE 3: Função para buscar dados completos do estudante
 * OTIMIZADO: Usa getStudentByIdFast para evitar carregar contatos (performance)
 */
async function getStudentData(estudanteId: string): Promise<Student | null> {
  try {
    console.log(`[TASKS-CREATE] Buscando estudante ${estudanteId}...`);

    const student = await getStudentByIdFast(estudanteId);

    if (!student) {
      logger.warn(`Estudante ${estudanteId} não encontrado`);
      return null;
    }

    console.log(`[TASKS-CREATE] ✅ Estudante encontrado: ${student.nome}`);
    return student;
  } catch (error) {
    logger.error('Erro ao buscar dados do estudante:', error as Error);
    return null;
  }
}

/**
 * FASE 3: Função para salvar interação APENAS na estrutura V3 (otimizada)
 * PERFORMANCE: Removido dual-write - escreve apenas em students/{id}/interactions
 */
function saveInteractionV3Only(
  batch: ReturnType<typeof writeBatch>,
  estudanteId: string,
  interactionData: Omit<FamilyInteraction, "id">
): string {
  const interactionId = doc(collection(db, 'temp')).id; // Gerar ID único

  try {
    // ESTRUTURA V3 APENAS: students/{id}/interactions
    const newInteractionRef = doc(db, 'students', estudanteId, 'interactions', interactionId);
    batch.set(newInteractionRef, {
      ...interactionData,
      createdAt: serverTimestamp(),
      anoLetivo: '2025'
    });

    console.log(`[TASKS-CREATE] 💾 Interação V3 configurada (ID: ${interactionId})`);

    return interactionId;
  } catch (error) {
    logger.error('Erro ao configurar interação V3:', error as Error);
    return interactionId;
  }
}

/**
 * Função para calcular frequência percentual
 */
function calculateFrequencyPercentage(absencesCount: number, totalDays: number): number {
  if (totalDays === 0) return 100;
  const attendance = totalDays - absencesCount;
  return Math.max(0, (attendance / totalDays) * 100);
}

/**
 * Endpoint POST para criar tarefas
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação usando as credenciais da API Habib Kyrillos
    const authorization = request.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json(
        { success: false, error: 'Authorization header required' },
        { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="API"' } }
      );
    }

    if (!authorization.startsWith('Basic ')) {
      return NextResponse.json(
        { success: false, error: 'Basic authentication required' },
        { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="API"' } }
      );
    }

    const base64Credentials = authorization.slice(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    const expectedUsername = process.env.API_HABIB_KYRILLOS_USERNAME;
    const expectedPassword = process.env.API_HABIB_KYRILLOS_PASSWORD;

    if (!expectedUsername || !expectedPassword) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (username !== expectedUsername || password !== expectedPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="API"' } }
      );
    }

    // Parse e validação dos dados de entrada
    const taskData: CreateTaskRequest = await request.json();

    // Validações básicas
    if (!taskData.estudante_id) {
      return NextResponse.json({
        success: false,
        error: 'Campo obrigatório: estudante_id'
      } as CreateTaskResponse, { status: 400 });
    }

    if (!taskData.created_by) {
      return NextResponse.json({
        success: false,
        error: 'Campo obrigatório: created_by'
      } as CreateTaskResponse, { status: 400 });
    }

    if (typeof taskData.absences_count !== 'number' || taskData.absences_count < 0) {
      return NextResponse.json({
        success: false,
        error: 'absences_count deve ser um número maior ou igual a 0'
      } as CreateTaskResponse, { status: 400 });
    }

    if (typeof taskData.reference_month !== 'number' || taskData.reference_month < 1 || taskData.reference_month > 12) {
      return NextResponse.json({
        success: false,
        error: 'reference_month deve ser um número entre 1 e 12'
      } as CreateTaskResponse, { status: 400 });
    }

    // Validação de prioridade
    if (![0, 1, 2].includes(taskData.priority)) {
      return NextResponse.json({
        success: false,
        error: 'priority deve ser 0 (crítica), 1 (atenção) ou 2 (rotina)'
      } as CreateTaskResponse, { status: 400 });
    }

    // Validação condicional baseada no status
    if (taskData.is_resolved) {
      if (!taskData.action_taken || !taskData.action_description) {
        return NextResponse.json({
          success: false,
          error: 'Para tarefas resolvidas, action_taken e action_description são obrigatórios'
        } as CreateTaskResponse, { status: 400 });
      }
      if (!taskData.solved_by) {
        return NextResponse.json({
          success: false,
          error: 'Para tarefas resolvidas, solved_by é obrigatório'
        } as CreateTaskResponse, { status: 400 });
      }
    } else {
      if (!taskData.recommended_action) {
        return NextResponse.json({
          success: false,
          error: 'Para tarefas pendentes, recommended_action é obrigatório'
        } as CreateTaskResponse, { status: 400 });
      }
    }

    // Buscar dados completos do estudante
    const studentData = await getStudentData(taskData.estudante_id);
    if (!studentData) {
      return NextResponse.json({
        success: false,
        error: `Estudante não encontrado: ${taskData.estudante_id}`
      } as CreateTaskResponse, { status: 404 });
    }

    // Determinar bimestre (otimizado - sem leitura do Firebase)
    const bimestre = getBimesterFromMonth(taskData.reference_month);

    // Calcular frequência (usando 22 como aproximação de dias letivos por mês)
    const estimatedSchoolDays = 22;
    const frequencyPercentage = calculateFrequencyPercentage(taskData.absences_count, estimatedSchoolDays);

    // Mapear prioridade
    const priorityLevel = mapPriorityToLevel(taskData.priority);

    // Usar transação para garantir consistência
    const batch = writeBatch(db);
    let interactionId: string | undefined;

    // FASE 3: Se tarefa está resolvida, criar interação PRIMEIRO (V3 apenas)
    if (taskData.is_resolved && taskData.action_taken && taskData.action_description) {
      const interactionData: Omit<FamilyInteraction, "id"> = {
        studentId: taskData.estudante_id,
        type: taskData.action_taken,
        description: taskData.action_description,
        date: convertISOToFirebaseDate(taskData.processed_at || new Date().toISOString()),
        createdBy: taskData.solved_by || taskData.created_by, // Usar solved_by se fornecido, senão created_by
        sensitive: false
      };

      // Salvar APENAS na estrutura V3 (otimizado)
      interactionId = saveInteractionV3Only(
        batch,
        taskData.estudante_id,
        interactionData
      );

      console.log(`[TASKS-CREATE] ✅ Interação V3 configurada (ID: ${interactionId})`);
    }

    // Criar tarefa JÁ COM interactionId (evita batch.update adicional)
    const taskRef = doc(collection(db, 'userTasks'));
    const taskId = taskRef.id;

    // Criar objeto da tarefa, removendo campos undefined
    const newTask: Omit<UserTask, 'id'> = {
      userId: "BOT",
      estudanteId: taskData.estudante_id,
      studentName: studentData.nome,
      studentClass: studentData.turma,
      taskType: getTaskTypeFromAction(taskData.is_resolved ? (taskData.action_taken || '') : (taskData.recommended_action || '')),
      bimestre,
      status: taskData.is_resolved ? 'COMPLETED' : 'PENDING',
      frequencyPercentage,
      absencesCount: taskData.absences_count,
      isPCD: studentData.deficiencia?.estudanteComDeficiencia || false,
      createdAt: taskData.created_at,
      createdBy: taskData.created_by,
      priority: priorityLevel,
      recommendedAction: taskData.recommended_action || taskData.action_taken || 'Ação não especificada',
      ...(interactionId && { interactionId }), // Incluir interactionId se existir
    };

    // Adicionar campos opcionais apenas se não forem undefined
    if (taskData.is_resolved && taskData.processed_at) {
      newTask.completedAt = taskData.processed_at;
      newTask.resolvedBy = taskData.solved_by || taskData.created_by;
    }

    batch.set(taskRef, newTask);

    // Executar transação (OTIMIZADO: menos operações)
    await batch.commit();

    logger.info(`Tarefa criada com sucesso: ${taskId}`, {
      estudanteId: taskData.estudante_id,
      isResolved: taskData.is_resolved,
      interactionId
    });

    return NextResponse.json({
      success: true,
      data: {
        taskId,
        interactionId,
        message: taskData.is_resolved
          ? 'Tarefa criada e marcada como resolvida com interação registrada'
          : 'Tarefa criada como pendente'
      }
    } as CreateTaskResponse);

  } catch (error) {
    logger.error('Erro na API de criação de tarefas:', error as Error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    } as CreateTaskResponse, { status: 500 });
  }
}