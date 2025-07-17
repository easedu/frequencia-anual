"use client";

import * as React from "react";
import {
    Cell,
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
    Column,
} from "@tanstack/react-table";
import {
    ArrowUpDown,
    ChevronDown,
    Printer,
    Search,
    Eye,
    Download,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Users,
    TrendingUp,
    TrendingDown
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Interface para o registro do estudante
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

// Componente para cabeçalho de coluna com ordenação
const SortableHeader = ({
    column,
    children,
    className = ""
}: {
    column: Column<StudentRecord, unknown>;
    children: React.ReactNode;
    className?: string;
}) => (
    <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className={`h-8 p-2 font-medium hover:bg-blue-50 ${className}`}
    >
        {children}
        <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
);

// Componente para célula com indicador de performance
const PerformanceCell = ({
    value,
    threshold = 75,
    reverse = false
}: {
    value: number;
    threshold?: number;
    reverse?: boolean;
}) => {
    const isGood = reverse ? value >= threshold : value <= threshold;
    return (
        <div className="flex items-center justify-center gap-1">
            <span className={`font-medium ${isGood ? 'text-green-600' : 'text-red-600'}`}>
                {value}%
            </span>
            {value > 90 && (
                <TrendingUp className="h-3 w-3 text-green-500" />
            )}
            {value < 60 && (
                <TrendingDown className="h-3 w-3 text-red-500" />
            )}
        </div>
    );
};

// Definição das colunas otimizada
export const columns: ColumnDef<StudentRecord>[] = [
    {
        accessorKey: "turma",
        header: ({ column }) => (
            <SortableHeader column={column}>
                Turma
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <Badge variant="outline" className="font-mono text-xs">
                {row.getValue("turma")}
            </Badge>
        ),
        size: 80,
    },
    {
        accessorKey: "nome",
        header: ({ column }) => (
            <SortableHeader column={column} className="justify-start">
                Nome do Estudante
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <div className="font-medium text-left max-w-[200px] truncate">
                {row.getValue("nome")}
            </div>
        ),
        size: 200,
    },
    {
        accessorKey: "faltasB1",
        header: ({ column }) => (
            <SortableHeader column={column}>
                1º Bim
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <div className="text-center font-mono">
                {row.getValue("faltasB1")}
            </div>
        ),
        size: 70,
    },
    {
        accessorKey: "faltasB2",
        header: ({ column }) => (
            <SortableHeader column={column}>
                2º Bim
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <div className="text-center font-mono">
                {row.getValue("faltasB2")}
            </div>
        ),
        size: 70,
    },
    {
        accessorKey: "faltasB3",
        header: ({ column }) => (
            <SortableHeader column={column}>
                3º Bim
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <div className="text-center font-mono">
                {row.getValue("faltasB3")}
            </div>
        ),
        size: 70,
    },
    {
        accessorKey: "faltasB4",
        header: ({ column }) => (
            <SortableHeader column={column}>
                4º Bim
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <div className="text-center font-mono">
                {row.getValue("faltasB4")}
            </div>
        ),
        size: 70,
    },
    {
        accessorKey: "totalFaltas",
        header: ({ column }) => (
            <SortableHeader column={column}>
                Total
            </SortableHeader>
        ),
        cell: ({ row }) => {
            const total = row.getValue("totalFaltas") as number;
            return (
                <div className={`text-center font-bold ${total > 20 ? 'text-red-600' : 'text-gray-900'}`}>
                    {total}
                </div>
            );
        },
        size: 80,
    },
    {
        accessorKey: "percentualFaltas",
        header: ({ column }) => (
            <SortableHeader column={column}>
                % Faltas
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <PerformanceCell
                value={row.getValue("percentualFaltas")}
                threshold={25}
            />
        ),
        size: 90,
    },
    {
        accessorKey: "percentualFrequencia",
        header: ({ column }) => (
            <SortableHeader column={column}>
                % Frequência
            </SortableHeader>
        ),
        cell: ({ row }) => (
            <PerformanceCell
                value={row.getValue("percentualFrequencia")}
                threshold={75}
                reverse={true}
            />
        ),
        size: 110,
    },
];

// Props do componente
interface FullDataTableProps {
    data: StudentRecord[];
}

export function FullDataTable({ data }: FullDataTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [globalFilter, setGlobalFilter] = React.useState("");

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            globalFilter,
        },
        globalFilterFn: "includesString" as const,
    });

    // Memoize filtered rows for stats calculation
    const filteredRows = React.useMemo(() => table.getFilteredRowModel().rows, [table]);

    // Estatísticas dos dados
    const stats = React.useMemo(() => {
        const total = filteredRows.length;
        const avgFrequencia = total > 0
            ? filteredRows.reduce((acc, row) => acc + (row.original.percentualFrequencia || 0), 0) / total
            : 0;
        const criticalCount = filteredRows.filter(row => row.original.percentualFrequencia < 75).length;

        return { total, avgFrequencia, criticalCount };
    }, [filteredRows]);

    // Função para formatar valores para impressão
    const formatCellValue = (cell: Cell<StudentRecord, unknown>): string => {
        const value = cell.getValue();
        const columnId = cell.column.id;

        if (columnId === "percentualFaltas" || columnId === "percentualFrequencia") {
            return `${value}%`;
        }
        return value?.toString() || "";
    };

    // Função de impressão otimizada
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const visibleColumns = table.getAllColumns().filter(col => col.getIsVisible());
        const rows = table.getFilteredRowModel().rows;

        const headerMap: Record<string, string> = {
            turma: "Turma",
            nome: "Nome do Estudante",
            faltasB1: "1º Bimestre",
            faltasB2: "2º Bimestre",
            faltasB3: "3º Bimestre",
            faltasB4: "4º Bimestre",
            totalFaltas: "Total de Faltas",
            percentualFaltas: "% de Faltas",
            percentualFrequencia: "% de Frequência",
        };

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Relatório de Frequência Escolar</title>
                <meta charset="utf-8">
                <style>
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        padding: 20px; 
                        color: #333;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 2px solid #e5e7eb;
                        padding-bottom: 20px;
                    }
                    h1 { 
                        color: #1f2937; 
                        font-size: 24px; 
                        margin: 0 0 10px 0; 
                    }
                    .subtitle {
                        color: #6b7280;
                        font-size: 14px;
                        margin-bottom: 20px;
                    }
                    .stats {
                        display: flex;
                        justify-content: space-around;
                        margin-bottom: 20px;
                        padding: 15px;
                        background-color: #f9fafb;
                        border-radius: 8px;
                    }
                    .stat-item {
                        text-align: center;
                    }
                    .stat-value {
                        font-size: 18px;
                        font-weight: bold;
                        color: #1f2937;
                    }
                    .stat-label {
                        font-size: 12px;
                        color: #6b7280;
                        margin-top: 4px;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        font-size: 11px; 
                        margin-top: 20px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    th { 
                        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                        color: white; 
                        font-weight: 600; 
                        padding: 12px 8px;
                        text-align: center;
                        border: 1px solid #2563eb;
                    }
                    td { 
                        border: 1px solid #e5e7eb; 
                        padding: 8px; 
                        text-align: center;
                    }
                    tbody tr:nth-child(even) {
                        background-color: #f8fafc;
                    }
                    tbody tr:hover {
                        background-color: #e0f2fe;
                    }
                    .critical { background-color: #fef2f2 !important; }
                    .good { background-color: #f0fdf4 !important; }
                    .nome-col { text-align: left !important; max-width: 150px; }
                    .footer {
                        margin-top: 30px;
                        text-align: center;
                        font-size: 10px;
                        color: #9ca3af;
                        border-top: 1px solid #e5e7eb;
                        padding-top: 15px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📊 Relatório de Frequência Escolar</h1>
                    <p class="subtitle">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                    <div class="stats">
                        <div class="stat-item">
                            <div class="stat-value">${stats.total}</div>
                            <div class="stat-label">Total de Estudantes</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${stats.avgFrequencia.toFixed(1)}%</div>
                            <div class="stat-label">Frequência Média</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${stats.criticalCount}</div>
                            <div class="stat-label">Frequência < 75%</div>
                        </div>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            ${visibleColumns.map(col =>
            `<th>${headerMap[col.id] || col.id}</th>`
        ).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => {
            const freq = row.original.percentualFrequencia;
            const rowClass = freq < 75 ? 'critical' : freq > 90 ? 'good' : '';
            return `
                                <tr class="${rowClass}">
                                    ${visibleColumns.map(column => {
                const cell = row.getVisibleCells().find(c => c.column.id === column.id);
                const cellValue = cell ? formatCellValue(cell) : '';
                const cellClass = column.id === 'nome' ? 'nome-col' : '';
                return `<td class="${cellClass}">${cellValue}</td>`;
            }).join('')}
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
                <div class="footer">
                    <p>Este relatório contém informações confidenciais sobre a frequência escolar dos estudantes.</p>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    // Função para exportar como CSV
    const handleExportCSV = () => {
        const visibleColumns = table.getAllColumns().filter(col => col.getIsVisible());
        const rows = table.getFilteredRowModel().rows;

        const headers = visibleColumns.map(col => col.id).join(',');
        const csvContent = [
            headers,
            ...rows.map(row =>
                visibleColumns.map(col => {
                    const cell = row.getVisibleCells().find(c => c.column.id === col.id);
                    return cell ? `"${formatCellValue(cell)}"` : '""';
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `frequencia_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full space-y-4">
            {/* Header com estatísticas */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-0 shadow-sm">
                <CardContent className="p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="space-y-1">
                            <div className="flex items-center justify-center gap-2">
                                <Users className="h-4 w-4 text-blue-600" />
                                <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
                            </div>
                            <p className="text-xs text-gray-600">Total de Estudantes</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-center gap-2">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                <span className="text-2xl font-bold text-gray-900">{stats.avgFrequencia.toFixed(1)}%</span>
                            </div>
                            <p className="text-xs text-gray-600">Frequência Média</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-center gap-2">
                                <TrendingDown className="h-4 w-4 text-red-600" />
                                <span className="text-2xl font-bold text-gray-900">{stats.criticalCount}</span>
                            </div>
                            <p className="text-xs text-gray-600">Frequência Crítica (&lt;75%)</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Controles da tabela */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        {/* Busca global */}
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Buscar estudantes..."
                                value={globalFilter}
                                onChange={(e) => {
                                    setGlobalFilter(e.target.value);
                                    table.setGlobalFilter(e.target.value);
                                }}
                                className="pl-10 h-9"
                            />
                        </div>

                        {/* Controles */}
                        <div className="flex items-center gap-2">
                            {/* Seletor de página */}
                            <Select
                                value={table.getState().pagination.pageSize.toString()}
                                onValueChange={(value) => table.setPageSize(Number(value))}
                            >
                                <SelectTrigger className="w-20 h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[10, 20, 50, 100].map(size => (
                                        <SelectItem key={size} value={size.toString()}>
                                            {size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Controle de colunas */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9">
                                        <Eye className="h-4 w-4 mr-2" />
                                        Colunas
                                        <ChevronDown className="h-4 w-4 ml-2" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Visibilidade das Colunas</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {table.getAllColumns()
                                        .filter(column => column.getCanHide())
                                        .map(column => (
                                            <DropdownMenuCheckboxItem
                                                key={column.id}
                                                checked={column.getIsVisible()}
                                                onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                            >
                                                {column.id === 'nome' ? 'Nome' :
                                                    column.id === 'turma' ? 'Turma' :
                                                        column.id.includes('faltas') ? column.id.replace('faltas', '').replace('B', '° Bim') :
                                                            column.id === 'totalFaltas' ? 'Total' :
                                                                column.id === 'percentualFaltas' ? '% Faltas' :
                                                                    column.id === 'percentualFrequencia' ? '% Frequência' : column.id}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Botão de impressão */}
                            <Button variant="outline" size="sm" onClick={handlePrint} className="h-9">
                                <Printer className="h-4 w-4 mr-2" />
                                Imprimir
                            </Button>

                            {/* Botão de exportação */}
                            <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9">
                                <Download className="h-4 w-4 mr-2" />
                                CSV
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela */}
            <Card className="border-0 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead
                                            key={header.id}
                                            className="font-semibold text-gray-700 border-r border-gray-200 last:border-r-0"
                                            style={{ width: header.column.columnDef.size }}
                                        >
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
                                table.getRowModel().rows.map((row, index) => {
                                    const freq = row.original.percentualFrequencia;
                                    const isEven = index % 2 === 0;
                                    const rowBg = freq < 75 ? 'bg-red-50 hover:bg-red-100' :
                                        freq > 90 ? 'bg-green-50 hover:bg-green-100' :
                                            isEven ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100';

                                    return (
                                        <TableRow
                                            key={row.id}
                                            className={`${rowBg} border-b border-gray-100 transition-colors`}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell
                                                    key={cell.id}
                                                    className="border-r border-gray-100 last:border-r-0 py-3"
                                                >
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center text-gray-500"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <Users className="h-8 w-8 text-gray-300" />
                                            <span>Nenhum estudante encontrado</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Paginação moderna */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-gray-600">
                            Mostrando {table.getRowModel().rows.length} de {stats.total} estudantes
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.setPageIndex(0)}
                                disabled={!table.getCanPreviousPage()}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-md">
                                <span className="text-sm font-medium">
                                    {table.getState().pagination.pageIndex + 1}
                                </span>
                                <span className="text-sm text-gray-500">de</span>
                                <span className="text-sm font-medium">
                                    {table.getPageCount()}
                                </span>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                disabled={!table.getCanNextPage()}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}