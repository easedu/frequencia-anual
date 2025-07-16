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
import { ArrowUpDown, ChevronDown, Printer, Heart } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Define a interface estendida para o aluno com informações de deficiência
export interface EnhancedStudentRecord {
    turma: string;
    nome: string;
    faltasB1: number;
    faltasB2: number;
    faltasB3: number;
    faltasB4: number;
    totalFaltas: number;
    percentualFaltas: number;
    percentualFrequencia: number;
    temDeficiencia?: boolean;
    tipoDeficiencia?: string[];
}

// Definição das colunas do Data Table
export const columns: ColumnDef<EnhancedStudentRecord>[] = [
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
        cell: ({ row }) => {
            const nome = row.getValue("nome") as string;
            const temDeficiencia = row.original.temDeficiencia;
            const tipoDeficiencia = row.original.tipoDeficiencia || [];

            return (
                <div className="flex items-center gap-2">
                    <span
                        className={temDeficiencia ? 'text-blue-800 font-medium' : ''}
                    >
                        {nome}
                    </span>
                    {temDeficiencia && (
                        <div className="flex items-center gap-1">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Heart
                                            size={14}
                                            className="text-blue-600"
                                            fill="currentColor"
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Estudante com deficiência</p>
                                        {tipoDeficiencia.length > 0 && (
                                            <p className="text-xs">
                                                Tipos: {tipoDeficiencia.join(', ')}
                                            </p>
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            {tipoDeficiencia.length > 0 && (
                                <Badge
                                    variant="secondary"
                                    className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200"
                                >
                                    PCD
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            );
        },
    },
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
            <div className="text-center">{row.getValue("totalFaltas")}</div>
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
        cell: ({ row }) => {
            const percentual = row.getValue("percentualFaltas") as number;
            return (
                <div className="text-center">
                    <span
                        className={`font-medium ${percentual >= 25
                                ? 'text-red-600'
                                : percentual >= 20
                                    ? 'text-orange-600'
                                    : 'text-green-600'
                            }`}
                    >
                        {percentual}%
                    </span>
                </div>
            );
        },
    },
];

// Definição das props do componente
interface AlertDataTableProps {
    data: EnhancedStudentRecord[];
}

export function AlertDataTable({ data }: AlertDataTableProps) {
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
    });

    // Função para formatar o valor da célula para impressão
    const formatCellValue = (value: unknown, columnId: string, row?: EnhancedStudentRecord): string => {
        if (columnId === "percentualFaltas") {
            return `${value}%`;
        }
        if (columnId === "nome" && row?.temDeficiencia) {
            const tipos = row.tipoDeficiencia?.length ? ` (PCD: ${row.tipoDeficiencia.join(', ')})` : ' (PCD)';
            return `${value}${tipos}`;
        }
        return value?.toString() || "";
    };

    // Função para imprimir a tabela
    const handlePrint = () => {
        const printFrame = document.createElement('iframe');
        printFrame.style.display = 'none';
        document.body.appendChild(printFrame);

        const printDoc = printFrame.contentWindow?.document;
        if (!printDoc) {
            console.error("Não foi possível acessar o documento do iframe.");
            document.body.removeChild(printFrame);
            return;
        }

        const visibleColumns = table
            .getAllColumns()
            .filter((column) => column.getIsVisible());
        const rows = table.getFilteredRowModel().rows;

        // Mapeamento de cabeçalhos para exibição mais amigável
        const headerMap: { [key: string]: string } = {
            nome: "Nome do Estudante",
            turma: "Turma",
            totalFaltas: "Total de Faltas",
            percentualFaltas: "% de Faltas",
        };

        const tableHtml = `
            <html>
            <head>
                <title>Relatório de Alertas de Frequência</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 14px; }
                    h1 { font-size: 16px; margin-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th, td { border: 1px solid black; padding: 8px; text-align: center; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    .pcd-row { background-color: #eff6ff; }
                    .pcd-name { color: #1e40af; font-weight: bold; }
                </style>
            </head>
            <body>
                <h1>Relatório de Alertas de Frequência</h1>
                <p style="font-size: 12px; color: #666; margin-bottom: 10px;">
                    ♥ Indica estudantes com deficiência (PCD)
                </p>
                <table>
                    <thead>
                        <tr>
                            ${visibleColumns
                .map(
                    (column) =>
                        `<th>${headerMap[column.id] || column.id}</th>`
                )
                .join("")}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length > 0
                ? rows
                    .map((row) => {
                        const temDeficiencia = row.original.temDeficiencia;
                        return `
                                <tr${temDeficiencia ? ' class="pcd-row"' : ''}>
                                    ${visibleColumns
                                .map((column) => {
                                    const cell = row.getVisibleCells().find(
                                        (c) => c.column.id === column.id
                                    );
                                    const value = cell ? formatCellValue(cell.getValue(), column.id, row.original) : "";
                                    const cellClass = column.id === "nome" && temDeficiencia ? ' class="pcd-name"' : '';
                                    return `<td${cellClass}>${value}</td>`;
                                })
                                .join("")}
                                </tr>
                            `;
                    })
                    .join("")
                : `<tr><td colspan="${visibleColumns.length}" style="text-align: center;">Nenhum aluno encontrado.</td></tr>`
            }
                    </tbody>
                </table>
            </body>
            </html>
        `;

        printDoc.open();
        printDoc.write(tableHtml);
        printDoc.close();

        printFrame.contentWindow?.focus();
        setTimeout(() => {
            printFrame.contentWindow?.print();
            document.body.removeChild(printFrame);
        }, 100);
    };

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
                <div className="ml-auto flex items-center gap-2">
                    <Button variant="outline" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
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
                                    className={row.original.temDeficiencia ? "bg-blue-50 hover:bg-blue-100" : ""}
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
                    {data.some(s => s.temDeficiencia) && (
                        <div className="text-xs text-blue-600 mt-1">
                            ♥ {data.filter(s => s.temDeficiencia).length} estudante(s) com deficiência
                        </div>
                    )}
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