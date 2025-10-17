"use client";

import { useStudents } from "@/hooks/useStudents";
import { useDisabilityProfile } from "@/hooks/useDisabilityProfile";
import { Toaster } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DisabilityFilters,
  DisabilityStats,
  DisabilityCharts,
  DisabilityTables,
  OccurrenceManager,
} from "@/components/disability";

export default function DashboardDeficiencia() {
  // ═══════════════════════════════════════════════════════════════
  // HOOKS BÁSICOS
  // ═══════════════════════════════════════════════════════════════

  const { students, loading, error } = useStudents();

  // ═══════════════════════════════════════════════════════════════
  // HOOK CENTRALIZADO (TODA LÓGICA)
  // ═══════════════════════════════════════════════════════════════

  const {
    // Filtros
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

    // Ordenação
    sortEstagiario,
    setSortEstagiario,
    sortAve,
    setSortAve,

    // Ocorrências
    selectedStudent,
    occurrenceDate,
    setOccurrenceDate,
    occurrenceDescription,
    setOccurrenceDescription,
    occurrenceSensitive,
    editingOccurrence,
    occurrences,
    showDeleteOccurrenceDialog,
    setShowDeleteOccurrenceDialog,
    isOccurrenceSectionVisible,
    userRole,

    // Computed
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
  } = useDisabilityProfile({ students });

  // ═══════════════════════════════════════════════════════════════
  // LOADING/ERROR STATES
  // ═══════════════════════════════════════════════════════════════

  if (loading) return <div className="p-6">Carregando estudantes...</div>;
  if (error) return <div className="p-6">Erro: {error.message}</div>;

  // Debug simplificado
  console.log("📊 perfil-deficiente:", {
    totalStudents: students.length,
    comDeficiencia: filteredStudents.length,
    problema: filteredStudents.length === 0 ? "❌ NENHUM estudante tem dados de deficiência cadastrados no Supabase" : "✅ OK"
  });

  // ═══════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO LIMPA (COMPOSIÇÃO)
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="p-6">
      <Toaster />

      <h1 className="text-2xl font-bold mb-4">Dashboard de Estudantes com Deficiência</h1>

      {/* Mensagem de Empty State */}
      {students.length === 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Nenhum estudante cadastrado no sistema.
            </p>
          </CardContent>
        </Card>
      )}

      {students.length > 0 && filteredStudents.length === 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Nenhum estudante com deficiência encontrado. Verifique os filtros aplicados ou cadastre
              estudantes com dados de deficiência preenchidos.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas Principais */}
      <DisabilityStats
        totalComDeficienciaOficial={stats.totalComDeficienciaOficial}
        totalComDeficiencia={stats.totalComDeficiencia}
        totalNaoMarcadosOficialmente={stats.totalNaoMarcadosOficialmente}
        totalComBarreiras={stats.totalComBarreiras}
        totalComEstagiario={stats.totalComEstagiario}
        totalComAve={stats.totalComAve}
      />

      {/* Filtros */}
      <DisabilityFilters
        filtroTipoDeficiencia={filtroTipoDeficiencia}
        onFiltroTipoDeficienciaChange={setFiltroTipoDeficiencia}
        tiposDeficienciaData={chartData.tiposDeficiencia}
        filtroInstituicao={filtroInstituicao}
        onFiltroInstituicaoChange={setFiltroInstituicao}
        filtroAee={filtroAee}
        onFiltroAeeChange={setFiltroAee}
        filtroHorario={filtroHorario}
        onFiltroHorarioChange={setFiltroHorario}
        filtroEstagiario={filtroEstagiario}
        onFiltroEstagiarioChange={setFiltroEstagiario}
        filtroAve={filtroAve}
        onFiltroAveChange={setFiltroAve}
      />

      {/* Cards de Big Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Com Deficiência</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalComDeficiencia}</p>
            <p className="text-sm text-muted-foreground">
              {stats.totalEstudantes > 0
                ? ((stats.totalComDeficiencia / stats.totalEstudantes) * 100).toFixed(1)
                : "0.0"}
              % do total ({stats.totalEstudantes})
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Com Barreira</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalComBarreiras}</p>
            <p className="text-sm text-muted-foreground">
              {stats.totalComDeficiencia > 0
                ? ((stats.totalComBarreiras / stats.totalComDeficiencia) * 100).toFixed(1)
                : "0.0"}
              % dos c/ def.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sem Barreira</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalSemBarreiras}</p>
            <p className="text-sm text-muted-foreground">
              {stats.totalComDeficiencia > 0
                ? ((stats.totalSemBarreiras / stats.totalComDeficiencia) * 100).toFixed(1)
                : "0.0"}
              % dos c/ def.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Com Estagiário(a)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalComEstagiario}</p>
            <p className="text-sm text-muted-foreground">
              {stats.totalComDeficiencia > 0
                ? ((stats.totalComEstagiario / stats.totalComDeficiencia) * 100).toFixed(1)
                : "0.0"}
              % dos c/ def.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sem Estagiário(a)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalSemEstagiario}</p>
            <p className="text-sm text-muted-foreground">
              {stats.totalComDeficiencia > 0
                ? ((stats.totalSemEstagiario / stats.totalComDeficiencia) * 100).toFixed(1)
                : "0.0"}
              % dos c/ def.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Com AVE</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalComAve}</p>
            <p className="text-sm text-muted-foreground">
              {stats.totalComDeficiencia > 0
                ? ((stats.totalComAve / stats.totalComDeficiencia) * 100).toFixed(1)
                : "0.0"}
              % dos c/ def.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sem AVE</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalSemAve}</p>
            <p className="text-sm text-muted-foreground">
              {stats.totalComDeficiencia > 0
                ? ((stats.totalSemAve / stats.totalComDeficiencia) * 100).toFixed(1)
                : "0.0"}
              % dos c/ def.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visão por Turmas */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Visão por Turmas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-11 gap-4">
            {turmasData.map((turma) => {
              const hasDeficiencia =
                turma.comDeficienciaComBarreiras > 0 || turma.comDeficienciaSemBarreiras > 0;
              const borderClass = hasDeficiencia
                ? turma.comDeficienciaComBarreiras > 0
                  ? "border-[#FFBB28] border-2"
                  : "border-[#0088FE] border-2"
                : "border-none";
              const selectedBgClass = hasDeficiencia
                ? filtroTurma === turma.turma
                  ? turma.comDeficienciaComBarreiras > 0
                    ? "bg-[#FFF7E6]"
                    : "bg-[#E6F0FF]"
                  : ""
                : "";
              return (
                <Card
                  key={turma.turma}
                  className={`w-full bg-white ${borderClass} ${
                    hasDeficiencia ? "cursor-pointer" : ""
                  } ${selectedBgClass}`}
                  onClick={hasDeficiencia ? () => handleTurmaClick(turma.turma) : undefined}
                >
                  <CardHeader>
                    <CardTitle className="text-sm">{turma.turma}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">SD: {turma.semDeficiencia}</p>
                    <p className="text-sm font-bold">SB: {turma.comDeficienciaSemBarreiras}</p>
                    <p className="text-sm font-bold">CB: {turma.comDeficienciaComBarreiras}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <DisabilityCharts
        tiposDeficienciaData={chartData.tiposDeficiencia}
        aeeData={chartData.aee}
        instituicaoData={chartData.instituicao}
        horarioData={chartData.horario}
        estagiarioData={chartData.estagiario}
        aveData={chartData.ave}
      />

      {/* Tabelas */}
      <DisabilityTables
        filteredEstagiarios={filteredEstagiarios}
        filtroTabelaEstagiario={filtroTabelaEstagiario}
        onFiltroTabelaEstagiarioChange={setFiltroTabelaEstagiario}
        sortEstagiario={sortEstagiario}
        onSortEstagiarioChange={setSortEstagiario}
        filteredAves={filteredAves}
        filtroTabelaAve={filtroTabelaAve}
        onFiltroTabelaAveChange={setFiltroTabelaAve}
        sortAve={sortAve}
        onSortAveChange={setSortAve}
        onSelectStudent={handleSelectStudentForOccurrence}
      />

      {/* Tabela de Detalhes de Estudantes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Detalhes de Estudantes ({filteredEstudantesDetalhes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="text"
            placeholder="Buscar estudantes..."
            value={filtroTabelaEstudantes}
            onChange={(e) => setFiltroTabelaEstudantes(e.target.value)}
            className="w-full mb-4 px-3 py-2 border rounded"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Turma</th>
                  <th className="p-2 text-left">Estudante</th>
                  <th className="p-2 text-left">Tipo Def.</th>
                  <th className="p-2 text-left">AEE</th>
                  <th className="p-2 text-left">Instituição</th>
                  <th className="p-2 text-left">Horário</th>
                  <th className="p-2 text-left">Estagiário</th>
                  <th className="p-2 text-left">AVE</th>
                  <th className="p-2 text-left">Barreiras</th>
                </tr>
              </thead>
              <tbody>
                {filteredEstudantesDetalhes.map((student) => (
                  <tr
                    key={student.estudanteId}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleSelectStudentForOccurrence(student)}
                  >
                    <td className="p-2">{student.turma}</td>
                    <td className="p-2">{student.nome}</td>
                    <td className="p-2">
                      {Array.isArray(student.deficiencia?.tipoDeficiencia)
                        ? student.deficiencia.tipoDeficiencia.join(", ")
                        : student.deficiencia?.tipoDeficiencia || "N/A"}
                    </td>
                    <td className="p-2">{student.deficiencia?.aee || "N/A"}</td>
                    <td className="p-2">{student.deficiencia?.instituicao || "N/A"}</td>
                    <td className="p-2">{student.deficiencia?.horarioAtendimento || "N/A"}</td>
                    <td className="p-2">
                      {student.deficiencia?.possuiEstagiario ? "Sim" : "Não"}
                    </td>
                    <td className="p-2">{student.deficiencia?.ave ? "Sim" : "Não"}</td>
                    <td className="p-2">
                      {student.deficiencia?.possuiBarreiras ? "Sim" : "Não"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Gerenciador de Ocorrências */}
      {isOccurrenceSectionVisible && (
        <OccurrenceManager
          selectedStudent={selectedStudent}
          occurrences={occurrences}
          filteredOccurrences={filteredOccurrences}
          filtroTabelaOcorrencias={filtroTabelaOcorrencias}
          onFiltroTabelaOcorrenciasChange={setFiltroTabelaOcorrencias}
          occurrenceDate={occurrenceDate}
          onOccurrenceDateChange={setOccurrenceDate}
          occurrenceDescription={occurrenceDescription}
          onOccurrenceDescriptionChange={setOccurrenceDescription}
          occurrenceSensitive={occurrenceSensitive}
          onOccurrenceSensitiveChange={handleSensitiveChange}
          editingOccurrence={editingOccurrence}
          showDeleteOccurrenceDialog={showDeleteOccurrenceDialog}
          onShowDeleteOccurrenceDialogChange={setShowDeleteOccurrenceDialog}
          userRole={userRole}
          onAddOccurrence={handleAddOccurrence}
          onEditOccurrence={handleEditOccurrence}
          onDeleteOccurrence={handleDeleteOccurrence}
          onStartEdit={handleStartEditOccurrence}
          onCancelEdit={handleCancelEditOccurrence}
        />
      )}
    </div>
  );
}
