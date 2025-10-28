"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Toaster } from "sonner";
import { useStudents } from "@/hooks/useStudents";
import { useServiceWorkerContext } from "@/components/shared/ServiceWorkerProvider";
import { useAttendanceMarking } from "@/hooks/useAttendanceMarking";
import {
    AttendanceCalendar,
    AttendanceStats,
    StudentCheckboxList,
    AttendanceConfirmDialog
} from "@/components/attendance";
import { ClassSelector, EmptyState } from "@/components/shared";
import {
    School,
    AlertCircle,
    WifiOff,
    Save,
    User,
    Users
} from "lucide-react";

// ════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════

export default function MarcarFaltasPage() {
    const { students, loading } = useStudents();
    const { isOnline } = useServiceWorkerContext();

    // Hook centralizado com toda lógica
    const {
        // Estados
        academicYearData,
        loadingAcademicYear, // ✅ NOVO: Estado de loading do ano letivo
        selectedDate,
        setSelectedDate,
        isValidDay,
        errorMessage,
        selectedClass,
        setSelectedClass,
        existingAbsences,
        markedAbsences,
        openDialog,
        setOpenDialog,
        isSaving,
        role,

        // Computed
        filteredStudents,
        canSave,
        totalStudents,
        presentStudents,
        absentStudents,

        // Helpers
        getValidDates,
        checkCoverageForStudent,

        // Handlers
        handleCheckboxChange,
        handleSaveAbsences,
    } = useAttendanceMarking({ students, isOnline });

    // ──────────────────────────────────────────────────────────────
    // Renderização
    // ──────────────────────────────────────────────────────────────

    // ✅ NOVO: Loading unificado (estudantes + ano letivo)
    if (loading || loadingAcademicYear) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">
                        {loading ? "Carregando estudantes..." : "Carregando ano letivo..."}
                    </p>
                </div>
            </div>
        );
    }

    const validDates = getValidDates(academicYearData, role);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3">
            <Toaster />

            <div className="max-w-4xl mx-auto space-y-4">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800 mb-1">Marcação de Faltas</h1>
                    <p className="text-sm text-gray-600">Gerencie a presença dos estudantes</p>

                    {/* Indicador de modo offline */}
                    {!isOnline && (
                        <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-orange-100 border border-orange-200 rounded-full text-orange-700">
                            <WifiOff className="w-4 h-4" />
                            <span className="text-sm font-medium">Modo Offline - Os dados serão sincronizados automaticamente</span>
                        </div>
                    )}
                </div>

                {/* Controles */}
                <Card className="shadow-md border-0">
                    <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-lg py-3">
                        <CardTitle className="text-base flex items-center space-x-2">
                            <School className="w-4 h-4" />
                            <span>Controles de Marcação</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Seletor de Data - Componente Extraído */}
                            <AttendanceCalendar
                                selectedDate={selectedDate}
                                onDateChange={setSelectedDate}
                                validDates={validDates}
                            />

                            {/* Seletor de Turma - Componente Reutilizável */}
                            <ClassSelector
                                students={students as unknown as import('@/components/shared').Estudante[]}
                                selectedClass={selectedClass}
                                onClassChange={setSelectedClass}
                                filterByStatus="ATIVO"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Mensagem de Erro */}
                {errorMessage && (
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2 text-red-700">
                                <AlertCircle className="w-5 h-5" />
                                <p className="font-medium">{errorMessage}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Estatísticas - Componente Extraído */}
                {isValidDay && selectedClass && filteredStudents.length > 0 && (
                    <AttendanceStats
                        totalStudents={totalStudents}
                        presentStudents={presentStudents}
                        absentStudents={absentStudents}
                    />
                )}

                {/* Lista de Alunos */}
                {isValidDay && selectedClass && (
                    <Card className="shadow-md border-0">
                        <CardHeader className="bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-t-lg py-3">
                            <CardTitle className="text-base flex items-center space-x-2">
                                <User className="w-4 h-4" />
                                <span>Lista de Presença - {selectedClass}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            {filteredStudents.length === 0 ? (
                                <EmptyState
                                    icon={Users}
                                    iconSize={48}
                                    title="Nenhum aluno encontrado"
                                    description='Não há alunos cadastrados para esta turma com status "ATIVO"'
                                    variant="info"
                                />
                            ) : (
                                <StudentCheckboxList
                                    students={filteredStudents}
                                    markedAbsences={markedAbsences}
                                    existingAbsences={existingAbsences}
                                    role={role}
                                    onCheckboxChange={handleCheckboxChange}
                                    checkCoverageForStudent={checkCoverageForStudent}
                                    selectedDate={selectedDate}
                                />
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Botão de Salvar */}
                {isValidDay && selectedClass && filteredStudents.length > 0 && (
                    <div className="flex justify-end">
                        <Button
                            onClick={() => setOpenDialog(true)}
                            disabled={!canSave || isSaving}
                            className={`
                                px-5 py-2 text-white font-medium rounded-lg transition-all duration-200
                                ${canSave && !isSaving
                                    ? 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                                    : 'bg-gray-400 cursor-not-allowed'
                                }
                            `}
                        >
                            {isSaving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Salvar Faltas
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>

            {/* Dialog de Confirmação - Componente Extraído */}
            <AttendanceConfirmDialog
                open={openDialog}
                onOpenChange={setOpenDialog}
                selectedDate={selectedDate}
                selectedClass={selectedClass}
                absentStudents={absentStudents}
                filteredStudents={filteredStudents}
                markedAbsences={markedAbsences}
                isSaving={isSaving}
                onConfirm={handleSaveAbsences}
            />
        </div>
    );
}
