/**
 * Serviço para gerenciamento de tarefas de usuário
 */

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  getDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/firebase.config';
import { logger } from '@/utils/logger';
import type { UserTask, TaskGenerationResult, BimesterTaskControl } from '@/types/tasks';
import type { Student } from '@/app/types';
import { addCreationAudit, addUpdateAudit } from '@/utils/auditHelpers';
import { initializeSoftDelete } from '@/utils/softDeleteHelpers';

export class TaskService {
  private static readonly COLLECTION_TASKS = 'userTasks';
  private static readonly COLLECTION_TASK_CONTROL = 'taskControl';

  /**
   * Identifica o bimestre atual baseado na data
   */
  private static async getCurrentBimester(): Promise<string> {
    try {
      const docRef = doc(db, '2025', 'ano_letivo');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const bimestres = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

        for (const bimestre of bimestres) {
          if (data[bimestre]?.startDate && data[bimestre]?.endDate) {
            const [startDay, startMonth, startYear] = data[bimestre].startDate.split('/').map(Number);
            const [endDay, endMonth, endYear] = data[bimestre].endDate.split('/').map(Number);

            const startDate = new Date(startYear, startMonth - 1, startDay);
            const endDate = new Date(endYear, endMonth - 1, endDay);

            if (hoje >= startDate && hoje <= endDate) {
              return bimestre;
            }
          }
        }
      }

      return '1º Bimestre';
    } catch (error) {
      logger.error('Erro ao detectar bimestre atual:', error as Error);
      return '1º Bimestre';
    }
  }


  /**
   * Calcula dados completos de frequência de um estudante no bimestre atual
   */
  private static async calculateCurrentBimesterData(
    estudanteId: string,
    currentBimester: string
  ): Promise<{ frequency: number; absences: number; totalDays: number }> {
    try {
      // Timeout para evitar travamentos
      return await Promise.race([
        this.doCalculateFrequencyData(estudanteId, currentBimester),
        new Promise<{ frequency: number; absences: number; totalDays: number }>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout na calculação de frequência')), 10000)
        )
      ]);
    } catch (error) {
      logger.error('Erro ao calcular frequência do bimestre:', error as Error);
      return { frequency: 100, absences: 0, totalDays: 0 }; // Retorna valores seguros em caso de erro
    }
  }

  /**
   * Implementação da calculação de dados de frequência
   */
  private static async doCalculateFrequencyData(
    estudanteId: string,
    currentBimester: string
  ): Promise<{ frequency: number; absences: number; totalDays: number }> {
      // Buscar dados do ano letivo
      const anoLetivoRef = doc(db, '2025', 'ano_letivo');
      const anoLetivoSnap = await getDoc(anoLetivoRef);

      if (!anoLetivoSnap.exists()) {
        logger.warn('Documento ano_letivo não encontrado');
        return { frequency: 100, absences: 0, totalDays: 0 };
      }

      const anoLetivoData = anoLetivoSnap.data();
      const bimesterData = anoLetivoData[currentBimester];

      if (!bimesterData?.dates) {
        logger.warn(`Dados do ${currentBimester} não encontrados`);
        return { frequency: 100, absences: 0, totalDays: 0 };
      }

      // Contar dias letivos do bimestre
      const diasLetivos = bimesterData.dates.filter((day: any) => day.isChecked).length;

      if (diasLetivos === 0) {
        return { frequency: 100, absences: 0, totalDays: 0 }; // Se não há dias letivos, considerar 100% de presença
      }

      // Buscar faltas do estudante (apenas não justificadas)
      const faltasRef = collection(db, '2025', 'faltas', 'controle');
      const faltasQuery = query(faltasRef, where('estudanteId', '==', estudanteId));
      const faltasSnap = await getDocs(faltasQuery);

      let faltasNaoJustificadas = 0;
      const diasLetivosDatas = bimesterData.dates
        .filter((day: any) => day.isChecked)
        .map((day: any) => day.date);

      faltasSnap.forEach((doc) => {
        const falta = doc.data();
        if (!falta.justified) { // Apenas faltas não justificadas
          // Converter data para formato dd/mm/yyyy se necessário
          let dataFalta = falta.data;
          if (dataFalta.includes('-')) {
            const [year, month, day] = dataFalta.split('-');
            dataFalta = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
          }

          // Verificar se a falta está no período do bimestre
          if (diasLetivosDatas.includes(dataFalta)) {
            faltasNaoJustificadas++;
          }
        }
      });

      const diasPresentes = diasLetivos - faltasNaoJustificadas;
      const percentual = (diasPresentes / diasLetivos) * 100;

      return {
        frequency: Math.max(0, Math.min(100, percentual)),
        absences: faltasNaoJustificadas,
        totalDays: diasLetivos
      };
  }


  /**
   * Gera tarefas para estudantes com frequência baixa no bimestre atual
   */
  static async generateTasksForUser(userId: string): Promise<TaskGenerationResult> {
    try {
      // Timeout geral para evitar carregamento infinito
      return await Promise.race([
        this.doGenerateTasksForUser(userId),
        new Promise<TaskGenerationResult>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout na geração de tarefas')), 30000)
        )
      ]);
    } catch (error) {
      logger.error('Erro ao gerar tarefas:', error as Error);
      return {
        newTasks: [],
        message: error instanceof Error && error.message.includes('Timeout')
          ? 'Timeout na geração de tarefas. Tente novamente.'
          : 'Erro ao gerar tarefas'
      };
    }
  }

  /**
   * Implementação otimizada da geração de tarefas
   */
  private static async doGenerateTasksForUser(userId: string): Promise<TaskGenerationResult> {
      const currentBimester = await this.getCurrentBimester();

      // 1. Buscar dados em paralelo para melhor performance
      const [estudantesSnap, anoLetivoSnap] = await Promise.all([
        getDoc(doc(db, '2025', 'lista_de_estudantes')),
        getDoc(doc(db, '2025', 'ano_letivo'))
      ]);

      if (!estudantesSnap.exists() || !anoLetivoSnap.exists()) {
        return { newTasks: [], message: 'Dados necessários não encontrados' };
      }

      const estudantesData = estudantesSnap.data() as { estudantes: Student[] };
      const estudantesAtivos = estudantesData.estudantes.filter(e => e.status === 'ATIVO');

      if (estudantesAtivos.length === 0) {
        return { newTasks: [], message: 'Nenhum estudante ativo encontrado' };
      }

      // 2. Buscar todas as faltas, controles e tasks pendentes em lote
      const estudanteIds = estudantesAtivos.map(e => e.estudanteId);
      const [faltasSnap, controlSnap, existingTasksSnap] = await Promise.all([
        this.getAllAbsences(estudanteIds),
        this.getAllTaskControls(userId, estudanteIds, currentBimester),
        this.getExistingPendingTasks(userId, estudanteIds, currentBimester)
      ]);

      // 3. Processar dados do ano letivo uma vez
      const anoLetivoData = anoLetivoSnap.data();
      const bimesterData = anoLetivoData[currentBimester];

      if (!bimesterData?.dates) {
        return { newTasks: [], message: `Dados do ${currentBimester} não encontrados` };
      }

      const diasLetivos = bimesterData.dates.filter((day: any) => day.isChecked).length;
      const diasLetivosDatas = bimesterData.dates
        .filter((day: any) => day.isChecked)
        .map((day: any) => day.date);

      if (diasLetivos === 0) {
        return { newTasks: [], message: 'Nenhum dia letivo configurado para este bimestre' };
      }

      // 4. Processar estudantes em lote
      const newTasks: UserTask[] = [];
      const batch = writeBatch(db);
      let studentsWithLowFrequency = 0;

      for (const estudante of estudantesAtivos) {
        // Verificar se já completou tarefa OU já tem task pendente (usando dados em cache)
        if (controlSnap.has(estudante.estudanteId) || existingTasksSnap.has(estudante.estudanteId)) {
          continue;
        }

        // Calcular frequência usando dados em cache
        const faltasEstudante = faltasSnap.get(estudante.estudanteId) || [];
        let faltasNaoJustificadas = 0;

        faltasEstudante.forEach((falta: any) => {
          if (!falta.justified) {
            let dataFalta = falta.data;
            if (dataFalta.includes('-')) {
              const [year, month, day] = dataFalta.split('-');
              dataFalta = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
            }
            if (diasLetivosDatas.includes(dataFalta)) {
              faltasNaoJustificadas++;
            }
          }
        });

        const diasPresentes = diasLetivos - faltasNaoJustificadas;
        const frequencyPercentage = (diasPresentes / diasLetivos) * 100;

        // Verificar se frequência é < 76% E dados estão completos
        if (frequencyPercentage < 76) {
          studentsWithLowFrequency++;

          // Só criar task se dados estão completos (turma e nome existem)
          if (estudante.turma && estudante.turma.trim() && estudante.nome && estudante.nome.trim()) {
            const tasksCollectionRef = collection(db, this.COLLECTION_TASKS);
            const taskId = doc(tasksCollectionRef).id;

            const taskData = {
              id: taskId,
              userId,
              estudanteId: estudante.estudanteId,
              studentName: estudante.nome,
              studentClass: estudante.turma,
              taskType: 'CONSELHO_TUTELAR' as const,
              bimestre: currentBimester,
              status: 'PENDING' as const,
              frequencyPercentage: Math.max(0, Math.min(100, frequencyPercentage)),
              absencesCount: faltasNaoJustificadas,
              isPCD: estudante.deficiencia?.estudanteComDeficiencia || false,
              priority: 'critical' as const,
              recommendedAction: 'Encaminhar ao Conselho Tutelar',
              createdAt: new Date().toISOString(),
              createdBy: 'Sistema'
            };

            // Add audit and soft delete fields
            const newTask: UserTask = {
              ...taskData,
              ...addCreationAudit({}, userId),
              ...initializeSoftDelete(),
            };

            const taskRef = doc(db, this.COLLECTION_TASKS, taskId);
            batch.set(taskRef, newTask);
            newTasks.push(newTask);
          }
        }
      }

      // 5. Executar batch
      if (newTasks.length > 0) {
        await batch.commit();
      }

      return {
        newTasks,
        message: newTasks.length > 0
          ? `${newTasks.length} estudante(s) com frequência ≤ 75% necessitam encaminhamento ao Conselho Tutelar`
          : studentsWithLowFrequency > 0
            ? `${studentsWithLowFrequency} estudante(s) com frequência baixa já foram processados anteriormente`
            : 'Nenhum estudante necessita encaminhamento no momento'
      };
  }

  /**
   * Busca todas as faltas de uma lista de estudantes em uma única query
   */
  private static async getAllAbsences(estudanteIds: string[]): Promise<Map<string, any[]>> {
    const faltasMap = new Map<string, any[]>();

    if (estudanteIds.length === 0) return faltasMap;

    // Firebase tem limite de 10 itens no 'in', então dividimos em chunks
    const chunks = [];
    for (let i = 0; i < estudanteIds.length; i += 10) {
      chunks.push(estudanteIds.slice(i, i + 10));
    }

    const faltasPromises = chunks.map(chunk => {
      const faltasRef = collection(db, '2025', 'faltas', 'controle');
      const faltasQuery = query(faltasRef, where('estudanteId', 'in', chunk));
      return getDocs(faltasQuery);
    });

    const faltasResults = await Promise.all(faltasPromises);

    faltasResults.forEach(querySnapshot => {
      querySnapshot.forEach(doc => {
        const falta = doc.data();
        const estudanteId = falta.estudanteId;
        if (!faltasMap.has(estudanteId)) {
          faltasMap.set(estudanteId, []);
        }
        faltasMap.get(estudanteId)!.push(falta);
      });
    });

    return faltasMap;
  }

  /**
   * Busca todos os controles de tarefa em uma única query
   */
  private static async getAllTaskControls(
    userId: string,
    estudanteIds: string[],
    bimestre: string
  ): Promise<Set<string>> {
    const completedSet = new Set<string>();

    if (estudanteIds.length === 0) return completedSet;

    const chunks = [];
    for (let i = 0; i < estudanteIds.length; i += 10) {
      chunks.push(estudanteIds.slice(i, i + 10));
    }

    const controlPromises = chunks.map(chunk => {
      const controlRef = collection(db, this.COLLECTION_TASK_CONTROL);
      const controlQuery = query(
        controlRef,
        where('userId', '==', userId),
        where('estudanteId', 'in', chunk),
        where('bimestre', '==', bimestre),
        where('taskType', '==', 'CONSELHO_TUTELAR'),
        where('hasCompletedTask', '==', true)
      );
      return getDocs(controlQuery);
    });

    const controlResults = await Promise.all(controlPromises);

    controlResults.forEach(querySnapshot => {
      querySnapshot.forEach(doc => {
        const control = doc.data();
        completedSet.add(control.estudanteId);
      });
    });

    return completedSet;
  }

  /**
   * Busca todas as tasks pendentes existentes para uma lista de estudantes
   */
  private static async getExistingPendingTasks(userId: string, estudanteIds: string[], bimestre: string): Promise<Map<string, boolean>> {
    const tasksMap = new Map<string, boolean>();

    if (estudanteIds.length === 0) return tasksMap;

    // Firebase tem limite de 10 itens no 'in', então dividimos em chunks
    const chunks = [];
    for (let i = 0; i < estudanteIds.length; i += 10) {
      chunks.push(estudanteIds.slice(i, i + 10));
    }

    const tasksPromises = chunks.map(chunk => {
      const tasksRef = collection(db, this.COLLECTION_TASKS);
      const tasksQuery = query(
        tasksRef,
        where('userId', '==', userId),
        where('estudanteId', 'in', chunk),
        where('bimestre', '==', bimestre),
        where('status', '==', 'PENDING')
      );
      return getDocs(tasksQuery);
    });

    const tasksResults = await Promise.all(tasksPromises);

    tasksResults.forEach(querySnapshot => {
      querySnapshot.forEach(doc => {
        const data = doc.data() as UserTask;
        tasksMap.set(data.estudanteId, true);
      });
    });

    return tasksMap;
  }

  /**
   * Busca tarefas pendentes de um usuário
   */
  static async getPendingTasks(userId: string): Promise<UserTask[]> {
    try {
      const tasksRef = collection(db, this.COLLECTION_TASKS);
      const tasksQuery = query(
        tasksRef,
        where('userId', '==', userId),
        where('status', '==', 'PENDING')
      );

      const tasksSnap = await getDocs(tasksQuery);
      const tasks: UserTask[] = [];

      tasksSnap.forEach((doc) => {
        tasks.push({ ...doc.data() } as UserTask);
      });

      return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      logger.error('Erro ao buscar tarefas pendentes:', error as Error);
      return [];
    }
  }

  /**
   * Marca uma tarefa como completada e registra o controle
   */
  static async completeTask(
    taskId: string,
    interactionId: string
  ): Promise<boolean> {
    try {
      const batch = writeBatch(db);

      // 1. Atualizar a tarefa
      const taskRef = doc(db, this.COLLECTION_TASKS, taskId);
      const taskSnap = await getDoc(taskRef);

      if (!taskSnap.exists()) {
        logger.error('Tarefa não encontrada', { taskId });
        return false;
      }

      const task = taskSnap.data() as UserTask;
      const completedAt = new Date().toISOString();

      // Add update audit fields
      const updateData = addUpdateAudit({
        status: 'COMPLETED',
        completedAt,
        interactionId
      }, task.userId);

      batch.update(taskRef, updateData);

      // 2. Criar registro de controle para evitar nova tarefa no mesmo bimestre
      const taskControlCollectionRef = collection(db, this.COLLECTION_TASK_CONTROL);
      const controlRef = doc(taskControlCollectionRef);
      const controlData: BimesterTaskControl = {
        userId: task.userId,
        estudanteId: task.estudanteId,
        bimestre: task.bimestre,
        taskType: task.taskType,
        hasCompletedTask: true,
        completedAt
      };

      // Add audit and soft delete fields to control record
      const controlDataWithAudit = {
        ...addCreationAudit(controlData, task.userId),
        ...initializeSoftDelete(),
      };

      batch.set(controlRef, controlDataWithAudit);

      // 3. Executar batch
      await batch.commit();
      return true;
    } catch (error) {
      logger.error('Erro ao completar tarefa:', error as Error);
      return false;
    }
  }

  /**
   * Busca uma tarefa específica por ID
   */
  static async getTaskById(taskId: string): Promise<UserTask | null> {
    try {
      const taskRef = doc(db, this.COLLECTION_TASKS, taskId);
      const taskSnap = await getDoc(taskRef);

      if (taskSnap.exists()) {
        return { ...taskSnap.data() } as UserTask;
      }

      return null;
    } catch (error) {
      logger.error('Erro ao buscar tarefa:', error as Error);
      return null;
    }
  }

  /**
   * Busca tarefas completadas de um usuário para bimestres específicos
   */
  static async getCompletedTasks(userId: string, bimestres: string[]): Promise<UserTask[]> {
    try {
      const tasksRef = collection(db, this.COLLECTION_TASKS);
      const tasksQuery = query(
        tasksRef,
        where('userId', '==', userId),
        where('status', '==', 'COMPLETED'),
        where('bimestre', 'in', bimestres.length > 0 ? bimestres : ['1º Bimestre']) // Fallback para evitar erro
      );

      const tasksSnap = await getDocs(tasksQuery);
      const tasks: UserTask[] = [];

      tasksSnap.forEach((doc) => {
        tasks.push({ ...doc.data() } as UserTask);
      });

      return tasks.sort((a, b) => new Date(b.completedAt || '').getTime() - new Date(a.completedAt || '').getTime());
    } catch (error) {
      logger.error('Erro ao buscar tarefas completadas:', error as Error);
      return [];
    }
  }

  /**
   * Remove todas as tarefas do sistema (para limpeza durante desenvolvimento)
   */
  static async clearAllTasks(): Promise<void> {
    try {
      const batch = writeBatch(db);

      // 1. Limpar todas as tarefas
      const tasksRef = collection(db, this.COLLECTION_TASKS);
      const tasksSnapshot = await getDocs(tasksRef);

      tasksSnapshot.forEach((taskDoc) => {
        batch.delete(taskDoc.ref);
      });

      // 2. Limpar todos os controles de tarefas
      const controlRef = collection(db, this.COLLECTION_TASK_CONTROL);
      const controlSnapshot = await getDocs(controlRef);

      controlSnapshot.forEach((controlDoc) => {
        batch.delete(controlDoc.ref);
      });

      // 3. Executar batch
      await batch.commit();

      logger.info(`Removidas ${tasksSnapshot.size} tarefas e ${controlSnapshot.size} controles`);
    } catch (error) {
      logger.error('Erro ao limpar tarefas:', error as Error);
      throw error;
    }
  }
}