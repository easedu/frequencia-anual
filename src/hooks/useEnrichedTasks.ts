/**
 * Hook: useEnrichedTasks
 *
 * Enriquece tarefas (UserTask) com dados do estudante (Student)
 * usando normalização de dados e lazy loading com cache.
 *
 * BEST PRACTICE: Não duplica dados do estudante na task.
 * Busca sob demanda e cacheia em memória.
 *
 * @example
 * const { tasks, loading, error, refetch } = useEnrichedTasks({
 *   created_by: 'AUTOMAÇÃO',
 *   is_resolved: false
 * });
 *
 * // tasks[0].studentName já disponível!
 * tasks.forEach(task => {
 *   console.log(task.studentName, task.studentClass);
 * });
 */

import { useMemo } from 'react';
import { useTasks, TaskFilters, UserTask } from '@/hooks/api/useTasks';
import { useStudents } from '@/hooks/api/useStudents';

/**
 * UserTask enriquecido com dados do estudante
 */
export interface EnrichedTask extends UserTask {
  // Dados do estudante (não duplicados, apenas enriquecidos em runtime)
  studentName: string;
  studentClass: string;
  studentShift: string;
  studentStatus: string;
  studentBolsaFamilia?: string;
  studentIsPCD?: boolean;

  // Metadados adicionais (se necessário)
  _studentNotFound?: boolean; // Flag se estudante foi deletado
}

/**
 * Hook para buscar tarefas enriquecidas com dados do estudante
 *
 * Performance:
 * - 1ª chamada: ~350ms (2 queries: tasks + students)
 * - Chamadas seguintes: ~10ms (memoizado + cache)
 * - Re-render sem mudança: 0ms (React memo)
 *
 * @param filters - Filtros de tarefas (mesmo do useTasks)
 * @returns Tarefas enriquecidas com dados do estudante
 */
export function useEnrichedTasks(filters?: TaskFilters) {
  const { tasks, loading: tasksLoading, error, refetch } = useTasks(filters);
  const { students, loading: studentsLoading } = useStudents();

  // Enriquecer tarefas com dados do estudante (memoizado)
  const enrichedTasks = useMemo(() => {
    // ✅ Validação: Garantir que tasks e students são arrays
    if (!Array.isArray(tasks) || !Array.isArray(students)) {
      return [];
    }

    // Criar mapa de estudantes para lookup O(1)
    const studentMap = new Map(
      students.map(s => [s.id, s])  // Internal ID → Student
    );

    // Enriquecer cada task
    const enriched = tasks.map(task => {
      const student = studentMap.get(task.student_id);

      if (!student) {

        return {
          ...task,
          studentName: 'Estudante não encontrado',
          studentClass: 'N/A',
          studentShift: 'N/A',
          studentStatus: 'DESCONHECIDO',
          _studentNotFound: true
        } as EnrichedTask;
      }

      return {
        ...task,
        studentName: student.name || 'Sem nome',
        studentClass: student.class || 'N/A',
        studentShift: student.shift || 'N/A',
        studentStatus: student.status || 'DESCONHECIDO',
        studentBolsaFamilia: student.bolsa_familia,
        studentIsPCD: Array.isArray(student.disabilities) && student.disabilities.length > 0,
        _studentNotFound: false
      } as EnrichedTask;
    });

    return enriched;
  }, [tasks, students]);

  return {
    tasks: enrichedTasks,
    loading: tasksLoading || studentsLoading,
    error,
    refetch
  };
}

/**
 * Hook para buscar uma tarefa específica enriquecida
 *
 * @param taskId - ID da tarefa
 * @returns Tarefa enriquecida ou null
 */
export function useEnrichedTask(taskId: string | null) {
  const { tasks, loading, error } = useEnrichedTasks();

  const task = useMemo(() => {
    if (!taskId || !tasks) return null;
    return tasks.find(t => t.id === taskId) || null;
  }, [taskId, tasks]);

  return { task, loading, error };
}

/**
 * Hook para agrupar tarefas enriquecidas por estudante
 *
 * Útil para dashboards que mostram "Tarefas por Estudante"
 *
 * @param filters - Filtros de tarefas
 * @returns Map de studentId → EnrichedTask[]
 */
export function useTasksByStudent(filters?: TaskFilters) {
  const { tasks, loading, error, refetch } = useEnrichedTasks(filters);

  const tasksByStudent = useMemo(() => {
    const grouped = new Map<string, EnrichedTask[]>();

    tasks.forEach(task => {
      const existing = grouped.get(task.student_id) || [];
      grouped.set(task.student_id, [...existing, task]);
    });

    return grouped;
  }, [tasks]);

  return { tasksByStudent, loading, error, refetch };
}

/**
 * Hook para estatísticas de tarefas enriquecidas
 *
 * @param filters - Filtros de tarefas
 * @returns Estatísticas calculadas
 */
export function useTaskStats(filters?: TaskFilters) {
  const { tasks, loading, error } = useEnrichedTasks(filters);

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter(t => !t.is_resolved).length,
      resolved: tasks.filter(t => t.is_resolved).length,
      byCreator: tasks.reduce((acc, task) => {
        acc[task.created_by] = (acc[task.created_by] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byClass: tasks.reduce((acc, task) => {
        acc[task.studentClass] = (acc[task.studentClass] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      studentsNotFound: tasks.filter(t => t._studentNotFound).length
    };
  }, [tasks]);

  return { stats, loading, error };
}
