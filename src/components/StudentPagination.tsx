import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

    const generatePageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 7;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 4) {
                for (let i = 1; i <= 5; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    const pageNumbers = generatePageNumbers();
    const startRecord = (currentPage - 1) * recordsPerPage + 1;
    const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

    return (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-slate-700/20 overflow-hidden">
            <div className="px-8 py-6">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                    {/* Records Info */}
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Registros por página:
                            </span>
                            <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
                                <SelectTrigger className="w-20 h-10 rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm hover:border-blue-400 transition-all duration-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                                    <SelectItem value="5">5</SelectItem>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="text-sm text-slate-600 dark:text-slate-400">
                            Exibindo <span className="font-semibold text-slate-800 dark:text-slate-200">{startRecord}</span> a{' '}
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{endRecord}</span> de{' '}
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{totalRecords}</span> registro{totalRecords !== 1 ? 's' : ''}
                        </div>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center space-x-2">
                            {/* Previous Button */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="h-10 px-4 rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Anterior
                            </Button>

                            {/* Page Numbers */}
                            <div className="flex items-center space-x-1">
                                {pageNumbers.map((page, index) => (
                                    <React.Fragment key={index}>
                                        {page === '...' ? (
                                            <div className="w-10 h-10 flex items-center justify-center">
                                                <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                            </div>
                                        ) : (
                                            <Button
                                                variant={currentPage === page ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => handlePageChange(page as number)}
                                                className={`w-10 h-10 rounded-xl border-2 transition-all duration-200 ${currentPage === page
                                                        ? 'border-blue-500 bg-blue-500 text-white shadow-lg'
                                                        : 'border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                                                    }`}
                                            >
                                                {page}
                                            </Button>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>

                            {/* Next Button */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="h-10 px-4 rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                Próxima
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}