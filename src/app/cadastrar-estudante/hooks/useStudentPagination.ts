"use client";

import { useState, useCallback, useMemo } from "react";

export const useStudentPagination = (totalRecords: number) => {
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [recordsPerPage, setRecordsPerPage] = useState<number>(10);

    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;

    const handleRecordsPerPageChange = useCallback((value: string) => {
        setRecordsPerPage(Number(value));
        setCurrentPage(1);
    }, []);

    const handlePageChange = useCallback((page: number, totalPages: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    }, []);

    const paginateData = useCallback(<T>(data: T[]) => {
        return data.slice(indexOfFirstRecord, indexOfLastRecord);
    }, [indexOfFirstRecord, indexOfLastRecord]);

    return {
        currentPage,
        recordsPerPage,
        totalPages,
        handlePageChange,
        handleRecordsPerPageChange,
        paginateData,
    };
};