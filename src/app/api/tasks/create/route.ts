import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDoc, addDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { FIREBASE_PATHS } from '@/config/constants';
import { logger } from '@/utils/logger';
import type { Student, FamilyInteraction } from '@/app/types';
import type { UserTask, TaskType, TaskStatus } from '@/types/tasks';

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
  processed_at?: string;
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
function getTaskTypeFromAction(action: string): TaskType {
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
 * Função para determinar o bimestre baseado no mês e ano
 */
async function getBimesterFromDate(month: number, year: number): Promise<string> {
  try {
    const docRef = doc(db, year.toString(), 'ano_letivo');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const targetDate = new Date(year, month - 1, 15); // Usar meio do mês como referência

      const bimestres = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

      for (const bimestre of bimestres) {
        if (data[bimestre]?.startDate && data[bimestre]?.endDate) {
          const [startDay, startMonth, startYear] = data[bimestre].startDate.split('/').map(Number);
          const [endDay, endMonth, endYear] = data[bimestre].endDate.split('/').map(Number);

          const startDate = new Date(startYear, startMonth - 1, startDay);
          const endDate = new Date(endYear, endMonth - 1, endDay);

          if (targetDate >= startDate && targetDate <= endDate) {
            return bimestre;
          }
        }
      }
    }

    // Fallback baseado no mês
    if (month <= 3) return '1º Bimestre';
    if (month <= 6) return '2º Bimestre';
    if (month <= 9) return '3º Bimestre';
    return '4º Bimestre';
  } catch (error) {
    logger.error('Erro ao determinar bimestre:', error as Error);
    return '1º Bimestre';
  }
}

/**
 * Função para buscar dados completos do estudante
 */
async function getStudentData(estudanteId: string): Promise<Student | null> {
  try {
    const studentsDocRef = doc(db, FIREBASE_PATHS.students());
    const studentsDocSnap = await getDoc(studentsDocRef);

    if (!studentsDocSnap.exists()) {
      return null;
    }

    const studentsData = studentsDocSnap.data();
    const allStudents = (studentsData.estudantes || []) as Student[];

    return allStudents.find(student => student.estudanteId === estudanteId) || null;
  } catch (error) {
    logger.error('Erro ao buscar dados do estudante:', error as Error);
    return null;
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
 * Função para criar uma interação familiar
 */
async function createFamilyInteraction(
  studentId: string,
  actionType: string,
  description: string,
  date: string
): Promise<string> {
  try {
    const interactionData: Omit<FamilyInteraction, "id"> = {
      studentId,
      type: actionType,
      description,
      date,
      createdBy: "BOT",
      sensitive: false
    };

    const interactionsRef = collection(db, FIREBASE_PATHS.interactions(studentId));
    const docRef = await addDoc(interactionsRef, interactionData);

    logger.info(`Interação criada para estudante ${studentId}: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    logger.error('Erro ao criar interação familiar:', error as Error);
    throw error;
  }
}

/**
 * Função para criar uma tarefa de usuário
 */
async function createUserTask(
  taskData: CreateTaskRequest,
  studentData: Student,
  bimestre: string,
  frequencyPercentage: number
): Promise<string> {
  try {
    const newTask: Omit<UserTask, 'id'> = {
      userId: "BOT", // Usando BOT como userId
      estudanteId: taskData.estudante_id,
      studentName: studentData.nome,
      studentClass: studentData.turma,
      taskType: getTaskTypeFromAction(taskData.recommended_action),
      bimestre,
      status: taskData.is_resolved ? 'COMPLETED' : 'PENDING',
      frequencyPercentage,
      absencesCount: taskData.absences_count,
      isPCD: studentData.deficiencia?.estudanteComDeficiencia || false,
      createdAt: taskData.created_at,
      completedAt: taskData.is_resolved ? taskData.processed_at : undefined,
      interactionId: undefined // Será preenchido após criar a interação, se necessário
    };

    const tasksRef = collection(db, 'userTasks');
    const docRef = await addDoc(tasksRef, newTask);

    logger.info(`Tarefa criada: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    logger.error('Erro ao criar tarefa:', error as Error);
    throw error;
  }
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

    // Determinar bimestre
    const bimestre = await getBimesterFromDate(taskData.reference_month, taskData.reference_year);

    // Calcular frequência (usando 22 como aproximação de dias letivos por mês)
    const estimatedSchoolDays = 22;
    const frequencyPercentage = calculateFrequencyPercentage(taskData.absences_count, estimatedSchoolDays);

    // Mapear prioridade
    const priorityLevel = mapPriorityToLevel(taskData.priority);

    // Usar transação para garantir consistência
    const batch = writeBatch(db);
    let taskId: string;
    let interactionId: string | undefined;

    // Criar tarefa
    const taskRef = doc(collection(db, 'userTasks'));
    taskId = taskRef.id;

    // Criar objeto da tarefa, removendo campos undefined
    const newTask: any = {
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
      priority: priorityLevel,
      recommendedAction: taskData.recommended_action || '' // Salvar a ação recomendada original
    };

    // Adicionar campos opcionais apenas se não forem undefined
    if (taskData.is_resolved && taskData.processed_at) {
      newTask.completedAt = taskData.processed_at;
      newTask.resolvedBy = 'API Externa'; // Indicar que foi resolvida via API
    }

    batch.set(taskRef, newTask);

    // Se tarefa está resolvida, criar interação
    if (taskData.is_resolved && taskData.action_taken && taskData.action_description) {
      const interactionRef = doc(collection(db, FIREBASE_PATHS.interactions(taskData.estudante_id)));
      interactionId = interactionRef.id;

      const interactionData: Omit<FamilyInteraction, "id"> = {
        studentId: taskData.estudante_id,
        type: taskData.action_taken,
        description: taskData.action_description,
        date: taskData.processed_at || new Date().toISOString(),
        createdBy: "BOT",
        sensitive: false
      };

      batch.set(interactionRef, interactionData);

      // Atualizar tarefa com ID da interação
      batch.update(taskRef, { interactionId });
    }

    // Executar transação
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