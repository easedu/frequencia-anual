"use client";

import { useEffect, useState } from "react";
import { Users, Plus } from "lucide-react";
import { toast } from "sonner";

import { useStudents } from "@/hooks/useStudents";
import { useStudentFilters } from "./hooks/useStudentFilters";
import { useStudentSorting } from "./hooks/useStudentSorting";
import { useStudentPagination } from "./hooks/useStudentPagination";
import { useStudentForm } from "./hooks/useStudentForm";
import { StudentFilters } from "./components/StudentFilters";
import { StudentTable } from "./components/StudentTable";
import { StudentPagination } from "./components/StudentPagination";
import { StudentDialog } from "./components/StudentDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "sonner";

export default function CadastrarEstudantePage() {
    const { students, loading, error, saveStudents, setStudents } = useStudents();
    
    // Custom hooks for state management
    const { filters, setters, filteredStudents } = useStudentFilters(students);
    const { sortColumn, sortDirection, handleSort, sortedData } = useStudentSorting(filteredStudents);
    const { currentPage, recordsPerPage, totalPages, handlePageChange, handleRecordsPerPageChange, paginateData } = useStudentPagination(sortedData.length);
    const {
        form,
        editingEstudante,
        setEditingEstudante,
        editingIndex,
        setEditingIndex,
        openModal,
        setOpenModal,
        cepChangedManually,
        setCepChangedManually,
        handleFormSubmit,
        handleCancel,
        handleNewStudent,
    } = useStudentForm(students, saveStudents, setStudents);

    // Visible columns state
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set([
            "turma",
            "nome",
            "matricula",
            "dataNascimento",
            "turno",
            "bolsaFamilia",
            "status",
            "contatos",
            "email",
            "endereco",
            "actions",
        ])
    );

    // Error handling
    useEffect(() => {
        if (error) {
            toast.error("Erro ao carregar estudantes: " + error.message);
        }
    }, [error]);

    // Calculate current records for display
    const currentRecords = paginateData(sortedData);
    const totalRecords = sortedData.length;

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <div className="flex items-center justify-center min-h-screen">
                    <div className="space-y-6 w-full max-w-lg mx-auto p-8">
                        <div className="flex items-center justify-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
                            <div className="text-xl font-semibold text-slate-600 dark:text-slate-300">
                                Carregando estudantes...
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Skeleton className="h-16 w-full rounded-2xl" />
                            <Skeleton className="h-12 w-4/5 rounded-xl" />
                            <Skeleton className="h-12 w-3/5 rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <Toaster />

            {/* Main Content */}
            <div className="container mx-auto p-6 max-w-[1400px]">
                {/* Header Card */}
                <div className="mb-8 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-slate-700/20 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8">
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                                    <Users className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white">
                                        Gerenciamento de Estudantes
                                    </h1>
                                    <p className="text-blue-100 mt-2 text-lg">
                                        {students.length} estudantes cadastrados • {totalRecords} resultados
                                    </p>
                                </div>
                            </div>

                            <Button
                                size="lg"
                                className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/40 backdrop-blur-sm transition-all duration-300 shadow-lg hover:shadow-xl px-8 py-6 text-lg rounded-2xl"
                                onClick={handleNewStudent}
                            >
                                <Plus className="w-6 h-6 mr-3" />
                                Novo Estudante
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="space-y-8">
                    {/* Filters */}
                    <StudentFilters
                        students={students}
                        turmaFiltro={filters.turmaFiltro}
                        setTurmaFiltro={setters.setTurmaFiltro}
                        nomeFiltro={filters.nomeFiltro}
                        setNomeFiltro={setters.setNomeFiltro}
                        matriculaFiltro={filters.matriculaFiltro}
                        setMatriculaFiltro={setters.setMatriculaFiltro}
                        statusFiltro={filters.statusFiltro}
                        setStatusFiltro={setters.setStatusFiltro}
                        bolsaFamiliaFiltro={filters.bolsaFamiliaFiltro}
                        setBolsaFamiliaFiltro={setters.setBolsaFamiliaFiltro}
                        turnoFiltro={filters.turnoFiltro}
                        setTurnoFiltro={setters.setTurnoFiltro}
                        contatoFiltro={filters.contatoFiltro}
                        setContatoFiltro={setters.setContatoFiltro}
                        emailFiltro={filters.emailFiltro}
                        setEmailFiltro={setters.setEmailFiltro}
                        enderecoFiltro={filters.enderecoFiltro}
                        setEnderecoFiltro={setters.setEnderecoFiltro}
                        dataNascimentoFiltro={filters.dataNascimentoFiltro}
                        setDataNascimentoFiltro={setters.setDataNascimentoFiltro}
                        comDeficienciaFiltro={filters.comDeficienciaFiltro}
                        setComDeficienciaFiltro={setters.setComDeficienciaFiltro}
                        visibleColumns={visibleColumns}
                        setVisibleColumns={setVisibleColumns}
                    />

                    {/* Table */}
                    <StudentTable
                        currentRecords={currentRecords}
                        visibleColumns={visibleColumns}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        handleSort={handleSort}
                        setEditingEstudante={setEditingEstudante}
                        setEditingIndex={setEditingIndex}
                        setOpenModal={setOpenModal}
                        students={students}
                    />

                    {/* Pagination */}
                    {totalRecords > 0 && (
                        <StudentPagination
                            currentPage={currentPage}
                            totalRecords={totalRecords}
                            recordsPerPage={recordsPerPage}
                            totalPages={totalPages}
                            handlePageChange={handlePageChange}
                            handleRecordsPerPageChange={handleRecordsPerPageChange}
                        />
                    )}
                </div>
            </div>

            {/* Dialog Modal */}
            <StudentDialog
                openModal={openModal}
                setOpenModal={setOpenModal}
                form={form}
                editingIndex={editingIndex}
                editingEstudante={editingEstudante}
                handleFormSubmit={handleFormSubmit}
                handleCancel={handleCancel}
                cepChangedManually={cepChangedManually}
                setCepChangedManually={setCepChangedManually}
            />
        </div>
    );
}