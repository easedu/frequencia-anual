"use client";

import * as React from "react";
import { memo } from "react";
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
import { logger } from "@/utils/logger";
import {
    ArrowUpDown,
    ChevronDown,
    Printer,
    Heart,
    Search,
    Filter,
    Users,
    AlertTriangle
} from "lucide-react";

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

// Função para determinar a cor do status baseado no percentual
const getStatusColor = (percentual: number) => {
    if (percentual >= 25) return "text-red-600 bg-red-50";
    if (percentual >= 20) return "text-orange-600 bg-orange-50";
    return "text-green-600 bg-green-50";
};

// Função para obter o ícone de status
const getStatusIcon = (percentual: number) => {
    if (percentual >= 25) return <AlertTriangle className="h-3 w-3" />;
    if (percentual >= 20) return <AlertTriangle className="h-3 w-3" />;
    return null;
};

export const columns: ColumnDef<EnhancedStudentRecord>[] = [
    {
        accessorKey: "nome",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="h-8 px-2 text-xs font-medium hover:bg-gray-100"
            >
                Nome <ArrowUpDown className="ml-1 h-3 w-3" />
            </Button>
        ),
        cell: ({ row }) => {
            const nome = row.getValue("nome") as string;
            const temDeficiencia = row.original.temDeficiencia;
            const tipoDeficiencia = row.original.tipoDeficiencia || [];

            return (
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${temDeficiencia ? 'text-blue-700' : 'text-gray-900'
                            }`}>
                            {nome}
                        </div>
                    </div>
                    {temDeficiencia && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1">
                                            <Heart className="h-3 w-3 text-blue-600 fill-current" />
                                            <Badge
                                                variant="secondary"
                                                className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 border-blue-200"
                                            >
                                                PCD
                                            </Badge>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-48">
                                        <p className="text-xs font-medium">Estudante com deficiência</p>
                                        {tipoDeficiencia.length > 0 && (
                                            <p className="text-xs text-gray-600 mt-1">
                                                {tipoDeficiencia.join(', ')}
                                            </p>
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
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
                className="h-8 px-2 text-xs font-medium hover:bg-gray-100"
            >
                Turma <ArrowUpDown className="ml-1 h-3 w-3" />
            </Button>
        ),
        cell: ({ row }) => (
            <Badge variant="outline" className="text-xs font-mono">
                {row.getValue("turma")}
            </Badge>
        ),
    },
    {
        accessorKey: "totalFaltas",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="h-8 px-2 text-xs font-medium hover:bg-gray-100"
            >
                Faltas <ArrowUpDown className="ml-1 h-3 w-3" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="text-center text-sm font-medium">
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
                className="h-8 px-2 text-xs font-medium hover:bg-gray-100"
            >
                % Faltas <ArrowUpDown className="ml-1 h-3 w-3" />
            </Button>
        ),
        cell: ({ row }) => {
            const percentual = row.getValue("percentualFaltas") as number;
            const statusColor = getStatusColor(percentual);
            const statusIcon = getStatusIcon(percentual);

            return (
                <div className="flex items-center justify-center gap-1">
                    {statusIcon}
                    <Badge
                        variant="secondary"
                        className={`text-xs font-medium px-2 py-1 ${statusColor}`}
                    >
                        {percentual}%
                    </Badge>
                </div>
            );
        },
    },
];

interface AlertDataTableProps {
    data: EnhancedStudentRecord[];
}

export const AlertDataTable = memo(function AlertDataTable({ data }: AlertDataTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
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

    const handlePrint = () => {
        const printFrame = document.createElement('iframe');
        printFrame.style.display = 'none';
        document.body.appendChild(printFrame);

        const printDoc = printFrame.contentWindow?.document;
        if (!printDoc) {
            logger.error("Não foi possível acessar o documento do iframe");
            document.body.removeChild(printFrame);
            return;
        }

        const visibleColumns = table.getAllColumns().filter((column) => column.getIsVisible());
        const rows = table.getFilteredRowModel().rows;

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
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                    th { background-color: #f8f9fa; font-weight: bold; }
                    .pcd-row { background-color: #eff6ff; }
                    .pcd-name { color: #1e40af; font-weight: bold; }
                    .critical { background-color: #fef2f2; }
                    .warning { background-color: #fffbeb; }
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
                            ${visibleColumns.map(column => `<th>${headerMap[column.id] || column.id}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length > 0 ? rows.map(row => {
            const temDeficiencia = row.original.temDeficiencia;
            const percentual = row.original.percentualFaltas;
            const statusClass = percentual >= 25 ? ' critical' : percentual >= 20 ? ' warning' : '';
            return `
                                <tr${temDeficiencia ? ' class="pcd-row"' : ''}${statusClass}>
                                    ${visibleColumns.map(column => {
                const cell = row.getVisibleCells().find(c => c.column.id === column.id);
                const value = cell ? formatCellValue(cell.getValue(), column.id, row.original) : "";
                const cellClass = column.id === "nome" && temDeficiencia ? ' class="pcd-name"' : '';
                return `<td${cellClass}>${value}</td>`;
            }).join("")}
                                </tr>
                            `;
        }).join("") : `<tr><td colspan="${visibleColumns.length}" style="text-align: center;">Nenhum aluno encontrado.</td></tr>`}
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

    const pcdCount = data.filter(s => s.temDeficiencia).length;
    const criticalCount = data.filter(s => s.percentualFaltas >= 25).length;
    const warningCount = data.filter(s => s.percentualFaltas >= 20 && s.percentualFaltas < 25).length;

    return (
        <div className="w-full space-y-3">
            {/* Header compacto com estatísticas */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar estudantes..."
                            value={globalFilter}
                            onChange={(event) => {
                                setGlobalFilter(event.target.value);
                                table.setGlobalFilter(event.target.value);
                            }}
                            className="pl-8 h-9 w-64 text-sm"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-gray-500" />
                            <span className="font-medium">{data.length}</span>
                        </div>
                        {pcdCount > 0 && (
                            <div className="flex items-center gap-1">
                                <Heart className="h-3 w-3 text-blue-600 fill-current" />
                                <span className="font-medium text-blue-600">{pcdCount}</span>
                            </div>
                        )}
                        {criticalCount > 0 && (
                            <div className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-red-600" />
                                <span className="font-medium text-red-600">{criticalCount}</span>
                            </div>
                        )}
                        {warningCount > 0 && (
                            <div className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-orange-600" />
                                <span className="font-medium text-orange-600">{warningCount}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrint}
                            className="h-8 px-3 text-xs"
                        >
                            <Printer className="h-3 w-3 mr-1" />
                            Imprimir
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                                    <Filter className="h-3 w-3 mr-1" />
                                    Colunas
                                    <ChevronDown className="ml-1 h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                {table.getAllColumns()
                                    .filter((column) => column.getCanHide())
                                    .map((column) => (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                            className="text-xs"
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* Tabela compacta */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="bg-gray-50/50">
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="py-2 px-3 text-xs font-medium">
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
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
                                    className={`
                                        ${row.original.temDeficiencia ? "bg-blue-50/50 hover:bg-blue-50" : "hover:bg-gray-50"}
                                        ${row.original.percentualFaltas >= 25 ? "border-l-4 border-l-red-500" : ""}
                                        ${row.original.percentualFaltas >= 20 && row.original.percentualFaltas < 25 ? "border-l-4 border-l-orange-500" : ""}
                                    `}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-2 px-3 text-sm">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-16 text-center text-sm text-gray-500">
                                    Nenhum resultado encontrado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Footer compacto com paginação */}
            <div className="flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span>Mostrar:</span>
                        <select
                            onChange={(e) => table.setPageSize(Number(e.target.value))}
                            className="rounded border px-2 py-1 text-xs"
                            defaultValue={10}
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                    <div>
                        Exibindo {table.getRowModel().rows.length} de {table.getFilteredRowModel().rows.length} registros
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="h-7 px-2 text-xs"
                    >
                        Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                        <span>Página</span>
                        <span className="font-medium">{table.getState().pagination.pageIndex + 1}</span>
                        <span>de</span>
                        <span className="font-medium">{table.getPageCount()}</span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="h-7 px-2 text-xs"
                    >
                        Próximo
                    </Button>
                </div>
            </div>
        </div>
    );
});