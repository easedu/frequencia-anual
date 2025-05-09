"use client";

import { Button } from "@/components/ui/button";
import {
    Select as ShadcnSelect,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface StudentPaginationProps {
    currentPage: number;
    totalRecords: number;
    recordsPerPage: number;
    totalPages: number;
    handlePageChange: (page: number) => void;
    handleRecordsPerPageChange: (value: string) => void;
}

export function StudentPagination({
    currentPage,
    totalRecords,
    recordsPerPage,
    totalPages,
    handlePageChange,
    handleRecordsPerPageChange,
}: StudentPaginationProps) {
    return (
        <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-2">
            <div className="flex items-center space-x-2">
                <label className="font-semibold">Registros por página:</label>
                <ShadcnSelect
                    onValueChange={handleRecordsPerPageChange}
                    value={recordsPerPage.toString()}
                >
                    <SelectTrigger className="w-20">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                </ShadcnSelect>
            </div>
            <p className="text-sm text-gray-700">Total de registros: {totalRecords}</p>
            {totalRecords > recordsPerPage && (
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        Anterior
                    </Button>
                    <span className="text-sm">
                        Página {currentPage} de {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Próxima
                    </Button>
                </div>
            )}
        </div>
    );
}