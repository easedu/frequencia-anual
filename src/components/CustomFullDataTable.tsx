"use client";

import * as React from "react";
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define a interface para o aluno
export interface StudentRecord {
    turma: string;
    nome: string;
    faltasB1: number;
    faltasB2: number;
    faltasB3: number;
    faltasB4: number;
    totalFaltas: number;
    percentualFaltas: number;
    percentualFrequencia: number;
}

// Definição das colunas do Data Table
export const columns: ColumnDef<StudentRecord>[] = [
    {
        accessorKey: "turma",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="flex items-center gap-1"
            >
                Turma <ArrowUpDown className="h-4 w-4" />
            </Button>
        ),
    },
    {
        accessorKey: "nome",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="flex items-center gap-1"
            >
                Nome <ArrowUpDown className="h-4 w-4" />
            </Button>
        ),
    },
    {
        accessorKey: "faltasB1",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="flex items-center gap-1"
            >
                1º Bimentre <ArrowUpDown className="h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="text-center">
                {row.getValue("faltasB1")}
            </div>
        ),
    },
    {
        accessorKey: "faltasB2",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="flex items-center gap-1"
            >
                2º Bimentre <ArrowUpDown className="h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="text-center">
                {row.getValue("faltasB2")}
            </div>
        ),
    },
    {
        accessorKey: "faltasB3",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="flex items-center gap-1"
            >
                3º Bimentre <ArrowUpDown className="h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="text-center">
                {row.getValue("faltasB3")}
            </div>
        ),
    },
    {
        accessorKey: "faltasB4",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="flex items-center gap-1"
            >
                4º Bimentre <ArrowUpDown className="h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="text-center">
                {row.getValue("faltasB4")}
            </div>
        ),
    },
    {
        accessorKey: "totalFaltas",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="flex items-center gap-1"
            >
                Total de Faltas <ArrowUpDown className="h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="text-center">
                {row.getValue("totalFaltas")}
            </div>
        ),
    },
    {
        accessorKey: "percentualFaltas",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="flex items-center gap-1"
            >
                % de Faltas <ArrowUpDown className="h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="text-center">
                {row.getValue("percentualFaltas")}%
            </div>
        ),
    },
    {
        accessorKey: "percentualFrequencia",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="flex items-center gap-1"
            >
                % de Frequência <ArrowUpDown className="h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="text-center">
                {row.getValue("percentualFrequencia")}%
            </div>
        ),
    },
];

// Definição das props do componente
interface FullDataTableProps {
    data: StudentRecord[];
}

export function FullDataTable({ data }: FullDataTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [globalFilter, setGlobalFilter] = React.useState("");

    const table = useReactTable({
        data: data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter,
        },
        // Caso deseje usar uma função customizada de filtro global, adicione a opção globalFilterFn aqui.
        // globalFilterFn: yourGlobalFilterFn,
    });

    return (
        <div className="w-full">
            <div className="flex items-center py-4">
                {/* Filtro global: busca em todas as colunas */}
                <Input
                    placeholder="Filtrar..."
                    value={globalFilter}
                    onChange={(event) => {
                        setGlobalFilter(event.target.value);
                        table.setGlobalFilter(event.target.value);
                    }}
                    className="max-w-sm"
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="ml-auto">
                            Colunas <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {table
                            .getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => (
                                <DropdownMenuCheckboxItem
                                    key={column.id}
                                    checked={column.getIsVisible()}
                                    onCheckedChange={(value) =>
                                        column.toggleVisibility(!!value)
                                    }
                                    className="capitalize"
                                >
                                    {column.id}
                                </DropdownMenuCheckboxItem>
                            ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    Nenhum resultado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Paginação e controle de quantidade de registros por página */}
            <div className="flex items-center justify-between py-4">
                {/* Seleção de registros por página */}
                <div className="flex items-center space-x-2">
                    <label htmlFor="pageSize" className="text-sm text-muted-foreground">
                        Registros por página:
                    </label>
                    <select
                        id="pageSize"
                        onChange={(e) => table.setPageSize(Number(e.target.value))}
                        className="rounded border p-1 text-sm"
                        defaultValue={10}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={500}>500</option>
                        <option value={1000}>1000</option>
                    </select>
                </div>

                {/* Informações de total de registros */}
                <div className="flex flex-col items-center">
                    <div className="text-sm text-muted-foreground">
                        Total de registros: {table.getFilteredRowModel().rows.length}
                    </div>
                </div>

                {/* Botões de paginação com exibição da página atual */}
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Anterior
                    </Button>
                    <div className="text-sm">
                        Página {table.getState().pagination.pageIndex + 1} de{" "}
                        {table.getPageCount()}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Próximo
                    </Button>
                </div>
            </div>
        </div>
    );
}