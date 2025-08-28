"use client";

import { useState, useCallback, useMemo } from "react";
import { Estudante } from "@/types";

export const useStudentSorting = (data: Estudante[]) => {
    const [sortColumn, setSortColumn] = useState<string>("");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

    const handleSort = useCallback((column: string) => {
        if (sortColumn === column) {
            setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    }, [sortColumn]);

    const sortedData = useMemo(() => {
        if (sortColumn) {
            return [...data].sort((a, b) => {
                let aValue = "";
                let bValue = "";

                switch (sortColumn) {
                    case "contatos":
                        aValue = a.contatos && a.contatos.length > 0 ? a.contatos[0].nome.toLowerCase() : "";
                        bValue = b.contatos && b.contatos.length > 0 ? b.contatos[0].nome.toLowerCase() : "";
                        break;
                    case "email":
                        aValue = a.email?.toLowerCase() || "";
                        bValue = b.email?.toLowerCase() || "";
                        break;
                    case "matricula":
                        aValue = a.matricula?.toLowerCase() || "";
                        bValue = b.matricula?.toLowerCase() || "";
                        break;
                    case "endereco":
                        aValue = a.endereco?.rua.toLowerCase() || "";
                        bValue = b.endereco?.rua.toLowerCase() || "";
                        break;
                    case "dataNascimento":
                        aValue = a.dataNascimento || "";
                        bValue = b.dataNascimento || "";
                        break;
                    case "deficiencia":
                        aValue = a.deficiencia?.tipoDeficiencia?.join(", ")?.toLowerCase() || "";
                        bValue = b.deficiencia?.tipoDeficiencia?.join(", ")?.toLowerCase() || "";
                        break;
                    default:
                        aValue = (a[sortColumn as keyof Estudante] as string)?.toLowerCase() || "";
                        bValue = (b[sortColumn as keyof Estudante] as string)?.toLowerCase() || "";
                        break;
                }

                return sortDirection === "asc"
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            });
        }
        return data;
    }, [data, sortColumn, sortDirection]);

    return {
        sortColumn,
        sortDirection,
        handleSort,
        sortedData,
    };
};