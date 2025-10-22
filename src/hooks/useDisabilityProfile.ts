/**
 * useDisabilityProfile Hook
 *
 * Hook centralizado para gerenciar toda a lógica do dashboard de deficiência.
 * Consolida 23 estados, 5 useEffects, 7 useMemos e handlers de ocorrências.
 *
 * Extrai ~800-900 linhas do componente perfil-deficiente/page.tsx
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { logger } from "@/utils/logger";
import { Estudante } from "@/types";
import { toast } from "sonner";
import { getAuth } from "firebase/auth";
import { formatDateInput, parseDateToFirebase, formatFirebaseDate } from "../app/utils";
import { UserProfilesService } from "@/services/supabase/userProfilesService";
import { StudentOccurrencesService } from "@/services/supabase/studentOccurrencesService";

// ════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════

export interface Ocorrencia {
  id: string;
  date: string;
  description: string;
  createdBy: string;
  sensitive: boolean;
}

export interface ChartData {
  name: string;
  value: number;
}

export interface TurmaData {
  turma: string;
  semDeficiencia: number;
  comDeficienciaSemBarreiras: number;
  comDeficienciaComBarreiras: number;
}

export interface UseDisabilityProfileProps {
  students: Estudante[];
}

// ════════════════════════════════════════════════════════════════
// UTILITÁRIOS
// ════════════════════════════════════════════════════════════════

const processChartData = (
  students: Estudante[],
  key: keyof Exclude<Estudante["deficiencia"], undefined | null> | ((s: Estudante) => string[])
): ChartData[] => {
  const counts: { [key: string]: number } = {};
  students.forEach((student) => {
    if (student.deficiencia?.estudanteComDeficiencia) {
      if (typeof key === "function") {
        const values = key(student);
        values.forEach((value) => {
          counts[value] = (counts[value] || 0) + 1;
        });
      } else {
        const value = student.deficiencia[key] as string | string[];
        if (Array.isArray(value)) {
          value.forEach((v) => {
            counts[v] = (counts[v] || 0) + 1;
          });
        } else if (value) {
          counts[value] = (counts[value] || 0) + 1;
        }
      }
    }
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
};

// ════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ════════════════════════════════════════════════════════════════

export function useDisabilityProfile({ students }: UseDisabilityProfileProps) {
  const auth = getAuth();

  // ─────────────────────────────────────────────────────────────
  // ESTADOS DE FILTROS (11 estados)
  // ─────────────────────────────────────────────────────────────
  const [filtroTipoDeficiencia, setFiltroTipoDeficiencia] = useState<string>("TODOS");
  const [filtroInstituicao, setFiltroInstituicao] = useState<string>("TODOS");
  const [filtroAee, setFiltroAee] = useState<string>("TODOS");
  const [filtroHorario, setFiltroHorario] = useState<string>("TODOS");
  const [filtroEstagiario, setFiltroEstagiario] = useState<string>("TODOS");
  const [filtroAve, setFiltroAve] = useState<string>("TODOS");
  const [filtroTurno, setFiltroTurno] = useState<string>("TODOS");
  const [filtroTurma, setFiltroTurma] = useState<string | null>(null);
  const [filtroTabelaEstagiario, setFiltroTabelaEstagiario] = useState<string>("");
  const [filtroTabelaAve, setFiltroTabelaAve] = useState<string>("");
  const [filtroTabelaEstudantes, setFiltroTabelaEstudantes] = useState<string>("");
  const [filtroTabelaOcorrencias, setFiltroTabelaOcorrencias] = useState<string>("");

  // Debounced values para otimizar performance
  const debouncedFiltroEstagiario = useDebounce(filtroTabelaEstagiario, 500);
  const debouncedFiltroAve = useDebounce(filtroTabelaAve, 500);
  const debouncedFiltroEstudantes = useDebounce(filtroTabelaEstudantes, 500);
  const debouncedFiltroOcorrencias = useDebounce(filtroTabelaOcorrencias, 500);

  // ─────────────────────────────────────────────────────────────
  // ESTADOS DE ORDENAÇÃO (2 estados)
  // ─────────────────────────────────────────────────────────────
  const [sortEstagiario, setSortEstagiario] = useState<"asc" | "desc" | null>(null);
  const [sortAve, setSortAve] = useState<"asc" | "desc" | null>(null);

  // ─────────────────────────────────────────────────────────────
  // ESTADOS DE OCORRÊNCIAS (8 estados)
  // ─────────────────────────────────────────────────────────────
  const [selectedStudent, setSelectedStudent] = useState<Estudante | null>(null);
  const [occurrenceDate, setOccurrenceDate] = useState<string>(
    new Date().toLocaleDateString("pt-BR")
  );
  const [occurrenceDescription, setOccurrenceDescription] = useState<string>("");
  const [occurrenceSensitive, setOccurrenceSensitive] = useState<boolean>(false);
  const [editingOccurrence, setEditingOccurrence] = useState<Ocorrencia | null>(null);
  const [occurrences, setOccurrences] = useState<Ocorrencia[]>([]);
  const [showDeleteOccurrenceDialog, setShowDeleteOccurrenceDialog] = useState<string | null>(null);
  const [isOccurrenceSectionVisible, setIsOccurrenceSectionVisible] = useState<boolean>(false);

  // ─────────────────────────────────────────────────────────────
  // ESTADOS DE AUTENTICAÇÃO/PERMISSÕES (1 estado)
  // ─────────────────────────────────────────────────────────────
  const [userRole, setUserRole] = useState<string | null>(null);

  // ═════════════════════════════════════════════════════════════
  // USEEFFECTS (5 effects)
  // ═════════════════════════════════════════════════════════════

  // 1. Verificar se há ID de estudante na URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const studentId = urlParams.get("studentId");

      if (studentId && students.length > 0) {
        const foundStudent = students.find((s) => s.estudanteId === studentId);
        if (foundStudent) {
          setSelectedStudent(foundStudent);
          setIsOccurrenceSectionVisible(true);

          setTimeout(() => {
            document.getElementById("occurrence-section")?.scrollIntoView({ behavior: "smooth" });
          }, 500);
        }
      }
    }
  }, [students]);

  // 2. Buscar perfil do usuário (role)
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const user = auth.currentUser;
        if (!user || !user.uid) {
          setUserRole("user");
          return;
        }

        const userProfile = await UserProfilesService.getByFirebaseUid(user.uid);

        if (userProfile) {
          setUserRole(userProfile.role?.toLowerCase() || "user");
        } else {
          setUserRole("user");
        }
      } catch (error) {
        logger.error("Erro ao carregar perfil do usuário", error as Error);
        setUserRole("user");
      }
    };

    fetchUserRole();
  }, [auth]);

  // 3. Resetar formulário quando mudar estudante selecionado
  useEffect(() => {
    if (!selectedStudent) {
      setOccurrenceDate(new Date().toLocaleDateString("pt-BR"));
      setOccurrenceDescription("");
      setOccurrenceSensitive(false);
      setEditingOccurrence(null);
      setOccurrences([]);
      setIsOccurrenceSectionVisible(false);
    } else {
      fetchOccurrencesForStudent(selectedStudent.estudanteId);
      setIsOccurrenceSectionVisible(true);
    }
  }, [selectedStudent]);

  // 4. Sincronizar campos do formulário com ocorrência sendo editada
  useEffect(() => {
    if (editingOccurrence) {
      setOccurrenceDate(editingOccurrence.date);
      setOccurrenceDescription(editingOccurrence.description);
      setOccurrenceSensitive(editingOccurrence.sensitive || false);
    } else {
      setOccurrenceDate(new Date().toLocaleDateString("pt-BR"));
      setOccurrenceDescription("");
      setOccurrenceSensitive(false);
    }
  }, [editingOccurrence]);

  // ═════════════════════════════════════════════════════════════
  // HANDLERS DE OCORRÊNCIAS
  // ═════════════════════════════════════════════════════════════

  // Buscar ocorrências para o estudante selecionado
  const fetchOccurrencesForStudent = async (studentId: string) => {
    try {
      const supabaseOccurrences = await StudentOccurrencesService.getByStudentId(studentId);

      const occurrencesData: Ocorrencia[] = supabaseOccurrences
        .map((occurrence) => ({
          id: occurrence.id,
          date: formatFirebaseDate(occurrence.occurrenceDate),
          description: occurrence.description,
          createdBy: occurrence.createdBy || "Não informado",
          sensitive: occurrence.severity === "GRAVE",
        }))
        .sort(
          (a, b) =>
            (parseDateToFirebase(b.date)?.localeCompare(parseDateToFirebase(a.date) || "") || 0)
        );

      setOccurrences(occurrencesData);
    } catch (error) {
      logger.error("Erro ao buscar ocorrências", error as Error);
      toast.error("Erro ao carregar ocorrências");
    }
  };

  // Adicionar nova ocorrência
  const handleAddOccurrence = useCallback(async () => {
    if (!selectedStudent || !occurrenceDate || !occurrenceDescription) {
      toast.error("Selecione um aluno e preencha todos os campos");
      return;
    }

    const formattedDate = parseDateToFirebase(occurrenceDate);
    if (!formattedDate) {
      toast.error("Data inválida. Use o formato DD/MM/YYYY");
      return;
    }

    try {
      const currentUser =
        auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido";

      await StudentOccurrencesService.create({
        studentId: selectedStudent.estudanteId,
        occurrenceDate: formattedDate,
        occurrenceType: "COMPORTAMENTAL",
        description: occurrenceDescription,
        severity: occurrenceSensitive ? "GRAVE" : "MODERADA",
        createdBy: currentUser,
      });

      setOccurrenceDate(new Date().toLocaleDateString("pt-BR"));
      setOccurrenceDescription("");
      setOccurrenceSensitive(false);

      await fetchOccurrencesForStudent(selectedStudent.estudanteId);
      toast.success("Ocorrência registrada com sucesso!");

      document.getElementById("occurrence-card")?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      logger.error("Erro ao adicionar ocorrência", error as Error);
      toast.error("Erro ao cadastrar ocorrência");
    }
  }, [selectedStudent, occurrenceDate, occurrenceDescription, occurrenceSensitive, auth]);

  // Editar ocorrência existente
  const handleEditOccurrence = useCallback(async () => {
    if (!selectedStudent || !editingOccurrence || !occurrenceDate || !occurrenceDescription) {
      toast.error("Preencha todos os campos para editar a ocorrência");
      return;
    }

    const formattedDate = parseDateToFirebase(occurrenceDate);
    if (!formattedDate) {
      toast.error("Data inválida. Use o formato DD/MM/YYYY");
      return;
    }

    try {
      await StudentOccurrencesService.update(editingOccurrence.id, {
        occurrenceDate: formattedDate,
        description: occurrenceDescription,
        severity: occurrenceSensitive ? "GRAVE" : "MODERADA",
      });

      setEditingOccurrence(null);
      setOccurrenceDate(new Date().toLocaleDateString("pt-BR"));
      setOccurrenceDescription("");
      setOccurrenceSensitive(false);

      await fetchOccurrencesForStudent(selectedStudent.estudanteId);
      toast.success("Ocorrência atualizada com sucesso!");
    } catch (error) {
      logger.error("Erro ao atualizar ocorrência", error as Error);
      toast.error("Erro ao atualizar ocorrência");
    }
  }, [selectedStudent, editingOccurrence, occurrenceDate, occurrenceDescription, occurrenceSensitive]);

  // Excluir ocorrência
  const handleDeleteOccurrence = useCallback(
    async (occurrenceId: string) => {
      if (!selectedStudent) return;

      try {
        await StudentOccurrencesService.delete(occurrenceId);
        await fetchOccurrencesForStudent(selectedStudent.estudanteId);
        toast.success("Ocorrência excluída com sucesso!");
      } catch (error) {
        logger.error("Erro ao excluir ocorrência", error as Error);
        toast.error("Erro ao excluir ocorrência");
      } finally {
        setShowDeleteOccurrenceDialog(null);
      }
    },
    [selectedStudent]
  );

  // Selecionar estudante para registro de ocorrências
  const handleSelectStudentForOccurrence = useCallback(
    (student: Estudante) => {
      if (selectedStudent?.estudanteId === student.estudanteId) {
        setSelectedStudent(null);
        setIsOccurrenceSectionVisible(false);
      } else {
        setSelectedStudent(student);
        setIsOccurrenceSectionVisible(true);

        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.set("studentId", student.estudanteId);
          window.history.pushState({}, "", url.toString());
        }

        setTimeout(() => {
          document.getElementById("occurrence-section")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    },
    [selectedStudent]
  );

  // Tratar mudança no checkbox de sensibilidade
  const handleSensitiveChange = useCallback((checked: boolean | string) => {
    const isChecked = typeof checked === "boolean" ? checked : checked === "true";
    setOccurrenceSensitive(isChecked);
  }, []);

  // Clicar em uma turma para filtrar
  const handleTurmaClick = useCallback(
    (turma: string) => {
      setFiltroTurma(filtroTurma === turma ? null : turma);
    },
    [filtroTurma]
  );

  // Iniciar edição de ocorrência
  const handleStartEditOccurrence = useCallback((occurrence: Ocorrencia) => {
    setEditingOccurrence(occurrence);
  }, []);

  // Cancelar edição de ocorrência
  const handleCancelEditOccurrence = useCallback(() => {
    setEditingOccurrence(null);
    setOccurrenceDate(new Date().toLocaleDateString("pt-BR"));
    setOccurrenceDescription("");
    setOccurrenceSensitive(false);
  }, []);

  // ═════════════════════════════════════════════════════════════
  // USEMEMOS - CÁLCULOS E FILTRAGENS (7 memos)
  // ═════════════════════════════════════════════════════════════

  // 1. Filtrar estudantes com deficiência
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const def = student.deficiencia;

      if (student.status !== "ATIVO") return false;

      const valoresPadraoEstagiario = ["NÃO NECESSITA", "NENHUM", ""];
      const valoresPadraoInstituicao = ["NENHUM", ""];
      const valoresPadraoHorario = ["NENHUM", ""];

      const temTipoDeficiencia =
        def?.tipoDeficiencia &&
        Array.isArray(def.tipoDeficiencia) &&
        def.tipoDeficiencia.length > 0 &&
        def.tipoDeficiencia.some((t) => t && t.trim() !== "");

      const temAee = def?.aee && def.aee.trim() !== "";

      const temInstituicao =
        def?.instituicao &&
        def.instituicao.trim() !== "" &&
        !valoresPadraoInstituicao.includes(def.instituicao);

      const temHorarioAtendimento =
        def?.horarioAtendimento &&
        def.horarioAtendimento.trim() !== "" &&
        !valoresPadraoHorario.includes(def.horarioAtendimento);

      const temNomeEstagiario =
        def?.nomeEstagiario &&
        def.nomeEstagiario.trim() !== "" &&
        !valoresPadraoEstagiario.includes(def.nomeEstagiario.trim());

      const temNomeAve =
        def?.nomeAve && def.nomeAve.trim() !== "" && def.nomeAve !== "NENHUM";

      const temJustificativaAve =
        def?.justificativaAve &&
        Array.isArray(def.justificativaAve) &&
        def.justificativaAve.length > 0 &&
        def.justificativaAve.some((j) => j && j.trim() !== "" && j !== "NENHUM");

      const temDadosReaisDeficiencia =
        temTipoDeficiencia ||
        temAee ||
        temInstituicao ||
        temHorarioAtendimento ||
        temNomeEstagiario ||
        temNomeAve ||
        temJustificativaAve;

      const temDeficiencia = def?.estudanteComDeficiencia || temDadosReaisDeficiencia;

      if (!temDeficiencia) return false;

      return (
        (filtroTipoDeficiencia === "TODOS" ||
          def.tipoDeficiencia?.includes(filtroTipoDeficiencia)) &&
        (filtroInstituicao === "TODOS" || def.instituicao === filtroInstituicao) &&
        (filtroAee === "TODOS" || def.aee === filtroAee) &&
        (filtroHorario === "TODOS" || def.horarioAtendimento === filtroHorario) &&
        (filtroEstagiario === "TODOS" ||
          (filtroEstagiario === "true" && def.possuiEstagiario) ||
          (filtroEstagiario === "false" && !def.possuiEstagiario)) &&
        (filtroAve === "TODOS" ||
          (filtroAve === "true" && def.ave) ||
          (filtroAve === "false" && !def.ave)) &&
        (filtroTurno === "TODOS" || student.turno === filtroTurno) &&
        (filtroTurma === null || student.turma === filtroTurma)
      );
    });
  }, [
    students,
    filtroTipoDeficiencia,
    filtroInstituicao,
    filtroAee,
    filtroHorario,
    filtroEstagiario,
    filtroAve,
    filtroTurno,
    filtroTurma,
  ]);

  // 2. Filtrar estagiários para tabela
  const filteredEstagiarios = useMemo(() => {
    let result = filteredStudents.filter((s) => s.deficiencia?.possuiEstagiario);
    if (debouncedFiltroEstagiario) {
      const lowerFilter = debouncedFiltroEstagiario.toLowerCase();
      result = result.filter((student) => {
        const def = student.deficiencia;
        return (
          student.turma?.toLowerCase().includes(lowerFilter) ||
          student.nome.toLowerCase().includes(lowerFilter) ||
          def?.nomeEstagiario?.toLowerCase().includes(lowerFilter) ||
          def?.justificativaEstagiario?.toLowerCase().includes(lowerFilter)
        );
      });
    }
    if (!sortEstagiario) return result;
    return [...result].sort((a, b) => {
      const nomeA = a.deficiencia?.nomeEstagiario?.toLowerCase() || "";
      const nomeB = b.deficiencia?.nomeEstagiario?.toLowerCase() || "";
      return sortEstagiario === "asc" ? nomeA.localeCompare(nomeB) : nomeB.localeCompare(nomeA);
    });
  }, [filteredStudents, debouncedFiltroEstagiario, sortEstagiario]);

  // 3. Filtrar AVEs para tabela
  const filteredAves = useMemo(() => {
    let result = filteredStudents.filter((s) => s.deficiencia?.ave);
    if (debouncedFiltroAve) {
      const lowerFilter = debouncedFiltroAve.toLowerCase();
      result = result.filter((student) => {
        const def = student.deficiencia;
        return (
          student.turma?.toLowerCase().includes(lowerFilter) ||
          student.nome.toLowerCase().includes(lowerFilter) ||
          def?.nomeAve?.toLowerCase().includes(lowerFilter) ||
          def?.justificativaAve?.some((j) => j.toLowerCase().includes(lowerFilter))
        );
      });
    }
    if (!sortAve) return result;
    return [...result].sort((a, b) => {
      const nomeA = a.deficiencia?.nomeAve?.toLowerCase() || "";
      const nomeB = b.deficiencia?.nomeAve?.toLowerCase() || "";
      return sortAve === "asc" ? nomeA.localeCompare(nomeB) : nomeB.localeCompare(nomeA);
    });
  }, [filteredStudents, debouncedFiltroAve, sortAve]);

  // 4. Filtrar estudantes para tabela de detalhes
  const filteredEstudantesDetalhes = useMemo(() => {
    let result = filteredStudents;
    if (debouncedFiltroEstudantes) {
      const lowerFilter = debouncedFiltroEstudantes.toLowerCase();
      result = result.filter((student) => {
        const def = student.deficiencia;
        return (
          student.turma?.toLowerCase().includes(lowerFilter) ||
          student.nome.toLowerCase().includes(lowerFilter) ||
          (Array.isArray(def?.tipoDeficiencia)
            ? def.tipoDeficiencia.some((t: string) => t.toLowerCase().includes(lowerFilter))
            : def?.tipoDeficiencia?.toLowerCase().includes(lowerFilter)) ||
          def?.aee?.toLowerCase().includes(lowerFilter) ||
          def?.instituicao?.toLowerCase().includes(lowerFilter) ||
          def?.horarioAtendimento?.toLowerCase().includes(lowerFilter) ||
          (def?.possuiEstagiario ? "sim" : "não").includes(lowerFilter) ||
          def?.nomeEstagiario?.toLowerCase().includes(lowerFilter) ||
          def?.justificativaEstagiario?.toLowerCase().includes(lowerFilter) ||
          (def?.ave ? "sim" : "não").includes(lowerFilter) ||
          def?.nomeAve?.toLowerCase().includes(lowerFilter) ||
          def?.justificativaAve?.some((j) => j.toLowerCase().includes(lowerFilter)) ||
          (def?.possuiBarreiras ? "sim" : "não").includes(lowerFilter)
        );
      });
    }
    return result;
  }, [filteredStudents, debouncedFiltroEstudantes]);

  // 5. Filtrar ocorrências para tabela
  const filteredOccurrences = useMemo(() => {
    if (!debouncedFiltroOcorrencias) return occurrences;

    const lowerFilter = debouncedFiltroOcorrencias.toLowerCase();
    return occurrences.filter(
      (occurrence) =>
        occurrence.date.toLowerCase().includes(lowerFilter) ||
        occurrence.description.toLowerCase().includes(lowerFilter) ||
        occurrence.createdBy.toLowerCase().includes(lowerFilter)
    );
  }, [occurrences, debouncedFiltroOcorrencias]);

  // 6. Processar dados por turma
  const turmasData = useMemo(() => {
    const turmasMap: { [key: string]: TurmaData } = {};
    students.forEach((student) => {
      const turma = student.turma || "Sem Turma";
      if (!turmasMap[turma]) {
        turmasMap[turma] = {
          turma,
          semDeficiencia: 0,
          comDeficienciaSemBarreiras: 0,
          comDeficienciaComBarreiras: 0,
        };
      }
      if (student.deficiencia?.estudanteComDeficiencia) {
        if (student.deficiencia?.possuiBarreiras) {
          turmasMap[turma].comDeficienciaComBarreiras += 1;
        } else {
          turmasMap[turma].comDeficienciaSemBarreiras += 1;
        }
      } else {
        turmasMap[turma].semDeficiencia += 1;
      }
    });
    return Object.values(turmasMap).sort((a, b) => a.turma.localeCompare(b.turma));
  }, [students]);

  // 7. Processar dados dos gráficos
  const chartData = useMemo(
    () => ({
      tiposDeficiencia: processChartData(filteredStudents, "tipoDeficiencia"),
      aee: processChartData(filteredStudents, "aee"),
      instituicao: processChartData(filteredStudents, "instituicao"),
      horario: processChartData(filteredStudents, "horarioAtendimento"),
      estagiario: processChartData(filteredStudents, "justificativaEstagiario"),
      ave: processChartData(filteredStudents, "justificativaAve"),
    }),
    [filteredStudents]
  );

  // ═════════════════════════════════════════════════════════════
  // ESTATÍSTICAS (Computed Values)
  // ═════════════════════════════════════════════════════════════

  const stats = useMemo(() => {
    const totalComDeficienciaOficial = students.filter(
      (s) => s.status === "ATIVO" && s.deficiencia?.estudanteComDeficiencia
    ).length;

    const totalComDeficiencia = filteredStudents.length;
    const totalNaoMarcadosOficialmente = totalComDeficiencia - totalComDeficienciaOficial;

    const totalEstudantes = students.filter((s) => s.status === "ATIVO").length;
    const totalComBarreiras = filteredStudents.filter(
      (s) => s.deficiencia?.possuiBarreiras
    ).length;
    const totalSemBarreiras = totalComDeficiencia - totalComBarreiras;
    const totalComEstagiario = filteredStudents.filter(
      (s) => s.deficiencia?.possuiEstagiario
    ).length;
    const totalSemEstagiario = totalComDeficiencia - totalComEstagiario;
    const totalComAve = filteredStudents.filter((s) => s.deficiencia?.ave).length;
    const totalSemAve = totalComDeficiencia - totalComAve;

    return {
      totalComDeficienciaOficial,
      totalComDeficiencia,
      totalNaoMarcadosOficialmente,
      totalEstudantes,
      totalComBarreiras,
      totalSemBarreiras,
      totalComEstagiario,
      totalSemEstagiario,
      totalComAve,
      totalSemAve,
    };
  }, [students, filteredStudents]);

  // ═════════════════════════════════════════════════════════════
  // RETORNO DO HOOK
  // ═════════════════════════════════════════════════════════════

  return {
    // Estados de filtros
    filtroTipoDeficiencia,
    setFiltroTipoDeficiencia,
    filtroInstituicao,
    setFiltroInstituicao,
    filtroAee,
    setFiltroAee,
    filtroHorario,
    setFiltroHorario,
    filtroEstagiario,
    setFiltroEstagiario,
    filtroAve,
    setFiltroAve,
    filtroTurno,
    setFiltroTurno,
    filtroTurma,
    setFiltroTurma,
    filtroTabelaEstagiario,
    setFiltroTabelaEstagiario,
    filtroTabelaAve,
    setFiltroTabelaAve,
    filtroTabelaEstudantes,
    setFiltroTabelaEstudantes,
    filtroTabelaOcorrencias,
    setFiltroTabelaOcorrencias,

    // Estados de ordenação
    sortEstagiario,
    setSortEstagiario,
    sortAve,
    setSortAve,

    // Estados de ocorrências
    selectedStudent,
    setSelectedStudent,
    occurrenceDate,
    setOccurrenceDate,
    occurrenceDescription,
    setOccurrenceDescription,
    occurrenceSensitive,
    setOccurrenceSensitive,
    editingOccurrence,
    setEditingOccurrence,
    occurrences,
    showDeleteOccurrenceDialog,
    setShowDeleteOccurrenceDialog,
    isOccurrenceSectionVisible,
    setIsOccurrenceSectionVisible,

    // Estado de autenticação
    userRole,

    // Computed values (filtrados e agregados)
    filteredStudents,
    filteredEstagiarios,
    filteredAves,
    filteredEstudantesDetalhes,
    filteredOccurrences,
    turmasData,
    chartData,
    stats,

    // Handlers
    handleAddOccurrence,
    handleEditOccurrence,
    handleDeleteOccurrence,
    handleSelectStudentForOccurrence,
    handleSensitiveChange,
    handleTurmaClick,
    handleStartEditOccurrence,
    handleCancelEditOccurrence,
  };
}
